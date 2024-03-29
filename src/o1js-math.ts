import {
  Bool,
  Field,
  Poseidon,
  Struct,
  Provable
} from 'o1js';

import { BigNumber } from './BigNumber';
import { fieldMod, precisionRound, roundString, widenScientificNotation } from './utility'

// IMPORTANT NOTES:
// Library supports real numbers in the range: [-1e18, 1e18]
// Integer part of the number must fit in 64 bits
// Decimal part of the number can be chosen as wanted, it will be rounded to PRECISION digits
// The current precision is, `PRECISION = 8` digits
// Do not forget to change the NUM_BITS, PRECISION_EXACT, and `SIGN` accordingly if you update PRECISION to ensure CircuitMath works as expected

const
  E = 2.718281828459045235,
  E_STR = "2.718281828459045235",
  LN_10 = 2.3025850929940457,
  LN_2 = 0.6931471805599453,
  NEGATIVE_INFINITY = -1e18,
  NUM_BITS = 128, // 1e26
  NUM_BITS_EXACT = 256, // 1e36
  PI = 3.1415926535897932,
  POSITIVE_INFINITY = 1e18,
  PRECISION = 1e8,
  PRECISION_EXACT = 1e18,
  PRECISION_EXACT_LOG = 18,
  SIGN = 1e19
;

// CircuitNumber class with PRECISION_EXACT rounding to help with taylor series
class CircuitNumberExact extends Struct({
  _value: Field
}) {
  static NUM_BITS = NUM_BITS_EXACT;

  constructor (
    _value: Field,
    _sign: Field
  ) {
    if (_value.isConstant())
      _value.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(_value, 'CircuitNumberExact: Your number must fit in 64 bits.');

    Bool.or(
      _sign.equals(Field(1)),
      _sign.equals(Field(-1))
    ).assertEquals(Bool(true), 'CircuitNumberExact: Unknown sign is given to the number, must be either 1 or -1.');

    _value = _value.add(Provable.if(
      _sign.equals(Field(1)).and(_value.equals(Field(0)).not()), // 0 is defined as positive
      Field(SIGN),
      Field(0)
    ));

    super({ _value });

    this._value = _value;
  };

  // Utility Functions

  sign(): Field {
    return Provable.if(
      this._value.greaterThan(Field(SIGN)),
      Field(-1),
      Field(1)
    );
  };

  setSign(_sign: Field): CircuitNumberExact {
    return new CircuitNumberExact(
      this._value,
      _sign
    );
  }

  // Private Utility Functions

  private static min(): CircuitNumberExact {
    return new CircuitNumberExact(
      Field(1),
      Field(1)
    );
  };

  private static precision(): CircuitNumberExact {
    return new CircuitNumberExact(
      Field(10),
      Field(1)
    );
  };

  // Provable Interface Functions

  check(): void {
    if (this._value.isConstant())
      this._value.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(this._value, 'CircuitNumberExact: Your number must fit in 64 bits.');
    
  };

  fromFields(fields: Field []): CircuitNumberExact {
    const value = fields[0].rangeCheckHelper(CircuitNumberExact.NUM_BITS);
    const sign = Provable.if(
      value.equals(fields[0]),
      Field(1),
      Field(-1)
    );

    return new CircuitNumberExact(
      value,
      sign
    );
  };

  sizeInFields(): number {
    return 1;
  };

  toAuxilary(): [] {
    return [];
  };

  toFields(): Field[] {
    return [
      this._value
    ];
  };

  // Static Definition Functions

  static copysign(number: CircuitNumberExact, _sign: CircuitNumberExact): CircuitNumberExact {
    return new CircuitNumberExact(
      number._value,
      _sign.sign()
    );
  };

  static from(_number: number): CircuitNumberExact {
    const number = Math.abs(_number);

    if (number < 1 / PRECISION_EXACT)
      return new CircuitNumberExact(
        Field(0),
        Field(1)
      );

    const value = Math.trunc(number);
    const decimal = (number - value) < 1 / PRECISION ? '0' : precisionRound((number - value) * PRECISION_EXACT);
    const sign = number >= 0 ? 1 : -1;

    return new CircuitNumberExact(
      Field(value)
      .mul(
        Field(PRECISION_EXACT)
      ).add(
        Field(widenScientificNotation(decimal))
      ),
      Field(sign)
    );
  };

  static fromField(_integer: Field, _decimal: Field, _sign: Field): CircuitNumberExact {
    return new CircuitNumberExact(
      _integer.mul(Field(PRECISION_EXACT)).add(_decimal),
      _sign
    );
  };
 
  static fromString(numberString: string): CircuitNumberExact { // Use fromString() if the number is not an integer to avoid rounding errors caused by JS
    let value, decimal, sign;
    sign = numberString[0] == '-' ? -1 : 1;

    if (numberString.includes('e')) {
      if (numberString[numberString.indexOf('e') + 1] == '-') {
        const decimalRound = parseInt(numberString.substring(numberString.indexOf('e') + 2)) - 1;
        decimal = `${Array.from({ length: decimalRound }, _ => '0').join('')}${numberString.substring(0, numberString.indexOf('e')).replace('-', '').replace('.', '')}`.substring(0, PRECISION_EXACT_LOG);
        value = '0';
      } else {
        const valueRound = parseInt(numberString.substring(numberString.indexOf('e') + 2));
        value = `${numberString.substring(0, numberString.indexOf('e')).replace('-', '').replace('.', '')}${Array.from({ length: valueRound }, _ => '0').join('')}`;
        decimal = '0';
      }
    } else {
      value = numberString.split('.')[0].replace('-', '');
      decimal = numberString.split('.').length > 1 ? numberString.split('.')[1].substring(0, PRECISION_EXACT_LOG) : '0';

      while (decimal.length < PRECISION_EXACT_LOG)
        decimal = decimal + '0';
    }

    return new CircuitNumberExact(
      Field(
        widenScientificNotation(value)
      ).mul(
        Field(PRECISION_EXACT)
      ).add(
        Field(
          widenScientificNotation(decimal)
        )
      ),
      Field(sign)
    );
  };

  static fromCircuitNumber(number: CircuitNumber): CircuitNumberExact {
    return new CircuitNumberExact(
      number._value.mul(Field(PRECISION_EXACT / PRECISION)),
      number.sign()
    );
  };

  // Type Conversion Functions

  toCircuitNumber(): CircuitNumber {
    const integer = this._value.sub(fieldMod(this._value, Field(PRECISION_EXACT), CircuitNumberExact.NUM_BITS));
    const decimal = this._value.sub(integer);

    const PRECISION_DIFFERENCE = PRECISION_EXACT / PRECISION;

    return CircuitNumber.fromField(
      integer.div(Field(PRECISION_EXACT)),
      decimal.sub(fieldMod(decimal, Field(PRECISION_DIFFERENCE), CircuitNumberExact.NUM_BITS)).div(Field(PRECISION_DIFFERENCE)),
      this.sign()
    );
  };

  toField(): Field {
    return this._value.div(Field(PRECISION_EXACT));
  };

  toNumber(): number {
    return (
      this.isPositive() ?
      Number(1) :
      Number(-1)
    ) * (Number(this._value.toBigInt()) / Number(PRECISION_EXACT));
  };

  toString(): string {
    const integer = this._value.sub(fieldMod(this._value, Field(PRECISION_EXACT), CircuitNumberExact.NUM_BITS));
    const decimal = this._value.sub(integer);

    return (
      this.isPositive() ?
      '' :
      '-'
    ) + integer.toBigInt().toString() + (decimal.toBigInt() > 0 ? '.' + decimal.toBigInt().toString() : '');
  };

  normalizeRadians(): CircuitNumberExact {
    const turn = CircuitNumberExact.fromString((2 * PI).toString());
    return CircuitNumberExact.copysign(this.abs().mod(turn), this).add(turn).mod(turn);
  };

  // Type Check Functions

  isConstant(): boolean {
    return this._value.isConstant()
  };

  isPositive(): Bool {
    return Provable.if(
      this._value.greaterThan(Field(SIGN)),
      Bool(false),
      Bool(true)
    );
  };

  // Arithmetic Conversion Functions

  abs(): CircuitNumberExact {
    return new CircuitNumberExact(
      this._value,
      Field(1)
    );
  };

  inv(): CircuitNumberExact {
    return CircuitNumberExact.from(1).div(this);
  };

  neg(): CircuitNumberExact {
    return new CircuitNumberExact(
      this._value,
      this.sign().neg()
    );
  };

  trunc(): CircuitNumberExact {
    return new CircuitNumberExact(
      this._value.sub(fieldMod(this._value, Field(PRECISION_EXACT), CircuitNumberExact.NUM_BITS)),
      this.sign()
    );
  };

  // Logic Comparison Functions

  equals(other: CircuitNumberExact): Bool {
    return this.toField().equals(other.toField());
  };

  inPrecisionRange(other: CircuitNumberExact): Bool {
    return this.sub(other).abs().lessThanOrEqual(CircuitNumberExact.precision());
  };

  greaterThan(other: CircuitNumberExact): Bool {
    const greaterThan = this._value.greaterThan(other._value);

    const this_sign = this.sign();
    const other_sign = other.sign();

    return Provable.if(
      this_sign.equals(other_sign),
      Provable.if(
        this_sign.equals(Field(1)),
        greaterThan,
        greaterThan.not()
      ),
      Provable.if(
        this_sign.equals(Field(1)),
        Bool(true),
        Bool(false)
      )
    );
  };

  greaterThanOrEqual(other: CircuitNumberExact): Bool {
    return Bool.or(
      this.greaterThan(other),
      this.equals(other)
    );
  };

  lessThan(other: CircuitNumberExact): Bool {
    const lessThan = this._value.lessThan(other._value);

    const this_sign = this.sign();
    const other_sign = other.sign();

    return Provable.if(
      this_sign.equals(other_sign),
      Provable.if(
        this_sign.equals(Field(1)),
        lessThan,
        lessThan.not()
      ),
      Provable.if(
        this_sign.equals(Field(1)),
        Bool(false),
        Bool(true)
      )
    );
  };

  lessThanOrEqual(other: CircuitNumberExact): Bool {
    return Bool.or(
      this.lessThan(other),
      this.equals(other)
    );
  };

  // Arithmetic Operation Functions

  add(other: CircuitNumberExact): CircuitNumberExact {
    const number1 = this._value.seal();
    const number2 = other._value.seal();

    const this_sign = this.sign();
    const other_sign = other.sign();

    const answer = Provable.if(
      this_sign.equals(other_sign),
      (() => {
        const answerValue = number1.add(number2);
        return new CircuitNumberExact(
          answerValue,
          this_sign
        );
      })(),
      (() => {
        const isEqual = number1.equals(number2);
        const isGt = number1.greaterThan(number2);

        const answerValue = Provable.if(
          isGt,
          number1.sub(number2),
          number2.sub(number1)
        );
        const answerSign = Provable.if(
          isEqual,
          Field(1),
          Provable.if(
            isGt,
            this_sign,
            other_sign
          )
        );
        return new CircuitNumberExact(
          answerValue,
          answerSign
        );
      })()
    );

    return answer;
  };

  sub(other: CircuitNumberExact): CircuitNumberExact {
    return this.add(other.neg());
  };

  mul(other: CircuitNumberExact): CircuitNumberExact {
    const thisValueSeal = this._value.seal();
    const otherValueSeal = other._value.seal();
    const valueMultiplication = thisValueSeal.mul(otherValueSeal);

    const this_sign = this.sign();
    const other_sign = other.sign();

    const answerValue = Provable.witness(
      Field,
      () => new Field(thisValueSeal.toBigInt() * otherValueSeal.toBigInt() / BigInt(PRECISION_EXACT))
    );

    answerValue.assertEquals(valueMultiplication.sub(fieldMod(valueMultiplication, Field(PRECISION_EXACT), CircuitNumberExact.NUM_BITS)).div(Field(PRECISION_EXACT)));

    const answer = new CircuitNumberExact(
      answerValue,
      Provable.if(
        this_sign.equals(other_sign),
        Field(1),
        Field(-1)
      )
    );

    return answer;
  };

  div(other: CircuitNumberExact): CircuitNumberExact {
    // (X + Dx) / (Y + Dy) = X / (Y + Dy) [`Term1`] + Dx / (Y + Dy) [`Term2`]

    const thisValueSeal = this._value.seal();
    const otherValueSeal = other._value.seal();

    const this_sign = this.sign();
    const other_sign = other.sign();

    let answerValue = Provable.witness(
      Field,
      () => new Field( widenScientificNotation((BigNumber.fromBigInt(thisValueSeal.toBigInt()).div(BigNumber.fromBigInt(otherValueSeal.toBigInt()))).toString()).split('.')[0] )
    );

    const answerValueSeal = answerValue.seal();
    let answerDecimal = Provable.witness(
      Field,
      () => new Field( roundString((BigNumber.fromBigInt(thisValueSeal.toBigInt()).div(BigNumber.fromBigInt(otherValueSeal.toBigInt())).sub(BigNumber.fromBigInt(answerValueSeal.toBigInt()))).mul(BigNumber.fromBigInt(BigInt(PRECISION_EXACT))).toInteger(), PRECISION_EXACT_LOG) )
    );

    const doesRecur = (answerDecimal).greaterThanOrEqual(Field(PRECISION_EXACT));

    const answerValueFinal = answerValue.add(Provable.if(
      doesRecur,
      Field(1),
      Field(0)
    ));
    const answerDecimalFinal = answerDecimal.sub(Provable.if(
      doesRecur,
      Field(PRECISION_EXACT),
      Field(0)
    ))
    const answerSign = Provable.if(
      this_sign.equals(other_sign),
      Field(1),
      Field(-1)
    );

    const answer = new CircuitNumberExact(
      answerValueFinal.mul(Field(PRECISION_EXACT)).add(answerDecimalFinal),
      answerSign
    );

    const reverseResult = other.mul(answer);
    const reverseResultDiff = this.sub(reverseResult).abs();

    // Provable.if(
    //   answer.toField().equals(Field(0)), // If (X + Dx) / (Y + Dy) is smaller than PRECISION_EXACT^-1 (and thus is rounded to 0), an assert check on multiplication would fail.
    //   this.lessThan(CircuitNumberExact.min().mul(other)),
    //   Bool.and(
    //     reverseResultDiff.lessThan(this.sub(other.mul(answer.add(CircuitNumberExact.min()))).abs()),
    //     reverseResultDiff.lessThan(this.sub(other.mul(answer.sub(CircuitNumberExact.min()))).abs())
    //   )
    // ).assertEquals(Bool(true));

    Bool.and(
      reverseResultDiff.lessThanOrEqual(this.sub(other.mul(answer.add(CircuitNumberExact.min()))).abs()),
      reverseResultDiff.lessThanOrEqual(this.sub(other.mul(answer.sub(CircuitNumberExact.min()))).abs())
    ).assertEquals(Bool(true));

    return answer;
  };

  mod(other: CircuitNumberExact): CircuitNumberExact {
    return this.abs().sub(
      other.abs().mul(this.div(other).trunc().abs())
    );
  };
};

export class CircuitNumber extends Struct({
  _value: Field
}) {
  static NUM_BITS = NUM_BITS;

  private constructor (
    _value: Field,
    _sign: Field
  ) {
    if (_value.isConstant()) _value.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(_value, 'CircuitNumber: Your number must fit in 64 bits.');

    // _value.assertLessThanOrEqual(CircuitNumber.MAX_FIELD_LIMIT, `CircuitNumber: Your number should be in range [-1e${POSITIVE_INFINITY_LOG}, 1e${POSITIVE_INFINITY_LOG}].`)

    Bool.or(
      _sign.equals(Field(1)),
      _sign.equals(Field(-1))
    ).assertEquals(Bool(true), 'CircuitNumber: Unknown sign is given to the number, must be either 1 or -1.');

    _value = _value.add(Provable.if(
      _sign.equals(Field(1)).and(_value.equals(Field(0)).not()), // 0 is defined as positive
      Field(SIGN),
      Field(0)
    ));

    super({ _value });

    this._value = _value;
  };

  // Utility Functions

  sign(): Field {
    return Provable.if(
      this._value.greaterThan(Field(SIGN)),
      Field(-1),
      Field(1)
    );
  };

  // Private Utility Functions

  private static precision(): CircuitNumber {
    return new CircuitNumber(
      Field(10),
      Field(1)
    );
  };

  // Provable Interface Functions

  toFields(): Field[] {
    return [
      this._value
    ];
  };

  // Static Definition Functions

  static copysign(number: CircuitNumber, _sign: CircuitNumber): CircuitNumber {
    return new CircuitNumber(
      number._value,
      _sign.sign()
    );
  };

  static from(_number: number): CircuitNumber {
    const number = Math.abs(_number);

    if (number < 1 / PRECISION)
      return new CircuitNumber(
        Field(0),
        Field(1)
      );

    const value = Math.trunc(number);
    const decimal = (number - value) < 1 / PRECISION ? '0' : precisionRound((number - value) * PRECISION);
    const sign = number >= 0 ? 1 : -1;

    return new CircuitNumber(
      Field(value)
      .mul(
        Field(PRECISION)
      ).add(
        Field(
          widenScientificNotation(decimal)
        )
      ),
      Field(sign)
    );
  };

  static fromField(_integer: Field, _decimal: Field, _sign: Field): CircuitNumber {
    return new CircuitNumber(
      _integer.mul(Field(PRECISION)).add(_decimal),
      _sign
    );
  };

  // Type Conversion Functions

  hash(): Field {
    return Poseidon.hash([ this.toField() ]);
  };

  toField(): Field {
    return this.sign().mul(this._value).div(Field(PRECISION));
  };

  toNumber(): Number {
    return (
      this.sign().toBigInt() == 1n ?
      Number(1) :
      Number(-1)
    ) * (Number(this._value.toConstant().toBigInt()) / Number(PRECISION));
  };

  toString(): String {
    return this.toNumber().toString();
  };

  valueOf(): number {
    return this.toNumber().valueOf();
  };

  // Arithmetic Conversion Functions

  abs(): CircuitNumber {
    return new CircuitNumber(
      this._value,
      Field(1)
    );
  };
  
  ceil(): CircuitNumber {
    const integer = this._value.sub(fieldMod(this._value, Field(PRECISION), CircuitNumber.NUM_BITS));
    const decimal = this._value.sub(integer);

    const this_sign = this.sign();

    return new CircuitNumber(
      integer.add(Provable.if(
        Bool.or(
          this_sign.equals(Field(1)).not(),
          decimal.equals(Field(0))
        ),
        Field(0),
        Field(PRECISION)
      )),
      this_sign
    );
  };

  floor(): CircuitNumber {
    const integer = this._value.sub(fieldMod(this._value, Field(PRECISION), CircuitNumber.NUM_BITS));
    const decimal = this._value.sub(integer);

    const this_sign = this.sign();

    return new CircuitNumber(
      integer.add(Provable.if(
        Bool.and(
          this_sign.equals(Field(-1)),
          decimal.equals(Field(0)).not()
        ),
        Field(PRECISION),
        Field(0)
      )),
      this_sign
    );
  };

  inv(): CircuitNumber {
    return CircuitNumber.from(1).div(this);
  };

  neg(): CircuitNumber {
    return new CircuitNumber(
      this._value,
      this.sign().neg()
    );
  };

  round(): CircuitNumber {
    const integer = this._value.sub(fieldMod(this._value, Field(PRECISION), CircuitNumber.NUM_BITS));
    const decimal = this._value.sub(integer);

    return new CircuitNumber(
      integer.add(Provable.if(
        decimal.greaterThanOrEqual(Field(0.5 * PRECISION)),
        Field(PRECISION),
        Field(0)
      )),
      Field(1)
    );
  };

  trunc(): CircuitNumber {
    const integer = this._value.sub(fieldMod(this._value, Field(PRECISION), CircuitNumber.NUM_BITS));

    return new CircuitNumber(
      integer,
      this.sign()
    );
  };

  // Trigonometric Conversion Functions

  degrees(): CircuitNumber {
    return this.div(CircuitNumber.from(PI)).mul(CircuitNumber.from(180));
  };

  radians(): CircuitNumber {
    return this.div(CircuitNumber.from(180)).mul(CircuitNumber.from(PI));
  };

  normalizeDegrees(): CircuitNumber {
    const turn = CircuitNumber.from(360);
    return CircuitNumber.copysign(this.abs().mod(turn), this).add(turn).mod(turn);
  };

  normalizeRadians(): CircuitNumber {
    const turn = CircuitNumber.from(2 * PI);
    return CircuitNumber.copysign(this.abs().mod(turn), this).add(turn).mod(turn);
  };

  // Type Check Functions

  isConstant(): boolean {
    return this._value.isConstant()
  };

  isInteger(): Bool {
    const integer = this._value.sub(fieldMod(this._value, Field(PRECISION), CircuitNumber.NUM_BITS));
    const decimal = this._value.sub(integer);

    return decimal.equals(Field(0));
  };

  isPositive(): Bool {
    return Provable.if(
      this._value.greaterThan(Field(SIGN)),
      Bool(false),
      Bool(true)
    );
  };

  // Logic Comparison Functions

  equals(other: CircuitNumber): Bool {
    return this.toField().equals(other.toField());
  };

  inPrecisionRange(other: CircuitNumber): Bool {
    return this.sub(other).abs().lessThanOrEqual(CircuitNumber.precision());
  };

  greaterThan(other: CircuitNumber): Bool {
    const greaterThan = this._value.greaterThan(other._value);

    const this_sign = this.sign();
    const other_sign = other.sign();

    return Provable.if(
      this_sign.equals(other_sign),
      Provable.if(
        this_sign.equals(Field(1)),
        greaterThan,
        greaterThan.not()
      ),
      Provable.if(
        this_sign.equals(Field(1)),
        Bool(true),
        Bool(false)
      )
    );
  };

  greaterThanOrEqual(other: CircuitNumber): Bool {
    return Bool.or(
      this.greaterThan(other),
      this.equals(other)
    );
  };

  lessThan(other: CircuitNumber): Bool {
    const lessThan = this._value.lessThan(other._value);

    const this_sign = this.sign();
    const other_sign = other.sign();

    return Provable.if(
      this_sign.equals(other_sign),
      Provable.if(
        this_sign.equals(Field(1)),
        lessThan,
        lessThan.not()
      ),
      Provable.if(
        this_sign.equals(Field(1)),
        Bool(false),
        Bool(true)
      )
    );
  };

  lessThanOrEqual(other: CircuitNumber): Bool {
    return Bool.or(
      this.lessThan(other),
      this.equals(other)
    );
  };

  // Arithmetic Operation Functions

  add(other: CircuitNumber): CircuitNumber {
    const number1 = this._value.seal();
    const number2 = other._value.seal();

    const this_sign = this.sign();
    const other_sign = other.sign();

    const answer = Provable.if(
      this_sign.equals(other_sign),
      (() => {
        const answerValue = number1.add(number2);
        return new CircuitNumber(
          answerValue,
          this_sign
        );
      })(),
      (() => {
        const isEqual = number1.equals(number2);
        const isGt = number1.greaterThan(number2);

        const answerValue = Provable.if(
          isGt,
          number1.sub(number2),
          number2.sub(number1)
        );
        const answerSign = Provable.if(
          isEqual,
          Field(1),
          Provable.if(
            isGt,
            this_sign,
            other_sign
          )
        );
        return new CircuitNumber(
          answerValue,
          answerSign
        );
      })()
    );

    return answer;
  };

  sub(other: CircuitNumber): CircuitNumber {
    return this.add(other.neg());
  };

  mul(other: CircuitNumber): CircuitNumber {
    const thisValueSeal = this._value.seal();
    const otherValueSeal = other._value.seal();
    const valueMultiplication = thisValueSeal.mul(otherValueSeal);

    const this_sign = this.sign();
    const other_sign = other.sign();

    const answerValue = Provable.witness(
      Field,
      () => new Field(thisValueSeal.toBigInt() * otherValueSeal.toBigInt() / BigInt(PRECISION))
    );
    answerValue.assertEquals(valueMultiplication.sub(fieldMod(valueMultiplication, Field(PRECISION), CircuitNumber.NUM_BITS)).div(Field(PRECISION)));

    const answer = new CircuitNumber(
      answerValue,
      Provable.if(
        this_sign.equals(other_sign),
        Field(1),
        Field(-1)
      )
    );

    return answer;
  };

  div(other: CircuitNumber): CircuitNumber {
    // Use CircuitNumberExact class to increase precision

    const _this = CircuitNumberExact.fromCircuitNumber(this);
    const _other = CircuitNumberExact.fromCircuitNumber(other);
    const answer = _this.div(_other);

    return answer.toCircuitNumber();
  };

  mod(other: CircuitNumber): CircuitNumber { // IMPORTANT: Not the same as the JS remainder operator
    return this.abs().sub(
      other.abs().mul(this.div(other).trunc().abs())
    );
  };
};

export class CircuitConstant {
  // Static Mathematical Constants

  static E = CircuitNumber.from(E);
  static EULER = CircuitConstant.E;
  static INF = CircuitNumber.from(POSITIVE_INFINITY);
  static POSITIVE_INFINITY = CircuitConstant.INF;
  static NEG_INF = CircuitNumber.from(NEGATIVE_INFINITY);
  static NEGATIVE_INFINITY = CircuitConstant.NEG_INF;
  static PI = CircuitNumber.from(PI);
};

export class CircuitMath {
  // Private Utility Functions

  private static intPow(base: CircuitNumberExact, power: CircuitNumberExact): CircuitNumberExact {
    const OPERATION_COUNT = 64;

    let answer = CircuitNumberExact.from(1);
    let notYetReachedEnd = Bool(true);

    for (let i = 0; i < OPERATION_COUNT; i++) {
      notYetReachedEnd = Provable.if(
        Bool.or(
          notYetReachedEnd.not(),
          CircuitNumberExact.from(i).equals(power)
        ),
        Bool(false),
        Bool(true)
      );
      answer = answer.mul(Provable.if(
        notYetReachedEnd,
        base,
        CircuitNumberExact.from(1)
      ));
    }

    return answer;
  };

  private static logTwo(_number: CircuitNumberExact): CircuitNumberExact {
    const number = _number.abs().trunc().toField();

    return Provable.if(
      number.equals(Field(0)),
      CircuitNumberExact.from(0),
      (() => {
        const answerValue = Provable.witness(
          Field,
          () => new Field(number.toBits().map(each => each.toBoolean()).lastIndexOf(true))
        );
    
        const answer = CircuitNumberExact.fromField(
          answerValue,
          Field(0),
          Field(1)
        );
    
        const power = CircuitMath.intPow(CircuitNumberExact.from(2), answer).toField();
        const mod = fieldMod(number, power, CircuitNumberExact.NUM_BITS);
        const check = number.sub(mod).div(power);
    
        Provable.if(
          number.equals(Field(0)),
          Bool(true),
          check.equals(Field(1))
        ).assertEquals(Bool(true));
    
        return answer;
      })()
    );
  };

  private static _ln(number: CircuitNumberExact): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 30;

    number.greaterThan(CircuitNumberExact.from(0)).assertEquals(Bool(true));
    number.lessThanOrEqual(CircuitNumberExact.from(2)).assertEquals(Bool(true));

    const x1 = number.sub(CircuitNumberExact.from(1));
    let x1Pow = x1.mul(x1);
    let signPow = CircuitNumberExact.from(1);
    let answer1 = x1Pow;
    let answer2 = CircuitNumberExact.from(-1);

    for (let i = 2; i <= TAYLOR_SERIE_TERM_PRECISION; i++) {
      answer1 = answer1.add(CircuitNumberExact.copysign(x1Pow.div(CircuitNumberExact.from(i)), signPow));
      answer2 = answer2.add(CircuitNumberExact.from(1).div(CircuitNumberExact.from(i).mul(CircuitNumberExact.from(i - 1))));
      x1Pow = x1Pow.mul(x1);
      signPow = signPow.neg();
    };

    answer2 = answer2.div(number);

    return answer2;
  };

  // Number Functions

  static gcd(_a: CircuitNumber, _b: CircuitNumber): CircuitNumber {
    const OPERATION_COUNT = 64;

    let a = _a.abs().trunc();
    let b = _b.abs().trunc();
    let isZero = b.equals(CircuitNumber.from(0));

    for (let i = 0; i < OPERATION_COUNT; i++) {
      isZero = b.equals(CircuitNumber.from(0));
      const oldA = a;
      a = Provable.if(
        isZero,
        a,
        b
      );
      b = Provable.if(
        isZero,
        b,
        oldA.mod(Provable.if(isZero, CircuitNumber.from(1), b))
      );
    };

    return a;
  };

  static lcm(_a: CircuitNumber, _b: CircuitNumber): CircuitNumber {
    let a = _a.abs().trunc();
    let b = _b.abs().trunc();
    return a.mul(b).div(CircuitMath.gcd(a, b));
  };

  // Logarithmic Functions

  private static lnExact(number: CircuitNumberExact): CircuitNumberExact {
    number.greaterThan(CircuitNumberExact.from(0)).assertEquals(Bool(true));

    const power = CircuitMath.logTwo(number);
    // const newPower = power.add(CircuitNumberExact.from(1));
    // const reminder = CircuitMath._ln(number.div(CircuitMath.intPow(CircuitNumberExact.from(2), newPower)));

    // return CircuitNumberExact.fromString(LN_2.toString()).mul(newPower).add(reminder);

    const reminder = CircuitMath._ln(number.div(CircuitMath.intPow(CircuitNumberExact.from(2), power)));
    return CircuitNumberExact.fromString(LN_2.toString()).mul(power).add(reminder);
  };

  static ln(_number: CircuitNumber): CircuitNumber {
    const number = CircuitNumberExact.fromCircuitNumber(_number);
    return CircuitMath.lnExact(number).toCircuitNumber();
  };

  static log2(number: CircuitNumber): CircuitNumber {
    return CircuitMath.ln(number).div(CircuitNumber.from(LN_2));
  };

  static log10(number: CircuitNumber): CircuitNumber {
    return CircuitMath.ln(number).div(CircuitNumber.from(LN_10));
  };

  static logBase(number: CircuitNumber, base: CircuitNumber): CircuitNumber {
    return CircuitMath.ln(number).div(CircuitMath.ln(base));
  };

  // Power & Root Functions

  private static expExact(number: CircuitNumberExact): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 15;

    let answer = CircuitNumberExact.from(1);
    let xPow = number;
    let factorial = CircuitNumberExact.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i ++) {
      answer = answer.add(xPow.div(factorial));
      xPow = xPow.mul(number);
      factorial = factorial.mul(CircuitNumberExact.from(i + 1));
    }

    return answer;
  };

  private static powExact(base: CircuitNumberExact, power: CircuitNumberExact): CircuitNumberExact {
    const intPow = power.abs().trunc();
    // console.log(intPow.toNumber())
    console.log(base.toNumber());
    console.log(CircuitMath.lnExact(base).toNumber());
    const _answer = CircuitMath.intPow(base, intPow).mul(CircuitMath.expExact(power.abs().sub(intPow).mul(CircuitMath.lnExact(base))));
    
    return Provable.if(power.isPositive(), _answer, _answer.inv());
  };

  static pow(_base: CircuitNumber, power: CircuitNumber): CircuitNumber {
    return CircuitMath.powExact(CircuitNumberExact.fromCircuitNumber(_base), CircuitNumberExact.fromCircuitNumber(power)).toCircuitNumber();
  };

  static exp(_number: CircuitNumber): CircuitNumber {
    return CircuitMath.powExact(CircuitNumberExact.fromString(E_STR), CircuitNumberExact.fromCircuitNumber(_number)).toCircuitNumber();
  };

  static sqrt(number: CircuitNumber): CircuitNumber {
    return CircuitMath.powExact(CircuitNumberExact.fromCircuitNumber(number), CircuitNumberExact.fromString('0.5')).toCircuitNumber();
  };

  static cbrt(number: CircuitNumber): CircuitNumber {
    return CircuitMath.powExact(CircuitNumberExact.fromCircuitNumber(number), CircuitNumberExact.fromString('0.33333333333333333')).toCircuitNumber();
  };

  static rootBase(number: CircuitNumber, base: CircuitNumber): CircuitNumber {
    return CircuitMath.powExact(CircuitNumberExact.fromCircuitNumber(number), CircuitNumberExact.fromCircuitNumber(base).inv()).toCircuitNumber();
  };

  // Arithmetic Comparison Functions

  static max(number1: CircuitNumber, number2: CircuitNumber): CircuitNumber {
    return Provable.if(
      number1.greaterThanOrEqual(number1),
      number1,
      number2
    );
  };

  static min(number1: CircuitNumber, number2: CircuitNumber): CircuitNumber {
    return Provable.if(
      number1.lessThanOrEqual(number1),
      number1,
      number2
    );
  };

  // Trigonometric Functions

  private static sinExact(_angle: CircuitNumber): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 19;

    const angle = CircuitNumberExact.fromCircuitNumber(_angle).normalizeRadians();

    const reducedAngle = Provable.if(
      angle.lessThan(CircuitNumberExact.fromString((PI / 2).toString())),
      angle,
      Provable.if(
        angle.lessThan(CircuitNumberExact.fromString((PI).toString())),
        CircuitNumberExact.fromString((PI).toString()).sub(angle),
        Provable.if(
          angle.lessThan(CircuitNumberExact.fromString((3 * PI / 2).toString())),
          angle.sub(CircuitNumberExact.fromString((PI).toString())).neg(),
          CircuitNumberExact.fromString((2 * PI).toString()).sub(angle)
        )
      )
    );

    const _sign = Provable.if(
      angle.lessThan(CircuitNumberExact.fromString((PI / 2).toString())),
      Field(1),
      Provable.if(
        angle.lessThan(CircuitNumberExact.fromString((PI).toString())),
        Field(1),
        Provable.if(
          angle.lessThan(CircuitNumberExact.fromString((3 * PI / 2).toString())),
          Field(-1),
          Field(-1)
        )
      )
    );

    let answer = CircuitNumberExact.from(0);
    let xPow = reducedAngle;
    let signPow = CircuitNumberExact.from(1);
    let factorial = CircuitNumberExact.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(signPow.mul(xPow.div(factorial)));
      signPow = signPow.neg();
      xPow = xPow.mul(reducedAngle).mul(reducedAngle);
      factorial = factorial.mul(CircuitNumberExact.from(i + 1));
      factorial = factorial.mul(CircuitNumberExact.from(i + 2));
    }

    answer = answer.setSign(_sign);

    return answer;
  };

  private static cosExact(_angle: CircuitNumber): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 25;

    const angle = CircuitNumberExact.fromCircuitNumber(_angle).normalizeRadians();

    const reducedAngle = Provable.if(
      angle.lessThan(CircuitNumberExact.fromString((PI / 2).toString())),
      angle,
      Provable.if(
        angle.lessThan(CircuitNumberExact.fromString(PI.toString())),
        CircuitNumberExact.fromString(PI.toString()).sub(angle),
        Provable.if(
          angle.lessThan(CircuitNumberExact.fromString((3 * PI / 2).toString())),
          angle.sub(CircuitNumberExact.fromString((PI).toString())).neg(),
          CircuitNumberExact.fromString((2 * PI).toString()).sub(angle)
        )
      )
    );

    const _sign = Provable.if(
      angle.lessThan(CircuitNumberExact.fromString((PI / 2).toString())),
      Field(1),
      Provable.if(
        angle.lessThan(CircuitNumberExact.fromString(PI.toString())),
        Field(-1),
        Provable.if(
          angle.lessThan(CircuitNumberExact.fromString((3 * PI / 2).toString())),
          Field(-1),
          Field(1)
        )
      )
    );

    let answer = CircuitNumberExact.from(1);
    let xPow = reducedAngle.mul(reducedAngle);
    let signPow = CircuitNumberExact.fromString('-1');
    let factorial = CircuitNumberExact.from(2);

    for (let i = 2; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(signPow.mul(xPow.div(factorial)));
      signPow = signPow.neg();
      xPow = xPow.mul(reducedAngle).mul(reducedAngle);
      factorial = factorial.mul(CircuitNumberExact.from(i + 1));
      factorial = factorial.mul(CircuitNumberExact.from(i + 2));
    }

    answer = answer.setSign(_sign);

    return answer;
  };

  static sin(_angle: CircuitNumber): CircuitNumber {
    return CircuitMath.sinExact(_angle).toCircuitNumber();
  };

  static cos(_angle: CircuitNumber): CircuitNumber {
    return CircuitMath.cosExact(_angle).toCircuitNumber();
  };

  static tan(number: CircuitNumber): CircuitNumber {
    return CircuitMath.sinExact(number).div(CircuitMath.cosExact(number)).toCircuitNumber();
  };

  static csc(number: CircuitNumber): CircuitNumber {
    return CircuitMath.sin(number).inv();
  };

  static sec(number: CircuitNumber): CircuitNumber {
    return CircuitMath.cos(number).inv();
  };

  static cot(number: CircuitNumber): CircuitNumber {
    return CircuitMath.cos(number).div(CircuitMath.sin(number));
  };

  // Hyperbolic Functions

  private static sinhExact(_number: CircuitNumber): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 19;

    const number = CircuitNumberExact.fromCircuitNumber(_number);

    let answer = CircuitNumberExact.from(0);
    let xPow = number;
    let factorial = CircuitNumberExact.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(xPow.div(factorial));
      xPow = xPow.mul(number).mul(number);
      factorial = factorial.mul(CircuitNumberExact.from(i + 1));
      factorial = factorial.mul(CircuitNumberExact.from(i + 2));
    }

    return answer;
  };

  private static coshExact(_number: CircuitNumber): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 19;

    const number = CircuitNumberExact.fromCircuitNumber(_number);

    let answer = CircuitNumberExact.from(1);
    let xPow = number.mul(number);
    let factorial = CircuitNumberExact.from(2);

    for (let i = 2; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(xPow.div(factorial));
      xPow = xPow.mul(number).mul(number);
      factorial = factorial.mul(CircuitNumberExact.from(i + 1));
      factorial = factorial.mul(CircuitNumberExact.from(i + 2));
    }

    return answer;
  };

  static sinh(_number: CircuitNumber): CircuitNumber {
    return CircuitMath.sinhExact(_number).toCircuitNumber();
  };

  static cosh(_number: CircuitNumber): CircuitNumber {
    return CircuitMath.coshExact(_number).toCircuitNumber();
  };

  static tanh(number: CircuitNumber): CircuitNumber {
    return CircuitMath.sinhExact(number).div(CircuitMath.coshExact(number)).toCircuitNumber();
  };

  // Inverse Trigonometric Functions

  private static arcsinExact(number: CircuitNumberExact): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 9;

    let answer = CircuitNumberExact.from(0);
    let xPow = number;
    let signPow = CircuitNumberExact.from(1);
    let factorial = CircuitNumberExact.from(1);
    let doubledFactorial = CircuitNumberExact.from(1);
    let fourPow = CircuitNumberExact.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i ++) {
      answer = answer.add(xPow.mul(doubledFactorial).div(factorial).div(fourPow).div(CircuitNumberExact.fromString((2 * i + 1).toString())));
      signPow = signPow.neg();
      xPow = xPow.mul(number).mul(number);
      factorial = factorial.mul(CircuitNumberExact.from(i + 1));
      factorial = factorial.mul(CircuitNumberExact.from(i + 2));
    }

    return answer;
  };

  static arcsin(number: CircuitNumber): CircuitNumber {
    return CircuitMath.arcsinExact(CircuitNumberExact.fromCircuitNumber(number)).toCircuitNumber();
  };

  static arccos(number: CircuitNumber): CircuitNumber {
    return CircuitNumberExact.fromString(PI.toString()).mul(CircuitNumberExact.from(2)).sub(CircuitMath.arcsinExact(CircuitNumberExact.fromCircuitNumber(number))).toCircuitNumber();
  };

  static arctan(_number: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 70;

    const number = CircuitNumberExact.fromCircuitNumber(_number);

    let answer = CircuitNumberExact.from(0);
    let xPow = number;
    let signPow = CircuitNumberExact.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(signPow.mul(xPow.div(CircuitNumberExact.from(i))));
      signPow = signPow.neg();
      xPow = xPow.mul(number).mul(number);
    }

    return answer.toCircuitNumber();
  };

  // Inverse Hyperbolic Functions

  private static arcsinhExact(number: CircuitNumberExact): CircuitNumberExact {
    const value = number._value.seal();
    const sign = number.sign().seal();

    const answerValue = Provable.witness(
      Field,
      () => {
        const number = (sign.toBigInt() == 1n ? 1 : -1) * Number(value.toBigInt()) / PRECISION;
        return Field(precisionRound(Math.abs(Math.asinh(number)) * PRECISION_EXACT));
      }
    );

    const answerSign = Provable.witness(
      Field,
      () => {
        const number = (sign.toBigInt() == 1n ? 1 : -1) * Number(value.toBigInt()) / PRECISION;
        return Math.asinh(number) > 0 ? Field(1) : Field(-1);
      }
    );
    Bool.or(
      answerSign.equals(Field(1)),
      answerSign.equals(Field(-1))
    ).assertEquals(Bool(true));

    const answer = new CircuitNumberExact(answerValue, answerSign);

    CircuitMath.arcsinExact(answer).inPrecisionRange(number).assertEquals(Bool(true));

    return answer;
  };

  static arcsinh(number: CircuitNumber): CircuitNumber {
    return CircuitMath.arcsinhExact(CircuitNumberExact.fromCircuitNumber(number)).toCircuitNumber();
  };

  // static arccosh(number: CircuitNumber): CircuitNumber {
  //   return CircuitNumber.from(1);
  // };

  // static arctanh(number: CircuitNumber): CircuitNumber {
  //   return CircuitNumber.from(1);
  // };

  // Geometric Functions

  static dist(x: CircuitNumber, y: CircuitNumber): CircuitNumber {
    return x.mul(x).add(y.mul(y));
  };

  static hypot(x: CircuitNumber, y: CircuitNumber): CircuitNumber {
    return CircuitMath.sqrt((x.mul(x).add(y.mul(y))));
  };
};
