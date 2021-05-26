pragma solidity >=0.5.0 <0.9.0;

contract SmartCar {
    uint256 public CONTRACT_COST = 5 ether;
    uint256 public MAX_DAYS = 3;
    bool public clientReady;
    bool public ownerReady;
    uint256 public ownerDeposit;
    uint256 public clientDeposit;

    uint256 public clientBalance;
    uint256 public ownerBalance;

    bool public extraTimeTaken;
    uint256 extraTime;

    uint256 driveStartTime;

    bool public carFree;

    //const ownerIdentity = EthCrypto.createIdentity();

    bool public allowCarUse = false;
    bool public canAccess = false;
    bool public contractAvailable;

    modifier clientAgrees {
        assert(clientReady);
        _;
    }

    modifier ownerAgrees {
        assert(ownerReady);
        _;
    }

    constructor() public payable {
        require(msg.value == CONTRACT_COST, "should deposit 5 ether");
        contractAvailable = true;
        owner = msg.sender;
        ownerDeposit = msg.value;
        currentDriverInfo = DriverInformation.None;
        currentCarStatus = CarStatus.Idle;
        carIsReady = true;
        allowCarUse = false;
        canAccess = false;
    }


    function allowCarUsage(address _user) public onlyIfAvailable {
        require(carIsReady, "car is not ready");
        require(_user == owner, "not owner address");
        allowCarUse = true;
    }

    function accessCar(address _user) public onlyIfAvailable {
        require(carIsReady, "car is not ready");
        require(_user == currentDriverAddress, "not client address");
        require(allowCarUse, "CarUse not allowed");
        canAccess = true;
    }

    function nonAccessWithdrawal(address _user) public onlyIfAvailable {
        require(carIsReady, "car is not ready");
        require(_user == currentDriverAddress, "not client address");
        require(canAccess == false, "canAccess is true");
        clientBalance = ownerDeposit + clientDeposit;
        currentDriverAddress.transfer(clientBalance);
        ownerBalance = 0;
    }

    function rentCar() public payable onlyIfAvailable {
         require(carIsReady, "car is not ready");
         require(msg.value == CONTRACT_COST, "5 ether required");
         require(currentCarStatus == CarStatus.Idle, "Car not Idle");
            clientDeposit = msg.value;
            currentDriverAddress = msg.sender;
            currentCarStatus = CarStatus.Busy;
            currentDriverInfo = DriverInformation.Customer;
            currentDriveStartTime = block.timestamp;
            currentDriveRequiredEndTime = block.timestamp + 1 days;

            emit E_RentCarDaily(
                currentDriverAddress,
                msg.value,
                currentDriveStartTime,
                currentDriveRequiredEndTime
            );
    }

    function endRentCar() public onlyIfAvailable {
         require(carIsReady, "car is not ready");
         require(currentCarStatus == CarStatus.Busy,"xxxx");
         require(currentDriverInfo == DriverInformation.Customer,"xx");

         if(block.timestamp > currentDriveRequiredEndTime) {
             extraTimeTaken = true;
         }

         ownerBalance = RATE_DAILYRENTAL;
         extraTime = (block.timestamp - currentDriveRequiredEndTime) / (24 * 3600); 

        if (extraTimeTaken == true &&  extraTime < MAX_DAYS) {
            ownerBalance += extraTime * RATE_DAILYRENTAL;
        }
        clientBalance = clientDeposit - ownerBalance;

        if (extraTimeTaken == true && extraTime >= MAX_DAYS) {
            require(msg.sender == owner,"xx");
            emit E_EndRentCar(currentDriverAddress, block.timestamp, false);
            clientBalance = 0 ether;
            ownerBalance = clientDeposit;
            msg.sender.transfer(ownerBalance);
            currentDriverAddress = address(0);
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            driveStartTime = 0;
        } else {
            require(msg.sender == currentDriverAddress, "x");
            emit E_EndRentCar(currentDriverAddress, block.timestamp, true);
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            driveStartTime = 0;
            clientReady = true;
            ownerReady = true;
            carFree = true;
            currentDriverAddress.transfer(clientBalance);
            distributeEarnings();
        }
    }

    function distributeEarnings() private {

        if (owner.send(ownerBalance)) {
            emit UpdateStatus("Money transferred to owner");
        }
    }

    function cancelBooking(address _user) public onlyIfAvailable {
        require(carIsReady, "car is not ready");

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
        } else if (_user == owner && allowCarUse == true) {
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            ownerDeposit = ownerDeposit - RATE_DAILYRENTAL;
            currentDriverAddress.transfer(clientDeposit + RATE_DAILYRENTAL);
        }
    }

    function endSmartContract() private {
        contractAvailable = false;
        owner.transfer(ownerBalance);
        currentDriverAddress.transfer(clientDeposit);
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

    modifier onlyIfAvailable {
        require(contractAvailable, "contract not available");
        _;
    }

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
    uint256 public RATE_DAILYRENTAL = 1 ether;

    function setDailyRentalRate(uint256 _rate) public ifOwner {
        RATE_DAILYRENTAL = _rate;
    }

    function setCarReady(bool _ready) public ifOwner {
        carIsReady = _ready;
    }
}