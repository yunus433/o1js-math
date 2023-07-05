// IMPORTANT NOTES
// This is a BigNumber precision library for standard TS, it does not depend on or is not related to snarkyJS.
// It is intended to support precision up to `PRECISION_BYTES` decimals in the range [NEGATIVE_INFINITY, POSITIVE_INFINITY], inclusive.

const MAX_BYTES = 36; // Change this to increase the range.
const PRECISION_BYTES = 18; // Change this to increase the precision.

const
  E = '2.718281828459045235',
  LN_10 = '2.302585092994045684',
  LN_2 = '0.693147180559945309',
  NEGATIVE_INFINITY = BigInt('-1' + Array.from({ length: MAX_BYTES }, _ => '0').join('')),
  PI = '3.141592653589793238',
  POSITIVE_INFINITY = BigInt('1' + Array.from({ length: MAX_BYTES }, _ => '0').join('')),
  PRECISION = BigInt('1' + Array.from({ length: PRECISION_BYTES }, _ => '0').join(''))
;

export class BigNumber {
  private _sign: boolean;
  private _value: string;
  private _decimal: string;

  // Private Utility Methods

  private static fixDecimalDigits(number: string): string {
    if (number.length >= PRECISION_BYTES)
      return number.substring(0, PRECISION_BYTES);

    return Array.from({ length: PRECISION_BYTES - number.length }, _ => '0').join('') + number;
  };

  private static precisionDigits(): string {
    return '10' + Array.from({ length: PRECISION_BYTES }, _ => '0').join('')
  };

  private static roundString(_number: string, precision: number): string {
    if (_number.length <= precision)
      return _number;

    let number = _number.split('');
    let lastDigit = parseInt(number[precision]);

    if (lastDigit < 5)
      return number.join('').substring(0, precision);

    number = number.filter((_, i) => i < precision);
    let index = precision - 1;
    
    while (index > 0 && number[index] == '9') {
      number[index] = '0';
      index--;
    }

    if (index == 0) {
      if (number[index] == '9') {
        number[index] = '0';
        return '1' + number.join('');
      } else {
        number[index] = (parseInt(number[index]) + 1).toString();
        return number.join('');
      }
    } else {
      number[index] = (parseInt(number[index]) + 1).toString();
      return number.join('');
    }
  };

  private static widenScientificNotation(number: string): string {
    if (!number.includes('e'))
      return number;

    let answer;

    if (number[number.indexOf('e') + 1] == '-') {
      answer = '0.' + Array.from({ length: parseInt(number.substring(number.indexOf('e') + 2)) - 1 }, _ => '0').join('') + number.split('e')[0].replace('.', '');
    } else if (number[number.indexOf('e') + 1] == '+') {
      answer = number.split('e')[0].replace('.', '');

      while (answer.length <= parseInt(number.substring(number.indexOf('e') + 2)))
        answer = answer + '0';
    } else {
      answer = number.split('e')[0].replace('.', '');

      while (answer.length <= parseInt(number.substring(number.indexOf('e') + 1)))
        answer = answer + '0';
    }

    return answer;
  };

  private constructor(
    sign: boolean,
    value: string,
    decimal: string
  ) {
    if (isNaN(Number(value)) || isNaN(Number(decimal)))
      throw Error('BigNumber Error: Unrecongnized number format.');

    if (
      BigInt(value) > POSITIVE_INFINITY ||
      (BigInt(value) == POSITIVE_INFINITY && BigInt(decimal) != BigInt(0))
    )
      throw Error(`BigNumber Error: You cannot have a BigNumber bigger than ${POSITIVE_INFINITY}.`);

    if (
      BigInt(value) < NEGATIVE_INFINITY ||
      (BigInt(value) == NEGATIVE_INFINITY && BigInt(decimal) != BigInt(0))
    )
      throw Error(`BigNumber Error: You cannot have a BigNumber smaller than ${NEGATIVE_INFINITY}.`);

    this._sign = sign;
    this._value = value;

    if (decimal.length >= PRECISION_BYTES) {
      const newDecimal = BigNumber.roundString(decimal, PRECISION_BYTES);

      if (newDecimal.length > PRECISION_BYTES) {
        this._value = (BigInt(value) + BigInt(1)).toString();
        this._decimal = Array.from({ length: PRECISION_BYTES }, _ => '0').join('');
      } else {
        this._decimal = newDecimal;
      }
    } else {
      this._decimal = decimal + Array.from({ length: PRECISION_BYTES - decimal.length }, _ => '0').join('');
    }
  };

  // Static Constructors

  static copysign(
    number: BigNumber,
    sign: BigNumber
  ): BigNumber {
    return new BigNumber(
      sign._sign,
      number._value,
      number._decimal
    );
  };

  static fromBigInt(
    value: bigint
  ): BigNumber {
    return new BigNumber(
      value > 0n,
      (value < 0n ? value * -1n : value).toString(),
      '0'
    );
  };

  static fromString(
    _value: string
  ): BigNumber {
    const value = _value.split(',').join('.');

    let sign = true;
    let numberAsString = BigNumber.widenScientificNotation(value);

    if (numberAsString.split('.').length > 2)
      throw Error('BigNumber Error: The given string cannot be parsed to a BigNumber.');

    if (numberAsString[0] == '-') {
      sign = false;
      numberAsString = numberAsString.substring(1);
    }

    if (numberAsString.split('').find(any =>
      any != '.' &&
      isNaN(parseInt(any)))
    )
      throw Error('BigNumber Error: The given string cannot be parsed to a BigNumber.');

    const valueAsString = numberAsString.split('.')[0];
    let decimalAsString = numberAsString.split('.').length > 1 ? numberAsString.split('.')[1] : '0';

    if (isNaN(Number(valueAsString)) || isNaN(Number(decimalAsString)))
      throw Error('BigNumber Error: The given string cannot be parsed to a BigNumber.');

    return new BigNumber(
      sign,
      valueAsString,
      decimalAsString
    );
  };

  // Static Constants

  static E: BigNumber = BigNumber.fromString(E);
  static EULER: BigNumber = BigNumber.fromString(E);
  static INF: BigNumber = BigNumber.fromBigInt(POSITIVE_INFINITY);
  static POSITIVE_INFINITY: BigNumber = BigNumber.fromBigInt(POSITIVE_INFINITY);
  static NEG_INF: BigNumber = BigNumber.fromBigInt(NEGATIVE_INFINITY);
  static NEGATIVE_INFINITY: BigNumber = BigNumber.fromBigInt(NEGATIVE_INFINITY);
  static LN_10: BigNumber = BigNumber.fromString(LN_10);
  static LN_2: BigNumber = BigNumber.fromString(LN_2);
  static PI: BigNumber = BigNumber.fromString(PI);

  // Type Conversion Methods

  toBigInt(): bigint {
    return BigInt(this._sign ? 1 : -1) * (BigInt(this._value) + BigInt(this._decimal && this._decimal[0] && parseInt(this._decimal[0]) >= 5 ? 1 : 0))
  };

  toString(): string {
    return (this._sign ? '' : '-') + this._value + '.' + this._decimal;
  };

  toInteger(): string {
    return (this._sign ? '' : '-') + BigNumber.roundString(this._value + (this._decimal.length ? this._decimal[0] : ''), this._value.length);
  };

  // Type Check Methods

  isInteger(): boolean {
    return BigInt(this._decimal) == BigInt(0)
  };

  isPositive(): boolean {
    return this._sign
  };

  // Arithmetic Conversion Methods

  abs(): BigNumber {
    return new BigNumber(
      true,
      this._value,
      this._decimal
    );
  };

  ceil(): BigNumber {
    return new BigNumber(
      this._sign,
      (BigInt(this._value) + (!this._sign || BigInt(this._decimal) == BigInt(0) ? BigInt(0) : BigInt(1))).toString(),
      '0'
    );
  };

  floor(): BigNumber {
    return new BigNumber(
      this._sign,
      (BigInt(this._value) + (!this._sign && BigInt(this._decimal) != BigInt(0) ? BigInt(1) : BigInt(0)) ).toString(),
      '0'
    );
  };

  inv(): BigNumber {
    return BigNumber.fromBigInt(1n).div(this);
  };

  neg(): BigNumber {
    return new BigNumber(
      !this._sign,
      this._value,
      this._decimal
    );
  };

  round(): BigNumber {
    return new BigNumber(
      true,
      (BigInt(this._value) + BigInt(this._decimal && this._decimal[0] && parseInt(this._decimal[0]) >= 5 ? 1 : 0)).toString(),
      '0'
    );
  };

  trunc(): BigNumber {
    return new BigNumber(
      this._sign,
      this._value,
      '0'
    );
  };

  // Logic Comparison Methods

  equals(other: BigNumber): boolean {
    return this._sign == other._sign && this._value == other._value && this._decimal == other._decimal;
  };

  gt(other: BigNumber): boolean {
    return (this._sign && !other._sign) || (
      this._sign ?
      (BigInt(this._value) > BigInt(other._value) || (this._value == other._value && BigInt(this._decimal) > BigInt(other._decimal))) :
      (BigInt(this._value) < BigInt(other._value) || (this._value == other._value && BigInt(this._decimal) < BigInt(other._decimal)))
    );
  };

  greaterThan(other: BigNumber): boolean {
    return this.gt(other);
  };

  gte(other: BigNumber): boolean {
    return (this._sign && !other._sign) || (
      this._sign ?
      (BigInt(this._value) > BigInt(other._value) || (this._value == other._value && BigInt(this._decimal) >= BigInt(other._decimal))) :
      (BigInt(this._value) < BigInt(other._value) || (this._value == other._value && BigInt(this._decimal) <= BigInt(other._decimal)))
    );
  };

  greaterThanOrEqual(other: BigNumber): boolean {
    return this.gte(other);
  };

  lt(other: BigNumber): boolean {
    return (!this._sign && other._sign) || (
      !this._sign ?
      (BigInt(this._value) > BigInt(other._value) || (this._value == other._value && BigInt(this._decimal) > BigInt(other._decimal))) :
      (BigInt(this._value) < BigInt(other._value) || (this._value == other._value && BigInt(this._decimal) < BigInt(other._decimal)))
    );
  };

  lessThan(other: BigNumber): boolean {
    return this.lt(other);
  };

  lte(other: BigNumber): boolean {
    return (!this._sign && other._sign) || (
      !this._sign ?
      (BigInt(this._value) > BigInt(other._value) || (this._value == other._value && BigInt(this._decimal) >= BigInt(other._decimal))) :
      (BigInt(this._value) < BigInt(other._value) || (this._value == other._value && BigInt(this._decimal) <= BigInt(other._decimal)))
    );
  };

  lessThanOrEqual(other: BigNumber): boolean {
    return this.lte(other);
  };

  // Arithmetic Operation Methods

  add(other: BigNumber): BigNumber {
    const thisValueAsBigInt = BigInt(this._value);
    const otherValueAsBigInt = BigInt(other._value);
    const thisDecimalAsBigInt = BigInt(this._decimal);
    const otherDecimalAsBigInt = BigInt(other._decimal);

    if (this._sign == other._sign) {
      const decimalAddition = (thisDecimalAsBigInt + otherDecimalAsBigInt).toString();

      if (decimalAddition.length <= PRECISION_BYTES)
        return new BigNumber(
          this._sign,
          (thisValueAsBigInt + otherValueAsBigInt).toString(),
          BigNumber.fixDecimalDigits(decimalAddition)
        );
      else
        return new BigNumber(
          this._sign,
          (thisValueAsBigInt + otherValueAsBigInt + 1n).toString(),
          decimalAddition.substring(1)
        );
    } else {
      if (!this._sign) return other.add(this);

      if (thisDecimalAsBigInt >= otherDecimalAsBigInt)
        return new BigNumber(
          thisValueAsBigInt >= otherValueAsBigInt,
          (thisValueAsBigInt >= otherValueAsBigInt ? (thisValueAsBigInt - otherValueAsBigInt) : (otherValueAsBigInt - thisValueAsBigInt)).toString(),
          BigNumber.fixDecimalDigits((thisDecimalAsBigInt - otherDecimalAsBigInt).toString())
        );
      
      return other.neg().add(this.neg()).neg();
    }
  };

  sub(other: BigNumber): BigNumber {
    return this.add(other.neg());
  };

  mul(other: BigNumber): BigNumber {
    const thisAsBigInt = BigInt(this._value) * BigInt(PRECISION) + BigInt(this._decimal);
    const otherAsBigInt = BigInt(other._value) * BigInt(PRECISION) + BigInt(other._decimal);

    const sign = this._sign == other._sign;
    const answer = (thisAsBigInt * otherAsBigInt).toString();
    let value = answer.substring(0, answer.length - 2 * PRECISION_BYTES);
    let decimal = BigNumber.roundString(answer.substring(answer.length - 2 * PRECISION_BYTES), PRECISION_BYTES);

    if (!value.length)
      value = '0';

    if (decimal.length > PRECISION_BYTES) {
      value = (BigInt(value) + BigInt(1)).toString();
      decimal = '0';
    }

    return new BigNumber(
      sign,
      value,
      decimal
    );
  };

  div(other: BigNumber): BigNumber {
    let thisAsBigInt = BigInt(this._value) * BigInt(PRECISION) + BigInt(this._decimal);
    const otherAsBigInt = BigInt(other._value) * BigInt(PRECISION) + BigInt(other._decimal);

    let answerValue = (thisAsBigInt / otherAsBigInt);
    thisAsBigInt -= answerValue * otherAsBigInt;
    thisAsBigInt *= BigInt(10);

    let answerDecimal = '';

    for (let i = 0; thisAsBigInt > 0 && i < PRECISION_BYTES + 1 && answerDecimal.length < PRECISION_BYTES + 1; i++) {
      while (thisAsBigInt < otherAsBigInt) {
        thisAsBigInt *= BigInt(10);
        answerDecimal += '0';
      }

      const quotient = (thisAsBigInt / otherAsBigInt);
      answerDecimal += quotient.toString();
      thisAsBigInt -= quotient * otherAsBigInt;
      thisAsBigInt *= BigInt(10);
    }
    
    return new BigNumber(
      this._sign == other._sign,
      answerValue.toString(),
      answerDecimal
    );
  };

  mod(other: BigNumber): BigNumber {
    return this.abs().sub(
      other.abs().mul(this.div(other).trunc().abs())
    );
  };
}
