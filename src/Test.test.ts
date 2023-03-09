import {
  AccountUpdate,
  Bool,
  Circuit,
  Field,
  isReady,
  Mina,
  PrivateKey,
  PublicKey,
  shutdown,
  UInt32,
  UInt64,
} from 'snarkyjs';
import {
  CircuitConstant,
  CircuitMath,
  CircuitNumber
} from './snarkyjs-math';

import {
  Test
} from './Test';

function createLocalBlockchain() {
  const Local = Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  return Local.testAccounts[0].privateKey;
};

describe('Test', () => {
  let deployerAccount: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkAppInstance: Test;

  beforeAll(async () => {
    await isReady;
    deployerAccount = createLocalBlockchain();
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkAppInstance = new Test(zkAppAddress);
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkAppInstance.deploy({ zkappKey: zkAppPrivateKey });
    });
    await txn.send();
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  it('Deploy `Test` Smart Contract with the Chosen Number', async () => {
    // Basic Arithmatic Functions with the SmartContract

    // const number = CircuitNumber.from(0.45);
    // const number2 = CircuitNumber.from(2.33);
    // const answer = CircuitNumber.from(0.45 / 2.33);

    // const txn = await Mina.transaction(deployerAccount, () => {
    //   zkAppInstance.set(number);
    //   zkAppInstance.sign(zkAppPrivateKey);
    // });
    // await txn.send();

    // const txn2 = await Mina.transaction(deployerAccount, () => {
    //   zkAppInstance.div(number2);
    //   zkAppInstance.sign(zkAppPrivateKey);
    // });
    // await txn2.send();

    // console.log(zkAppInstance.get().valueOf());

    // expect(zkAppInstance.get().inPrecisionRange(answer)).toEqual(Bool(true));

    // Number Conversions

    // console.log(CircuitNumber.from(4.0).floor().toNumber());
    // console.log(CircuitNumber.from(4.9).ceil().toNumber());
    // console.log(CircuitNumber.from(4.9).trunc().toNumber());
    // console.log(CircuitNumber.from(-4.0).floor().toNumber());
    // console.log(CircuitNumber.from(-4.9).ceil().toNumber());
    // console.log(CircuitNumber.from(-4.9).trunc().toNumber());
    // console.log(CircuitNumber.from(3.4).round().toNumber());
    // console.log(CircuitNumber.from(3.6).round().toNumber());

    // Trigonometric Functions

    // console.log(CircuitMath.sin(CircuitNumber.from(43.3)).toNumber());
    // console.log(CircuitMath.cos(CircuitNumber.from(43.3)).toNumber());
    // console.log(CircuitMath.tan(CircuitNumber.from(43.3)).toNumber());

    // Logarithmic Functions

    // console.log(CircuitMath.ln(CircuitNumber.from(54.7)).toNumber());

    // Root Functions

    // console.log(CircuitMath.sqrt(CircuitNumber.from(43.67)).toNumber());
    // console.log(CircuitMath.rootBase(CircuitNumber.from(13.45), CircuitNumber.from(2.3)).toNumber());
  });
});
