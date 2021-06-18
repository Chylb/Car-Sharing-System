pragma solidity >0.5.0 <=0.5.17;

contract SmartCar {
    uint256 public CONTRACT_COST = 5 ether;
    uint256 public MAX_EXTRA_DAYS = 3;
    bool public clientReady;
    bool public ownerReady;
    uint256 public ownerDeposit;
    uint256 public clientDeposit;

    uint256 public ownerBalance;
    bool public extraTimeTaken;
    uint256 extraTime;

    bool public allowCarUse = false;
    bool public canAccess = false;
    bool public contractAvailable;

    address payable public owner;

    bool public carIsReady;
    CarStatus public currentCarStatus;

    DriverInformation public currentDriverInfo;
    address payable public currentDriverAddress;
    uint256 public currentDriveStartTime;
    uint256 public currentWithdrawTime;
    uint256 public currentDriveRequiredEndTime;
    uint256 public RATE_DAILYRENTAL = 1 ether;
    uint256 public CANCEL_COST = RATE_DAILYRENTAL / 2;

    enum CarStatus {Idle, Busy}

    enum DriverInformation {None, Customer}

    event UpdateStatus(string _msg);
    event UserStatus(string _msg, address user, uint256 amount);

    // dodać max days tutaj i przy emitowaniu
    event E_RentCarDaily(
        address _currentDriverAddress,
        uint256 _val,
        uint256 _extra_days,
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

    function resetCarPermissions() internal {
        carIsReady = false;
        allowCarUse = false;
        canAccess = false;
        currentCarStatus = CarStatus.Idle;
        currentDriverInfo = DriverInformation.None;
        currentDriverAddress = address(0);
    }
  

    constructor() public payable {
        require(msg.value >= 3 ether, "should deposit atleast 3 ether");
        owner = msg.sender;
        ownerDeposit = msg.value;
        CONTRACT_COST = msg.value;
        RATE_DAILYRENTAL = 1 ether;
        MAX_EXTRA_DAYS = (CONTRACT_COST - 2 ether) / 1 ether;
        resetCarPermissions();
        carIsReady = true;
        contractAvailable = true;
    }

    function allowCarUsage() public onlyIfAvailable ifOwner {
        require(carIsReady, "car is not ready");
        allowCarUse = true;
    }

    function accessCar() public onlyIfAvailable ifCustomer {
        require(allowCarUse, "CarUse not allowed");
        canAccess = true;
    }

    function nonAccessWithdrawal() public onlyIfAvailable ifCustomer {
        require(allowCarUse == false, "CarUse allowed");
        require(
            block.timestamp >= currentWithdrawTime,
            "you have to wait at least 30 minutes between those withdraws"
        );
        if (ownerDeposit >= RATE_DAILYRENTAL) {
            ownerDeposit = ownerDeposit - RATE_DAILYRENTAL;
            currentDriverAddress.transfer(RATE_DAILYRENTAL);
        } else {
            currentDriverAddress.transfer(ownerDeposit);
            ownerDeposit = 0;
        }

        currentWithdrawTime = block.timestamp + 30 minutes;

        if (ownerDeposit < RATE_DAILYRENTAL) {
            endSmartContract();
        }
    }

    function rentCar() public payable onlyIfAvailable {
        require(carIsReady, "car is not ready");
        require(
            msg.value == CONTRACT_COST,
            "ether required: (MAX_EXTRA_DAYS + 2) ether"
        );
        require(currentCarStatus == CarStatus.Idle, "Car not Idle");
        clientDeposit = msg.value;
        currentDriverAddress = msg.sender;
        currentCarStatus = CarStatus.Busy;
        currentDriverInfo = DriverInformation.Customer;
        currentDriveStartTime = block.timestamp;
        currentWithdrawTime = block.timestamp + 30 minutes;
        currentDriveRequiredEndTime = block.timestamp + 1 days;

        emit E_RentCarDaily(
            currentDriverAddress,
            MAX_EXTRA_DAYS,
            msg.value,
            currentDriveStartTime,
            currentDriveRequiredEndTime
        );
    }

    function endRentCar() public onlyIfAvailable {
        require(currentCarStatus == CarStatus.Busy, "xxxx");
        require(canAccess, "Car was never accessed");

        if (block.timestamp > currentDriveRequiredEndTime) {
            extraTimeTaken = true;
        }

        ownerBalance = RATE_DAILYRENTAL;
        extraTime =
            (block.timestamp - currentDriveRequiredEndTime) /
            (24 * 3600);

        if (extraTimeTaken == true && extraTime < MAX_EXTRA_DAYS) {
            ownerBalance += extraTime * RATE_DAILYRENTAL;
        }
        clientDeposit = clientDeposit - ownerBalance;

        if (extraTimeTaken == true && extraTime >= MAX_EXTRA_DAYS) {
            require(msg.sender == owner, "xx");
            emit E_EndRentCar(currentDriverAddress, block.timestamp, false);
            clientDeposit = 0 ether;
            owner.transfer(CONTRACT_COST);
            endSmartContract();
        } else {
            require(msg.sender == currentDriverAddress, "x");
            emit E_EndRentCar(currentDriverAddress, block.timestamp, true);
            currentDriverAddress.transfer(clientDeposit);
            clientDeposit = 0 ether;
            owner.transfer(ownerBalance);
            resetCarPermissions();
        }

    }

    function cancelBooking() public onlyIfAvailable {
        require(currentCarStatus == CarStatus.Busy, "Car not Busy");
        require(
            block.timestamp < currentDriveStartTime + 3 hours,
            "Too late for booking cancel"
        );

        if (msg.sender == owner && allowCarUse == false) {
            currentDriverAddress.transfer(clientDeposit);
            resetCarPermissions();
        } else if (msg.sender == currentDriverAddress && canAccess == false) {
            currentDriverAddress.transfer(clientDeposit);
            resetCarPermissions();
        } else if (msg.sender == currentDriverAddress && canAccess == true) {
            currentDriverAddress.transfer(clientDeposit - CANCEL_COST);
            resetCarPermissions();
        } else {
            require(false, "conditions not met");
        }
    }

    function endSmartContract() private {
        contractAvailable = false;
        owner.transfer(ownerDeposit);
        currentDriverAddress.transfer(clientDeposit);
    }

    function ownerEndsSmartContract() public onlyIfAvailable ifOwner {
        require(currentCarStatus == CarStatus.Idle, "Car not Idle");
        contractAvailable = false;
        owner.transfer(ownerDeposit);
        currentDriverAddress.transfer(clientDeposit);
    }

    function setDailyRentalRate(uint256 _rate) public ifOwner {
        require(currentCarStatus == CarStatus.Idle, "someone already agreed");
        require(ownerDeposit >= (MAX_EXTRA_DAYS + 2) * _rate, "deposit too small");
        RATE_DAILYRENTAL = _rate;
        CANCEL_COST = RATE_DAILYRENTAL / 2;
        CONTRACT_COST = (MAX_EXTRA_DAYS + 2) * RATE_DAILYRENTAL;
    }

    function setCarReady(bool _ready) public ifOwner {
        require(currentCarStatus == CarStatus.Idle, "someone already agreed");
        carIsReady = _ready;
    }

    function setMaxDays(uint256 _maxDays) public ifOwner {
        require(currentCarStatus == CarStatus.Idle, "someone already agreed");
        require(
            ownerDeposit >= ((_maxDays+2) * RATE_DAILYRENTAL),
            "owner deposit too small"
        );

        MAX_EXTRA_DAYS = _maxDays;
        CONTRACT_COST = (_maxDays + 2) * RATE_DAILYRENTAL;
    }

    function addDepositOwner() public payable ifOwner {
        ownerDeposit += msg.value;
    }
}
