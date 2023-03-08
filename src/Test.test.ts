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
    // const number = CircuitNumber.from(5.1281874);
    // const number2 = CircuitNumber.from(3.9912344);
    // const number3 = CircuitNumber.from(0.03);
    // const number4 = CircuitNumber.from(787);
    const number = CircuitNumber.from(0.45);
    const number2 = CircuitNumber.from(2.33);
    const answer = CircuitNumber.from(0.45 / 2.33);

    // (5 + 0.128) * (3 + 0.991) = (5 * 3) + (5 * 0.991) + (3 * 0.128) + (0.128 + 0.991)

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

    // console.log(CircuitNumber.from(1.69).div(CircuitNumber.from(2)).toNumber())
    // console.log(CircuitMath.cos(CircuitNumber.PI).toNumber());
    // console.log(CircuitMath.ln(CircuitNumber.from(45)).toNumber());
    // console.log(CircuitMath.log2(CircuitNumber.from(343.34)).toNumber());
    // console.log(CircuitMath.cos(number2).toNumber());
    // console.log(CircuitNumber.from(924269.181808896).valueOf());
    // console.log(CircuitNumber.from(924269.181808896).equals(CircuitNumber.from(924269.181808896).add(CircuitNumber.from(0))).toBoolean());

    console.log(CircuitMath.sin(CircuitNumber.from(43.2)).toNumber());
    console.log(CircuitMath.cos(CircuitNumber.from(43.2)).toNumber());
    console.log(CircuitMath.tan(CircuitNumber.from(43.2)).toNumber());

    // console.log(CircuitMath.logBase(number1, number2).toNumber());
    // console.log(CircuitMath.log10(CircuitNumber.from(10)).toNumber());
    // console.log(CircuitMath.cos(CircuitNumber.from(2 * 3.14)).toNumber());
    // console.log(CircuitNumberExact.from(3.20000001).lte(CircuitNumberExact.from(3.20000001)).toBoolean());
    // console.log(CircuitMath.tan(CircuitNumber.from(1.4)).toNumber());

    // console.log(CircuitMath.sinh(number1).toNumber());
    // console.log(CircuitMath.tanh(number2).toNumber());

    // console.log(CircuitMath.ln(CircuitNumber.from(1)).toNumber());
    // console.log(CircuitMath.ln(CircuitNumber.from(1.3)).toNumber());
    // console.log(CircuitMath.ln(CircuitNumber.from(1.5)).toNumber());
    // console.log(CircuitMath.ln(CircuitNumber.from(1.7)).toNumber());
    // console.log(CircuitMath.ln(CircuitNumber.from(2)).toNumber());

    // console.log(CircuitMath.rootBase(CircuitNumber.from(13.45), CircuitNumber.from(4.3)).toNumber());

    // console.log(CircuitMath.arctan(CircuitNumber.from(0.2)).toNumber());
    
    // console.log(CircuitNumber.from(3.4).round().toNumber());
    // console.log(CircuitNumber.from(3.6).round().toNumber());

    // console.log(CircuitMath.cos(number1).valueOf());

    // console.log(CircuitNumber.from(4.0).floor().toNumber());
    // console.log(CircuitNumber.from(4.9).ceil().toNumber());
    // console.log(CircuitNumber.from(4.9).trunc().toNumber());

    // console.log(CircuitNumber.from(-4.0).floor().toNumber());
    // console.log(CircuitNumber.from(-4.9).ceil().toNumber());
    // console.log(CircuitNumber.from(-4.9).trunc().toNumber());

    // console.log(CircuitNumber.from(5).mod(CircuitNumber.from(4)).toNumber());
    // console.log(CircuitNumber.from(-5).mod(CircuitNumber.from(4)).toNumber());
    // console.log(CircuitNumber.from(5).mod(CircuitNumber.from(-4)).toNumber());
    // console.log(CircuitNumber.from(-5).mod(CircuitNumber.from(-4)).toNumber());

    // console.log(CircuitNumber.from(5.2).mod(CircuitNumber.from(4.1)).toNumber());
    // console.log(CircuitNumber.from(-5.2).mod(CircuitNumber.from(4.1)).toNumber());
    // console.log(CircuitNumber.from(5.2).mod(CircuitNumber.from(-4.1)).toNumber());
    // console.log(CircuitNumber.from(-5.2).mod(CircuitNumber.from(-4.1)).toNumber());
  });

  // Is Integer Tests
  // it('Is Integer Test 1: Positive Integer', async () => {
  //   const number = CircuitNumber.fromNumber(7);
  //   const answer = Bool(true);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();

  //   expect(zkAppInstance.isInteger()).toEqual(answer);
  // });

  // it('Is Integer Test 2: Negative Integer', async () => {
  //   const number = CircuitNumber.fromNumber(-7);
  //   const answer = Bool(true);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();

  //   expect(zkAppInstance.isInteger()).toEqual(answer);
  // });

  // it('Is Integer Test 3: Positive Decimal', async () => {
  //   const number = CircuitNumber.fromNumber(7.5);
  //   const answer = Bool(false);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();

  //   expect(zkAppInstance.isInteger()).toEqual(answer);
  // });

  // it('Is Integer Test 4: Negative Decimal', async () => {
  //   const number = CircuitNumber.fromNumber(-7.5);
  //   const answer = Bool(false);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();

  //   expect(zkAppInstance.isInteger()).toEqual(answer);
  // });

  // Is Positive Tests

  // Absolute Value Tests
  // it('Absolute Value Test 1: Positive Integer', async () => {
  //   const number = CircuitNumber.fromNumber(7);
  //   const answer = CircuitNumber.fromNumber(7);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();
  //   const txn2 = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.abs();
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn2.send();

  //   expect(zkAppInstance.get()).toEqual(answer.toNumber());
  // });
  // it('Absolute Value Test 2: Negative Integer', async () => {
  //   const number = CircuitNumber.fromNumber(-7);
  //   const answer = CircuitNumber.fromNumber(7);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();
  //   const txn2 = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.abs();
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn2.send();

  //   expect(zkAppInstance.get()).toEqual(answer.toNumber());
  // });
  // it('Absolute Value Test 3: Positive Float', async () => {
  //   const number = CircuitNumber.fromNumber(7.5);
  //   const answer = CircuitNumber.fromNumber(7.5);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();
  //   const txn2 = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.abs();
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn2.send();

  //   expect(zkAppInstance.get()).toEqual(answer.toNumber());
  // });
  // it('Absolute Value Test 4: Negative Float', async () => {
  //   const number = CircuitNumber.fromNumber(-7.5);
  //   const answer = CircuitNumber.fromNumber(7.5);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();
  //   const txn2 = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.abs();
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn2.send();

  //   expect(zkAppInstance.get()).toEqual(answer.toNumber());
  // });

  // Ceil Tests

  // Floor Tests

  // Addition Test
  // it('Addition Test 1: Positive Float', async () => {
  //   const number = CircuitNumber.fromNumber(7);
  //   const number2 = CircuitNumber.fromNumber(2.5)
  //   const answer = CircuitNumber.fromNumber(9.5);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();
  //   const txn2 = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.add(number2);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn2.send();

  //   expect(zkAppInstance.get()).toEqual(answer.toNumber());
  // });

  // it('Addition Test 2: Positive Float with Overflow', async () => {
  //   const number = CircuitNumber.fromNumber(7.6);
  //   const number2 = CircuitNumber.fromNumber(2.5)
  //   const answer = CircuitNumber.fromNumber(10.1);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();
  //   const txn2 = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.add(number2);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn2.send();

  //   expect(zkAppInstance.get()).toEqual(answer.toNumber());
  // });

  // Multiplication Test
  // it('Multiplication Test 1: Positive Float', async () => {
  //   const number = CircuitNumber.fromNumber(7.3);
  //   const number2 = CircuitNumber.fromNumber(-2.5)
  //   const answer = CircuitNumber.fromNumber(-18.25);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();
  //   const txn2 = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.mul(number2);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn2.send();

  //   expect(zkAppInstance.get()).toEqual(answer.toNumber());
  // });

  // Division Test
  // it('Division Test 1: Positive Float', async () => {
  //   const number = CircuitNumber.fromNumber(7.3);
  //   const number2 = CircuitNumber.fromNumber(-2.5)
  //   const answer = CircuitNumber.fromNumber(-2.92);

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.set(number);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn.send();
  //   const txn2 = await Mina.transaction(deployerAccount, () => {
  //     zkAppInstance.div(number2);
  //     zkAppInstance.sign(zkAppPrivateKey);
  //   });
  //   await txn2.send();

  //   expect(zkAppInstance.get()).toEqual(answer.toNumber());
  // });
});
