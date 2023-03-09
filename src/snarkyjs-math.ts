import {
  Bool,
  Circuit,
  Field,
  Poseidon,
  Struct,
  isReady
} from 'snarkyjs';

await isReady;

// SUPPORTED: -1e18 < X < 1e18.
// DECIMAL PRECISION: 1e9

const
  PI = 3.1415926535897932,
  E = 2.7182818284590452,
  POSITIVE_INFINITY = 1e18,
  NEGATIVE_INFINITY = -1e18,
  NUM_BITS = 64,
  PRECISION = 1e8,
  PRECISION_LOG = 8,
  PRECISION_EXACT = 1e18,
  PRECISION_EXACT_LOG = 18,
  LN_2 = 0.6931471805599453,
  LN_10 = 2.3025850929940457
;

// CircuitNumber class with PRECISION_EXACT rounding to help with taylor series
class CircuitNumberExact extends Struct({
  value: Field,
  decimal: Field,
  sign: Field
}) {
  static NUM_BITS = NUM_BITS;

  constructor (
    value: Field,
    decimal: Field,
    sign: Field
  ) {
    super({
      value,
      decimal,
      sign
    });

    this.value = value;
    this.decimal = decimal;
    this.sign = sign;
  };

  private static mod(x: Field, y: Field): Field {
    if (x.isConstant() && y.isConstant()) {
      let xn = x.toBigInt();
      let yn = y.toBigInt();
      let q3 = xn / yn;
      let r2 = xn - q3 * yn;
      return new Field(CircuitNumberExact.widenScientificNotation(r2.toString()));
    }
  
    y = y.seal();
    let q2 = Circuit.witness(Field, () => new Field(CircuitNumberExact.widenScientificNotation((x.toBigInt() / y.toBigInt()).toString())));
    q2.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(q2);
    let r = x.sub(q2.mul(y)).seal();
    r.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(r);
    return r;
  };

  private static precisionRound(number: number): string {
    let numberAsString = number.toString();

    if (numberAsString.includes('e'))
      numberAsString = CircuitNumberExact.widenScientificNotation(numberAsString);

    let numberValue = numberAsString.split('.')[0];

    if (numberAsString.split('.').length < 2)
      return numberValue;

    let lastDigit = parseInt(numberAsString.split('.')[1][0]) + 1;

    const numberValueAsArray = [...numberValue];
    
    for (let i = numberValue.length - 1; i >= 0 && lastDigit == 10; i--) {
      lastDigit = parseInt(numberValueAsArray[i]) + 1;
      numberValueAsArray[i] = (lastDigit % 10).toString();
    }

    numberValue = numberValueAsArray.join('');

    if (lastDigit == 10)
      numberValue = '1' + numberValue;

    return numberValue;
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

  // Static Definition Functions

  static copysign(number: CircuitNumberExact, sign: CircuitNumberExact): CircuitNumberExact {
    return new CircuitNumberExact(
      number.value,
      number.decimal,
      sign.sign
    );
  };

  static fromString(numberString: string): CircuitNumberExact {
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
      Field(CircuitNumberExact.widenScientificNotation(value)),
      Field(CircuitNumberExact.widenScientificNotation(decimal)),
      Field(sign)
    );
  };

  static fromCircuitNumber(number: CircuitNumber): CircuitNumberExact {
    return new CircuitNumberExact(
      number.value,
      number.decimal.mul(Field(PRECISION_EXACT / PRECISION)),
      number.sign
    );
  };

  // Type Conversion Functions

  toCircuitNumber(): CircuitNumber {
    return CircuitNumber.fromField(
      this.value,
      this.decimal.sub(CircuitNumberExact.mod(this.decimal, Field(PRECISION_EXACT / PRECISION))).div(Field(PRECISION_EXACT / PRECISION)),
      this.sign
    );
  };

  toField(): Field {
    return Circuit.if(
      this.sign.equals(Field(-1)),
      Field(-1),
      Field(1)
    ).mul(this.value.add(this.decimal.div(Field(PRECISION_EXACT))));
  };

  toNumber(): Number {
    return (
      this.sign.equals(Field(-1)).toBoolean() ?
      Number(-1) :
      Number(1)
    ) * (Number(this.value.toBigInt()) + Number(this.decimal.toBigInt()) / Number(PRECISION_EXACT))
  };

  normalizeRadians(): CircuitNumberExact {
    const turn = CircuitNumberExact.fromString((2 * PI).toString());
    return CircuitNumberExact.copysign(this.abs().mod(turn), this).add(turn).mod(turn);
  };

  // Type Check Functions

  isConstant(): boolean {
    return this.value.isConstant() && this.decimal.isConstant() && this.sign.isConstant()
  };

  // Arithmetic Conversion Functions

  abs(): CircuitNumberExact {
    return new CircuitNumberExact(
      this.value,
      this.decimal,
      Field(1)
    );
  };

  inv(): CircuitNumberExact {
    return CircuitNumberExact.fromString('1').div(this);
  };

  neg(): CircuitNumberExact {
    return new CircuitNumberExact(
      this.value,
      this.decimal,
      this.sign.neg()
    );
  };

  trunc(): CircuitNumberExact {
    return new CircuitNumberExact(
      this.value,
      Field(0),
      this.sign
    );
  };

  // Logic Comparison Functions

  equals(other: CircuitNumberExact): Bool {
    return this.toField().equals(other.toField());
  };

  gt(other: CircuitNumberExact): Bool {
    const valueGt = this.value.gt(other.value);
    const decimalGt = this.decimal.gt(other.decimal);

    return Circuit.if(
      this.equals(other),
      Bool(false),
      Circuit.if(
        this.sign.equals(other.sign),
        Circuit.if(
          this.sign.equals(Field(1)),
          Circuit.if(
            this.value.equals(other.value).not(),
            valueGt,
            decimalGt
          ),
          Circuit.if(
            this.value.equals(other.value).not(),
            valueGt.not(),
            decimalGt.not()
          ),
        ),
        Circuit.if(
          this.sign.equals(Field(1)),
          Bool(true),
          Bool(false)
        )
      )
    );
  };

  gte(other: CircuitNumberExact): Bool {
    return Bool.or(
      this.gt(other),
      this.equals(other)
    );
  };

  lt(other: CircuitNumberExact): Bool {
    const valueLt = this.value.lt(other.value);
    const decimalLt = this.decimal.lt(other.decimal);

    return Circuit.if(
      this.equals(other),
      Bool(false),
      Circuit.if(
        this.sign.equals(other.sign),
        Circuit.if(
          this.sign.equals(Field(1)),
          Circuit.if(
            this.value.equals(other.value).not(),
            valueLt,
            decimalLt
          ),
          Circuit.if(
            this.value.equals(other.value).not(),
            valueLt.not(),
            decimalLt.not()
          ),
        ),
        Circuit.if(
          this.sign.equals(Field(1)),
          Bool(false),
          Bool(true)
        )
      )
    );
  };

  lte(other: CircuitNumberExact): Bool {
    return Bool.or(
      this.lt(other),
      this.equals(other)
    );
  };

  // Arithmetic Operation Functions

  add(other: CircuitNumberExact): CircuitNumberExact {
    let valueAddition: Field, decimalAddition: Field, sign: Field; // For same sign
    let valueAddition2: Field, decimalAddition2: Field, sign2: Field; // For diff sign

    if (this.isConstant() && other.isConstant()) {
      const xValue = this.value.toBigInt();
      const yValue = other.value.toBigInt();
      const xDecimal = this.decimal.toBigInt();
      const yDecimal = other.decimal.toBigInt();

      valueAddition = Field(xValue.valueOf() + yValue.valueOf() + ((xDecimal.valueOf() + yDecimal.valueOf()) / BigInt(PRECISION_EXACT)));
      decimalAddition = Field((xDecimal.valueOf() + yDecimal.valueOf()) % BigInt(PRECISION_EXACT));
    } else {
      const xValueSeal = this.value.seal();
      const yValueSeal = other.value.seal();
      const xDecimalSeal = this.decimal.seal();
      const yDecimalSeal = other.decimal.seal();

      valueAddition = Circuit.witness(
        Field,
        () => new Field(xValueSeal.toBigInt() + yValueSeal.toBigInt() + ((xDecimalSeal.toBigInt() + yDecimalSeal.toBigInt()) / BigInt(PRECISION_EXACT)))
      );
      valueAddition.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(valueAddition);

      decimalAddition = Circuit.witness(
        Field,
        () => new Field((xDecimalSeal.toBigInt() + yDecimalSeal.toBigInt()) % BigInt(PRECISION_EXACT))
      );
      decimalAddition.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(decimalAddition);
    }

    sign = this.sign;

    if (this.isConstant() && other.isConstant()) {
      let xValue = this.value.toBigInt();
      let yValue = other.value.toBigInt();
      let xDecimal = this.decimal.toBigInt();
      let yDecimal = other.decimal.toBigInt();

      sign2 = this.sign;

      if (xValue < yValue || (xValue == yValue && xDecimal < yDecimal)) {
        xValue = other.value.toBigInt();
        xDecimal = other.decimal.toBigInt();
        yValue = this.value.toBigInt();
        yDecimal = this.decimal.toBigInt();
        sign2 = this.sign.neg();
      }

      valueAddition2 = Field(xValue - yValue);
      decimalAddition2 = Field(xDecimal - yDecimal);
      if (xDecimal < yDecimal) {
        decimalAddition2 = decimalAddition2.add(Field(PRECISION_EXACT));
        valueAddition2 = valueAddition2.sub(Field(1));
      }
    } else {
      const isXBiggerOrEqual = Bool.or(
        this.value.gt(other.value),
        Bool.and(
          this.value.equals(other.value),
          this.decimal.lt(other.decimal)
        )
      );

      const xValueSeal = Circuit.if(isXBiggerOrEqual, this.value.seal(), other.value.seal());
      const yValueSeal = Circuit.if(isXBiggerOrEqual, other.value.seal(), this.value.seal());
      const xDecimalSeal = Circuit.if(isXBiggerOrEqual, this.decimal.seal(), other.decimal.seal());
      const yDecimalSeal = Circuit.if(isXBiggerOrEqual, other.decimal.seal(), this.decimal.seal());

      sign2 = Circuit.if(isXBiggerOrEqual, this.sign, other.sign);

      valueAddition2 = Circuit.witness(
        Field,
        () => new Field(xValueSeal.toBigInt() - yValueSeal.toBigInt())
      );
      valueAddition2.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(valueAddition2);

      decimalAddition2 = Circuit.witness(
        Field,
        () => new Field(xDecimalSeal.toBigInt() - yDecimalSeal.toBigInt())
      );
      decimalAddition2.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(decimalAddition2);

      valueAddition2 = valueAddition2.sub(Circuit.if(
        xDecimalSeal.lt(yDecimalSeal),
        Field(1),
        Field(0)
      ));
      decimalAddition2 = decimalAddition2.add(Circuit.if(
        xDecimalSeal.lt(yDecimalSeal),
        Field(PRECISION_EXACT),
        Field(0)
      ));
    }

    const answer = new CircuitNumberExact(
      Circuit.if(this.sign.equals(other.sign), valueAddition, valueAddition2),
      Circuit.if(this.sign.equals(other.sign), decimalAddition, decimalAddition2),
      Circuit.if(this.sign.equals(other.sign), sign, sign2)
    );

    this.toField().add(other.toField())
      .assertEquals(answer.toField());

    return answer;
  };

  sub(other: CircuitNumberExact): CircuitNumberExact {
    return this.add(other.neg());
  };

  mul(other: CircuitNumberExact): CircuitNumberExact {
    // (X + Dx) * (Y + Dy) = (X * Y) + (X * Dy) + (Y * Dx) + (Dx + Dy)
    const XValueSeal = this.value.seal();
    const yValueSeal = other.value.seal();
    const xDecimalSeal = this.decimal.seal();
    const yDecimalSeal = other.decimal.seal();

    const XY = new CircuitNumberExact(
      this.value.mul(other.value), 
      Field(0),
      Field(1)
    );

    let XDyValue = Circuit.witness(
      Field,
      () => new Field(XValueSeal.toBigInt() * yDecimalSeal.toBigInt() / BigInt(PRECISION_EXACT))
    );
    XDyValue.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(XDyValue);

    let XDyDecimal = Circuit.witness(
      Field,
      () => new Field(XValueSeal.toBigInt() * yDecimalSeal.toBigInt() - (XValueSeal.toBigInt() * yDecimalSeal.toBigInt() / BigInt(PRECISION_EXACT) * BigInt(PRECISION_EXACT)))
    );
    XDyDecimal.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(XDyDecimal);

    const XDy = new CircuitNumberExact(
      XDyValue,
      XDyDecimal,
      Field(1)
    );

    let YDxValue = Circuit.witness(
      Field,
      () => new Field(yValueSeal.toBigInt() * xDecimalSeal.toBigInt() / BigInt(PRECISION_EXACT))
    );
    YDxValue.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(YDxValue);

    let YDxDecimal = Circuit.witness(
      Field,
      () => new Field(yValueSeal.toBigInt() * xDecimalSeal.toBigInt() - (yValueSeal.toBigInt() * xDecimalSeal.toBigInt() / BigInt(PRECISION_EXACT) * BigInt(PRECISION_EXACT)))
    );
    YDxDecimal.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(YDxDecimal);

    const YDx = new CircuitNumberExact(
      YDxValue,
      YDxDecimal,
      Field(1)
    );

    let DxDyDecimal = Circuit.witness(
      Field,
      () => new Field(xDecimalSeal.toBigInt() * yDecimalSeal.toBigInt() / BigInt(PRECISION_EXACT))
    );
    DxDyDecimal.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(DxDyDecimal);
    
    const DxDy = new CircuitNumberExact(
      Field(0),
      DxDyDecimal,
      Field(1)
    );

    const answer = XY.add(XDy).add(YDx).add(DxDy);

    answer.sign = Circuit.if(
      this.sign.equals(other.sign),
      Field(1),
      Field(-1)
    );

    return answer;
  };

  div(other: CircuitNumberExact): CircuitNumberExact {
    // (X + Dx) / (Y + Dy) = X / (Y + Dy) [`Term1`] + Dx / (Y + Dy) [`Term2`]
    const xValueSeal = this.value.seal();
    const yValueSeal = other.value.seal();
    const xDecimalSeal = this.decimal.seal();
    const yDecimalSeal = other.decimal.seal();

    let answerValue = Circuit.witness(
      Field,
      () => new Field( CircuitNumberExact.widenScientificNotation((Number(xValueSeal.toBigInt() * BigInt(PRECISION_EXACT) + xDecimalSeal.toBigInt()) / Number(yValueSeal.toBigInt() * BigInt(PRECISION_EXACT) + yDecimalSeal.toBigInt())).toString()).split('.')[0] )
    );
    answerValue.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(answerValue);

    const answerValueSeal = answerValue.seal();
    let answerDecimal = Circuit.witness(
      Field,
      () => new Field( CircuitNumberExact.precisionRound((Number(xValueSeal.toBigInt() * BigInt(PRECISION_EXACT) + xDecimalSeal.toBigInt()) / Number(yValueSeal.toBigInt() * BigInt(PRECISION_EXACT) + yDecimalSeal.toBigInt()) - Number(answerValueSeal.toBigInt())) * PRECISION_EXACT).substring(0, PRECISION_EXACT_LOG) )
    );
    answerDecimal.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(answerDecimal);

    const doesRecur = (answerDecimal).gte(Field(PRECISION_EXACT));

    const answerValueFinal = answerValue.add(Circuit.if(
      doesRecur,
      Field(1),
      Field(0)
    ));
    const answerDecimalFinal = answerDecimal.sub(Circuit.if(
      doesRecur,
      Field(PRECISION_EXACT),
      Field(0)
    ))
    const answerSign = Circuit.if(
      this.sign.equals(other.sign),
      Field(1),
      Field(-1)
    );

    return new CircuitNumberExact(
      answerValueFinal,
      answerDecimalFinal,
      answerSign
    );
  };

  mod(other: CircuitNumberExact): CircuitNumberExact {
    return this.abs().sub(
      other.abs().mul(this.div(other).trunc().abs())
    );
  };
};

export class CircuitNumber extends Struct({
  value: Field,
  decimal: Field,
  sign: Field
}) {
  static NUM_BITS = NUM_BITS;

  private constructor (
    value: Field,
    decimal: Field,
    sign: Field
  ) {
    super({
      value,
      decimal,
      sign
    });

    this.value = value;
    this.decimal = decimal;
    this.sign = sign;
  };

  // Private Utility Functions

  private static precisionRound(number: number): string {
    let numberAsString = number.toString();

    if (numberAsString.includes('e'))
      numberAsString = CircuitNumber.widenScientificNotation(numberAsString);

    let numberValue = numberAsString.split('.')[0];

    if (numberAsString.split('.').length < 2)
      return numberValue;

    let lastDigit = parseInt(numberAsString.split('.')[1][0]) + 1;

    const numberValueAsArray = [...numberValue];
    
    for (let i = numberValue.length - 1; i >= 0 && lastDigit == 10; i--) {
      lastDigit = parseInt(numberValueAsArray[i]) + 1;
      numberValueAsArray[i] = (lastDigit % 10).toString();
    }

    numberValue = numberValueAsArray.join('');

    if (lastDigit == 10)
      numberValue = '1' + numberValue;

    return numberValue;
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

  // Static Definition Functions

  static copysign(number: CircuitNumber, sign: CircuitNumber): CircuitNumber {
    return new CircuitNumber(
      number.value,
      number.decimal,
      sign.sign
    );
  };

  static from(number: number, _precisionRound?: number): CircuitNumber {
    const _number = Math.abs(number);

    if (_number < 1 / PRECISION)
      return new CircuitNumber(
        Field(0),
        Field(0),
        Field(1)
      );

    const precisionRound = _precisionRound ? _precisionRound : PRECISION;

    const value = Math.trunc(_number);
    const decimal = _number - value < 1 / PRECISION ? '0' : CircuitNumber.precisionRound((_number - value) * PRECISION);

    const sign = number >= 0 ? 1 : -1;

    return new CircuitNumber(
      Field(value),
      Field(decimal),
      Field(sign)
    );
  };

  static fromField(value: Field, decimal: Field, sign: Field): CircuitNumber {
    Bool.or(
      sign.equals(Field(1)),
      sign.equals(Field(-1))
    ).assertEquals(Bool(true));

    return new CircuitNumber(
      value,
      decimal,
      sign
    );
  };

  static fromString(numberString: string): CircuitNumber {
    let value, decimal, sign;
    sign = numberString[0] == '-' ? -1 : 1;

    if (numberString.includes('e')) {
      if (numberString[numberString.indexOf('e') + 1] == '-') {
        const decimalRound = parseInt(numberString.substring(numberString.indexOf('e') + 2)) - 1;
        decimal = `${Array.from({ length: decimalRound }, _ => '0').join('')}${numberString.substring(0, numberString.indexOf('e')).replace('-', '').replace('.', '')}`.substring(0, PRECISION_LOG);
        value = '0';
      } else {
        const valueRound = parseInt(numberString.substring(numberString.indexOf('e') + 2));
        value = `${numberString.substring(0, numberString.indexOf('e')).replace('-', '').replace('.', '')}${Array.from({ length: valueRound }, _ => '0').join('')}`;
        decimal = '0';
      }
    } else {
      value = numberString.split('.')[0].replace('-', '');
      decimal = numberString.split('.').length > 1 ? numberString.split('.')[1].substring(0, PRECISION_LOG) : '0';

      while (decimal.length < PRECISION_LOG)
        decimal = decimal + '0';
    }

    return new CircuitNumber(
      Field(CircuitNumber.widenScientificNotation(value)),
      Field(CircuitNumber.widenScientificNotation(decimal)),
      Field(sign)
    );
  };

  // Type Conversion Functions

  hash(): Field {
    return Poseidon.hash([ this.toField() ]);
  };

  toField(): Field {
    return Circuit.if(
      this.sign.equals(Field(-1)),
      Field(-1),
      Field(1)
    ).mul(this.value.add(this.decimal.div(Field(PRECISION))));
  };

  toNumber(): Number {
    return (
      this.sign.equals(Field(-1)).toBoolean() ?
      Number(-1) :
      Number(1)
    ) * (Number(this.value.toBigInt()) + Number(this.decimal.toBigInt()) / Number(PRECISION))
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
      this.value,
      this.decimal,
      Field(1)
    );
  };
  
  ceil(): CircuitNumber {
    return new CircuitNumber(
      this.value.add(Circuit.if(
        Bool.or(
          this.sign.equals(Field(-1)),
          this.decimal.equals(Field(0))
        ),
        Field(0),
        Field(1)
      )),
      Field(0),
      this.sign
    );
  };

  floor(): CircuitNumber {
    return new CircuitNumber(
      this.value.add(Circuit.if(
        Bool.and(
          this.sign.equals(Field(-1)),
          this.decimal.equals(Field(0)).not()
        ),
        Field(1),
        Field(0)
      )),
      Field(0),
      this.sign
    );
  };

  inv(): CircuitNumber {
    return CircuitNumber.from(1).div(this);
  };

  neg(): CircuitNumber {
    return new CircuitNumber(
      this.value,
      this.decimal,
      this.sign.neg()
    );
  };

  round(): CircuitNumber {
    return new CircuitNumber(
      this.value.add(Circuit.if(
        this.decimal.gte(Field(0.5 * PRECISION)),
        Field(1),
        Field(0)
      )),
      Field(0),
      Field(1)
    );
  };

  trunc(): CircuitNumber {
    return new CircuitNumber(
      this.value,
      Field(0),
      this.sign
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
    return this.value.isConstant() && this.decimal.isConstant() && this.sign.isConstant()
  };

  isInteger(): Bool {
    return this.decimal.equals(Field(0));
  };

  isPositive(): Bool {
    return Bool.and(
      this.equals(CircuitNumber.from(0)).not(),
      this.sign.equals(Field(1))
    );
  };

  // Logic Comparison Functions

  equals(other: CircuitNumber): Bool {
    return this.toField().equals(other.toField());
  };

  inPrecisionRange(other: CircuitNumber): Bool {
    return this.sub(other).abs().lte(CircuitNumber.from(10 / PRECISION))
  };

  gt(other: CircuitNumber): Bool {
    const valueGt = this.value.gt(other.value);
    const decimalGt = this.decimal.gt(other.decimal);

    return Circuit.if(
      this.equals(other),
      Bool(false),
      Circuit.if(
        this.sign.equals(other.sign),
        Circuit.if(
          this.sign.equals(Field(1)),
          Circuit.if(
            this.value.equals(other.value).not(),
            valueGt,
            decimalGt
          ),
          Circuit.if(
            this.value.equals(other.value).not(),
            valueGt.not(),
            decimalGt.not()
          ),
        ),
        Circuit.if(
          this.sign.equals(Field(1)),
          Bool(true),
          Bool(false)
        )
      )
    );
  };

  gte(other: CircuitNumber): Bool {
    return Bool.or(
      this.gt(other),
      this.equals(other)
    );
  };

  lt(other: CircuitNumber): Bool {
    return this.gte(other).not();
  };

  lte(other: CircuitNumber): Bool {
    return this.gt(other).not();
  };

  // Arithmetic Operation Functions

  add(other: CircuitNumber): CircuitNumber {
    let valueAddition: Field, decimalAddition: Field, sign: Field; // For same sign
    let valueAddition2: Field, decimalAddition2: Field, sign2: Field; // For diff sign

    if (this.isConstant() && other.isConstant()) {
      const xValue = this.value.toBigInt();
      const yValue = other.value.toBigInt();
      const xDecimal = this.decimal.toBigInt();
      const yDecimal = other.decimal.toBigInt();

      valueAddition = Field(xValue.valueOf() + yValue.valueOf() + ((xDecimal.valueOf() + yDecimal.valueOf()) / BigInt(PRECISION)));
      decimalAddition = Field((xDecimal.valueOf() + yDecimal.valueOf()) % BigInt(PRECISION));
    } else {
      const xValueSeal = this.value.seal();
      const yValueSeal = other.value.seal();
      const xDecimalSeal = this.decimal.seal();
      const yDecimalSeal = other.decimal.seal();

      valueAddition = Circuit.witness(
        Field,
        () => new Field(xValueSeal.toBigInt() + yValueSeal.toBigInt() + ((xDecimalSeal.toBigInt() + yDecimalSeal.toBigInt()) / BigInt(PRECISION)))
      );
      valueAddition.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(valueAddition);

      decimalAddition = Circuit.witness(
        Field,
        () => new Field((xDecimalSeal.toBigInt() + yDecimalSeal.toBigInt()) % BigInt(PRECISION))
      );
      decimalAddition.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(decimalAddition);
    }

    sign = this.sign;

    if (this.isConstant() && other.isConstant()) {
      let xValue = this.value.toBigInt();
      let yValue = other.value.toBigInt();
      let xDecimal = this.decimal.toBigInt();
      let yDecimal = other.decimal.toBigInt();

      sign2 = this.sign;

      if (xValue < yValue || (xValue == yValue && xDecimal < yDecimal)) {
        xValue = other.value.toBigInt();
        xDecimal = other.decimal.toBigInt();
        yValue = this.value.toBigInt();
        yDecimal = this.decimal.toBigInt();
        sign2 = this.sign.neg();
      }

      valueAddition2 = Field(xValue - yValue);
      decimalAddition2 = Field(xDecimal - yDecimal);
      if (xDecimal < yDecimal) {
        decimalAddition2 = decimalAddition2.add(Field(PRECISION));
        valueAddition2 = valueAddition2.sub(Field(1));
      }
    } else {
      const isXBiggerOrEqual = Bool.or(
        this.value.gt(other.value),
        Bool.and(
          this.value.equals(other.value),
          this.decimal.lt(other.decimal)
        )
      );

      const xValueSeal = Circuit.if(isXBiggerOrEqual, this.value.seal(), other.value.seal());
      const yValueSeal = Circuit.if(isXBiggerOrEqual, other.value.seal(), this.value.seal());
      const xDecimalSeal = Circuit.if(isXBiggerOrEqual, this.decimal.seal(), other.decimal.seal());
      const yDecimalSeal = Circuit.if(isXBiggerOrEqual, other.decimal.seal(), this.decimal.seal());

      sign2 = Circuit.if(isXBiggerOrEqual, this.sign, other.sign);

      valueAddition2 = Circuit.witness(
        Field,
        () => new Field(xValueSeal.toBigInt() - yValueSeal.toBigInt())
      );
      valueAddition2.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(valueAddition2);

      decimalAddition2 = Circuit.witness(
        Field,
        () => new Field(xDecimalSeal.toBigInt() - yDecimalSeal.toBigInt())
      );
      decimalAddition2.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(decimalAddition2);

      valueAddition2 = valueAddition2.sub(Circuit.if(
        xDecimalSeal.lt(yDecimalSeal),
        Field(1),
        Field(0)
      ));
      decimalAddition2 = decimalAddition2.add(Circuit.if(
        xDecimalSeal.lt(yDecimalSeal),
        Field(PRECISION),
        Field(0)
      ));
    }

    const answer = new CircuitNumber(
      Circuit.if(this.sign.equals(other.sign), valueAddition, valueAddition2),
      Circuit.if(this.sign.equals(other.sign), decimalAddition, decimalAddition2),
      Circuit.if(this.sign.equals(other.sign), sign, sign2)
    );

    this.toField().add(other.toField())
      .assertEquals(answer.toField());

    return answer;
  };

  sub(other: CircuitNumber): CircuitNumber {
    return this.add(other.neg());
  };

  mul(other: CircuitNumber): CircuitNumber {
    // (X + Dx) * (Y + Dy) = (X * Y) + (X * Dy) + (Y * Dx) + (Dx + Dy)
    const XValueSeal = this.value.seal();
    const yValueSeal = other.value.seal();
    const xDecimalSeal = this.decimal.seal();
    const yDecimalSeal = other.decimal.seal();

    const XY = new CircuitNumber(
      this.value.mul(other.value), 
      Field(0),
      Field(1)
    );

    let XDyValue = Circuit.witness(
      Field,
      () => new Field(XValueSeal.toBigInt() * yDecimalSeal.toBigInt() / BigInt(PRECISION))
    );
    XDyValue.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(XDyValue);

    let XDyDecimal = Circuit.witness(
      Field,
      () => new Field(XValueSeal.toBigInt() * yDecimalSeal.toBigInt() - (XValueSeal.toBigInt() * yDecimalSeal.toBigInt() / BigInt(PRECISION) * BigInt(PRECISION)))
    );
    XDyDecimal.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(XDyDecimal);

    const XDy = new CircuitNumber(
      XDyValue,
      XDyDecimal,
      Field(1)
    );

    let YDxValue = Circuit.witness(
      Field,
      () => new Field(yValueSeal.toBigInt() * xDecimalSeal.toBigInt() / BigInt(PRECISION))
    );
    YDxValue.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(YDxValue);

    let YDxDecimal = Circuit.witness(
      Field,
      () => new Field(yValueSeal.toBigInt() * xDecimalSeal.toBigInt() - (yValueSeal.toBigInt() * xDecimalSeal.toBigInt() / BigInt(PRECISION) * BigInt(PRECISION)))
    );
    YDxDecimal.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(YDxDecimal);

    const YDx = new CircuitNumber(
      YDxValue,
      YDxDecimal,
      Field(1)
    );

    let DxDyDecimal = Circuit.witness(
      Field,
      () => new Field(xDecimalSeal.toBigInt() * yDecimalSeal.toBigInt() / BigInt(PRECISION))
    );
    DxDyDecimal.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(DxDyDecimal);
    
    const DxDy = new CircuitNumber(
      Field(0),
      DxDyDecimal,
      Field(1)
    );

    const answer = XY.add(XDy).add(YDx).add(DxDy);

    answer.sign = Circuit.if(
      this.sign.equals(other.sign),
      Field(1),
      Field(-1)
    );

    return answer;
  };

  div(other: CircuitNumber): CircuitNumber {
    // (X + Dx) / (Y + Dy) = X / (Y + Dy) [`Term1`] + Dx / (Y + Dy) [`Term2`]
    const xValueSeal = this.value.seal();
    const yValueSeal = other.value.seal();
    const xDecimalSeal = this.decimal.seal();
    const yDecimalSeal = other.decimal.seal();

    let answerValue = Circuit.witness(
      Field,
      () => new Field( CircuitNumber.widenScientificNotation((Number(xValueSeal.toBigInt() * BigInt(PRECISION) + xDecimalSeal.toBigInt()) / Number(yValueSeal.toBigInt() * BigInt(PRECISION) + yDecimalSeal.toBigInt())).toString()).split('.')[0] )
    );
    answerValue.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(answerValue);

    const answerValueSeal = answerValue.seal();
    let answerDecimal = Circuit.witness(
      Field,
      () => new Field( CircuitNumber.precisionRound((Number(xValueSeal.toBigInt() * BigInt(PRECISION) + xDecimalSeal.toBigInt()) / Number(yValueSeal.toBigInt() * BigInt(PRECISION) + yDecimalSeal.toBigInt()) - Number(answerValueSeal.toBigInt())) * PRECISION).substring(0, PRECISION_LOG) )
    );
    answerDecimal.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(answerDecimal);

    const doesRecur = (answerDecimal).gte(Field(PRECISION));

    const answerValueFinal = answerValue.add(Circuit.if(
      doesRecur,
      Field(1),
      Field(0)
    ));
    const answerDecimalFinal = answerDecimal.sub(Circuit.if(
      doesRecur,
      Field(PRECISION),
      Field(0)
    ))
    const answerSign = Circuit.if(
      this.sign.equals(other.sign),
      Field(1),
      Field(-1)
    );

    return new CircuitNumber(
      answerValueFinal,
      answerDecimalFinal,
      answerSign
    );
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

    let answer = CircuitNumberExact.fromString('1');

    for (let i = 1; i < OPERATION_COUNT; i++)
      answer = answer.mul(Circuit.if(
        power.gte(CircuitNumberExact.fromString(i.toString())),
        base,
        CircuitNumberExact.fromString('1')
      ));

    return answer;
  };

  private static logTwo(number: Field): CircuitNumberExact {
    let answer;

    if (number.isConstant()) {
      answer = new Field(number.toBits().map(each => each.toBoolean()).lastIndexOf(true));
    } else {
      answer = Circuit.witness(
        Field,
        () => new Field(number.toBits().map(each => each.toBoolean()).lastIndexOf(true))
      );
      answer.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(answer);
    }

    return new CircuitNumberExact(
      answer,
      Field(0),
      Field(1)
    );
  };

  private static _ln(number: CircuitNumberExact): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 10;

    number.gt(CircuitNumberExact.fromString('0')).assertEquals(Bool(true));
    number.lte(CircuitNumberExact.fromString('2')).assertEquals(Bool(true));

    const x = number.sub(CircuitNumberExact.fromString('1'));
    let xPow = x;
    let signPow = CircuitNumberExact.fromString('1');
    let answer = CircuitNumberExact.fromString('0');

    for (let i = 1; i <= TAYLOR_SERIE_TERM_PRECISION; i++) {
      answer = answer.add(signPow.mul(xPow.div(CircuitNumberExact.fromString(i.toString()))));
      xPow = xPow.mul(x);
      signPow = signPow.neg();
    }

    return answer;
  };

  // Number Functions

  static gcd(a: CircuitNumber, b: CircuitNumber): CircuitNumber {
    return a;
  };

  static lcm(a: CircuitNumber, b: CircuitNumber): CircuitNumber {
    return a.mul(b).div(CircuitMath.gcd(a, b));
  };

  // Logarithmic Functions

  private static lnExact(number: CircuitNumberExact): CircuitNumberExact {
    number.gt(CircuitNumberExact.fromString('0')).assertEquals(Bool(true));

    const power = CircuitMath.logTwo(number.trunc().toField()).add(CircuitNumberExact.fromString('1'));
    const reminder = CircuitMath._ln(number.div(CircuitMath.intPow(CircuitNumberExact.fromString('2'), power)));

    return CircuitNumberExact.fromString(LN_2.toString()).mul(power).add(reminder);
  };

  static ln(_number: CircuitNumber): CircuitNumber {
    const number = CircuitNumberExact.fromCircuitNumber(_number);

    number.gt(CircuitNumberExact.fromString('0')).assertEquals(Bool(true));

    const power = CircuitMath.logTwo(number.trunc().toField()).add(CircuitNumberExact.fromString('1'));
    const reminder = CircuitMath._ln(number.div(CircuitMath.intPow(CircuitNumberExact.fromString('2'), power)));

    return CircuitNumberExact.fromString(LN_2.toString()).mul(power).add(reminder).toCircuitNumber();
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
    const TAYLOR_SERIE_TERM_PRECISION = 13;

    let answer = CircuitNumberExact.fromString('1');
    let xPow = number;
    let factorial = CircuitNumberExact.fromString('1');

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i ++) {
      answer = answer.add(xPow.div(factorial));
      xPow = xPow.mul(number);
      factorial = factorial.mul(CircuitNumberExact.fromString((i + 1).toString()));
    }

    return answer;
  };

  static exp(_number: CircuitNumber): CircuitNumber {
    const number = CircuitNumberExact.fromCircuitNumber(_number);
    const TAYLOR_SERIE_TERM_PRECISION = 13;

    let answer = CircuitNumberExact.fromString('1');
    let xPow = number;
    let factorial = CircuitNumberExact.fromString('1');

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i ++) {
      answer = answer.add(xPow.div(factorial));
      xPow = xPow.mul(number);
      factorial = factorial.mul(CircuitNumberExact.fromString((i + 1).toString()));
    }

    return answer.toCircuitNumber();
  };

  private static powExact(base: CircuitNumberExact, power: CircuitNumberExact): CircuitNumberExact {
    const intPow = power.abs().trunc();
    const _answer = CircuitMath.intPow(base, intPow).mul(CircuitMath.expExact(power.abs().sub(intPow).mul(CircuitMath.lnExact(base))));
    
    return Circuit.if(power.sign.equals(Field(-1)), _answer.inv(), _answer);
  };

  static pow(_base: CircuitNumber, power: CircuitNumber): CircuitNumber {
    const base = CircuitNumberExact.fromCircuitNumber(_base);
    const intPow = power.abs().trunc();
    const _answer = CircuitMath.intPow(base, CircuitNumberExact.fromCircuitNumber(intPow)).toCircuitNumber().mul(CircuitMath.exp(power.abs().sub(intPow).mul(CircuitMath.ln(base.toCircuitNumber()))));
    
    return Circuit.if(power.sign.equals(Field(-1)), _answer.inv(), _answer);
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
    return Circuit.if(
      number1.gte(number1),
      number1,
      number2
    );
  };

  static min(number1: CircuitNumber, number2: CircuitNumber): CircuitNumber {
    return Circuit.if(
      number1.lte(number1),
      number1,
      number2
    );
  };

  // Trigonometric & Hyperbolic Functions

  private static sinExact(_angle: CircuitNumber): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 19;

    const angle = CircuitNumberExact.fromCircuitNumber(_angle).normalizeRadians();

    const {
      reducedAngle,
      sign
    } = Circuit.if(
      angle.lt(CircuitNumberExact.fromString((PI / 2).toString())),
      {
        reducedAngle: angle,
        sign: Field(1)
      },
      Circuit.if(
        angle.lt(CircuitNumberExact.fromString((PI).toString())),
        {
          reducedAngle: CircuitNumberExact.fromString((PI).toString()).sub(angle),
          sign: Field(1)
        },
        Circuit.if(
          angle.lt(CircuitNumberExact.fromString((3 * PI / 2).toString())),
          {
            reducedAngle: angle.sub(CircuitNumberExact.fromString((PI).toString())).neg(),
            sign: Field(-1)
          },
          {
            reducedAngle: CircuitNumberExact.fromString((2 * PI).toString()).sub(angle),
            sign: Field(-1)
          }
        )
      )
    );

    let answer = CircuitNumberExact.fromString('0');
    let xPow = reducedAngle;
    let signPow = CircuitNumberExact.fromString('1');
    let factorial = CircuitNumberExact.fromString('1');

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(signPow.mul(xPow.div(factorial)));
      signPow = signPow.neg();
      xPow = xPow.mul(reducedAngle).mul(reducedAngle);
      factorial = factorial.mul(CircuitNumberExact.fromString((i + 1).toString()));
      factorial = factorial.mul(CircuitNumberExact.fromString((i + 2).toString()));
    }

    answer.sign = sign;

    return answer;
  };

  private static cosExact(_angle: CircuitNumber): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 21;

    const angle = CircuitNumberExact.fromCircuitNumber(_angle).normalizeRadians();

    const {
      reducedAngle,
      sign
    } = Circuit.if(
      angle.lt(CircuitNumberExact.fromString((PI / 2).toString())),
      {
        reducedAngle: angle,
        sign: Field(1)
      },
      Circuit.if(
        angle.lt(CircuitNumberExact.fromString(PI.toString())),
        {
          reducedAngle: CircuitNumberExact.fromString(PI.toString()).sub(angle),
          sign: Field(-1)
        },
        Circuit.if(
          angle.lt(CircuitNumberExact.fromString((3 * PI / 2).toString())),
          {
            reducedAngle: angle.sub(CircuitNumberExact.fromString((PI).toString())).neg(),
            sign: Field(-1)
          },
          {
            reducedAngle: CircuitNumberExact.fromString((2 * PI).toString()).sub(angle),
            sign: Field(1)
          }
        )
      )
    );

    let answer = CircuitNumberExact.fromString('1');
    let xPow = reducedAngle.mul(reducedAngle);
    let signPow = CircuitNumberExact.fromString('-1');
    let factorial = CircuitNumberExact.fromString('2');

    for (let i = 2; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(signPow.mul(xPow.div(factorial)));
      signPow = signPow.neg();
      xPow = xPow.mul(reducedAngle).mul(reducedAngle);
      factorial = factorial.mul(CircuitNumberExact.fromString((i + 1).toString()));
      factorial = factorial.mul(CircuitNumberExact.fromString((i + 2).toString()));
    }

    answer.sign = sign;

    return answer;
  };

  static sin(_angle: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 19;

    const angle = CircuitNumberExact.fromCircuitNumber(_angle).normalizeRadians();

    const {
      reducedAngle,
      sign
    } = Circuit.if(
      angle.lt(CircuitNumberExact.fromString((PI / 2).toString())),
      {
        reducedAngle: angle,
        sign: Field(1)
      },
      Circuit.if(
        angle.lt(CircuitNumberExact.fromString((PI).toString())),
        {
          reducedAngle: CircuitNumberExact.fromString((PI).toString()).sub(angle),
          sign: Field(1)
        },
        Circuit.if(
          angle.lt(CircuitNumberExact.fromString((3 * PI / 2).toString())),
          {
            reducedAngle: angle.sub(CircuitNumberExact.fromString((PI).toString())).neg(),
            sign: Field(-1)
          },
          {
            reducedAngle: CircuitNumberExact.fromString((2 * PI).toString()).sub(angle),
            sign: Field(-1)
          }
        )
      )
    );

    let answer = CircuitNumberExact.fromString('0');
    let xPow = reducedAngle;
    let signPow = CircuitNumberExact.fromString('1');
    let factorial = CircuitNumberExact.fromString('1');

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(signPow.mul(xPow.div(factorial)));
      signPow = signPow.neg();
      xPow = xPow.mul(reducedAngle).mul(reducedAngle);
      factorial = factorial.mul(CircuitNumberExact.fromString((i + 1).toString()));
      factorial = factorial.mul(CircuitNumberExact.fromString((i + 2).toString()));
    }

    answer.sign = sign;

    return answer.toCircuitNumber();
  };

  static cos(_angle: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 25;

    const angle = CircuitNumberExact.fromCircuitNumber(_angle).normalizeRadians();

    const {
      reducedAngle,
      sign
    } = Circuit.if(
      angle.lt(CircuitNumberExact.fromString((PI / 2).toString())),
      {
        reducedAngle: angle,
        sign: Field(1)
      },
      Circuit.if(
        angle.lt(CircuitNumberExact.fromString(PI.toString())),
        {
          reducedAngle: CircuitNumberExact.fromString(PI.toString()).sub(angle),
          sign: Field(-1)
        },
        Circuit.if(
          angle.lt(CircuitNumberExact.fromString((3 * PI / 2).toString())),
          {
            reducedAngle: angle.sub(CircuitNumberExact.fromString((PI).toString())).neg(),
            sign: Field(-1)
          },
          {
            reducedAngle: CircuitNumberExact.fromString((2 * PI).toString()).sub(angle),
            sign: Field(1)
          }
        )
      )
    );

    let answer = CircuitNumberExact.fromString('1');
    let xPow = reducedAngle.mul(reducedAngle);
    let signPow = CircuitNumberExact.fromString('-1');
    let factorial = CircuitNumberExact.fromString('2');

    for (let i = 2; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(signPow.mul(xPow.div(factorial)));
      signPow = signPow.neg();
      xPow = xPow.mul(reducedAngle).mul(reducedAngle);
      factorial = factorial.mul(CircuitNumberExact.fromString((i + 1).toString()));
      factorial = factorial.mul(CircuitNumberExact.fromString((i + 2).toString()));
    }

    answer.sign = sign;

    return answer.toCircuitNumber();
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

  static sinh(number: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 19;

    let answer = CircuitNumber.from(0);
    let xPow = number;
    let factorial = CircuitNumber.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(xPow.div(factorial));
      xPow = xPow.mul(number).mul(number);
      factorial = factorial.mul(CircuitNumber.from(i + 1));
      factorial = factorial.mul(CircuitNumber.from(i + 2));
    }

    return answer;
  };

  static cosh(number: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 19;

    let answer = CircuitNumber.from(1);
    let xPow = number.mul(number);
    let factorial = CircuitNumber.from(2);

    for (let i = 2; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(xPow.div(factorial));
      xPow = xPow.mul(number).mul(number);
      factorial = factorial.mul(CircuitNumber.from(i + 1));
      factorial = factorial.mul(CircuitNumber.from(i + 2));
    }

    return answer;
  };

  static tanh(number: CircuitNumber): CircuitNumber {
    return CircuitMath.sinh(number).div(CircuitMath.cosh(number));
  };

  // Inverse Trigonometric & Hyperbolic Functions

  static arcsin(number: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 9;

    let answer = CircuitNumber.from(0);
    let xPow = number;
    let signPow = CircuitNumber.from(1);
    let factorial = CircuitNumber.from(1);
    let doubledFactorial = CircuitNumber.from(1);
    let fourPow = CircuitNumber.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i ++) {
      answer = answer.add(xPow.mul(doubledFactorial).div(factorial).div(fourPow).div(CircuitNumber.from(2 * i + 1)));
      signPow = signPow.neg();
      xPow = xPow.mul(number).mul(number);
      factorial = factorial.mul(CircuitNumber.from(i + 1));
      factorial = factorial.mul(CircuitNumber.from(i + 2));
      // doubledFactorial = doubledFactorial.mul()
    }

    return answer;
  };

  static arccos(number: CircuitNumber): CircuitNumber {
    return CircuitNumber.from(PI).mul(CircuitNumber.from(2)).sub(CircuitMath.arcsin(number));
  };

  static arctan(number: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 70;

    let answer = CircuitNumber.from(0);
    let xPow = number;
    let signPow = CircuitNumber.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(signPow.mul(xPow.div(CircuitNumber.from(i))));
      signPow = signPow.neg();
      xPow = xPow.mul(number).mul(number);
    }

    return answer;
  };

  static arcsinh(number: CircuitNumber): CircuitNumber {
    return CircuitNumber.from(1);
  };

  static arccosh(number: CircuitNumber): CircuitNumber {
    return CircuitNumber.from(1);
  };

  static arctanh(number: CircuitNumber): CircuitNumber {
    return CircuitNumber.from(1);
  };

  // Geometric Functions

  static dist(x: CircuitNumber, y: CircuitNumber): CircuitNumber {
    return x.mul(x).add(y.mul(y));
  };

  static hypot(x: CircuitNumber, y: CircuitNumber): CircuitNumber {
    return CircuitMath.sqrt((x.mul(x).add(y.mul(y))));
  };
};
