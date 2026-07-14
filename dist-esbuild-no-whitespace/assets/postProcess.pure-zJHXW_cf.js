const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/postprocess.vertex-BbueQfqE.js","assets/shaderStore-Bfhtreha.js","assets/postprocess.vertex-B63qylup.js"])))=>i.map(i=>d[i]);
import { n as RegisterClass, s as Observable, t as GetClass } from "./typeStore-BMcSg10V.js";
import { c as TimingTools } from "./guid-D83Ubj_G.js";
import { _ as __esDecorate, a as serialize, n as SerializationHelper, s as serializeAsColor4, v as __runInitializers } from "./baseTexture.pure-erPkk1Vv.js";
import { l as Vector2 } from "./math.color.pure-DA4Mm_Z5.js";
import { i as Effect, n as AbstractEngine, t as __vitePreload } from "./preload-helper-ClLh1cPK.js";
function IsExponentOfTwo(value) {
  let count = 1;
  do
    count *= 2;
  while (count < value);
  return count === value;
}
function Mix(a, b, alpha) {
  return a * (1 - alpha) + b * alpha;
}
function NearestPOT(x) {
  const c = CeilingPOT(x), f = FloorPOT(x);
  return c - x > x - f ? f : c;
}
function CeilingPOT(x) {
  return x--, x |= x >> 1, x |= x >> 2, x |= x >> 4, x |= x >> 8, x |= x >> 16, x++, x;
}
function FloorPOT(x) {
  return x = x | x >> 1, x = x | x >> 2, x = x | x >> 4, x = x | x >> 8, x = x | x >> 16, x - (x >> 1);
}
function GetExponentOfTwo(value, max, mode = 2) {
  let pot;
  switch (mode) {
    case 1:
      pot = FloorPOT(value);
      break;
    case 2:
      pot = NearestPOT(value);
      break;
    default:
      pot = CeilingPOT(value);
      break;
  }
  return Math.min(pot, max);
}
var SmartArray = class SmartArray2 {
  constructor(capacity) {
    this.length = 0, this.data = new Array(capacity), this._id = SmartArray2._GlobalId++;
  }
  push(value) {
    this.data[this.length++] = value, this.length > this.data.length && (this.data.length *= 2);
  }
  forEach(func) {
    for (let index = 0; index < this.length; index++) func(this.data[index]);
  }
  sort(compareFn) {
    this.data.sort(compareFn);
  }
  reset() {
    this.length = 0;
  }
  dispose() {
    this.reset(), this.data && (this.data.length = 0);
  }
  concat(array) {
    if (array.length !== 0) {
      this.length + array.length > this.data.length && (this.data.length = (this.length + array.length) * 2);
      for (let index = 0; index < array.length; index++) this.data[this.length++] = (array.data || array)[index];
    }
  }
  indexOf(value) {
    const position = this.data.indexOf(value);
    return position >= this.length ? -1 : position;
  }
  contains(value) {
    return this.indexOf(value) !== -1;
  }
};
SmartArray._GlobalId = 0;
var SmartArrayNoDuplicate = class extends SmartArray {
  constructor() {
    super(...arguments), this._duplicateId = 0;
  }
  push(value) {
    super.push(value), value.__smartArrayFlags || (value.__smartArrayFlags = {}), value.__smartArrayFlags[this._id] = this._duplicateId;
  }
  pushNoDuplicate(value) {
    return value.__smartArrayFlags && value.__smartArrayFlags[this._id] === this._duplicateId ? !1 : (this.push(value), !0);
  }
  reset() {
    super.reset(), this._duplicateId++;
  }
  concatWithNoDuplicate(array) {
    if (array.length !== 0) {
      this.length + array.length > this.data.length && (this.data.length = (this.length + array.length) * 2);
      for (let index = 0; index < array.length; index++) {
        const item = (array.data || array)[index];
        this.pushNoDuplicate(item);
      }
    }
  }
}, DrawWrapper = class {
  static GetEffect(effect) {
    return effect.getPipelineContext === void 0 ? effect.effect : effect;
  }
  constructor(engine, createMaterialContext = !0) {
    this._wasPreviouslyReady = !1, this._forceRebindOnNextCall = !0, this._wasPreviouslyUsingInstances = null, this.effect = null, this.defines = null, this.drawContext = engine.createDrawContext(), createMaterialContext && (this.materialContext = engine.createMaterialContext());
  }
  setEffect(effect, defines, resetContext = !0) {
    this.effect = effect, defines !== void 0 && (this.defines = defines), resetContext && this.drawContext?.reset();
  }
  dispose(immediate = !1) {
    if (this.effect) {
      const effect = this.effect;
      immediate ? effect.dispose() : TimingTools.SetImmediate(() => {
        effect.getEngine().onEndFrameObservable.addOnce(() => {
          effect.dispose();
        });
      }), this.effect = null;
    }
    this.drawContext?.dispose();
  }
}, EffectWrapper = class EffectWrapper2 {
  static RegisterShaderCodeProcessing(effectWrapperName, customShaderCodeProcessing) {
    if (!customShaderCodeProcessing) {
      delete EffectWrapper2._CustomShaderCodeProcessing[effectWrapperName ?? ""];
      return;
    }
    EffectWrapper2._CustomShaderCodeProcessing[effectWrapperName ?? ""] = customShaderCodeProcessing;
  }
  static _GetShaderCodeProcessing(effectWrapperName) {
    return EffectWrapper2._CustomShaderCodeProcessing[effectWrapperName] ?? EffectWrapper2._CustomShaderCodeProcessing[""];
  }
  get name() {
    return this.options.name;
  }
  set name(value) {
    this.options.name = value;
  }
  isReady() {
    return this._drawWrapper.effect?.isReady() ?? !1;
  }
  get drawWrapper() {
    return this._drawWrapper;
  }
  get effect() {
    return this._drawWrapper.effect;
  }
  set effect(effect) {
    this._drawWrapper.effect = effect;
  }
  constructor(creationOptions) {
    this.alphaMode = 0, this.onEffectCreatedObservable = new Observable(void 0, !0), this.onApplyObservable = new Observable(), this._shadersLoaded = !1, this._webGPUReady = !1, this._importPromises = [], this.options = {
      ...creationOptions,
      name: creationOptions.name || "effectWrapper",
      engine: creationOptions.engine,
      uniforms: creationOptions.uniforms || creationOptions.uniformNames || [],
      uniformNames: void 0,
      samplers: creationOptions.samplers || creationOptions.samplerNames || [],
      samplerNames: void 0,
      attributeNames: creationOptions.attributeNames || ["position"],
      uniformBuffers: creationOptions.uniformBuffers || [],
      defines: creationOptions.defines || "",
      useShaderStore: creationOptions.useShaderStore || !1,
      vertexUrl: creationOptions.vertexUrl || creationOptions.vertexShader || "postprocess",
      vertexShader: void 0,
      fragmentShader: creationOptions.fragmentShader || "pass",
      indexParameters: creationOptions.indexParameters,
      blockCompilation: creationOptions.blockCompilation || !1,
      shaderLanguage: creationOptions.shaderLanguage || 0,
      onCompiled: creationOptions.onCompiled || void 0,
      extraInitializations: creationOptions.extraInitializations || void 0,
      extraInitializationsAsync: creationOptions.extraInitializationsAsync || void 0,
      useAsPostProcess: creationOptions.useAsPostProcess ?? !1,
      allowEmptySourceTexture: creationOptions.allowEmptySourceTexture ?? !1
    }, this.options.uniformNames = this.options.uniforms, this.options.samplerNames = this.options.samplers, this.options.vertexShader = this.options.vertexUrl, this.options.useAsPostProcess && (!this.options.allowEmptySourceTexture && this.options.samplers.indexOf("textureSampler") === -1 && this.options.samplers.push("textureSampler"), this.options.uniforms.indexOf("scale") === -1 && this.options.uniforms.push("scale")), creationOptions.vertexUrl || creationOptions.vertexShader ? this._shaderPath = { vertexSource: this.options.vertexShader } : (this.options.useAsPostProcess || (this.options.uniforms.push("scale"), this.onApplyObservable.add(() => {
      this.effect.setFloat2("scale", 1, 1);
    })), this._shaderPath = { vertex: this.options.vertexShader }), this._shaderPath.fragmentSource = this.options.fragmentShader, this._shaderPath.spectorName = this.options.name, this.options.useShaderStore && (this._shaderPath.fragment = this._shaderPath.fragmentSource, this._shaderPath.vertex || (this._shaderPath.vertex = this._shaderPath.vertexSource), delete this._shaderPath.fragmentSource, delete this._shaderPath.vertexSource), this.onApplyObservable.add(() => {
      this.bind();
    }), this.options.useShaderStore || (this._onContextRestoredObserver = this.options.engine.onContextRestoredObservable.add(() => {
      this.effect._pipelineContext = null, this.effect._prepareEffect();
    })), this._drawWrapper = new DrawWrapper(this.options.engine), this._webGPUReady = this.options.shaderLanguage === 1;
    const defines = Array.isArray(this.options.defines) ? this.options.defines.join(`
`) : this.options.defines;
    this._postConstructor(this.options.blockCompilation, defines, this.options.extraInitializations);
  }
  _gatherImports(_useWebGPU = !1, _list) {
  }
  _postConstructor(blockCompilation, defines = null, extraInitializations, importPromises) {
    this._importPromises.length = 0, importPromises && this._importPromises.push(...importPromises);
    const useWebGPU = this.options.engine.isWebGPU && !EffectWrapper2.ForceGLSL;
    this._gatherImports(useWebGPU, this._importPromises), this.options.useShaderStore && this._shaderPath.vertex === "postprocess" && this._importPromises.push(useWebGPU && this._webGPUReady ? __vitePreload(() => import("./postprocess.vertex-BbueQfqE.js"), __vite__mapDeps([0,1])) : __vitePreload(() => import("./postprocess.vertex-B63qylup.js"), __vite__mapDeps([2,1]))), extraInitializations !== void 0 && extraInitializations(useWebGPU, this._importPromises), useWebGPU && this._webGPUReady && (this.options.shaderLanguage = 1), blockCompilation || this.updateEffect(defines);
  }
  updateEffect(defines = null, uniforms = null, samplers = null, indexParameters, onCompiled, onError, vertexUrl, fragmentUrl) {
    const customShaderCodeProcessing = EffectWrapper2._GetShaderCodeProcessing(this.name);
    if (customShaderCodeProcessing?.defineCustomBindings) {
      const newUniforms = uniforms?.slice() ?? [];
      newUniforms.push(...this.options.uniforms);
      const newSamplers = samplers?.slice() ?? [];
      newSamplers.push(...this.options.samplers), defines = customShaderCodeProcessing.defineCustomBindings(this.name, defines, newUniforms, newSamplers), uniforms = newUniforms, samplers = newSamplers;
    }
    this.options.defines = defines || "";
    const waitImportsLoaded = this._shadersLoaded || this._importPromises.length === 0 ? void 0 : async () => {
      await Promise.all(this._importPromises), this._shadersLoaded = !0;
    };
    let extraInitializationsAsync;
    this.options.extraInitializationsAsync ? extraInitializationsAsync = async () => {
      await waitImportsLoaded?.(), await this.options.extraInitializationsAsync();
    } : extraInitializationsAsync = waitImportsLoaded, this.options.useShaderStore ? this._drawWrapper.effect = this.options.engine.createEffect({
      vertex: vertexUrl ?? this._shaderPath.vertex,
      fragment: fragmentUrl ?? this._shaderPath.fragment
    }, {
      attributes: this.options.attributeNames,
      uniformsNames: uniforms || this.options.uniforms,
      uniformBuffersNames: this.options.uniformBuffers,
      samplers: samplers || this.options.samplers,
      defines: defines !== null ? defines : "",
      fallbacks: null,
      onCompiled: onCompiled ?? this.options.onCompiled,
      onError: onError ?? null,
      indexParameters: indexParameters || this.options.indexParameters,
      processCodeAfterIncludes: customShaderCodeProcessing?.processCodeAfterIncludes ? (shaderType, code) => customShaderCodeProcessing.processCodeAfterIncludes(this.name, shaderType, code) : null,
      processFinalCode: customShaderCodeProcessing?.processFinalCode ? (shaderType, code) => customShaderCodeProcessing.processFinalCode(this.name, shaderType, code) : null,
      shaderLanguage: this.options.shaderLanguage,
      extraInitializationsAsync
    }, this.options.engine) : this._drawWrapper.effect = new Effect(this._shaderPath, this.options.attributeNames, uniforms || this.options.uniforms, samplers || this.options.samplerNames, this.options.engine, defines, void 0, onCompiled || this.options.onCompiled, void 0, void 0, void 0, this.options.shaderLanguage, extraInitializationsAsync), this.onEffectCreatedObservable.notifyObservers(this._drawWrapper.effect);
  }
  bind(noDefaultBindings = !1) {
    this.options.useAsPostProcess && !noDefaultBindings && (this.options.engine.setAlphaMode(this.alphaMode), this.drawWrapper.effect.setFloat2("scale", 1, 1)), EffectWrapper2._GetShaderCodeProcessing(this.name)?.bindCustomBindings?.(this.name, this._drawWrapper.effect);
  }
  dispose(_ignored = !1) {
    this._onContextRestoredObserver && (this.effect.getEngine().onContextRestoredObservable.remove(this._onContextRestoredObserver), this._onContextRestoredObserver = null), this.onEffectCreatedObservable.clear(), this._drawWrapper.dispose(!0);
  }
};
EffectWrapper.ForceGLSL = !1;
EffectWrapper._CustomShaderCodeProcessing = {};
var PostProcess = (() => {
  var _a;
  let _instanceExtraInitializers = [], _uniqueId_decorators, _uniqueId_initializers = [], _uniqueId_extraInitializers = [], _get_name_decorators, _width_decorators, _width_initializers = [], _width_extraInitializers = [], _height_decorators, _height_initializers = [], _height_extraInitializers = [], _renderTargetSamplingMode_decorators, _renderTargetSamplingMode_initializers = [], _renderTargetSamplingMode_extraInitializers = [], _clearColor_decorators, _clearColor_initializers = [], _clearColor_extraInitializers = [], _autoClear_decorators, _autoClear_initializers = [], _autoClear_extraInitializers = [], _forceAutoClearInAlphaMode_decorators, _forceAutoClearInAlphaMode_initializers = [], _forceAutoClearInAlphaMode_extraInitializers = [], _get_alphaMode_decorators, _alphaConstants_decorators, _alphaConstants_initializers = [], _alphaConstants_extraInitializers = [], _enablePixelPerfectMode_decorators, _enablePixelPerfectMode_initializers = [], _enablePixelPerfectMode_extraInitializers = [], _forceFullscreenViewport_decorators, _forceFullscreenViewport_initializers = [], _forceFullscreenViewport_extraInitializers = [], _scaleMode_decorators, _scaleMode_initializers = [], _scaleMode_extraInitializers = [], _alwaysForcePOT_decorators, _alwaysForcePOT_initializers = [], _alwaysForcePOT_extraInitializers = [], __samples_decorators, __samples_initializers = [], __samples_extraInitializers = [], _adaptScaleToCurrentViewport_decorators, _adaptScaleToCurrentViewport_initializers = [], _adaptScaleToCurrentViewport_extraInitializers = [];
  return _a = class {
    static get ForceGLSL() {
      return EffectWrapper.ForceGLSL;
    }
    static set ForceGLSL(force) {
      EffectWrapper.ForceGLSL = force;
    }
    static RegisterShaderCodeProcessing(postProcessName, customShaderCodeProcessing) {
      EffectWrapper.RegisterShaderCodeProcessing(postProcessName, customShaderCodeProcessing);
    }
    get name() {
      return this._effectWrapper.name;
    }
    set name(value) {
      this._effectWrapper.name = value;
    }
    get alphaMode() {
      return this._effectWrapper.alphaMode;
    }
    set alphaMode(value) {
      this._effectWrapper.alphaMode = value;
    }
    get samples() {
      return this._samples;
    }
    set samples(n) {
      this._samples = Math.min(n, this._engine.getCaps().maxMSAASamples), this._textures.forEach((texture) => {
        texture.setSamples(this._samples);
      });
    }
    get shaderLanguage() {
      return this._shaderLanguage;
    }
    getEffectName() {
      return this._fragmentUrl;
    }
    set onActivate(callback) {
      this._onActivateObserver && this.onActivateObservable.remove(this._onActivateObserver), callback && (this._onActivateObserver = this.onActivateObservable.add(callback));
    }
    set onSizeChanged(callback) {
      this._onSizeChangedObserver && this.onSizeChangedObservable.remove(this._onSizeChangedObserver), this._onSizeChangedObserver = this.onSizeChangedObservable.add(callback);
    }
    set onApply(callback) {
      this._onApplyObserver && this.onApplyObservable.remove(this._onApplyObserver), this._onApplyObserver = this.onApplyObservable.add(callback);
    }
    set onBeforeRender(callback) {
      this._onBeforeRenderObserver && this.onBeforeRenderObservable.remove(this._onBeforeRenderObserver), this._onBeforeRenderObserver = this.onBeforeRenderObservable.add(callback);
    }
    set onAfterRender(callback) {
      this._onAfterRenderObserver && this.onAfterRenderObservable.remove(this._onAfterRenderObserver), this._onAfterRenderObserver = this.onAfterRenderObservable.add(callback);
    }
    get inputTexture() {
      return this._textures.data[this._currentRenderTextureInd];
    }
    set inputTexture(value) {
      this._forcedOutputTexture = value;
    }
    restoreDefaultInputTexture() {
      this._forcedOutputTexture && (this._forcedOutputTexture = null, this.markTextureDirty());
    }
    getCamera() {
      return this._camera;
    }
    get texelSize() {
      return this._shareOutputWithPostProcess ? this._shareOutputWithPostProcess.texelSize : (this._forcedOutputTexture && this._texelSize.copyFromFloats(1 / this._forcedOutputTexture.width, 1 / this._forcedOutputTexture.height), this._texelSize);
    }
    constructor(name, fragmentUrl, parameters, samplers, _size, camera, samplingMode = 1, engine, reusable, defines = null, textureType = 0, vertexUrl = "postprocess", indexParameters, blockCompilation = !1, textureFormat = 5, shaderLanguage, extraInitializations) {
      this._parentContainer = (__runInitializers(this, _instanceExtraInitializers), null), this.uniqueId = __runInitializers(this, _uniqueId_initializers, void 0), this.width = (__runInitializers(this, _uniqueId_extraInitializers), __runInitializers(this, _width_initializers, -1)), this.height = (__runInitializers(this, _width_extraInitializers), __runInitializers(this, _height_initializers, -1)), this.nodeMaterialSource = (__runInitializers(this, _height_extraInitializers), null), this._outputTexture = null, this.renderTargetSamplingMode = __runInitializers(this, _renderTargetSamplingMode_initializers, void 0), this.clearColor = (__runInitializers(this, _renderTargetSamplingMode_extraInitializers), __runInitializers(this, _clearColor_initializers, void 0)), this.autoClear = (__runInitializers(this, _clearColor_extraInitializers), __runInitializers(this, _autoClear_initializers, !0)), this.forceAutoClearInAlphaMode = (__runInitializers(this, _autoClear_extraInitializers), __runInitializers(this, _forceAutoClearInAlphaMode_initializers, !1)), this.alphaConstants = (__runInitializers(this, _forceAutoClearInAlphaMode_extraInitializers), __runInitializers(this, _alphaConstants_initializers, void 0)), this.animations = (__runInitializers(this, _alphaConstants_extraInitializers), []), this.enablePixelPerfectMode = __runInitializers(this, _enablePixelPerfectMode_initializers, !1), this.forceFullscreenViewport = (__runInitializers(this, _enablePixelPerfectMode_extraInitializers), __runInitializers(this, _forceFullscreenViewport_initializers, !0)), this.inspectableCustomProperties = __runInitializers(this, _forceFullscreenViewport_extraInitializers), this.scaleMode = __runInitializers(this, _scaleMode_initializers, 1), this.alwaysForcePOT = (__runInitializers(this, _scaleMode_extraInitializers), __runInitializers(this, _alwaysForcePOT_initializers, !1)), this._samples = (__runInitializers(this, _alwaysForcePOT_extraInitializers), __runInitializers(this, __samples_initializers, 1)), this.adaptScaleToCurrentViewport = (__runInitializers(this, __samples_extraInitializers), __runInitializers(this, _adaptScaleToCurrentViewport_initializers, !1)), this.doNotSerialize = (__runInitializers(this, _adaptScaleToCurrentViewport_extraInitializers), !1), this._webGPUReady = !1, this._reusable = !1, this._renderId = 0, this.externalTextureSamplerBinding = !1, this._textures = new SmartArray(2), this._textureCache = [], this._currentRenderTextureInd = 0, this._scaleRatio = new Vector2(1, 1), this._texelSize = Vector2.Zero(), this.onActivateObservable = new Observable(), this.onSizeChangedObservable = new Observable(), this.onApplyObservable = new Observable(), this.onBeforeRenderObservable = new Observable(), this.onAfterRenderObservable = new Observable(), this.onDisposeObservable = new Observable(), RegisterPostProcess();
      let size = 1, uniformBuffers = null, effectWrapper;
      if (parameters && !Array.isArray(parameters)) {
        const options = parameters;
        parameters = options.uniforms ?? null, samplers = options.samplers ?? null, size = options.size ?? 1, camera = options.camera ?? null, samplingMode = options.samplingMode ?? 1, engine = options.engine, reusable = options.reusable, defines = Array.isArray(options.defines) ? options.defines.join(`
`) : options.defines ?? null, textureType = options.textureType ?? 0, vertexUrl = options.vertexUrl ?? "postprocess", indexParameters = options.indexParameters, blockCompilation = options.blockCompilation ?? !1, textureFormat = options.textureFormat ?? 5, shaderLanguage = options.shaderLanguage ?? 0, uniformBuffers = options.uniformBuffers ?? null, extraInitializations = options.extraInitializations, effectWrapper = options.effectWrapper;
      } else _size && (typeof _size == "number" ? size = _size : size = {
        width: _size.width,
        height: _size.height
      });
      if (this._useExistingThinPostProcess = !!effectWrapper, this._effectWrapper = effectWrapper ?? new EffectWrapper({
        name,
        useShaderStore: !0,
        useAsPostProcess: !0,
        fragmentShader: fragmentUrl,
        engine: engine || camera?.getScene().getEngine(),
        uniforms: parameters,
        samplers,
        uniformBuffers,
        defines,
        vertexUrl,
        indexParameters,
        blockCompilation: !0,
        shaderLanguage,
        extraInitializations: void 0
      }), this.name = name, this.onEffectCreatedObservable = this._effectWrapper.onEffectCreatedObservable, camera != null ? (this._camera = camera, this._scene = camera.getScene(), camera.attachPostProcess(this), this._engine = this._scene.getEngine(), this._scene.addPostProcess(this), this.uniqueId = this._scene.getUniqueId()) : engine && (this._engine = engine, this._engine.postProcesses.push(this)), this._options = size, this.renderTargetSamplingMode = samplingMode || 1, this._reusable = reusable || !1, this._textureType = textureType, this._textureFormat = textureFormat, this._shaderLanguage = shaderLanguage || 0, this._samplers = samplers || [], this._samplers.indexOf("textureSampler") === -1 && this._samplers.push("textureSampler"), this._fragmentUrl = fragmentUrl, this._vertexUrl = vertexUrl, this._parameters = parameters || [], this._parameters.indexOf("scale") === -1 && this._parameters.push("scale"), this._uniformBuffers = uniformBuffers || [], this._indexParameters = indexParameters, !this._useExistingThinPostProcess) {
        this._webGPUReady = this._shaderLanguage === 1;
        const importPromises = [];
        this._gatherImports(this._engine.isWebGPU && !_a.ForceGLSL, importPromises), this._effectWrapper._webGPUReady = this._webGPUReady, this._effectWrapper._postConstructor(blockCompilation, defines, extraInitializations, importPromises);
      }
    }
    _gatherImports(useWebGPU = !1, list) {
      useWebGPU && this._webGPUReady ? list.push(Promise.all([__vitePreload(() => import("./postprocess.vertex-BbueQfqE.js"), __vite__mapDeps([0,1]))])) : list.push(Promise.all([__vitePreload(() => import("./postprocess.vertex-B63qylup.js"), __vite__mapDeps([2,1]))]));
    }
    getClassName() {
      return "PostProcess";
    }
    getEngine() {
      return this._engine;
    }
    getEffect() {
      return this._effectWrapper.drawWrapper.effect;
    }
    shareOutputWith(postProcess) {
      return this._disposeTextures(), this._shareOutputWithPostProcess = postProcess, this;
    }
    useOwnOutput() {
      this._textures.length == 0 && (this._textures = new SmartArray(2)), this._shareOutputWithPostProcess = null;
    }
    updateEffect(defines = null, uniforms = null, samplers = null, indexParameters, onCompiled, onError, vertexUrl, fragmentUrl) {
      this._effectWrapper.updateEffect(defines, uniforms, samplers, indexParameters, onCompiled, onError, vertexUrl, fragmentUrl), this._postProcessDefines = Array.isArray(this._effectWrapper.options.defines) ? this._effectWrapper.options.defines.join(`
`) : this._effectWrapper.options.defines;
    }
    isReusable() {
      return this._reusable;
    }
    markTextureDirty() {
      this.width = -1;
    }
    _createRenderTargetTexture(textureSize, textureOptions, channel = 0) {
      for (let i = 0; i < this._textureCache.length; i++) if (this._textureCache[i].texture.width === textureSize.width && this._textureCache[i].texture.height === textureSize.height && this._textureCache[i].postProcessChannel === channel && this._textureCache[i].texture._generateDepthBuffer === textureOptions.generateDepthBuffer && this._textureCache[i].texture.samples === textureOptions.samples) return this._textureCache[i].texture;
      const tex = this._engine.createRenderTargetTexture(textureSize, textureOptions);
      return this._textureCache.push({
        texture: tex,
        postProcessChannel: channel,
        lastUsedRenderId: -1
      }), tex;
    }
    _flushTextureCache() {
      const currentRenderId = this._renderId;
      for (let i = this._textureCache.length - 1; i >= 0; i--) if (currentRenderId - this._textureCache[i].lastUsedRenderId > 100) {
        let currentlyUsed = !1;
        for (let j = 0; j < this._textures.length; j++) if (this._textures.data[j] === this._textureCache[i].texture) {
          currentlyUsed = !0;
          break;
        }
        currentlyUsed || (this._textureCache[i].texture.dispose(), this._textureCache.splice(i, 1));
      }
    }
    resize(width, height, camera = null, needMipMaps = !1, forceDepthStencil = !1) {
      this._textures.length > 0 && this._textures.reset(), this.width = width, this.height = height;
      let firstPP = null;
      if (camera) {
        for (let i = 0; i < camera._postProcesses.length; i++) if (camera._postProcesses[i] !== null) {
          firstPP = camera._postProcesses[i];
          break;
        }
      }
      const textureSize = {
        width: this.width,
        height: this.height
      }, textureOptions = {
        generateMipMaps: needMipMaps,
        generateDepthBuffer: forceDepthStencil || firstPP === this,
        generateStencilBuffer: (forceDepthStencil || firstPP === this) && this._engine.isStencilEnable,
        samplingMode: this.renderTargetSamplingMode,
        type: this._textureType,
        format: this._textureFormat,
        samples: this._samples,
        label: "PostProcessRTT-" + this.name
      };
      this._textures.push(this._createRenderTargetTexture(textureSize, textureOptions, 0)), this._reusable && this._textures.push(this._createRenderTargetTexture(textureSize, textureOptions, 1)), this._texelSize.copyFromFloats(1 / this.width, 1 / this.height), this.onSizeChangedObservable.notifyObservers(this);
    }
    _getTarget() {
      let target;
      if (this._shareOutputWithPostProcess) target = this._shareOutputWithPostProcess.inputTexture;
      else if (this._forcedOutputTexture)
        target = this._forcedOutputTexture, this.width = this._forcedOutputTexture.width, this.height = this._forcedOutputTexture.height;
      else {
        target = this.inputTexture;
        let cache;
        for (let i = 0; i < this._textureCache.length; i++) if (this._textureCache[i].texture === target) {
          cache = this._textureCache[i];
          break;
        }
        cache && (cache.lastUsedRenderId = this._renderId);
      }
      return target;
    }
    activate(cameraOrScene, sourceTexture = null, forceDepthStencil) {
      const camera = cameraOrScene === null || cameraOrScene.cameraRigMode !== void 0 ? cameraOrScene || this._camera : null, scene = camera?.getScene() ?? cameraOrScene, engine = scene.getEngine(), maxSize = engine.getCaps().maxTextureSize, requiredWidth = (sourceTexture ? sourceTexture.width : this._engine.getRenderWidth(!0)) * this._options | 0, requiredHeight = (sourceTexture ? sourceTexture.height : this._engine.getRenderHeight(!0)) * this._options | 0;
      let desiredWidth = this._options.width || requiredWidth, desiredHeight = this._options.height || requiredHeight;
      const needMipMaps = this.renderTargetSamplingMode !== 7 && this.renderTargetSamplingMode !== 1 && this.renderTargetSamplingMode !== 2;
      let target = null;
      if (!this._shareOutputWithPostProcess && !this._forcedOutputTexture) {
        if (this.adaptScaleToCurrentViewport) {
          const currentViewport = engine.currentViewport;
          currentViewport && (desiredWidth *= currentViewport.width, desiredHeight *= currentViewport.height);
        }
        (needMipMaps || this.alwaysForcePOT) && (this._options.width || (desiredWidth = engine.needPOTTextures ? GetExponentOfTwo(desiredWidth, maxSize, this.scaleMode) : desiredWidth), this._options.height || (desiredHeight = engine.needPOTTextures ? GetExponentOfTwo(desiredHeight, maxSize, this.scaleMode) : desiredHeight)), (this.width !== desiredWidth || this.height !== desiredHeight || !(target = this._getTarget())) && this.resize(desiredWidth, desiredHeight, camera, needMipMaps, forceDepthStencil), this._textures.forEach((texture) => {
          texture.samples !== this.samples && this._engine.updateRenderTargetTextureSampleCount(texture, this.samples);
        }), this._flushTextureCache(), this._renderId++;
      }
      return target || (target = this._getTarget()), this.enablePixelPerfectMode ? (this._scaleRatio.copyFromFloats(requiredWidth / desiredWidth, requiredHeight / desiredHeight), this._engine.bindFramebuffer(target, 0, requiredWidth, requiredHeight, this.forceFullscreenViewport)) : (this._scaleRatio.copyFromFloats(1, 1), this._engine.bindFramebuffer(target, 0, void 0, void 0, this.forceFullscreenViewport)), this._engine._debugInsertMarker?.(`post process ${this.name} input`), this.onActivateObservable.notifyObservers(camera), this.autoClear && (this.alphaMode === 0 || this.forceAutoClearInAlphaMode) && this._engine.clear(this.clearColor ? this.clearColor : scene.clearColor, scene._allowPostProcessClearColor, !0, !0), this._reusable && (this._currentRenderTextureInd = (this._currentRenderTextureInd + 1) % 2), target;
    }
    get isSupported() {
      return this._effectWrapper.drawWrapper.effect.isSupported;
    }
    get aspectRatio() {
      return this._shareOutputWithPostProcess ? this._shareOutputWithPostProcess.aspectRatio : this._forcedOutputTexture ? this._forcedOutputTexture.width / this._forcedOutputTexture.height : this.width / this.height;
    }
    isReady() {
      return this._effectWrapper.isReady();
    }
    apply() {
      if (!this._effectWrapper.isReady()) return null;
      this._engine.enableEffect(this._effectWrapper.drawWrapper), this._engine.setState(!1), this._engine.setDepthBuffer(!1), this._engine.setDepthWrite(!1), this.alphaConstants && this.getEngine().setAlphaConstants(this.alphaConstants.r, this.alphaConstants.g, this.alphaConstants.b, this.alphaConstants.a), this._engine.setAlphaMode(this.alphaMode);
      let source;
      return this._shareOutputWithPostProcess ? source = this._shareOutputWithPostProcess.inputTexture : this._forcedOutputTexture ? source = this._forcedOutputTexture : source = this.inputTexture, this.externalTextureSamplerBinding || this._effectWrapper.drawWrapper.effect._bindTexture("textureSampler", source?.texture), this._effectWrapper.drawWrapper.effect.setVector2("scale", this._scaleRatio), this.onApplyObservable.notifyObservers(this._effectWrapper.drawWrapper.effect), this._effectWrapper.bind(!0), this._effectWrapper.drawWrapper.effect;
    }
    _disposeTextures() {
      if (this._shareOutputWithPostProcess || this._forcedOutputTexture) {
        this._disposeTextureCache();
        return;
      }
      this._disposeTextureCache(), this._textures.dispose();
    }
    _disposeTextureCache() {
      for (let i = this._textureCache.length - 1; i >= 0; i--) this._textureCache[i].texture.dispose();
      this._textureCache.length = 0;
    }
    setPrePassRenderer(prePassRenderer) {
      return this._prePassEffectConfiguration ? (this._prePassEffectConfiguration = prePassRenderer.addEffectConfiguration(this._prePassEffectConfiguration), this._prePassEffectConfiguration.enabled = !0, !0) : !1;
    }
    dispose(camera) {
      camera = camera || this._camera, this._useExistingThinPostProcess || this._effectWrapper.dispose(), this._disposeTextures(), this._scene && this._scene.removePostProcess(this);
      let index;
      if (this._parentContainer && (index = this._parentContainer.postProcesses.indexOf(this), index > -1 && this._parentContainer.postProcesses.splice(index, 1), this._parentContainer = null), index = this._engine.postProcesses.indexOf(this), index !== -1 && this._engine.postProcesses.splice(index, 1), this.onDisposeObservable.notifyObservers(), !!camera) {
        if (camera.detachPostProcess(this), index = camera._postProcesses.indexOf(this), index === 0 && camera._postProcesses.length > 0) {
          const firstPostProcess = this._camera._getFirstPostProcess();
          firstPostProcess && firstPostProcess.markTextureDirty();
        }
        this.onActivateObservable.clear(), this.onAfterRenderObservable.clear(), this.onApplyObservable.clear(), this.onBeforeRenderObservable.clear(), this.onSizeChangedObservable.clear(), this.onEffectCreatedObservable.clear();
      }
    }
    serialize() {
      const serializationObject = SerializationHelper.Serialize(this), camera = this.getCamera() || this._scene && this._scene.activeCamera;
      return serializationObject.customType = "BABYLON." + this.getClassName(), serializationObject.cameraId = camera ? camera.id : null, serializationObject.reusable = this._reusable, serializationObject.textureType = this._textureType, serializationObject.fragmentUrl = this._fragmentUrl, serializationObject.parameters = this._parameters, serializationObject.samplers = this._samplers, serializationObject.uniformBuffers = this._uniformBuffers, serializationObject.options = this._options, serializationObject.defines = this._postProcessDefines, serializationObject.textureFormat = this._textureFormat, serializationObject.vertexUrl = this._vertexUrl, serializationObject.indexParameters = this._indexParameters, serializationObject;
    }
    clone() {
      const serializationObject = this.serialize();
      serializationObject._engine = this._engine, serializationObject.cameraId = null;
      const result = _a.Parse(serializationObject, this._scene, "");
      return result ? (result.onActivateObservable = this.onActivateObservable.clone(), result.onSizeChangedObservable = this.onSizeChangedObservable.clone(), result.onApplyObservable = this.onApplyObservable.clone(), result.onBeforeRenderObservable = this.onBeforeRenderObservable.clone(), result.onAfterRenderObservable = this.onAfterRenderObservable.clone(), result._prePassEffectConfiguration = this._prePassEffectConfiguration, result) : null;
    }
    static Parse(parsedPostProcess, scene, rootUrl) {
      const postProcessType = GetClass(parsedPostProcess.customType);
      if (!postProcessType || !postProcessType._Parse) return null;
      const camera = scene ? scene.getCameraById(parsedPostProcess.cameraId) : null;
      return postProcessType._Parse(parsedPostProcess, camera, scene, rootUrl);
    }
    static _Parse(parsedPostProcess, targetCamera, scene, rootUrl) {
      return SerializationHelper.Parse(() => new _a(parsedPostProcess.name, parsedPostProcess.fragmentUrl, parsedPostProcess.parameters, parsedPostProcess.samplers, parsedPostProcess.options, targetCamera, parsedPostProcess.renderTargetSamplingMode, parsedPostProcess._engine, parsedPostProcess.reusable, parsedPostProcess.defines, parsedPostProcess.textureType, parsedPostProcess.vertexUrl, parsedPostProcess.indexParameters, !1, parsedPostProcess.textureFormat), parsedPostProcess, scene, rootUrl);
    }
  }, (() => {
    const _metadata = typeof Symbol == "function" && Symbol.metadata ? /* @__PURE__ */ Object.create(null) : void 0;
    _uniqueId_decorators = [serialize()], _get_name_decorators = [serialize()], _width_decorators = [serialize()], _height_decorators = [serialize()], _renderTargetSamplingMode_decorators = [serialize()], _clearColor_decorators = [serializeAsColor4()], _autoClear_decorators = [serialize()], _forceAutoClearInAlphaMode_decorators = [serialize()], _get_alphaMode_decorators = [serialize()], _alphaConstants_decorators = [serialize()], _enablePixelPerfectMode_decorators = [serialize()], _forceFullscreenViewport_decorators = [serialize()], _scaleMode_decorators = [serialize()], _alwaysForcePOT_decorators = [serialize()], __samples_decorators = [serialize("samples")], _adaptScaleToCurrentViewport_decorators = [serialize()], __esDecorate(_a, null, _get_name_decorators, {
      kind: "getter",
      name: "name",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "name" in obj,
        get: (obj) => obj.name
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers), __esDecorate(_a, null, _get_alphaMode_decorators, {
      kind: "getter",
      name: "alphaMode",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "alphaMode" in obj,
        get: (obj) => obj.alphaMode
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers), __esDecorate(null, null, _uniqueId_decorators, {
      kind: "field",
      name: "uniqueId",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "uniqueId" in obj,
        get: (obj) => obj.uniqueId,
        set: (obj, value) => {
          obj.uniqueId = value;
        }
      },
      metadata: _metadata
    }, _uniqueId_initializers, _uniqueId_extraInitializers), __esDecorate(null, null, _width_decorators, {
      kind: "field",
      name: "width",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "width" in obj,
        get: (obj) => obj.width,
        set: (obj, value) => {
          obj.width = value;
        }
      },
      metadata: _metadata
    }, _width_initializers, _width_extraInitializers), __esDecorate(null, null, _height_decorators, {
      kind: "field",
      name: "height",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "height" in obj,
        get: (obj) => obj.height,
        set: (obj, value) => {
          obj.height = value;
        }
      },
      metadata: _metadata
    }, _height_initializers, _height_extraInitializers), __esDecorate(null, null, _renderTargetSamplingMode_decorators, {
      kind: "field",
      name: "renderTargetSamplingMode",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "renderTargetSamplingMode" in obj,
        get: (obj) => obj.renderTargetSamplingMode,
        set: (obj, value) => {
          obj.renderTargetSamplingMode = value;
        }
      },
      metadata: _metadata
    }, _renderTargetSamplingMode_initializers, _renderTargetSamplingMode_extraInitializers), __esDecorate(null, null, _clearColor_decorators, {
      kind: "field",
      name: "clearColor",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "clearColor" in obj,
        get: (obj) => obj.clearColor,
        set: (obj, value) => {
          obj.clearColor = value;
        }
      },
      metadata: _metadata
    }, _clearColor_initializers, _clearColor_extraInitializers), __esDecorate(null, null, _autoClear_decorators, {
      kind: "field",
      name: "autoClear",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "autoClear" in obj,
        get: (obj) => obj.autoClear,
        set: (obj, value) => {
          obj.autoClear = value;
        }
      },
      metadata: _metadata
    }, _autoClear_initializers, _autoClear_extraInitializers), __esDecorate(null, null, _forceAutoClearInAlphaMode_decorators, {
      kind: "field",
      name: "forceAutoClearInAlphaMode",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "forceAutoClearInAlphaMode" in obj,
        get: (obj) => obj.forceAutoClearInAlphaMode,
        set: (obj, value) => {
          obj.forceAutoClearInAlphaMode = value;
        }
      },
      metadata: _metadata
    }, _forceAutoClearInAlphaMode_initializers, _forceAutoClearInAlphaMode_extraInitializers), __esDecorate(null, null, _alphaConstants_decorators, {
      kind: "field",
      name: "alphaConstants",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "alphaConstants" in obj,
        get: (obj) => obj.alphaConstants,
        set: (obj, value) => {
          obj.alphaConstants = value;
        }
      },
      metadata: _metadata
    }, _alphaConstants_initializers, _alphaConstants_extraInitializers), __esDecorate(null, null, _enablePixelPerfectMode_decorators, {
      kind: "field",
      name: "enablePixelPerfectMode",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "enablePixelPerfectMode" in obj,
        get: (obj) => obj.enablePixelPerfectMode,
        set: (obj, value) => {
          obj.enablePixelPerfectMode = value;
        }
      },
      metadata: _metadata
    }, _enablePixelPerfectMode_initializers, _enablePixelPerfectMode_extraInitializers), __esDecorate(null, null, _forceFullscreenViewport_decorators, {
      kind: "field",
      name: "forceFullscreenViewport",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "forceFullscreenViewport" in obj,
        get: (obj) => obj.forceFullscreenViewport,
        set: (obj, value) => {
          obj.forceFullscreenViewport = value;
        }
      },
      metadata: _metadata
    }, _forceFullscreenViewport_initializers, _forceFullscreenViewport_extraInitializers), __esDecorate(null, null, _scaleMode_decorators, {
      kind: "field",
      name: "scaleMode",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "scaleMode" in obj,
        get: (obj) => obj.scaleMode,
        set: (obj, value) => {
          obj.scaleMode = value;
        }
      },
      metadata: _metadata
    }, _scaleMode_initializers, _scaleMode_extraInitializers), __esDecorate(null, null, _alwaysForcePOT_decorators, {
      kind: "field",
      name: "alwaysForcePOT",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "alwaysForcePOT" in obj,
        get: (obj) => obj.alwaysForcePOT,
        set: (obj, value) => {
          obj.alwaysForcePOT = value;
        }
      },
      metadata: _metadata
    }, _alwaysForcePOT_initializers, _alwaysForcePOT_extraInitializers), __esDecorate(null, null, __samples_decorators, {
      kind: "field",
      name: "_samples",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "_samples" in obj,
        get: (obj) => obj._samples,
        set: (obj, value) => {
          obj._samples = value;
        }
      },
      metadata: _metadata
    }, __samples_initializers, __samples_extraInitializers), __esDecorate(null, null, _adaptScaleToCurrentViewport_decorators, {
      kind: "field",
      name: "adaptScaleToCurrentViewport",
      static: !1,
      private: !1,
      access: {
        has: (obj) => "adaptScaleToCurrentViewport" in obj,
        get: (obj) => obj.adaptScaleToCurrentViewport,
        set: (obj, value) => {
          obj.adaptScaleToCurrentViewport = value;
        }
      },
      metadata: _metadata
    }, _adaptScaleToCurrentViewport_initializers, _adaptScaleToCurrentViewport_extraInitializers), _metadata && Object.defineProperty(_a, Symbol.metadata, {
      enumerable: !0,
      configurable: !0,
      writable: !0,
      value: _metadata
    });
  })(), _a;
})(), _Registered = !1;
function RegisterPostProcess() {
  _Registered || (_Registered = !0, AbstractEngine.prototype.setTextureFromPostProcess = function(channel, postProcess, name) {
    let postProcessInput = null;
    postProcess && (postProcess._forcedOutputTexture ? postProcessInput = postProcess._forcedOutputTexture : postProcess._textures.data[postProcess._currentRenderTextureInd] && (postProcessInput = postProcess._textures.data[postProcess._currentRenderTextureInd])), this._bindTexture(channel, postProcessInput?.texture ?? null, name);
  }, AbstractEngine.prototype.setTextureFromPostProcessOutput = function(channel, postProcess, name) {
    this._bindTexture(channel, postProcess?._outputTexture?.texture ?? null, name);
  }, Effect.prototype.setTextureFromPostProcess = function(channel, postProcess) {
    this._engine.setTextureFromPostProcess(this._samplers[channel], postProcess, channel);
  }, Effect.prototype.setTextureFromPostProcessOutput = function(channel, postProcess) {
    this._engine.setTextureFromPostProcessOutput(this._samplers[channel], postProcess, channel);
  }, RegisterClass("BABYLON.PostProcess", PostProcess));
}
export {
  SmartArrayNoDuplicate as a,
  Mix as c,
  SmartArray as i,
  RegisterPostProcess as n,
  GetExponentOfTwo as o,
  DrawWrapper as r,
  IsExponentOfTwo as s,
  PostProcess as t
};
