// test_circ_b.js
var B = class {
  static getUT() {
    return UT;
  }
};
console.log("B evaluated");

// test_circ_a.js
try {
  B.getUT();
} catch (e) {
  console.log("Error when getting UT inside A before decalre:", e.name, e.message);
}
var UT = class {
  static getB() {
    return B;
  }
};
console.log("A evaluated");
export {
  UT
};
