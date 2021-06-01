pragma solidity >=0.5.0 <0.9.0;

contract TimeTest {
    event E_my();

    uint256 public timestamp;
    uint public m_var;

    function updateTimeStamp() public{
        timestamp = block.timestamp;
    }

    function  getTimeStamp() public returns(uint256){
        return timestamp;
    }

    function  getBlockTime() public returns(uint256){
        return block.timestamp;
    }

    function emitEvent() public {
        emit E_my();
    }

    function setVar(uint _new) public {
        m_var = _new;
    }

    function emptyFunc() public {

    }

    function requirePassed(uint _passed) public {
        require(block.timestamp > timestamp + _passed, "failed require");

        m_var = 99;
    }
}