import {
  Bool,
  Field,
  Poseidon,
  Struct,
  Provable
} from 'o1js';

export function fieldMod(_number1: Field, _number2: Field, NUM_BITS: number): Field {
  if (_number1.isConstant() && _number2.isConstant()) {
    const number1AsInteger = _number1.toBigInt();
    const number2AsInteger = _number2.toBigInt();
    const integerDivision = number1AsInteger / number2AsInteger;
    const answer = number1AsInteger - number2AsInteger * integerDivision;
    return new Field(
      widenScientificNotation(
        answer.toString()
      )
    );
  } else {
    const number1 = _number1.seal();
    const number2 = _number2.seal();
    const integerDivision = Provable.witness(
      Field,
      () => new Field(
        widenScientificNotation(
          (number1.toBigInt() / number2.toBigInt()).toString()
        )
      )
    );
    integerDivision.rangeCheckHelper(NUM_BITS).assertEquals(integerDivision);

    const answer = number1.sub(number2.mul(integerDivision)).seal();

    answer.rangeCheckHelper(NUM_BITS).assertEquals(answer);
    answer.assertLessThan(_number2);

    return answer;
  }
};

export function precisionRound(number: number): string {
  let numberAsString = number.toString();

  if (numberAsString.includes('e'))
    numberAsString = widenScientificNotation(numberAsString);

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

export function roundString(_number: string, precision: number): string {
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

export function widenScientificNotation(number: string): string {
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