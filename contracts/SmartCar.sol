pragma solidity >=0.5.0 <0.9.0;

contract SmartCar {
    bool public clientReady;
    bool public ownerReady;
    uint256 public ownerDeposit;
    uint256 public clientDeposit;

    uint256 public clientBalance;
    uint256 public ownerBalance;

    bool public extraTimeTaken;

    uint256 driveRequiredEndTime;
    uint256 extraTime;

    uint256 driveStartTime;

    bool public carFree;

    //const ownerIdentity = EthCrypto.createIdentity();

    bool public allowCarUse = false;
    bool public canAccess = false;

    modifier clientAgrees {
        assert(clientReady);
        _;
    }

    modifier ownerAgrees {
        assert(ownerReady);
        _;
    }

    constructor() public payable {
        require(msg.value == 5 ether, "should deposit 5 ether");
        owner = msg.sender;
        ownerDeposit = msg.value;
        currentDriverInfo = DriverInformation.None;
        currentCarStatus = CarStatus.Idle;
        carIsReady = true;
        allowCarUse = false;
        canAccess = false;
    }


    function allowCarUsage(address _user) public onlyIfReady {
        require(_user == owner, "not owner address");
        allowCarUse = true;
    }

    function accessCar(address _user) public onlyIfReady {
        require(_user == currentDriverAddress, "not client address");
        require(allowCarUse, "CarUse not allowed");
        canAccess = true;
    }

    function nonAccessWithdrawal(address _user) public onlyIfReady {
        assert(_user == currentDriverAddress);
        assert(canAccess == false);
        clientBalance = ownerDeposit + clientDeposit;
        msg.sender.transfer(clientBalance);
        ownerBalance = 0;
    }

    function endRentCar() public onlyIfReady {
         require(currentCarStatus == CarStatus.Busy,"xxxx");
         require(currentDriverInfo == DriverInformation.Customer,"xx");

        balanceToDistribute = RATE_DAILYRENTAL - 3.5 ether;
        if (extraTimeTaken == true && (driveRequiredEndTime + extraTime) < 4) {
            balanceToDistribute += extraTime * RATE_DAILYRENTAL;
        }

        if (extraTimeTaken == true && (driveRequiredEndTime + extraTime) >= 4) {
             require(msg.sender == owner,"xx");
            emit E_EndRentCar(currentDriverAddress, block.timestamp, false);
            clientBalance = 0 ether;
            ownerBalance = clientDeposit + ownerDeposit;
            msg.sender.transfer(ownerBalance);
            currentDriverAddress = address(0);
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            driveStartTime = 0;
            driveRequiredEndTime = 0;
        } else {
            require(msg.sender == currentDriverAddress, "x");
            emit E_EndRentCar(currentDriverAddress, block.timestamp, true);
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            driveStartTime = 0;
            driveRequiredEndTime = 0;
            clientReady = true;
            ownerReady = true;
            carFree = true;
            distributeEarnings();
        }
    }

    function cancelBooking(address _user) public onlyIfReady {
        if (_user == owner && allowCarUse == false) {
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            currentDriverAddress.transfer(clientDeposit);
        } else if (_user == currentDriverAddress && canAccess == false) {
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            currentDriverAddress.transfer(clientDeposit);
        } else if (_user == currentDriverAddress && canAccess == true) {
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            currentDriverAddress.transfer(clientDeposit - RATE_DAILYRENTAL);
            owner.transfer(RATE_DAILYRENTAL);
        } else if (_user == owner && allowCarUse == true) {
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            ownerDeposit = ownerDeposit - RATE_DAILYRENTAL;
            currentDriverAddress.transfer(clientDeposit + RATE_DAILYRENTAL);
        }
    }

    enum CarStatus {Idle, Busy}

    enum DriverInformation {None, Customer}

    event UpdateStatus(string _msg);
    event UserStatus(string _msg, address user, uint256 amount);

    event E_RentCarDaily(
        address _currentDriverAddress,
        uint256 _val,
        uint256 _currentDriveStartTime,
        uint256 _currentDriveRequiredEndTime
    );

    event E_EndRentCar(
        address _currentDriverAddress,
        uint256 _now,
        bool _endWithinPeriod
    );

    modifier onlyIfReady {
        require(carIsReady, "car is not ready");
        _;
    }

    modifier ifOwner() {
        require(owner == msg.sender, "not owner");
        _;
    }

    modifier ifCustomer() {
        require(currentDriverAddress == msg.sender, "not customer");
        _;
    }

    address payable public owner;

    bool public carIsReady;
    CarStatus public currentCarStatus;

    DriverInformation public currentDriverInfo;
    address payable public currentDriverAddress;
    uint256 public currentDriveStartTime;
    uint256 public currentDriveRequiredEndTime;
    uint256 public balanceToDistribute = 0;
    uint256 public RATE_DAILYRENTAL = 5 ether;

    function setDailyRentalRate(uint256 _rate) public ifOwner {
        RATE_DAILYRENTAL = _rate;
    }

    function setCarReady(bool _ready) public ifOwner {
        carIsReady = _ready;
    }

    function rentCar() public payable onlyIfReady {
        //TODO: raczej to powinno wyrzucać błąd
         require(msg.value == RATE_DAILYRENTAL, "5 ether required");
         require(currentCarStatus == CarStatus.Idle, "Car not Idle");
            clientDeposit = msg.value;
            currentDriverAddress = msg.sender;
            currentCarStatus = CarStatus.Busy;
            currentDriverInfo = DriverInformation.Customer;
            currentDriveStartTime = block.timestamp;
            currentDriveRequiredEndTime = block.timestamp + 1 days;
            //balanceToDistribute += msg.value - 500;
            balanceToDistribute += msg.value;

            emit E_RentCarDaily(
                currentDriverAddress,
                msg.value,
                currentDriveStartTime,
                currentDriveRequiredEndTime
            );
    }

    function distributeEarnings() private {
        uint256 amount = balanceToDistribute;

        if (owner.send(amount)) {
            emit UpdateStatus("Money transferred to owner");
            balanceToDistribute = 0;
        }
    }
}