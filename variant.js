/* Pure calculation helpers, shared by the page and Node's tests. */
(function (root) {
  'use strict';
  function modStar(a, b) {
    if (!Number.isSafeInteger(a) || a < 1 || !Number.isSafeInteger(b) || b < 1) {
      throw new RangeError('mod*: очікуються додатні цілі числа.');
    }
    return ((a - 1) % b) + 1;
  }
  function calculate(k) {
    if (!Number.isInteger(k) || k < 1 || k > 100) {
      throw new RangeError('Введи цілий номер варіанту від 1 до 100.');
    }
    return {1: [modStar(k, 23), modStar(k + 12, 23)],
      2: [modStar(k, 9), modStar(k + 5, 9)],
      3: [modStar(k, 7)], 4: [modStar(k, 4)]};
  }
  function parameters(k) {
    calculate(k);
    const m = b => modStar(k, b);
    return {d: m(5), p4: m(4), a: m(10), b: m(11), m8: m(8),
      p: m(2), q: m(3), row: [m(5), m(6), m(7)],
      factors: m(4) + 2, r: m(3), s: m(2) + 1, t: m(8),
      vectors: m(2) + 2, combinations: m(2) + 1};
  }
  root.Variant = Object.freeze({modStar, calculate, parameters});
})(globalThis);
