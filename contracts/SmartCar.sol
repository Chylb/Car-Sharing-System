pragma solidity >=0.4.22 <0.9.0;

contract SmartCar {
    
    enum CarStatus {
        Idle, Busy
    }
    
    enum DriverInformation {
        None, Customer
    }
    
    event UpdateStatus(string _msg);
    event UserStatus(string _msg, address user, uint amount);
    
    event E_RentCarDaily(address _currentDriverAddress, uint _val,
    uint _currentDriveStartTime, uint _currentDriveRequiredEndTime);
    
    event E_EndRentCar(address _currentDriverAddress, uint _now, bool _endWithinPeriod);
    
    modifier onlyIfReady {
        require(carIsReady, "car is not ready");
        _;
    }
    
    modifier ifOwner() {
        require(owner == msg.sender, "not owner");
        _;
    }
    
    address payable public owner;
    
    bool public carIsReady;
    CarStatus public currentCarStatus;
    
    DriverInformation public currentDriverInfo;
    address public currentDriverAddress;
    uint public currentDriveStartTime;
    uint public currentDriveRequiredEndTime;
    uint public balanceToDistribute = 0;
    uint public RATE_DAILYRENTAL = 2 ether;
    
    constructor() public {
        owner = msg.sender;
        currentCarStatus = CarStatus.Idle;
        currentDriverInfo = DriverInformation.None;
        carIsReady=true;
    }
    
    function setDailyRentalRate(uint _rate) public ifOwner {
        RATE_DAILYRENTAL = _rate;
    }
    
    function setCarReady(bool _ready) public ifOwner {
        carIsReady = _ready;
    }
    
    function rentCar() public onlyIfReady payable {
        if(currentCarStatus == CarStatus.Idle && msg.value == RATE_DAILYRENTAL){
            currentDriverAddress = msg.sender;
            currentCarStatus = CarStatus.Busy;
            currentDriverInfo = DriverInformation.Customer;
            currentDriveStartTime = now;
            currentDriveRequiredEndTime = now + 1 days;
            balanceToDistribute += msg.value - 500;
            
            emit E_RentCarDaily(currentDriverAddress,msg.value,
            currentDriveStartTime,currentDriveRequiredEndTime);
        }
    }
    
    function endRentCar() public onlyIfReady {
        assert(currentCarStatus == CarStatus.Busy);
        assert(currentDriverInfo == DriverInformation.Customer);
        
        bool endWithinPeriod = now <= currentDriveRequiredEndTime;
        emit E_EndRentCar(currentDriverAddress,now,endWithinPeriod);
        currentDriverAddress = address(0); //null
        currentCarStatus = CarStatus.Idle;
        currentDriverInfo = DriverInformation.None;
        currentDriveStartTime = 0;
        currentDriveRequiredEndTime = 0;
        
        distributeEarnings();
    }
    
    function distributeEarnings() private {
        uint amount = balanceToDistribute;
        
        if(owner.send(amount)){
            emit UpdateStatus("Money transferred to owner");
            balanceToDistribute = 0;
        }
    }
}