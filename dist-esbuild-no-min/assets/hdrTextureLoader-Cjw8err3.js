function Ldexp(mantissa, exponent) {
  if (exponent > 1023) return mantissa * Math.pow(2, 1023) * Math.pow(2, exponent - 1023);
  if (exponent < -1074) return mantissa * Math.pow(2, -1074) * Math.pow(2, exponent + 1074);
  return mantissa * Math.pow(2, exponent);
}
function Rgbe2float(float32array, red, green, blue, exponent, index) {
  if (exponent > 0) {
    exponent = Ldexp(1, exponent - 136);
    float32array[index + 0] = red * exponent;
    float32array[index + 1] = green * exponent;
    float32array[index + 2] = blue * exponent;
  } else {
    float32array[index + 0] = 0;
    float32array[index + 1] = 0;
    float32array[index + 2] = 0;
  }
}
function ReadStringLine(uint8array, startIndex) {
  let line = "";
  let character;
  for (let i = startIndex; i < uint8array.length - startIndex; i++) {
    character = String.fromCharCode(uint8array[i]);
    if (character == "\n") break;
    line += character;
  }
  return line;
}
function RGBE_ReadHeader(uint8array) {
  let line = ReadStringLine(uint8array, 0);
  if (line[0] != "#" || line[1] != "?") throw "Bad HDR Format.";
  let endOfHeader = false;
  let findFormat = false;
  let lineIndex = 0;
  do {
    lineIndex += line.length + 1;
    line = ReadStringLine(uint8array, lineIndex);
    if (line == "FORMAT=32-bit_rle_rgbe") findFormat = true;
    else if (line.length == 0) endOfHeader = true;
  } while (!endOfHeader);
  if (!findFormat) throw "HDR Bad header format, unsupported FORMAT";
  lineIndex += line.length + 1;
  line = ReadStringLine(uint8array, lineIndex);
  const match = /^-Y (.*) \+X (.*)$/g.exec(line);
  if (!match || match.length < 3) throw "HDR Bad header format, no size";
  const width = parseInt(match[2]);
  const height = parseInt(match[1]);
  if (width < 8 || width > 32767) throw "HDR Bad header format, unsupported size";
  lineIndex += line.length + 1;
  return {
    height,
    width,
    dataPosition: lineIndex
  };
}
function RGBE_ReadPixels(uint8array, hdrInfo) {
  return ReadRGBEPixelsRLE(uint8array, hdrInfo);
}
function ReadRGBEPixelsRLE(uint8array, hdrInfo) {
  let numScanlines = hdrInfo.height;
  const scanlineWidth = hdrInfo.width;
  let a, b, c, d, count;
  let dataIndex = hdrInfo.dataPosition;
  let index, endIndex, i;
  const scanLineArrayBuffer = /* @__PURE__ */ new ArrayBuffer(scanlineWidth * 4);
  const scanLineArray = new Uint8Array(scanLineArrayBuffer);
  const resultBuffer = /* @__PURE__ */ new ArrayBuffer(hdrInfo.width * hdrInfo.height * 4 * 3);
  const resultArray = new Float32Array(resultBuffer);
  while (numScanlines > 0) {
    a = uint8array[dataIndex++];
    b = uint8array[dataIndex++];
    c = uint8array[dataIndex++];
    d = uint8array[dataIndex++];
    if (a != 2 || b != 2 || c & 128 || hdrInfo.width < 8 || hdrInfo.width > 32767) return ReadRGBEPixelsNotRLE(uint8array, hdrInfo);
    if ((c << 8 | d) != scanlineWidth) throw "HDR Bad header format, wrong scan line width";
    index = 0;
    for (i = 0; i < 4; i++) {
      endIndex = (i + 1) * scanlineWidth;
      while (index < endIndex) {
        a = uint8array[dataIndex++];
        b = uint8array[dataIndex++];
        if (a > 128) {
          count = a - 128;
          if (count == 0 || count > endIndex - index) throw "HDR Bad Format, bad scanline data (run)";
          while (count-- > 0) scanLineArray[index++] = b;
        } else {
          count = a;
          if (count == 0 || count > endIndex - index) throw "HDR Bad Format, bad scanline data (non-run)";
          scanLineArray[index++] = b;
          if (--count > 0) for (let j = 0; j < count; j++) scanLineArray[index++] = uint8array[dataIndex++];
        }
      }
    }
    for (i = 0; i < scanlineWidth; i++) {
      a = scanLineArray[i];
      b = scanLineArray[i + scanlineWidth];
      c = scanLineArray[i + 2 * scanlineWidth];
      d = scanLineArray[i + 3 * scanlineWidth];
      Rgbe2float(resultArray, a, b, c, d, (hdrInfo.height - numScanlines) * scanlineWidth * 3 + i * 3);
    }
    numScanlines--;
  }
  return resultArray;
}
function ReadRGBEPixelsNotRLE(uint8array, hdrInfo) {
  let numScanlines = hdrInfo.height;
  const scanlineWidth = hdrInfo.width;
  let a, b, c, d, i;
  let dataIndex = hdrInfo.dataPosition;
  const resultBuffer = /* @__PURE__ */ new ArrayBuffer(hdrInfo.width * hdrInfo.height * 4 * 3);
  const resultArray = new Float32Array(resultBuffer);
  while (numScanlines > 0) {
    for (i = 0; i < hdrInfo.width; i++) {
      a = uint8array[dataIndex++];
      b = uint8array[dataIndex++];
      c = uint8array[dataIndex++];
      d = uint8array[dataIndex++];
      Rgbe2float(resultArray, a, b, c, d, (hdrInfo.height - numScanlines) * scanlineWidth * 3 + i * 3);
    }
    numScanlines--;
  }
  return resultArray;
}
var _HDRTextureLoader = class {
  constructor() {
    this.supportCascades = false;
  }
  loadCubeData() {
    throw ".hdr not supported in Cube.";
  }
  loadData(data, texture, callback) {
    const uint8array = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
    const hdrInfo = RGBE_ReadHeader(uint8array);
    const pixelsDataRGB32 = RGBE_ReadPixels(uint8array, hdrInfo);
    const pixels = hdrInfo.width * hdrInfo.height;
    const pixelsDataRGBA32 = new Float32Array(pixels * 4);
    for (let i = 0; i < pixels; i += 1) {
      pixelsDataRGBA32[i * 4] = pixelsDataRGB32[i * 3];
      pixelsDataRGBA32[i * 4 + 1] = pixelsDataRGB32[i * 3 + 1];
      pixelsDataRGBA32[i * 4 + 2] = pixelsDataRGB32[i * 3 + 2];
      pixelsDataRGBA32[i * 4 + 3] = 1;
    }
    callback(hdrInfo.width, hdrInfo.height, texture.generateMipMaps, false, () => {
      const engine = texture.getEngine();
      texture.type = 1;
      texture.format = 5;
      texture._gammaSpace = false;
      engine._uploadDataToTextureDirectly(texture, pixelsDataRGBA32);
    });
  }
};
export {
  _HDRTextureLoader
};
