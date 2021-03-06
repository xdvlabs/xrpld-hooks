const fs = require('fs')
const xrpljs = require('xrpl-hooks');
const kp = require('ripple-keypairs');
const { exec } = require('child_process');

// Fails via process.exit
module.exports = {
    TestRig: (endpoint)=>
    {
        return new Promise((resolve, reject)=>
        {
            const api = new xrpljs.Client(endpoint);

            const execShell = cmd =>
            {
                return new Promise((resolve, reject) =>
                {
                    exec(cmd, (error, stdout, stderr) =>
                    {
                        if (error)
                        {
                            console.log(error);
                            process.exit(2);
                        }
                        console.log("Ran cmd: `" + cmd + "`");
                        if (stdout)
                            console.log("stdout:", stdout);
                        if (stderr)
                            console.log("stderr:", stderr);
                        resolve([stdout, stderr]);
                    });
                });
            };

            const assertTxnSuccess = x =>
            {
                if (!x || !x.result || x.result.engine_result_code != 0)
                {
                    console.log("Transaction failed:", x)
                    process.exit(1);
                }
            };

            const assertTxnFailure = x =>
            {
                if (!x || !x.result || x.result.engine_result_code == 0)
                {
                    console.log("Transaction failed:", x)
                    process.exit(1);
                }
            };

            const err = (x) =>
            {
                console.log(x); process.exit(1);
            }

            const wasm = (x) =>
            {
                return fs.readFileSync(x).toString('hex').toUpperCase();
            }

            const genesis =  xrpljs.Wallet.fromSeed('snoPBrXtMeMyMHUVTgbuqAfg1SUTb');

            const randomAccount = ()=>
            {
                return xrpljs.Wallet.fromSeed(kp.generateSeed());
            };

            const findWasm = ()=>
            {
                return fs.readdirSync('.').filter(fn => fn.endsWith('.wasm'));
            }

            const fundFromGenesis = (acc) =>
            {    
                return new Promise((resolve, reject) =>
                {
                    if (typeof(acc) != 'string')
                        acc = acc.classicAddress;

                    api.submit({
                        Account: genesis.classicAddress,        // fund account from genesis
                        TransactionType: "Payment",
                        Amount: "1000000000",
                        Destination: acc
                    }, {wallet: genesis}).then(x=>
                    {
                        assertTxnSuccess(x);
                        resolve(x);
                    }).catch(err);
                });
            };
            
            const pay = (seed, amt, dest) =>
            {    
                return new Promise((resolve, reject) =>
                {
                    let wal = xrpljs.Wallet.fromSeed(seed);

                    api.submit({
                        Account: wal.classicAddress,        // fund account from genesis
                        TransactionType: "Payment",
                        Amount: ''+amt,
                        Destination: dest,
                        Fee: "10000"
                    }, {wallet: wal}).then(x=>
                    {
                        assertTxnSuccess(x);
                        resolve(x);
                    }).catch(err);
                });
            };

            api.connect().then(()=>
            {
                resolve({
                    api: api,
                    xrpljs: xrpljs,
                    assertTxnSuccess: assertTxnSuccess,
                    assertTxnFailure: assertTxnFailure,
                    wasm: wasm,
                    kp: kp,
                    genesis: genesis,
                    randomAccount: randomAccount,
                    fundFromGenesis: fundFromGenesis,
                    err: err,
                    hsfOVERRIDE: 1,
                    hsfNSDELETE: 2,
                    pay: pay,
                    findWasm: findWasm,
                    execShell: execShell
                });
            }).catch(err);
        });
    }
};
