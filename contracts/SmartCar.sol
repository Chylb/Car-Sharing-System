pragma solidity >0.5.0 <=0.5.17;

contract SmartCar {
    uint256 public CONTRACT_COST = 5 ether;
    uint256 public MAX_EXTRA_DAYS = 3;
    bool public clientReady;
    bool public ownerReady;
    uint256 public ownerDeposit;
    uint256 public clientDeposit;
    string cost;
    string requiredEth = " ether required";

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

    modifier clientAgrees {
        assert(clientReady);
        _;
    }

    modifier ownerAgrees {
        assert(ownerReady);
        _;
    }

    constructor() public payable {
        require(msg.value >= 3 ether, "should deposit atleast 3 ether");
        owner = msg.sender;
        ownerDeposit = msg.value;
        CONTRACT_COST = msg.value;
        MAX_EXTRA_DAYS = (CONTRACT_COST - 2 ether) / 1000000000000000000;
        currentDriverInfo = DriverInformation.None;
        currentCarStatus = CarStatus.Idle;
        carIsReady = true;
        allowCarUse = false;
        canAccess = false;
        ownerReady = false;
        contractAvailable = true;
    }

    function allowCarUsage() public onlyIfAvailable ifOwner {
        require(carIsReady, "car is not ready");
        allowCarUse = true;
    }

    function accessCar() public onlyIfAvailable ifCustomer {
        require(carIsReady, "car is not ready");
        require(allowCarUse, "CarUse not allowed");
        canAccess = true;
    }

    function nonAccessWithdrawal() public onlyIfAvailable ifCustomer {
        require(carIsReady, "car is not ready");
        require(allowCarUse == false, "CarUse allowed");
        require(
            block.timestamp > currentWithdrawTime,
            "you have to wait at least 30 minutes between those withdraws"
        );
        if (ownerDeposit > RATE_DAILYRENTAL) {
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

    function concatenate(string calldata a, string calldata b)
        external
        pure
        returns (string memory)
    {
        return string(abi.encodePacked(a, b));
    }

    function rentCar() public payable onlyIfAvailable {
        cost = uint2str(CONTRACT_COST);
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
            msg.value,
            currentDriveStartTime,
            currentDriveRequiredEndTime
        );
    }

    function endRentCar() public onlyIfAvailable {
        require(carIsReady, "car is not ready");
        require(currentCarStatus == CarStatus.Busy, "xxxx");
        require(currentDriverInfo == DriverInformation.Customer, "xx");
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
            currentDriverAddress = address(0);
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            currentDriveStartTime = 0;
            endSmartContract();
        } else {
            require(msg.sender == currentDriverAddress, "x");
            emit E_EndRentCar(currentDriverAddress, block.timestamp, true);
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            currentDriveStartTime = 0;
            currentDriverAddress.transfer(clientDeposit);
            clientDeposit = 0 ether;
            owner.transfer(ownerBalance);
            currentDriverAddress = address(0);
            allowCarUse = false;
            canAccess = false;
            carIsReady = false;
        }
    }

    function cancelBooking() public onlyIfAvailable {
        require(carIsReady, "car is not ready");
        require(currentCarStatus == CarStatus.Busy, "Car not Busy");
        require(
            block.timestamp < currentDriveStartTime + 3 hours,
            "Too late for booking cancel"
        );

        if (msg.sender == owner && allowCarUse == false) {
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            currentDriverAddress.transfer(clientDeposit);
        } else if (msg.sender == currentDriverAddress && canAccess == false) {
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            currentDriverAddress.transfer(clientDeposit);
        } else if (msg.sender == currentDriverAddress && canAccess == true) {
            currentCarStatus = CarStatus.Idle;
            currentDriverInfo = DriverInformation.None;
            currentDriverAddress.transfer(clientDeposit - CANCEL_COST);
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
        RATE_DAILYRENTAL = _rate;
    }

    function setCarReady(bool _ready) public ifOwner {
        carIsReady = _ready;
    }

    function setMaxDays(uint256 _maxDays) public ifOwner {
        require(currentDriverAddress == address(0), "someone already agreed");

        MAX_EXTRA_DAYS = _maxDays;
    }

    function setUnavailable() public ifOwner {
        require(currentDriverAddress == address(0), "someone already agreed");
        contractAvailable = false;
    }

    function setAvailable() public ifOwner {
        require(contractAvailable ==  false, "already available");

        require(
            ownerDeposit > (MAX_EXTRA_DAYS) * 1 ether + 2 ether,
            "owner deposit too small"
        );
        contractAvailable = true;
    }

    function addDepositOwner() public payable ifOwner {
        ownerDeposit += msg.value;
    }

    function uint2str(uint256 _i)
        internal
        pure
        returns (string memory _uintAsString)
    {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k - 1;
            uint8 temp = (48 + uint8(_i - (_i / 10) * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
}
