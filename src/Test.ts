import {
  Bool,
  DeployArgs,
  method,
  Permissions,
  PublicKey,
  SmartContract,
  state,
  Field,
  State
} from 'snarkyjs';

import {
  // CircuitMath,
  CircuitNumber
} from './snarkyjs-math.js';

export class Test extends SmartContract {
  @state(CircuitNumber) number = State<CircuitNumber>();

  init() {
    super.init();
  };

  @method set(value: CircuitNumber) {
    this.number.set(value);
  };

  @method get(): CircuitNumber {
    this.number.assertEquals(this.number.get());
    return this.number.get();
  };

  @method abs() {
    this.number.assertEquals(this.number.get());
    this.number.set(this.number.get().abs());
  };

  // @method ceil() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().ceil());
  // };

  // @method floor() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().floor());
  // };

  // @method inv() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().inv());
  // };

  // @method neg() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().neg());
  // };

  // @method round() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().round());
  // };

  // @method trunc() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().trunc());
  // };

  // @method degrees() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().degrees());
  // };

  // @method radians() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().radians());
  // };

  // @method normalizeDegrees() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().normalizeDegrees());
  // };

  // @method normalizeRadians() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().normalizeRadians());
  // };

  // @method isConstant(): boolean {
  //   this.number.assertEquals(this.number.get());
  //   return this.number.get().isConstant();
  // };

  // @method isInteger(): Bool {
  //   this.number.assertEquals(this.number.get());
  //   return this.number.get().isInteger();
  // };

  // @method isPositive(): Bool {
  //   this.number.assertEquals(this.number.get());
  //   return this.number.get().isPositive();
  // };

  // @method equals(number: CircuitNumber): Bool {
  //   this.number.assertEquals(this.number.get());
  //   return this.number.get().equals(number);
  // };

  // @method inPrecisionRange(number: CircuitNumber): Bool {
  //   this.number.assertEquals(this.number.get());
  //   return this.number.get().inPrecisionRange(number);
  // };

  // @method greaterThan(number: CircuitNumber): Bool {
  //   this.number.assertEquals(this.number.get());
  //   return this.number.get().greaterThan(number);
  // };

  // @method greaterThanOrEqual(number: CircuitNumber): Bool {
  //   this.number.assertEquals(this.number.get());
  //   return this.number.get().greaterThanOrEqual(number);
  // };

  // @method lessThan(number: CircuitNumber): Bool {
  //   this.number.assertEquals(this.number.get());
  //   return this.number.get().lessThan(number);
  // };

  // @method lessThanOrEqual(number: CircuitNumber): Bool {
  //   this.number.assertEquals(this.number.get());
  //   return this.number.get().lessThanOrEqual(number);
  // };

  // @method add(number: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().add(number));
  // };

  // @method sub(number: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().sub(number));
  // };

  // @method mul(number: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().mul(number));
  // };

  // @method div(number: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().div(number));
  // };

  // @method mod(number: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().mod(number));
  // };

  // @method gcd(number: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.gcd(this.number.get(), number));
  // };

  // @method lcm(number: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.lcm(this.number.get(), number));
  // };

  // @method exp() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.exp(this.number.get()));
  // };

  // @method pow(power: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.pow(this.number.get(), power));
  // };

  // @method sqrt() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.sqrt(this.number.get()));
  // };

  // @method cbrt() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.cbrt(this.number.get()));
  // };

  // @method rootBase(base: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.rootBase(this.number.get(), base));
  // };

  // @method ln() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.ln(this.number.get()));
  // };

  // @method log2() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.log2(this.number.get()));
  // };

  // @method log10() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.log10(this.number.get()));
  // };

  // @method logBase(base: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.logBase(this.number.get(), base));
  // };

  // @method max(base: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.max(this.number.get(), base));
  // };

  // @method min(base: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.min(this.number.get(), base));
  // };

  // @method sin() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.sin(this.number.get()));
  // };

  // @method cos() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.cos(this.number.get()));
  // };

  // @method tan() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.tan(this.number.get()));
  // };

  // @method csc() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.csc(this.number.get()));
  // };

  // @method sec() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.sec(this.number.get()));
  // };

  // @method cot() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.cot(this.number.get()));
  // };

  // @method sinh() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.sinh(this.number.get()));
  // };

  // @method cosh() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.cosh(this.number.get()));
  // };

  // @method tanh() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.tanh(this.number.get()));
  // };

  // @method arcsin() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.arcsin(this.number.get()));
  // };

  // @method arccos() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.arccos(this.number.get()));
  // };

  // @method arctan() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(CircuitMath.arctan(this.number.get()));
  // };
};
