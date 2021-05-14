const SmartCarContract = artifacts.require('SmartCar');

const getBalance = web3.eth.getBalance;
const toWei = web3.utils.toWei;
const BN = web3.utils.BN;

function sum() {
    let sum = new BN('0');
    for (let i = 0; i < arguments.length; i++) {
        const num = new BN(arguments[i]);
        sum = sum.add(num);
    }
    return sum.toString();
}

function subt(n1, n2) {
    let bn1 = new BN(n1);
    const bn2 = new BN('-' + n2);
    bn1 = bn1.add(bn2);
    return bn1.toString();
}

function similar(x1, x2, dx) {
    let s_diff = subt(x1, x2);
    if (s_diff.charAt(0) == '-')
        s_diff = s_diff.substring(1);
    u_diff = new BN(s_diff);

    dx = new BN(dx);

    return u_diff.lt(dx);
}

contract('SmartCar', (accounts) => {
    let smartCar;

    it('should deploy', async () => {
        smartCar = await SmartCarContract.deployed();

        const balance = await getBalance(smartCar.address);
        assert(balance == toWei('5', 'ether'));
    });

    it('owner field contains owner', () => {
        return smartCar.owner.call().then(owner => {
            assert.equal(owner, accounts[0]);
        })
    });

    it('setCarReady', async () => {
        await smartCar.setCarReady(false);
        let carReady = await smartCar.carIsReady.call();
        assert.equal(carReady, false);

        await smartCar.setCarReady(true);
        carReady = await smartCar.carIsReady.call();
        assert.equal(carReady, true);
    });

    it('fail car rent when deposit not correct', async () => {
        await smartCar.rentCar({ from: accounts[1], value: toWei('1', 'ether') });
        let driver = await smartCar.currentDriverAddress.call();
        assert.equal(driver, 0);
    });

    it('successful car rent', async () => {
        await smartCar.rentCar({ from: accounts[1], value: toWei('2', 'ether') });
        let driver = await smartCar.currentDriverAddress.call();
        assert.equal(driver, accounts[1]);
    });

    it('endRentCar()', async () => {
        const balance0 = await web3.eth.getBalance(accounts[0]);
        await smartCar.endRentCar();

        const actualBalance = await web3.eth.getBalance(accounts[0]);
        const expectedBalance = sum(balance0, toWei('2', 'ether'), '-500');

        console.log(subt(actualBalance, expectedBalance));
        assert(similar(actualBalance, expectedBalance, toWei('0.001', 'ether')), "owner hasn't received proper amount");
    });
});