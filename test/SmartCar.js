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
    var clientNum = 4;

    it('should deploy', async () => {
        smartCar = await SmartCarContract.deployed();

        const balance = await getBalance(smartCar.address);
        assert(balance == toWei('5', 'ether'));
        carReady = await smartCar.carIsReady.call();
        assert.equal(carReady, true);

        allowCarUse = await smartCar.allowCarUse.call();
        assert.equal(allowCarUse, false);
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

    it('Customer calls the rentCar() function and does not deposit needed amount', async () => {
        try {
            await smartCar.rentCar({ from: accounts[clientNum], value: toWei('1', 'ether') });
            let driver = await smartCar.currentDriverAddress.call();
            assert.equal(driver, 0);
        } catch (error) {
            assert.equal(error.reason,"5 ether required");
            return;
        }
        assert(false);
    });

    it('Customer calls the rentCar() function and deposits needed amount', async () => {
        await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
        let driver = await smartCar.currentDriverAddress.call();
        assert.equal(driver, accounts[clientNum]);
    });

    it('endRentCar()', async () => {
        try {
            const balance0 = await web3.eth.getBalance(accounts[0]);
            await smartCar.endRentCar({from: accounts[clientNum]});
            let carReady = await smartCar.carIsReady.call();
            assert.equal(carReady, true);
            const actualBalance = await web3.eth.getBalance(accounts[0]);
            const expectedBalance = sum(balance0, toWei('1.5', 'ether'), '-500');
            assert(similar(actualBalance, expectedBalance, toWei('0.001', 'ether')), "owner hasn't received proper amount");
            return;
        } catch (error) {
            assert.equal(error.reason,"inncorect reason");
            return;
        }

    });

    it('allowCarUse false', async () => {

        allowCarUse = await smartCar.allowCarUse.call();
        assert.equal(allowCarUse, false);
    });

    it('cancelBooking() owner car not allowed', async () => {
        await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
        const balance0 = await web3.eth.getBalance(accounts[clientNum]);
        await smartCar.cancelBooking(accounts[0]);
        const actualBalance = await web3.eth.getBalance(accounts[clientNum]);
        let clientDeposit = await smartCar.clientDeposit.call();
        const expectedBalance = sum(balance0, clientDeposit);
        assert(similar(actualBalance, expectedBalance, toWei('0.001', 'ether')), "client hasn't received proper amount");
    });

    it('CanAccess false', async () => {

        canAccess = await smartCar.canAccess.call();
        assert.equal(canAccess, false);
    });

    it('nonAccessWithdrawal() client', async () => {
        await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
        const balance0 = await web3.eth.getBalance(accounts[clientNum]);
        await smartCar.nonAccessWithdrawal(accounts[clientNum]);
        const actualBalance = await web3.eth.getBalance(accounts[clientNum]);
        let clientDeposit = await smartCar.clientDeposit.call();
        let ownerDeposit = await smartCar.ownerDeposit.call();
        let compensation = sum(clientDeposit, ownerDeposit);
        const expectedBalance = sum(balance0, compensation);
        await smartCar.endRentCar({from: accounts[clientNum]});
        assert(similar(actualBalance, expectedBalance, toWei('0.001', 'ether')), "client hasn't received proper amount");
    });

    it('nonAccessWithdrawal() not client ', async () => {
        try{
            await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
            await smartCar.nonAccessWithdrawal(accounts[0]);
            assert(false);
        } catch (error) {
            assert.equal(error.reason,"not client address");
            await smartCar.endRentCar({from: accounts[clientNum]});
            return;
        }
        assert(false);
    });
    

    it('cancelBooking() client car not accessed', async () => {

        await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
        const balance0 = await web3.eth.getBalance(accounts[clientNum]);
        await smartCar.cancelBooking(accounts[clientNum]);
        const actualBalance = await web3.eth.getBalance(accounts[clientNum]);
        let clientDeposit = await smartCar.clientDeposit.call();
        const expectedBalance = sum(balance0, clientDeposit);
        assert(similar(actualBalance, expectedBalance, toWei('0.001', 'ether')), "client hasn't received proper amount");
    });

    it('allowCarUsage() owner', async () => {
        await smartCar.allowCarUsage(accounts[0]);
        let allowCarUse = await smartCar.allowCarUse.call();
        assert(allowCarUse, true);
    });

    it('allowCarUsage() not owner ', async () => {
        try{
            await smartCar.allowCarUsage(accounts[clientNum]);
            assert(false);
        } catch (error) {
            assert.equal(error.reason,"not owner address");
            return;
        }
        assert(false);
    });

    it('allowCarUse true', async () => {

        let allowCarUse = await smartCar.allowCarUse.call();
        assert(allowCarUse, true);
    });

    it('cancelBooking() owner car allowed', async () => {
        await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
        const balance0 = await web3.eth.getBalance(accounts[clientNum]);
        await smartCar.cancelBooking(accounts[0]);
        const actualBalance = await web3.eth.getBalance(accounts[clientNum]);
        let clientDeposit = await smartCar.clientDeposit.call();
        let RATE_DAILYRENTAL = await smartCar.RATE_DAILYRENTAL.call();
        let compensation = sum(clientDeposit, RATE_DAILYRENTAL);
        const expectedBalance = sum(balance0, compensation);
        assert(similar(actualBalance, expectedBalance, toWei('0.001', 'ether')), "client hasn't received proper amount");
    });


    it('accessCar() client', async () => {
        await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
        await smartCar.accessCar(accounts[clientNum]);
        let canAccess = await smartCar.canAccess.call();
        await smartCar.endRentCar({from: accounts[clientNum]});
        assert(canAccess, true);
        
    });

    it('accessCar() not client ', async () => {
        try{
            await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
            await smartCar.accessCar(accounts[0]);
            assert(false);
        } catch (error) {
            assert.equal(error.reason,"not client address");
            await smartCar.endRentCar({from: accounts[clientNum]});
            return;
        }
        assert(false);
    });

    it('CanAccess true', async () => {

        let canAccess = await smartCar.canAccess.call();
        assert(canAccess, true);
    });

    it('cancelBooking() client car accessed', async () => {

        await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
        const balance0 = await web3.eth.getBalance(accounts[clientNum]);
        const balanceOwner = await web3.eth.getBalance(accounts[0]);
        await smartCar.cancelBooking(accounts[clientNum]);
        const actualBalance = await web3.eth.getBalance(accounts[clientNum]);
        const actualBalanceOwner = await web3.eth.getBalance(accounts[0]);
        let clientDeposit = await smartCar.clientDeposit.call();
        let RATE_DAILYRENTAL = await smartCar.RATE_DAILYRENTAL.call();
        let penalty = subt(clientDeposit, RATE_DAILYRENTAL);
        const expectedBalance = sum(balance0, penalty);
        const expectedOwnerBalance = sum(balanceOwner, RATE_DAILYRENTAL);
        assert(similar(actualBalance, expectedBalance, toWei('0.001', 'ether')), "client hasn't received proper amount");
        assert(similar(actualBalanceOwner, expectedOwnerBalance, toWei('0.001', 'ether')), "owner hasn't received proper amount");
    });
});