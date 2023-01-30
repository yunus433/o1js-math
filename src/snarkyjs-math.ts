import {
  Bool,
  Circuit,
  Field,
  Poseidon,
  Struct,
  isReady,
  UInt64
} from 'snarkyjs';

await isReady;

// SUPPORTED: -1e18 < X < 1e18.
// DECIMAL PRECISION: 1e9

const
  PI = 3.141592654,
  E = 2.718281828,
  POSITIVE_INFINITY = 1e18,
  NEGATIVE_INFINITY = -1e18,
  PRECISION = 1e9,
  PRECISION_LOG = 9,
  PRECISION_EXACT = 1e17,
  PRECISION_LOG_EXACT = 17,
  LN_2 = 0.69314718055995,
  LN_10 = 2.302585093
;

// CircuitNumber class with PRECISION_EXACT rounding to help with precise operations (ex. division)
class CircuitNumberExact extends Struct({
  value: Field,
  decimal: Field,
  sign: Field
}) {
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
  
  private static precisionRound(number: number, precision_log: number): number {
    let numberAsString = number + "e+" + precision_log;

    if (numberAsString.split('e').length > 2) {
      const numberParts = numberAsString.split('e');
      let power = 0;
      
      for (let i = 1; i < numberParts.length; i++)
        if (numberParts[i][0] == '-')
          power -= parseInt(numberParts[i].substring(1));
        else if (numberParts[i][0] == '+')
          power += parseInt(numberParts[i].substring(1));

      numberAsString = numberParts[0].toString() + 'e' + (power >= 0 ? '+' : '') + power.toString();
    }
      
    return +(Math.round(Number(numberAsString)) + "e-" + precision_log);
  };

  private decimalDigitCount(): Number {
    let decimal = Number(this.decimal.toBigInt());
    let answer = PRECISION_LOG_EXACT;

    while (decimal % 10 == 0 && answer) {
      answer--;
      decimal /= 10;
    }

    return answer;
  };

  equals(other: CircuitNumberExact): Bool {
    return this.toField().equals(other.toField());
  };

  inPrecisionRange(other: CircuitNumberExact): Bool { // Exact copy of the CircuitNumber._prototype.inPrecisionRange, does not use PRECISION_EXACT
    return Bool.or(
      Bool.and(
        this.value.equals(other.value),
        Bool.and(
          Bool.or(
            this.decimal.equals(other.decimal),
            Bool.or(
              this.decimal.sub(other.decimal).lt(Field(10).mul(Field(PRECISION_EXACT / PRECISION))),
              other.decimal.sub(this.decimal).lt(Field(10).mul(Field(PRECISION_EXACT / PRECISION)))
            )
          ),
          this.sign.equals(other.sign)
        )
      ),
      Bool.and(
        Bool.or(
          this.value.sub(other.value).equals(Field(1)),
          other.value.sub(this.value).equals(Field(1))
        ),
        Bool.and(
          Bool.and(
            Bool.or(
              this.decimal.equals(Field(0)),
              other.decimal.equals(Field(0))
            ),
            Bool.or(
              Field(PRECISION_EXACT).sub(other.decimal).lt(Field(10).mul(Field(PRECISION_EXACT / PRECISION))),
              Field(PRECISION_EXACT).sub(this.decimal).lt(Field(10).mul(Field(PRECISION_EXACT / PRECISION)))
            )
          ),
          this.sign.equals(other.sign)
        )
      )
    );
  };

  static from(number: number, _precisionRound?: number): CircuitNumberExact {
    const _number = Math.abs(number);

    if (_number < 1 / PRECISION_EXACT)
      return new CircuitNumberExact(
        Field(0),
        Field(0),
        Field(1)
      );
    
    const precisionRound = _precisionRound ? _precisionRound : PRECISION_EXACT;

    const value = Math.floor(_number);
    const decimal = _number - value < 1 / PRECISION_EXACT ? 0 : CircuitNumberExact.precisionRound((_number - value) * precisionRound, 0) * (PRECISION_EXACT / precisionRound);

    const sign = number >= 0 ? 1 : -1;

    return new CircuitNumberExact(
      Field(value),
      Field(decimal),
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

  toField(): Field {
    return Circuit.if(
      this.sign.equals(Field(-1)),
      Field(-1),
      Field(1)
    ).mul(
      this.value.add(
        this.decimal.div(Field(PRECISION_EXACT))
      )
    );
  };

  toNumber(): Number {
    return (this.sign.equals(Field(-1)).toBoolean() ? Number(-1) : Number(1)) * (Number(this.value.toBigInt()) + (Number(this.decimal.toBigInt()) / Number(PRECISION_EXACT)))
  };

  valueOf(): number {
    return this.toNumber().valueOf();
  };

  add(other: CircuitNumberExact): CircuitNumberExact {
    let xValue = 0n, yValue = 0n, xDecimal = 0n, yDecimal = 0n, valueAddition = 0n, decimalAddition = 0n, sign = 1;

    if (this.sign.equals(other.sign).toBoolean()) {
      xValue = this.value.toBigInt();
      xDecimal = this.decimal.toBigInt();
      yValue = other.value.toBigInt();
      yDecimal = other.decimal.toBigInt();
      decimalAddition = xDecimal + yDecimal;
      valueAddition = xValue + yValue + (decimalAddition / BigInt(PRECISION_EXACT));
      decimalAddition = decimalAddition % BigInt(PRECISION_EXACT);
      sign = this.sign.equals(Field(1)).toBoolean() ? 1 : -1;
    } else {
      xValue = this.value.toBigInt();
      xDecimal = this.decimal.toBigInt();
      yValue = other.value.toBigInt();
      yDecimal = other.decimal.toBigInt();
      sign = this.sign.equals(Field(1)).toBoolean() ? 1 : -1;

      if (xValue < yValue || (xValue == yValue && xDecimal < yDecimal)) {
        xValue = other.value.toBigInt();
        xDecimal = other.decimal.toBigInt();
        yValue = this.value.toBigInt();
        yDecimal = this.decimal.toBigInt();
        sign = this.sign.equals(Field(1)).toBoolean() ? -1 : 1;
      }

      valueAddition = xValue - yValue;
      decimalAddition = xDecimal - yDecimal;
      if (decimalAddition < 0) {
        decimalAddition += BigInt(PRECISION_EXACT);
        valueAddition -= 1n;
      }
    }

    const answer = new CircuitNumberExact(
      Field(valueAddition.toString()),
      Field(decimalAddition.toString()),
      Field(sign.toString())
    );

    this.toField().add(other.toField())
      .assertEquals(answer.toField());

    return answer;
  };

  mul(other: CircuitNumberExact): CircuitNumberExact {
    // (X + Dx) * (Y + Dy) = (X * Y) + (X * Dy) + (Y * Dx) + (Dx + Dy)
    const XY = this.value.mul(other.value);

    const XDyValue = this.value.mul(other.decimal).toBigInt() / BigInt(PRECISION_EXACT);
    const XDyDecimal = this.value.mul(other.decimal).toBigInt() - (XDyValue * BigInt(PRECISION_EXACT));
    Field(XDyValue).mul(Field(PRECISION_EXACT)).add(Field(XDyDecimal))
      .assertEquals(this.value.mul(other.decimal));
    const XDy = new CircuitNumberExact(
      Field(XDyValue),
      Field(XDyDecimal),
      Field(1)
    );

    const YDxValue = other.value.mul(this.decimal).toBigInt() / BigInt(PRECISION_EXACT);
    const YDxDecimal = other.value.mul(this.decimal).toBigInt() - (YDxValue * BigInt(PRECISION_EXACT));
    Field(YDxValue).mul(Field(PRECISION_EXACT)).add(Field(YDxDecimal))
      .assertEquals(other.value.mul(this.decimal));
    const YDx = new CircuitNumberExact(
      Field(YDxValue),
      Field(YDxDecimal),
      Field(1)
    );

    const DxDyDecimal = this.decimal.mul(other.decimal).toBigInt() / BigInt(PRECISION_EXACT);
    const DxDyRound = this.decimal.mul(other.decimal).toBigInt() - (DxDyDecimal * BigInt(PRECISION_EXACT));
    Field(DxDyDecimal).mul(Field(PRECISION_EXACT)).add(Field(DxDyRound))
      .assertEquals(this.decimal.mul(other.decimal));
    const DxDy = new CircuitNumberExact(
      Field(0),
      Field(DxDyDecimal),
      Field(1)
    );

    const answer = CircuitNumberExact.from(Number(XY.toBigInt())).add(XDy).add(YDx).add(DxDy);

    answer.sign = Circuit.if(this.sign.equals(other.sign), Field(1), Field(-1));

    return answer;
  };

  toCircuitNumber(): CircuitNumber {
    return new CircuitNumber(
      this.value,
      UInt64.from(this.decimal).div(UInt64.from(PRECISION_EXACT / PRECISION)).value,
      this.sign
    );
  };
};

export class CircuitNumber extends Struct({
  value: Field,
  decimal: Field,
  sign: Field
}) {
  public constructor (
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

  private static precisionRound(number: number, precision_log: number): number {
    let numberAsString = number + 'e+' + precision_log;

    if (numberAsString.split('e').length > 2) {
      const numberParts = numberAsString.split('e');
      let power = 0;
      
      for (let i = 1; i < numberParts.length; i++)
        if (numberParts[i][0] == '-')
          power -= parseInt(numberParts[i].substring(1));
        else if (numberParts[i][0] == '+')
          power += parseInt(numberParts[i].substring(1));

      numberAsString = numberParts[0].toString() + 'e' + (power >= 0 ? '+' : '') + power.toString();
    }
      
    return +(Math.round(Number(numberAsString)) + "e-" + precision_log);
  };

  private decimalDigitCount(): Number {
    let decimal = Number(this.decimal.toBigInt());
    let answer = PRECISION_LOG;

    while (decimal % 10 == 0 && answer) {
      answer--;
      decimal /= 10;
    }

    return answer;
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

    const value = Math.floor(_number);
    const decimal = _number - value < 1 / PRECISION ? 0 : CircuitNumber.precisionRound((_number - value) * precisionRound, 0) * (PRECISION / precisionRound);
  
    const sign = number >= 0 ? 1 : -1;

    return new CircuitNumber(
      Field(value),
      Field(decimal),
      Field(sign)
    );
  };

  static copysign(number: CircuitNumber, sign: CircuitNumber): CircuitNumber {
    return new CircuitNumber(
      number.value,
      number.decimal,
      sign.sign
    );
  };

  static E = CircuitNumber.from(E);
  static EULER = CircuitNumber.from(E);
  static INF = CircuitNumber.from(POSITIVE_INFINITY);
  static POSITIVE_INFINITY = CircuitNumber.from(POSITIVE_INFINITY);
  static NEG_INF = CircuitNumber.from(NEGATIVE_INFINITY);
  static NEGATIVE_INFINITY = CircuitNumber.from(NEGATIVE_INFINITY);
  static PI = CircuitNumber.from(PI);

  toField(): Field {
    return Circuit.if(
      this.sign.equals(Field(-1)),
      Field(-1),
      Field(1)
    ).mul(
      this.value.add(
        this.decimal.div(Field(PRECISION))
      )
    );
  };

  toNumber(): Number {
    return (this.sign.equals(Field(-1)).toBoolean() ? Number(-1) : Number(1)) * (Number(this.value.toBigInt()) + Number(this.decimal.toBigInt()) / Number(PRECISION))
  };

  toString(): String {
    return this.toNumber().toString();
  };

  hash(): Field {
    return Poseidon.hash([ this.toField() ]);
  };

  valueOf(): number {
    return this.toNumber().valueOf();
  };

  abs(): CircuitNumber {
    return new CircuitNumber(
      this.value,
      this.decimal,
      Field(1)
    );
  };
  
  ceil(): CircuitNumber {
    return new CircuitNumber(
      this.value,
      Field(0),
      Field(1)
    );
  };

  floor(): CircuitNumber {
    return new CircuitNumber(
      this.value.add(Circuit.if(this.decimal.equals(Field(0)), Field(0), Field(1))),
      Field(0),
      Field(1)
    );
  };

  neg(): CircuitNumber {
    return new CircuitNumber(
      this.value,
      this.decimal,
      this.sign.neg()
    );
  };

  inv(): CircuitNumber {
    return CircuitNumber.from(1).div(this);
  };

  degrees(): CircuitNumber {
    return this.div(CircuitNumber.PI).mul(CircuitNumber.from(180));
  };

  radians(): CircuitNumber {
    return this.div(CircuitNumber.from(180)).mul(CircuitNumber.PI);
  };

  equals(other: CircuitNumber): Bool {
    return this.toField().equals(other.toField());
  };

  inPrecisionRange(other: CircuitNumber): Bool {
    return Bool.or(
      Bool.and(
        this.value.equals(other.value),
        Bool.and(
          Bool.or(
            this.decimal.equals(other.decimal),
            Bool.or(this.decimal.sub(other.decimal).lt(Field(10)), other.decimal.sub(this.decimal).lt(Field(10)))
          ),
          this.sign.equals(other.sign)
        )
      ),
      Bool.and(
        Bool.or(this.value.sub(other.value).equals(Field(1)), other.value.sub(this.value).equals(Field(1))),
        Bool.and(
          Bool.and(
            Bool.or(this.decimal.equals(Field(0)), other.decimal.equals(Field(0))),
            Bool.or(Field(PRECISION).sub(other.decimal).lt(Field(10)), Field(PRECISION).sub(this.decimal).lt(Field(10)))
          ),
          this.sign.equals(other.sign)
        )
      )
    );
  };

  gt(other: CircuitNumber): Bool {
    return Circuit.if(
      this.sign.equals(other.sign),
      Circuit.if(
        this.sign.equals(Field(1)),
        Circuit.if(
          this.value.equals(other.value).not(),
          this.value.gt(other.value),
          this.decimal.gt(other.decimal)
        ),
        Circuit.if(
          this.value.equals(other.value).not(),
          this.value.lt(other.value),
          this.decimal.lt(other.decimal)
        ),
      ),
      Circuit.if(
        this.sign.equals(Field(1)),
        Bool(true),
        Bool(false)
      )
    );
  };

  gte(other: CircuitNumber): Bool {
    return Bool.or(this.gt(other), this.equals(other));
  };

  lt(other: CircuitNumber): Bool {
    return Circuit.if(
      this.sign.equals(other.sign),
      Circuit.if(
        this.sign.equals(Field(1)),
        Circuit.if(
          this.value.equals(other.value).not(),
          this.value.lt(other.value),
          this.decimal.lt(other.decimal)
        ),
        Circuit.if(
          this.value.equals(other.value).not(),
          this.value.gt(other.value),
          this.decimal.gt(other.decimal)
        ),
      ),
      Circuit.if(
        this.sign.equals(Field(1)),
        Bool(false),
        Bool(true)
      )
    );
  };

  lte(other: CircuitNumber): Bool {
    return Bool.or(this.lt(other), this.equals(other));
  };

  isInteger(): Bool {
    return this.decimal.equals(Field(0));
  };

  parseInt(): CircuitNumber {
    return new CircuitNumber(
      this.value,
      Field(0),
      this.sign
    );
  };

  add(other: CircuitNumber): CircuitNumber {
    let xValue = 0n, yValue = 0n, xDecimal = 0n, yDecimal = 0n, valueAddition = 0n, decimalAddition = 0n, sign = 1;

    if (this.sign.equals(other.sign).toBoolean()) {
      xValue = this.value.toBigInt();
      xDecimal = this.decimal.toBigInt();
      yValue = other.value.toBigInt();
      yDecimal = other.decimal.toBigInt();
      decimalAddition = xDecimal + yDecimal;
      valueAddition = xValue + yValue + (decimalAddition / BigInt(PRECISION));
      decimalAddition = decimalAddition % BigInt(PRECISION);
      sign = this.sign.equals(Field(1)).toBoolean() ? 1 : -1;
    } else {
      xValue = this.value.toBigInt();
      xDecimal = this.decimal.toBigInt();
      yValue = other.value.toBigInt();
      yDecimal = other.decimal.toBigInt();
      sign = this.sign.equals(Field(1)).toBoolean() ? 1 : -1;

      if (xValue < yValue || (xValue == yValue && xDecimal < yDecimal)) {
        xValue = other.value.toBigInt();
        xDecimal = other.decimal.toBigInt();
        yValue = this.value.toBigInt();
        yDecimal = this.decimal.toBigInt();
        sign = this.sign.equals(Field(1)).toBoolean() ? -1 : 1;
      }

      valueAddition = xValue - yValue;
      decimalAddition = xDecimal - yDecimal;
      if (decimalAddition < 0) {
        decimalAddition += BigInt(PRECISION);
        valueAddition -= 1n;
      }
    }

    const answer = new CircuitNumber(
      Field(valueAddition.toString()),
      Field(decimalAddition.toString()),
      Field(sign.toString())
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
    const XY = this.value.mul(other.value);

    const XDyValue = this.value.mul(other.decimal).toBigInt() / BigInt(PRECISION);
    const XDyDecimal = this.value.mul(other.decimal).toBigInt() - (XDyValue * BigInt(PRECISION));
    Field(XDyValue).mul(Field(PRECISION)).add(Field(XDyDecimal))
      .assertEquals(this.value.mul(other.decimal));
    const XDy = new CircuitNumber(
      Field(XDyValue),
      Field(XDyDecimal),
      Field(1)
    );

    const YDxValue = other.value.mul(this.decimal).toBigInt() / BigInt(PRECISION);
    const YDxDecimal = other.value.mul(this.decimal).toBigInt() - (YDxValue * BigInt(PRECISION));
    Field(YDxValue).mul(Field(PRECISION)).add(Field(YDxDecimal))
      .assertEquals(other.value.mul(this.decimal));
    const YDx = new CircuitNumber(
      Field(YDxValue),
      Field(YDxDecimal),
      Field(1)
    );

    const DxDyDecimal = this.decimal.mul(other.decimal).toBigInt() / BigInt(PRECISION);
    const DxDyRound = this.decimal.mul(other.decimal).toBigInt() - (DxDyDecimal * BigInt(PRECISION));
    Field(DxDyDecimal).mul(Field(PRECISION)).add(Field(DxDyRound))
      .assertEquals(this.decimal.mul(other.decimal));
    const DxDy = new CircuitNumber(
      Field(0),
      Field(DxDyDecimal),
      Field(1)
    );

    const answer = CircuitNumber.from(Number(XY.toBigInt())).add(XDy).add(YDx).add(DxDy);

    answer.sign = Circuit.if(this.sign.equals(other.sign), Field(1), Field(-1));

    return answer;
  };

  div(other: CircuitNumber): CircuitNumber {
    const answerValue = this.valueOf() / other.valueOf();
    const answer = CircuitNumberExact.from(CircuitNumber.precisionRound(answerValue * PRECISION_EXACT, 0) / PRECISION_EXACT);

    answer.mul(CircuitNumberExact.fromCircuitNumber(other)).inPrecisionRange(CircuitNumberExact.fromCircuitNumber(this))
      .assertEquals(Bool(true), 'Floating Point Error: Division result out of range.');

    return answer.toCircuitNumber();
  };

  mod(other: CircuitNumber): CircuitNumber {
    this.isInteger().assertEquals(Bool(true), 'Arithmetic Error: Number must be an integer.');
    other.isInteger().assertEquals(Bool(true), 'Arithmetic Error: Divisor must be an integer.');

    const answer = CircuitNumber.from(this.valueOf() % other.valueOf());
    const division = this.div(other).parseInt();
    
    other.mul(division).add(answer).equals(this)
      .assertEquals(Bool(true));

    return answer;
  };
};

export class CircuitMath {
  private static intPow(base: CircuitNumber, power: CircuitNumber): CircuitNumber {
    const OPERATION_COUNT = 64;

    let answer = CircuitNumber.from(1);

    for (let i = 1; i < OPERATION_COUNT; i++)
      answer = answer.mul(Circuit.if(
        power.gte(CircuitNumber.from(i)),
        base,
        CircuitNumber.from(1)
      ));

    return answer;
  };

  private static logTwo(number: Field): CircuitNumber {
    number.assertGt(0);
    return CircuitNumber.from(number.toBits().map(each => each.toBoolean()).lastIndexOf(true))
  };

  private static ePow(number: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 15;

    let answer = CircuitNumber.from(1);
    let xPow = number;
    let factorial = CircuitNumber.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i ++) {
      answer = answer.add(xPow.div(factorial));
      xPow = xPow.mul(number);
      factorial = factorial.mul(CircuitNumber.from(i + 1));
    }

    return answer;
  };

  private static _ln(number: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 38;

    number.gt(CircuitNumber.from(0)).assertEquals(Bool(true));
    number.lte(CircuitNumber.from(2)).assertEquals(Bool(true));

    const x = number.sub(CircuitNumber.from(1));
    let xPow = x;
    let signPow = CircuitNumber.from(1);
    let answer = CircuitNumber.from(0);

    for (let i = 1; i <= TAYLOR_SERIE_TERM_PRECISION; i++) {
      answer = answer.add(signPow.mul(xPow.div(CircuitNumber.from(i))));
      xPow = xPow.mul(x);
      signPow = signPow.mul(CircuitNumber.from(-1));
    }

    return answer;
  };

  static pow(base: CircuitNumber, power: CircuitNumber): CircuitNumber {
    const intPow = power.abs().parseInt();
    const _answer = CircuitMath.intPow(base, intPow).mul(CircuitMath.ePow(power.abs().sub(intPow).mul(CircuitMath.ln(base))));
    
    return Circuit.if(power.sign.equals(Field(-1)), _answer.inv(), _answer);
  };

  static sqrt(number: CircuitNumber): CircuitNumber {
    return CircuitMath.pow(number, CircuitNumber.from(0.5));
  };

  static cbrt(number: CircuitNumber): CircuitNumber {
    return CircuitMath.pow(number, CircuitNumber.from(0.333333333));
  };

  static rootBase(number: CircuitNumber, base: CircuitNumber): CircuitNumber {
    return CircuitMath.pow(number, base.inv());
  };

  static ln(number: CircuitNumber): CircuitNumber {
    number.gt(CircuitNumber.from(0)).assertEquals(Bool(true));
    const power = CircuitMath.logTwo(number.ceil().toField());
    const reminder = CircuitNumberExact.fromCircuitNumber(CircuitMath._ln(number.div(CircuitMath.intPow(CircuitNumber.from(2), power))));

    return CircuitNumberExact.from(LN_2).mul(CircuitNumberExact.fromCircuitNumber(power)).add(reminder).toCircuitNumber();
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

  static sin(number: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 19;

    let answer = CircuitNumber.from(0);
    let xPow = number;
    let signPow = CircuitNumber.from(1);
    let factorial = CircuitNumber.from(1);

    for (let i = 1; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(signPow.mul(xPow.div(factorial)));
      signPow = signPow.neg();
      xPow = xPow.mul(number).mul(number);
      factorial = factorial.mul(CircuitNumber.from(i + 1));
      factorial = factorial.mul(CircuitNumber.from(i + 2));
    }

    return answer;
  };

  static cos(number: CircuitNumber): CircuitNumber {
    const TAYLOR_SERIE_TERM_PRECISION = 19;

    let answer = CircuitNumber.from(1);
    let xPow = number.mul(number);
    let signPow = CircuitNumber.from(-1);
    let factorial = CircuitNumber.from(2);

    for (let i = 2; i < TAYLOR_SERIE_TERM_PRECISION; i += 2) {
      answer = answer.add(signPow.mul(xPow.div(factorial)));
      signPow = signPow.neg();
      xPow = xPow.mul(number).mul(number);
      factorial = factorial.mul(CircuitNumber.from(i + 1));
      factorial = factorial.mul(CircuitNumber.from(i + 2));
    }

    return answer;
  };

  static tan(number: CircuitNumber): CircuitNumber {
    return CircuitMath.sin(number).div(CircuitMath.cos(number));
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
};
