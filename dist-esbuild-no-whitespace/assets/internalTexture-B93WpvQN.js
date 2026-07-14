import { s as Observable } from "./typeStore-BMcSg10V.js";
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
    this.samplingMode = -1, this._useMipMaps = !0, this._cachedWrapU = null, this._cachedWrapV = null, this._cachedWrapR = null, this._cachedAnisotropicFilteringLevel = null, this._comparisonFunction = 0;
  }
  setParameters(wrapU = 1, wrapV = 1, wrapR = 1, anisotropicFilteringLevel = 1, samplingMode = 2, comparisonFunction = 0) {
    return this._cachedWrapU = wrapU, this._cachedWrapV = wrapV, this._cachedWrapR = wrapR, this._cachedAnisotropicFilteringLevel = anisotropicFilteringLevel, this.samplingMode = samplingMode, this._comparisonFunction = comparisonFunction, this;
  }
  compareSampler(other) {
    return this._cachedWrapU === other._cachedWrapU && this._cachedWrapV === other._cachedWrapV && this._cachedWrapR === other._cachedWrapR && this._cachedAnisotropicFilteringLevel === other._cachedAnisotropicFilteringLevel && this.samplingMode === other.samplingMode && this._comparisonFunction === other._comparisonFunction && this._useMipMaps === other._useMipMaps;
  }
}, InternalTextureSource;
(function(InternalTextureSource2) {
  InternalTextureSource2[InternalTextureSource2.Unknown = 0] = "Unknown", InternalTextureSource2[InternalTextureSource2.Url = 1] = "Url", InternalTextureSource2[InternalTextureSource2.Temp = 2] = "Temp", InternalTextureSource2[InternalTextureSource2.Raw = 3] = "Raw", InternalTextureSource2[InternalTextureSource2.Dynamic = 4] = "Dynamic", InternalTextureSource2[InternalTextureSource2.RenderTarget = 5] = "RenderTarget", InternalTextureSource2[InternalTextureSource2.MultiRenderTarget = 6] = "MultiRenderTarget", InternalTextureSource2[InternalTextureSource2.Cube = 7] = "Cube", InternalTextureSource2[InternalTextureSource2.CubeRaw = 8] = "CubeRaw", InternalTextureSource2[InternalTextureSource2.CubePrefiltered = 9] = "CubePrefiltered", InternalTextureSource2[InternalTextureSource2.Raw3D = 10] = "Raw3D", InternalTextureSource2[InternalTextureSource2.Raw2DArray = 11] = "Raw2DArray", InternalTextureSource2[InternalTextureSource2.DepthStencil = 12] = "DepthStencil", InternalTextureSource2[InternalTextureSource2.CubeRawRGBD = 13] = "CubeRawRGBD", InternalTextureSource2[InternalTextureSource2.Depth = 14] = "Depth", InternalTextureSource2[InternalTextureSource2.External = 15] = "External";
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
  constructor(engine, source, delayAllocation = !1) {
    super(), this.isReady = !1, this.isCube = !1, this.is3D = !1, this.is2DArray = !1, this.isMultiview = !1, this.url = "", this.generateMipMaps = !1, this._useMipMaps = null, this.mipLevelCount = 1, this.samples = 0, this.type = -1, this.format = -1, this.onLoadedObservable = new Observable(), this.onErrorObservable = new Observable(), this.onRebuildCallback = null, this.width = 0, this.height = 0, this.depth = 0, this.baseWidth = 0, this.baseHeight = 0, this.baseDepth = 0, this.invertY = !1, this._invertVScale = !1, this._associatedChannel = -1, this._source = 0, this._buffer = null, this._bufferView = null, this._bufferViewArray = null, this._bufferViewArrayArray = null, this._size = 0, this._extension = "", this._files = null, this._workingCanvas = null, this._workingContext = null, this._cachedCoordinatesMode = null, this._isDisabled = !1, this._compression = null, this._sphericalPolynomial = null, this._sphericalPolynomialPromise = null, this._sphericalPolynomialComputed = !1, this._lodGenerationScale = 0, this._lodGenerationOffset = 0, this._useSRGBBuffer = !1, this._creationFlags = 0, this._lodTextureHigh = null, this._lodTextureMid = null, this._lodTextureLow = null, this._isRGBD = !1, this._linearSpecularLOD = !1, this._irradianceTexture = null, this._hardwareTexture = null, this._maxLodLevel = null, this._references = 1, this._gammaSpace = null, this._premulAlpha = !1, this._dynamicTextureSource = null, this._autoMSAAManagement = !1, this._engine = engine, this._source = source, this._uniqueId = InternalTexture2._Counter++, delayAllocation || (this._hardwareTexture = engine._createHardwareTexture());
  }
  incrementReferences() {
    this._references++;
  }
  updateSize(width, height, depth = 1) {
    this._engine.updateTextureDimensions(this, width, height, depth), this.width = width, this.height = height, this.depth = depth, this.baseWidth = width, this.baseHeight = height, this.baseDepth = depth, this._size = width * height * depth;
  }
  _rebuild() {
    if (this.isReady = !1, this._cachedCoordinatesMode = null, this._cachedWrapU = null, this._cachedWrapV = null, this._cachedWrapR = null, this._cachedAnisotropicFilteringLevel = null, this.onRebuildCallback) {
      const data = this.onRebuildCallback(this), swapAndSetIsReady = (proxyInternalTexture) => {
        proxyInternalTexture._swapAndDie(this, !1), this.isReady = data.isReady;
      };
      data.isAsync ? data.proxy.then(swapAndSetIsReady) : swapAndSetIsReady(data.proxy);
      return;
    }
    let proxy;
    switch (this.source) {
      case 2:
        break;
      case 1:
        proxy = this._engine.createTexture(this._originalUrl ?? this.url, !this.generateMipMaps, this.invertY, null, this.samplingMode, (temp) => {
          temp._swapAndDie(this, !1), this.isReady = !0;
        }, null, this._buffer, void 0, this.format, this._extension, void 0, void 0, void 0, this._useSRGBBuffer);
        return;
      case 3:
        if (proxy = this._engine.createRawTexture(this._bufferView, this.baseWidth, this.baseHeight, this.format, this.generateMipMaps, this.invertY, this.samplingMode, this._compression, this.type, this._creationFlags, this._useSRGBBuffer, this.mipLevelCount), proxy._swapAndDie(this, !1), this._bufferViewArray) for (let mipLevel = 0; mipLevel < this._bufferViewArray.length; mipLevel++) {
          const mipData = this._bufferViewArray[mipLevel];
          mipData && this._engine.updateRawTexture(this, mipData, this.format, this.invertY, this._compression, this.type, this._useSRGBBuffer, mipLevel);
        }
        this.isReady = !0;
        break;
      case 10:
        proxy = this._engine.createRawTexture3D(this._bufferView, this.baseWidth, this.baseHeight, this.baseDepth, this.format, this.generateMipMaps, this.invertY, this.samplingMode, this._compression, this.type), proxy._swapAndDie(this, !1), this.isReady = !0;
        break;
      case 11:
        if (proxy = this._engine.createRawTexture2DArray(this._bufferView, this.baseWidth, this.baseHeight, this.baseDepth, this.format, this.generateMipMaps, this.invertY, this.samplingMode, this._compression, this.type, this._creationFlags, this.mipLevelCount), proxy._swapAndDie(this, !1), this._bufferViewArray) for (let mipLevel = 0; mipLevel < this._bufferViewArray.length; mipLevel++) {
          const mipData = this._bufferViewArray[mipLevel];
          mipData && this._engine.updateRawTexture2DArray(this, mipData, this.format, this.invertY, this._compression, this.type, mipLevel);
        }
        this.isReady = !0;
        break;
      case 4:
        proxy = this._engine.createDynamicTexture(this.baseWidth, this.baseHeight, this.generateMipMaps, this.samplingMode), proxy._swapAndDie(this, !1), this._dynamicTextureSource && this._engine.updateDynamicTexture(this, this._dynamicTextureSource, this.invertY, this._premulAlpha, this.format, !0);
        break;
      case 7:
        proxy = this._engine.createCubeTexture(this.url, null, this._files, !this.generateMipMaps, () => {
          proxy._swapAndDie(this, !1), this.isReady = !0;
        }, null, this.format, this._extension, !1, 0, 0, null, void 0, this._useSRGBBuffer, ArrayBuffer.isView(this._buffer) ? this._buffer : null);
        return;
      case 8:
        proxy = this._engine.createRawCubeTexture(this._bufferViewArray, this.width, this._originalFormat ?? this.format, this.type, this.generateMipMaps, this.invertY, this.samplingMode, this._compression), proxy._swapAndDie(this, !1), this.isReady = !0;
        break;
      case 13:
        return;
      case 9:
        proxy = this._engine.createPrefilteredCubeTexture(this.url, null, this._lodGenerationScale, this._lodGenerationOffset, (proxy2) => {
          proxy2 && proxy2._swapAndDie(this, !1), this.isReady = !0;
        }, null, this.format, this._extension), proxy._sphericalPolynomial = this._sphericalPolynomial;
        return;
      case 12:
      case 14:
        break;
      case 15:
        break;
    }
  }
  _swapAndDie(target, swapAll = !0) {
    this._hardwareTexture?.setUsage(target._source, this.generateMipMaps, this.is2DArray, this.isCube, this.is3D, this.width, this.height, this.depth), target._hardwareTexture = this._hardwareTexture, target._setUniqueId(InternalTexture2._Counter++), swapAll && (target._isRGBD = this._isRGBD), this._lodTextureHigh && (target._lodTextureHigh && target._lodTextureHigh.dispose(), target._lodTextureHigh = this._lodTextureHigh), this._lodTextureMid && (target._lodTextureMid && target._lodTextureMid.dispose(), target._lodTextureMid = this._lodTextureMid), this._lodTextureLow && (target._lodTextureLow && target._lodTextureLow.dispose(), target._lodTextureLow = this._lodTextureLow), this._irradianceTexture && (target._irradianceTexture && target._irradianceTexture.dispose(), target._irradianceTexture = this._irradianceTexture);
    const cache = this._engine.getLoadedTexturesCache();
    let index = cache.indexOf(this);
    index !== -1 && cache.splice(index, 1), index = cache.indexOf(target), index === -1 && cache.push(target);
  }
  dispose() {
    this._references--, this._references === 0 && (this.onLoadedObservable.clear(), this.onErrorObservable.clear(), this._engine._releaseTexture(this), this._hardwareTexture = null, this._dynamicTextureSource = null);
  }
};
InternalTexture._Counter = 0;
export {
  InternalTexture as t
};
