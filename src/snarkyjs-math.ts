import {
  Bool,
  Circuit,
  Field,
  Poseidon,
  Struct,
  isReady
} from 'snarkyjs';

await isReady;

// IMPORTANT NOTES:
// Library supports real numbers in the range: [-1e18, 1e18]
// Integer part of the number must fit in 64 bits
// Decimal part of the number can be chosen as wanted, it will be rounded to PRECISION digits
// The current precision is, PRECISION = 8 digits
// Do not forget to change the NUM_BITS and PRECISION_EXACT accordingly if you update PRECISION to ensure CircuitMath works as expected

const
  E = 2.7182818284590452,
  LN_10 = 2.3025850929940457,
  LN_2 = 0.6931471805599453,
  NEGATIVE_INFINITY = -1e18,
  NUM_BITS = 128, // 1e26
  NUM_BITS_EXACT = 256, // 1e36
  PI = 3.1415926535897932,
  POSITIVE_INFINITY = 1e18,
  PRECISION = 1e8,
  PRECISION_LOG = 8,
  PRECISION_EXACT = 1e18,
  PRECISION_EXACT_LOG = 18
;

// CircuitNumber class with PRECISION_EXACT rounding to help with taylor series
class CircuitNumberExact extends Struct({
  _value: Field,
  _sign: Field
}) {
  static NUM_BITS = NUM_BITS_EXACT;

  private constructor (
    _value: Field,
    _sign: Field
  ) {
    if (_value.isConstant()) {
      _value.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(_value, 'CircuitNumberExact: Your number must fit in 64 bits.');
    }

    Bool.or(
      _sign.equals(Field(1)),
      _sign.equals(Field(-1))
    ).assertEquals(Bool(true), 'CircuitNumberExact: Unknown sign is given to the number, must be either 1 or -1.');

    super({
      _value,
      _sign
    });

    this._value = _value;
    this._sign = _sign;
  };

  // Private Utility Functions

  private static fieldMod(_number1: Field, _number2: Field): Field {
    if (_number1.isConstant() && _number2.isConstant()) {
      const number1AsInteger = _number1.toBigInt();
      const number2AsInteger = _number2.toBigInt();
      const integerDivision = number1AsInteger / number2AsInteger;
      const answer = number1AsInteger - number2AsInteger * integerDivision;
      return new Field(
        CircuitNumberExact.widenScientificNotation(
          answer.toString()
        )
      );
    } else {
      const number1 = _number1.seal();
      const number2 = _number2.seal();
      const integerDivision = Circuit.witness(
        Field,
        () => new Field(
          CircuitNumberExact.widenScientificNotation(
            (number1.toBigInt() / number2.toBigInt()).toString()
          )
        )
      );
      integerDivision.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(integerDivision);

      const answer = number1.sub(number2.mul(integerDivision)).seal();

      answer.rangeCheckHelper(CircuitNumberExact.NUM_BITS).assertEquals(answer);
      answer.assertLt(_number2);

      return answer;
    }
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

  static copysign(number: CircuitNumberExact, _sign: CircuitNumberExact): CircuitNumberExact {
    return new CircuitNumberExact(
      number._value,
      _sign._sign
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
    const decimal = (number - value) < 1 / PRECISION ? '0' : CircuitNumberExact.precisionRound((number - value) * PRECISION_EXACT);
    const sign = number >= 0 ? 1 : -1;

    return new CircuitNumberExact(
      Field(value)
      .mul(
        Field(PRECISION_EXACT)
      ).add(
        Field(
          CircuitNumberExact.widenScientificNotation(decimal)
        )
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
        CircuitNumberExact.widenScientificNotation(value)
      ).mul(
        Field(PRECISION_EXACT)
      ).add(
        Field(
          CircuitNumberExact.widenScientificNotation(decimal)
        )
      ),
      Field(sign)
    );
  };

  static fromCircuitNumber(number: CircuitNumber): CircuitNumberExact {
    return new CircuitNumberExact(
      number._value.mul(Field(PRECISION_EXACT / PRECISION)),
      number._sign
    );
  };

  // Type Conversion Functions

  toCircuitNumber(): CircuitNumber {
    const integer = this._value.sub(CircuitNumberExact.fieldMod(this._value, Field(PRECISION_EXACT)));
    const decimal = this._value.sub(integer);

    const PRECISION_DIFFERENCE = PRECISION_EXACT / PRECISION;

    return CircuitNumber.fromField(
      integer.div(Field(PRECISION_EXACT)),
      decimal.sub(CircuitNumberExact.fieldMod(decimal, Field(PRECISION_DIFFERENCE))).div(Field(PRECISION_DIFFERENCE)),
      this._sign
    );
  };

  toField(): Field {
    return this._sign.mul(this._value).div(Field(PRECISION_EXACT));
  };

  toNumber(): number {
    return (
      this._sign.equals(Field(1)).toBoolean() ?
      Number(1) :
      Number(-1)
    ) * (Number(this._value.toBigInt()) / Number(PRECISION_EXACT));
  };

  normalizeRadians(): CircuitNumberExact {
    const turn = CircuitNumberExact.fromString((2 * PI).toString());
    return CircuitNumberExact.copysign(this.abs().mod(turn), this).add(turn).mod(turn);
  };

  // Type Check Functions

  isConstant(): boolean {
    return this._value.isConstant() && this._sign.isConstant()
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
      this._sign.neg()
    );
  };

  trunc(): CircuitNumberExact {
    return new CircuitNumberExact(
      this._value.sub(CircuitNumberExact.fieldMod(this._value, Field(PRECISION_EXACT))),
      this._sign
    );
  };

  // Logic Comparison Functions

  equals(other: CircuitNumberExact): Bool {
    return this.toField().equals(other.toField());
  };

  inPrecisionRange(other: CircuitNumberExact): Bool {
    return Bool.or(
      this._value.sub(other._value).lt(Field(10)),
      other._value.sub(this._value).lt(Field(10))
    );
  };

  gt(other: CircuitNumberExact): Bool {
    const gt = this._value.gt(other._value);

    return Circuit.if(
      this._sign.equals(other._sign),
      Circuit.if(
        this._sign.equals(Field(1)),
        gt,
        gt.not()
      ),
      Circuit.if(
        this._sign.equals(Field(1)),
        Bool(true),
        Bool(false)
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
    const lt = this._value.lt(other._value);

    return Circuit.if(
      this._sign.equals(other._sign),
      Circuit.if(
        this._sign.equals(Field(1)),
        lt,
        lt.not()
      ),
      Circuit.if(
        this._sign.equals(Field(1)),
        Bool(false),
        Bool(true)
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
    const number1 = this._value.seal();
    const number2 = other._value.seal();

    const answer = Circuit.if(
      this._sign.equals(other._sign),
      (() => {
        const answerValue = number1.add(number2);
        return new CircuitNumberExact(
          answerValue,
          this._sign
        );
      })(),
      (() => {
        const isEqual = number1.equals(number2);
        const isGt = number1.gt(number2);

        const answerValue = Circuit.if(
          isGt,
          number1.sub(number2),
          number2.sub(number1)
        );
        const answerSign = Circuit.if(
          isEqual,
          Field(1),
          Circuit.if(
            isGt,
            this._sign,
            other._sign
          )
        );
        return new CircuitNumberExact(
          answerValue,
          answerSign
        );
      })(),
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

    const answerValue = Circuit.witness(
      Field,
      () => new Field(thisValueSeal.toBigInt() * otherValueSeal.toBigInt() / BigInt(PRECISION_EXACT))
    );

    answerValue.assertEquals(valueMultiplication.sub(CircuitNumberExact.fieldMod(valueMultiplication, Field(PRECISION_EXACT))).div(Field(PRECISION_EXACT)));

    const answer = new CircuitNumberExact(
      answerValue,
      Circuit.if(
        this._sign.equals(other._sign),
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

    let answerValue = Circuit.witness(
      Field,
      () => new Field( CircuitNumberExact.widenScientificNotation((Number(thisValueSeal.toBigInt()) / Number(otherValueSeal.toBigInt())).toString()).split('.')[0] )
    );

    const answerValueSeal = answerValue.seal();
    let answerDecimal = Circuit.witness(
      Field,
      () => new Field( CircuitNumberExact.precisionRound((Number(thisValueSeal.toBigInt()) / Number(otherValueSeal.toBigInt()) - Number(answerValueSeal.toBigInt())) * PRECISION_EXACT).substring(0, PRECISION_EXACT_LOG) )
    );

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
      this._sign.equals(other._sign),
      Field(1),
      Field(-1)
    );

    const answer = new CircuitNumberExact(
      answerValueFinal.mul(Field(PRECISION_EXACT)).add(answerDecimalFinal),
      answerSign
    );

    answer.mul(other).inPrecisionRange(this).assertEquals(Bool(true));

    return answer;
  };

  mod(other: CircuitNumberExact): CircuitNumberExact {
    return this.abs().sub(
      other.abs().mul(this.div(other).trunc().abs())
    );
  };
};

export class CircuitNumber extends Struct({
  _value: Field,
  _sign: Field
}) {
  static NUM_BITS = NUM_BITS;

  private constructor (
    _value: Field,
    _sign: Field
  ) {
    if (_value.isConstant()) {
      _value.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(_value, 'CircuitNumber: Your number must fit in 64 bits.');
    }

    Bool.or(
      _sign.equals(Field(1)),
      _sign.equals(Field(-1))
    ).assertEquals(Bool(true), 'CircuitNumber: Unknown sign is given to the number, must be either 1 or -1.');

    super({
      _value,
      _sign
    });

    this._value = _value;
    this._sign = _sign;
  };

  // Private Utility Functions

  private static fieldMod(_number1: Field, _number2: Field): Field {
    if (_number1.isConstant() && _number2.isConstant()) {
      const number1AsInteger = _number1.toBigInt();
      const number2AsInteger = _number2.toBigInt();
      const integerDivision = number1AsInteger / number2AsInteger;
      const answer = number1AsInteger - number2AsInteger * integerDivision;
      return new Field(
        CircuitNumber.widenScientificNotation(
          answer.toString()
        )
      );
    } else {
      const number1 = _number1.seal();
      const number2 = _number2.seal();
      const integerDivision = Circuit.witness(
        Field,
        () => new Field(
          CircuitNumber.widenScientificNotation(
            (number1.toBigInt() / number2.toBigInt()).toString()
          )
        )
      );
      integerDivision.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(integerDivision);

      const answer = number1.sub(number2.mul(integerDivision)).seal();

      answer.rangeCheckHelper(CircuitNumber.NUM_BITS).assertEquals(answer);
      answer.assertLt(_number2);

      return answer;
    }
  };

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

  static copysign(number: CircuitNumber, _sign: CircuitNumber): CircuitNumber {
    return new CircuitNumber(
      number._value,
      _sign._sign
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
    const decimal = (number - value) < 1 / PRECISION ? '0' : CircuitNumber.precisionRound((number - value) * PRECISION);
    const sign = number >= 0 ? 1 : -1;

    return new CircuitNumber(
      Field(value)
      .mul(
        Field(PRECISION)
      ).add(
        Field(
          CircuitNumber.widenScientificNotation(decimal)
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
    return this._sign.mul(this._value).div(Field(PRECISION));
  };

  toNumber(): Number {
    return (
      this._sign.equals(Field(1)).toBoolean() ?
      Number(1) :
      Number(-1)
    ) * (Number(this._value.toBigInt()) / Number(PRECISION));
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
    const integer = this._value.sub(CircuitNumber.fieldMod(this._value, Field(PRECISION)));
    const decimal = this._value.sub(integer);

    return new CircuitNumber(
      integer.add(Circuit.if(
        Bool.or(
          this._sign.equals(Field(1)).not(),
          decimal.equals(Field(0))
        ),
        Field(0),
        Field(PRECISION)
      )),
      this._sign
    );
  };

  floor(): CircuitNumber {
    const integer = this._value.sub(CircuitNumber.fieldMod(this._value, Field(PRECISION)));
    const decimal = this._value.sub(integer);

    return new CircuitNumber(
      integer.add(Circuit.if(
        Bool.and(
          this._sign.equals(Field(-1)),
          decimal.equals(Field(0)).not()
        ),
        Field(PRECISION),
        Field(0)
      )),
      this._sign
    );
  };

  inv(): CircuitNumber {
    return CircuitNumber.from(1).div(this);
  };

  neg(): CircuitNumber {
    return new CircuitNumber(
      this._value,
      this._sign.neg()
    );
  };

  round(): CircuitNumber {
    const integer = this._value.sub(CircuitNumber.fieldMod(this._value, Field(PRECISION)));
    const decimal = this._value.sub(integer);

    return new CircuitNumber(
      this._value.add(Circuit.if(
        decimal.gte(Field(0.5 * PRECISION)),
        Field(PRECISION),
        Field(0)
      )),
      Field(1)
    );
  };

  trunc(): CircuitNumber {
    const integer = this._value.sub(CircuitNumber.fieldMod(this._value, Field(PRECISION)));

    return new CircuitNumber(
      integer,
      this._sign
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
    return this._value.isConstant() && this._sign.isConstant()
  };

  isInteger(): Bool {
    const integer = this._value.sub(CircuitNumber.fieldMod(this._value, Field(PRECISION)));
    const decimal = this._value.sub(integer);

    return decimal.equals(Field(0));
  };

  isPositive(): Bool {
    return Bool.and(
      this.equals(CircuitNumber.from(0)).not(),
      this._sign.equals(Field(1))
    );
  };

  // Logic Comparison Functions

  equals(other: CircuitNumber): Bool {
    return this.toField().equals(other.toField());
  };

  inPrecisionRange(other: CircuitNumber): Bool {
    return this.sub(other).abs().lte(CircuitNumber.from(1 / PRECISION))
  };

  gt(other: CircuitNumber): Bool {
    const gt = this._value.gt(other._value);

    return Circuit.if(
      this._sign.equals(other._sign),
      Circuit.if(
        this._sign.equals(Field(1)),
        gt,
        gt.not()
      ),
      Circuit.if(
        this._sign.equals(Field(1)),
        Bool(true),
        Bool(false)
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
    const lt = this._value.lt(other._value);

    return Circuit.if(
      this._sign.equals(other._sign),
      Circuit.if(
        this._sign.equals(Field(1)),
        lt,
        lt.not()
      ),
      Circuit.if(
        this._sign.equals(Field(1)),
        Bool(false),
        Bool(true)
      )
    );
  };

  lte(other: CircuitNumber): Bool {
    return Bool.or(
      this.lt(other),
      this.equals(other)
    );
  };

  // Arithmetic Operation Functions

  add(other: CircuitNumber): CircuitNumber {
    const number1 = this._value.seal();
    const number2 = other._value.seal();

    const answer = Circuit.if(
      this._sign.equals(other._sign),
      (() => {
        const answerValue = number1.add(number2);
        return new CircuitNumber(
          answerValue,
          this._sign
        );
      })(),
      (() => {
        const isEqual = number1.equals(number2);
        const isGt = number1.gt(number2);

        const answerValue = Circuit.if(
          isGt,
          number1.sub(number2),
          number2.sub(number1)
        );
        const answerSign = Circuit.if(
          isEqual,
          Field(1),
          Circuit.if(
            isGt,
            this._sign,
            other._sign
          )
        );
        return new CircuitNumber(
          answerValue,
          answerSign
        );
      })(),
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

    const answerValue = Circuit.witness(
      Field,
      () => new Field(thisValueSeal.toBigInt() * otherValueSeal.toBigInt() / BigInt(PRECISION))
    );
    answerValue.assertEquals(valueMultiplication.sub(CircuitNumber.fieldMod(valueMultiplication, Field(PRECISION))).div(Field(PRECISION)));

    const answer = new CircuitNumber(
      answerValue,
      Circuit.if(
        this._sign.equals(other._sign),
        Field(1),
        Field(-1)
      )
    );

    return answer;
  };

  div(other: CircuitNumber): CircuitNumber {
    // (X + Dx) / (Y + Dy) = X / (Y + Dy) [`Term1`] + Dx / (Y + Dy) [`Term2`]

    const thisValueSeal = this._value.seal();
    const otherValueSeal = other._value.seal();

    let answerValue = Circuit.witness(
      Field,
      () => new Field( CircuitNumber.widenScientificNotation((Number(thisValueSeal.toBigInt()) / Number(otherValueSeal.toBigInt())).toString()).split('.')[0] )
    );

    const answerValueSeal = answerValue.seal();
    let answerDecimal = Circuit.witness(
      Field,
      () => new Field( CircuitNumber.precisionRound((Number(thisValueSeal.toBigInt()) / Number(otherValueSeal.toBigInt()) - Number(answerValueSeal.toBigInt())) * PRECISION).substring(0, PRECISION_LOG) )
    );

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
      this._sign.equals(other._sign),
      Field(1),
      Field(-1)
    );

    const answer = new CircuitNumber(
      answerValueFinal.mul(Field(PRECISION)).add(answerDecimalFinal),
      answerSign
    );

    answer.mul(other).inPrecisionRange(this).assertEquals(Bool(true));

    return answer;
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

  private static fieldMod(_number1: Field, _number2: Field): Field {
    if (_number1.isConstant() && _number2.isConstant()) {
      const number1AsInteger = _number1.toBigInt();
      const number2AsInteger = _number2.toBigInt();
      const integerDivision = number1AsInteger / number2AsInteger;
      const answer = number1AsInteger - number2AsInteger * integerDivision;
      return new Field(
        CircuitMath.widenScientificNotation(
          answer.toString()
        )
      );
    } else {
      const number1 = _number1.seal();
      const number2 = _number2.seal();
      const integerDivision = Circuit.witness(
        Field,
        () => new Field(
          CircuitMath.widenScientificNotation(
            (number1.toBigInt() / number2.toBigInt()).toString()
          )
        )
      );

      const answer = number1.sub(number2.mul(integerDivision)).seal();
      answer.assertLt(_number2);

      return answer;
    }
  };

  private static intPow(base: CircuitNumberExact, power: CircuitNumberExact): CircuitNumberExact {
    const OPERATION_COUNT = 64;

    let answer = CircuitNumberExact.from(1);
    let notYetReachedEnd = Bool(true);

    for (let i = 0; i < OPERATION_COUNT; i++) {
      notYetReachedEnd = Circuit.if(
        Bool.or(
          notYetReachedEnd.not(),
          CircuitNumberExact.from(i).equals(power)
        ),
        Bool(false),
        Bool(true)
      );
      answer = answer.mul(Circuit.if(
        notYetReachedEnd,
        base,
        CircuitNumberExact.from(1)
      ));
    }

    return answer;
  };

  private static logTwo(_number: CircuitNumberExact): CircuitNumberExact {
    const number = _number.abs().trunc().toField();
    const answerValue = Circuit.witness(
      Field,
      () => new Field(number.toBits().map(each => each.toBoolean()).lastIndexOf(true))
    );

    const answer = CircuitNumberExact.fromField(
      answerValue,
      Field(0),
      Field(1)
    );

    const power = CircuitMath.intPow(CircuitNumberExact.from(2), answer).toField();
    const mod = CircuitMath.fieldMod(number, power);
    const check = number.sub(mod).div(power);

    check.assertEquals(Field(1));

    return answer;
  };

  private static _ln(number: CircuitNumberExact): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 10;

    number.gt(CircuitNumberExact.from(0)).assertEquals(Bool(true));
    number.lte(CircuitNumberExact.from(2)).assertEquals(Bool(true));

    const x = number.sub(CircuitNumberExact.from(1));
    let xPow = x;
    let signPow = CircuitNumberExact.from(1);
    let answer = CircuitNumberExact.from(0);

    for (let i = 1; i <= TAYLOR_SERIE_TERM_PRECISION; i++) {
      answer = answer.add(signPow.mul(xPow.div(CircuitNumberExact.from(i))));
      xPow = xPow.mul(x);
      signPow = signPow.neg();
    }

    return answer;
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
      a = Circuit.if(
        isZero,
        a,
        b
      );
      b = Circuit.if(
        isZero,
        b,
        oldA.mod(b)
      );
    }

    return a;
  };

  static lcm(a: CircuitNumber, b: CircuitNumber): CircuitNumber {
    return a.mul(b).div(CircuitMath.gcd(a, b));
  };

  // Logarithmic Functions

  private static lnExact(number: CircuitNumberExact): CircuitNumberExact {
    number.gt(CircuitNumberExact.from(0)).assertEquals(Bool(true));

    const power = CircuitMath.logTwo(number).add(CircuitNumberExact.from(1));
    const reminder = CircuitMath._ln(number.div(CircuitMath.intPow(CircuitNumberExact.from(2), power)));

    return CircuitNumberExact.fromString(LN_2.toString()).mul(power).add(reminder);
  };

  static ln(_number: CircuitNumber): CircuitNumber {
    const number = CircuitNumberExact.fromCircuitNumber(_number);

    number.gt(CircuitNumberExact.from(0)).assertEquals(Bool(true));

    const power = CircuitMath.logTwo(number).add(CircuitNumberExact.from(1));
    const reminder = CircuitMath._ln(number.div(CircuitMath.intPow(CircuitNumberExact.from(2), power)));

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

  static exp(_number: CircuitNumber): CircuitNumber {
    const number = CircuitNumberExact.fromCircuitNumber(_number);
    const TAYLOR_SERIE_TERM_PRECISION = 13;

    let answer = CircuitNumberExact.from(1);
    let xPow = number;
    let factorial = CircuitNumberExact.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i ++) {
      answer = answer.add(xPow.div(factorial));
      xPow = xPow.mul(number);
      factorial = factorial.mul(CircuitNumberExact.from(i + 1));
    }

    return answer.toCircuitNumber();
  };

  private static powExact(base: CircuitNumberExact, power: CircuitNumberExact): CircuitNumberExact {
    const intPow = power.abs().trunc();
    const _answer = CircuitMath.intPow(base, intPow).mul(CircuitMath.expExact(power.abs().sub(intPow).mul(CircuitMath.lnExact(base))));
    
    return Circuit.if(power._sign.equals(Field(-1)), _answer.inv(), _answer);
  };

  static pow(_base: CircuitNumber, power: CircuitNumber): CircuitNumber {
    const base = CircuitNumberExact.fromCircuitNumber(_base);
    const intPow = power.abs().trunc();
    const _answer = CircuitMath.intPow(base, CircuitNumberExact.fromCircuitNumber(intPow)).toCircuitNumber().mul(CircuitMath.exp(power.abs().sub(intPow).mul(CircuitMath.ln(base.toCircuitNumber()))));
    
    return Circuit.if(power._sign.equals(Field(-1)), _answer.inv(), _answer);
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
      _sign
    } = Circuit.if(
      angle.lt(CircuitNumberExact.fromString((PI / 2).toString())),
      {
        reducedAngle: angle,
        _sign: Field(1)
      },
      Circuit.if(
        angle.lt(CircuitNumberExact.fromString((PI).toString())),
        {
          reducedAngle: CircuitNumberExact.fromString((PI).toString()).sub(angle),
          _sign: Field(1)
        },
        Circuit.if(
          angle.lt(CircuitNumberExact.fromString((3 * PI / 2).toString())),
          {
            reducedAngle: angle.sub(CircuitNumberExact.fromString((PI).toString())).neg(),
            _sign: Field(-1)
          },
          {
            reducedAngle: CircuitNumberExact.fromString((2 * PI).toString()).sub(angle),
            _sign: Field(-1)
          }
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

    answer._sign = _sign;

    return answer;
  };

  private static cosExact(_angle: CircuitNumber): CircuitNumberExact {
    const TAYLOR_SERIE_TERM_PRECISION = 25;

    const angle = CircuitNumberExact.fromCircuitNumber(_angle).normalizeRadians();

    const {
      reducedAngle,
      _sign
    } = Circuit.if(
      angle.lt(CircuitNumberExact.fromString((PI / 2).toString())),
      {
        reducedAngle: angle,
        _sign: Field(1)
      },
      Circuit.if(
        angle.lt(CircuitNumberExact.fromString(PI.toString())),
        {
          reducedAngle: CircuitNumberExact.fromString(PI.toString()).sub(angle),
          _sign: Field(-1)
        },
        Circuit.if(
          angle.lt(CircuitNumberExact.fromString((3 * PI / 2).toString())),
          {
            reducedAngle: angle.sub(CircuitNumberExact.fromString((PI).toString())).neg(),
            _sign: Field(-1)
          },
          {
            reducedAngle: CircuitNumberExact.fromString((2 * PI).toString()).sub(angle),
            _sign: Field(1)
          }
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

    answer._sign = _sign;

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

  // Inverse Trigonometric & Hyperbolic Functions

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

  static arcsin(_number: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 9;

    const number = CircuitNumberExact.fromCircuitNumber(_number);

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

    return answer.toCircuitNumber();
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

  // static arcsinh(number: CircuitNumber): CircuitNumber {
  //   return CircuitNumber.from(1);
  // };

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
