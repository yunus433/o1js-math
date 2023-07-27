import { Test } from './Test';
import { Bool, Mina, PrivateKey, PublicKey, AccountUpdate } from 'snarkyjs';
import { CircuitNumber } from './snarkyjs-math';

let proofsEnabled = false;

const MAX_NUMBER = 100;
const PRECISION = 1e8;

function generateRandomNumber(_sign?: number): number {
  const sign = (_sign && (_sign == 1 || _sign == -1)) ? _sign : ((Math.random() > 0.5) ? 1 : -1);
  const number = sign * Math.trunc(Math.random() * MAX_NUMBER) + Math.random();

  if (number != 0) return number;

  return generateRandomNumber();
};

function gcd(x: number, y: number): number {
  if (y == 0) return x;

  return gcd(y, x % y);
};

function lcm(x: number, y: number): number {
  return x * y / gcd(x, y);
};

describe('Test', () => {
  const number1 = CircuitNumber.from(generateRandomNumber());
  const number2 = CircuitNumber.from(generateRandomNumber());

  let deployerAccount: PublicKey,
    deployerKey: PrivateKey,
    senderAccount: PublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: Test;

  beforeAll(async () => {
    if (proofsEnabled) await Test.compile();
  });

  beforeEach(async () => {
    const Local = Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    ({ privateKey: deployerKey, publicKey: deployerAccount } =
      Local.testAccounts[0]);
    ({ privateKey: senderKey, publicKey: senderAccount } =
      Local.testAccounts[1]);
    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new Test(zkAppAddress);

    await localDeploy();

    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.set(number1);
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  // CircuitNumber Arithmetic Conversion Function Tests

  // it('Test 1: Absolute Value - CircuitNumber.prototype.abs()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.abs();
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect(result.valueOf()).toEqual(Math.abs(number1.valueOf()));
  //   console.log(`Test 1 Passed: Absolute Value (${number1} -> ${result.valueOf()})`);
  // });

  // it('Test 2: Ceil - CircuitNumber.prototype.ceil()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.ceil();
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect(result.valueOf()).toEqual(Math.ceil(number1.valueOf()));
  //   console.log(`Test 2 Passed: Ceil (${number1} -> ${result.valueOf()})`);
  // });

  // it('Test 3: Floor - CircuitNumber.prototype.floor()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.floor();
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect(result.valueOf()).toEqual(Math.floor(number1.valueOf()));
  //   console.log(`Test 3 Passed: Floor (${number1} -> ${result.valueOf()})`);
  // });

  // it('Test 4: Inverse - CircuitNumber.prototype.inv()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.inv();
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect(result.valueOf()).toEqual(CircuitNumber.from(1 / number1.valueOf()).valueOf());
  //   console.log(`Test 4 Passed: Inverse (${number1} -> ${result.valueOf()})`);
  // });

  // it('Test 5: Negation - CircuitNumber.prototype.neg()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.neg();
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect(result.valueOf()).toEqual(-1 * number1.valueOf());
  //   console.log(`Test 5 Passed: Negation (${number1} -> ${result.valueOf()})`);
  // });

  // it('Test 6: Round - CircuitNumber.prototype.round()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.round();
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect(result.valueOf()).toEqual(Math.round(number1.valueOf()));
  //   console.log(`Test 6 Passed: Round (${number1} -> ${result.valueOf()})`);
  // });

  // it('Test 7: Trunc - CircuitNumber.prototype.trunc()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.trunc();
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect(result.valueOf()).toEqual(Math.trunc(number1.valueOf()));
  //   console.log(`Test 7 Passed: Trunc (${number1} -> ${result.valueOf()})`);
  // });

  // CircuitNumber Logic Comparison Function Tests

  // it('Test 8: Equal - CircuitNumber.prototype.equals()', async () => {
  //   let answer: Bool;

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     answer = zkApp.equals(number2);
  //     expect(answer).toEqual(Bool(number1.valueOf() == number2.valueOf()));
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   console.log(`Test 8 Passed: Equal (${number1} == ${number2})`);
  // });

  // it('Test 9: In Precision Range - CircuitNumber.prototype.inPrecisionRange()', async () => {
  //   let answer: Bool;

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     answer = zkApp.inPrecisionRange(number2);
  //     expect(answer).toEqual(Bool(Math.abs(number1.valueOf() - number2.valueOf()) <= 1 / PRECISION));
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   console.log(`Test 9 Passed: In Precision Range (${number1} ~ ${number2})`);
  // });

  // it('Test 10: Greater Than - CircuitNumber.prototype.gt()', async () => {
  //   let answer: Bool;

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     answer = zkApp.gt(number2);
  //     zkApp.sign(zkAppPrivateKey);
  //     expect(answer).toEqual(Bool(number1.valueOf() > number2.valueOf()));
  //   });
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   console.log(`Test 10 Passed: Greater Than (${number1} > ${number2})`);
  // });

  // it('Test 11: Greater Than Or Equal - CircuitNumber.prototype.gte()', async () => {
  //   let answer: Bool;

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     answer = zkApp.gte(number2);
  //     zkApp.sign(zkAppPrivateKey);
  //     expect(answer).toEqual(Bool(number1.valueOf() >= number2.valueOf()));
  //   });
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   console.log(`Test 11 Passed: Greater Than Or Equal (${number1} >= ${number2})`);
  // });

  // it('Test 12: Little Than - CircuitNumber.prototype.gt()', async () => {
  //   let answer: Bool;

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     answer = zkApp.lt(number2);
  //     zkApp.sign(zkAppPrivateKey);
  //     expect(answer).toEqual(Bool(number1.valueOf() < number2.valueOf()));
  //   });
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   console.log(`Test 12 Passed: Little Than (${number1} < ${number2})`);
  // });

  // it('Test 13: Little Than Or Equal - CircuitNumber.prototype.gt()', async () => {
  //   let answer: Bool;

  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     answer = zkApp.lte(number2);
  //     zkApp.sign(zkAppPrivateKey);
  //     expect(answer).toEqual(Bool(number1.valueOf() <= number2.valueOf()));
  //   });
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   console.log(`Test 13 Passed: Little Than Or Equal (${number1} <= ${number2})`);
  // });

  // CircuitNumber Arithmetic Operation Function Tests

  // it('Test 14: Addition - CircuitNumber.prototype.add()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.add(number2);
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect((result.inPrecisionRange(CircuitNumber.from(number1.valueOf() + number2.valueOf())))).toEqual(Bool(true));

  //   console.log(`Test 14 Passed: Addition (${number1} + ${number2} -> ${result.valueOf()})`);
  // });

  it('Test 15: Substraction - CircuitNumber.prototype.sub()', async () => {
    const txn = await Mina.transaction(deployerAccount, () => {
      zkApp.sub(number2);
    });
    await txn.prove();
    await txn.sign([deployerKey, zkAppPrivateKey]).send();

    const result = zkApp.get();

    expect((result.inPrecisionRange(CircuitNumber.from(number1.valueOf() - number2.valueOf())))).toEqual(Bool(true));

    console.log(`Test 15 Passed: Substraction (${number1} - ${number2} -> ${result.valueOf()})`);
  });

  // it('Test 16: Multiplication - CircuitNumber.prototype.mul()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.mul(number2);
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect((result.inPrecisionRange(CircuitNumber.from(number1.valueOf() * number2.valueOf())))).toEqual(Bool(true));

  //   console.log(`Test 16 Passed: Multiplication (${number1} * ${number2} -> ${result.valueOf()})`);
  // });

  // it('Test 17: Division - CircuitNumber.prototype.div()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.div(number2);
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect((result.inPrecisionRange(CircuitNumber.from(number1.valueOf() / number2.valueOf())))).toEqual(Bool(true));

  //   console.log(`Test 17 Passed: Division (${number1} / ${number2} -> ${result.valueOf()})`);
  // });

  // it('Test 18: Reminder - CircuitNumber.prototype.mod()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.mod(number2);
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect(result.valueOf()).toEqual(CircuitNumber.from(number1.valueOf() % number2.valueOf()).valueOf());

  //   console.log(`Test 18 Passed: Reminder (${number1} mod ${number2} -> ${result.valueOf()})`);
  // });

  // CircuitMath Number Function Tests

  // it('Test 19: Greatest Common Divisor - CircuitMath.gcd()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.gcd(number2);
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect(result.valueOf()).toEqual(CircuitNumber.from(gcd(Math.trunc(number1.valueOf()), Math.trunc(number2.valueOf()))).valueOf());

  //   console.log(`Test 19 Passed: Greatest Common Divisor (gcd(${Math.trunc(number1.valueOf())}, ${Math.trunc(number2.valueOf())}) -> ${result.valueOf()})`);
  // });

  // it('Test 20: Least Common Multiplier - CircuitMath.lcm()', async () => {
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.lcm(number2);
  //   });
  //   await txn.prove();
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   expect(result.valueOf()).toEqual(CircuitNumber.from(lcm(Math.trunc(number1.valueOf()), Math.trunc(number2.valueOf()))).valueOf());

  //   console.log(`Test 20 Passed: Least Common Multiplier (lcm(${Math.trunc(number1.valueOf())}, ${Math.trunc(number2.valueOf())}) -> ${result.valueOf()})`);
  // });

  // CircuitMath Power & Root Function Tests

  // it('Test 21: Exponentiation  - CircuitMath.exp()', async () => {
  //   // console.log(BigNumber.fromString("0.16636406955565938").div(BigNumber.fromString("4000000000000000000")).toString());
  //   // console.log(BigNumber.fromString("0.16636406955565938").div(BigNumber.fromString("4000000000000000000")).toInteger());

  //   const txn0 = await Mina.transaction(deployerAccount, () => {
  //     zkApp.set(number1);
  //     zkApp.sign(zkAppPrivateKey);
  //   });
  //   await txn0.sign([deployerKey, zkAppPrivateKey]).send();
  //   const txn = await Mina.transaction(deployerAccount, () => {
  //     zkApp.exp();
  //     zkApp.sign(zkAppPrivateKey);
  //   });
  //   await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   const result = zkApp.get();

  //   // const x = BigNumber.fromString("0.89124918923413423");
  //   // const y = BigNumber.fromString("0.20861182349812394");

  //   // console.log(x.toString());
  //   // console.log(y.toString());
  //   // console.log(x.add(y).toString());
  //   // console.log(y.div(x).toString());
  //   // console.log(x.mul(y).toString());

  //   // expect(5).toEqual(5);

  //   const x = CircuitNumber.from(5);

  //   console.log(result.toNumber());

  //   expect(result.inPrecisionRange(CircuitNumber.from(Math.exp(number1.valueOf())))).toEqual(Bool(true));

  //   console.log(`Test 21 Passed: Exponentiation (exp(${number1.valueOf()}) -> ${result.valueOf()})`);
  // });

  // CircuitMath Logarithmic Function Tests

  // it('Test 21: Natural Log - CircuitMath.ln()', async () => {
  //   // const txn0 = await Mina.transaction(deployerAccount, () => {
  //   //   zkApp.set(number1);
  //   //   zkApp.sign(zkAppPrivateKey);
  //   // });
  //   // await txn0.sign([deployerKey, zkAppPrivateKey]).send();
  //   // const txn = await Mina.transaction(deployerAccount, () => {
  //   //   zkApp.ln();
  //   //   zkApp.sign(zkAppPrivateKey);
  //   // });
  //   // await txn.sign([deployerKey, zkAppPrivateKey]).send();

  //   console.log(0)
  //   console.log(CircuitMath.ln(CircuitNumber.from(0.0000001)).toNumber())
  //   console.log(Math.log(0.0000001));

  //   console.log(0.001)
  //   console.log(CircuitMath.ln(CircuitNumber.from(0.001)).toNumber())
  //   console.log(Math.log(0.001));

  //   console.log(0.5)
  //   console.log(CircuitMath.ln(CircuitNumber.from(0.5)).toNumber())
  //   console.log(Math.log(0.5));

  //   console.log(1)
  //   console.log(CircuitMath.ln(CircuitNumber.from(1)).toNumber())
  //   console.log(Math.log(1));

  //   console.log(1.1)
  //   console.log(CircuitMath.ln(CircuitNumber.from(1.1)).toNumber())
  //   console.log(Math.log(1.1));

  //   console.log(1.2)
  //   console.log(CircuitMath.ln(CircuitNumber.from(1.2)).toNumber())
  //   console.log(Math.log(1.2));

  //   console.log(1.3)
  //   console.log(CircuitMath.ln(CircuitNumber.from(1.3)).toNumber())
  //   console.log(Math.log(1.3));

  //   console.log(1.4)
  //   console.log(CircuitMath.ln(CircuitNumber.from(1.4)).toNumber())
  //   console.log(Math.log(1.4));

  //   console.log(1.5)
  //   console.log(CircuitMath.ln(CircuitNumber.from(1.5)).toNumber())
  //   console.log(Math.log(1.5));

  //   console.log(2)
  //   console.log(CircuitMath.ln(CircuitNumber.from(1.9999999)).toNumber())
  //   console.log(Math.log(1.9999999));

  //   const result = zkApp.get();

  //   expect(result.inPrecisionRange(CircuitNumber.from((number1.valueOf())))).toEqual(Bool(true));

  //   console.log(`Test 21 Passed: Natural Log (ln(${number1.valueOf()}) -> ${result.valueOf()})`);
  // });

  // CircuitMath Arithmetic Comparison Function Tests

  // CircuitMath Trigonometric Function Tests

  // CircuitMath Hyperbolic Function Tests

  // CircuitMath Inverse Trigonometric Function Tests

  // CircuitMath Inverse Hyperbolic Function Tests

  // CircuitMath Geometric Function Tests
});
