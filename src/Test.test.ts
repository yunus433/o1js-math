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
} from './snarkyjs-math.js';

import {
  Test
} from './Test.js';

// IMPORTANT NOTES:
// As there are a lot of tests, running them all may take a while. You may consider commenting out the tests not useful to you and run only the rest.
// Currently library tests all the functions using `number1` and `number2`, which are 2 non-zero random floating point numbers in the range ]-`MAX_NUMBER` - `MAX_NUMBER`[, exclusive.
// Change `number1` or `number2` to test with a specific value.
// For all functions called, the first argument is `number1`, and the second is `number2` if exists.

const MAX_NUMBER = 100;
const PRECISION = 1e8;

function createLocalBlockchain() {
  const Local = Mina.LocalBlockchain({ proofsEnabled: false });
  Mina.setActiveInstance(Local);
  return Local.testAccounts[0].privateKey;
};

function generateRandomNumber(_sign?: number): number {
  const sign = (_sign && (_sign == 1 || _sign == -1)) ? _sign : ((Math.random() > 0.5) ? 1 : -1);
  const number = sign * Math.trunc(Math.random() * MAX_NUMBER) + Math.random();

  if (number != 0) return number;

  return generateRandomNumber();
};

describe('Test', () => {
  const number1 = CircuitNumber.from(generateRandomNumber());
  const number2 = CircuitNumber.from(generateRandomNumber());

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

  beforeEach(async () => {
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();
  });

  afterAll(async () => {
    setTimeout(shutdown, 0);
  });

  // CircuitNumber Arithmetic Conversion Function Tests

  it('Test 1: Absolute Value - CircuitNumber.prototype.abs()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.abs();
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect(result.valueOf()).toEqual(Math.abs(number1.valueOf()));
    console.log(`Test 1 Passed: Absolute Value (${number1} -> ${result.valueOf()})`);
  });

  it('Test 2: Ceil - CircuitNumber.prototype.ceil()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.ceil();
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect(result.valueOf()).toEqual(Math.ceil(number1.valueOf()));
    console.log(`Test 2 Passed: Ceil (${number1} -> ${result.valueOf()})`);
  });

  it('Test 3: Floor - CircuitNumber.prototype.floor()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.floor();
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect(result.valueOf()).toEqual(Math.floor(number1.valueOf()));
    console.log(`Test 3 Passed: Floor (${number1} -> ${result.valueOf()})`);
  });

  it('Test 4: Inverse - CircuitNumber.prototype.inv()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.inv();
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect(result.valueOf()).toEqual(CircuitNumber.from(1 / number1.valueOf()).valueOf());
    console.log(`Test 4 Passed: Inverse (${number1} -> ${result.valueOf()})`);
  });

  it('Test 5: Negation - CircuitNumber.prototype.neg()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.neg();
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect(result.valueOf()).toEqual(-1 * number1.valueOf());
    console.log(`Test 5 Passed: Negation (${number1} -> ${result.valueOf()})`);
  });

  it('Test 6: Round - CircuitNumber.prototype.round()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.round();
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect(result.valueOf()).toEqual(Math.round(number1.valueOf()));
    console.log(`Test 6 Passed: Round (${number1} -> ${result.valueOf()})`);
  });

  it('Test 7: Trunc - CircuitNumber.prototype.trunc()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.trunc();
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect(result.valueOf()).toEqual(Math.trunc(number1.valueOf()));
    console.log(`Test 7 Passed: Trunc (${number1} -> ${result.valueOf()})`);
  });

  // CircuitNumber Logic Comparison Function Tests

  it('Test 8: Equal - CircuitNumber.prototype.equals()', async () => {
    let answer: Bool;

    const txn = await Mina.transaction(deployerAccount, () => {
      answer = zkAppInstance.equals(number2);
      zkAppInstance.sign(zkAppPrivateKey);
      expect(answer).toEqual(Bool(number1.valueOf() == number2.valueOf()));
    });
    await txn.send();

    console.log(`Test 8 Passed: Equal (${number1} == ${number2})`);
  });

  it('Test 9: In Precision Range - CircuitNumber.prototype.inPrecisionRange()', async () => {
    let answer: Bool;

    const txn = await Mina.transaction(deployerAccount, () => {
      answer = zkAppInstance.inPrecisionRange(number2);
      zkAppInstance.sign(zkAppPrivateKey);
      expect(answer).toEqual(Bool(Math.abs(number1.valueOf() - number2.valueOf()) <= 1 / PRECISION));
    });
    await txn.send();

    console.log(`Test 9 Passed: In Precision Range (${number1} ~ ${number2})`);
  });

  it('Test 10: Greater Than - CircuitNumber.prototype.gt()', async () => {
    let answer: Bool;

    const txn = await Mina.transaction(deployerAccount, () => {
      answer = zkAppInstance.gt(number2);
      zkAppInstance.sign(zkAppPrivateKey);
      expect(answer).toEqual(Bool(number1.valueOf() > number2.valueOf()));
    });
    await txn.send();

    console.log(`Test 10 Passed: Greater Than (${number1} > ${number2})`);
  });

  it('Test 11: Greater Than Or Equal - CircuitNumber.prototype.gte()', async () => {
    let answer: Bool;

    const txn = await Mina.transaction(deployerAccount, () => {
      answer = zkAppInstance.gte(number2);
      zkAppInstance.sign(zkAppPrivateKey);
      expect(answer).toEqual(Bool(number1.valueOf() >= number2.valueOf()));
    });
    await txn.send();

    console.log(`Test 11 Passed: Greater Than Or Equal (${number1} >= ${number2})`);
  });

  it('Test 12: Little Than - CircuitNumber.prototype.gt()', async () => {
    let answer: Bool;

    const txn = await Mina.transaction(deployerAccount, () => {
      answer = zkAppInstance.lt(number2);
      zkAppInstance.sign(zkAppPrivateKey);
      expect(answer).toEqual(Bool(number1.valueOf() < number2.valueOf()));
    });
    await txn.send();

    console.log(`Test 12 Passed: Little Than (${number1} < ${number2})`);
  });

  it('Test 13: Little Than Or Equal - CircuitNumber.prototype.gt()', async () => {
    let answer: Bool;

    const txn = await Mina.transaction(deployerAccount, () => {
      answer = zkAppInstance.lte(number2);
      zkAppInstance.sign(zkAppPrivateKey);
      expect(answer).toEqual(Bool(number1.valueOf() <= number2.valueOf()));
    });
    await txn.send();

    console.log(`Test 13 Passed: Little Than Or Equal (${number1} <= ${number2})`);
  });

  // CircuitNumber Arithmetic Operation Function Tests

  it('Test 14: Addition - CircuitNumber.prototype.add()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.add(number2);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect((result.inPrecisionRange(CircuitNumber.from(number1.valueOf() + number2.valueOf())))).toEqual(Bool(true));

    console.log(`Test 14 Passed: Addition (${number1} + ${number2} -> ${result.valueOf()})`);
  });

  it('Test 15: Substraction - CircuitNumber.prototype.sub()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.sub(number2);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect((result.inPrecisionRange(CircuitNumber.from(number1.valueOf() - number2.valueOf())))).toEqual(Bool(true));

    console.log(`Test 15 Passed: Substraction (${number1} - ${number2} -> ${result.valueOf()})`);
  });

  it('Test 16: Multiplication - CircuitNumber.prototype.mul()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.mul(number2);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect((result.inPrecisionRange(CircuitNumber.from(number1.valueOf() * number2.valueOf())))).toEqual(Bool(true));

    console.log(`Test 16 Passed: Multiplication (${number1} * ${number2} -> ${result.valueOf()})`);
  });

  it('Test 17: Division - CircuitNumber.prototype.div()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.div(number2);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect((result.inPrecisionRange(CircuitNumber.from(number1.valueOf() / number2.valueOf())))).toEqual(Bool(true));

    console.log(`Test 17 Passed: Division (${number1} / ${number2} -> ${result.valueOf()})`);
  });

  it('Test 18: Reminder - CircuitNumber.prototype.mod()', async () => {
    const txn0 = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.set(number1);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn0.send();
    const txn = await Mina.transaction(deployerAccount, () => {
      zkAppInstance.mod(number2);
      zkAppInstance.sign(zkAppPrivateKey);
    });
    await txn.send();

    const result = zkAppInstance.get();

    expect(result.valueOf()).toEqual(CircuitNumber.from(number1.valueOf() % number2.valueOf()).valueOf());

    console.log(`Test 18 Passed: Reminder (${number1} mod ${number2} -> ${result.valueOf()})`);
  });
});
