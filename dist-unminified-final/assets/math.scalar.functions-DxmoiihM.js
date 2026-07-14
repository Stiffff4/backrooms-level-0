//#region node_modules/@babylonjs/core/Maths/math.scalar.functions.js
/**
* Boolean : true if the absolute difference between a and b is lower than epsilon (default = 1.401298E-45)
* @param a number
* @param b number
* @param epsilon (default = 1.401298E-45)
* @returns true if the absolute difference between a and b is lower than epsilon (default = 1.401298E-45)
*/
function WithinEpsilon(a, b, epsilon = 1401298e-51) {
	return Math.abs(a - b) <= epsilon;
}
/**
* Returns a random float number between and min and max values
* @param min min value of random
* @param max max value of random
* @returns random value
*/
function RandomRange(min, max) {
	if (min === max) return min;
	return Math.random() * (max - min) + min;
}
/**
* Creates a new scalar with values linearly interpolated of "amount" between the start scalar and the end scalar.
* @param start start value
* @param end target value
* @param amount amount to lerp between
* @returns the lerped value
*/
function Lerp(start, end, amount) {
	return start + (end - start) * amount;
}
/**
* Returns the value itself if it's between min and max.
* Returns min if the value is lower than min.
* Returns max if the value is greater than max.
* @param value the value to clmap
* @param min the min value to clamp to (default: 0)
* @param max the max value to clamp to (default: 1)
* @returns the clamped value
*/
function Clamp(value, min = 0, max = 1) {
	return Math.min(max, Math.max(min, value));
}
/**
* Returns the angle converted to equivalent value between -Math.PI and Math.PI radians.
* @param angle The angle to normalize in radian.
* @returns The converted angle.
*/
function NormalizeRadians(angle) {
	angle -= Math.PI * 2 * Math.floor((angle + Math.PI) / (Math.PI * 2));
	return angle;
}
/**
* Returns a string : the upper case translation of the number i to hexadecimal.
* @param i number
* @returns the upper case translation of the number i to hexadecimal.
*/
function ToHex(i) {
	const str = i.toString(16);
	if (i <= 15) return ("0" + str).toUpperCase();
	return str.toUpperCase();
}
/**
* the floor part of a log2 value.
* @param value the value to compute log2 of
* @returns the log2 of value.
*/
function ILog2(value) {
	if (Math.log2) return Math.floor(Math.log2(value));
	if (value < 0) return NaN;
	else if (value === 0) return -Infinity;
	let n = 0;
	if (value < 1) {
		while (value < 1) {
			n++;
			value = value * 2;
		}
		n = -n;
	} else if (value > 1) while (value > 1) {
		n++;
		value = Math.floor(value / 2);
	}
	return n;
}
/**
* Returns the highest common factor of two integers.
* @param a first parameter
* @param b second parameter
* @returns HCF of a and b
*/
function HighestCommonFactor(a, b) {
	const r = a % b;
	if (r === 0) return b;
	return HighestCommonFactor(b, r);
}
//#endregion
export { NormalizeRadians as a, WithinEpsilon as c, Lerp as i, HighestCommonFactor as n, RandomRange as o, ILog2 as r, ToHex as s, Clamp as t };
