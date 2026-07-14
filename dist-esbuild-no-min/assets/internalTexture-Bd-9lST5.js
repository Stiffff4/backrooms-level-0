import { s as Observable } from "./typeStore-CRwQ34I6.js";
var TextureSampler = class {
  get wrapU() {
    return this._cachedWrapU;
  }
  set wrapU(value) {
    this._cachedWrapU = value;
  }
  get wrapV() {
    return this._cachedWrapV;
  }
  set wrapV(value) {
    this._cachedWrapV = value;
  }
  get wrapR() {
    return this._cachedWrapR;
  }
  set wrapR(value) {
    this._cachedWrapR = value;
  }
  get anisotropicFilteringLevel() {
    return this._cachedAnisotropicFilteringLevel;
  }
  set anisotropicFilteringLevel(value) {
    this._cachedAnisotropicFilteringLevel = value;
  }
  get comparisonFunction() {
    return this._comparisonFunction;
  }
  set comparisonFunction(value) {
    this._comparisonFunction = value;
  }
  get useMipMaps() {
    return this._useMipMaps;
  }
  set useMipMaps(value) {
    this._useMipMaps = value;
  }
  constructor() {
    this.samplingMode = -1;
    this._useMipMaps = true;
    this._cachedWrapU = null;
    this._cachedWrapV = null;
    this._cachedWrapR = null;
    this._cachedAnisotropicFilteringLevel = null;
    this._comparisonFunction = 0;
  }
  setParameters(wrapU = 1, wrapV = 1, wrapR = 1, anisotropicFilteringLevel = 1, samplingMode = 2, comparisonFunction = 0) {
    this._cachedWrapU = wrapU;
    this._cachedWrapV = wrapV;
    this._cachedWrapR = wrapR;
    this._cachedAnisotropicFilteringLevel = anisotropicFilteringLevel;
    this.samplingMode = samplingMode;
    this._comparisonFunction = comparisonFunction;
    return this;
  }
  compareSampler(other) {
    return this._cachedWrapU === other._cachedWrapU && this._cachedWrapV === other._cachedWrapV && this._cachedWrapR === other._cachedWrapR && this._cachedAnisotropicFilteringLevel === other._cachedAnisotropicFilteringLevel && this.samplingMode === other.samplingMode && this._comparisonFunction === other._comparisonFunction && this._useMipMaps === other._useMipMaps;
  }
};
var InternalTextureSource;
(function(InternalTextureSource2) {
  InternalTextureSource2[InternalTextureSource2["Unknown"] = 0] = "Unknown";
  InternalTextureSource2[InternalTextureSource2["Url"] = 1] = "Url";
  InternalTextureSource2[InternalTextureSource2["Temp"] = 2] = "Temp";
  InternalTextureSource2[InternalTextureSource2["Raw"] = 3] = "Raw";
  InternalTextureSource2[InternalTextureSource2["Dynamic"] = 4] = "Dynamic";
  InternalTextureSource2[InternalTextureSource2["RenderTarget"] = 5] = "RenderTarget";
  InternalTextureSource2[InternalTextureSource2["MultiRenderTarget"] = 6] = "MultiRenderTarget";
  InternalTextureSource2[InternalTextureSource2["Cube"] = 7] = "Cube";
  InternalTextureSource2[InternalTextureSource2["CubeRaw"] = 8] = "CubeRaw";
  InternalTextureSource2[InternalTextureSource2["CubePrefiltered"] = 9] = "CubePrefiltered";
  InternalTextureSource2[InternalTextureSource2["Raw3D"] = 10] = "Raw3D";
  InternalTextureSource2[InternalTextureSource2["Raw2DArray"] = 11] = "Raw2DArray";
  InternalTextureSource2[InternalTextureSource2["DepthStencil"] = 12] = "DepthStencil";
  InternalTextureSource2[InternalTextureSource2["CubeRawRGBD"] = 13] = "CubeRawRGBD";
  InternalTextureSource2[InternalTextureSource2["Depth"] = 14] = "Depth";
  InternalTextureSource2[InternalTextureSource2["External"] = 15] = "External";
})(InternalTextureSource || (InternalTextureSource = {}));
var InternalTexture = class InternalTexture2 extends TextureSampler {
  get useMipMaps() {
    return this._useMipMaps === null ? this.generateMipMaps : this._useMipMaps;
  }
  set useMipMaps(value) {
    this._useMipMaps = value;
  }
  get uniqueId() {
    return this._uniqueId;
  }
  _setUniqueId(id) {
    this._uniqueId = id;
  }
  getEngine() {
    return this._engine;
  }
  get source() {
    return this._source;
  }
  constructor(engine, source, delayAllocation = false) {
    super();
    this.isReady = false;
    this.isCube = false;
    this.is3D = false;
    this.is2DArray = false;
    this.isMultiview = false;
    this.url = "";
    this.generateMipMaps = false;
    this._useMipMaps = null;
    this.mipLevelCount = 1;
    this.samples = 0;
    this.type = -1;
    this.format = -1;
    this.onLoadedObservable = new Observable();
    this.onErrorObservable = new Observable();
    this.onRebuildCallback = null;
    this.width = 0;
    this.height = 0;
    this.depth = 0;
    this.baseWidth = 0;
    this.baseHeight = 0;
    this.baseDepth = 0;
    this.invertY = false;
    this._invertVScale = false;
    this._associatedChannel = -1;
    this._source = 0;
    this._buffer = null;
    this._bufferView = null;
    this._bufferViewArray = null;
    this._bufferViewArrayArray = null;
    this._size = 0;
    this._extension = "";
    this._files = null;
    this._workingCanvas = null;
    this._workingContext = null;
    this._cachedCoordinatesMode = null;
    this._isDisabled = false;
    this._compression = null;
    this._sphericalPolynomial = null;
    this._sphericalPolynomialPromise = null;
    this._sphericalPolynomialComputed = false;
    this._lodGenerationScale = 0;
    this._lodGenerationOffset = 0;
    this._useSRGBBuffer = false;
    this._creationFlags = 0;
    this._lodTextureHigh = null;
    this._lodTextureMid = null;
    this._lodTextureLow = null;
    this._isRGBD = false;
    this._linearSpecularLOD = false;
    this._irradianceTexture = null;
    this._hardwareTexture = null;
    this._maxLodLevel = null;
    this._references = 1;
    this._gammaSpace = null;
    this._premulAlpha = false;
    this._dynamicTextureSource = null;
    this._autoMSAAManagement = false;
    this._engine = engine;
    this._source = source;
    this._uniqueId = InternalTexture2._Counter++;
    if (!delayAllocation) this._hardwareTexture = engine._createHardwareTexture();
  }
  incrementReferences() {
    this._references++;
  }
  updateSize(width, height, depth = 1) {
    this._engine.updateTextureDimensions(this, width, height, depth);
    this.width = width;
    this.height = height;
    this.depth = depth;
    this.baseWidth = width;
    this.baseHeight = height;
    this.baseDepth = depth;
    this._size = width * height * depth;
  }
  _rebuild() {
    this.isReady = false;
    this._cachedCoordinatesMode = null;
    this._cachedWrapU = null;
    this._cachedWrapV = null;
    this._cachedWrapR = null;
    this._cachedAnisotropicFilteringLevel = null;
    if (this.onRebuildCallback) {
      const data = this.onRebuildCallback(this);
      const swapAndSetIsReady = (proxyInternalTexture) => {
        proxyInternalTexture._swapAndDie(this, false);
        this.isReady = data.isReady;
      };
      if (data.isAsync) data.proxy.then(swapAndSetIsReady);
      else swapAndSetIsReady(data.proxy);
      return;
    }
    let proxy;
    switch (this.source) {
      case 2:
        break;
      case 1:
        proxy = this._engine.createTexture(this._originalUrl ?? this.url, !this.generateMipMaps, this.invertY, null, this.samplingMode, (temp) => {
          temp._swapAndDie(this, false);
          this.isReady = true;
        }, null, this._buffer, void 0, this.format, this._extension, void 0, void 0, void 0, this._useSRGBBuffer);
        return;
      case 3:
        proxy = this._engine.createRawTexture(this._bufferView, this.baseWidth, this.baseHeight, this.format, this.generateMipMaps, this.invertY, this.samplingMode, this._compression, this.type, this._creationFlags, this._useSRGBBuffer, this.mipLevelCount);
        proxy._swapAndDie(this, false);
        if (this._bufferViewArray) for (let mipLevel = 0; mipLevel < this._bufferViewArray.length; mipLevel++) {
          const mipData = this._bufferViewArray[mipLevel];
          if (mipData) this._engine.updateRawTexture(this, mipData, this.format, this.invertY, this._compression, this.type, this._useSRGBBuffer, mipLevel);
        }
        this.isReady = true;
        break;
      case 10:
        proxy = this._engine.createRawTexture3D(this._bufferView, this.baseWidth, this.baseHeight, this.baseDepth, this.format, this.generateMipMaps, this.invertY, this.samplingMode, this._compression, this.type);
        proxy._swapAndDie(this, false);
        this.isReady = true;
        break;
      case 11:
        proxy = this._engine.createRawTexture2DArray(this._bufferView, this.baseWidth, this.baseHeight, this.baseDepth, this.format, this.generateMipMaps, this.invertY, this.samplingMode, this._compression, this.type, this._creationFlags, this.mipLevelCount);
        proxy._swapAndDie(this, false);
        if (this._bufferViewArray) for (let mipLevel = 0; mipLevel < this._bufferViewArray.length; mipLevel++) {
          const mipData = this._bufferViewArray[mipLevel];
          if (mipData) this._engine.updateRawTexture2DArray(this, mipData, this.format, this.invertY, this._compression, this.type, mipLevel);
        }
        this.isReady = true;
        break;
      case 4:
        proxy = this._engine.createDynamicTexture(this.baseWidth, this.baseHeight, this.generateMipMaps, this.samplingMode);
        proxy._swapAndDie(this, false);
        if (this._dynamicTextureSource) this._engine.updateDynamicTexture(this, this._dynamicTextureSource, this.invertY, this._premulAlpha, this.format, true);
        break;
      case 7:
        proxy = this._engine.createCubeTexture(this.url, null, this._files, !this.generateMipMaps, () => {
          proxy._swapAndDie(this, false);
          this.isReady = true;
        }, null, this.format, this._extension, false, 0, 0, null, void 0, this._useSRGBBuffer, ArrayBuffer.isView(this._buffer) ? this._buffer : null);
        return;
      case 8:
        proxy = this._engine.createRawCubeTexture(this._bufferViewArray, this.width, this._originalFormat ?? this.format, this.type, this.generateMipMaps, this.invertY, this.samplingMode, this._compression);
        proxy._swapAndDie(this, false);
        this.isReady = true;
        break;
      case 13:
        return;
      case 9:
        proxy = this._engine.createPrefilteredCubeTexture(this.url, null, this._lodGenerationScale, this._lodGenerationOffset, (proxy2) => {
          if (proxy2) proxy2._swapAndDie(this, false);
          this.isReady = true;
        }, null, this.format, this._extension);
        proxy._sphericalPolynomial = this._sphericalPolynomial;
        return;
      case 12:
      case 14:
        break;
      case 15:
        break;
    }
  }
  _swapAndDie(target, swapAll = true) {
    this._hardwareTexture?.setUsage(target._source, this.generateMipMaps, this.is2DArray, this.isCube, this.is3D, this.width, this.height, this.depth);
    target._hardwareTexture = this._hardwareTexture;
    target._setUniqueId(InternalTexture2._Counter++);
    if (swapAll) target._isRGBD = this._isRGBD;
    if (this._lodTextureHigh) {
      if (target._lodTextureHigh) target._lodTextureHigh.dispose();
      target._lodTextureHigh = this._lodTextureHigh;
    }
    if (this._lodTextureMid) {
      if (target._lodTextureMid) target._lodTextureMid.dispose();
      target._lodTextureMid = this._lodTextureMid;
    }
    if (this._lodTextureLow) {
      if (target._lodTextureLow) target._lodTextureLow.dispose();
      target._lodTextureLow = this._lodTextureLow;
    }
    if (this._irradianceTexture) {
      if (target._irradianceTexture) target._irradianceTexture.dispose();
      target._irradianceTexture = this._irradianceTexture;
    }
    const cache = this._engine.getLoadedTexturesCache();
    let index = cache.indexOf(this);
    if (index !== -1) cache.splice(index, 1);
    index = cache.indexOf(target);
    if (index === -1) cache.push(target);
  }
  dispose() {
    this._references--;
    if (this._references === 0) {
      this.onLoadedObservable.clear();
      this.onErrorObservable.clear();
      this._engine._releaseTexture(this);
      this._hardwareTexture = null;
      this._dynamicTextureSource = null;
    }
  }
};
InternalTexture._Counter = 0;
export {
  InternalTexture as t
};
