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

function toSeconds(days) {
    return days * 24 * 3600;
}

function fromSeconds(sec) {
    return sec / 24 / 3600;
}

function compareMsg(msg, act, exp) {
    return msg + " actual:" + fromWei(act, 'ether') + " expected:" + fromWei(exp, 'ether') + " difference:" + fromWei(subt(act, exp), 'ether');
}

advanceTime = (time) => {
    return new Promise((resolve, reject) => {
        web3.currentProvider.send({
            jsonrpc: "2.0",
            method: "evm_increaseTime",
            params: [time],
            id: new Date().getTime()
        }, (err, result) => {
            if (err) { return reject(err); }
            return resolve(result);
        });
    });
}


//functional flow chart
contract('SmartCar', (accounts) => {
    let smartCar;
    var clientNum = 4;

    let CONTRACT_COST;
    let RATE_DAILYRENTAL;
    let MAX_DAYS;

    it('Loading constants...', async () => {
        smartCar = await SmartCarContract.new({ from: accounts[0], value: web3.utils.toWei('5', 'ether') }); //trzeba ustawić contract_cost na sztywno
        RATE_DAILYRENTAL = await str(smartCar.RATE_DAILYRENTAL);
        CONTRACT_COST = await str(smartCar.CONTRACT_COST);
        MAX_DAYS = await str(smartCar.MAX_DAYS);
    });

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
        const balance = await getBalance(smartCar.address);
        const expectedBalance = sum(CONTRACT_COST, CONTRACT_COST);
        assert.equal(balance, expectedBalance, "contract balance should be 10 ether");
    });

    it('Customer calls the rentCar() function and does not deposit needed amount', async () => {
        await Contract_successfully_deployed();

        //rentCar() function returns error
        try {
            await smartCar.rentCar({ from: accounts[clientNum], value: toWei('4', 'ether') });
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

        const clientDeposit = await str(smartCar.clientDeposit);
        const ownerDeposit0 = await str(smartCar.ownerDeposit);
        const clientBalance0 = await getBalance(accounts[clientNum]);

        await smartCar.cancelBooking(accounts[0]); //when

        const clientBalance = await getBalance(accounts[clientNum]);
        const expectedClientBalance = sum(clientBalance0, clientDeposit, RATE_DAILYRENTAL);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount");
        const balance = await getBalance(smartCar.address);
        const expectedBalance = sum(CONTRACT_COST, '-' + RATE_DAILYRENTAL);
        assert.equal(balance, expectedBalance, "contract balance should be 4 ether");

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

        const balance = await getBalance(smartCar.address);
        const expectedBalance = sum(CONTRACT_COST);
        assert.equal(balance, expectedBalance, "contract balance should be 5 ether");
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

        const balance = await getBalance(smartCar.address);
        const expectedBalance = sum(CONTRACT_COST);
        assert.equal(balance, expectedBalance, "contract balance should be 5 ether");
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

        const clientDeposit = await str(smartCar.clientDeposit);
        const clientBalance0 = await getBalance(accounts[clientNum]);

        await smartCar.cancelBooking(accounts[clientNum]); //when

        //Customer pays penalty
        const clientBalance = await getBalance(accounts[clientNum]);
        const expectedClientBalance = sum(clientBalance0, clientDeposit, '-' + RATE_DAILYRENTAL);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount " + clientBalance + " " + expectedClientBalance + " " + fromWei(subt(clientBalance, expectedClientBalance), 'ether'));

        const balance = await getBalance(smartCar.address);
        const expectedBalance = sum(CONTRACT_COST, RATE_DAILYRENTAL);
        assert.equal(balance, expectedBalance, "contract balance should be 6 ether");
    });

    it('too late for booking cancellation', async () => {
        await Customer_has_access_to_car();
        await advanceTime(toSeconds(1));
        try {
            await smartCar.cancelBooking(accounts[0]);
        } catch (error) {
            assert.equal(error.reason, "Too late for booking cancel");
            return;
        }
        assert(false);
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
        const expectedClientBalance = sum(clientBalance0, RATE_DAILYRENTAL);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount " + clientBalance + " " + expectedClientBalance + " " + fromWei(subt(clientBalance, expectedClientBalance), 'ether'));
    });

    it('customer calls nonAccessWithdrawal() twice in row incorrectly', async () => {
        await Car_not_ready_to_be_used();
        await smartCar.nonAccessWithdrawal(accounts[clientNum]); //when

        try {
            await smartCar.nonAccessWithdrawal(accounts[clientNum]);
        } catch (error) {
            assert.equal(error.reason, "you have to wait at least 30 minutes between those withdraws");
            return;
        }
        assert(false);
    });

    it('customer calls nonAccessWithdrawal() twice in row correctly', async () => {
        await Car_not_ready_to_be_used();

        const clientDeposit = await str(smartCar.clientDeposit);
        const ownerDeposit = await str(smartCar.ownerDeposit);
        const clientBalance0 = await getBalance(accounts[clientNum]);

        await smartCar.nonAccessWithdrawal(accounts[clientNum]); //when
        await advanceTime(toSeconds(1));
        await smartCar.nonAccessWithdrawal(accounts[clientNum]); //when

        //Customer gets the total deposit 
        const clientBalance = await getBalance(accounts[clientNum]);
        const expectedClientBalance = sum(clientBalance0, RATE_DAILYRENTAL, RATE_DAILYRENTAL);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount " + clientBalance + " " + expectedClientBalance + " " + fromWei(subt(clientBalance, expectedClientBalance), 'ether'));
    });

    /*
    END RENT()
    */

    it('no extra time', async () => {
        await Customer_has_access_to_car();

        const clientDeposit = await str(smartCar.clientDeposit);
        const ownerDeposit = await str(smartCar.ownerDeposit);
        const clientBalance0 = await getBalance(accounts[clientNum]);
        const ownerBalance0 = await getBalance(accounts[0]);

        await smartCar.endRentCar({ from: accounts[clientNum] }); // when

        //Customer calls endRentCar(), owner and customer get their balances back

        const clientBalance = await getBalance(accounts[clientNum]);
        const expectedClientBalance = sum(clientBalance0, clientDeposit, '-' + RATE_DAILYRENTAL);
        const ownerBalance = await getBalance(accounts[0]);
        const expectedOwnerBalance = sum(ownerBalance0, RATE_DAILYRENTAL);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount " + clientBalance + " " + expectedClientBalance + " " + fromWei(subt(clientBalance, expectedClientBalance), 'ether'));
        assert(similar(ownerBalance, expectedOwnerBalance, toWei('0.01', 'ether')), "owner hasn't received proper amount ");
    });

    it('less than 4 extra days', async () => {
        await Customer_has_access_to_car();

        const clientBalance0 = await getBalance(accounts[clientNum]);
        const ownerBalance0 = await getBalance(accounts[0]);

        const extraDays = 1;
        await advanceTime(toSeconds(1 + extraDays)); // when
        await smartCar.endRentCar({ from: accounts[clientNum] });

        //customer calls endRentCar() and pays penalty for extra days. Both owner and customer get their balances back
        const clientBalance = await getBalance(accounts[clientNum]);
        const clientDeposit = await str(smartCar.clientDeposit);
        const penalty = (extraDays * RATE_DAILYRENTAL).toString();
        const expectedClientBalance = sum(clientBalance0, clientDeposit);
        const ownerBalance = await getBalance(accounts[0]);
        const expectedOwnerBalance = sum(ownerBalance0, RATE_DAILYRENTAL, penalty);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), compareMsg("client hasn't received proper amount", clientBalance, expectedClientBalance));
        assert(similar(ownerBalance, expectedOwnerBalance, toWei('0.01', 'ether')), compareMsg("owner hasn't received proper amount", ownerBalance, expectedOwnerBalance));
    });

    it('more than 4 extra days', async () => {
        await Customer_has_access_to_car();

        const clientDeposit = await str(smartCar.clientDeposit);
        const ownerDeposit = await str(smartCar.ownerDeposit);
        const clientBalance0 = await getBalance(accounts[clientNum]);
        const ownerBalance0 = await getBalance(accounts[0]);

        await advanceTime(5 * 24 * 3600); // when
        await smartCar.endRentCar({ from: accounts[0] });

        //owner calls endRentCar() and gets the total deposit
        const clientBalance = await getBalance(accounts[clientNum]);
        const expectedClientBalance = clientBalance0;
        const ownerBalance = await getBalance(accounts[0]);
        const expectedOwnerBalance = sum(ownerBalance0, CONTRACT_COST, clientDeposit);
        assert(similar(clientBalance, expectedClientBalance, toWei('0.01', 'ether')), "client hasn't received proper amount " + clientBalance + " " + expectedClientBalance + " " + fromWei(subt(clientBalance, expectedClientBalance), 'ether'));
        assert(similar(ownerBalance, expectedOwnerBalance, toWei('0.01', 'ether')), "owner hasn't received proper amount "  + ownerBalance + " " + expectedOwnerBalance + " " + fromWei(subt(ownerBalance, expectedOwnerBalance), 'ether'));
    });

    const Contract_successfully_deployed = async () => {
        smartCar = await SmartCarContract.new({ from: accounts[0], value: CONTRACT_COST });
    }

    const Car_not_ready_to_be_used = async () => {
        await Contract_successfully_deployed();

        await smartCar.rentCar({ from: accounts[clientNum], value: CONTRACT_COST });
    }

    const Car_ready_to_be_used = async () => {
        await Contract_successfully_deployed();

        await smartCar.allowCarUsage(accounts[0]);
        await smartCar.rentCar({ from: accounts[clientNum], value: CONTRACT_COST });
    }

    const Customer_has_access_to_car = async () => {
        await Car_ready_to_be_used();

        await smartCar.accessCar(accounts[clientNum]);
    }
});