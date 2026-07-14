import { t as Logger } from "./logger-Ck8R5Aic.js";
import { n as Tools } from "./tools.pure-4Mwd1PWe.js";
import { t as InternalTexture } from "./internalTexture-B93WpvQN.js";
import { n as Texture } from "./texture.pure-KHuxRdvt.js";
function workerFunction() {
  const _BASIS_FORMAT = {
    cTFETC1: 0,
    cTFETC2: 1,
    cTFBC1: 2,
    cTFBC3: 3,
    cTFBC4: 4,
    cTFBC5: 5,
    cTFBC7: 6,
    cTFPVRTC1_4_RGB: 8,
    cTFPVRTC1_4_RGBA: 9,
    cTFASTC_4x4: 10,
    cTFATC_RGB: 11,
    cTFATC_RGBA_INTERPOLATED_ALPHA: 12,
    cTFRGBA32: 13,
    cTFRGB565: 14,
    cTFBGR565: 15,
    cTFRGBA4444: 16,
    cTFFXT1_RGB: 17,
    cTFPVRTC2_4_RGB: 18,
    cTFPVRTC2_4_RGBA: 19,
    cTFETC2_EAC_R11: 20,
    cTFETC2_EAC_RG11: 21
  };
  let transcoderModulePromise = null;
  onmessage = (event) => {
    if (event.data.action === "init") {
      if (event.data.url) try {
        importScripts(event.data.url);
      } catch (e) {
        postMessage({
          action: "error",
          error: e
        });
      }
      transcoderModulePromise || (transcoderModulePromise = BASIS({ wasmBinary: event.data.wasmBinary })), transcoderModulePromise !== null && transcoderModulePromise.then((m) => {
        BASIS = m, m.initializeBasis(), postMessage({ action: "init" });
      });
    } else if (event.data.action === "transcode") {
      const config = event.data.config, imgData = event.data.imageData, loadedFile = new BASIS.BasisFile(imgData), fileInfo = GetFileInfo(loadedFile);
      let format = event.data.ignoreSupportedFormats ? null : GetSupportedTranscodeFormat(event.data.config, fileInfo), needsConversion = !1;
      format === null && (needsConversion = !0, format = fileInfo.hasAlpha ? _BASIS_FORMAT.cTFBC3 : _BASIS_FORMAT.cTFBC1);
      let success = !0;
      loadedFile.startTranscoding() || (success = !1);
      const buffers = [];
      for (let imageIndex = 0; imageIndex < fileInfo.images.length && success; imageIndex++) {
        const image = fileInfo.images[imageIndex];
        if (config.loadSingleImage === void 0 || config.loadSingleImage === imageIndex) {
          let mipCount = image.levels.length;
          config.loadMipmapLevels === !1 && (mipCount = 1);
          for (let levelIndex = 0; levelIndex < mipCount; levelIndex++) {
            const levelInfo = image.levels[levelIndex], pixels = TranscodeLevel(loadedFile, imageIndex, levelIndex, format, needsConversion);
            if (!pixels) {
              success = !1;
              break;
            }
            levelInfo.transcodedPixels = pixels, buffers.push(levelInfo.transcodedPixels.buffer);
          }
        }
      }
      loadedFile.close(), loadedFile.delete(), needsConversion && (format = -1), success ? postMessage({
        action: "transcode",
        success,
        id: event.data.id,
        fileInfo,
        format
      }, buffers) : postMessage({
        action: "transcode",
        success,
        id: event.data.id
      });
    }
  };
  function GetSupportedTranscodeFormat(config, fileInfo) {
    let format = null;
    return config.supportedCompressionFormats && (config.supportedCompressionFormats.astc ? format = _BASIS_FORMAT.cTFASTC_4x4 : config.supportedCompressionFormats.bc7 ? format = _BASIS_FORMAT.cTFBC7 : config.supportedCompressionFormats.s3tc ? format = fileInfo.hasAlpha ? _BASIS_FORMAT.cTFBC3 : _BASIS_FORMAT.cTFBC1 : config.supportedCompressionFormats.pvrtc ? format = fileInfo.hasAlpha ? _BASIS_FORMAT.cTFPVRTC1_4_RGBA : _BASIS_FORMAT.cTFPVRTC1_4_RGB : config.supportedCompressionFormats.etc2 ? format = _BASIS_FORMAT.cTFETC2 : config.supportedCompressionFormats.etc1 ? format = _BASIS_FORMAT.cTFETC1 : format = _BASIS_FORMAT.cTFRGB565), format;
  }
  function GetFileInfo(basisFile) {
    const hasAlpha = basisFile.getHasAlpha(), imageCount = basisFile.getNumImages(), images = [];
    for (let i = 0; i < imageCount; i++) {
      const imageInfo = { levels: [] }, levelCount = basisFile.getNumLevels(i);
      for (let level = 0; level < levelCount; level++) {
        const levelInfo = {
          width: basisFile.getImageWidth(i, level),
          height: basisFile.getImageHeight(i, level)
        };
        imageInfo.levels.push(levelInfo);
      }
      images.push(imageInfo);
    }
    return {
      hasAlpha,
      images
    };
  }
  function TranscodeLevel(loadedFile, imageIndex, levelIndex, format, convertToRgb565) {
    const dstSize = loadedFile.getImageTranscodedSizeInBytes(imageIndex, levelIndex, format);
    let dst = new Uint8Array(dstSize);
    if (!loadedFile.transcodeImage(dst, imageIndex, levelIndex, format, 1, 0)) return null;
    if (convertToRgb565) {
      const alignedWidth = loadedFile.getImageWidth(imageIndex, levelIndex) + 3 & -4, alignedHeight = loadedFile.getImageHeight(imageIndex, levelIndex) + 3 & -4;
      dst = ConvertDxtToRgb565(dst, 0, alignedWidth, alignedHeight);
    }
    return dst;
  }
  function ConvertDxtToRgb565(src, srcByteOffset, width, height) {
    const c = /* @__PURE__ */ new Uint16Array(4), dst = new Uint16Array(width * height), blockWidth = width / 4, blockHeight = height / 4;
    for (let blockY = 0; blockY < blockHeight; blockY++) for (let blockX = 0; blockX < blockWidth; blockX++) {
      const i = srcByteOffset + 8 * (blockY * blockWidth + blockX);
      c[0] = src[i] | src[i + 1] << 8, c[1] = src[i + 2] | src[i + 3] << 8, c[2] = (2 * (c[0] & 31) + 1 * (c[1] & 31)) / 3 | (2 * (c[0] & 2016) + 1 * (c[1] & 2016)) / 3 & 2016 | (2 * (c[0] & 63488) + 1 * (c[1] & 63488)) / 3 & 63488, c[3] = (2 * (c[1] & 31) + 1 * (c[0] & 31)) / 3 | (2 * (c[1] & 2016) + 1 * (c[0] & 2016)) / 3 & 2016 | (2 * (c[1] & 63488) + 1 * (c[0] & 63488)) / 3 & 63488;
      for (let row = 0; row < 4; row++) {
        const m = src[i + 4 + row];
        let dstI = (blockY * 4 + row) * width + blockX * 4;
        dst[dstI++] = c[m & 3], dst[dstI++] = c[m >> 2 & 3], dst[dstI++] = c[m >> 4 & 3], dst[dstI] = c[m >> 6 & 3];
      }
    }
    return dst;
  }
}
async function initializeWebWorker(worker, wasmBinary, moduleUrl) {
  return await new Promise((res, reject) => {
    const initHandler = (msg) => {
      msg.data.action === "init" ? (worker.removeEventListener("message", initHandler), res(worker)) : msg.data.action === "error" && reject(msg.data.error || "error initializing worker");
    };
    worker.addEventListener("message", initHandler), worker.postMessage({
      action: "init",
      url: moduleUrl ? Tools.GetBabylonScriptURL(moduleUrl) : void 0,
      wasmBinary
    }, [wasmBinary]);
  });
}
var BASIS_FORMATS;
(function(BASIS_FORMATS2) {
  BASIS_FORMATS2[BASIS_FORMATS2.cTFETC1 = 0] = "cTFETC1", BASIS_FORMATS2[BASIS_FORMATS2.cTFETC2 = 1] = "cTFETC2", BASIS_FORMATS2[BASIS_FORMATS2.cTFBC1 = 2] = "cTFBC1", BASIS_FORMATS2[BASIS_FORMATS2.cTFBC3 = 3] = "cTFBC3", BASIS_FORMATS2[BASIS_FORMATS2.cTFBC4 = 4] = "cTFBC4", BASIS_FORMATS2[BASIS_FORMATS2.cTFBC5 = 5] = "cTFBC5", BASIS_FORMATS2[BASIS_FORMATS2.cTFBC7 = 6] = "cTFBC7", BASIS_FORMATS2[BASIS_FORMATS2.cTFPVRTC1_4_RGB = 8] = "cTFPVRTC1_4_RGB", BASIS_FORMATS2[BASIS_FORMATS2.cTFPVRTC1_4_RGBA = 9] = "cTFPVRTC1_4_RGBA", BASIS_FORMATS2[BASIS_FORMATS2.cTFASTC_4x4 = 10] = "cTFASTC_4x4", BASIS_FORMATS2[BASIS_FORMATS2.cTFATC_RGB = 11] = "cTFATC_RGB", BASIS_FORMATS2[BASIS_FORMATS2.cTFATC_RGBA_INTERPOLATED_ALPHA = 12] = "cTFATC_RGBA_INTERPOLATED_ALPHA", BASIS_FORMATS2[BASIS_FORMATS2.cTFRGBA32 = 13] = "cTFRGBA32", BASIS_FORMATS2[BASIS_FORMATS2.cTFRGB565 = 14] = "cTFRGB565", BASIS_FORMATS2[BASIS_FORMATS2.cTFBGR565 = 15] = "cTFBGR565", BASIS_FORMATS2[BASIS_FORMATS2.cTFRGBA4444 = 16] = "cTFRGBA4444", BASIS_FORMATS2[BASIS_FORMATS2.cTFFXT1_RGB = 17] = "cTFFXT1_RGB", BASIS_FORMATS2[BASIS_FORMATS2.cTFPVRTC2_4_RGB = 18] = "cTFPVRTC2_4_RGB", BASIS_FORMATS2[BASIS_FORMATS2.cTFPVRTC2_4_RGBA = 19] = "cTFPVRTC2_4_RGBA", BASIS_FORMATS2[BASIS_FORMATS2.cTFETC2_EAC_R11 = 20] = "cTFETC2_EAC_R11", BASIS_FORMATS2[BASIS_FORMATS2.cTFETC2_EAC_RG11 = 21] = "cTFETC2_EAC_RG11";
})(BASIS_FORMATS || (BASIS_FORMATS = {}));
var BasisToolsOptions = {
  JSModuleURL: `${Tools._DefaultCdnUrl}/basisTranscoder/1/basis_transcoder.js`,
  WasmModuleURL: `${Tools._DefaultCdnUrl}/basisTranscoder/1/basis_transcoder.wasm`
}, GetInternalFormatFromBasisFormat = (basisFormat, engine) => {
  let format;
  switch (basisFormat) {
    case BASIS_FORMATS.cTFETC1:
      format = 36196;
      break;
    case BASIS_FORMATS.cTFBC1:
      format = 33776;
      break;
    case BASIS_FORMATS.cTFBC4:
      format = 33779;
      break;
    case BASIS_FORMATS.cTFASTC_4x4:
      format = 37808;
      break;
    case BASIS_FORMATS.cTFETC2:
      format = 37496;
      break;
    case BASIS_FORMATS.cTFBC7:
      format = 36492;
      break;
  }
  if (format === void 0) throw "The chosen Basis transcoder format is not currently supported";
  return format;
}, WorkerPromise = null, LocalWorker = null, ActionId = 0, IgnoreSupportedFormats = !1, CreateWorkerAsync = async () => (WorkerPromise || (WorkerPromise = new Promise((res, reject) => {
  LocalWorker ? res(LocalWorker) : Tools.LoadFileAsync(Tools.GetBabylonScriptURL(BasisToolsOptions.WasmModuleURL)).then((wasmBinary) => {
    if (typeof URL != "function") return reject("Basis transcoder requires an environment with a URL constructor");
    const workerBlobUrl = URL.createObjectURL(new Blob([`(${workerFunction})()`], { type: "application/javascript" }));
    LocalWorker = new Worker(workerBlobUrl), initializeWebWorker(LocalWorker, wasmBinary, BasisToolsOptions.JSModuleURL).then(res, reject);
  }).catch(reject);
})), await WorkerPromise), TranscodeAsync = async (data, config) => {
  const dataView = data instanceof ArrayBuffer ? new Uint8Array(data) : data;
  return await new Promise((res, rej) => {
    CreateWorkerAsync().then(() => {
      const actionId = ActionId++, messageHandler = (msg) => {
        msg.data.action === "transcode" && msg.data.id === actionId && (LocalWorker.removeEventListener("message", messageHandler), msg.data.success ? res(msg.data) : rej("Transcode is not supported on this device"));
      };
      LocalWorker.addEventListener("message", messageHandler);
      const dataViewCopy = new Uint8Array(dataView.byteLength);
      dataViewCopy.set(new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength)), LocalWorker.postMessage({
        action: "transcode",
        id: actionId,
        imageData: dataViewCopy,
        config,
        ignoreSupportedFormats: IgnoreSupportedFormats
      }, [dataViewCopy.buffer]);
    }, (error) => {
      rej(error);
    });
  });
}, BindTexture = (texture, engine) => {
  let target = engine._gl?.TEXTURE_2D;
  texture.isCube && (target = engine._gl?.TEXTURE_CUBE_MAP), engine._bindTextureDirectly(target, texture, !0);
}, LoadTextureFromTranscodeResult = (texture, transcodeResult) => {
  const engine = texture.getEngine();
  for (let i = 0; i < transcodeResult.fileInfo.images.length; i++) {
    const rootImage = transcodeResult.fileInfo.images[i].levels[0];
    if (texture._invertVScale = texture.invertY, transcodeResult.format === -1 || transcodeResult.format === BASIS_FORMATS.cTFRGB565)
      if (texture.type = 10, texture.format = 4, engine._features.basisNeedsPOT && (Math.log2(rootImage.width) % 1 !== 0 || Math.log2(rootImage.height) % 1 !== 0)) {
        const source = new InternalTexture(engine, 2);
        texture._invertVScale = texture.invertY, source.type = 10, source.format = 4, source.width = rootImage.width + 3 & -4, source.height = rootImage.height + 3 & -4, BindTexture(source, engine), engine._uploadDataToTextureDirectly(source, new Uint16Array(rootImage.transcodedPixels.buffer), i, 0, 4, !0), engine._rescaleTexture(source, texture, engine.scenes[0], engine._getInternalFormat(4), () => {
          engine._releaseTexture(source), BindTexture(texture, engine);
        });
      } else
        texture._invertVScale = !texture.invertY, texture.width = rootImage.width + 3 & -4, texture.height = rootImage.height + 3 & -4, texture.samplingMode = 2, BindTexture(texture, engine), engine._uploadDataToTextureDirectly(texture, new Uint16Array(rootImage.transcodedPixels.buffer), i, 0, 4, !0);
    else {
      texture.width = rootImage.width, texture.height = rootImage.height, texture.generateMipMaps = transcodeResult.fileInfo.images[i].levels.length > 1;
      const format = BasisTools.GetInternalFormatFromBasisFormat(transcodeResult.format, engine);
      texture.format = format, BindTexture(texture, engine);
      const levels = transcodeResult.fileInfo.images[i].levels;
      for (let index = 0; index < levels.length; index++) {
        const level = levels[index];
        engine._uploadCompressedDataToTextureDirectly(texture, format, level.width, level.height, level.transcodedPixels, i, index);
      }
      engine._features.basisNeedsPOT && (Math.log2(texture.width) % 1 !== 0 || Math.log2(texture.height) % 1 !== 0) && (Logger.Warn("Loaded .basis texture width and height are not a power of two. Texture wrapping will be set to Texture.CLAMP_ADDRESSMODE as other modes are not supported with non power of two dimensions in webGL 1."), texture._cachedWrapU = Texture.CLAMP_ADDRESSMODE, texture._cachedWrapV = Texture.CLAMP_ADDRESSMODE);
    }
  }
}, BasisTools = {
  JSModuleURL: BasisToolsOptions.JSModuleURL,
  WasmModuleURL: BasisToolsOptions.WasmModuleURL,
  GetInternalFormatFromBasisFormat,
  TranscodeAsync,
  LoadTextureFromTranscodeResult
}, _BasisTextureLoader = class {
  constructor() {
    this.supportCascades = !1;
  }
  loadCubeData(data, texture, createPolynomials, onLoad, onError) {
    if (Array.isArray(data)) return;
    const caps = texture.getEngine().getCaps();
    TranscodeAsync(data, { supportedCompressionFormats: {
      etc1: !!caps.etc1,
      s3tc: !!caps.s3tc,
      pvrtc: !!caps.pvrtc,
      etc2: !!caps.etc2,
      astc: !!caps.astc,
      bc7: !!caps.bptc
    } }).then((result) => {
      const hasMipmap = result.fileInfo.images[0].levels.length > 1 && texture.generateMipMaps;
      LoadTextureFromTranscodeResult(texture, result), texture.getEngine()._setCubeMapTextureParams(texture, hasMipmap), texture.isReady = !0, texture.onLoadedObservable.notifyObservers(texture), texture.onLoadedObservable.clear(), onLoad && onLoad();
    }).catch((err) => {
      Tools.Warn("Failed to transcode Basis file, transcoding may not be supported on this device"), texture.isReady = !0, onError && onError(err);
    });
  }
  loadData(data, texture, callback) {
    const caps = texture.getEngine().getCaps();
    TranscodeAsync(data, { supportedCompressionFormats: {
      etc1: !!caps.etc1,
      s3tc: !!caps.s3tc,
      pvrtc: !!caps.pvrtc,
      etc2: !!caps.etc2,
      astc: !!caps.astc,
      bc7: !!caps.bptc
    } }).then((result) => {
      const rootImage = result.fileInfo.images[0].levels[0], hasMipmap = result.fileInfo.images[0].levels.length > 1 && texture.generateMipMaps;
      callback(rootImage.width, rootImage.height, hasMipmap, result.format !== -1, () => {
        LoadTextureFromTranscodeResult(texture, result);
      });
    }).catch((err) => {
      Tools.Warn("Failed to transcode Basis file, transcoding may not be supported on this device"), Tools.Warn(`Failed to transcode Basis file: ${err}`), callback(0, 0, !1, !1, () => {
      }, !0);
    });
  }
};
export {
  _BasisTextureLoader
};
