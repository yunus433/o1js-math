// const
//   MAX_PRECISION = 1e18,
//   MAX_NUMBER = 18_446_744_073_709_551_615, // Max UInt64. For the maximum number, precision is always 0
//   PRIMES = [
//     2, 3, 5, 7, 11, 13, 17, 19, 23, 29, 31, 37, 41, 43, 47, 53, 59, 61, 67, 71, 73, 79, 83, 89, 97, 101, 103, 107, 109, 113, 127, 131, 137, 139, 149, 151, 157, 163, 167, 173, 179, 181, 191, 193, 197, 199, 211, 223, 227, 229, 233, 239, 241, 251
//   ]
// ;

// const PRIMES_AS_FIELD = DynamicArray(Field, PRIMES.length).from(Array.from({ length: PRIMES.length }, (_, i) => Field(PRIMES[i])));

// class PrimeFactors extends DynamicArray(Field, MAX_PRIME_FACTOR_COUNT) {
//   /*
//     Take mod of two Field elements
//     Implementation from snarkyjs UInt32
//   */
//   private static mod(x: Field, y: Field): Field {
//     if (x.isConstant() && y.isConstant()) {
//       let xn = x.toBigInt();
//       let yn = y.toBigInt();
//       let q3 = xn / yn;
//       let r2 = xn - q3 * yn;
//       return new Field(r2.toString());
//     }
  
//     y = y.seal();
//     let q2 = Circuit.witness(Field, () => new Field(x.toBigInt() / y.toBigInt()));
//     // q2.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(q2);
//     let r = x.sub(q2.mul(y)).seal();
//     // r.rangeCheckHelper(UInt32.NUM_BITS).assertEquals(r);
//     return r;
//   }

//   calculateFactors(number: Field): PrimeFactors {
//     const left = Field(0), right = Field(PRIMES.length);
//     let isReturn = Field(0);

//     while (left.equals(right).not && isReturn.equals(Field(0)).not()) {
//       const middle = left.add((left.sub(right)).sub(PrimeFactors.mod(left.add((left.sub(right))), Field(2))).div(Field(2)));

//       isReturn = Circuit.if(PRIMES_AS_FIELD.get(middle).equals())
//       if (PRIMES_AS_FIELD.get(middle) == element)
//         return middle;
//       if (array[middle] < element)
//         start_index = middle + 1;
//       else
//         end_index = middle - 1;
//     }

//    return Field(-1);
//   }

//   /*
//     Take another array of prime factors, simplify the common factors
//     Return two array of updated factors
//   */
//   simplify(other: PrimeFactors): {
//     factors1: PrimeFactors,
//     factors2: PrimeFactors
//   } {
//     const length = Field(0);

//     const empty = new PrimeFactors;
//     const newThis = new PrimeFactors;
//     const newOther = new PrimeFactors;

//     for (let i = Field(0); i.equals(this.length).not(); )
//       for (let j = Field(0); j.equals(other.length).not(); ) {
//         this.set(i, Circuit.if(this.get(i).equals(other.get(j)), Field(0), this.get(i)));
//         other.set(j, Circuit.if(this.get(i).equals(other.get(j)), Field(0), this.get(j)));
//         (Circuit.if(this.get(i).equals(other.get(j)), empty, newThis)).push(this.get(i));
//         (Circuit.if(this.get(i).equals(other.get(j)), empty, newOther)).push(this.get(j));

//         i.add(Circuit.if(this.get(i).lte(other.get(j)), Field(1), Field(0)));
//         j.add(Circuit.if(this.get(i).gte(other.get(j)), Field(1), Field(0)));
//       }

//     return {
//       factors1: newThis,
//       factors2: newOther
//     };
//   };
// }

// class PrimeFactors extends Struct({
//   values: FactorsArray,
//   length: Field
// }) {
//   constructor(
//     values: FactorsArray,
//     length: Field
//   ) {
//     super({
//       values,
//       length
//     });

//     this.values = values;
//     this.length = length
//   };

//   /*
//     Take another array of prime factors, simplify the common factors
//     Update the instance the function is called on
//     Return updated other document to allow sync update
//   */
//   simplify(other: PrimeFactors): PrimeFactors {
//     const newPrimeFactors = Circuit.array(Field, 0);
//     const length = Field(0);

//     for (let i = 0; Field(i).equals(this.length).not(); )
//       for (let j = 0; Field(j).equals(other.length).not(); )
//         newPrimeFactors.push(Circuit.switch(
//           [this.values[i].equals(other.values[i]), this.values[i].lt(other.values[i]), this.values[i].gt(other.values[i])],
//           Field,
//           [ () => {
//               return Field(0);
//             },
//             () => {
//               return this.values[i];
//             },
//             () => {
//               return this.values[i]
//             }
//           ]
//         ))

//     return new PrimeFactors(
//       newPrimeFactors,
//       length
//     );
//   }
// }

// export class CircuitNumber extends Struct({
//   value: Field, // Value of the number after multiplied with the precision. Always an integer
//   precision: Field, // A value from 1 to 1e18 from powers of ten
//   sign: Field // Either 1 or -1
// }) {
//   private static isPowerOfTen(number: UInt64): Bool {
//     return Circuit.if(
//       number.mod(UInt64.from(10)).equals(UInt64.from(0)),
//       Circuit.if(
//         number.equals(UInt64.from(0)),
//         Bool(true),
//         this.isPowerOfTen(number.div(UInt64.from(10)))
//       ),
//       Bool(false)
//     );
//   };

//   private static biggestSmallerPowerOfTen(number: number): number {
//     if (number < 1)
//       return 0;

//     let answer = 1;

//     while (number > answer)
//       answer *= 10;

//     if (number < answer)
//       answer /= 10;

//     return answer;
//   };

//   private static biggestSmallerPowerOfTenField(number: Field): Field {
//     return Circuit.if(
//       number.equals(Field(0)),
//       Field(1),
//       this.biggestSmallerPowerOfTenField(UInt64.from(number).div(UInt64.from(10)).value).mul(Circuit.if(number.gt(Field(10)), Field(10), Field(1)))
//     );
//   };

//   constructor(
//     value: Field,
//     precision: Field,
//     sign: Field 
//   ) {
//     // CircuitNumber.isPowerOfTen(precision).assertEquals(Bool(true));
//     // precision.assertLte(UInt64.from(MAX_PRECISION));

//     super({
//       value,
//       precision,
//       sign
//     });

//     this.value = value;
//     this.precision = precision;
//     this.sign = sign;
//   };

//   static from(_number: number): CircuitNumber {
//     const sign = _number > 0 ? 1 : -1;
//     const number = Math.abs(_number);

//     if (number >= MAX_NUMBER)
//       return new CircuitNumber(
//         Field(0),
//         Field(MAX_PRECISION),
//         Field(1)
//       );

//     const precision = Math.max(MAX_PRECISION / CircuitNumber.biggestSmallerPowerOfTen(number), 1);

//     return new CircuitNumber(
//       Field(Math.round(number * precision)),
//       Field(precision),
//       Field(sign)
//     );
//   };

//   sub(number: CircuitNumber): CircuitNumber {
//     return new CircuitNumber(Field(0), Field(0), Field(0));
//   }

//   add(number: CircuitNumber): CircuitNumber {
//     const number1 = this.value.toBigInt();
//     const number2 = number.value.toBigInt();

//     Field(number1).assertEquals(this.value);
//     Field(number2).assertEquals(number.value);

//     if (number1 + number2 > MAX_NUMBER)
//       throw Error(`Overflow Error: Result of the expression greater than max allowed number - 18_446_744_073_709_551_615 (max UInt64).`);

//     const sign = Circuit.if(
//       Bool.or(
//         Bool.and(this.sign.equals(Field(1)), number.sign.equals(Field(1))),
//         Bool.or(
//           Bool.and(
//             this.sign.equals(Field(1)),
//             this.value.div(this.precision).gte(number.value.div(number.precision))
//           ),
//           Bool.and(
//             number.sign.equals(Field(1)),
//             number.value.div(number.precision).gte(this.value.div(this.precision))
//           )
//         )
//       ),
//       Field(1),
//       Field(-1)
//     );

//     const _this = this;
//     const precisionChecker = this.precision.gt(number.precision);
//     const precisionDifference = Circuit.if(precisionChecker, this.precision.div(number.precision), number.precision.div(this.precision));

//     return Circuit.if(
//       this.sign.equals(number.sign),
//       function () {
//         return Circuit.if(
//           precisionChecker,
//           function () {
//             return new CircuitNumber(
//               _this.value.div(precisionDifference).add(number.value), 
//               number.precision, // Smaller precision
//               Field(0)
//             )
//           }(),
//           function () {
//             return new CircuitNumber(
//               Field(0),
//               Field(0),
//               Field(0)
//             )
//           }()
//         );
//       }(),
//       Circuit.if(
//         this.sign.equals(Field(1)),
//         this.sub(number),
//         number.sub(this)
//       )
//     );
//   }

//   toNumber(): Number {
//     return (this.sign.equals(Field(-1)).toBoolean() ? Number(-1) : Number(1)) * Number(this.value.toBigInt()) / Number(this.precision.toBigInt());
//   };
// };

15;

// private static _floor(number: Field, closest: Field, jump: UInt64, counter: number): Field {
  //   Bool.or(
  //     Field(counter).gt(Field(0)),
  //     (number.sub(closest)).lt(Field(1))
  //   ).assertEquals(Bool(true), 'Max operation limit is exceeded.');

  //   return Circuit.if(
  //     (number.sub(closest)).lt(Field(1)),
  //     closest,
  //     this._floor(
  //       number,
  //       Circuit.if(number.gt(closest), closest.add(jump.value), closest.sub(jump.value)),
  //       Circuit.if(this.abs(number.sub(closest)).gt(jump.value), jump.mul(UInt64.from(2)), jump.div(UInt64.from(2))),
  //       counter - 1
  //     )
  //   );
  // }
  // static floor(number: Field): Field {
  //   number.assertGt(Field(0), 'Number must be positive.')
  //   return this._floor(number, Field(0), UInt64.from(1), MAX_OPERATION_LIMIT);
  // };

15;

  // sub(other: CircuitNumber): CircuitNumber {
  //   return Circuit.if(
  //     other.sign.equals(Field(-1)),
  //     this.add(other.neg()),
  //     Circuit.if(
  //       this.sign.equals(Field(-1)),
  //       other.sub(this),
  //       function (_this): CircuitNumber {
          
  //       }(this)
  //     )
  //   );
  // };

  // add(other: CircuitNumber): CircuitNumber {
  //   return Circuit.if(
  //     this.sign.equals(other.sign),
  //     function (_this): CircuitNumber {
  //       let newValue = _this.value.add(other.value);
  //       let newDecimal = _this.decimal.add(other.decimal);
  //       const sign = _this.sign;

  //       const recurAddition = Circuit.if(newDecimal.gte(Field(PRECISION)), Field(1), Field(0));
  //       newValue = newValue.add(recurAddition);
  //       newDecimal = newDecimal.sub(recurAddition.mul(Field(PRECISION)));

  //       return new CircuitNumber(
  //         newValue,
  //         CircuitNumber.formatDecimal(newDecimal),
  //         sign
  //       );
  //     }(this),
  //     Circuit.if(
  //       this.sign.equals(Field(1)),
  //       this.sub(other),
  //       other.sub(this)
  //     )
  //   );
  // };

  15;

  // export class CircuitNumber extends Struct({
//   value: Field,
//   decimal: Field,
//   isPositive: Bool
// }) {
//   constructor(
//     value: Field,
//     decimal: Field,
//     isPositive: Bool
//   ) {
//     super({
//       value,
//       decimal,
//       isPositive
//     });

//     this.value = value;
//     this.decimal = decimal;
//     this.isPositive = isPositive;
//   };

//   private static absField(value: Field): Field {
//     return Circuit.if (
//       value.gte(0),
//       value,
//       value.neg()
//     );
//   };

//   static fromUInt(value: UInt32 | UInt64): CircuitNumber {
//     return new CircuitNumber(
//       value.value,
//       Field(0),
//       Bool(true)
//     );
//   };

//   static fromNumber(value: Number): CircuitNumber {
//     return new CircuitNumber(
//       Field( Math.abs(parseInt(value.toString())).toString() ),
//       Field( Math.abs(
//         Math.round(
//           (value.valueOf() - parseInt(value.valueOf().toString())) * PRECISION
//         )
//       ).toString() ),
//       (value >= 0 ? Bool(true) : Bool(false))
//     );
//   };

//   isInteger(): Bool {
//     return Circuit.if(this.decimal.gt(Field(0)), Bool(false), Bool(true));
//   };

//   abs(): CircuitNumber {
//     return new CircuitNumber(
//       this.value,
//       this.decimal,
//       Bool(true)
//     );
//   };

//   ceil(): CircuitNumber {
//     return new CircuitNumber(
//       this.value,
//       Field(0),
//       Bool(true)
//     );
//   };

//   floor(): CircuitNumber {
//     return new CircuitNumber(
//       this.value.add(Circuit.if(this.decimal.gt(Field(5 * PRECISION)), Field(1), Field(0))),
//       Field(0),
//       Bool(true)
//     );
//   };

//   add(number: CircuitNumber): CircuitNumber {
//     return CircuitNumber.fromNumber(this.toNumber().valueOf() + number.toNumber().valueOf());
//   };

//   sub(number: CircuitNumber): CircuitNumber {
//     return CircuitNumber.fromNumber(this.toNumber().valueOf() - number.toNumber().valueOf());
//   };

//   mul(number: CircuitNumber): CircuitNumber {
//     return CircuitNumber.fromNumber(this.toNumber().valueOf() * number.toNumber().valueOf());
//   };

//   div(number: CircuitNumber): CircuitNumber {
//     return CircuitNumber.fromNumber(this.toNumber().valueOf() / number.toNumber().valueOf());
//   };

//   toNumber(): Number {
//     console.log(Field(6).sub(1).toBigInt());
//     // console.log((Number(this.decimal.toBigInt()) / Number(PRECISION)));
//     return Number((this.isPositive.toBoolean() ? Number(1) : Number(-1)) * (Number(this.value.toBigInt()) + (Number(this.decimal.toBigInt()) / Number(PRECISION))));
//   };
// };

// export class Constant extends Struct({
//   PI: CircuitNumber,
//   E: CircuitNumber,
//   EULER: CircuitNumber,
//   INF: CircuitNumber,
//   INFINITY: CircuitNumber,
//   NEG_INF: CircuitNumber,
//   NEGATIVE_INFINITY: CircuitNumber,
//   EPS: CircuitNumber,
//   EPSILON: CircuitNumber,
// }) {
  
//   public static PI = new CircuitNumber(PI);
//   public static E = new CircuitNumber(E);
//   public static EULER = new CircuitNumber(E);
//   public static INF = new CircuitNumber(Number.MAX_SAFE_INTEGER);
//   public static INFINITY = new CircuitNumber(Number.MAX_SAFE_INTEGER);
//   public static NEG_INF = new CircuitNumber(Number.MIN_SAFE_INTEGER);
//   public static NEGATIVE_INFINITY = new CircuitNumber(Number.MIN_SAFE_INTEGER);
//   public static EPS = new CircuitNumber(Number.EPSILON);
//   public static EPSILON = new CircuitNumber(Number.EPSILON);
// };

// export class Math {
//   Number: Field | number | string | boolean | bigint;

//   public static pow(x: number) {

//   };
// };

15;

// export class FieldMath {
//   // static E = Field(E).div(Field(CONSTANT_PRECISION));
//   // static EULER = Field(E).div(Field(CONSTANT_PRECISION));
//   // static PI = Field(PI).div(Field(CONSTANT_PRECISION));

//   static abs(number: Field): Field {
//     return Circuit.if(
//       number.lt(Field(0)),
//       number.neg(),
//       number
//     );
//   };

//   // static degrees(radian: Field): Field {
//   //   return radian.div(this.PI).mul(Field(180));
//   // };

//   static combination(n: Field, k: Field): Field {
//     let answer = Field(1);

//     n.assertGte(Field(0), 'Expected a positive integer.');
//     k.assertGte(Field(0), 'Expected a positive integer.');
//     k.assertLte(n, 'Logic Error: K must be smaller than N for combination(n, k)')
//     Field(MAX_OPERATION_LIMIT).assertGt(Field(n), 'Max operation limit is exceeded.');

//     k = Circuit.if(k.lt(n.sub(k)), n.sub(k), k);

//     for (let i = k.add(Field(1)).toBigInt(); i < MAX_OPERATION_LIMIT; i++)
//       answer = answer.mul(Circuit.if(
//         Bool.and(n.gte(Field(i)), k.lt(Field(i))),
//         Field(i),
//         Field(1)
//       ));

//     return answer.div(FieldMath.factorial(n.sub(k)));
//   };

//   static factorial(n: Field): Field {
//     let answer = Field(1);

//     n.assertGte(Field(0), 'Expected a positive integer.');
//     Field(MAX_OPERATION_LIMIT).assertGt(Field(n), 'Max operation limit is exceeded.');

//     for (let i = 2; i < MAX_OPERATION_LIMIT; i++)
//       answer = answer.mul(Circuit.if(n.gte(Field(i)), Field(i), Field(1)));

//     return answer;
//   };

//   // static ln(number: Field): Field {
//   //   // number.assertGt(Field(0), 'Arithmetic Error: Number must be positive.');

//   //   const x = number.sub(Field(1));
//   //   let xPow = x;
//   //   let signPow = Field(1);
//   //   let answer = Field(0);

//   //   for (let i = 1; i < MAX_OPERATION_LIMIT; i++) {
//   //     answer = answer.add(signPow.mul(xPow.div(Field(i))));
//   //     xPow = xPow.mul(x);
//   //     signPow = signPow.mul(Field(-1));
//   //   };

//   //   return answer;
//   // };

//   // static logBase(number: Field, base: Field): Field {
//   //   number.assertGt(Field(0), 'Arithmetic Error: Number must be positive.');
//   //   base.assertGt(Field(1), 'Arithmetic Error: Base must be greater than 1.');

//   //   return this.ln(number).div(this.ln(base));
//   // };

//   static pow(base: Field, power: Field): Field {
//     let answer = Field(1);

//     Field(MAX_OPERATION_LIMIT).assertGt(Field(power), 'Max operation limit is exceeded.')

//     return Circuit.if(
//       power.gte(Field(0)),
//       function (): Field {
//         for (let i = 0; i < MAX_OPERATION_LIMIT; i++) {
//           answer = answer.mul(Circuit.if(
//             power.gt(Field(i)),
//             base,
//             Field(1)
//           ));
//         }
    
//         return answer;
//       }(),
//       function (): Field {
//         for (let i = 0; i < MAX_OPERATION_LIMIT; i++) {
//           answer = answer.mul(Circuit.if(
//             power.mul(Field(-1)).gt(Field(i)),
//             base,
//             Field(1)
//           ));
//         }
    
//         return answer.inv();
//       }()
//     );
//   };

//   // static radians(degree: Field): Field {
//   //   return degree.div(Field(180)).mul(this.PI);
//   // };

  
// };

15;

// toCircuitNumberRound(): CircuitNumber {
  //   const decimalAsUInt64 = UInt64.from(this.decimal);
  //   const decimalNewPrecision = UInt64.from(PRECISION_EXACT / PRECISION);
    
  //   return new CircuitNumber(
  //     this.value,
  //     decimalAsUInt64
  //       .div(decimalNewPrecision).value
  //       .add(Circuit.if(
  //         decimalAsUInt64.mod(decimalNewPrecision).gte(decimalNewPrecision.div(UInt64.from(2))),
  //         Field(1),
  //         Field(0)
  //       )
  //     ),
  //     this.sign
  //   );
  // };