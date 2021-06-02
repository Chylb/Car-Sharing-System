const TimeTestContract = artifacts.require('TimeTest');

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

function fromDays(days) {
    return days * 24 * 3600;
}

function fromMinutes(minutes) {
    return minutes * 60;
}

function fromSeconds(sec) {
    return sec / 24 / 3600;
}

async function printBlockTime(timeTest) {
    let time = await timeTest.getBlockTime.call();
    time = 1000 * parseInt(time.toString());
    const date = new Date(time);
    console.log(date.toLocaleString())
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

contract('TimeTest', (accounts) => {
    let timeTest;
    const dt = 11;

    it('creating...', async () => {
        timeTest = await TimeTestContract.new({ from: accounts[0] });
    });

    it('test 0', async () => {
        for (let i = 0; i < 3; i++) {
            await advanceTime(3600);

            await printBlockTime(timeTest);
        }
    });

    it('test emit', async () => {
        for (let i = 0; i < 3; i++) {
            await advanceTime(dt);
            
            await timeTest.emitEvent();
            await printBlockTime(timeTest);
        }
    });

    it('test block change', async () => {
        for (let i = 0; i < 3; i++) {
            await advanceTime(dt);
            
            await timeTest.setVar(10);
            await printBlockTime(timeTest);
        }
    }); 

    it('test require satisfied', async () => {
        for (let i = 0; i < 10; i++) {
            await timeTest.updateTimeStamp();
            const t0 = timeTest.timestamp.call();

            await advanceTime(100);

            await timeTest.requirePassed(90);
        }
    }); 

    it('test require not satisfied', async () => {
        for (let i = 0; i < 10; i++) {
            await timeTest.updateTimeStamp();
            const t0 = timeTest.timestamp.call();

            await advanceTime(90);

            try {
                await timeTest.requirePassed(100);
            } catch (error) {
                assert.equal(error.reason, "failed require");
                return;
            }
            assert(false);
        }
    }); 

    it('test require satisfied error', async () => {
        for (let i = 0; i < 10; i++) {
            await timeTest.updateTimeStamp();
            const t0 = timeTest.timestamp.call();

            await advanceTime(90);

            await timeTest.requirePassed(100);
        }
    }); 

    it('test require not satisfied error', async () => {
        for (let i = 0; i < 10; i++) {
            await timeTest.updateTimeStamp();
            const t0 = timeTest.timestamp.call();

            await advanceTime(90);

            try {
                await timeTest.requirePassed(100);
            } catch (error) {
                assert.equal(error.reason, "failed require");
                assert(false);
                return;
            }
            assert(true);
        }
    }); 
});