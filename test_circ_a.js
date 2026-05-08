import { B } from './test_circ_b.js';

try {
  B.getUT();
} catch (e) {
  console.log("Error when getting UT inside A before decalre:", e.name, e.message);
}

export class UT {
  static getB() {
    return B;
  }
}
console.log('A evaluated');
