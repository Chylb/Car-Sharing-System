const PlaygroundContract = artifacts.require('Playground');

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

contract('Playground', (accounts) => {
    let playground;
    const creator = accounts[0];
    const caller = accounts[1];
    const receiver = accounts[2];
    const sender = accounts[3];

    it('creating...', async () => {
        playground = await PlaygroundContract.new({ from: creator });
    });

    it('test 0', async () => {
        await playground.send({ from: sender, value: toWei('1', 'ether') });

        const contractBalance0 = await getBalance(playground.address);

        const callerBalance0 = await getBalance(caller);
        const receiverBalance0 = await getBalance(receiver);

        await playground.withdraw(receiver, toWei('1', 'ether'), { from: caller });

        const callerBalance1 = await getBalance(caller);
        const receiverBalance1 = await getBalance(receiver);

        const callerDiff = subt(callerBalance1, callerBalance0);
        const receiverDiff = subt(receiverBalance1, receiverBalance0);
        console.log("caller difference " + callerDiff);
        console.log("receiver difference " + receiverDiff);
    });


});
