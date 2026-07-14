import { n as RegisterClass, o as EngineStore } from "./typeStore-BMcSg10V.js";
import { a as NormalizeRadians, c as WithinEpsilon, i as Lerp, o as RandomRange, s as ToHex, t as Clamp } from "./math.scalar.functions-BmHIPW7l.js";
var ToGammaSpace = 1 / 2.2, ToLinearSpace = 2.2, PHI = (1 + Math.sqrt(5)) / 2, Epsilon = 1e-3;
function BuildArray(size, itemBuilder) {
  const a = [];
  for (let i = 0; i < size; ++i) a.push(itemBuilder());
  return a;
}
function BuildTuple(size, itemBuilder) {
  return BuildArray(size, itemBuilder);
}
function ObserveArrayFunction(object, functionName, callback) {
  const oldFunction = object[functionName];
  if (typeof oldFunction != "function") return null;
  const newFunction = function() {
    const previousLength = object.length, returnValue = newFunction.previous.apply(object, arguments);
    return callback(functionName, previousLength), returnValue;
  };
  return oldFunction.next = newFunction, newFunction.previous = oldFunction, object[functionName] = newFunction, () => {
    const previous = newFunction.previous;
    if (!previous) return;
    const next = newFunction.next;
    next ? (previous.next = next, next.previous = previous) : (previous.next = void 0, object[functionName] = previous), newFunction.next = void 0, newFunction.previous = void 0;
  };
}
var observedArrayFunctions = [
  "push",
  "splice",
  "pop",
  "shift",
  "unshift"
];
function _ObserveArray(array, callback) {
  const unObserveFunctions = observedArrayFunctions.map((name) => ObserveArrayFunction(array, name, callback));
  return () => {
    for (const unObserveFunction of unObserveFunctions) unObserveFunction?.();
  };
}
var PerformanceConfigurator = class PerformanceConfigurator2 {
  static SetMatrixPrecision(use64bits) {
    if (PerformanceConfigurator2.MatrixTrackPrecisionChange = !1, use64bits && !PerformanceConfigurator2.MatrixUse64Bits && PerformanceConfigurator2.MatrixTrackedMatrices)
      for (let m = 0; m < PerformanceConfigurator2.MatrixTrackedMatrices.length; ++m) {
        const matrix = PerformanceConfigurator2.MatrixTrackedMatrices[m], values = matrix._m;
        matrix._m = new Array(16);
        for (let i = 0; i < 16; ++i) matrix._m[i] = values[i];
      }
    PerformanceConfigurator2.MatrixUse64Bits = use64bits, PerformanceConfigurator2.MatrixCurrentType = PerformanceConfigurator2.MatrixUse64Bits ? Array : Float32Array, PerformanceConfigurator2.MatrixTrackedMatrices = null;
  }
};
PerformanceConfigurator.MatrixUse64Bits = !1;
PerformanceConfigurator.MatrixTrackPrecisionChange = !0;
PerformanceConfigurator.MatrixCurrentType = Float32Array;
PerformanceConfigurator.MatrixTrackedMatrices = [];
var MatrixManagement = class {
};
MatrixManagement._UpdateFlagSeed = 0;
function MarkAsDirty(matrix) {
  matrix.updateFlag = MatrixManagement._UpdateFlagSeed++;
}
function MultiplyMatricesToArray(a, b, output, offset = 0) {
  const m = a.asArray(), otherM = b.asArray(), tm0 = m[0], tm1 = m[1], tm2 = m[2], tm3 = m[3], tm4 = m[4], tm5 = m[5], tm6 = m[6], tm7 = m[7], tm8 = m[8], tm9 = m[9], tm10 = m[10], tm11 = m[11], tm12 = m[12], tm13 = m[13], tm14 = m[14], tm15 = m[15], om0 = otherM[0], om1 = otherM[1], om2 = otherM[2], om3 = otherM[3], om4 = otherM[4], om5 = otherM[5], om6 = otherM[6], om7 = otherM[7], om8 = otherM[8], om9 = otherM[9], om10 = otherM[10], om11 = otherM[11], om12 = otherM[12], om13 = otherM[13], om14 = otherM[14], om15 = otherM[15];
  output[offset] = tm0 * om0 + tm1 * om4 + tm2 * om8 + tm3 * om12, output[offset + 1] = tm0 * om1 + tm1 * om5 + tm2 * om9 + tm3 * om13, output[offset + 2] = tm0 * om2 + tm1 * om6 + tm2 * om10 + tm3 * om14, output[offset + 3] = tm0 * om3 + tm1 * om7 + tm2 * om11 + tm3 * om15, output[offset + 4] = tm4 * om0 + tm5 * om4 + tm6 * om8 + tm7 * om12, output[offset + 5] = tm4 * om1 + tm5 * om5 + tm6 * om9 + tm7 * om13, output[offset + 6] = tm4 * om2 + tm5 * om6 + tm6 * om10 + tm7 * om14, output[offset + 7] = tm4 * om3 + tm5 * om7 + tm6 * om11 + tm7 * om15, output[offset + 8] = tm8 * om0 + tm9 * om4 + tm10 * om8 + tm11 * om12, output[offset + 9] = tm8 * om1 + tm9 * om5 + tm10 * om9 + tm11 * om13, output[offset + 10] = tm8 * om2 + tm9 * om6 + tm10 * om10 + tm11 * om14, output[offset + 11] = tm8 * om3 + tm9 * om7 + tm10 * om11 + tm11 * om15, output[offset + 12] = tm12 * om0 + tm13 * om4 + tm14 * om8 + tm15 * om12, output[offset + 13] = tm12 * om1 + tm13 * om5 + tm14 * om9 + tm15 * om13, output[offset + 14] = tm12 * om2 + tm13 * om6 + tm14 * om10 + tm15 * om14, output[offset + 15] = tm12 * om3 + tm13 * om7 + tm14 * om11 + tm15 * om15;
}
function MultiplyMatricesToRef(a, b, result, offset = 0) {
  MultiplyMatricesToArray(a, b, result.asArray(), offset), MarkAsDirty(result);
}
function CopyMatrixToArray(matrix, array, offset = 0) {
  const source = matrix.asArray();
  array[offset] = source[0], array[offset + 1] = source[1], array[offset + 2] = source[2], array[offset + 3] = source[3], array[offset + 4] = source[4], array[offset + 5] = source[5], array[offset + 6] = source[6], array[offset + 7] = source[7], array[offset + 8] = source[8], array[offset + 9] = source[9], array[offset + 10] = source[10], array[offset + 11] = source[11], array[offset + 12] = source[12], array[offset + 13] = source[13], array[offset + 14] = source[14], array[offset + 15] = source[15];
}
function InvertMatrixToRef(source, target) {
  const result = InvertMatrixToArray(source, target.asArray());
  return result && MarkAsDirty(target), result;
}
function InvertMatrixToArray(source, target) {
  const m = source.asArray(), m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3], m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7], m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11], m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15], det_22_33 = m22 * m33 - m32 * m23, det_21_33 = m21 * m33 - m31 * m23, det_21_32 = m21 * m32 - m31 * m22, det_20_33 = m20 * m33 - m30 * m23, det_20_32 = m20 * m32 - m22 * m30, det_20_31 = m20 * m31 - m30 * m21, cofact_00 = +(m11 * det_22_33 - m12 * det_21_33 + m13 * det_21_32), cofact_01 = -(m10 * det_22_33 - m12 * det_20_33 + m13 * det_20_32), cofact_02 = +(m10 * det_21_33 - m11 * det_20_33 + m13 * det_20_31), cofact_03 = -(m10 * det_21_32 - m11 * det_20_32 + m12 * det_20_31), det = m00 * cofact_00 + m01 * cofact_01 + m02 * cofact_02 + m03 * cofact_03;
  if (det === 0) return !1;
  const detInv = 1 / det, det_12_33 = m12 * m33 - m32 * m13, det_11_33 = m11 * m33 - m31 * m13, det_11_32 = m11 * m32 - m31 * m12, det_10_33 = m10 * m33 - m30 * m13, det_10_32 = m10 * m32 - m30 * m12, det_10_31 = m10 * m31 - m30 * m11, det_12_23 = m12 * m23 - m22 * m13, det_11_23 = m11 * m23 - m21 * m13, det_11_22 = m11 * m22 - m21 * m12, det_10_23 = m10 * m23 - m20 * m13, det_10_22 = m10 * m22 - m20 * m12, det_10_21 = m10 * m21 - m20 * m11, cofact_10 = -(m01 * det_22_33 - m02 * det_21_33 + m03 * det_21_32), cofact_11 = +(m00 * det_22_33 - m02 * det_20_33 + m03 * det_20_32), cofact_12 = -(m00 * det_21_33 - m01 * det_20_33 + m03 * det_20_31), cofact_13 = +(m00 * det_21_32 - m01 * det_20_32 + m02 * det_20_31), cofact_20 = +(m01 * det_12_33 - m02 * det_11_33 + m03 * det_11_32), cofact_21 = -(m00 * det_12_33 - m02 * det_10_33 + m03 * det_10_32), cofact_22 = +(m00 * det_11_33 - m01 * det_10_33 + m03 * det_10_31), cofact_23 = -(m00 * det_11_32 - m01 * det_10_32 + m02 * det_10_31), cofact_30 = -(m01 * det_12_23 - m02 * det_11_23 + m03 * det_11_22), cofact_31 = +(m00 * det_12_23 - m02 * det_10_23 + m03 * det_10_22), cofact_32 = -(m00 * det_11_23 - m01 * det_10_23 + m03 * det_10_21), cofact_33 = +(m00 * det_11_22 - m01 * det_10_22 + m02 * det_10_21);
  return target[0] = cofact_00 * detInv, target[1] = cofact_10 * detInv, target[2] = cofact_20 * detInv, target[3] = cofact_30 * detInv, target[4] = cofact_01 * detInv, target[5] = cofact_11 * detInv, target[6] = cofact_21 * detInv, target[7] = cofact_31 * detInv, target[8] = cofact_02 * detInv, target[9] = cofact_12 * detInv, target[10] = cofact_22 * detInv, target[11] = cofact_32 * detInv, target[12] = cofact_03 * detInv, target[13] = cofact_13 * detInv, target[14] = cofact_23 * detInv, target[15] = cofact_33 * detInv, !0;
}
var ExtractAsInt = (value) => parseInt(value.toString().replace(/\W/g, "")), Vector2 = class Vector22 {
  constructor(x = 0, y = 0) {
    this.x = x, this.y = y;
  }
  toString() {
    return `{X: ${this.x} Y: ${this.y}}`;
  }
  getClassName() {
    return "Vector2";
  }
  getHashCode() {
    const x = ExtractAsInt(this.x), y = ExtractAsInt(this.y);
    let hash = x;
    return hash = hash * 397 ^ y, hash;
  }
  toArray(array, index = 0) {
    return array[index] = this.x, array[index + 1] = this.y, this;
  }
  fromArray(array, offset = 0) {
    return Vector22.FromArrayToRef(array, offset, this), this;
  }
  asArray() {
    return [this.x, this.y];
  }
  copyFrom(source) {
    return this.x = source.x, this.y = source.y, this;
  }
  copyFromFloats(x, y) {
    return this.x = x, this.y = y, this;
  }
  set(x, y) {
    return this.copyFromFloats(x, y);
  }
  setAll(v) {
    return this.copyFromFloats(v, v);
  }
  add(otherVector) {
    return new Vector22(this.x + otherVector.x, this.y + otherVector.y);
  }
  addToRef(otherVector, result) {
    return result.x = this.x + otherVector.x, result.y = this.y + otherVector.y, result;
  }
  addInPlace(otherVector) {
    return this.x += otherVector.x, this.y += otherVector.y, this;
  }
  addInPlaceFromFloats(x, y) {
    return this.x += x, this.y += y, this;
  }
  addVector3(otherVector) {
    return new Vector22(this.x + otherVector.x, this.y + otherVector.y);
  }
  subtract(otherVector) {
    return new Vector22(this.x - otherVector.x, this.y - otherVector.y);
  }
  subtractToRef(otherVector, result) {
    return result.x = this.x - otherVector.x, result.y = this.y - otherVector.y, result;
  }
  subtractInPlace(otherVector) {
    return this.x -= otherVector.x, this.y -= otherVector.y, this;
  }
  multiplyInPlace(otherVector) {
    return this.x *= otherVector.x, this.y *= otherVector.y, this;
  }
  multiply(otherVector) {
    return new Vector22(this.x * otherVector.x, this.y * otherVector.y);
  }
  multiplyToRef(otherVector, result) {
    return result.x = this.x * otherVector.x, result.y = this.y * otherVector.y, result;
  }
  multiplyByFloats(x, y) {
    return new Vector22(this.x * x, this.y * y);
  }
  divide(otherVector) {
    return new Vector22(this.x / otherVector.x, this.y / otherVector.y);
  }
  divideToRef(otherVector, result) {
    return result.x = this.x / otherVector.x, result.y = this.y / otherVector.y, result;
  }
  divideInPlace(otherVector) {
    return this.x = this.x / otherVector.x, this.y = this.y / otherVector.y, this;
  }
  minimizeInPlace(other) {
    return this.minimizeInPlaceFromFloats(other.x, other.y);
  }
  maximizeInPlace(other) {
    return this.maximizeInPlaceFromFloats(other.x, other.y);
  }
  minimizeInPlaceFromFloats(x, y) {
    return this.x = Math.min(x, this.x), this.y = Math.min(y, this.y), this;
  }
  maximizeInPlaceFromFloats(x, y) {
    return this.x = Math.max(x, this.x), this.y = Math.max(y, this.y), this;
  }
  subtractFromFloats(x, y) {
    return new Vector22(this.x - x, this.y - y);
  }
  subtractFromFloatsToRef(x, y, result) {
    return result.x = this.x - x, result.y = this.y - y, result;
  }
  negate() {
    return new Vector22(-this.x, -this.y);
  }
  negateInPlace() {
    return this.x *= -1, this.y *= -1, this;
  }
  negateToRef(result) {
    return result.x = -this.x, result.y = -this.y, result;
  }
  scaleInPlace(scale) {
    return this.x *= scale, this.y *= scale, this;
  }
  scale(scale) {
    return new Vector22(this.x * scale, this.y * scale);
  }
  scaleToRef(scale, result) {
    return result.x = this.x * scale, result.y = this.y * scale, result;
  }
  scaleAndAddToRef(scale, result) {
    return result.x += this.x * scale, result.y += this.y * scale, result;
  }
  equals(otherVector) {
    return otherVector && this.x === otherVector.x && this.y === otherVector.y;
  }
  equalsWithEpsilon(otherVector, epsilon = Epsilon) {
    return otherVector && WithinEpsilon(this.x, otherVector.x, epsilon) && WithinEpsilon(this.y, otherVector.y, epsilon);
  }
  equalsToFloats(x, y) {
    return this.x === x && this.y === y;
  }
  floor() {
    return new Vector22(Math.floor(this.x), Math.floor(this.y));
  }
  floorToRef(result) {
    return result.x = Math.floor(this.x), result.y = Math.floor(this.y), result;
  }
  fract() {
    return new Vector22(this.x - Math.floor(this.x), this.y - Math.floor(this.y));
  }
  fractToRef(result) {
    return result.x = this.x - Math.floor(this.x), result.y = this.y - Math.floor(this.y), result;
  }
  rotate(angle) {
    return this.rotateToRef(angle, new Vector22());
  }
  rotateToRef(angle, result) {
    const cos = Math.cos(angle), sin = Math.sin(angle);
    return result.x = cos * this.x - sin * this.y, result.y = sin * this.x + cos * this.y, result;
  }
  length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  lengthSquared() {
    return this.x * this.x + this.y * this.y;
  }
  normalize() {
    return this.normalizeFromLength(this.length());
  }
  normalizeFromLength(len) {
    return len === 0 || len === 1 ? this : this.scaleInPlace(1 / len);
  }
  normalizeToNew() {
    const normalized = new Vector22();
    return this.normalizeToRef(normalized), normalized;
  }
  normalizeToRef(result) {
    const len = this.length();
    return len === 0 && (result.x = this.x, result.y = this.y), this.scaleToRef(1 / len, result);
  }
  clone() {
    return new Vector22(this.x, this.y);
  }
  dot(otherVector) {
    return this.x * otherVector.x + this.y * otherVector.y;
  }
  static Zero() {
    return new Vector22(0, 0);
  }
  static One() {
    return new Vector22(1, 1);
  }
  static Random(min = 0, max = 1) {
    return new Vector22(RandomRange(min, max), RandomRange(min, max));
  }
  static RandomToRef(min = 0, max = 1, ref) {
    return ref.copyFromFloats(RandomRange(min, max), RandomRange(min, max));
  }
  static get ZeroReadOnly() {
    return Vector22._ZeroReadOnly;
  }
  static FromArray(array, offset = 0) {
    return new Vector22(array[offset], array[offset + 1]);
  }
  static FromArrayToRef(array, offset, result) {
    return result.x = array[offset], result.y = array[offset + 1], result;
  }
  static FromFloatsToRef(x, y, result) {
    return result.copyFromFloats(x, y), result;
  }
  static CatmullRom(value1, value2, value3, value4, amount) {
    const squared = amount * amount, cubed = amount * squared, x = 0.5 * (2 * value2.x + (-value1.x + value3.x) * amount + (2 * value1.x - 5 * value2.x + 4 * value3.x - value4.x) * squared + (-value1.x + 3 * value2.x - 3 * value3.x + value4.x) * cubed), y = 0.5 * (2 * value2.y + (-value1.y + value3.y) * amount + (2 * value1.y - 5 * value2.y + 4 * value3.y - value4.y) * squared + (-value1.y + 3 * value2.y - 3 * value3.y + value4.y) * cubed);
    return new Vector22(x, y);
  }
  static ClampToRef(value, min, max, ref) {
    return ref.x = Clamp(value.x, min.x, max.x), ref.y = Clamp(value.y, min.y, max.y), ref;
  }
  static Clamp(value, min, max) {
    const x = Clamp(value.x, min.x, max.x), y = Clamp(value.y, min.y, max.y);
    return new Vector22(x, y);
  }
  static Hermite(value1, tangent1, value2, tangent2, amount) {
    const squared = amount * amount, cubed = amount * squared, part1 = 2 * cubed - 3 * squared + 1, part2 = -2 * cubed + 3 * squared, part3 = cubed - 2 * squared + amount, part4 = cubed - squared, x = value1.x * part1 + value2.x * part2 + tangent1.x * part3 + tangent2.x * part4, y = value1.y * part1 + value2.y * part2 + tangent1.y * part3 + tangent2.y * part4;
    return new Vector22(x, y);
  }
  static Hermite1stDerivative(value1, tangent1, value2, tangent2, time) {
    return this.Hermite1stDerivativeToRef(value1, tangent1, value2, tangent2, time, new Vector22());
  }
  static Hermite1stDerivativeToRef(value1, tangent1, value2, tangent2, time, result) {
    const t2 = time * time;
    return result.x = (t2 - time) * 6 * value1.x + (3 * t2 - 4 * time + 1) * tangent1.x + (-t2 + time) * 6 * value2.x + (3 * t2 - 2 * time) * tangent2.x, result.y = (t2 - time) * 6 * value1.y + (3 * t2 - 4 * time + 1) * tangent1.y + (-t2 + time) * 6 * value2.y + (3 * t2 - 2 * time) * tangent2.y, result;
  }
  static Lerp(start, end, amount) {
    return Vector22.LerpToRef(start, end, amount, new Vector22());
  }
  static LerpToRef(start, end, amount, result) {
    return result.x = start.x + (end.x - start.x) * amount, result.y = start.y + (end.y - start.y) * amount, result;
  }
  static Dot(left, right) {
    return left.x * right.x + left.y * right.y;
  }
  static Normalize(vector) {
    return Vector22.NormalizeToRef(vector, new Vector22());
  }
  static NormalizeToRef(vector, result) {
    return vector.normalizeToRef(result), result;
  }
  static Minimize(left, right) {
    const x = left.x < right.x ? left.x : right.x, y = left.y < right.y ? left.y : right.y;
    return new Vector22(x, y);
  }
  static Maximize(left, right) {
    const x = left.x > right.x ? left.x : right.x, y = left.y > right.y ? left.y : right.y;
    return new Vector22(x, y);
  }
  static Transform(vector, transformation) {
    return Vector22.TransformToRef(vector, transformation, new Vector22());
  }
  static TransformToRef(vector, transformation, result) {
    const m = transformation.m, x = vector.x * m[0] + vector.y * m[4] + m[12], y = vector.x * m[1] + vector.y * m[5] + m[13];
    return result.x = x, result.y = y, result;
  }
  static PointInTriangle(p, p0, p1, p2) {
    const a = 0.5 * (-p1.y * p2.x + p0.y * (-p1.x + p2.x) + p0.x * (p1.y - p2.y) + p1.x * p2.y), sign = a < 0 ? -1 : 1, s = (p0.y * p2.x - p0.x * p2.y + (p2.y - p0.y) * p.x + (p0.x - p2.x) * p.y) * sign, t = (p0.x * p1.y - p0.y * p1.x + (p0.y - p1.y) * p.x + (p1.x - p0.x) * p.y) * sign;
    return s > 0 && t > 0 && s + t < 2 * a * sign;
  }
  static Distance(value1, value2) {
    return Math.sqrt(Vector22.DistanceSquared(value1, value2));
  }
  static DistanceSquared(value1, value2) {
    const x = value1.x - value2.x, y = value1.y - value2.y;
    return x * x + y * y;
  }
  static Center(value1, value2) {
    return Vector22.CenterToRef(value1, value2, new Vector22());
  }
  static CenterToRef(value1, value2, ref) {
    return ref.copyFromFloats((value1.x + value2.x) / 2, (value1.y + value2.y) / 2);
  }
  static DistanceOfPointFromSegment(p, segA, segB) {
    const l2 = Vector22.DistanceSquared(segA, segB);
    if (l2 === 0) return Vector22.Distance(p, segA);
    const v = segB.subtract(segA), t = Math.max(0, Math.min(1, Vector22.Dot(p.subtract(segA), v) / l2)), proj = segA.add(v.multiplyByFloats(t, t));
    return Vector22.Distance(p, proj);
  }
};
Vector2._V8PerformanceHack = /* @__PURE__ */ new Vector2(0.5, 0.5);
Vector2._ZeroReadOnly = /* @__PURE__ */ Vector2.Zero();
var Vector3 = class Vector32 {
  get x() {
    return this._x;
  }
  set x(value) {
    this._x = value, this._isDirty = !0;
  }
  get y() {
    return this._y;
  }
  set y(value) {
    this._y = value, this._isDirty = !0;
  }
  get z() {
    return this._z;
  }
  set z(value) {
    this._z = value, this._isDirty = !0;
  }
  constructor(x = 0, y = 0, z = 0) {
    this._isDirty = !0, this._x = x, this._y = y, this._z = z;
  }
  toString() {
    return `{X: ${this._x} Y: ${this._y} Z: ${this._z}}`;
  }
  getClassName() {
    return "Vector3";
  }
  getHashCode() {
    const x = ExtractAsInt(this._x), y = ExtractAsInt(this._y), z = ExtractAsInt(this._z);
    let hash = x;
    return hash = hash * 397 ^ y, hash = hash * 397 ^ z, hash;
  }
  asArray() {
    return [
      this._x,
      this._y,
      this._z
    ];
  }
  toArray(array, index = 0) {
    return array[index] = this._x, array[index + 1] = this._y, array[index + 2] = this._z, this;
  }
  fromArray(array, offset = 0) {
    return Vector32.FromArrayToRef(array, offset, this), this;
  }
  toQuaternion() {
    return Quaternion.RotationYawPitchRoll(this._y, this._x, this._z);
  }
  addInPlace(otherVector) {
    return this._x += otherVector._x, this._y += otherVector._y, this._z += otherVector._z, this._isDirty = !0, this;
  }
  addInPlaceFromFloats(x, y, z) {
    return this._x += x, this._y += y, this._z += z, this._isDirty = !0, this;
  }
  add(otherVector) {
    return new Vector32(this._x + otherVector._x, this._y + otherVector._y, this._z + otherVector._z);
  }
  addToRef(otherVector, result) {
    return result._x = this._x + otherVector._x, result._y = this._y + otherVector._y, result._z = this._z + otherVector._z, result._isDirty = !0, result;
  }
  subtractInPlace(otherVector) {
    return this._x -= otherVector._x, this._y -= otherVector._y, this._z -= otherVector._z, this._isDirty = !0, this;
  }
  subtract(otherVector) {
    return new Vector32(this._x - otherVector._x, this._y - otherVector._y, this._z - otherVector._z);
  }
  subtractToRef(otherVector, result) {
    return this.subtractFromFloatsToRef(otherVector._x, otherVector._y, otherVector._z, result);
  }
  subtractFromFloats(x, y, z) {
    return new Vector32(this._x - x, this._y - y, this._z - z);
  }
  subtractFromFloatsToRef(x, y, z, result) {
    return result._x = this._x - x, result._y = this._y - y, result._z = this._z - z, result._isDirty = !0, result;
  }
  negate() {
    return new Vector32(-this._x, -this._y, -this._z);
  }
  negateInPlace() {
    return this._x *= -1, this._y *= -1, this._z *= -1, this._isDirty = !0, this;
  }
  negateToRef(result) {
    return result._x = this._x * -1, result._y = this._y * -1, result._z = this._z * -1, result._isDirty = !0, result;
  }
  scaleInPlace(scale) {
    return this._x *= scale, this._y *= scale, this._z *= scale, this._isDirty = !0, this;
  }
  scale(scale) {
    return new Vector32(this._x * scale, this._y * scale, this._z * scale);
  }
  scaleToRef(scale, result) {
    return result._x = this._x * scale, result._y = this._y * scale, result._z = this._z * scale, result._isDirty = !0, result;
  }
  getNormalToRef(result) {
    const radius = this.length();
    let theta = Math.acos(this._y / radius);
    const phi = Math.atan2(this._z, this._x);
    theta > Math.PI / 2 ? theta -= Math.PI / 2 : theta += Math.PI / 2;
    const x = radius * Math.sin(theta) * Math.cos(phi), y = radius * Math.cos(theta), z = radius * Math.sin(theta) * Math.sin(phi);
    return result.set(x, y, z), result;
  }
  applyRotationQuaternionToRef(q, result) {
    const vx = this._x, vy = this._y, vz = this._z, qx = q._x, qy = q._y, qz = q._z, qw = q._w, tx = 2 * (qy * vz - qz * vy), ty = 2 * (qz * vx - qx * vz), tz = 2 * (qx * vy - qy * vx);
    return result._x = vx + qw * tx + qy * tz - qz * ty, result._y = vy + qw * ty + qz * tx - qx * tz, result._z = vz + qw * tz + qx * ty - qy * tx, result._isDirty = !0, result;
  }
  applyRotationQuaternionInPlace(q) {
    return this.applyRotationQuaternionToRef(q, this);
  }
  applyRotationQuaternion(q) {
    return this.applyRotationQuaternionToRef(q, new Vector32());
  }
  scaleAndAddToRef(scale, result) {
    return result._x += this._x * scale, result._y += this._y * scale, result._z += this._z * scale, result._isDirty = !0, result;
  }
  projectOnPlane(plane, origin) {
    return this.projectOnPlaneToRef(plane, origin, new Vector32());
  }
  projectOnPlaneToRef(plane, origin, result) {
    const n = plane.normal, d = plane.d, V = MathTmp.Vector3[0];
    this.subtractToRef(origin, V), V.normalize();
    const denom = Vector32.Dot(V, n);
    if (Math.abs(denom) < 1e-10) result.setAll(1 / 0);
    else {
      const t = -(Vector32.Dot(origin, n) + d) / denom, scaledV = V.scaleInPlace(t);
      origin.addToRef(scaledV, result);
    }
    return result;
  }
  equals(otherVector) {
    return otherVector && this._x === otherVector._x && this._y === otherVector._y && this._z === otherVector._z;
  }
  equalsWithEpsilon(otherVector, epsilon = Epsilon) {
    return otherVector && WithinEpsilon(this._x, otherVector._x, epsilon) && WithinEpsilon(this._y, otherVector._y, epsilon) && WithinEpsilon(this._z, otherVector._z, epsilon);
  }
  equalsToFloats(x, y, z) {
    return this._x === x && this._y === y && this._z === z;
  }
  multiplyInPlace(otherVector) {
    return this._x *= otherVector._x, this._y *= otherVector._y, this._z *= otherVector._z, this._isDirty = !0, this;
  }
  multiply(otherVector) {
    return this.multiplyByFloats(otherVector._x, otherVector._y, otherVector._z);
  }
  multiplyToRef(otherVector, result) {
    return result._x = this._x * otherVector._x, result._y = this._y * otherVector._y, result._z = this._z * otherVector._z, result._isDirty = !0, result;
  }
  multiplyByFloats(x, y, z) {
    return new Vector32(this._x * x, this._y * y, this._z * z);
  }
  divide(otherVector) {
    return new Vector32(this._x / otherVector._x, this._y / otherVector._y, this._z / otherVector._z);
  }
  divideToRef(otherVector, result) {
    return result._x = this._x / otherVector._x, result._y = this._y / otherVector._y, result._z = this._z / otherVector._z, result._isDirty = !0, result;
  }
  divideInPlace(otherVector) {
    return this._x = this._x / otherVector._x, this._y = this._y / otherVector._y, this._z = this._z / otherVector._z, this._isDirty = !0, this;
  }
  minimizeInPlace(other) {
    return this.minimizeInPlaceFromFloats(other._x, other._y, other._z);
  }
  maximizeInPlace(other) {
    return this.maximizeInPlaceFromFloats(other._x, other._y, other._z);
  }
  minimizeInPlaceFromFloats(x, y, z) {
    return x < this._x && (this.x = x), y < this._y && (this.y = y), z < this._z && (this.z = z), this;
  }
  maximizeInPlaceFromFloats(x, y, z) {
    return x > this._x && (this.x = x), y > this._y && (this.y = y), z > this._z && (this.z = z), this;
  }
  isNonUniformWithinEpsilon(epsilon) {
    const absX = Math.abs(this._x), absY = Math.abs(this._y);
    if (!WithinEpsilon(absX, absY, epsilon)) return !0;
    const absZ = Math.abs(this._z);
    return !WithinEpsilon(absX, absZ, epsilon) || !WithinEpsilon(absY, absZ, epsilon);
  }
  get isNonUniform() {
    const absX = Math.abs(this._x);
    return absX !== Math.abs(this._y) || absX !== Math.abs(this._z);
  }
  floorToRef(result) {
    return result._x = Math.floor(this._x), result._y = Math.floor(this._y), result._z = Math.floor(this._z), result._isDirty = !0, result;
  }
  floor() {
    return new Vector32(Math.floor(this._x), Math.floor(this._y), Math.floor(this._z));
  }
  fractToRef(result) {
    return result._x = this._x - Math.floor(this._x), result._y = this._y - Math.floor(this._y), result._z = this._z - Math.floor(this._z), result._isDirty = !0, result;
  }
  fract() {
    return new Vector32(this._x - Math.floor(this._x), this._y - Math.floor(this._y), this._z - Math.floor(this._z));
  }
  length() {
    return Math.sqrt(this.lengthSquared());
  }
  lengthSquared() {
    return this._x * this._x + this._y * this._y + this._z * this._z;
  }
  get hasAZeroComponent() {
    return this._x * this._y * this._z === 0;
  }
  normalize() {
    return this.normalizeFromLength(this.length());
  }
  reorderInPlace(order) {
    if (order = order.toLowerCase(), order === "xyz") return this;
    const tem = MathTmp.Vector3[0].copyFrom(this);
    return this.x = tem[order[0]], this.y = tem[order[1]], this.z = tem[order[2]], this;
  }
  rotateByQuaternionToRef(quaternion, result) {
    return quaternion.toRotationMatrix(MathTmp.Matrix[0]), Vector32.TransformCoordinatesToRef(this, MathTmp.Matrix[0], result), result;
  }
  rotateByQuaternionAroundPointToRef(quaternion, point, result) {
    return this.subtractToRef(point, MathTmp.Vector3[0]), MathTmp.Vector3[0].rotateByQuaternionToRef(quaternion, MathTmp.Vector3[0]), point.addToRef(MathTmp.Vector3[0], result), result;
  }
  cross(other) {
    return Vector32.CrossToRef(this, other, new Vector32());
  }
  normalizeFromLength(len) {
    return len === 0 || len === 1 ? this : this.scaleInPlace(1 / len);
  }
  normalizeToNew() {
    return this.normalizeToRef(new Vector32());
  }
  normalizeToRef(result) {
    const len = this.length();
    return len === 0 || len === 1 ? (result._x = this._x, result._y = this._y, result._z = this._z, result._isDirty = !0, result) : this.scaleToRef(1 / len, result);
  }
  clone() {
    return new Vector32(this._x, this._y, this._z);
  }
  copyFrom(source) {
    return this.copyFromFloats(source._x, source._y, source._z);
  }
  copyFromFloats(x, y, z) {
    return this._x = x, this._y = y, this._z = z, this._isDirty = !0, this;
  }
  set(x, y, z) {
    return this.copyFromFloats(x, y, z);
  }
  setAll(v) {
    return this._x = this._y = this._z = v, this._isDirty = !0, this;
  }
  static GetClipFactor(vector0, vector1, axis, size) {
    const d0 = Vector32.Dot(vector0, axis), d1 = Vector32.Dot(vector1, axis);
    return (d0 - size) / (d0 - d1);
  }
  static GetAngleBetweenVectors(vector0, vector1, normal) {
    const v0 = vector0.normalizeToRef(MathTmp.Vector3[1]), v1 = vector1.normalizeToRef(MathTmp.Vector3[2]);
    let dot = Vector32.Dot(v0, v1);
    dot = Clamp(dot, -1, 1);
    const angle = Math.acos(dot), n = MathTmp.Vector3[3];
    return Vector32.CrossToRef(v0, v1, n), Vector32.Dot(n, normal) > 0 ? isNaN(angle) ? 0 : angle : isNaN(angle) ? -Math.PI : -Math.acos(dot);
  }
  static GetAngleBetweenVectorsOnPlane(vector0, vector1, normal) {
    MathTmp.Vector3[0].copyFrom(vector0);
    const v0 = MathTmp.Vector3[0];
    MathTmp.Vector3[1].copyFrom(vector1);
    const v1 = MathTmp.Vector3[1];
    MathTmp.Vector3[2].copyFrom(normal);
    const vNormal = MathTmp.Vector3[2], right = MathTmp.Vector3[3], forward = MathTmp.Vector3[4];
    return v0.normalize(), v1.normalize(), vNormal.normalize(), Vector32.CrossToRef(vNormal, v0, right), Vector32.CrossToRef(right, vNormal, forward), NormalizeRadians(Math.atan2(Vector32.Dot(v1, right), Vector32.Dot(v1, forward)));
  }
  static PitchYawRollToMoveBetweenPointsToRef(start, target, ref) {
    const diff = TmpVectors.Vector3[0];
    return target.subtractToRef(start, diff), ref._y = Math.atan2(diff.x, diff.z) || 0, ref._x = Math.atan2(Math.sqrt(diff.x ** 2 + diff.z ** 2), diff.y) || 0, ref._z = 0, ref._isDirty = !0, ref;
  }
  static PitchYawRollToMoveBetweenPoints(start, target) {
    const ref = Vector32.Zero();
    return Vector32.PitchYawRollToMoveBetweenPointsToRef(start, target, ref);
  }
  static SlerpToRef(vector0, vector1, slerp, result) {
    slerp = Clamp(slerp, 0, 1);
    const vector0Dir = MathTmp.Vector3[0], vector1Dir = MathTmp.Vector3[1];
    vector0Dir.copyFrom(vector0);
    const vector0Length = vector0Dir.length();
    vector0Dir.normalizeFromLength(vector0Length), vector1Dir.copyFrom(vector1);
    const vector1Length = vector1Dir.length();
    vector1Dir.normalizeFromLength(vector1Length);
    const dot = Vector32.Dot(vector0Dir, vector1Dir);
    let scale0, scale1;
    if (dot < 1 - 1e-3) {
      const omega = Math.acos(dot), invSin = 1 / Math.sin(omega);
      scale0 = Math.sin((1 - slerp) * omega) * invSin, scale1 = Math.sin(slerp * omega) * invSin;
    } else
      scale0 = 1 - slerp, scale1 = slerp;
    return vector0Dir.scaleInPlace(scale0), vector1Dir.scaleInPlace(scale1), result.copyFrom(vector0Dir).addInPlace(vector1Dir), result.scaleInPlace(Lerp(vector0Length, vector1Length, slerp)), result;
  }
  static SmoothToRef(source, goal, deltaTime, lerpTime, result) {
    return Vector32.SlerpToRef(source, goal, lerpTime === 0 ? 1 : deltaTime / lerpTime, result), result;
  }
  static FromArray(array, offset = 0) {
    return new Vector32(array[offset], array[offset + 1], array[offset + 2]);
  }
  static FromFloatArray(array, offset) {
    return Vector32.FromArray(array, offset);
  }
  static FromArrayToRef(array, offset, result) {
    return result._x = array[offset], result._y = array[offset + 1], result._z = array[offset + 2], result._isDirty = !0, result;
  }
  static FromFloatArrayToRef(array, offset, result) {
    return Vector32.FromArrayToRef(array, offset, result);
  }
  static FromFloatsToRef(x, y, z, result) {
    return result.copyFromFloats(x, y, z), result;
  }
  static Zero() {
    return new Vector32(0, 0, 0);
  }
  static One() {
    return new Vector32(1, 1, 1);
  }
  static Up() {
    return new Vector32(0, 1, 0);
  }
  static get UpReadOnly() {
    return Vector32._UpReadOnly;
  }
  static get DownReadOnly() {
    return Vector32._DownReadOnly;
  }
  static get RightReadOnly() {
    return Vector32._RightReadOnly;
  }
  static get LeftReadOnly() {
    return Vector32._LeftReadOnly;
  }
  static get LeftHandedForwardReadOnly() {
    return Vector32._LeftHandedForwardReadOnly;
  }
  static get RightHandedForwardReadOnly() {
    return Vector32._RightHandedForwardReadOnly;
  }
  static get LeftHandedBackwardReadOnly() {
    return Vector32._LeftHandedBackwardReadOnly;
  }
  static get RightHandedBackwardReadOnly() {
    return Vector32._RightHandedBackwardReadOnly;
  }
  static get ZeroReadOnly() {
    return Vector32._ZeroReadOnly;
  }
  static get OneReadOnly() {
    return Vector32._OneReadOnly;
  }
  static Down() {
    return new Vector32(0, -1, 0);
  }
  static Forward(rightHandedSystem = !1) {
    return new Vector32(0, 0, rightHandedSystem ? -1 : 1);
  }
  static Backward(rightHandedSystem = !1) {
    return new Vector32(0, 0, rightHandedSystem ? 1 : -1);
  }
  static Right() {
    return new Vector32(1, 0, 0);
  }
  static Left() {
    return new Vector32(-1, 0, 0);
  }
  static Random(min = 0, max = 1) {
    return new Vector32(RandomRange(min, max), RandomRange(min, max), RandomRange(min, max));
  }
  static RandomToRef(min = 0, max = 1, ref) {
    return ref.copyFromFloats(RandomRange(min, max), RandomRange(min, max), RandomRange(min, max));
  }
  static TransformCoordinates(vector, transformation) {
    const result = Vector32.Zero();
    return Vector32.TransformCoordinatesToRef(vector, transformation, result), result;
  }
  static TransformCoordinatesToRef(vector, transformation, result) {
    return Vector32.TransformCoordinatesFromFloatsToRef(vector._x, vector._y, vector._z, transformation, result), result;
  }
  static TransformCoordinatesFromFloatsToRef(x, y, z, transformation, result) {
    const m = transformation.m, rx = x * m[0] + y * m[4] + z * m[8] + m[12], ry = x * m[1] + y * m[5] + z * m[9] + m[13], rz = x * m[2] + y * m[6] + z * m[10] + m[14], rw = 1 / (x * m[3] + y * m[7] + z * m[11] + m[15]);
    return result._x = rx * rw, result._y = ry * rw, result._z = rz * rw, result._isDirty = !0, result;
  }
  static TransformNormal(vector, transformation) {
    const result = Vector32.Zero();
    return Vector32.TransformNormalToRef(vector, transformation, result), result;
  }
  static TransformNormalToRef(vector, transformation, result) {
    return this.TransformNormalFromFloatsToRef(vector._x, vector._y, vector._z, transformation, result), result;
  }
  static TransformNormalFromFloatsToRef(x, y, z, transformation, result) {
    const m = transformation.m;
    return result._x = x * m[0] + y * m[4] + z * m[8], result._y = x * m[1] + y * m[5] + z * m[9], result._z = x * m[2] + y * m[6] + z * m[10], result._isDirty = !0, result;
  }
  static CatmullRom(value1, value2, value3, value4, amount) {
    const squared = amount * amount, cubed = amount * squared, x = 0.5 * (2 * value2._x + (-value1._x + value3._x) * amount + (2 * value1._x - 5 * value2._x + 4 * value3._x - value4._x) * squared + (-value1._x + 3 * value2._x - 3 * value3._x + value4._x) * cubed), y = 0.5 * (2 * value2._y + (-value1._y + value3._y) * amount + (2 * value1._y - 5 * value2._y + 4 * value3._y - value4._y) * squared + (-value1._y + 3 * value2._y - 3 * value3._y + value4._y) * cubed), z = 0.5 * (2 * value2._z + (-value1._z + value3._z) * amount + (2 * value1._z - 5 * value2._z + 4 * value3._z - value4._z) * squared + (-value1._z + 3 * value2._z - 3 * value3._z + value4._z) * cubed);
    return new Vector32(x, y, z);
  }
  static Clamp(value, min, max) {
    const result = new Vector32();
    return Vector32.ClampToRef(value, min, max, result), result;
  }
  static ClampToRef(value, min, max, result) {
    let x = value._x;
    x = x > max._x ? max._x : x, x = x < min._x ? min._x : x;
    let y = value._y;
    y = y > max._y ? max._y : y, y = y < min._y ? min._y : y;
    let z = value._z;
    return z = z > max._z ? max._z : z, z = z < min._z ? min._z : z, result.copyFromFloats(x, y, z), result;
  }
  static CheckExtends(v, min, max) {
    min.minimizeInPlace(v), max.maximizeInPlace(v);
  }
  static Hermite(value1, tangent1, value2, tangent2, amount) {
    const squared = amount * amount, cubed = amount * squared, part1 = 2 * cubed - 3 * squared + 1, part2 = -2 * cubed + 3 * squared, part3 = cubed - 2 * squared + amount, part4 = cubed - squared, x = value1._x * part1 + value2._x * part2 + tangent1._x * part3 + tangent2._x * part4, y = value1._y * part1 + value2._y * part2 + tangent1._y * part3 + tangent2._y * part4, z = value1._z * part1 + value2._z * part2 + tangent1._z * part3 + tangent2._z * part4;
    return new Vector32(x, y, z);
  }
  static Hermite1stDerivative(value1, tangent1, value2, tangent2, time) {
    const result = new Vector32();
    return this.Hermite1stDerivativeToRef(value1, tangent1, value2, tangent2, time, result), result;
  }
  static Hermite1stDerivativeToRef(value1, tangent1, value2, tangent2, time, result) {
    const t2 = time * time;
    return result._x = (t2 - time) * 6 * value1._x + (3 * t2 - 4 * time + 1) * tangent1._x + (-t2 + time) * 6 * value2._x + (3 * t2 - 2 * time) * tangent2._x, result._y = (t2 - time) * 6 * value1._y + (3 * t2 - 4 * time + 1) * tangent1._y + (-t2 + time) * 6 * value2._y + (3 * t2 - 2 * time) * tangent2._y, result._z = (t2 - time) * 6 * value1._z + (3 * t2 - 4 * time + 1) * tangent1._z + (-t2 + time) * 6 * value2._z + (3 * t2 - 2 * time) * tangent2._z, result._isDirty = !0, result;
  }
  static Lerp(start, end, amount) {
    const result = new Vector32(0, 0, 0);
    return Vector32.LerpToRef(start, end, amount, result), result;
  }
  static LerpToRef(start, end, amount, result) {
    return result._x = start._x + (end._x - start._x) * amount, result._y = start._y + (end._y - start._y) * amount, result._z = start._z + (end._z - start._z) * amount, result._isDirty = !0, result;
  }
  static Dot(left, right) {
    return left._x * right._x + left._y * right._y + left._z * right._z;
  }
  dot(otherVector) {
    return this._x * otherVector._x + this._y * otherVector._y + this._z * otherVector._z;
  }
  static Cross(left, right) {
    const result = new Vector32();
    return Vector32.CrossToRef(left, right, result), result;
  }
  static CrossToRef(left, right, result) {
    const x = left._y * right._z - left._z * right._y, y = left._z * right._x - left._x * right._z, z = left._x * right._y - left._y * right._x;
    return result.copyFromFloats(x, y, z), result;
  }
  static Normalize(vector) {
    const result = Vector32.Zero();
    return Vector32.NormalizeToRef(vector, result), result;
  }
  static NormalizeToRef(vector, result) {
    return vector.normalizeToRef(result), result;
  }
  static Project(vector, world, transform, viewport) {
    const result = new Vector32();
    return Vector32.ProjectToRef(vector, world, transform, viewport, result), result;
  }
  static ProjectToRef(vector, world, transform, viewport, result) {
    const cw = viewport.width, ch = viewport.height, cx = viewport.x, cy = viewport.y, viewportMatrix = MathTmp.Matrix[1], isNDCHalfZRange = EngineStore.LastCreatedEngine?.isNDCHalfZRange, zScale = isNDCHalfZRange ? 1 : 0.5, zOffset = isNDCHalfZRange ? 0 : 0.5;
    Matrix.FromValuesToRef(cw / 2, 0, 0, 0, 0, -ch / 2, 0, 0, 0, 0, zScale, 0, cx + cw / 2, ch / 2 + cy, zOffset, 1, viewportMatrix);
    const matrix = MathTmp.Matrix[0];
    return world.multiplyToRef(transform, matrix), matrix.multiplyToRef(viewportMatrix, matrix), Vector32.TransformCoordinatesToRef(vector, matrix, result), result;
  }
  static Reflect(inDirection, normal) {
    return this.ReflectToRef(inDirection, normal, new Vector32());
  }
  static ReflectToRef(inDirection, normal, ref) {
    const tmp = TmpVectors.Vector3[0];
    return tmp.copyFrom(normal).scaleInPlace(2 * Vector32.Dot(inDirection, normal)), ref.copyFrom(inDirection).subtractInPlace(tmp);
  }
  static UnprojectFromTransform(source, viewportWidth, viewportHeight, world, transform) {
    return this.Unproject(source, viewportWidth, viewportHeight, world, transform, Matrix.IdentityReadOnly);
  }
  static Unproject(source, viewportWidth, viewportHeight, world, view, projection) {
    const result = new Vector32();
    return Vector32.UnprojectToRef(source, viewportWidth, viewportHeight, world, view, projection, result), result;
  }
  static UnprojectToRef(source, viewportWidth, viewportHeight, world, view, projection, result) {
    return Vector32.UnprojectFloatsToRef(source._x, source._y, source._z, viewportWidth, viewportHeight, world, view, projection, result), result;
  }
  static UnprojectFloatsToRef(sourceX, sourceY, sourceZ, viewportWidth, viewportHeight, world, view, projection, result) {
    const matrix = MathTmp.Matrix[0];
    world.multiplyToRef(view, matrix), matrix.multiplyToRef(projection, matrix), matrix.invert();
    const screenSource = MathTmp.Vector3[0];
    return screenSource.x = sourceX / viewportWidth * 2 - 1, screenSource.y = -(sourceY / viewportHeight * 2 - 1), EngineStore.LastCreatedEngine?.isNDCHalfZRange ? screenSource.z = sourceZ : screenSource.z = 2 * sourceZ - 1, Vector32.TransformCoordinatesToRef(screenSource, matrix, result), result;
  }
  static Minimize(left, right) {
    const min = new Vector32();
    return min.copyFrom(left), min.minimizeInPlace(right), min;
  }
  static Maximize(left, right) {
    const max = new Vector32();
    return max.copyFrom(left), max.maximizeInPlace(right), max;
  }
  static Distance(value1, value2) {
    return Math.sqrt(Vector32.DistanceSquared(value1, value2));
  }
  static DistanceSquared(value1, value2) {
    const x = value1._x - value2._x, y = value1._y - value2._y, z = value1._z - value2._z;
    return x * x + y * y + z * z;
  }
  static ProjectOnTriangleToRef(vector, p0, p1, p2, ref) {
    const p1p0 = MathTmp.Vector3[0], p2p0 = MathTmp.Vector3[1], p2p1 = MathTmp.Vector3[2], normal = MathTmp.Vector3[3], vectorp0 = MathTmp.Vector3[4];
    p1.subtractToRef(p0, p1p0), p2.subtractToRef(p0, p2p0), p2.subtractToRef(p1, p2p1);
    const p1p0L = p1p0.length(), p2p0L = p2p0.length(), p2p1L = p2p1.length();
    if (p1p0L < 1e-3 || p2p0L < 1e-3 || p2p1L < 1e-3)
      return ref.copyFrom(p0), Vector32.Distance(vector, p0);
    vector.subtractToRef(p0, vectorp0), Vector32.CrossToRef(p1p0, p2p0, normal);
    const nl = normal.length();
    if (nl < 1e-3)
      return ref.copyFrom(p0), Vector32.Distance(vector, p0);
    normal.normalizeFromLength(nl);
    let l = vectorp0.length();
    if (l < 1e-3)
      return ref.copyFrom(p0), 0;
    vectorp0.normalizeFromLength(l);
    const cosA = Vector32.Dot(normal, vectorp0), projVector = MathTmp.Vector3[5], proj = MathTmp.Vector3[6];
    projVector.copyFrom(normal).scaleInPlace(-l * cosA), proj.copyFrom(vector).addInPlace(projVector);
    const v0 = MathTmp.Vector3[4], v1 = MathTmp.Vector3[5], v2 = MathTmp.Vector3[7], tmp = MathTmp.Vector3[8];
    v0.copyFrom(p1p0).scaleInPlace(1 / p1p0L), tmp.copyFrom(p2p0).scaleInPlace(1 / p2p0L), v0.addInPlace(tmp).scaleInPlace(-1), v1.copyFrom(p1p0).scaleInPlace(-1 / p1p0L), tmp.copyFrom(p2p1).scaleInPlace(1 / p2p1L), v1.addInPlace(tmp).scaleInPlace(-1), v2.copyFrom(p2p1).scaleInPlace(-1 / p2p1L), tmp.copyFrom(p2p0).scaleInPlace(-1 / p2p0L), v2.addInPlace(tmp).scaleInPlace(-1);
    const projP = MathTmp.Vector3[9];
    let dot;
    projP.copyFrom(proj).subtractInPlace(p0), Vector32.CrossToRef(v0, projP, tmp), dot = Vector32.Dot(tmp, normal);
    const s0 = dot;
    projP.copyFrom(proj).subtractInPlace(p1), Vector32.CrossToRef(v1, projP, tmp), dot = Vector32.Dot(tmp, normal);
    const s1 = dot;
    projP.copyFrom(proj).subtractInPlace(p2), Vector32.CrossToRef(v2, projP, tmp), dot = Vector32.Dot(tmp, normal);
    const s2 = dot, edge = MathTmp.Vector3[10];
    let e0, e1;
    s0 > 0 && s1 < 0 ? (edge.copyFrom(p1p0), e0 = p0, e1 = p1) : s1 > 0 && s2 < 0 ? (edge.copyFrom(p2p1), e0 = p1, e1 = p2) : (edge.copyFrom(p2p0).scaleInPlace(-1), e0 = p2, e1 = p0);
    const tmp2 = MathTmp.Vector3[9], tmp3 = MathTmp.Vector3[4];
    if (e0.subtractToRef(proj, tmp), e1.subtractToRef(proj, tmp2), Vector32.CrossToRef(tmp, tmp2, tmp3), !(Vector32.Dot(tmp3, normal) < 0))
      return ref.copyFrom(proj), Math.abs(l * cosA);
    const r = MathTmp.Vector3[5];
    Vector32.CrossToRef(edge, tmp3, r), r.normalize();
    const e0proj = MathTmp.Vector3[9];
    e0proj.copyFrom(e0).subtractInPlace(proj);
    const e0projL = e0proj.length();
    if (e0projL < 1e-3)
      return ref.copyFrom(e0), Vector32.Distance(vector, e0);
    e0proj.normalizeFromLength(e0projL);
    const cosG = Vector32.Dot(r, e0proj), triProj = MathTmp.Vector3[7];
    triProj.copyFrom(proj).addInPlace(r.scaleInPlace(e0projL * cosG)), tmp.copyFrom(triProj).subtractInPlace(e0), l = edge.length(), edge.normalizeFromLength(l);
    let t = Vector32.Dot(tmp, edge) / Math.max(l, Epsilon);
    return t = Clamp(t, 0, 1), triProj.copyFrom(e0).addInPlace(edge.scaleInPlace(t * l)), ref.copyFrom(triProj), Vector32.Distance(vector, triProj);
  }
  static Center(value1, value2) {
    return Vector32.CenterToRef(value1, value2, Vector32.Zero());
  }
  static CenterToRef(value1, value2, ref) {
    return ref.copyFromFloats((value1._x + value2._x) / 2, (value1._y + value2._y) / 2, (value1._z + value2._z) / 2);
  }
  static RotationFromAxis(axis1, axis2, axis3) {
    const rotation = new Vector32();
    return Vector32.RotationFromAxisToRef(axis1, axis2, axis3, rotation), rotation;
  }
  static RotationFromAxisToRef(axis1, axis2, axis3, ref) {
    const quat = MathTmp.Quaternion[0];
    return Quaternion.RotationQuaternionFromAxisToRef(axis1, axis2, axis3, quat), quat.toEulerAnglesToRef(ref), ref;
  }
};
Vector3._V8PerformanceHack = /* @__PURE__ */ new Vector3(0.5, 0.5, 0.5);
Vector3._UpReadOnly = /* @__PURE__ */ Vector3.Up();
Vector3._DownReadOnly = /* @__PURE__ */ Vector3.Down();
Vector3._LeftHandedForwardReadOnly = /* @__PURE__ */ Vector3.Forward(!1);
Vector3._RightHandedForwardReadOnly = /* @__PURE__ */ Vector3.Forward(!0);
Vector3._LeftHandedBackwardReadOnly = /* @__PURE__ */ Vector3.Backward(!1);
Vector3._RightHandedBackwardReadOnly = /* @__PURE__ */ Vector3.Backward(!0);
Vector3._RightReadOnly = /* @__PURE__ */ Vector3.Right();
Vector3._LeftReadOnly = /* @__PURE__ */ Vector3.Left();
Vector3._ZeroReadOnly = /* @__PURE__ */ Vector3.Zero();
Vector3._OneReadOnly = /* @__PURE__ */ Vector3.One();
var Vector4 = class Vector42 {
  get x() {
    return this._x;
  }
  set x(value) {
    this._x = value, this._isDirty = !0;
  }
  get y() {
    return this._y;
  }
  set y(value) {
    this._y = value, this._isDirty = !0;
  }
  get z() {
    return this._z;
  }
  set z(value) {
    this._z = value, this._isDirty = !0;
  }
  get w() {
    return this._w;
  }
  set w(value) {
    this._w = value, this._isDirty = !0;
  }
  constructor(x = 0, y = 0, z = 0, w = 0) {
    this._isDirty = !0, this._x = x, this._y = y, this._z = z, this._w = w;
  }
  toString() {
    return `{X: ${this._x} Y: ${this._y} Z: ${this._z} W: ${this._w}}`;
  }
  getClassName() {
    return "Vector4";
  }
  getHashCode() {
    const x = ExtractAsInt(this._x), y = ExtractAsInt(this._y), z = ExtractAsInt(this._z), w = ExtractAsInt(this._w);
    let hash = x;
    return hash = hash * 397 ^ y, hash = hash * 397 ^ z, hash = hash * 397 ^ w, hash;
  }
  asArray() {
    return [
      this._x,
      this._y,
      this._z,
      this._w
    ];
  }
  toArray(array, index) {
    return index === void 0 && (index = 0), array[index] = this._x, array[index + 1] = this._y, array[index + 2] = this._z, array[index + 3] = this._w, this;
  }
  fromArray(array, offset = 0) {
    return Vector42.FromArrayToRef(array, offset, this), this;
  }
  addInPlace(otherVector) {
    return this.x += otherVector._x, this.y += otherVector._y, this.z += otherVector._z, this.w += otherVector._w, this;
  }
  addInPlaceFromFloats(x, y, z, w) {
    return this.x += x, this.y += y, this.z += z, this.w += w, this;
  }
  add(otherVector) {
    return new Vector42(this._x + otherVector.x, this._y + otherVector.y, this._z + otherVector.z, this._w + otherVector.w);
  }
  addToRef(otherVector, result) {
    return result.x = this._x + otherVector.x, result.y = this._y + otherVector.y, result.z = this._z + otherVector.z, result.w = this._w + otherVector.w, result;
  }
  subtractInPlace(otherVector) {
    return this.x -= otherVector.x, this.y -= otherVector.y, this.z -= otherVector.z, this.w -= otherVector.w, this;
  }
  subtract(otherVector) {
    return new Vector42(this._x - otherVector.x, this._y - otherVector.y, this._z - otherVector.z, this._w - otherVector.w);
  }
  subtractToRef(otherVector, result) {
    return result.x = this._x - otherVector.x, result.y = this._y - otherVector.y, result.z = this._z - otherVector.z, result.w = this._w - otherVector.w, result;
  }
  subtractFromFloats(x, y, z, w) {
    return new Vector42(this._x - x, this._y - y, this._z - z, this._w - w);
  }
  subtractFromFloatsToRef(x, y, z, w, result) {
    return result.x = this._x - x, result.y = this._y - y, result.z = this._z - z, result.w = this._w - w, result;
  }
  negate() {
    return new Vector42(-this._x, -this._y, -this._z, -this._w);
  }
  negateInPlace() {
    return this.x *= -1, this.y *= -1, this.z *= -1, this.w *= -1, this;
  }
  negateToRef(result) {
    return result.x = -this._x, result.y = -this._y, result.z = -this._z, result.w = -this._w, result;
  }
  scaleInPlace(scale) {
    return this.x *= scale, this.y *= scale, this.z *= scale, this.w *= scale, this;
  }
  scale(scale) {
    return new Vector42(this._x * scale, this._y * scale, this._z * scale, this._w * scale);
  }
  scaleToRef(scale, result) {
    return result.x = this._x * scale, result.y = this._y * scale, result.z = this._z * scale, result.w = this._w * scale, result;
  }
  scaleAndAddToRef(scale, result) {
    return result.x += this._x * scale, result.y += this._y * scale, result.z += this._z * scale, result.w += this._w * scale, result;
  }
  equals(otherVector) {
    return otherVector && this._x === otherVector.x && this._y === otherVector.y && this._z === otherVector.z && this._w === otherVector.w;
  }
  equalsWithEpsilon(otherVector, epsilon = Epsilon) {
    return otherVector && WithinEpsilon(this._x, otherVector.x, epsilon) && WithinEpsilon(this._y, otherVector.y, epsilon) && WithinEpsilon(this._z, otherVector.z, epsilon) && WithinEpsilon(this._w, otherVector.w, epsilon);
  }
  equalsToFloats(x, y, z, w) {
    return this._x === x && this._y === y && this._z === z && this._w === w;
  }
  multiplyInPlace(otherVector) {
    return this.x *= otherVector.x, this.y *= otherVector.y, this.z *= otherVector.z, this.w *= otherVector.w, this;
  }
  multiply(otherVector) {
    return new Vector42(this._x * otherVector.x, this._y * otherVector.y, this._z * otherVector.z, this._w * otherVector.w);
  }
  multiplyToRef(otherVector, result) {
    return result.x = this._x * otherVector.x, result.y = this._y * otherVector.y, result.z = this._z * otherVector.z, result.w = this._w * otherVector.w, result;
  }
  multiplyByFloats(x, y, z, w) {
    return new Vector42(this._x * x, this._y * y, this._z * z, this._w * w);
  }
  divide(otherVector) {
    return new Vector42(this._x / otherVector.x, this._y / otherVector.y, this._z / otherVector.z, this._w / otherVector.w);
  }
  divideToRef(otherVector, result) {
    return result.x = this._x / otherVector.x, result.y = this._y / otherVector.y, result.z = this._z / otherVector.z, result.w = this._w / otherVector.w, result;
  }
  divideInPlace(otherVector) {
    return this.divideToRef(otherVector, this);
  }
  minimizeInPlace(other) {
    return other.x < this._x && (this.x = other.x), other.y < this._y && (this.y = other.y), other.z < this._z && (this.z = other.z), other.w < this._w && (this.w = other.w), this;
  }
  maximizeInPlace(other) {
    return other.x > this._x && (this.x = other.x), other.y > this._y && (this.y = other.y), other.z > this._z && (this.z = other.z), other.w > this._w && (this.w = other.w), this;
  }
  minimizeInPlaceFromFloats(x, y, z, w) {
    return this.x = Math.min(x, this._x), this.y = Math.min(y, this._y), this.z = Math.min(z, this._z), this.w = Math.min(w, this._w), this;
  }
  maximizeInPlaceFromFloats(x, y, z, w) {
    return this.x = Math.max(x, this._x), this.y = Math.max(y, this._y), this.z = Math.max(z, this._z), this.w = Math.max(w, this._w), this;
  }
  floorToRef(result) {
    return result.x = Math.floor(this._x), result.y = Math.floor(this._y), result.z = Math.floor(this._z), result.w = Math.floor(this._w), result;
  }
  floor() {
    return new Vector42(Math.floor(this._x), Math.floor(this._y), Math.floor(this._z), Math.floor(this._w));
  }
  fractToRef(result) {
    return result.x = this._x - Math.floor(this._x), result.y = this._y - Math.floor(this._y), result.z = this._z - Math.floor(this._z), result.w = this._w - Math.floor(this._w), result;
  }
  fract() {
    return new Vector42(this._x - Math.floor(this._x), this._y - Math.floor(this._y), this._z - Math.floor(this._z), this._w - Math.floor(this._w));
  }
  length() {
    return Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w);
  }
  lengthSquared() {
    return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
  }
  normalize() {
    return this.normalizeFromLength(this.length());
  }
  normalizeFromLength(len) {
    return len === 0 || len === 1 ? this : this.scaleInPlace(1 / len);
  }
  normalizeToNew() {
    return this.normalizeToRef(new Vector42());
  }
  normalizeToRef(reference) {
    const len = this.length();
    return len === 0 || len === 1 ? (reference.x = this._x, reference.y = this._y, reference.z = this._z, reference.w = this._w, reference) : this.scaleToRef(1 / len, reference);
  }
  toVector3() {
    return new Vector3(this._x, this._y, this._z);
  }
  clone() {
    return new Vector42(this._x, this._y, this._z, this._w);
  }
  copyFrom(source) {
    return this.x = source.x, this.y = source.y, this.z = source.z, this.w = source.w, this;
  }
  copyFromFloats(x, y, z, w) {
    return this.x = x, this.y = y, this.z = z, this.w = w, this;
  }
  set(x, y, z, w) {
    return this.copyFromFloats(x, y, z, w);
  }
  setAll(v) {
    return this.x = this.y = this.z = this.w = v, this;
  }
  dot(otherVector) {
    return this._x * otherVector.x + this._y * otherVector.y + this._z * otherVector.z + this._w * otherVector.w;
  }
  static FromArray(array, offset) {
    return offset || (offset = 0), new Vector42(array[offset], array[offset + 1], array[offset + 2], array[offset + 3]);
  }
  static FromArrayToRef(array, offset, result) {
    return result.x = array[offset], result.y = array[offset + 1], result.z = array[offset + 2], result.w = array[offset + 3], result;
  }
  static FromFloatArrayToRef(array, offset, result) {
    return Vector42.FromArrayToRef(array, offset, result), result;
  }
  static FromFloatsToRef(x, y, z, w, result) {
    return result.x = x, result.y = y, result.z = z, result.w = w, result;
  }
  static Zero() {
    return new Vector42(0, 0, 0, 0);
  }
  static One() {
    return new Vector42(1, 1, 1, 1);
  }
  static Random(min = 0, max = 1) {
    return new Vector42(RandomRange(min, max), RandomRange(min, max), RandomRange(min, max), RandomRange(min, max));
  }
  static RandomToRef(min = 0, max = 1, ref) {
    return ref.x = RandomRange(min, max), ref.y = RandomRange(min, max), ref.z = RandomRange(min, max), ref.w = RandomRange(min, max), ref;
  }
  static Clamp(value, min, max) {
    return Vector42.ClampToRef(value, min, max, new Vector42());
  }
  static ClampToRef(value, min, max, result) {
    return result.x = Clamp(value.x, min.x, max.x), result.y = Clamp(value.y, min.y, max.y), result.z = Clamp(value.z, min.z, max.z), result.w = Clamp(value.w, min.w, max.w), result;
  }
  static CheckExtends(v, min, max) {
    min.minimizeInPlace(v), max.maximizeInPlace(v);
  }
  static get ZeroReadOnly() {
    return Vector42._ZeroReadOnly;
  }
  static Normalize(vector) {
    return Vector42.NormalizeToRef(vector, new Vector42());
  }
  static NormalizeToRef(vector, result) {
    return vector.normalizeToRef(result), result;
  }
  static Minimize(left, right) {
    const min = new Vector42();
    return min.copyFrom(left), min.minimizeInPlace(right), min;
  }
  static Maximize(left, right) {
    const max = new Vector42();
    return max.copyFrom(left), max.maximizeInPlace(right), max;
  }
  static Distance(value1, value2) {
    return Math.sqrt(Vector42.DistanceSquared(value1, value2));
  }
  static DistanceSquared(value1, value2) {
    const x = value1.x - value2.x, y = value1.y - value2.y, z = value1.z - value2.z, w = value1.w - value2.w;
    return x * x + y * y + z * z + w * w;
  }
  static Center(value1, value2) {
    return Vector42.CenterToRef(value1, value2, new Vector42());
  }
  static CenterToRef(value1, value2, ref) {
    return ref.x = (value1.x + value2.x) / 2, ref.y = (value1.y + value2.y) / 2, ref.z = (value1.z + value2.z) / 2, ref.w = (value1.w + value2.w) / 2, ref;
  }
  static TransformCoordinates(vector, transformation) {
    return Vector42.TransformCoordinatesToRef(vector, transformation, new Vector42());
  }
  static TransformCoordinatesToRef(vector, transformation, result) {
    return Vector42.TransformCoordinatesFromFloatsToRef(vector._x, vector._y, vector._z, transformation, result), result;
  }
  static TransformCoordinatesFromFloatsToRef(x, y, z, transformation, result) {
    const m = transformation.m, rx = x * m[0] + y * m[4] + z * m[8] + m[12], ry = x * m[1] + y * m[5] + z * m[9] + m[13], rz = x * m[2] + y * m[6] + z * m[10] + m[14], rw = x * m[3] + y * m[7] + z * m[11] + m[15];
    return result.x = rx, result.y = ry, result.z = rz, result.w = rw, result;
  }
  static TransformNormal(vector, transformation) {
    return Vector42.TransformNormalToRef(vector, transformation, new Vector42());
  }
  static TransformNormalToRef(vector, transformation, result) {
    const m = transformation.m, x = vector.x * m[0] + vector.y * m[4] + vector.z * m[8], y = vector.x * m[1] + vector.y * m[5] + vector.z * m[9], z = vector.x * m[2] + vector.y * m[6] + vector.z * m[10];
    return result.x = x, result.y = y, result.z = z, result.w = vector.w, result;
  }
  static TransformNormalFromFloatsToRef(x, y, z, w, transformation, result) {
    const m = transformation.m;
    return result.x = x * m[0] + y * m[4] + z * m[8], result.y = x * m[1] + y * m[5] + z * m[9], result.z = x * m[2] + y * m[6] + z * m[10], result.w = w, result;
  }
  static FromVector3(source, w = 0) {
    return new Vector42(source._x, source._y, source._z, w);
  }
  static Dot(left, right) {
    return left.x * right.x + left.y * right.y + left.z * right.z + left.w * right.w;
  }
};
Vector4._V8PerformanceHack = /* @__PURE__ */ new Vector4(0.5, 0.5, 0.5, 0.5);
Vector4._ZeroReadOnly = /* @__PURE__ */ Vector4.Zero();
var Quaternion = class Quaternion2 {
  get x() {
    return this._x;
  }
  set x(value) {
    this._x = value, this._isDirty = !0;
  }
  get y() {
    return this._y;
  }
  set y(value) {
    this._y = value, this._isDirty = !0;
  }
  get z() {
    return this._z;
  }
  set z(value) {
    this._z = value, this._isDirty = !0;
  }
  get w() {
    return this._w;
  }
  set w(value) {
    this._w = value, this._isDirty = !0;
  }
  constructor(x = 0, y = 0, z = 0, w = 1) {
    this._isDirty = !0, this._x = x, this._y = y, this._z = z, this._w = w;
  }
  toString() {
    return `{X: ${this._x} Y: ${this._y} Z: ${this._z} W: ${this._w}}`;
  }
  getClassName() {
    return "Quaternion";
  }
  getHashCode() {
    const x = ExtractAsInt(this._x), y = ExtractAsInt(this._y), z = ExtractAsInt(this._z), w = ExtractAsInt(this._w);
    let hash = x;
    return hash = hash * 397 ^ y, hash = hash * 397 ^ z, hash = hash * 397 ^ w, hash;
  }
  asArray() {
    return [
      this._x,
      this._y,
      this._z,
      this._w
    ];
  }
  toArray(array, index = 0) {
    return array[index] = this._x, array[index + 1] = this._y, array[index + 2] = this._z, array[index + 3] = this._w, this;
  }
  fromArray(array, index = 0) {
    return Quaternion2.FromArrayToRef(array, index, this);
  }
  equals(otherQuaternion) {
    return otherQuaternion && this._x === otherQuaternion._x && this._y === otherQuaternion._y && this._z === otherQuaternion._z && this._w === otherQuaternion._w;
  }
  equalsWithEpsilon(otherQuaternion, epsilon = Epsilon) {
    return otherQuaternion && WithinEpsilon(this._x, otherQuaternion._x, epsilon) && WithinEpsilon(this._y, otherQuaternion._y, epsilon) && WithinEpsilon(this._z, otherQuaternion._z, epsilon) && WithinEpsilon(this._w, otherQuaternion._w, epsilon);
  }
  isApprox(otherQuaternion, epsilon = Epsilon) {
    return otherQuaternion && (WithinEpsilon(this._x, otherQuaternion._x, epsilon) && WithinEpsilon(this._y, otherQuaternion._y, epsilon) && WithinEpsilon(this._z, otherQuaternion._z, epsilon) && WithinEpsilon(this._w, otherQuaternion._w, epsilon) || WithinEpsilon(this._x, -otherQuaternion._x, epsilon) && WithinEpsilon(this._y, -otherQuaternion._y, epsilon) && WithinEpsilon(this._z, -otherQuaternion._z, epsilon) && WithinEpsilon(this._w, -otherQuaternion._w, epsilon));
  }
  clone() {
    return new Quaternion2(this._x, this._y, this._z, this._w);
  }
  copyFrom(other) {
    return this._x = other._x, this._y = other._y, this._z = other._z, this._w = other._w, this._isDirty = !0, this;
  }
  copyFromFloats(x, y, z, w) {
    return this._x = x, this._y = y, this._z = z, this._w = w, this._isDirty = !0, this;
  }
  set(x, y, z, w) {
    return this.copyFromFloats(x, y, z, w);
  }
  setAll(value) {
    return this.copyFromFloats(value, value, value, value);
  }
  add(other) {
    return new Quaternion2(this._x + other._x, this._y + other._y, this._z + other._z, this._w + other._w);
  }
  addInPlace(other) {
    return this._x += other._x, this._y += other._y, this._z += other._z, this._w += other._w, this._isDirty = !0, this;
  }
  addToRef(other, result) {
    return result._x = this._x + other._x, result._y = this._y + other._y, result._z = this._z + other._z, result._w = this._w + other._w, result._isDirty = !0, result;
  }
  addInPlaceFromFloats(x, y, z, w) {
    return this._x += x, this._y += y, this._z += z, this._w += w, this._isDirty = !0, this;
  }
  subtractToRef(other, result) {
    return result._x = this._x - other._x, result._y = this._y - other._y, result._z = this._z - other._z, result._w = this._w - other._w, result._isDirty = !0, result;
  }
  subtractFromFloats(x, y, z, w) {
    return this.subtractFromFloatsToRef(x, y, z, w, new Quaternion2());
  }
  subtractFromFloatsToRef(x, y, z, w, result) {
    return result._x = this._x - x, result._y = this._y - y, result._z = this._z - z, result._w = this._w - w, result._isDirty = !0, result;
  }
  subtract(other) {
    return new Quaternion2(this._x - other._x, this._y - other._y, this._z - other._z, this._w - other._w);
  }
  subtractInPlace(other) {
    return this._x -= other._x, this._y -= other._y, this._z -= other._z, this._w -= other._w, this._isDirty = !0, this;
  }
  scale(value) {
    return new Quaternion2(this._x * value, this._y * value, this._z * value, this._w * value);
  }
  scaleToRef(scale, result) {
    return result._x = this._x * scale, result._y = this._y * scale, result._z = this._z * scale, result._w = this._w * scale, result._isDirty = !0, result;
  }
  scaleInPlace(value) {
    return this._x *= value, this._y *= value, this._z *= value, this._w *= value, this._isDirty = !0, this;
  }
  scaleAndAddToRef(scale, result) {
    return result._x += this._x * scale, result._y += this._y * scale, result._z += this._z * scale, result._w += this._w * scale, result._isDirty = !0, result;
  }
  multiply(q1) {
    const result = new Quaternion2(0, 0, 0, 1);
    return this.multiplyToRef(q1, result), result;
  }
  multiplyToRef(q1, result) {
    const x = this._x * q1._w + this._y * q1._z - this._z * q1._y + this._w * q1._x, y = -this._x * q1._z + this._y * q1._w + this._z * q1._x + this._w * q1._y, z = this._x * q1._y - this._y * q1._x + this._z * q1._w + this._w * q1._z, w = -this._x * q1._x - this._y * q1._y - this._z * q1._z + this._w * q1._w;
    return result.copyFromFloats(x, y, z, w), result;
  }
  multiplyInPlace(other) {
    return this.multiplyToRef(other, this);
  }
  multiplyByFloats(x, y, z, w) {
    return this._x *= x, this._y *= y, this._z *= z, this._w *= w, this._isDirty = !0, this;
  }
  divide(_other) {
    throw new ReferenceError("Can not divide a quaternion");
  }
  divideToRef(_other, _result) {
    throw new ReferenceError("Can not divide a quaternion");
  }
  divideInPlace(_other) {
    throw new ReferenceError("Can not divide a quaternion");
  }
  minimizeInPlace() {
    throw new ReferenceError("Can not minimize a quaternion");
  }
  minimizeInPlaceFromFloats() {
    throw new ReferenceError("Can not minimize a quaternion");
  }
  maximizeInPlace() {
    throw new ReferenceError("Can not maximize a quaternion");
  }
  maximizeInPlaceFromFloats() {
    throw new ReferenceError("Can not maximize a quaternion");
  }
  negate() {
    return this.negateToRef(new Quaternion2());
  }
  negateInPlace() {
    return this._x = -this._x, this._y = -this._y, this._z = -this._z, this._w = -this._w, this._isDirty = !0, this;
  }
  negateToRef(result) {
    return result._x = -this._x, result._y = -this._y, result._z = -this._z, result._w = -this._w, result._isDirty = !0, result;
  }
  equalsToFloats(x, y, z, w) {
    return this._x === x && this._y === y && this._z === z && this._w === w;
  }
  floorToRef(_result) {
    throw new ReferenceError("Can not floor a quaternion");
  }
  floor() {
    throw new ReferenceError("Can not floor a quaternion");
  }
  fractToRef(_result) {
    throw new ReferenceError("Can not fract a quaternion");
  }
  fract() {
    throw new ReferenceError("Can not fract a quaternion");
  }
  conjugateToRef(ref) {
    return ref.copyFromFloats(-this._x, -this._y, -this._z, this._w), ref;
  }
  conjugateInPlace() {
    return this._x *= -1, this._y *= -1, this._z *= -1, this._isDirty = !0, this;
  }
  conjugate() {
    return new Quaternion2(-this._x, -this._y, -this._z, this._w);
  }
  invert() {
    const conjugate = this.conjugate(), lengthSquared = this.lengthSquared();
    return lengthSquared == 0 || lengthSquared == 1 || conjugate.scaleInPlace(1 / lengthSquared), conjugate;
  }
  invertInPlace() {
    this.conjugateInPlace();
    const lengthSquared = this.lengthSquared();
    return lengthSquared == 0 || lengthSquared == 1 ? this : (this.scaleInPlace(1 / lengthSquared), this);
  }
  lengthSquared() {
    return this._x * this._x + this._y * this._y + this._z * this._z + this._w * this._w;
  }
  length() {
    return Math.sqrt(this.lengthSquared());
  }
  normalize() {
    return this.normalizeFromLength(this.length());
  }
  normalizeFromLength(len) {
    return len === 0 || len === 1 ? this : this.scaleInPlace(1 / len);
  }
  normalizeToNew() {
    const normalized = new Quaternion2(0, 0, 0, 1);
    return this.normalizeToRef(normalized), normalized;
  }
  normalizeToRef(reference) {
    const len = this.length();
    return len === 0 || len === 1 ? reference.copyFromFloats(this._x, this._y, this._z, this._w) : this.scaleToRef(1 / len, reference);
  }
  toEulerAngles() {
    const result = Vector3.Zero();
    return this.toEulerAnglesToRef(result), result;
  }
  toEulerAnglesToRef(result) {
    const qz = this._z, qx = this._x, qy = this._y, qw = this._w, zAxisY = qy * qz - qx * qw, limit = 0.4999999;
    if (zAxisY < -0.4999999)
      result._y = 2 * Math.atan2(qy, qw), result._x = Math.PI / 2, result._z = 0, result._isDirty = !0;
    else if (zAxisY > limit)
      result._y = 2 * Math.atan2(qy, qw), result._x = -Math.PI / 2, result._z = 0, result._isDirty = !0;
    else {
      const sqw = qw * qw, sqz = qz * qz, sqx = qx * qx, sqy = qy * qy;
      result._z = Math.atan2(2 * (qx * qy + qz * qw), -sqz - sqx + sqy + sqw), result._x = Math.asin(-2 * zAxisY), result._y = Math.atan2(2 * (qz * qx + qy * qw), sqz - sqx - sqy + sqw), result._isDirty = !0;
    }
    return result;
  }
  toAlphaBetaGammaToRef(result) {
    const qz = this._z, qx = this._x, qy = this._y, qw = this._w, sinHalfBeta = Math.sqrt(qx * qx + qy * qy), cosHalfBeta = Math.sqrt(qz * qz + qw * qw), beta = 2 * Math.atan2(sinHalfBeta, cosHalfBeta), gammaPlusAlpha = 2 * Math.atan2(qz, qw), gammaMinusAlpha = 2 * Math.atan2(qy, qx), gamma = (gammaPlusAlpha + gammaMinusAlpha) / 2, alpha = (gammaPlusAlpha - gammaMinusAlpha) / 2;
    return result.set(alpha, beta, gamma), result;
  }
  toRotationMatrix(result) {
    return Matrix.FromQuaternionToRef(this, result), result;
  }
  fromRotationMatrix(matrix) {
    return Quaternion2.FromRotationMatrixToRef(matrix, this), this;
  }
  dot(other) {
    return this._x * other._x + this._y * other._y + this._z * other._z + this._w * other._w;
  }
  toAxisAngle() {
    const axis = Vector3.Zero();
    return {
      axis,
      angle: this.toAxisAngleToRef(axis)
    };
  }
  toAxisAngleToRef(axis) {
    let angle;
    const sinHalfAngle = Math.sqrt(this._x * this._x + this._y * this._y + this._z * this._z), cosHalfAngle = this._w;
    return sinHalfAngle > 0 ? (angle = 2 * Math.atan2(sinHalfAngle, cosHalfAngle), axis.set(this._x / sinHalfAngle, this._y / sinHalfAngle, this._z / sinHalfAngle)) : (angle = 0, axis.set(1, 0, 0)), angle;
  }
  static FromRotationMatrix(matrix) {
    const result = new Quaternion2();
    return Quaternion2.FromRotationMatrixToRef(matrix, result), result;
  }
  static FromRotationMatrixToRef(matrix, result) {
    const data = matrix.m, m11 = data[0], m12 = data[4], m13 = data[8], m21 = data[1], m22 = data[5], m23 = data[9], m31 = data[2], m32 = data[6], m33 = data[10], trace = m11 + m22 + m33;
    let s;
    return trace > 0 ? (s = 0.5 / Math.sqrt(trace + 1), result._w = 0.25 / s, result._x = (m32 - m23) * s, result._y = (m13 - m31) * s, result._z = (m21 - m12) * s, result._isDirty = !0) : m11 > m22 && m11 > m33 ? (s = 2 * Math.sqrt(1 + m11 - m22 - m33), result._w = (m32 - m23) / s, result._x = 0.25 * s, result._y = (m12 + m21) / s, result._z = (m13 + m31) / s, result._isDirty = !0) : m22 > m33 ? (s = 2 * Math.sqrt(1 + m22 - m11 - m33), result._w = (m13 - m31) / s, result._x = (m12 + m21) / s, result._y = 0.25 * s, result._z = (m23 + m32) / s, result._isDirty = !0) : (s = 2 * Math.sqrt(1 + m33 - m11 - m22), result._w = (m21 - m12) / s, result._x = (m13 + m31) / s, result._y = (m23 + m32) / s, result._z = 0.25 * s, result._isDirty = !0), result;
  }
  static Dot(left, right) {
    return left._x * right._x + left._y * right._y + left._z * right._z + left._w * right._w;
  }
  static AreClose(quat0, quat1, epsilon = 0.1) {
    const dot = Quaternion2.Dot(quat0, quat1);
    return 1 - dot * dot <= epsilon;
  }
  static SmoothToRef(source, goal, deltaTime, lerpTime, result) {
    let slerp = lerpTime === 0 ? 1 : deltaTime / lerpTime;
    return slerp = Clamp(slerp, 0, 1), Quaternion2.SlerpToRef(source, goal, slerp, result), result;
  }
  static Zero() {
    return new Quaternion2(0, 0, 0, 0);
  }
  static Inverse(q) {
    return new Quaternion2(-q._x, -q._y, -q._z, q._w);
  }
  static InverseToRef(q, result) {
    return result.set(-q._x, -q._y, -q._z, q._w), result;
  }
  static Identity() {
    return new Quaternion2(0, 0, 0, 1);
  }
  static IsIdentity(quaternion) {
    return quaternion && quaternion._x === 0 && quaternion._y === 0 && quaternion._z === 0 && quaternion._w === 1;
  }
  static RotationAxis(axis, angle) {
    return Quaternion2.RotationAxisToRef(axis, angle, new Quaternion2());
  }
  static RotationAxisToRef(axis, angle, result) {
    result._w = Math.cos(angle / 2);
    const sinByLength = Math.sin(angle / 2) / axis.length();
    return result._x = axis._x * sinByLength, result._y = axis._y * sinByLength, result._z = axis._z * sinByLength, result._isDirty = !0, result;
  }
  static FromArray(array, offset) {
    return offset || (offset = 0), new Quaternion2(array[offset], array[offset + 1], array[offset + 2], array[offset + 3]);
  }
  static FromArrayToRef(array, offset, result) {
    return result._x = array[offset], result._y = array[offset + 1], result._z = array[offset + 2], result._w = array[offset + 3], result._isDirty = !0, result;
  }
  static FromFloatsToRef(x, y, z, w, result) {
    return result.copyFromFloats(x, y, z, w), result;
  }
  static FromEulerAngles(x, y, z) {
    const q = new Quaternion2();
    return Quaternion2.RotationYawPitchRollToRef(y, x, z, q), q;
  }
  static FromEulerAnglesToRef(x, y, z, result) {
    return Quaternion2.RotationYawPitchRollToRef(y, x, z, result), result;
  }
  static FromEulerVector(vec) {
    const q = new Quaternion2();
    return Quaternion2.RotationYawPitchRollToRef(vec._y, vec._x, vec._z, q), q;
  }
  static FromEulerVectorToRef(vec, result) {
    return Quaternion2.RotationYawPitchRollToRef(vec._y, vec._x, vec._z, result), result;
  }
  static FromUnitVectorsToRef(vecFrom, vecTo, result, epsilon = Epsilon) {
    const r = Vector3.Dot(vecFrom, vecTo) + 1;
    return r < epsilon ? Math.abs(vecFrom.x) > Math.abs(vecFrom.z) ? result.set(-vecFrom.y, vecFrom.x, 0, 0) : result.set(0, -vecFrom.z, vecFrom.y, 0) : (Vector3.CrossToRef(vecFrom, vecTo, TmpVectors.Vector3[0]), result.set(TmpVectors.Vector3[0].x, TmpVectors.Vector3[0].y, TmpVectors.Vector3[0].z, r)), result.normalize();
  }
  static RotationYawPitchRoll(yaw, pitch, roll) {
    const q = new Quaternion2();
    return Quaternion2.RotationYawPitchRollToRef(yaw, pitch, roll, q), q;
  }
  static RotationYawPitchRollToRef(yaw, pitch, roll, result) {
    const halfRoll = roll * 0.5, halfPitch = pitch * 0.5, halfYaw = yaw * 0.5, sinRoll = Math.sin(halfRoll), cosRoll = Math.cos(halfRoll), sinPitch = Math.sin(halfPitch), cosPitch = Math.cos(halfPitch), sinYaw = Math.sin(halfYaw), cosYaw = Math.cos(halfYaw);
    return result._x = cosYaw * sinPitch * cosRoll + sinYaw * cosPitch * sinRoll, result._y = sinYaw * cosPitch * cosRoll - cosYaw * sinPitch * sinRoll, result._z = cosYaw * cosPitch * sinRoll - sinYaw * sinPitch * cosRoll, result._w = cosYaw * cosPitch * cosRoll + sinYaw * sinPitch * sinRoll, result._isDirty = !0, result;
  }
  static RotationAlphaBetaGamma(alpha, beta, gamma) {
    const result = new Quaternion2();
    return Quaternion2.RotationAlphaBetaGammaToRef(alpha, beta, gamma, result), result;
  }
  static RotationAlphaBetaGammaToRef(alpha, beta, gamma, result) {
    const halfGammaPlusAlpha = (gamma + alpha) * 0.5, halfGammaMinusAlpha = (gamma - alpha) * 0.5, halfBeta = beta * 0.5;
    return result._x = Math.cos(halfGammaMinusAlpha) * Math.sin(halfBeta), result._y = Math.sin(halfGammaMinusAlpha) * Math.sin(halfBeta), result._z = Math.sin(halfGammaPlusAlpha) * Math.cos(halfBeta), result._w = Math.cos(halfGammaPlusAlpha) * Math.cos(halfBeta), result._isDirty = !0, result;
  }
  static RotationQuaternionFromAxis(axis1, axis2, axis3) {
    const quat = new Quaternion2(0, 0, 0, 0);
    return Quaternion2.RotationQuaternionFromAxisToRef(axis1, axis2, axis3, quat), quat;
  }
  static RotationQuaternionFromAxisToRef(axis1, axis2, axis3, ref) {
    const rotMat = MathTmp.Matrix[0];
    return axis1 = axis1.normalizeToRef(MathTmp.Vector3[0]), axis2 = axis2.normalizeToRef(MathTmp.Vector3[1]), axis3 = axis3.normalizeToRef(MathTmp.Vector3[2]), Matrix.FromXYZAxesToRef(axis1, axis2, axis3, rotMat), Quaternion2.FromRotationMatrixToRef(rotMat, ref), ref;
  }
  static FromLookDirectionLH(forward, up) {
    const quat = new Quaternion2();
    return Quaternion2.FromLookDirectionLHToRef(forward, up, quat), quat;
  }
  static FromLookDirectionLHToRef(forward, up, ref) {
    const rotMat = MathTmp.Matrix[0];
    return Matrix.LookDirectionLHToRef(forward, up, rotMat), Quaternion2.FromRotationMatrixToRef(rotMat, ref), ref;
  }
  static FromLookDirectionRH(forward, up) {
    const quat = new Quaternion2();
    return Quaternion2.FromLookDirectionRHToRef(forward, up, quat), quat;
  }
  static FromLookDirectionRHToRef(forward, up, ref) {
    const rotMat = MathTmp.Matrix[0];
    return Matrix.LookDirectionRHToRef(forward, up, rotMat), Quaternion2.FromRotationMatrixToRef(rotMat, ref);
  }
  static Slerp(left, right, amount) {
    const result = Quaternion2.Identity();
    return Quaternion2.SlerpToRef(left, right, amount, result), result;
  }
  static SlerpToRef(left, right, amount, result) {
    let num2, num3, num4 = left._x * right._x + left._y * right._y + left._z * right._z + left._w * right._w, flag = !1;
    if (num4 < 0 && (flag = !0, num4 = -num4), num4 > 0.999999)
      num3 = 1 - amount, num2 = flag ? -amount : amount;
    else {
      const num5 = Math.acos(num4), num6 = 1 / Math.sin(num5);
      num3 = Math.sin((1 - amount) * num5) * num6, num2 = flag ? -Math.sin(amount * num5) * num6 : Math.sin(amount * num5) * num6;
    }
    return result._x = num3 * left._x + num2 * right._x, result._y = num3 * left._y + num2 * right._y, result._z = num3 * left._z + num2 * right._z, result._w = num3 * left._w + num2 * right._w, result._isDirty = !0, result;
  }
  static Hermite(value1, tangent1, value2, tangent2, amount) {
    const squared = amount * amount, cubed = amount * squared, part1 = 2 * cubed - 3 * squared + 1, part2 = -2 * cubed + 3 * squared, part3 = cubed - 2 * squared + amount, part4 = cubed - squared, x = value1._x * part1 + value2._x * part2 + tangent1._x * part3 + tangent2._x * part4, y = value1._y * part1 + value2._y * part2 + tangent1._y * part3 + tangent2._y * part4, z = value1._z * part1 + value2._z * part2 + tangent1._z * part3 + tangent2._z * part4, w = value1._w * part1 + value2._w * part2 + tangent1._w * part3 + tangent2._w * part4;
    return new Quaternion2(x, y, z, w);
  }
  static Hermite1stDerivative(value1, tangent1, value2, tangent2, time) {
    const result = new Quaternion2();
    return this.Hermite1stDerivativeToRef(value1, tangent1, value2, tangent2, time, result), result;
  }
  static Hermite1stDerivativeToRef(value1, tangent1, value2, tangent2, time, result) {
    const t2 = time * time;
    return result._x = (t2 - time) * 6 * value1._x + (3 * t2 - 4 * time + 1) * tangent1._x + (-t2 + time) * 6 * value2._x + (3 * t2 - 2 * time) * tangent2._x, result._y = (t2 - time) * 6 * value1._y + (3 * t2 - 4 * time + 1) * tangent1._y + (-t2 + time) * 6 * value2._y + (3 * t2 - 2 * time) * tangent2._y, result._z = (t2 - time) * 6 * value1._z + (3 * t2 - 4 * time + 1) * tangent1._z + (-t2 + time) * 6 * value2._z + (3 * t2 - 2 * time) * tangent2._z, result._w = (t2 - time) * 6 * value1._w + (3 * t2 - 4 * time + 1) * tangent1._w + (-t2 + time) * 6 * value2._w + (3 * t2 - 2 * time) * tangent2._w, result._isDirty = !0, result;
  }
  static Normalize(quat) {
    const result = Quaternion2.Zero();
    return Quaternion2.NormalizeToRef(quat, result), result;
  }
  static NormalizeToRef(quat, result) {
    return quat.normalizeToRef(result), result;
  }
  static Clamp(value, min, max) {
    const result = new Quaternion2();
    return Quaternion2.ClampToRef(value, min, max, result), result;
  }
  static ClampToRef(value, min, max, result) {
    return result.copyFromFloats(Clamp(value.x, min.x, max.x), Clamp(value.y, min.y, max.y), Clamp(value.z, min.z, max.z), Clamp(value.w, min.w, max.w));
  }
  static Random(min = 0, max = 1) {
    return new Quaternion2(RandomRange(min, max), RandomRange(min, max), RandomRange(min, max), RandomRange(min, max));
  }
  static RandomToRef(min = 0, max = 1, ref) {
    return ref.copyFromFloats(RandomRange(min, max), RandomRange(min, max), RandomRange(min, max), RandomRange(min, max));
  }
  static Minimize() {
    throw new ReferenceError("Quaternion.Minimize does not make sense");
  }
  static Maximize() {
    throw new ReferenceError("Quaternion.Maximize does not make sense");
  }
  static Distance(value1, value2) {
    return Math.sqrt(Quaternion2.DistanceSquared(value1, value2));
  }
  static DistanceSquared(value1, value2) {
    const x = value1.x - value2.x, y = value1.y - value2.y, z = value1.z - value2.z, w = value1.w - value2.w;
    return x * x + y * y + z * z + w * w;
  }
  static Center(value1, value2) {
    return Quaternion2.CenterToRef(value1, value2, Quaternion2.Zero());
  }
  static CenterToRef(value1, value2, ref) {
    return ref.copyFromFloats((value1.x + value2.x) / 2, (value1.y + value2.y) / 2, (value1.z + value2.z) / 2, (value1.w + value2.w) / 2);
  }
};
Quaternion._V8PerformanceHack = /* @__PURE__ */ new Quaternion(0.5, 0.5, 0.5, 0.5);
var Matrix = class Matrix2 {
  static get Use64Bits() {
    return PerformanceConfigurator.MatrixUse64Bits;
  }
  get m() {
    return this._m;
  }
  markAsUpdated() {
    this.updateFlag = MatrixManagement._UpdateFlagSeed++, this._isIdentity = !1, this._isIdentity3x2 = !1, this._isIdentityDirty = !0, this._isIdentity3x2Dirty = !0;
  }
  _updateIdentityStatus(isIdentity, isIdentityDirty = !1, isIdentity3x2 = !1, isIdentity3x2Dirty = !0) {
    this._isIdentity = isIdentity, this._isIdentity3x2 = isIdentity || isIdentity3x2, this._isIdentityDirty = this._isIdentity ? !1 : isIdentityDirty, this._isIdentity3x2Dirty = this._isIdentity3x2 ? !1 : isIdentity3x2Dirty;
  }
  constructor() {
    this._isIdentity = !1, this._isIdentityDirty = !0, this._isIdentity3x2 = !0, this._isIdentity3x2Dirty = !0, this.updateFlag = -1, PerformanceConfigurator.MatrixTrackPrecisionChange && PerformanceConfigurator.MatrixTrackedMatrices.push(this), this._m = new PerformanceConfigurator.MatrixCurrentType(16), this.markAsUpdated();
  }
  isIdentity() {
    if (this._isIdentityDirty) {
      this._isIdentityDirty = !1;
      const m = this._m;
      this._isIdentity = m[0] === 1 && m[1] === 0 && m[2] === 0 && m[3] === 0 && m[4] === 0 && m[5] === 1 && m[6] === 0 && m[7] === 0 && m[8] === 0 && m[9] === 0 && m[10] === 1 && m[11] === 0 && m[12] === 0 && m[13] === 0 && m[14] === 0 && m[15] === 1;
    }
    return this._isIdentity;
  }
  isIdentityAs3x2() {
    return this._isIdentity3x2Dirty && (this._isIdentity3x2Dirty = !1, this._m[0] !== 1 || this._m[5] !== 1 || this._m[15] !== 1 ? this._isIdentity3x2 = !1 : this._m[1] !== 0 || this._m[2] !== 0 || this._m[3] !== 0 || this._m[4] !== 0 || this._m[6] !== 0 || this._m[7] !== 0 || this._m[8] !== 0 || this._m[9] !== 0 || this._m[10] !== 0 || this._m[11] !== 0 || this._m[12] !== 0 || this._m[13] !== 0 || this._m[14] !== 0 ? this._isIdentity3x2 = !1 : this._isIdentity3x2 = !0), this._isIdentity3x2;
  }
  determinant() {
    if (this._isIdentity === !0) return 1;
    const m = this._m, m00 = m[0], m01 = m[1], m02 = m[2], m03 = m[3], m10 = m[4], m11 = m[5], m12 = m[6], m13 = m[7], m20 = m[8], m21 = m[9], m22 = m[10], m23 = m[11], m30 = m[12], m31 = m[13], m32 = m[14], m33 = m[15], det_22_33 = m22 * m33 - m32 * m23, det_21_33 = m21 * m33 - m31 * m23, det_21_32 = m21 * m32 - m31 * m22, det_20_33 = m20 * m33 - m30 * m23, det_20_32 = m20 * m32 - m22 * m30, det_20_31 = m20 * m31 - m30 * m21, cofact_00 = +(m11 * det_22_33 - m12 * det_21_33 + m13 * det_21_32), cofact_01 = -(m10 * det_22_33 - m12 * det_20_33 + m13 * det_20_32), cofact_02 = +(m10 * det_21_33 - m11 * det_20_33 + m13 * det_20_31), cofact_03 = -(m10 * det_21_32 - m11 * det_20_32 + m12 * det_20_31);
    return m00 * cofact_00 + m01 * cofact_01 + m02 * cofact_02 + m03 * cofact_03;
  }
  toString() {
    return `{${this.m[0]}, ${this.m[1]}, ${this.m[2]}, ${this.m[3]}
${this.m[4]}, ${this.m[5]}, ${this.m[6]}, ${this.m[7]}
${this.m[8]}, ${this.m[9]}, ${this.m[10]}, ${this.m[11]}
${this.m[12]}, ${this.m[13]}, ${this.m[14]}, ${this.m[15]}}`;
  }
  toArray(array = null, index = 0) {
    if (!array) return this._m;
    const m = this._m;
    for (let i = 0; i < 16; i++) array[index + i] = m[i];
    return this;
  }
  asArray() {
    return this._m;
  }
  fromArray(array, index = 0) {
    return Matrix2.FromArrayToRef(array, index, this);
  }
  copyFromFloats(...floats) {
    return Matrix2.FromArrayToRef(floats, 0, this);
  }
  set(...values) {
    const m = this._m;
    for (let i = 0; i < 16; i++) m[i] = values[i];
    return this.markAsUpdated(), this;
  }
  setAll(value) {
    const m = this._m;
    for (let i = 0; i < 16; i++) m[i] = value;
    return this.markAsUpdated(), this;
  }
  invert() {
    return this.invertToRef(this), this;
  }
  reset() {
    return Matrix2.FromValuesToRef(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, this), this._updateIdentityStatus(!1), this;
  }
  add(other) {
    const result = new Matrix2();
    return this.addToRef(other, result), result;
  }
  addToRef(other, result) {
    const m = this._m, resultM = result._m, otherM = other.m;
    for (let index = 0; index < 16; index++) resultM[index] = m[index] + otherM[index];
    return result.markAsUpdated(), result;
  }
  addToSelf(other) {
    const m = this._m, otherM = other.m;
    return m[0] += otherM[0], m[1] += otherM[1], m[2] += otherM[2], m[3] += otherM[3], m[4] += otherM[4], m[5] += otherM[5], m[6] += otherM[6], m[7] += otherM[7], m[8] += otherM[8], m[9] += otherM[9], m[10] += otherM[10], m[11] += otherM[11], m[12] += otherM[12], m[13] += otherM[13], m[14] += otherM[14], m[15] += otherM[15], this.markAsUpdated(), this;
  }
  addInPlace(other) {
    const m = this._m, otherM = other.m;
    for (let i = 0; i < 16; i++) m[i] += otherM[i];
    return this.markAsUpdated(), this;
  }
  addInPlaceFromFloats(...floats) {
    const m = this._m;
    for (let i = 0; i < 16; i++) m[i] += floats[i];
    return this.markAsUpdated(), this;
  }
  subtract(other) {
    const m = this._m, otherM = other.m;
    for (let i = 0; i < 16; i++) m[i] -= otherM[i];
    return this.markAsUpdated(), this;
  }
  subtractToRef(other, result) {
    const m = this._m, otherM = other.m, resultM = result._m;
    for (let i = 0; i < 16; i++) resultM[i] = m[i] - otherM[i];
    return result.markAsUpdated(), result;
  }
  subtractInPlace(other) {
    const m = this._m, otherM = other.m;
    for (let i = 0; i < 16; i++) m[i] -= otherM[i];
    return this.markAsUpdated(), this;
  }
  subtractFromFloats(...floats) {
    return this.subtractFromFloatsToRef(...floats, new Matrix2());
  }
  subtractFromFloatsToRef(...args) {
    const result = args.pop(), m = this._m, resultM = result._m, values = args;
    for (let i = 0; i < 16; i++) resultM[i] = m[i] - values[i];
    return result.markAsUpdated(), result;
  }
  invertToRef(other) {
    return this._isIdentity === !0 ? (Matrix2.IdentityToRef(other), other) : (InvertMatrixToArray(this, other.asArray()) ? other.markAsUpdated() : other.copyFrom(this), other);
  }
  addAtIndex(index, value) {
    return this._m[index] += value, this.markAsUpdated(), this;
  }
  multiplyAtIndex(index, value) {
    return this._m[index] *= value, this.markAsUpdated(), this;
  }
  setTranslationFromFloats(x, y, z) {
    return this._m[12] = x, this._m[13] = y, this._m[14] = z, this.markAsUpdated(), this;
  }
  addTranslationFromFloats(x, y, z) {
    return this._m[12] += x, this._m[13] += y, this._m[14] += z, this.markAsUpdated(), this;
  }
  setTranslation(vector3) {
    return this.setTranslationFromFloats(vector3._x, vector3._y, vector3._z);
  }
  getTranslation() {
    return new Vector3(this._m[12], this._m[13], this._m[14]);
  }
  getTranslationToRef(result) {
    return result.x = this._m[12], result.y = this._m[13], result.z = this._m[14], result;
  }
  removeRotationAndScaling() {
    const m = this.m;
    return Matrix2.FromValuesToRef(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, m[12], m[13], m[14], m[15], this), this._updateIdentityStatus(m[12] === 0 && m[13] === 0 && m[14] === 0 && m[15] === 1), this;
  }
  copyFrom(other) {
    other.copyToArray(this._m);
    const o = other;
    return this.updateFlag = o.updateFlag, this._updateIdentityStatus(o._isIdentity, o._isIdentityDirty, o._isIdentity3x2, o._isIdentity3x2Dirty), this;
  }
  copyToArray(array, offset = 0) {
    return CopyMatrixToArray(this, array, offset), this;
  }
  multiply(other) {
    const result = new Matrix2();
    return this.multiplyToRef(other, result), result;
  }
  multiplyInPlace(other) {
    const m = this._m, otherM = other.m;
    for (let i = 0; i < 16; i++) m[i] *= otherM[i];
    return this.markAsUpdated(), this;
  }
  multiplyByFloats(...floats) {
    const m = this._m;
    for (let i = 0; i < 16; i++) m[i] *= floats[i];
    return this.markAsUpdated(), this;
  }
  multiplyByFloatsToRef(...args) {
    const result = args.pop(), m = this._m, resultM = result._m, values = args;
    for (let i = 0; i < 16; i++) resultM[i] = m[i] * values[i];
    return result.markAsUpdated(), result;
  }
  multiplyToRef(other, result) {
    return this._isIdentity ? (result.copyFrom(other), result) : other._isIdentity ? (result.copyFrom(this), result) : (this.multiplyToArray(other, result._m, 0), result.markAsUpdated(), result);
  }
  multiplyToArray(other, result, offset) {
    return MultiplyMatricesToArray(this, other, result, offset), this;
  }
  divide(other) {
    return this.divideToRef(other, new Matrix2());
  }
  divideToRef(other, result) {
    const m = this._m, otherM = other.m, resultM = result._m;
    for (let i = 0; i < 16; i++) resultM[i] = m[i] / otherM[i];
    return result.markAsUpdated(), result;
  }
  divideInPlace(other) {
    const m = this._m, otherM = other.m;
    for (let i = 0; i < 16; i++) m[i] /= otherM[i];
    return this.markAsUpdated(), this;
  }
  minimizeInPlace(other) {
    const m = this._m, otherM = other.m;
    for (let i = 0; i < 16; i++) m[i] = Math.min(m[i], otherM[i]);
    return this.markAsUpdated(), this;
  }
  minimizeInPlaceFromFloats(...floats) {
    const m = this._m;
    for (let i = 0; i < 16; i++) m[i] = Math.min(m[i], floats[i]);
    return this.markAsUpdated(), this;
  }
  maximizeInPlace(other) {
    const m = this._m, otherM = other.m;
    for (let i = 0; i < 16; i++) m[i] = Math.min(m[i], otherM[i]);
    return this.markAsUpdated(), this;
  }
  maximizeInPlaceFromFloats(...floats) {
    const m = this._m;
    for (let i = 0; i < 16; i++) m[i] = Math.min(m[i], floats[i]);
    return this.markAsUpdated(), this;
  }
  negate() {
    return this.negateToRef(new Matrix2());
  }
  negateInPlace() {
    const m = this._m;
    for (let i = 0; i < 16; i++) m[i] = -m[i];
    return this.markAsUpdated(), this;
  }
  negateToRef(result) {
    const m = this._m, resultM = result._m;
    for (let i = 0; i < 16; i++) resultM[i] = -m[i];
    return result.markAsUpdated(), result;
  }
  equals(value) {
    const other = value;
    if (!other) return !1;
    if ((this._isIdentity || other._isIdentity) && !this._isIdentityDirty && !other._isIdentityDirty)
      return this._isIdentity && other._isIdentity;
    const m = this.m, om = other.m;
    return m[0] === om[0] && m[1] === om[1] && m[2] === om[2] && m[3] === om[3] && m[4] === om[4] && m[5] === om[5] && m[6] === om[6] && m[7] === om[7] && m[8] === om[8] && m[9] === om[9] && m[10] === om[10] && m[11] === om[11] && m[12] === om[12] && m[13] === om[13] && m[14] === om[14] && m[15] === om[15];
  }
  equalsWithEpsilon(other, epsilon = 0) {
    const m = this._m, otherM = other.m;
    for (let i = 0; i < 16; i++) if (!WithinEpsilon(m[i], otherM[i], epsilon)) return !1;
    return !0;
  }
  equalsToFloats(...floats) {
    const m = this._m;
    for (let i = 0; i < 16; i++) if (m[i] != floats[i]) return !1;
    return !0;
  }
  floor() {
    return this.floorToRef(new Matrix2());
  }
  floorToRef(result) {
    const m = this._m, resultM = result._m;
    for (let i = 0; i < 16; i++) resultM[i] = Math.floor(m[i]);
    return result.markAsUpdated(), result;
  }
  fract() {
    return this.fractToRef(new Matrix2());
  }
  fractToRef(result) {
    const m = this._m, resultM = result._m;
    for (let i = 0; i < 16; i++) resultM[i] = m[i] - Math.floor(m[i]);
    return result.markAsUpdated(), result;
  }
  clone() {
    const matrix = new Matrix2();
    return matrix.copyFrom(this), matrix;
  }
  getClassName() {
    return "Matrix";
  }
  getHashCode() {
    let hash = ExtractAsInt(this._m[0]);
    for (let i = 1; i < 16; i++) hash = hash * 397 ^ ExtractAsInt(this._m[i]);
    return hash;
  }
  decomposeToTransformNode(node) {
    return node.rotationQuaternion = node.rotationQuaternion || new Quaternion(), this.decompose(node.scaling, node.rotationQuaternion, node.position);
  }
  decompose(scale, rotation, translation, preserveScalingNode, useAbsoluteScaling = !0) {
    if (this._isIdentity)
      return translation && translation.setAll(0), scale && scale.setAll(1), rotation && rotation.copyFromFloats(0, 0, 0, 1), !0;
    const m = this._m;
    if (translation && translation.copyFromFloats(m[12], m[13], m[14]), scale = scale || MathTmp.Vector3[0], scale.x = Math.sqrt(m[0] * m[0] + m[1] * m[1] + m[2] * m[2]), scale.y = Math.sqrt(m[4] * m[4] + m[5] * m[5] + m[6] * m[6]), scale.z = Math.sqrt(m[8] * m[8] + m[9] * m[9] + m[10] * m[10]), preserveScalingNode) {
      const signX = (useAbsoluteScaling ? preserveScalingNode.absoluteScaling.x : preserveScalingNode.scaling.x) < 0 ? -1 : 1, signY = (useAbsoluteScaling ? preserveScalingNode.absoluteScaling.y : preserveScalingNode.scaling.y) < 0 ? -1 : 1, signZ = (useAbsoluteScaling ? preserveScalingNode.absoluteScaling.z : preserveScalingNode.scaling.z) < 0 ? -1 : 1;
      scale.x *= signX, scale.y *= signY, scale.z *= signZ;
    } else this.determinant() <= 0 && (scale.y *= -1);
    if (scale._x === 0 || scale._y === 0 || scale._z === 0)
      return rotation && rotation.copyFromFloats(0, 0, 0, 1), !1;
    if (rotation) {
      const sx = 1 / scale._x, sy = 1 / scale._y, sz = 1 / scale._z;
      Matrix2.FromValuesToRef(m[0] * sx, m[1] * sx, m[2] * sx, 0, m[4] * sy, m[5] * sy, m[6] * sy, 0, m[8] * sz, m[9] * sz, m[10] * sz, 0, 0, 0, 0, 1, MathTmp.Matrix[0]), Quaternion.FromRotationMatrixToRef(MathTmp.Matrix[0], rotation);
    }
    return !0;
  }
  getRow(index) {
    if (index < 0 || index > 3) return null;
    const i = index * 4;
    return new Vector4(this._m[i + 0], this._m[i + 1], this._m[i + 2], this._m[i + 3]);
  }
  getRowToRef(index, rowVector) {
    if (index >= 0 && index <= 3) {
      const i = index * 4;
      rowVector.x = this._m[i + 0], rowVector.y = this._m[i + 1], rowVector.z = this._m[i + 2], rowVector.w = this._m[i + 3];
    }
    return rowVector;
  }
  setRow(index, row) {
    return this.setRowFromFloats(index, row.x, row.y, row.z, row.w);
  }
  transpose() {
    const result = new Matrix2();
    return Matrix2.TransposeToRef(this, result), result;
  }
  transposeToRef(result) {
    return Matrix2.TransposeToRef(this, result), result;
  }
  setRowFromFloats(index, x, y, z, w) {
    if (index < 0 || index > 3) return this;
    const i = index * 4;
    return this._m[i + 0] = x, this._m[i + 1] = y, this._m[i + 2] = z, this._m[i + 3] = w, this.markAsUpdated(), this;
  }
  scale(scale) {
    const result = new Matrix2();
    return this.scaleToRef(scale, result), result;
  }
  scaleToRef(scale, result) {
    for (let index = 0; index < 16; index++) result._m[index] = this._m[index] * scale;
    return result.markAsUpdated(), result;
  }
  scaleAndAddToRef(scale, result) {
    for (let index = 0; index < 16; index++) result._m[index] += this._m[index] * scale;
    return result.markAsUpdated(), result;
  }
  scaleInPlace(scale) {
    const m = this._m;
    for (let i = 0; i < 16; i++) m[i] *= scale;
    return this.markAsUpdated(), this;
  }
  toNormalMatrix(ref) {
    const tmp = MathTmp.Matrix[0];
    this.invertToRef(tmp), tmp.transposeToRef(ref);
    const m = ref._m;
    return Matrix2.FromValuesToRef(m[0], m[1], m[2], 0, m[4], m[5], m[6], 0, m[8], m[9], m[10], 0, 0, 0, 0, 1, ref), ref;
  }
  getRotationMatrix() {
    const result = new Matrix2();
    return this.getRotationMatrixToRef(result), result;
  }
  getRotationMatrixToRef(result) {
    const scale = MathTmp.Vector3[0];
    if (!this.decompose(scale))
      return Matrix2.IdentityToRef(result), result;
    const m = this._m, sx = 1 / scale._x, sy = 1 / scale._y, sz = 1 / scale._z;
    return Matrix2.FromValuesToRef(m[0] * sx, m[1] * sx, m[2] * sx, 0, m[4] * sy, m[5] * sy, m[6] * sy, 0, m[8] * sz, m[9] * sz, m[10] * sz, 0, 0, 0, 0, 1, result), result;
  }
  toggleModelMatrixHandInPlace() {
    const m = this._m;
    return m[2] *= -1, m[6] *= -1, m[8] *= -1, m[9] *= -1, m[14] *= -1, this.markAsUpdated(), this;
  }
  toggleProjectionMatrixHandInPlace() {
    const m = this._m;
    return m[8] *= -1, m[9] *= -1, m[10] *= -1, m[11] *= -1, this.markAsUpdated(), this;
  }
  static FromArray(array, offset = 0) {
    const result = new Matrix2();
    return Matrix2.FromArrayToRef(array, offset, result), result;
  }
  static FromArrayToRef(array, offset, result) {
    for (let index = 0; index < 16; index++) result._m[index] = array[index + offset];
    return result.markAsUpdated(), result;
  }
  static FromFloat32ArrayToRefScaled(array, offset, scale, result) {
    return result._m[0] = array[0 + offset] * scale, result._m[1] = array[1 + offset] * scale, result._m[2] = array[2 + offset] * scale, result._m[3] = array[3 + offset] * scale, result._m[4] = array[4 + offset] * scale, result._m[5] = array[5 + offset] * scale, result._m[6] = array[6 + offset] * scale, result._m[7] = array[7 + offset] * scale, result._m[8] = array[8 + offset] * scale, result._m[9] = array[9 + offset] * scale, result._m[10] = array[10 + offset] * scale, result._m[11] = array[11 + offset] * scale, result._m[12] = array[12 + offset] * scale, result._m[13] = array[13 + offset] * scale, result._m[14] = array[14 + offset] * scale, result._m[15] = array[15 + offset] * scale, result.markAsUpdated(), result;
  }
  static get IdentityReadOnly() {
    return Matrix2._IdentityReadOnly;
  }
  static FromValuesToRef(initialM11, initialM12, initialM13, initialM14, initialM21, initialM22, initialM23, initialM24, initialM31, initialM32, initialM33, initialM34, initialM41, initialM42, initialM43, initialM44, result) {
    const m = result._m;
    m[0] = initialM11, m[1] = initialM12, m[2] = initialM13, m[3] = initialM14, m[4] = initialM21, m[5] = initialM22, m[6] = initialM23, m[7] = initialM24, m[8] = initialM31, m[9] = initialM32, m[10] = initialM33, m[11] = initialM34, m[12] = initialM41, m[13] = initialM42, m[14] = initialM43, m[15] = initialM44, result.markAsUpdated();
  }
  static FromValues(initialM11, initialM12, initialM13, initialM14, initialM21, initialM22, initialM23, initialM24, initialM31, initialM32, initialM33, initialM34, initialM41, initialM42, initialM43, initialM44) {
    const result = new Matrix2(), m = result._m;
    return m[0] = initialM11, m[1] = initialM12, m[2] = initialM13, m[3] = initialM14, m[4] = initialM21, m[5] = initialM22, m[6] = initialM23, m[7] = initialM24, m[8] = initialM31, m[9] = initialM32, m[10] = initialM33, m[11] = initialM34, m[12] = initialM41, m[13] = initialM42, m[14] = initialM43, m[15] = initialM44, result.markAsUpdated(), result;
  }
  static Compose(scale, rotation, translation) {
    const result = new Matrix2();
    return Matrix2.ComposeToRef(scale, rotation, translation, result), result;
  }
  static ComposeToRef(scale, rotation, translation, result) {
    const m = result._m, x = rotation._x, y = rotation._y, z = rotation._z, w = rotation._w, x2 = x + x, y2 = y + y, z2 = z + z, xx = x * x2, xy = x * y2, xz = x * z2, yy = y * y2, yz = y * z2, zz = z * z2, wx = w * x2, wy = w * y2, wz = w * z2, sx = scale._x, sy = scale._y, sz = scale._z;
    return m[0] = (1 - (yy + zz)) * sx, m[1] = (xy + wz) * sx, m[2] = (xz - wy) * sx, m[3] = 0, m[4] = (xy - wz) * sy, m[5] = (1 - (xx + zz)) * sy, m[6] = (yz + wx) * sy, m[7] = 0, m[8] = (xz + wy) * sz, m[9] = (yz - wx) * sz, m[10] = (1 - (xx + yy)) * sz, m[11] = 0, m[12] = translation._x, m[13] = translation._y, m[14] = translation._z, m[15] = 1, result.markAsUpdated(), result;
  }
  static Identity() {
    const identity = Matrix2.FromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
    return identity._updateIdentityStatus(!0), identity;
  }
  static IdentityToRef(result) {
    return Matrix2.FromValuesToRef(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, result), result._updateIdentityStatus(!0), result;
  }
  static Zero() {
    const zero = Matrix2.FromValues(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
    return zero._updateIdentityStatus(!1), zero;
  }
  static RotationX(angle) {
    const result = new Matrix2();
    return Matrix2.RotationXToRef(angle, result), result;
  }
  static Invert(source) {
    const result = new Matrix2();
    return source.invertToRef(result), result;
  }
  static RotationXToRef(angle, result) {
    const s = Math.sin(angle), c = Math.cos(angle);
    return Matrix2.FromValuesToRef(1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, result), result._updateIdentityStatus(c === 1 && s === 0), result;
  }
  static RotationY(angle) {
    const result = new Matrix2();
    return Matrix2.RotationYToRef(angle, result), result;
  }
  static RotationYToRef(angle, result) {
    const s = Math.sin(angle), c = Math.cos(angle);
    return Matrix2.FromValuesToRef(c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1, result), result._updateIdentityStatus(c === 1 && s === 0), result;
  }
  static RotationZ(angle) {
    const result = new Matrix2();
    return Matrix2.RotationZToRef(angle, result), result;
  }
  static RotationZToRef(angle, result) {
    const s = Math.sin(angle), c = Math.cos(angle);
    return Matrix2.FromValuesToRef(c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, result), result._updateIdentityStatus(c === 1 && s === 0), result;
  }
  static RotationAxis(axis, angle) {
    const result = new Matrix2();
    return Matrix2.RotationAxisToRef(axis, angle, result), result;
  }
  static RotationAxisToRef(axis, angle, result) {
    const s = Math.sin(-angle), c = Math.cos(-angle), c1 = 1 - c;
    axis = axis.normalizeToRef(MathTmp.Vector3[0]);
    const m = result._m;
    return m[0] = axis._x * axis._x * c1 + c, m[1] = axis._x * axis._y * c1 - axis._z * s, m[2] = axis._x * axis._z * c1 + axis._y * s, m[3] = 0, m[4] = axis._y * axis._x * c1 + axis._z * s, m[5] = axis._y * axis._y * c1 + c, m[6] = axis._y * axis._z * c1 - axis._x * s, m[7] = 0, m[8] = axis._z * axis._x * c1 - axis._y * s, m[9] = axis._z * axis._y * c1 + axis._x * s, m[10] = axis._z * axis._z * c1 + c, m[11] = 0, m[12] = 0, m[13] = 0, m[14] = 0, m[15] = 1, result.markAsUpdated(), result;
  }
  static RotationAlignToRef(from, to, result, useYAxisForCoplanar = !1) {
    const c = Vector3.Dot(to, from), m = result._m;
    if (c < -1 + 1e-3)
      m[0] = -1, m[1] = 0, m[2] = 0, m[3] = 0, m[4] = 0, m[5] = useYAxisForCoplanar ? 1 : -1, m[6] = 0, m[7] = 0, m[8] = 0, m[9] = 0, m[10] = useYAxisForCoplanar ? -1 : 1, m[11] = 0;
    else {
      const v = Vector3.Cross(to, from), k = 1 / (1 + c);
      m[0] = v._x * v._x * k + c, m[1] = v._y * v._x * k - v._z, m[2] = v._z * v._x * k + v._y, m[3] = 0, m[4] = v._x * v._y * k + v._z, m[5] = v._y * v._y * k + c, m[6] = v._z * v._y * k - v._x, m[7] = 0, m[8] = v._x * v._z * k - v._y, m[9] = v._y * v._z * k + v._x, m[10] = v._z * v._z * k + c, m[11] = 0;
    }
    return m[12] = 0, m[13] = 0, m[14] = 0, m[15] = 1, result.markAsUpdated(), result;
  }
  static RotationYawPitchRoll(yaw, pitch, roll) {
    const result = new Matrix2();
    return Matrix2.RotationYawPitchRollToRef(yaw, pitch, roll, result), result;
  }
  static RotationYawPitchRollToRef(yaw, pitch, roll, result) {
    return Quaternion.RotationYawPitchRollToRef(yaw, pitch, roll, MathTmp.Quaternion[0]), MathTmp.Quaternion[0].toRotationMatrix(result), result;
  }
  static Scaling(x, y, z) {
    const result = new Matrix2();
    return Matrix2.ScalingToRef(x, y, z, result), result;
  }
  static ScalingToRef(x, y, z, result) {
    return Matrix2.FromValuesToRef(x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1, result), result._updateIdentityStatus(x === 1 && y === 1 && z === 1), result;
  }
  static Translation(x, y, z) {
    const result = new Matrix2();
    return Matrix2.TranslationToRef(x, y, z, result), result;
  }
  static TranslationToRef(x, y, z, result) {
    return Matrix2.FromValuesToRef(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1, result), result._updateIdentityStatus(x === 0 && y === 0 && z === 0), result;
  }
  static Lerp(startValue, endValue, gradient) {
    const result = new Matrix2();
    return Matrix2.LerpToRef(startValue, endValue, gradient, result), result;
  }
  static LerpToRef(startValue, endValue, gradient, result) {
    const resultM = result._m, startM = startValue.m, endM = endValue.m;
    for (let index = 0; index < 16; index++) resultM[index] = startM[index] * (1 - gradient) + endM[index] * gradient;
    return result.markAsUpdated(), result;
  }
  static DecomposeLerp(startValue, endValue, gradient) {
    const result = new Matrix2();
    return Matrix2.DecomposeLerpToRef(startValue, endValue, gradient, result), result;
  }
  static DecomposeLerpToRef(startValue, endValue, gradient, result) {
    const startScale = MathTmp.Vector3[0], startRotation = MathTmp.Quaternion[0], startTranslation = MathTmp.Vector3[1];
    startValue.decompose(startScale, startRotation, startTranslation);
    const endScale = MathTmp.Vector3[2], endRotation = MathTmp.Quaternion[1], endTranslation = MathTmp.Vector3[3];
    endValue.decompose(endScale, endRotation, endTranslation);
    const resultScale = MathTmp.Vector3[4];
    Vector3.LerpToRef(startScale, endScale, gradient, resultScale);
    const resultRotation = MathTmp.Quaternion[2];
    Quaternion.SlerpToRef(startRotation, endRotation, gradient, resultRotation);
    const resultTranslation = MathTmp.Vector3[5];
    return Vector3.LerpToRef(startTranslation, endTranslation, gradient, resultTranslation), Matrix2.ComposeToRef(resultScale, resultRotation, resultTranslation, result), result;
  }
  static LookAtLH(eye, target, up) {
    const result = new Matrix2();
    return Matrix2.LookAtLHToRef(eye, target, up, result), result;
  }
  static LookAtLHToRef(eye, target, up, result) {
    const xAxis = MathTmp.Vector3[0], yAxis = MathTmp.Vector3[1], zAxis = MathTmp.Vector3[2];
    target.subtractToRef(eye, zAxis), zAxis.normalize(), Vector3.CrossToRef(up, zAxis, xAxis);
    const xSquareLength = xAxis.lengthSquared();
    xSquareLength === 0 ? xAxis.x = 1 : xAxis.normalizeFromLength(Math.sqrt(xSquareLength)), Vector3.CrossToRef(zAxis, xAxis, yAxis), yAxis.normalize();
    const ex = -Vector3.Dot(xAxis, eye), ey = -Vector3.Dot(yAxis, eye), ez = -Vector3.Dot(zAxis, eye);
    return Matrix2.FromValuesToRef(xAxis._x, yAxis._x, zAxis._x, 0, xAxis._y, yAxis._y, zAxis._y, 0, xAxis._z, yAxis._z, zAxis._z, 0, ex, ey, ez, 1, result), result;
  }
  static LookAtRH(eye, target, up) {
    const result = new Matrix2();
    return Matrix2.LookAtRHToRef(eye, target, up, result), result;
  }
  static LookAtRHToRef(eye, target, up, result) {
    const xAxis = MathTmp.Vector3[0], yAxis = MathTmp.Vector3[1], zAxis = MathTmp.Vector3[2];
    eye.subtractToRef(target, zAxis), zAxis.normalize(), Vector3.CrossToRef(up, zAxis, xAxis);
    const xSquareLength = xAxis.lengthSquared();
    xSquareLength === 0 ? xAxis.x = 1 : xAxis.normalizeFromLength(Math.sqrt(xSquareLength)), Vector3.CrossToRef(zAxis, xAxis, yAxis), yAxis.normalize();
    const ex = -Vector3.Dot(xAxis, eye), ey = -Vector3.Dot(yAxis, eye), ez = -Vector3.Dot(zAxis, eye);
    return Matrix2.FromValuesToRef(xAxis._x, yAxis._x, zAxis._x, 0, xAxis._y, yAxis._y, zAxis._y, 0, xAxis._z, yAxis._z, zAxis._z, 0, ex, ey, ez, 1, result), result;
  }
  static LookDirectionLH(forward, up) {
    const result = new Matrix2();
    return Matrix2.LookDirectionLHToRef(forward, up, result), result;
  }
  static LookDirectionLHToRef(forward, up, result) {
    const back = MathTmp.Vector3[0];
    back.copyFrom(forward), back.scaleInPlace(-1);
    const left = MathTmp.Vector3[1];
    return Vector3.CrossToRef(up, back, left), Matrix2.FromValuesToRef(left._x, left._y, left._z, 0, up._x, up._y, up._z, 0, back._x, back._y, back._z, 0, 0, 0, 0, 1, result), result;
  }
  static LookDirectionRH(forward, up) {
    const result = new Matrix2();
    return Matrix2.LookDirectionRHToRef(forward, up, result), result;
  }
  static LookDirectionRHToRef(forward, up, result) {
    const right = MathTmp.Vector3[2];
    return Vector3.CrossToRef(up, forward, right), Matrix2.FromValuesToRef(right._x, right._y, right._z, 0, up._x, up._y, up._z, 0, forward._x, forward._y, forward._z, 0, 0, 0, 0, 1, result), result;
  }
  static OrthoLH(width, height, znear, zfar, halfZRange) {
    const matrix = new Matrix2();
    return Matrix2.OrthoLHToRef(width, height, znear, zfar, matrix, halfZRange), matrix;
  }
  static OrthoLHToRef(width, height, znear, zfar, result, halfZRange) {
    const n = znear, f = zfar, a = 2 / width, b = 2 / height, c = 2 / (f - n), d = -(f + n) / (f - n);
    return Matrix2.FromValuesToRef(a, 0, 0, 0, 0, b, 0, 0, 0, 0, c, 0, 0, 0, d, 1, result), halfZRange && result.multiplyToRef(mtxConvertNDCToHalfZRange, result), result._updateIdentityStatus(a === 1 && b === 1 && c === 1 && d === 0), result;
  }
  static OrthoOffCenterLH(left, right, bottom, top, znear, zfar, halfZRange) {
    const matrix = new Matrix2();
    return Matrix2.OrthoOffCenterLHToRef(left, right, bottom, top, znear, zfar, matrix, halfZRange), matrix;
  }
  static OrthoOffCenterLHToRef(left, right, bottom, top, znear, zfar, result, halfZRange) {
    const n = znear, f = zfar, a = 2 / (right - left), b = 2 / (top - bottom), c = 2 / (f - n), d = -(f + n) / (f - n), i0 = (left + right) / (left - right), i1 = (top + bottom) / (bottom - top);
    return Matrix2.FromValuesToRef(a, 0, 0, 0, 0, b, 0, 0, 0, 0, c, 0, i0, i1, d, 1, result), halfZRange && result.multiplyToRef(mtxConvertNDCToHalfZRange, result), result.markAsUpdated(), result;
  }
  static ObliqueOffCenterLHToRef(left, right, bottom, top, znear, zfar, length, angle, distance, result, halfZRange) {
    const a = -length * Math.cos(angle), b = -length * Math.sin(angle);
    return Matrix2.TranslationToRef(0, 0, -distance, MathTmp.Matrix[1]), Matrix2.FromValuesToRef(1, 0, 0, 0, 0, 1, 0, 0, a, b, 1, 0, 0, 0, 0, 1, MathTmp.Matrix[0]), MathTmp.Matrix[1].multiplyToRef(MathTmp.Matrix[0], MathTmp.Matrix[0]), Matrix2.TranslationToRef(0, 0, distance, MathTmp.Matrix[1]), MathTmp.Matrix[0].multiplyToRef(MathTmp.Matrix[1], MathTmp.Matrix[0]), Matrix2.OrthoOffCenterLHToRef(left, right, bottom, top, znear, zfar, result, halfZRange), MathTmp.Matrix[0].multiplyToRef(result, result), result;
  }
  static OrthoOffCenterRH(left, right, bottom, top, znear, zfar, halfZRange) {
    const matrix = new Matrix2();
    return Matrix2.OrthoOffCenterRHToRef(left, right, bottom, top, znear, zfar, matrix, halfZRange), matrix;
  }
  static OrthoOffCenterRHToRef(left, right, bottom, top, znear, zfar, result, halfZRange) {
    return Matrix2.OrthoOffCenterLHToRef(left, right, bottom, top, znear, zfar, result, halfZRange), result._m[10] *= -1, result;
  }
  static ObliqueOffCenterRHToRef(left, right, bottom, top, znear, zfar, length, angle, distance, result, halfZRange) {
    const a = length * Math.cos(angle), b = length * Math.sin(angle);
    return Matrix2.TranslationToRef(0, 0, distance, MathTmp.Matrix[1]), Matrix2.FromValuesToRef(1, 0, 0, 0, 0, 1, 0, 0, a, b, 1, 0, 0, 0, 0, 1, MathTmp.Matrix[0]), MathTmp.Matrix[1].multiplyToRef(MathTmp.Matrix[0], MathTmp.Matrix[0]), Matrix2.TranslationToRef(0, 0, -distance, MathTmp.Matrix[1]), MathTmp.Matrix[0].multiplyToRef(MathTmp.Matrix[1], MathTmp.Matrix[0]), Matrix2.OrthoOffCenterRHToRef(left, right, bottom, top, znear, zfar, result, halfZRange), MathTmp.Matrix[0].multiplyToRef(result, result), result;
  }
  static PerspectiveLH(width, height, znear, zfar, halfZRange, projectionPlaneTilt = 0) {
    const matrix = new Matrix2(), n = znear, f = zfar, a = 2 * n / width, b = 2 * n / height, c = (f + n) / (f - n), d = -2 * f * n / (f - n), rot = Math.tan(projectionPlaneTilt);
    return Matrix2.FromValuesToRef(a, 0, 0, 0, 0, b, 0, rot, 0, 0, c, 1, 0, 0, d, 0, matrix), halfZRange && matrix.multiplyToRef(mtxConvertNDCToHalfZRange, matrix), matrix._updateIdentityStatus(!1), matrix;
  }
  static PerspectiveFovLH(fov, aspect, znear, zfar, halfZRange, projectionPlaneTilt = 0, reverseDepthBufferMode = !1) {
    const matrix = new Matrix2();
    return Matrix2.PerspectiveFovLHToRef(fov, aspect, znear, zfar, matrix, !0, halfZRange, projectionPlaneTilt, reverseDepthBufferMode), matrix;
  }
  static PerspectiveFovLHToRef(fov, aspect, znear, zfar, result, isVerticalFovFixed = !0, halfZRange, projectionPlaneTilt = 0, reverseDepthBufferMode = !1) {
    const n = znear, f = zfar, t = 1 / Math.tan(fov * 0.5), a = isVerticalFovFixed ? t / aspect : t, b = isVerticalFovFixed ? t : t * aspect, c = reverseDepthBufferMode && n === 0 ? -1 : f !== 0 ? (f + n) / (f - n) : 1, d = reverseDepthBufferMode && n === 0 ? 2 * f : f !== 0 ? -2 * f * n / (f - n) : -2 * n, rot = Math.tan(projectionPlaneTilt);
    return Matrix2.FromValuesToRef(a, 0, 0, 0, 0, b, 0, rot, 0, 0, c, 1, 0, 0, d, 0, result), halfZRange && result.multiplyToRef(mtxConvertNDCToHalfZRange, result), result._updateIdentityStatus(!1), result;
  }
  static PerspectiveFovReverseLHToRef(fov, aspect, znear, zfar, result, isVerticalFovFixed = !0, halfZRange, projectionPlaneTilt = 0) {
    const t = 1 / Math.tan(fov * 0.5), a = isVerticalFovFixed ? t / aspect : t, b = isVerticalFovFixed ? t : t * aspect, rot = Math.tan(projectionPlaneTilt);
    return Matrix2.FromValuesToRef(a, 0, 0, 0, 0, b, 0, rot, 0, 0, -znear, 1, 0, 0, 1, 0, result), halfZRange && result.multiplyToRef(mtxConvertNDCToHalfZRange, result), result._updateIdentityStatus(!1), result;
  }
  static PerspectiveFovRH(fov, aspect, znear, zfar, halfZRange, projectionPlaneTilt = 0, reverseDepthBufferMode = !1) {
    const matrix = new Matrix2();
    return Matrix2.PerspectiveFovRHToRef(fov, aspect, znear, zfar, matrix, !0, halfZRange, projectionPlaneTilt, reverseDepthBufferMode), matrix;
  }
  static PerspectiveFovRHToRef(fov, aspect, znear, zfar, result, isVerticalFovFixed = !0, halfZRange, projectionPlaneTilt = 0, reverseDepthBufferMode = !1) {
    const n = znear, f = zfar, t = 1 / Math.tan(fov * 0.5), a = isVerticalFovFixed ? t / aspect : t, b = isVerticalFovFixed ? t : t * aspect, c = reverseDepthBufferMode && n === 0 ? 1 : f !== 0 ? -(f + n) / (f - n) : -1, d = reverseDepthBufferMode && n === 0 ? 2 * f : f !== 0 ? -2 * f * n / (f - n) : -2 * n, rot = Math.tan(projectionPlaneTilt);
    return Matrix2.FromValuesToRef(a, 0, 0, 0, 0, b, 0, rot, 0, 0, c, -1, 0, 0, d, 0, result), halfZRange && result.multiplyToRef(mtxConvertNDCToHalfZRange, result), result._updateIdentityStatus(!1), result;
  }
  static PerspectiveFovReverseRHToRef(fov, aspect, znear, zfar, result, isVerticalFovFixed = !0, halfZRange, projectionPlaneTilt = 0) {
    const t = 1 / Math.tan(fov * 0.5), a = isVerticalFovFixed ? t / aspect : t, b = isVerticalFovFixed ? t : t * aspect, rot = Math.tan(projectionPlaneTilt);
    return Matrix2.FromValuesToRef(a, 0, 0, 0, 0, b, 0, rot, 0, 0, -znear, -1, 0, 0, -1, 0, result), halfZRange && result.multiplyToRef(mtxConvertNDCToHalfZRange, result), result._updateIdentityStatus(!1), result;
  }
  static GetFinalMatrix(viewport, world, view, projection, zmin, zmax) {
    const cw = viewport.width, ch = viewport.height, cx = viewport.x, cy = viewport.y, viewportMatrix = Matrix2.FromValues(cw / 2, 0, 0, 0, 0, -ch / 2, 0, 0, 0, 0, zmax - zmin, 0, cx + cw / 2, ch / 2 + cy, zmin, 1), matrix = new Matrix2();
    return world.multiplyToRef(view, matrix), matrix.multiplyToRef(projection, matrix), matrix.multiplyToRef(viewportMatrix, matrix);
  }
  static GetAsMatrix2x2(matrix) {
    const m = matrix.m, arr = [
      m[0],
      m[1],
      m[4],
      m[5]
    ];
    return PerformanceConfigurator.MatrixUse64Bits ? arr : new Float32Array(arr);
  }
  static GetAsMatrix3x3(matrix) {
    const m = matrix.m, arr = [
      m[0],
      m[1],
      m[2],
      m[4],
      m[5],
      m[6],
      m[8],
      m[9],
      m[10]
    ];
    return PerformanceConfigurator.MatrixUse64Bits ? arr : new Float32Array(arr);
  }
  static Transpose(matrix) {
    const result = new Matrix2();
    return Matrix2.TransposeToRef(matrix, result), result;
  }
  static TransposeToRef(matrix, result) {
    const mm = matrix.m, rm0 = mm[0], rm1 = mm[4], rm2 = mm[8], rm3 = mm[12], rm4 = mm[1], rm5 = mm[5], rm6 = mm[9], rm7 = mm[13], rm8 = mm[2], rm9 = mm[6], rm10 = mm[10], rm11 = mm[14], rm12 = mm[3], rm13 = mm[7], rm14 = mm[11], rm15 = mm[15], rm = result._m;
    return rm[0] = rm0, rm[1] = rm1, rm[2] = rm2, rm[3] = rm3, rm[4] = rm4, rm[5] = rm5, rm[6] = rm6, rm[7] = rm7, rm[8] = rm8, rm[9] = rm9, rm[10] = rm10, rm[11] = rm11, rm[12] = rm12, rm[13] = rm13, rm[14] = rm14, rm[15] = rm15, result.markAsUpdated(), result._updateIdentityStatus(matrix._isIdentity, matrix._isIdentityDirty), result;
  }
  static Reflection(plane) {
    const matrix = new Matrix2();
    return Matrix2.ReflectionToRef(plane, matrix), matrix;
  }
  static ReflectionToRef(plane, result) {
    plane.normalize();
    const x = plane.normal.x, y = plane.normal.y, z = plane.normal.z, temp = -2 * x, temp2 = -2 * y, temp3 = -2 * z;
    return Matrix2.FromValuesToRef(temp * x + 1, temp2 * x, temp3 * x, 0, temp * y, temp2 * y + 1, temp3 * y, 0, temp * z, temp2 * z, temp3 * z + 1, 0, temp * plane.d, temp2 * plane.d, temp3 * plane.d, 1, result), result;
  }
  static FromXYZAxesToRef(xaxis, yaxis, zaxis, result) {
    return Matrix2.FromValuesToRef(xaxis._x, xaxis._y, xaxis._z, 0, yaxis._x, yaxis._y, yaxis._z, 0, zaxis._x, zaxis._y, zaxis._z, 0, 0, 0, 0, 1, result), result;
  }
  static FromQuaternionToRef(quat, result) {
    const xx = quat._x * quat._x, yy = quat._y * quat._y, zz = quat._z * quat._z, xy = quat._x * quat._y, zw = quat._z * quat._w, zx = quat._z * quat._x, yw = quat._y * quat._w, yz = quat._y * quat._z, xw = quat._x * quat._w;
    return result._m[0] = 1 - 2 * (yy + zz), result._m[1] = 2 * (xy + zw), result._m[2] = 2 * (zx - yw), result._m[3] = 0, result._m[4] = 2 * (xy - zw), result._m[5] = 1 - 2 * (zz + xx), result._m[6] = 2 * (yz + xw), result._m[7] = 0, result._m[8] = 2 * (zx + yw), result._m[9] = 2 * (yz - xw), result._m[10] = 1 - 2 * (yy + xx), result._m[11] = 0, result._m[12] = 0, result._m[13] = 0, result._m[14] = 0, result._m[15] = 1, result.markAsUpdated(), result;
  }
};
Matrix._IdentityReadOnly = /* @__PURE__ */ Matrix.Identity();
var MathTmp = class {
};
MathTmp.Vector3 = /* @__PURE__ */ BuildTuple(11, Vector3.Zero);
MathTmp.Matrix = /* @__PURE__ */ BuildTuple(2, Matrix.Identity);
MathTmp.Quaternion = /* @__PURE__ */ BuildTuple(3, Quaternion.Zero);
var TmpVectors = class {
};
TmpVectors.Vector2 = /* @__PURE__ */ BuildTuple(3, Vector2.Zero);
TmpVectors.Vector3 = /* @__PURE__ */ BuildTuple(13, Vector3.Zero);
TmpVectors.Vector4 = /* @__PURE__ */ BuildTuple(3, Vector4.Zero);
TmpVectors.Quaternion = /* @__PURE__ */ BuildTuple(3, Quaternion.Zero);
TmpVectors.Matrix = /* @__PURE__ */ BuildTuple(8, Matrix.Identity);
var mtxConvertNDCToHalfZRange = /* @__PURE__ */ Matrix.FromValues(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0.5, 0, 0, 0, 0.5, 1), _Registered$1 = !1;
function RegisterMathVector() {
  _Registered$1 || (_Registered$1 = !0, Object.defineProperties(Vector2.prototype, {
    dimension: { value: [2] },
    rank: { value: 1 }
  }), Object.defineProperties(Vector3.prototype, {
    dimension: { value: [3] },
    rank: { value: 1 }
  }), Object.defineProperties(Vector4.prototype, {
    dimension: { value: [4] },
    rank: { value: 1 }
  }), Object.defineProperties(Quaternion.prototype, {
    dimension: { value: [4] },
    rank: { value: 1 }
  }), Object.defineProperties(Matrix.prototype, {
    dimension: { value: [4, 4] },
    rank: { value: 2 }
  }), RegisterClass("BABYLON.Vector2", Vector2), RegisterClass("BABYLON.Vector3", Vector3), RegisterClass("BABYLON.Vector4", Vector4), RegisterClass("BABYLON.Matrix", Matrix));
}
function ColorChannelToLinearSpace(color) {
  return Math.pow(color, ToLinearSpace);
}
function ColorChannelToLinearSpaceExact(color) {
  return color <= 0.04045 ? 0.0773993808 * color : Math.pow(0.947867299 * (color + 0.055), 2.4);
}
function ColorChannelToGammaSpace(color) {
  return Math.pow(color, ToGammaSpace);
}
function ColorChannelToGammaSpaceExact(color) {
  return color <= 31308e-7 ? 12.92 * color : 1.055 * Math.pow(color, 0.41666) - 0.055;
}
var Color3 = class Color32 {
  constructor(r = 0, g = 0, b = 0) {
    this.r = r, this.g = g, this.b = b;
  }
  toString() {
    return "{R: " + this.r + " G:" + this.g + " B:" + this.b + "}";
  }
  getClassName() {
    return "Color3";
  }
  getHashCode() {
    let hash = this.r * 255 | 0;
    return hash = hash * 397 ^ (this.g * 255 | 0), hash = hash * 397 ^ (this.b * 255 | 0), hash;
  }
  toArray(array, index = 0) {
    return array[index] = this.r, array[index + 1] = this.g, array[index + 2] = this.b, this;
  }
  fromArray(array, offset = 0) {
    return Color32.FromArrayToRef(array, offset, this), this;
  }
  toColor4(alpha = 1) {
    return new Color4(this.r, this.g, this.b, alpha);
  }
  asArray() {
    return [
      this.r,
      this.g,
      this.b
    ];
  }
  toLuminance() {
    return this.r * 0.3 + this.g * 0.59 + this.b * 0.11;
  }
  multiply(otherColor) {
    return new Color32(this.r * otherColor.r, this.g * otherColor.g, this.b * otherColor.b);
  }
  multiplyToRef(otherColor, result) {
    return result.r = this.r * otherColor.r, result.g = this.g * otherColor.g, result.b = this.b * otherColor.b, result;
  }
  multiplyInPlace(otherColor) {
    return this.r *= otherColor.r, this.g *= otherColor.g, this.b *= otherColor.b, this;
  }
  multiplyByFloats(r, g, b) {
    return new Color32(this.r * r, this.g * g, this.b * b);
  }
  divide(_other) {
    throw new ReferenceError("Can not divide a color");
  }
  divideToRef(_other, _result) {
    throw new ReferenceError("Can not divide a color");
  }
  divideInPlace(_other) {
    throw new ReferenceError("Can not divide a color");
  }
  minimizeInPlace(other) {
    return this.minimizeInPlaceFromFloats(other.r, other.g, other.b);
  }
  maximizeInPlace(other) {
    return this.maximizeInPlaceFromFloats(other.r, other.g, other.b);
  }
  minimizeInPlaceFromFloats(r, g, b) {
    return this.r = Math.min(r, this.r), this.g = Math.min(g, this.g), this.b = Math.min(b, this.b), this;
  }
  maximizeInPlaceFromFloats(r, g, b) {
    return this.r = Math.max(r, this.r), this.g = Math.max(g, this.g), this.b = Math.max(b, this.b), this;
  }
  floorToRef(_result) {
    throw new ReferenceError("Can not floor a color");
  }
  floor() {
    throw new ReferenceError("Can not floor a color");
  }
  fractToRef(_result) {
    throw new ReferenceError("Can not fract a color");
  }
  fract() {
    throw new ReferenceError("Can not fract a color");
  }
  equals(otherColor) {
    return otherColor && this.r === otherColor.r && this.g === otherColor.g && this.b === otherColor.b;
  }
  equalsFloats(r, g, b) {
    return this.equalsToFloats(r, g, b);
  }
  equalsToFloats(r, g, b) {
    return this.r === r && this.g === g && this.b === b;
  }
  equalsWithEpsilon(otherColor, epsilon = Epsilon) {
    return WithinEpsilon(this.r, otherColor.r, epsilon) && WithinEpsilon(this.g, otherColor.g, epsilon) && WithinEpsilon(this.b, otherColor.b, epsilon);
  }
  negate() {
    throw new ReferenceError("Can not negate a color");
  }
  negateInPlace() {
    throw new ReferenceError("Can not negate a color");
  }
  negateToRef(_result) {
    throw new ReferenceError("Can not negate a color");
  }
  scale(scale) {
    return new Color32(this.r * scale, this.g * scale, this.b * scale);
  }
  scaleInPlace(scale) {
    return this.r *= scale, this.g *= scale, this.b *= scale, this;
  }
  scaleToRef(scale, result) {
    return result.r = this.r * scale, result.g = this.g * scale, result.b = this.b * scale, result;
  }
  scaleAndAddToRef(scale, result) {
    return result.r += this.r * scale, result.g += this.g * scale, result.b += this.b * scale, result;
  }
  clampToRef(min = 0, max = 1, result) {
    return result.r = Clamp(this.r, min, max), result.g = Clamp(this.g, min, max), result.b = Clamp(this.b, min, max), result;
  }
  add(otherColor) {
    return new Color32(this.r + otherColor.r, this.g + otherColor.g, this.b + otherColor.b);
  }
  addInPlace(otherColor) {
    return this.r += otherColor.r, this.g += otherColor.g, this.b += otherColor.b, this;
  }
  addInPlaceFromFloats(r, g, b) {
    return this.r += r, this.g += g, this.b += b, this;
  }
  addToRef(otherColor, result) {
    return result.r = this.r + otherColor.r, result.g = this.g + otherColor.g, result.b = this.b + otherColor.b, result;
  }
  subtract(otherColor) {
    return new Color32(this.r - otherColor.r, this.g - otherColor.g, this.b - otherColor.b);
  }
  subtractToRef(otherColor, result) {
    return result.r = this.r - otherColor.r, result.g = this.g - otherColor.g, result.b = this.b - otherColor.b, result;
  }
  subtractInPlace(otherColor) {
    return this.r -= otherColor.r, this.g -= otherColor.g, this.b -= otherColor.b, this;
  }
  subtractFromFloats(r, g, b) {
    return new Color32(this.r - r, this.g - g, this.b - b);
  }
  subtractFromFloatsToRef(r, g, b, result) {
    return result.r = this.r - r, result.g = this.g - g, result.b = this.b - b, result;
  }
  clone() {
    return new Color32(this.r, this.g, this.b);
  }
  copyFrom(source) {
    return this.r = source.r, this.g = source.g, this.b = source.b, this;
  }
  copyFromFloats(r, g, b) {
    return this.r = r, this.g = g, this.b = b, this;
  }
  set(r, g, b) {
    return this.copyFromFloats(r, g, b);
  }
  setAll(v) {
    return this.r = this.g = this.b = v, this;
  }
  toHexString() {
    const intR = Math.round(this.r * 255), intG = Math.round(this.g * 255), intB = Math.round(this.b * 255);
    return "#" + ToHex(intR) + ToHex(intG) + ToHex(intB);
  }
  fromHexString(hex) {
    return hex.substring(0, 1) !== "#" || hex.length !== 7 ? this : (this.r = parseInt(hex.substring(1, 3), 16) / 255, this.g = parseInt(hex.substring(3, 5), 16) / 255, this.b = parseInt(hex.substring(5, 7), 16) / 255, this);
  }
  toHSV() {
    return this.toHSVToRef(new Color32());
  }
  toHSVToRef(result) {
    const r = this.r, g = this.g, b = this.b, max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const v = max, dm = max - min;
    return max !== 0 && (s = dm / max), max != min && (max == r ? (h = (g - b) / dm, g < b && (h += 6)) : max == g ? h = (b - r) / dm + 2 : max == b && (h = (r - g) / dm + 4), h *= 60), result.r = h, result.g = s, result.b = v, result;
  }
  toLinearSpace(exact = !1) {
    const convertedColor = new Color32();
    return this.toLinearSpaceToRef(convertedColor, exact), convertedColor;
  }
  toLinearSpaceToRef(convertedColor, exact = !1) {
    return exact ? (convertedColor.r = ColorChannelToLinearSpaceExact(this.r), convertedColor.g = ColorChannelToLinearSpaceExact(this.g), convertedColor.b = ColorChannelToLinearSpaceExact(this.b)) : (convertedColor.r = ColorChannelToLinearSpace(this.r), convertedColor.g = ColorChannelToLinearSpace(this.g), convertedColor.b = ColorChannelToLinearSpace(this.b)), this;
  }
  toGammaSpace(exact = !1) {
    const convertedColor = new Color32();
    return this.toGammaSpaceToRef(convertedColor, exact), convertedColor;
  }
  toGammaSpaceToRef(convertedColor, exact = !1) {
    return exact ? (convertedColor.r = ColorChannelToGammaSpaceExact(this.r), convertedColor.g = ColorChannelToGammaSpaceExact(this.g), convertedColor.b = ColorChannelToGammaSpaceExact(this.b)) : (convertedColor.r = ColorChannelToGammaSpace(this.r), convertedColor.g = ColorChannelToGammaSpace(this.g), convertedColor.b = ColorChannelToGammaSpace(this.b)), this;
  }
  static HSVtoRGBToRef(hue, saturation, value, result) {
    const chroma = value * saturation, h = hue / 60, x = chroma * (1 - Math.abs(h % 2 - 1));
    let r = 0, g = 0, b = 0;
    h >= 0 && h <= 1 ? (r = chroma, g = x) : h >= 1 && h <= 2 ? (r = x, g = chroma) : h >= 2 && h <= 3 ? (g = chroma, b = x) : h >= 3 && h <= 4 ? (g = x, b = chroma) : h >= 4 && h <= 5 ? (r = x, b = chroma) : h >= 5 && h <= 6 && (r = chroma, b = x);
    const m = value - chroma;
    return result.r = r + m, result.g = g + m, result.b = b + m, result;
  }
  static FromHSV(hue, saturation, value) {
    const result = new Color32(0, 0, 0);
    return Color32.HSVtoRGBToRef(hue, saturation, value, result), result;
  }
  static FromHexString(hex) {
    return new Color32(0, 0, 0).fromHexString(hex);
  }
  static FromArray(array, offset = 0) {
    return new Color32(array[offset], array[offset + 1], array[offset + 2]);
  }
  static FromArrayToRef(array, offset = 0, result) {
    result.r = array[offset], result.g = array[offset + 1], result.b = array[offset + 2];
  }
  static FromInts(r, g, b) {
    return new Color32(r / 255, g / 255, b / 255);
  }
  static Lerp(start, end, amount) {
    const result = new Color32(0, 0, 0);
    return Color32.LerpToRef(start, end, amount, result), result;
  }
  static LerpToRef(left, right, amount, result) {
    result.r = left.r + (right.r - left.r) * amount, result.g = left.g + (right.g - left.g) * amount, result.b = left.b + (right.b - left.b) * amount;
  }
  static Hermite(value1, tangent1, value2, tangent2, amount) {
    const squared = amount * amount, cubed = amount * squared, part1 = 2 * cubed - 3 * squared + 1, part2 = -2 * cubed + 3 * squared, part3 = cubed - 2 * squared + amount, part4 = cubed - squared, r = value1.r * part1 + value2.r * part2 + tangent1.r * part3 + tangent2.r * part4, g = value1.g * part1 + value2.g * part2 + tangent1.g * part3 + tangent2.g * part4, b = value1.b * part1 + value2.b * part2 + tangent1.b * part3 + tangent2.b * part4;
    return new Color32(r, g, b);
  }
  static Hermite1stDerivative(value1, tangent1, value2, tangent2, time) {
    const result = Color32.Black();
    return this.Hermite1stDerivativeToRef(value1, tangent1, value2, tangent2, time, result), result;
  }
  static Hermite1stDerivativeToRef(value1, tangent1, value2, tangent2, time, result) {
    const t2 = time * time;
    result.r = (t2 - time) * 6 * value1.r + (3 * t2 - 4 * time + 1) * tangent1.r + (-t2 + time) * 6 * value2.r + (3 * t2 - 2 * time) * tangent2.r, result.g = (t2 - time) * 6 * value1.g + (3 * t2 - 4 * time + 1) * tangent1.g + (-t2 + time) * 6 * value2.g + (3 * t2 - 2 * time) * tangent2.g, result.b = (t2 - time) * 6 * value1.b + (3 * t2 - 4 * time + 1) * tangent1.b + (-t2 + time) * 6 * value2.b + (3 * t2 - 2 * time) * tangent2.b;
  }
  static Red() {
    return new Color32(1, 0, 0);
  }
  static Green() {
    return new Color32(0, 1, 0);
  }
  static Blue() {
    return new Color32(0, 0, 1);
  }
  static Black() {
    return new Color32(0, 0, 0);
  }
  static get BlackReadOnly() {
    return Color32._BlackReadOnly;
  }
  static White() {
    return new Color32(1, 1, 1);
  }
  static Purple() {
    return new Color32(0.5, 0, 0.5);
  }
  static Magenta() {
    return new Color32(1, 0, 1);
  }
  static Yellow() {
    return new Color32(1, 1, 0);
  }
  static Gray() {
    return new Color32(0.5, 0.5, 0.5);
  }
  static Teal() {
    return new Color32(0, 1, 1);
  }
  static Random() {
    return new Color32(Math.random(), Math.random(), Math.random());
  }
};
Color3._V8PerformanceHack = /* @__PURE__ */ new Color3(0.5, 0.5, 0.5);
Color3._BlackReadOnly = /* @__PURE__ */ Color3.Black();
var Color4 = class Color42 {
  constructor(r = 0, g = 0, b = 0, a = 1) {
    this.r = r, this.g = g, this.b = b, this.a = a;
  }
  asArray() {
    return [
      this.r,
      this.g,
      this.b,
      this.a
    ];
  }
  toArray(array, index = 0) {
    return array[index] = this.r, array[index + 1] = this.g, array[index + 2] = this.b, array[index + 3] = this.a, this;
  }
  fromArray(array, offset = 0) {
    return this.r = array[offset], this.g = array[offset + 1], this.b = array[offset + 2], this.a = array[offset + 3], this;
  }
  equals(otherColor) {
    return otherColor && this.r === otherColor.r && this.g === otherColor.g && this.b === otherColor.b && this.a === otherColor.a;
  }
  add(otherColor) {
    return new Color42(this.r + otherColor.r, this.g + otherColor.g, this.b + otherColor.b, this.a + otherColor.a);
  }
  addToRef(otherColor, result) {
    return result.r = this.r + otherColor.r, result.g = this.g + otherColor.g, result.b = this.b + otherColor.b, result.a = this.a + otherColor.a, result;
  }
  addInPlace(otherColor) {
    return this.r += otherColor.r, this.g += otherColor.g, this.b += otherColor.b, this.a += otherColor.a, this;
  }
  addInPlaceFromFloats(r, g, b, a) {
    return this.r += r, this.g += g, this.b += b, this.a += a, this;
  }
  subtract(otherColor) {
    return new Color42(this.r - otherColor.r, this.g - otherColor.g, this.b - otherColor.b, this.a - otherColor.a);
  }
  subtractToRef(otherColor, result) {
    return result.r = this.r - otherColor.r, result.g = this.g - otherColor.g, result.b = this.b - otherColor.b, result.a = this.a - otherColor.a, result;
  }
  subtractInPlace(otherColor) {
    return this.r -= otherColor.r, this.g -= otherColor.g, this.b -= otherColor.b, this.a -= otherColor.a, this;
  }
  subtractFromFloats(r, g, b, a) {
    return new Color42(this.r - r, this.g - g, this.b - b, this.a - a);
  }
  subtractFromFloatsToRef(r, g, b, a, result) {
    return result.r = this.r - r, result.g = this.g - g, result.b = this.b - b, result.a = this.a - a, result;
  }
  scale(scale) {
    return new Color42(this.r * scale, this.g * scale, this.b * scale, this.a * scale);
  }
  scaleInPlace(scale) {
    return this.r *= scale, this.g *= scale, this.b *= scale, this.a *= scale, this;
  }
  scaleToRef(scale, result) {
    return result.r = this.r * scale, result.g = this.g * scale, result.b = this.b * scale, result.a = this.a * scale, result;
  }
  scaleAndAddToRef(scale, result) {
    return result.r += this.r * scale, result.g += this.g * scale, result.b += this.b * scale, result.a += this.a * scale, result;
  }
  clampToRef(min = 0, max = 1, result) {
    return result.r = Clamp(this.r, min, max), result.g = Clamp(this.g, min, max), result.b = Clamp(this.b, min, max), result.a = Clamp(this.a, min, max), result;
  }
  multiply(color) {
    return new Color42(this.r * color.r, this.g * color.g, this.b * color.b, this.a * color.a);
  }
  multiplyToRef(color, result) {
    return result.r = this.r * color.r, result.g = this.g * color.g, result.b = this.b * color.b, result.a = this.a * color.a, result;
  }
  multiplyInPlace(otherColor) {
    return this.r *= otherColor.r, this.g *= otherColor.g, this.b *= otherColor.b, this.a *= otherColor.a, this;
  }
  multiplyByFloats(r, g, b, a) {
    return new Color42(this.r * r, this.g * g, this.b * b, this.a * a);
  }
  divide(_other) {
    throw new ReferenceError("Can not divide a color");
  }
  divideToRef(_other, _result) {
    throw new ReferenceError("Can not divide a color");
  }
  divideInPlace(_other) {
    throw new ReferenceError("Can not divide a color");
  }
  minimizeInPlace(other) {
    return this.r = Math.min(this.r, other.r), this.g = Math.min(this.g, other.g), this.b = Math.min(this.b, other.b), this.a = Math.min(this.a, other.a), this;
  }
  maximizeInPlace(other) {
    return this.r = Math.max(this.r, other.r), this.g = Math.max(this.g, other.g), this.b = Math.max(this.b, other.b), this.a = Math.max(this.a, other.a), this;
  }
  minimizeInPlaceFromFloats(r, g, b, a) {
    return this.r = Math.min(r, this.r), this.g = Math.min(g, this.g), this.b = Math.min(b, this.b), this.a = Math.min(a, this.a), this;
  }
  maximizeInPlaceFromFloats(r, g, b, a) {
    return this.r = Math.max(r, this.r), this.g = Math.max(g, this.g), this.b = Math.max(b, this.b), this.a = Math.max(a, this.a), this;
  }
  floorToRef(_result) {
    throw new ReferenceError("Can not floor a color");
  }
  floor() {
    throw new ReferenceError("Can not floor a color");
  }
  fractToRef(_result) {
    throw new ReferenceError("Can not fract a color");
  }
  fract() {
    throw new ReferenceError("Can not fract a color");
  }
  negate() {
    throw new ReferenceError("Can not negate a color");
  }
  negateInPlace() {
    throw new ReferenceError("Can not negate a color");
  }
  negateToRef(_result) {
    throw new ReferenceError("Can not negate a color");
  }
  equalsWithEpsilon(otherColor, epsilon = Epsilon) {
    return WithinEpsilon(this.r, otherColor.r, epsilon) && WithinEpsilon(this.g, otherColor.g, epsilon) && WithinEpsilon(this.b, otherColor.b, epsilon) && WithinEpsilon(this.a, otherColor.a, epsilon);
  }
  equalsToFloats(x, y, z, w) {
    return this.r === x && this.g === y && this.b === z && this.a === w;
  }
  toString() {
    return "{R: " + this.r + " G:" + this.g + " B:" + this.b + " A:" + this.a + "}";
  }
  getClassName() {
    return "Color4";
  }
  getHashCode() {
    let hash = this.r * 255 | 0;
    return hash = hash * 397 ^ (this.g * 255 | 0), hash = hash * 397 ^ (this.b * 255 | 0), hash = hash * 397 ^ (this.a * 255 | 0), hash;
  }
  clone() {
    return new Color42().copyFrom(this);
  }
  copyFrom(source) {
    return this.r = source.r, this.g = source.g, this.b = source.b, this.a = source.a, this;
  }
  copyFromFloats(r, g, b, a) {
    return this.r = r, this.g = g, this.b = b, this.a = a, this;
  }
  set(r, g, b, a) {
    return this.copyFromFloats(r, g, b, a);
  }
  setAll(v) {
    return this.r = this.g = this.b = this.a = v, this;
  }
  toHexString(returnAsColor3 = !1) {
    const intR = Math.round(this.r * 255), intG = Math.round(this.g * 255), intB = Math.round(this.b * 255);
    if (returnAsColor3) return "#" + ToHex(intR) + ToHex(intG) + ToHex(intB);
    const intA = Math.round(this.a * 255);
    return "#" + ToHex(intR) + ToHex(intG) + ToHex(intB) + ToHex(intA);
  }
  fromHexString(hex) {
    return hex.substring(0, 1) !== "#" || hex.length !== 9 && hex.length !== 7 ? this : (this.r = parseInt(hex.substring(1, 3), 16) / 255, this.g = parseInt(hex.substring(3, 5), 16) / 255, this.b = parseInt(hex.substring(5, 7), 16) / 255, hex.length === 9 && (this.a = parseInt(hex.substring(7, 9), 16) / 255), this);
  }
  toLinearSpace(exact = !1) {
    const convertedColor = new Color42();
    return this.toLinearSpaceToRef(convertedColor, exact), convertedColor;
  }
  toLinearSpaceToRef(convertedColor, exact = !1) {
    return exact ? (convertedColor.r = ColorChannelToLinearSpaceExact(this.r), convertedColor.g = ColorChannelToLinearSpaceExact(this.g), convertedColor.b = ColorChannelToLinearSpaceExact(this.b)) : (convertedColor.r = ColorChannelToLinearSpace(this.r), convertedColor.g = ColorChannelToLinearSpace(this.g), convertedColor.b = ColorChannelToLinearSpace(this.b)), convertedColor.a = this.a, this;
  }
  toGammaSpace(exact = !1) {
    const convertedColor = new Color42();
    return this.toGammaSpaceToRef(convertedColor, exact), convertedColor;
  }
  toGammaSpaceToRef(convertedColor, exact = !1) {
    return exact ? (convertedColor.r = ColorChannelToGammaSpaceExact(this.r), convertedColor.g = ColorChannelToGammaSpaceExact(this.g), convertedColor.b = ColorChannelToGammaSpaceExact(this.b)) : (convertedColor.r = ColorChannelToGammaSpace(this.r), convertedColor.g = ColorChannelToGammaSpace(this.g), convertedColor.b = ColorChannelToGammaSpace(this.b)), convertedColor.a = this.a, this;
  }
  static FromHexString(hex) {
    return hex.substring(0, 1) !== "#" || hex.length !== 9 && hex.length !== 7 ? new Color42(0, 0, 0, 0) : new Color42(0, 0, 0, 1).fromHexString(hex);
  }
  static Lerp(left, right, amount) {
    return Color42.LerpToRef(left, right, amount, new Color42());
  }
  static LerpToRef(left, right, amount, result) {
    return result.r = left.r + (right.r - left.r) * amount, result.g = left.g + (right.g - left.g) * amount, result.b = left.b + (right.b - left.b) * amount, result.a = left.a + (right.a - left.a) * amount, result;
  }
  static Hermite(value1, tangent1, value2, tangent2, amount) {
    const squared = amount * amount, cubed = amount * squared, part1 = 2 * cubed - 3 * squared + 1, part2 = -2 * cubed + 3 * squared, part3 = cubed - 2 * squared + amount, part4 = cubed - squared, r = value1.r * part1 + value2.r * part2 + tangent1.r * part3 + tangent2.r * part4, g = value1.g * part1 + value2.g * part2 + tangent1.g * part3 + tangent2.g * part4, b = value1.b * part1 + value2.b * part2 + tangent1.b * part3 + tangent2.b * part4, a = value1.a * part1 + value2.a * part2 + tangent1.a * part3 + tangent2.a * part4;
    return new Color42(r, g, b, a);
  }
  static Hermite1stDerivative(value1, tangent1, value2, tangent2, time) {
    const result = new Color42();
    return this.Hermite1stDerivativeToRef(value1, tangent1, value2, tangent2, time, result), result;
  }
  static Hermite1stDerivativeToRef(value1, tangent1, value2, tangent2, time, result) {
    const t2 = time * time;
    result.r = (t2 - time) * 6 * value1.r + (3 * t2 - 4 * time + 1) * tangent1.r + (-t2 + time) * 6 * value2.r + (3 * t2 - 2 * time) * tangent2.r, result.g = (t2 - time) * 6 * value1.g + (3 * t2 - 4 * time + 1) * tangent1.g + (-t2 + time) * 6 * value2.g + (3 * t2 - 2 * time) * tangent2.g, result.b = (t2 - time) * 6 * value1.b + (3 * t2 - 4 * time + 1) * tangent1.b + (-t2 + time) * 6 * value2.b + (3 * t2 - 2 * time) * tangent2.b, result.a = (t2 - time) * 6 * value1.a + (3 * t2 - 4 * time + 1) * tangent1.a + (-t2 + time) * 6 * value2.a + (3 * t2 - 2 * time) * tangent2.a;
  }
  static FromColor3(color3, alpha = 1) {
    return new Color42(color3.r, color3.g, color3.b, alpha);
  }
  static FromArray(array, offset = 0) {
    return new Color42(array[offset], array[offset + 1], array[offset + 2], array[offset + 3]);
  }
  static FromArrayToRef(array, offset = 0, result) {
    result.r = array[offset], result.g = array[offset + 1], result.b = array[offset + 2], result.a = array[offset + 3];
  }
  static FromInts(r, g, b, a) {
    return new Color42(r / 255, g / 255, b / 255, a / 255);
  }
  static CheckColors4(colors, count) {
    if (colors.length === count * 3) {
      const colors4 = [];
      for (let index = 0; index < colors.length; index += 3) {
        const newIndex = index / 3 * 4;
        colors4[newIndex] = colors[index], colors4[newIndex + 1] = colors[index + 1], colors4[newIndex + 2] = colors[index + 2], colors4[newIndex + 3] = 1;
      }
      return colors4;
    }
    return colors;
  }
};
Color4._V8PerformanceHack = /* @__PURE__ */ new Color4(0.5, 0.5, 0.5, 0.5);
var TmpColors = class {
};
TmpColors.Color3 = /* @__PURE__ */ BuildArray(3, Color3.Black);
TmpColors.Color4 = /* @__PURE__ */ BuildArray(3, () => new Color4(0, 0, 0, 0));
var _Registered = !1;
function RegisterMathColor() {
  _Registered || (_Registered = !0, Object.defineProperties(Color3.prototype, {
    dimension: { value: [3] },
    rank: { value: 1 }
  }), Object.defineProperties(Color4.prototype, {
    dimension: { value: [4] },
    rank: { value: 1 }
  }), RegisterClass("BABYLON.Color3", Color3), RegisterClass("BABYLON.Color4", Color4));
}
export {
  Epsilon as _,
  Matrix as a,
  TmpVectors as c,
  Vector4 as d,
  InvertMatrixToRef as f,
  _ObserveArray as g,
  BuildArray as h,
  TmpColors as i,
  Vector2 as l,
  PerformanceConfigurator as m,
  Color4 as n,
  Quaternion as o,
  MultiplyMatricesToRef as p,
  RegisterMathColor as r,
  RegisterMathVector as s,
  Color3 as t,
  Vector3 as u,
  PHI as v,
  ToLinearSpace as y
};
