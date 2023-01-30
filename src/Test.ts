import {
  Bool,
  Circuit,
  CircuitValue,
  DeployArgs,
  Field,
  MerkleWitness,
  method,
  Permissions,
  PublicKey,
  SmartContract,
  state,
  State,
  Struct,
} from 'snarkyjs';

import {
  CircuitNumber
} from './snarkyjs-math';

const NUMBER = 0;

export class Test extends SmartContract {
  @state(CircuitNumber) number = State<CircuitNumber>();

  constructor(zkAppAddress: PublicKey) {
    super(zkAppAddress);
  };

  deploy(args: DeployArgs) {
    super.deploy(args);
    this.setPermissions({
      ...Permissions.default(),
      editState: Permissions.proofOrSignature(),
      editSequenceState: Permissions.proofOrSignature(),
    });
  };

  @method set(value: CircuitNumber) {
    this.number.set(value);
  };

  @method get(): Number {
    this.number.assertEquals(this.number.get());
    return this.number.get().toNumber();
  };

  // @method isInteger(): Bool {
  //   this.number.assertEquals(this.number.get());
  //   return this.number.get().isInteger();
  // };

  // @method abs() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().abs());
  // };

  // @method ceil() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().ceil());
  // };

  // @method floor() {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().floor());
  // };

  // @method add(number: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().add(number));
  // }

  // @method mul(number: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().mul(number));
  // }

  // @method div(number: CircuitNumber) {
  //   this.number.assertEquals(this.number.get());
  //   this.number.set(this.number.get().div(number));
  // }
};