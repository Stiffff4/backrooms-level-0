import { t as Logger } from "./logger-X7NGrhaj.js";
import { n as Tools } from "./tools.pure-DF2OeRfv.js";
var KhronosTextureContainer = class KhronosTextureContainer2 {
  constructor(data, facesExpected) {
    this.data = data;
    this.isInvalid = false;
    if (!KhronosTextureContainer2.IsValid(data)) {
      this.isInvalid = true;
      Logger.Error("texture missing KTX identifier");
      return;
    }
    const dataSize = Uint32Array.BYTES_PER_ELEMENT;
    const headerDataView = new DataView(this.data.buffer, this.data.byteOffset + 12, 13 * dataSize);
    const littleEndian = headerDataView.getUint32(0, true) === 67305985;
    this.glType = headerDataView.getUint32(1 * dataSize, littleEndian);
    this.glTypeSize = headerDataView.getUint32(2 * dataSize, littleEndian);
    this.glFormat = headerDataView.getUint32(3 * dataSize, littleEndian);
    this.glInternalFormat = headerDataView.getUint32(4 * dataSize, littleEndian);
    this.glBaseInternalFormat = headerDataView.getUint32(5 * dataSize, littleEndian);
    this.pixelWidth = headerDataView.getUint32(6 * dataSize, littleEndian);
    this.pixelHeight = headerDataView.getUint32(7 * dataSize, littleEndian);
    this.pixelDepth = headerDataView.getUint32(8 * dataSize, littleEndian);
    this.numberOfArrayElements = headerDataView.getUint32(9 * dataSize, littleEndian);
    this.numberOfFaces = headerDataView.getUint32(10 * dataSize, littleEndian);
    this.numberOfMipmapLevels = headerDataView.getUint32(11 * dataSize, littleEndian);
    this.bytesOfKeyValueData = headerDataView.getUint32(12 * dataSize, littleEndian);
    if (this.glType !== 0) {
      Logger.Error("only compressed formats currently supported");
      this.isInvalid = true;
      return;
    } else this.numberOfMipmapLevels = Math.max(1, this.numberOfMipmapLevels);
    if (this.pixelHeight === 0 || this.pixelDepth !== 0) {
      Logger.Error("only 2D textures currently supported");
      this.isInvalid = true;
      return;
    }
    if (this.numberOfArrayElements !== 0) {
      Logger.Error("texture arrays not currently supported");
      this.isInvalid = true;
      return;
    }
    if (this.numberOfFaces !== facesExpected) {
      Logger.Error("number of faces expected" + facesExpected + ", but found " + this.numberOfFaces);
      this.isInvalid = true;
      return;
    }
    this.loadType = KhronosTextureContainer2.COMPRESSED_2D;
  }
  uploadLevels(texture, loadMipmaps) {
    switch (this.loadType) {
      case KhronosTextureContainer2.COMPRESSED_2D:
        this._upload2DCompressedLevels(texture, loadMipmaps);
        break;
      case KhronosTextureContainer2.TEX_2D:
      case KhronosTextureContainer2.COMPRESSED_3D:
      case KhronosTextureContainer2.TEX_3D:
    }
  }
  _upload2DCompressedLevels(texture, loadMipmaps) {
    let dataOffset = KhronosTextureContainer2.HEADER_LEN + this.bytesOfKeyValueData;
    let width = this.pixelWidth;
    let height = this.pixelHeight;
    const mipmapCount = loadMipmaps ? this.numberOfMipmapLevels : 1;
    for (let level = 0; level < mipmapCount; level++) {
      const imageSize = new Int32Array(this.data.buffer, this.data.byteOffset + dataOffset, 1)[0];
      dataOffset += 4;
      for (let face = 0; face < this.numberOfFaces; face++) {
        const byteArray = new Uint8Array(this.data.buffer, this.data.byteOffset + dataOffset, imageSize);
        texture.getEngine()._uploadCompressedDataToTextureDirectly(texture, texture.format, width, height, byteArray, face, level);
        dataOffset += imageSize;
        dataOffset += 3 - (imageSize + 3) % 4;
      }
      width = Math.max(1, width * 0.5);
      height = Math.max(1, height * 0.5);
    }
  }
  static IsValid(data) {
    if (data.byteLength >= 12) {
      const identifier = new Uint8Array(data.buffer, data.byteOffset, 12);
      if (identifier[0] === 171 && identifier[1] === 75 && identifier[2] === 84 && identifier[3] === 88 && identifier[4] === 32 && identifier[5] === 49 && identifier[6] === 49 && identifier[7] === 187 && identifier[8] === 13 && identifier[9] === 10 && identifier[10] === 26 && identifier[11] === 10) return true;
    }
    return false;
  }
};
KhronosTextureContainer.HEADER_LEN = 64;
KhronosTextureContainer.COMPRESSED_2D = 0;
KhronosTextureContainer.COMPRESSED_3D = 1;
KhronosTextureContainer.TEX_2D = 2;
KhronosTextureContainer.TEX_3D = 3;
var WorkerPool = class {
  constructor(workers) {
    this._pendingActions = new Array();
    this._workerInfos = workers.map((worker) => ({
      workerPromise: Promise.resolve(worker),
      idle: true
    }));
  }
  dispose() {
    for (const workerInfo of this._workerInfos) workerInfo.workerPromise.then((worker) => {
      worker.terminate();
    });
    this._workerInfos.length = 0;
    this._pendingActions.length = 0;
  }
  push(action) {
    if (!this._executeOnIdleWorker(action)) this._pendingActions.push(action);
  }
  _executeOnIdleWorker(action) {
    for (const workerInfo of this._workerInfos) if (workerInfo.idle) {
      this._execute(workerInfo, action);
      return true;
    }
    return false;
  }
  _execute(workerInfo, action) {
    workerInfo.idle = false;
    workerInfo.workerPromise.then((worker) => {
      action(worker, () => {
        const nextAction = this._pendingActions.shift();
        if (nextAction) this._execute(workerInfo, nextAction);
        else workerInfo.idle = true;
      });
    });
  }
};
var AutoReleaseWorkerPool = class AutoReleaseWorkerPool2 extends WorkerPool {
  constructor(maxWorkers, createWorkerAsync, options = AutoReleaseWorkerPool2.DefaultOptions) {
    super([]);
    this._maxWorkers = maxWorkers;
    this._createWorkerAsync = createWorkerAsync;
    this._options = options;
  }
  push(action) {
    if (!this._executeOnIdleWorker(action)) if (this._workerInfos.length < this._maxWorkers) {
      const workerInfo = {
        workerPromise: this._createWorkerAsync(),
        idle: false
      };
      this._workerInfos.push(workerInfo);
      this._execute(workerInfo, action);
    } else this._pendingActions.push(action);
  }
  _execute(workerInfo, action) {
    if (workerInfo.timeoutId) {
      clearTimeout(workerInfo.timeoutId);
      delete workerInfo.timeoutId;
    }
    super._execute(workerInfo, (worker, onComplete) => {
      action(worker, () => {
        onComplete();
        if (workerInfo.idle) workerInfo.timeoutId = setTimeout(() => {
          workerInfo.workerPromise.then((worker2) => {
            worker2.terminate();
          });
          const indexOf = this._workerInfos.indexOf(workerInfo);
          if (indexOf !== -1) this._workerInfos.splice(indexOf, 1);
        }, this._options.idleTimeElapsedBeforeRelease);
      });
    });
  }
};
AutoReleaseWorkerPool.DefaultOptions = { idleTimeElapsedBeforeRelease: 1e3 };
var SourceTextureFormat;
(function(SourceTextureFormat2) {
  SourceTextureFormat2[SourceTextureFormat2["ETC1S"] = 0] = "ETC1S";
  SourceTextureFormat2[SourceTextureFormat2["UASTC4x4"] = 1] = "UASTC4x4";
})(SourceTextureFormat || (SourceTextureFormat = {}));
var TranscodeTarget;
(function(TranscodeTarget2) {
  TranscodeTarget2[TranscodeTarget2["ASTC_4X4_RGBA"] = 0] = "ASTC_4X4_RGBA";
  TranscodeTarget2[TranscodeTarget2["ASTC_4x4_RGBA"] = 0] = "ASTC_4x4_RGBA";
  TranscodeTarget2[TranscodeTarget2["BC7_RGBA"] = 1] = "BC7_RGBA";
  TranscodeTarget2[TranscodeTarget2["BC3_RGBA"] = 2] = "BC3_RGBA";
  TranscodeTarget2[TranscodeTarget2["BC1_RGB"] = 3] = "BC1_RGB";
  TranscodeTarget2[TranscodeTarget2["PVRTC1_4_RGBA"] = 4] = "PVRTC1_4_RGBA";
  TranscodeTarget2[TranscodeTarget2["PVRTC1_4_RGB"] = 5] = "PVRTC1_4_RGB";
  TranscodeTarget2[TranscodeTarget2["ETC2_RGBA"] = 6] = "ETC2_RGBA";
  TranscodeTarget2[TranscodeTarget2["ETC1_RGB"] = 7] = "ETC1_RGB";
  TranscodeTarget2[TranscodeTarget2["RGBA32"] = 8] = "RGBA32";
  TranscodeTarget2[TranscodeTarget2["R8"] = 9] = "R8";
  TranscodeTarget2[TranscodeTarget2["RG8"] = 10] = "RG8";
})(TranscodeTarget || (TranscodeTarget = {}));
var EngineFormat;
(function(EngineFormat2) {
  EngineFormat2[EngineFormat2["COMPRESSED_RGBA_BPTC_UNORM_EXT"] = 36492] = "COMPRESSED_RGBA_BPTC_UNORM_EXT";
  EngineFormat2[EngineFormat2["COMPRESSED_RGBA_ASTC_4X4_KHR"] = 37808] = "COMPRESSED_RGBA_ASTC_4X4_KHR";
  EngineFormat2[EngineFormat2["COMPRESSED_RGB_S3TC_DXT1_EXT"] = 33776] = "COMPRESSED_RGB_S3TC_DXT1_EXT";
  EngineFormat2[EngineFormat2["COMPRESSED_RGBA_S3TC_DXT5_EXT"] = 33779] = "COMPRESSED_RGBA_S3TC_DXT5_EXT";
  EngineFormat2[EngineFormat2["COMPRESSED_RGBA_PVRTC_4BPPV1_IMG"] = 35842] = "COMPRESSED_RGBA_PVRTC_4BPPV1_IMG";
  EngineFormat2[EngineFormat2["COMPRESSED_RGB_PVRTC_4BPPV1_IMG"] = 35840] = "COMPRESSED_RGB_PVRTC_4BPPV1_IMG";
  EngineFormat2[EngineFormat2["COMPRESSED_RGBA8_ETC2_EAC"] = 37496] = "COMPRESSED_RGBA8_ETC2_EAC";
  EngineFormat2[EngineFormat2["COMPRESSED_RGB8_ETC2"] = 37492] = "COMPRESSED_RGB8_ETC2";
  EngineFormat2[EngineFormat2["COMPRESSED_RGB_ETC1_WEBGL"] = 36196] = "COMPRESSED_RGB_ETC1_WEBGL";
  EngineFormat2[EngineFormat2["RGBA8Format"] = 32856] = "RGBA8Format";
  EngineFormat2[EngineFormat2["R8Format"] = 33321] = "R8Format";
  EngineFormat2[EngineFormat2["RG8Format"] = 33323] = "RG8Format";
})(EngineFormat || (EngineFormat = {}));
function applyConfig(urls, binariesAndModulesContainer) {
  const KTX2DecoderModule = binariesAndModulesContainer?.jsDecoderModule || KTX2DECODER;
  if (urls) {
    if (urls.wasmBaseUrl) KTX2DecoderModule.Transcoder.WasmBaseUrl = urls.wasmBaseUrl;
    if (urls.wasmUASTCToASTC) KTX2DecoderModule.LiteTranscoder_UASTC_ASTC.WasmModuleURL = urls.wasmUASTCToASTC;
    if (urls.wasmUASTCToBC7) KTX2DecoderModule.LiteTranscoder_UASTC_BC7.WasmModuleURL = urls.wasmUASTCToBC7;
    if (urls.wasmUASTCToRGBA_UNORM) KTX2DecoderModule.LiteTranscoder_UASTC_RGBA_UNORM.WasmModuleURL = urls.wasmUASTCToRGBA_UNORM;
    if (urls.wasmUASTCToRGBA_SRGB) KTX2DecoderModule.LiteTranscoder_UASTC_RGBA_SRGB.WasmModuleURL = urls.wasmUASTCToRGBA_SRGB;
    if (urls.wasmUASTCToR8_UNORM) KTX2DecoderModule.LiteTranscoder_UASTC_R8_UNORM.WasmModuleURL = urls.wasmUASTCToR8_UNORM;
    if (urls.wasmUASTCToRG8_UNORM) KTX2DecoderModule.LiteTranscoder_UASTC_RG8_UNORM.WasmModuleURL = urls.wasmUASTCToRG8_UNORM;
    if (urls.jsMSCTranscoder) KTX2DecoderModule.MSCTranscoder.JSModuleURL = urls.jsMSCTranscoder;
    if (urls.wasmMSCTranscoder) KTX2DecoderModule.MSCTranscoder.WasmModuleURL = urls.wasmMSCTranscoder;
    if (urls.wasmZSTDDecoder) KTX2DecoderModule.ZSTDDecoder.WasmModuleURL = urls.wasmZSTDDecoder;
  }
  if (binariesAndModulesContainer) {
    if (binariesAndModulesContainer.wasmUASTCToASTC) KTX2DecoderModule.LiteTranscoder_UASTC_ASTC.WasmBinary = binariesAndModulesContainer.wasmUASTCToASTC;
    if (binariesAndModulesContainer.wasmUASTCToBC7) KTX2DecoderModule.LiteTranscoder_UASTC_BC7.WasmBinary = binariesAndModulesContainer.wasmUASTCToBC7;
    if (binariesAndModulesContainer.wasmUASTCToRGBA_UNORM) KTX2DecoderModule.LiteTranscoder_UASTC_RGBA_UNORM.WasmBinary = binariesAndModulesContainer.wasmUASTCToRGBA_UNORM;
    if (binariesAndModulesContainer.wasmUASTCToRGBA_SRGB) KTX2DecoderModule.LiteTranscoder_UASTC_RGBA_SRGB.WasmBinary = binariesAndModulesContainer.wasmUASTCToRGBA_SRGB;
    if (binariesAndModulesContainer.wasmUASTCToR8_UNORM) KTX2DecoderModule.LiteTranscoder_UASTC_R8_UNORM.WasmBinary = binariesAndModulesContainer.wasmUASTCToR8_UNORM;
    if (binariesAndModulesContainer.wasmUASTCToRG8_UNORM) KTX2DecoderModule.LiteTranscoder_UASTC_RG8_UNORM.WasmBinary = binariesAndModulesContainer.wasmUASTCToRG8_UNORM;
    if (binariesAndModulesContainer.jsMSCTranscoder) KTX2DecoderModule.MSCTranscoder.JSModule = binariesAndModulesContainer.jsMSCTranscoder;
    if (binariesAndModulesContainer.wasmMSCTranscoder) KTX2DecoderModule.MSCTranscoder.WasmBinary = binariesAndModulesContainer.wasmMSCTranscoder;
    if (binariesAndModulesContainer.wasmZSTDDecoder) KTX2DecoderModule.ZSTDDecoder.WasmBinary = binariesAndModulesContainer.wasmZSTDDecoder;
  }
}
function workerFunction(KTX2DecoderModule) {
  if (typeof KTX2DecoderModule === "undefined" && typeof KTX2DECODER !== "undefined") KTX2DecoderModule = KTX2DECODER;
  let ktx2Decoder;
  onmessage = (event) => {
    if (!event.data) return;
    switch (event.data.action) {
      case "init": {
        const urls = event.data.urls;
        if (urls) {
          if (urls.jsDecoderModule && typeof KTX2DecoderModule === "undefined") {
            importScripts(urls.jsDecoderModule);
            KTX2DecoderModule = KTX2DECODER;
          }
          applyConfig(urls);
        }
        if (event.data.wasmBinaries) applyConfig(void 0, {
          ...event.data.wasmBinaries,
          jsDecoderModule: KTX2DecoderModule
        });
        ktx2Decoder = new KTX2DecoderModule.KTX2Decoder();
        postMessage({ action: "init" });
        break;
      }
      case "setDefaultDecoderOptions":
        KTX2DecoderModule.KTX2Decoder.DefaultDecoderOptions = event.data.options;
        break;
      case "decode":
        ktx2Decoder.decode(event.data.data, event.data.caps, event.data.options).then((data) => {
          const buffers = [];
          for (let mip = 0; mip < data.mipmaps.length; ++mip) {
            const mipmap = data.mipmaps[mip];
            if (mipmap && mipmap.data) buffers.push(mipmap.data.buffer);
          }
          postMessage({
            action: "decoded",
            success: true,
            decodedData: data
          }, buffers);
        }).catch((reason) => {
          postMessage({
            action: "decoded",
            success: false,
            msg: reason
          });
        });
        break;
    }
  };
}
async function initializeWebWorker(worker, wasmBinaries, urls) {
  return await new Promise((resolve, reject) => {
    const onError = (error) => {
      worker.removeEventListener("error", onError);
      worker.removeEventListener("message", onMessage);
      reject(error);
    };
    const onMessage = (message) => {
      if (message.data.action === "init") {
        worker.removeEventListener("error", onError);
        worker.removeEventListener("message", onMessage);
        resolve(worker);
      }
    };
    worker.addEventListener("error", onError);
    worker.addEventListener("message", onMessage);
    worker.postMessage({
      action: "init",
      urls,
      wasmBinaries
    });
  });
}
var DefaultKTX2DecoderOptions = class {
  constructor() {
    this._isDirty = true;
    this._useRGBAIfOnlyBC1BC3AvailableWhenUASTC = true;
    this._ktx2DecoderOptions = {};
  }
  get isDirty() {
    return this._isDirty;
  }
  get useRGBAIfASTCBC7NotAvailableWhenUASTC() {
    return this._useRGBAIfASTCBC7NotAvailableWhenUASTC;
  }
  set useRGBAIfASTCBC7NotAvailableWhenUASTC(value) {
    if (this._useRGBAIfASTCBC7NotAvailableWhenUASTC === value) return;
    this._useRGBAIfASTCBC7NotAvailableWhenUASTC = value;
    this._isDirty = true;
  }
  get useRGBAIfOnlyBC1BC3AvailableWhenUASTC() {
    return this._useRGBAIfOnlyBC1BC3AvailableWhenUASTC;
  }
  set useRGBAIfOnlyBC1BC3AvailableWhenUASTC(value) {
    if (this._useRGBAIfOnlyBC1BC3AvailableWhenUASTC === value) return;
    this._useRGBAIfOnlyBC1BC3AvailableWhenUASTC = value;
    this._isDirty = true;
  }
  get forceRGBA() {
    return this._forceRGBA;
  }
  set forceRGBA(value) {
    if (this._forceRGBA === value) return;
    this._forceRGBA = value;
    this._isDirty = true;
  }
  get forceR8() {
    return this._forceR8;
  }
  set forceR8(value) {
    if (this._forceR8 === value) return;
    this._forceR8 = value;
    this._isDirty = true;
  }
  get forceRG8() {
    return this._forceRG8;
  }
  set forceRG8(value) {
    if (this._forceRG8 === value) return;
    this._forceRG8 = value;
    this._isDirty = true;
  }
  get bypassTranscoders() {
    return this._bypassTranscoders;
  }
  set bypassTranscoders(value) {
    if (this._bypassTranscoders === value) return;
    this._bypassTranscoders = value;
    this._isDirty = true;
  }
  _getKTX2DecoderOptions() {
    if (!this._isDirty) return this._ktx2DecoderOptions;
    this._isDirty = false;
    const options = {};
    if (this._useRGBAIfASTCBC7NotAvailableWhenUASTC !== void 0) options.useRGBAIfASTCBC7NotAvailableWhenUASTC = this._useRGBAIfASTCBC7NotAvailableWhenUASTC;
    if (this._forceRGBA !== void 0) options.forceRGBA = this._forceRGBA;
    if (this._forceR8 !== void 0) options.forceR8 = this._forceR8;
    if (this._forceRG8 !== void 0) options.forceRG8 = this._forceRG8;
    if (this._bypassTranscoders !== void 0) options.bypassTranscoders = this._bypassTranscoders;
    if (this.useRGBAIfOnlyBC1BC3AvailableWhenUASTC) options.transcodeFormatDecisionTree = { UASTC: {
      transcodeFormat: [TranscodeTarget.BC1_RGB, TranscodeTarget.BC3_RGBA],
      yes: {
        transcodeFormat: TranscodeTarget.RGBA32,
        engineFormat: 32856,
        roundToMultiple4: false
      }
    } };
    this._ktx2DecoderOptions = options;
    return options;
  }
};
var KhronosTextureContainer22 = class KhronosTextureContainer23 {
  static GetDefaultNumWorkers() {
    if (typeof navigator !== "object" || !navigator.hardwareConcurrency) return 1;
    return Math.min(Math.floor(navigator.hardwareConcurrency * 0.5), 4);
  }
  static _Initialize(numWorkers) {
    if (KhronosTextureContainer23._WorkerPoolPromise || KhronosTextureContainer23._DecoderModulePromise) return;
    const urls = {
      wasmBaseUrl: Tools.ScriptBaseUrl,
      jsDecoderModule: Tools.GetBabylonScriptURL(this.URLConfig.jsDecoderModule, true),
      wasmUASTCToASTC: Tools.GetBabylonScriptURL(this.URLConfig.wasmUASTCToASTC, true),
      wasmUASTCToBC7: Tools.GetBabylonScriptURL(this.URLConfig.wasmUASTCToBC7, true),
      wasmUASTCToRGBA_UNORM: Tools.GetBabylonScriptURL(this.URLConfig.wasmUASTCToRGBA_UNORM, true),
      wasmUASTCToRGBA_SRGB: Tools.GetBabylonScriptURL(this.URLConfig.wasmUASTCToRGBA_SRGB, true),
      wasmUASTCToR8_UNORM: Tools.GetBabylonScriptURL(this.URLConfig.wasmUASTCToR8_UNORM, true),
      wasmUASTCToRG8_UNORM: Tools.GetBabylonScriptURL(this.URLConfig.wasmUASTCToRG8_UNORM, true),
      jsMSCTranscoder: Tools.GetBabylonScriptURL(this.URLConfig.jsMSCTranscoder, true),
      wasmMSCTranscoder: Tools.GetBabylonScriptURL(this.URLConfig.wasmMSCTranscoder, true),
      wasmZSTDDecoder: Tools.GetBabylonScriptURL(this.URLConfig.wasmZSTDDecoder, true)
    };
    if (numWorkers && typeof Worker === "function" && typeof URL !== "undefined") KhronosTextureContainer23._WorkerPoolPromise = new Promise((resolve) => {
      const workerContent = `${applyConfig}(${workerFunction})()`;
      const workerBlobUrl = URL.createObjectURL(new Blob([workerContent], { type: "application/javascript" }));
      resolve(new AutoReleaseWorkerPool(numWorkers, async () => await initializeWebWorker(new Worker(workerBlobUrl), void 0, urls)));
    });
    else if (typeof KhronosTextureContainer23._KTX2DecoderModule === "undefined") KhronosTextureContainer23._DecoderModulePromise = Tools.LoadBabylonScriptAsync(urls.jsDecoderModule).then(() => {
      KhronosTextureContainer23._KTX2DecoderModule = KTX2DECODER;
      KhronosTextureContainer23._KTX2DecoderModule.MSCTranscoder.UseFromWorkerThread = false;
      KhronosTextureContainer23._KTX2DecoderModule.WASMMemoryManager.LoadBinariesFromCurrentThread = true;
      applyConfig(urls, KhronosTextureContainer23._KTX2DecoderModule);
      return new KhronosTextureContainer23._KTX2DecoderModule.KTX2Decoder();
    });
    else {
      KhronosTextureContainer23._KTX2DecoderModule.MSCTranscoder.UseFromWorkerThread = false;
      KhronosTextureContainer23._KTX2DecoderModule.WASMMemoryManager.LoadBinariesFromCurrentThread = true;
      KhronosTextureContainer23._DecoderModulePromise = Promise.resolve(new KhronosTextureContainer23._KTX2DecoderModule.KTX2Decoder());
    }
  }
  constructor(engine, numWorkersOrOptions = KhronosTextureContainer23.DefaultNumWorkers) {
    this._engine = engine;
    const workerPoolOption = typeof numWorkersOrOptions === "object" && numWorkersOrOptions.workerPool || KhronosTextureContainer23.WorkerPool;
    if (workerPoolOption) KhronosTextureContainer23._WorkerPoolPromise = Promise.resolve(workerPoolOption);
    else {
      if (typeof numWorkersOrOptions === "object") KhronosTextureContainer23._KTX2DecoderModule = numWorkersOrOptions?.binariesAndModulesContainer?.jsDecoderModule;
      else if (typeof KTX2DECODER !== "undefined") KhronosTextureContainer23._KTX2DecoderModule = KTX2DECODER;
      const numberOfWorkers = typeof numWorkersOrOptions === "number" ? numWorkersOrOptions : numWorkersOrOptions.numWorkers ?? KhronosTextureContainer23.DefaultNumWorkers;
      KhronosTextureContainer23._Initialize(numberOfWorkers);
    }
  }
  async _uploadAsync(data, internalTexture, options) {
    const caps = this._engine.getCaps();
    const compressedTexturesCaps = {
      astc: !!caps.astc,
      bptc: !!caps.bptc,
      s3tc: !!caps.s3tc,
      pvrtc: !!caps.pvrtc,
      etc2: !!caps.etc2,
      etc1: !!caps.etc1
    };
    if (KhronosTextureContainer23._WorkerPoolPromise) {
      const workerPool = await KhronosTextureContainer23._WorkerPoolPromise;
      return await new Promise((resolve, reject) => {
        workerPool.push((worker, onComplete) => {
          const onError = (error) => {
            worker.removeEventListener("error", onError);
            worker.removeEventListener("message", onMessage);
            reject(error);
            onComplete();
          };
          const onMessage = (message) => {
            if (message.data.action === "decoded") {
              worker.removeEventListener("error", onError);
              worker.removeEventListener("message", onMessage);
              if (!message.data.success) reject({ message: message.data.msg });
              else try {
                this._createTexture(message.data.decodedData, internalTexture, options);
                resolve();
              } catch (err) {
                reject({ message: err });
              }
              onComplete();
            }
          };
          worker.addEventListener("error", onError);
          worker.addEventListener("message", onMessage);
          worker.postMessage({
            action: "setDefaultDecoderOptions",
            options: KhronosTextureContainer23.DefaultDecoderOptions._getKTX2DecoderOptions()
          });
          const dataCopy = new Uint8Array(data.byteLength);
          dataCopy.set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
          worker.postMessage({
            action: "decode",
            data: dataCopy,
            caps: compressedTexturesCaps,
            options
          }, [dataCopy.buffer]);
        });
      });
    } else if (KhronosTextureContainer23._DecoderModulePromise) {
      const decoder = await KhronosTextureContainer23._DecoderModulePromise;
      if (KhronosTextureContainer23.DefaultDecoderOptions.isDirty) KhronosTextureContainer23._KTX2DecoderModule.KTX2Decoder.DefaultDecoderOptions = KhronosTextureContainer23.DefaultDecoderOptions._getKTX2DecoderOptions();
      return await new Promise((resolve, reject) => {
        decoder.decode(data, caps).then((data2) => {
          this._createTexture(data2, internalTexture);
          resolve();
        }).catch((reason) => {
          reject({ message: reason });
        });
      });
    }
    throw new Error("KTX2 decoder module is not available");
  }
  _createTexture(data, internalTexture, options) {
    const oglTexture2D = 3553;
    this._engine._bindTextureDirectly(oglTexture2D, internalTexture);
    if (options) {
      options.transcodedFormat = data.transcodedFormat;
      options.isInGammaSpace = data.isInGammaSpace;
      options.hasAlpha = data.hasAlpha;
      options.transcoderName = data.transcoderName;
    }
    let isUncompressedFormat = true;
    switch (data.transcodedFormat) {
      case 32856:
        internalTexture.type = 0;
        internalTexture.format = 5;
        break;
      case 33321:
        internalTexture.type = 0;
        internalTexture.format = 6;
        break;
      case 33323:
        internalTexture.type = 0;
        internalTexture.format = 7;
        break;
      default:
        internalTexture.format = data.transcodedFormat;
        isUncompressedFormat = false;
        break;
    }
    internalTexture._gammaSpace = data.isInGammaSpace;
    internalTexture.generateMipMaps = data.mipmaps.length > 1;
    internalTexture.width = data.mipmaps[0].width;
    internalTexture.height = data.mipmaps[0].height;
    if (data.errors) throw new Error("KTX2 container - could not transcode the data. " + data.errors);
    for (let t = 0; t < data.mipmaps.length; ++t) {
      const mipmap = data.mipmaps[t];
      if (!mipmap || !mipmap.data) throw new Error("KTX2 container - could not transcode one of the image");
      if (isUncompressedFormat) {
        internalTexture.width = mipmap.width;
        internalTexture.height = mipmap.height;
        this._engine._uploadDataToTextureDirectly(internalTexture, mipmap.data, 0, t, void 0, true);
      } else this._engine._uploadCompressedDataToTextureDirectly(internalTexture, data.transcodedFormat, mipmap.width, mipmap.height, mipmap.data, 0, t);
    }
    internalTexture._extension = ".ktx2";
    internalTexture.isReady = true;
    this._engine._bindTextureDirectly(oglTexture2D, null);
  }
  static IsValid(data) {
    if (data.byteLength >= 12) {
      const identifier = new Uint8Array(data.buffer, data.byteOffset, 12);
      if (identifier[0] === 171 && identifier[1] === 75 && identifier[2] === 84 && identifier[3] === 88 && identifier[4] === 32 && identifier[5] === 50 && identifier[6] === 48 && identifier[7] === 187 && identifier[8] === 13 && identifier[9] === 10 && identifier[10] === 26 && identifier[11] === 10) return true;
    }
    return false;
  }
};
KhronosTextureContainer22.URLConfig = {
  jsDecoderModule: "https://cdn.babylonjs.com/babylon.ktx2Decoder.js",
  wasmUASTCToASTC: null,
  wasmUASTCToBC7: null,
  wasmUASTCToRGBA_UNORM: null,
  wasmUASTCToRGBA_SRGB: null,
  wasmUASTCToR8_UNORM: null,
  wasmUASTCToRG8_UNORM: null,
  jsMSCTranscoder: null,
  wasmMSCTranscoder: null,
  wasmZSTDDecoder: null
};
KhronosTextureContainer22.DefaultNumWorkers = KhronosTextureContainer22.GetDefaultNumWorkers();
KhronosTextureContainer22.DefaultDecoderOptions = new DefaultKTX2DecoderOptions();
function MapSRGBToLinear(format) {
  switch (format) {
    case 35916:
      return 33776;
    case 35918:
      return 33778;
    case 35919:
      return 33779;
    case 37493:
      return 37492;
    case 37497:
      return 37496;
    case 37495:
      return 37494;
    case 37840:
      return 37808;
    case 37841:
      return 37809;
    case 37842:
      return 37810;
    case 37843:
      return 37811;
    case 37844:
      return 37812;
    case 37845:
      return 37813;
    case 37846:
      return 37814;
    case 37847:
      return 37815;
    case 37848:
      return 37816;
    case 37849:
      return 37817;
    case 37850:
      return 37818;
    case 37851:
      return 37819;
    case 37852:
      return 37820;
    case 37853:
      return 37821;
    case 36493:
      return 36492;
  }
  return null;
}
var _KTXTextureLoader = class {
  constructor() {
    this.supportCascades = false;
  }
  loadCubeData(data, texture, createPolynomials, onLoad) {
    if (Array.isArray(data)) return;
    texture._invertVScale = !texture.invertY;
    const engine = texture.getEngine();
    const ktx = new KhronosTextureContainer(data, 6);
    const mappedFormat = MapSRGBToLinear(ktx.glInternalFormat);
    if (mappedFormat !== null) {
      texture.format = mappedFormat;
      texture._useSRGBBuffer = engine._getUseSRGBBuffer(true, !texture.generateMipMaps);
      texture._gammaSpace = true;
    } else texture.format = ktx.glInternalFormat;
    const loadMipmap = ktx.numberOfMipmapLevels > 1 && texture.generateMipMaps;
    engine._unpackFlipY(true);
    ktx.uploadLevels(texture, texture.generateMipMaps);
    texture.width = ktx.pixelWidth;
    texture.height = ktx.pixelHeight;
    engine._setCubeMapTextureParams(texture, loadMipmap, ktx.numberOfMipmapLevels - 1);
    texture.isReady = true;
    texture.onLoadedObservable.notifyObservers(texture);
    texture.onLoadedObservable.clear();
    if (onLoad) onLoad();
  }
  loadData(data, texture, callback, options) {
    if (KhronosTextureContainer.IsValid(data)) {
      texture._invertVScale = !texture.invertY;
      const ktx = new KhronosTextureContainer(data, 1);
      const mappedFormat = MapSRGBToLinear(ktx.glInternalFormat);
      if (mappedFormat !== null) {
        texture.format = mappedFormat;
        texture._useSRGBBuffer = texture.getEngine()._getUseSRGBBuffer(true, !texture.generateMipMaps);
        texture._gammaSpace = true;
      } else texture.format = ktx.glInternalFormat;
      callback(ktx.pixelWidth, ktx.pixelHeight, texture.generateMipMaps, true, () => {
        ktx.uploadLevels(texture, texture.generateMipMaps);
      }, ktx.isInvalid);
    } else if (KhronosTextureContainer22.IsValid(data)) new KhronosTextureContainer22(texture.getEngine())._uploadAsync(data, texture, options).then(() => {
      callback(texture.width, texture.height, texture.generateMipMaps, true, () => {
      }, false);
    }, (error) => {
      Logger.Warn(`Failed to load KTX2 texture data: ${error.message}`);
      callback(0, 0, false, false, () => {
      }, true);
    });
    else {
      Logger.Error("texture missing KTX identifier");
      callback(0, 0, false, false, () => {
      }, true);
    }
  }
};
export {
  _KTXTextureLoader
};
