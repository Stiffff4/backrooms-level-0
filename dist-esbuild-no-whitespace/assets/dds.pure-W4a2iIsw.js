import { a as ToHalfFloat, r as FromHalfFloat } from "./typeStore-BMcSg10V.js";
import { t as Logger } from "./logger-Ck8R5Aic.js";
import { t as Clamp } from "./math.scalar.functions-BmHIPW7l.js";
import { t as CubeMapToSphericalPolynomialTools } from "./cubemapToSphericalPolynomial-CzKhkWk4.js";
var DDS_MAGIC = 542327876, DDSD_MIPMAPCOUNT = 131072, DDSCAPS2_CUBEMAP = 512, DDPF_FOURCC = 4, DDPF_RGB = 64, DDPF_LUMINANCE = 131072;
function FourCCToInt32(value) {
  return value.charCodeAt(0) + (value.charCodeAt(1) << 8) + (value.charCodeAt(2) << 16) + (value.charCodeAt(3) << 24);
}
function Int32ToFourCC(value) {
  return String.fromCharCode(value & 255, value >> 8 & 255, value >> 16 & 255, value >> 24 & 255);
}
var FOURCC_DXT1 = /* @__PURE__ */ FourCCToInt32("DXT1"), FOURCC_DXT3 = /* @__PURE__ */ FourCCToInt32("DXT3"), FOURCC_DXT5 = /* @__PURE__ */ FourCCToInt32("DXT5"), FOURCC_DX10 = /* @__PURE__ */ FourCCToInt32("DX10"), FOURCC_D3DFMT_R16G16B16A16F = 113, FOURCC_D3DFMT_R32G32B32A32F = 116, DXGI_FORMAT_R32G32B32A32_FLOAT = 2, DXGI_FORMAT_R16G16B16A16_FLOAT = 10, DXGI_FORMAT_B8G8R8X8_UNORM = 88, headerLengthInt = 31, off_magic = 0, off_size = 1, off_flags = 2, off_height = 3, off_width = 4, off_mipmapCount = 7, off_pfFlags = 20, off_pfFourCC = 21, off_RGBbpp = 22, off_RMask = 23, off_GMask = 24, off_BMask = 25, off_AMask = 26, off_caps2 = 28, off_dxgiFormat = 32, DDSTools = class DDSTools2 {
  static GetDDSInfo(data) {
    const header = new Int32Array(data.buffer, data.byteOffset, headerLengthInt), extendedHeader = new Int32Array(data.buffer, data.byteOffset, 35);
    let mipmapCount = 1;
    header[off_flags] & DDSD_MIPMAPCOUNT && (mipmapCount = Math.max(1, header[off_mipmapCount]));
    const fourCC = header[off_pfFourCC], dxgiFormat = fourCC === FOURCC_DX10 ? extendedHeader[off_dxgiFormat] : 0;
    let textureType = 0;
    switch (fourCC) {
      case FOURCC_D3DFMT_R16G16B16A16F:
        textureType = 2;
        break;
      case FOURCC_D3DFMT_R32G32B32A32F:
        textureType = 1;
        break;
      case FOURCC_DX10:
        if (dxgiFormat === DXGI_FORMAT_R16G16B16A16_FLOAT) {
          textureType = 2;
          break;
        }
        if (dxgiFormat === DXGI_FORMAT_R32G32B32A32_FLOAT) {
          textureType = 1;
          break;
        }
    }
    return {
      width: header[off_width],
      height: header[off_height],
      mipmapCount,
      isFourCC: (header[off_pfFlags] & DDPF_FOURCC) === DDPF_FOURCC,
      isRGB: (header[off_pfFlags] & DDPF_RGB) === DDPF_RGB,
      isLuminance: (header[off_pfFlags] & DDPF_LUMINANCE) === DDPF_LUMINANCE,
      isCube: (header[off_caps2] & DDSCAPS2_CUBEMAP) === DDSCAPS2_CUBEMAP,
      isCompressed: fourCC === FOURCC_DXT1 || fourCC === FOURCC_DXT3 || fourCC === FOURCC_DXT5,
      dxgiFormat,
      textureType
    };
  }
  static _GetHalfFloatAsFloatRGBAArrayBuffer(width, height, dataOffset, dataLength, arrayBuffer, lod) {
    const destArray = new Float32Array(dataLength), srcData = new Uint16Array(arrayBuffer, dataOffset);
    let index = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const srcPos = (x + y * width) * 4;
      destArray[index] = FromHalfFloat(srcData[srcPos]), destArray[index + 1] = FromHalfFloat(srcData[srcPos + 1]), destArray[index + 2] = FromHalfFloat(srcData[srcPos + 2]), DDSTools2.StoreLODInAlphaChannel ? destArray[index + 3] = lod : destArray[index + 3] = FromHalfFloat(srcData[srcPos + 3]), index += 4;
    }
    return destArray;
  }
  static _GetHalfFloatRGBAArrayBuffer(width, height, dataOffset, dataLength, arrayBuffer, lod) {
    if (DDSTools2.StoreLODInAlphaChannel) {
      const destArray = new Uint16Array(dataLength), srcData = new Uint16Array(arrayBuffer, dataOffset);
      let index = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const srcPos = (x + y * width) * 4;
        destArray[index] = srcData[srcPos], destArray[index + 1] = srcData[srcPos + 1], destArray[index + 2] = srcData[srcPos + 2], destArray[index + 3] = ToHalfFloat(lod), index += 4;
      }
      return destArray;
    }
    return new Uint16Array(arrayBuffer, dataOffset, dataLength);
  }
  static _GetFloatRGBAArrayBuffer(width, height, dataOffset, dataLength, arrayBuffer, lod) {
    if (DDSTools2.StoreLODInAlphaChannel) {
      const destArray = new Float32Array(dataLength), srcData = new Float32Array(arrayBuffer, dataOffset);
      let index = 0;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const srcPos = (x + y * width) * 4;
        destArray[index] = srcData[srcPos], destArray[index + 1] = srcData[srcPos + 1], destArray[index + 2] = srcData[srcPos + 2], destArray[index + 3] = lod, index += 4;
      }
      return destArray;
    }
    return new Float32Array(arrayBuffer, dataOffset, dataLength);
  }
  static _GetFloatAsHalfFloatRGBAArrayBuffer(width, height, dataOffset, dataLength, arrayBuffer, lod) {
    const destArray = new Uint16Array(dataLength), srcData = new Float32Array(arrayBuffer, dataOffset);
    let index = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
      destArray[index] = ToHalfFloat(srcData[index]), destArray[index + 1] = ToHalfFloat(srcData[index + 1]), destArray[index + 2] = ToHalfFloat(srcData[index + 2]), DDSTools2.StoreLODInAlphaChannel ? destArray[index + 3] = ToHalfFloat(lod) : destArray[index + 3] = ToHalfFloat(srcData[index + 3]), index += 4;
    return destArray;
  }
  static _GetFloatAsUIntRGBAArrayBuffer(width, height, dataOffset, dataLength, arrayBuffer, lod) {
    const destArray = new Uint8Array(dataLength), srcData = new Float32Array(arrayBuffer, dataOffset);
    let index = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const srcPos = (x + y * width) * 4;
      destArray[index] = Clamp(srcData[srcPos]) * 255, destArray[index + 1] = Clamp(srcData[srcPos + 1]) * 255, destArray[index + 2] = Clamp(srcData[srcPos + 2]) * 255, DDSTools2.StoreLODInAlphaChannel ? destArray[index + 3] = lod : destArray[index + 3] = Clamp(srcData[srcPos + 3]) * 255, index += 4;
    }
    return destArray;
  }
  static _GetHalfFloatAsUIntRGBAArrayBuffer(width, height, dataOffset, dataLength, arrayBuffer, lod) {
    const destArray = new Uint8Array(dataLength), srcData = new Uint16Array(arrayBuffer, dataOffset);
    let index = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const srcPos = (x + y * width) * 4;
      destArray[index] = Clamp(FromHalfFloat(srcData[srcPos])) * 255, destArray[index + 1] = Clamp(FromHalfFloat(srcData[srcPos + 1])) * 255, destArray[index + 2] = Clamp(FromHalfFloat(srcData[srcPos + 2])) * 255, DDSTools2.StoreLODInAlphaChannel ? destArray[index + 3] = lod : destArray[index + 3] = Clamp(FromHalfFloat(srcData[srcPos + 3])) * 255, index += 4;
    }
    return destArray;
  }
  static _GetRGBAArrayBuffer(width, height, dataOffset, dataLength, arrayBuffer, rOffset, gOffset, bOffset, aOffset) {
    const byteArray = new Uint8Array(dataLength), srcData = new Uint8Array(arrayBuffer, dataOffset);
    let index = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const srcPos = (x + y * width) * 4;
      byteArray[index] = srcData[srcPos + rOffset], byteArray[index + 1] = srcData[srcPos + gOffset], byteArray[index + 2] = srcData[srcPos + bOffset], byteArray[index + 3] = srcData[srcPos + aOffset], index += 4;
    }
    return byteArray;
  }
  static _ExtractLongWordOrder(value) {
    return value === 0 || value === 255 || value === -16777216 ? 0 : 1 + DDSTools2._ExtractLongWordOrder(value >> 8);
  }
  static _GetRGBArrayBuffer(width, height, dataOffset, dataLength, arrayBuffer, rOffset, gOffset, bOffset) {
    const byteArray = new Uint8Array(dataLength), srcData = new Uint8Array(arrayBuffer, dataOffset);
    let index = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const srcPos = (x + y * width) * 3;
      byteArray[index] = srcData[srcPos + rOffset], byteArray[index + 1] = srcData[srcPos + gOffset], byteArray[index + 2] = srcData[srcPos + bOffset], index += 3;
    }
    return byteArray;
  }
  static _GetLuminanceArrayBuffer(width, height, dataOffset, dataLength, arrayBuffer) {
    const byteArray = new Uint8Array(dataLength), srcData = new Uint8Array(arrayBuffer, dataOffset);
    let index = 0;
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++)
      byteArray[index] = srcData[x + y * width], index++;
    return byteArray;
  }
  static UploadDDSLevels(engine, texture, data, info, loadMipmaps, faces, lodIndex = -1, currentFace, destTypeMustBeFilterable = !0) {
    let sphericalPolynomialFaces = null;
    info.sphericalPolynomial && (sphericalPolynomialFaces = []);
    const ext = !!engine.getCaps().s3tc;
    texture.generateMipMaps = loadMipmaps;
    const header = new Int32Array(data.buffer, data.byteOffset, headerLengthInt);
    let fourCC, width, height, dataLength = 0, dataOffset, byteArray, mipmapCount, mip, internalCompressedFormat = 0, blockBytes = 1;
    if (header[off_magic] !== DDS_MAGIC) {
      Logger.Error("Invalid magic number in DDS header");
      return;
    }
    if (!info.isFourCC && !info.isRGB && !info.isLuminance) {
      Logger.Error("Unsupported format, must contain a FourCC, RGB or LUMINANCE code");
      return;
    }
    if (info.isCompressed && !ext) {
      Logger.Error("Compressed textures are not supported on this platform.");
      return;
    }
    let bpp = header[off_RGBbpp];
    dataOffset = header[off_size] + 4;
    let computeFormats = !1;
    if (info.isFourCC)
      switch (fourCC = header[off_pfFourCC], fourCC) {
        case FOURCC_DXT1:
          blockBytes = 8, internalCompressedFormat = 33777;
          break;
        case FOURCC_DXT3:
          blockBytes = 16, internalCompressedFormat = 33778;
          break;
        case FOURCC_DXT5:
          blockBytes = 16, internalCompressedFormat = 33779;
          break;
        case FOURCC_D3DFMT_R16G16B16A16F:
          computeFormats = !0, bpp = 64;
          break;
        case FOURCC_D3DFMT_R32G32B32A32F:
          computeFormats = !0, bpp = 128;
          break;
        case FOURCC_DX10: {
          dataOffset += 20;
          let supported = !1;
          switch (info.dxgiFormat) {
            case DXGI_FORMAT_R16G16B16A16_FLOAT:
              computeFormats = !0, bpp = 64, supported = !0;
              break;
            case DXGI_FORMAT_R32G32B32A32_FLOAT:
              computeFormats = !0, bpp = 128, supported = !0;
              break;
            case DXGI_FORMAT_B8G8R8X8_UNORM:
              info.isRGB = !0, info.isFourCC = !1, bpp = 32, supported = !0;
              break;
          }
          if (supported) break;
        }
        default:
          Logger.Error(["Unsupported FourCC code:", Int32ToFourCC(fourCC)]);
          return;
      }
    const rOffset = DDSTools2._ExtractLongWordOrder(header[off_RMask]), gOffset = DDSTools2._ExtractLongWordOrder(header[off_GMask]), bOffset = DDSTools2._ExtractLongWordOrder(header[off_BMask]), aOffset = DDSTools2._ExtractLongWordOrder(header[off_AMask]);
    computeFormats && (internalCompressedFormat = engine._getRGBABufferInternalSizedFormat(info.textureType)), mipmapCount = 1, header[off_flags] & DDSD_MIPMAPCOUNT && loadMipmaps !== !1 && (mipmapCount = Math.max(1, header[off_mipmapCount]));
    const startFace = currentFace || 0, caps = engine.getCaps();
    for (let face = startFace; face < faces; face++) {
      for (width = header[off_width], height = header[off_height], mip = 0; mip < mipmapCount; ++mip) {
        if (lodIndex === -1 || lodIndex === mip) {
          const i = lodIndex === -1 ? mip : 0;
          if (!info.isCompressed && info.isFourCC) {
            texture.format = 5, dataLength = width * height * 4;
            let floatArray = null;
            if (engine._badOS || engine._badDesktopOS || !caps.textureHalfFloat && !caps.textureFloat)
              bpp === 128 ? (floatArray = DDSTools2._GetFloatAsUIntRGBAArrayBuffer(width, height, data.byteOffset + dataOffset, dataLength, data.buffer, i), sphericalPolynomialFaces && i == 0 && sphericalPolynomialFaces.push(DDSTools2._GetFloatRGBAArrayBuffer(width, height, data.byteOffset + dataOffset, dataLength, data.buffer, i))) : bpp === 64 && (floatArray = DDSTools2._GetHalfFloatAsUIntRGBAArrayBuffer(width, height, data.byteOffset + dataOffset, dataLength, data.buffer, i), sphericalPolynomialFaces && i == 0 && sphericalPolynomialFaces.push(DDSTools2._GetHalfFloatAsFloatRGBAArrayBuffer(width, height, data.byteOffset + dataOffset, dataLength, data.buffer, i))), texture.type = 0;
            else {
              const floatAvailable = caps.textureFloat && (destTypeMustBeFilterable && caps.textureFloatLinearFiltering || !destTypeMustBeFilterable), halfFloatAvailable = caps.textureHalfFloat && (destTypeMustBeFilterable && caps.textureHalfFloatLinearFiltering || !destTypeMustBeFilterable), destType = (bpp === 128 || bpp === 64 && !halfFloatAvailable) && floatAvailable ? 1 : (bpp === 64 || bpp === 128 && !floatAvailable) && halfFloatAvailable ? 2 : 0;
              let dataGetter, dataGetterPolynomial = null;
              switch (bpp) {
                case 128:
                  switch (destType) {
                    case 1:
                      dataGetter = DDSTools2._GetFloatRGBAArrayBuffer, dataGetterPolynomial = null;
                      break;
                    case 2:
                      dataGetter = DDSTools2._GetFloatAsHalfFloatRGBAArrayBuffer, dataGetterPolynomial = DDSTools2._GetFloatRGBAArrayBuffer;
                      break;
                    case 0:
                      dataGetter = DDSTools2._GetFloatAsUIntRGBAArrayBuffer, dataGetterPolynomial = DDSTools2._GetFloatRGBAArrayBuffer;
                      break;
                  }
                  break;
                default:
                  switch (destType) {
                    case 1:
                      dataGetter = DDSTools2._GetHalfFloatAsFloatRGBAArrayBuffer, dataGetterPolynomial = null;
                      break;
                    case 2:
                      dataGetter = DDSTools2._GetHalfFloatRGBAArrayBuffer, dataGetterPolynomial = DDSTools2._GetHalfFloatAsFloatRGBAArrayBuffer;
                      break;
                    case 0:
                      dataGetter = DDSTools2._GetHalfFloatAsUIntRGBAArrayBuffer, dataGetterPolynomial = DDSTools2._GetHalfFloatAsFloatRGBAArrayBuffer;
                      break;
                  }
                  break;
              }
              texture.type = destType, floatArray = dataGetter(width, height, data.byteOffset + dataOffset, dataLength, data.buffer, i), sphericalPolynomialFaces && i == 0 && sphericalPolynomialFaces.push(dataGetterPolynomial ? dataGetterPolynomial(width, height, data.byteOffset + dataOffset, dataLength, data.buffer, i) : floatArray);
            }
            floatArray && engine._uploadDataToTextureDirectly(texture, floatArray, face, i);
          } else if (info.isRGB)
            texture.type = 0, bpp === 24 ? (texture.format = 4, dataLength = width * height * 3, byteArray = DDSTools2._GetRGBArrayBuffer(width, height, data.byteOffset + dataOffset, dataLength, data.buffer, rOffset, gOffset, bOffset), engine._uploadDataToTextureDirectly(texture, byteArray, face, i)) : (texture.format = 5, dataLength = width * height * 4, byteArray = DDSTools2._GetRGBAArrayBuffer(width, height, data.byteOffset + dataOffset, dataLength, data.buffer, rOffset, gOffset, bOffset, aOffset), engine._uploadDataToTextureDirectly(texture, byteArray, face, i));
          else if (info.isLuminance) {
            const unpackAlignment = engine._getUnpackAlignement(), unpaddedRowSize = width;
            dataLength = Math.floor((width + unpackAlignment - 1) / unpackAlignment) * unpackAlignment * (height - 1) + unpaddedRowSize, byteArray = DDSTools2._GetLuminanceArrayBuffer(width, height, data.byteOffset + dataOffset, dataLength, data.buffer), texture.format = 1, texture.type = 0, engine._uploadDataToTextureDirectly(texture, byteArray, face, i);
          } else
            dataLength = Math.max(4, width) / 4 * Math.max(4, height) / 4 * blockBytes, byteArray = new Uint8Array(data.buffer, data.byteOffset + dataOffset, dataLength), texture.type = 0, engine._uploadCompressedDataToTextureDirectly(texture, internalCompressedFormat, width, height, byteArray, face, i);
        }
        dataOffset += bpp ? width * height * (bpp / 8) : dataLength, width *= 0.5, height *= 0.5, width = Math.max(1, width), height = Math.max(1, height);
      }
      if (currentFace !== void 0) break;
    }
    sphericalPolynomialFaces && sphericalPolynomialFaces.length > 0 ? info.sphericalPolynomial = CubeMapToSphericalPolynomialTools.ConvertCubeMapToSphericalPolynomial({
      size: header[off_width],
      right: sphericalPolynomialFaces[0],
      left: sphericalPolynomialFaces[1],
      up: sphericalPolynomialFaces[2],
      down: sphericalPolynomialFaces[3],
      front: sphericalPolynomialFaces[4],
      back: sphericalPolynomialFaces[5],
      format: 5,
      type: 1,
      gammaSpace: !1
    }) : info.sphericalPolynomial = void 0;
  }
};
DDSTools.StoreLODInAlphaChannel = !1;
export {
  DDSTools as t
};
