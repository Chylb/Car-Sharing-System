const SmartCarContract = artifacts.require('SmartCar');

const getBalance = web3.eth.getBalance;
const toWei = web3.utils.toWei;
const fromWei = web3.utils.fromWei;
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

async function str(x) {
    const res = await x.call();
    return res.toString();
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
            assert.equal(error.reason, "5 ether required");
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
            await smartCar.endRentCar({ from: accounts[clientNum] });
            let carReady = await smartCar.carIsReady.call();
            assert.equal(carReady, true);
            const actualBalance = await web3.eth.getBalance(accounts[0]);
            const expectedBalance = sum(balance0, toWei('1.5', 'ether'), '-500');
            assert(similar(actualBalance, expectedBalance, toWei('0.001', 'ether')), "owner hasn't received proper amount");
            return;
        } catch (error) {
            assert.equal(error.reason, "inncorect reason");
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
        await smartCar.endRentCar({ from: accounts[clientNum] });
        assert(similar(actualBalance, expectedBalance, toWei('0.001', 'ether')), "client hasn't received proper amount");
    });

    it('nonAccessWithdrawal() not client ', async () => {
        try {
            await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
            await smartCar.nonAccessWithdrawal(accounts[0]);
            assert(false);
        } catch (error) {
            assert.equal(error.reason, "not client address");
            await smartCar.endRentCar({ from: accounts[clientNum] });
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
        try {
            await smartCar.allowCarUsage(accounts[clientNum]);
            assert(false);
        } catch (error) {
            assert.equal(error.reason, "not owner address");
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
        await smartCar.endRentCar({ from: accounts[clientNum] });
        assert(canAccess, true);

    });

    it('accessCar() not client ', async () => {
        try {
            await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
            await smartCar.accessCar(accounts[0]);
            assert(false);
        } catch (error) {
            assert.equal(error.reason, "not client address");
            await smartCar.endRentCar({ from: accounts[clientNum] });
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

//functional flow chart
contract('SmartCar', (accounts) => {
    let smartCar;
    var clientNum = 4;

    /*
    CONTRACT DEPLOYMENT
    */

    it('Owner deposited needed amount', async () => {
        smartCar = await SmartCarContract.new({ from: accounts[0], value: web3.utils.toWei('5', 'ether') });

        //Contract successfully deployed
        const owner = await smartCar.owner.call();
        assert.equal(owner, accounts[0], "owner field should contain owner");

        const balance = await getBalance(smartCar.address);
        assert.equal(balance, toWei('5', 'ether'), "contract balance should be 5 ether");
    });

    it('Owner did not deposit the needed amount', async () => {
        //Contract failed to deploy
        try {
            smartCar = await SmartCarContract.new({ from: accounts[0], value: web3.utils.toWei('4', 'ether') });
        } catch (error) {
            assert.equal(error.reason, "should deposit 5 ether");
            return;
        }
        assert(false);
    });

    /*
    CONTRACT SUCCESSFULLY DEPLOYED
    */

    it('Customer calls the rentCar() function and deposits needed amount', async () => {
        await Contract_successfully_deployed();

        //customer's address is set as the current driver address
        await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
        let driver = await smartCar.currentDriverAddress.call();
        assert.equal(driver, accounts[clientNum]);
    });

    it('Customer calls the rentCar() function and does not deposit needed amount', async () => {
        await Contract_successfully_deployed();

        //rentCar() function returns error
        try {
            await smartCar.rentCar({ from: accounts[clientNum], value: toWei('1', 'ether') });
        } catch (error) {
            assert.equal(error.reason, "5 ether required");
            return;
        }
        assert(false);
    });

    /*
    CUSTOMER'S ADDRESS IS SET AS THE CURRENT DRIVER ADDRESS
    */

    it('Owner allows car usage', async () => {
        await Contract_successfully_deployed();

        //Car ready to be used
        await smartCar.allowCarUsage(accounts[0]);
        const allowCarUse = await smartCar.allowCarUse.call();
        assert.equal(allowCarUse, true);
    });

    it('Owner does not allow car usage', async () => {
        await Contract_successfully_deployed();

        //Car not ready to be used
        const allowCarUse = await smartCar.allowCarUse.call();
        assert.equal(allowCarUse, false);
    });

    /*
    CAR READY TO BE USED
    */

    it('Owner cancels booking', async () => {
        await Car_ready_to_be_used();

        const RATE_DAILYRENTAL = await str(smartCar.RATE_DAILYRENTAL);
        const clientDeposit = await str(smartCar.clientDeposit);
        const ownerDeposit0 = await str(smartCar.ownerDeposit);
        const clientBalance0 = await getBalance(accounts[clientNum]);

        await smartCar.cancelBooking(accounts[0]); //when

        const clientBalance = await getBalance(accounts[clientNum]);
        const expectedClientBalance = sum(clientBalance0, clientDeposit, RATE_DAILYRENTAL);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount");

        //Owner pays penalty
        const expectedOwnerDeposit = subt(ownerDeposit0, RATE_DAILYRENTAL);
        const ownerDeposit = await str(smartCar.ownerDeposit);
        assert(similar(ownerDeposit, expectedOwnerDeposit, toWei('0.01', 'ether')), "owner wrong penalty");
    });

    it('customer cancels booking', async () => {
        await Car_ready_to_be_used();

        const clientBalance0 = await getBalance(accounts[clientNum]);
        const clientDeposit = await str(smartCar.clientDeposit);

        await smartCar.cancelBooking(accounts[clientNum]); //when

        //no one pays penalty
        const clientBalance = await getBalance(accounts[clientNum]);
        const expectedClientBalance = sum(clientBalance0, clientDeposit);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount");
    });

    it('customer calls accessCar()', async () => {
        await Car_ready_to_be_used();

        await smartCar.accessCar(accounts[clientNum]);

        //customer has access to car
        const canAccess = await smartCar.canAccess.call();
        assert.equal(canAccess, true);
    });

    /*
    CAR NOT READY TO BE USED
    */

    it('Owner cancels booking', async () => {
        await Car_not_ready_to_be_used();

        const clientDeposit = await str(smartCar.clientDeposit);
        const clientBalance0 = await getBalance(accounts[clientNum]);

        await smartCar.cancelBooking(accounts[0]); //when

        //no one pays penalty
        const clientBalance = await getBalance(accounts[clientNum]);
        const expectedClientBalance = sum(clientBalance0, clientDeposit);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount");
    });

    it('customer calls accessCar()', async () => {
        await Car_not_ready_to_be_used();

        //customer does not have access to car
        try {
            await smartCar.accessCar(accounts[clientNum]);
        } catch (error) {
            assert.equal(error.reason, "CarUse not allowed");
            return;
        }
        assert(false);
    });

    /*
    CUSTOMER HAS ACCESS TO CAR
    */

    it('customer cancels booking', async () => {
        await Customer_has_access_to_car();

        const RATE_DAILYRENTAL = await str(smartCar.RATE_DAILYRENTAL);
        const clientDeposit = await str(smartCar.clientDeposit);
        const clientBalance0 = await getBalance(accounts[clientNum]);

        await smartCar.cancelBooking(accounts[clientNum]); //when

        //Customer pays penalty
        const clientBalance = await getBalance(accounts[clientNum]);
        const expectedClientBalance = sum(clientBalance0, clientDeposit, '-' + RATE_DAILYRENTAL);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount " + clientBalance + " " + expectedClientBalance + " " + fromWei(subt(clientBalance, expectedClientBalance), 'ether'));
    });

    /*
    CUSTOMER DOES NOT HAVE ACCESS TO CAR
    */

    it('customer calls nonAccessWithdrawal()', async () => {
        await Car_not_ready_to_be_used();

        const clientDeposit = await str(smartCar.clientDeposit);
        const ownerDeposit = await str(smartCar.ownerDeposit);
        const clientBalance0 = await getBalance(accounts[clientNum]);

        await smartCar.nonAccessWithdrawal(accounts[clientNum]); //when

        //Customer gets the total deposit 
        const clientBalance = await getBalance(accounts[clientNum]);
        const expectedClientBalance = sum(clientBalance0, clientDeposit, ownerDeposit);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount " + clientBalance + " " + expectedClientBalance + " " + fromWei(subt(clientBalance, expectedClientBalance), 'ether'));
    });

    /*
    END RENT()
    */

    it('no extra time', async () => {
        await Customer_has_access_to_car();

        await smartCar.endRentCar({ from: accounts[clientNum] }); // when

        //Customer calls endRentCar(), owner and customer get their balances back

        //TODO
    });

    it('less than 4 extra days', async () => {
        await Customer_has_access_to_car();

        web3.currentProvider.send({ method: "evm_increaseTime", params: [24 * 3600] }); // when
        await smartCar.endRentCar({ from: accounts[clientNum] });

        //customer calls endRentCar() and pays penalty for extra days. Both owner and customer get their balances back

        //TODO
    });

    it('more than 4 extra days', async () => {
        await Customer_has_access_to_car();

        web3.currentProvider.send({ method: "evm_increaseTime", params: [5 * 24 * 3600] }); // when
        await smartCar.endRentCar({ from: accounts[clientNum] });

        //owner calls endRentCar() and gets the total deposit

        //TODO
    });

    const Contract_successfully_deployed = async () => {
        smartCar = await SmartCarContract.new({ from: accounts[0], value: web3.utils.toWei('5', 'ether') });
    }

    const Car_not_ready_to_be_used = async () => {
        await Contract_successfully_deployed();

        await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
    }

    const Car_ready_to_be_used = async () => {
        await Contract_successfully_deployed();

        await smartCar.rentCar({ from: accounts[clientNum], value: toWei('5', 'ether') });
        await smartCar.allowCarUsage(accounts[0]);
    }

    const Customer_has_access_to_car = async () => {
        await Car_ready_to_be_used();

        await smartCar.accessCar(accounts[clientNum]);
    }
});