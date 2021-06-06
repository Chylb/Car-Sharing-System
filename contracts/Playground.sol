pragma solidity >0.5.0 <=0.5.17;

contract Playground {
    event E_my();

    uint256 public balance;

    function send() public payable {
        balance += msg.value;
    }

    function withdraw(address payable _addr, uint256 _amount) public{
         _addr.transfer(_amount);
    }
}