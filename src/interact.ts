/*
 * We call the update() method on the contract, create a proof and send it to the chain.
 * The endpoint that we interact with is read from your config.json.
 *
 * This simulates a user interacting with the zkApp from a browser, except that here, sending the transaction happens
 * from the script and we're using your pre-funded zkApp account to pay the transaction fee. In a real web app, the user's wallet
 * would send the transaction and pay the fee.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/interact.js <network>`.
 */
import { Mina, PrivateKey, shutdown, zkappCommandToJson } from 'snarkyjs';
import fs from 'fs/promises';
import { Test } from './Test.js';
import { CircuitNumber } from './snarkyjs-math.js';

// check command line arg
let network = process.argv[2];
if (!network)
  throw Error(`Missing <network> argument.

Usage:
node build/src/interact.js <network>

Example:
node build/src/interact.js berkeley
`);
Error.stackTraceLimit = 1000;

// parse config and private key from file
type Config = { networks: Record<string, { url: string; keyPath: string }> };
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.networks[network];
let key: { privateKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);
let zkAppKey = PrivateKey.fromBase58(key.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network(config.url);
Mina.setActiveInstance(Network);
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new Test(zkAppAddress);

// compile the contract to create prover keys
console.log('compile the contract...');
await Test.compile();
console.log('Compiled!')

console.log('build transaction and create proof...');
let tx = await Mina.transaction({ feePayerKey: zkAppKey, fee: 0.1e9 }, () => {
  zkApp.set(CircuitNumber.from(2.3));
});
await tx.prove();
console.log("First transaction is prooved");
let sentTx = await tx.send();
console.log("First transaction is sent");

let tx2 = await Mina.transaction({ feePayerKey: zkAppKey, fee: 0.1e9 }, () => {
  zkApp.add(CircuitNumber.from(3.4));
});
await tx2.prove();
console.log("Second transaction is prooved");
let sentTx2 = await tx2.send();
console.log("Second transaction is sent");

shutdown();
