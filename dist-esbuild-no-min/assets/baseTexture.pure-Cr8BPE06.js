import { o as EngineStore, s as Observable } from "./typeStore-CRwQ34I6.js";
import { C as _WarnImport, S as _MissingSideEffectProperty, t as RandomGUID, x as _MissingSideEffect } from "./guid-CkhjUkgR.js";
import { a as Matrix, l as Vector2, n as Color4, o as Quaternion, t as Color3, u as Vector3 } from "./math.color.pure-CMvYqpy_.js";
var AndOrNotEvaluator = class AndOrNotEvaluator2 {
  static Eval(query, evaluateCallback) {
    if (!query.match(/\([^()]*\)/g)) query = AndOrNotEvaluator2._HandleParenthesisContent(query, evaluateCallback);
    else query = query.replace(/\([^()]*\)/g, (r) => {
      r = r.slice(1, r.length - 1);
      return AndOrNotEvaluator2._HandleParenthesisContent(r, evaluateCallback);
    });
    if (query === "true") return true;
    if (query === "false") return false;
    return AndOrNotEvaluator2.Eval(query, evaluateCallback);
  }
  static _HandleParenthesisContent(parenthesisContent, evaluateCallback) {
    evaluateCallback = evaluateCallback || ((r) => {
      return r === "true" ? true : false;
    });
    let result;
    const or = parenthesisContent.split("||");
    for (const i in or) if (Object.prototype.hasOwnProperty.call(or, i)) {
      let ori = AndOrNotEvaluator2._SimplifyNegation(or[i].trim());
      const and = ori.split("&&");
      if (and.length > 1) for (let j = 0; j < and.length; ++j) {
        const andj = AndOrNotEvaluator2._SimplifyNegation(and[j].trim());
        if (andj !== "true" && andj !== "false") if (andj[0] === "!") result = !evaluateCallback(andj.substring(1));
        else result = evaluateCallback(andj);
        else result = andj === "true" ? true : false;
        if (!result) {
          ori = "false";
          break;
        }
      }
      if (result || ori === "true") {
        result = true;
        break;
      }
      if (ori !== "true" && ori !== "false") if (ori[0] === "!") result = !evaluateCallback(ori.substring(1));
      else result = evaluateCallback(ori);
      else result = ori === "true" ? true : false;
    }
    return result ? "true" : "false";
  }
  static _SimplifyNegation(booleanString) {
    booleanString = booleanString.replace(/^[\s!]+/, (r) => {
      r = r.replace(/[\s]/g, () => "");
      return r.length % 2 ? "!" : "";
    });
    booleanString = booleanString.trim();
    if (booleanString === "!true") booleanString = "false";
    else if (booleanString === "!false") booleanString = "true";
    return booleanString;
  }
};
var Tags = class Tags2 {
  static EnableFor(obj) {
    obj._tags = obj._tags || {};
    obj.hasTags = () => {
      return Tags2.HasTags(obj);
    };
    obj.addTags = (tagsString) => {
      return Tags2.AddTagsTo(obj, tagsString);
    };
    obj.removeTags = (tagsString) => {
      return Tags2.RemoveTagsFrom(obj, tagsString);
    };
    obj.matchesTagsQuery = (tagsQuery) => {
      return Tags2.MatchesQuery(obj, tagsQuery);
    };
  }
  static DisableFor(obj) {
    delete obj._tags;
    delete obj.hasTags;
    delete obj.addTags;
    delete obj.removeTags;
    delete obj.matchesTagsQuery;
  }
  static HasTags(obj) {
    if (!obj._tags) return false;
    const tags = obj._tags;
    for (const i in tags) if (Object.prototype.hasOwnProperty.call(tags, i)) return true;
    return false;
  }
  static GetTags(obj, asString = true) {
    if (!obj._tags) return null;
    if (asString) {
      const tagsArray = [];
      for (const tag in obj._tags) if (Object.prototype.hasOwnProperty.call(obj._tags, tag) && obj._tags[tag] === true) tagsArray.push(tag);
      return tagsArray.join(" ");
    } else return obj._tags;
  }
  static AddTagsTo(obj, tagsString) {
    if (!tagsString) return;
    if (typeof tagsString !== "string") return;
    const tags = tagsString.split(" ");
    for (const tag of tags) Tags2._AddTagTo(obj, tag);
  }
  static _AddTagTo(obj, tag) {
    tag = tag.trim();
    if (tag === "" || tag === "true" || tag === "false") return;
    if (tag.match(/[\s]/) || tag.match(/^([!]|([|]|[&]){2})/)) return;
    Tags2.EnableFor(obj);
    obj._tags[tag] = true;
  }
  static RemoveTagsFrom(obj, tagsString) {
    if (!Tags2.HasTags(obj)) return;
    const tags = tagsString.split(" ");
    for (const t in tags) Tags2._RemoveTagFrom(obj, tags[t]);
  }
  static _RemoveTagFrom(obj, tag) {
    delete obj._tags[tag];
  }
  static MatchesQuery(obj, tagsQuery) {
    if (tagsQuery === void 0) return true;
    if (tagsQuery === "") return Tags2.HasTags(obj);
    return AndOrNotEvaluator.Eval(tagsQuery, (r) => Tags2.HasTags(obj) && obj._tags[r]);
  }
};
function __esDecorate(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
  function accept(f) {
    if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
    return f;
  }
  var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
  var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
  var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
  var _, done = false;
  for (var i = decorators.length - 1; i >= 0; i--) {
    var context = {};
    for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
    for (var p in contextIn.access) context.access[p] = contextIn.access[p];
    context.addInitializer = function(f) {
      if (done) throw new TypeError("Cannot add initializers after decoration has completed");
      extraInitializers.push(accept(f || null));
    };
    var result = (0, decorators[i])(kind === "accessor" ? {
      get: descriptor.get,
      set: descriptor.set
    } : descriptor[key], context);
    if (kind === "accessor") {
      if (result === void 0) continue;
      if (result === null || typeof result !== "object") throw new TypeError("Object expected");
      if (_ = accept(result.get)) descriptor.get = _;
      if (_ = accept(result.set)) descriptor.set = _;
      if (_ = accept(result.init)) initializers.unshift(_);
    } else if (_ = accept(result)) if (kind === "field") initializers.unshift(_);
    else descriptor[key] = _;
  }
  if (target) Object.defineProperty(target, contextIn.name, descriptor);
  done = true;
}
function __runInitializers(thisArg, initializers, value) {
  var useValue = arguments.length > 2;
  for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
  return useValue ? value : void 0;
}
function __classPrivateFieldGet(receiver, state, kind, f) {
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
  return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
}
function __classPrivateFieldSet(receiver, state, value, kind, f) {
  if (kind === "m") throw new TypeError("Private method is not writable");
  if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
  if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
  return kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value), value;
}
var __bjsSerializableKey = "__bjs_serializable__";
var _mergedStoreCache = /* @__PURE__ */ new WeakMap();
function HasOwn(target, key) {
  return Object.prototype.hasOwnProperty.call(target, key);
}
function GetMetadataSymbol() {
  let metadataSymbol = Symbol.metadata;
  if (!metadataSymbol) {
    metadataSymbol = /* @__PURE__ */ Symbol("Symbol.metadata");
    Object.defineProperty(Symbol, "metadata", {
      configurable: true,
      writable: true,
      value: metadataSymbol
    });
  }
  return metadataSymbol;
}
var MetadataSymbol = GetMetadataSymbol();
function GetConstructor(target) {
  return typeof target === "function" ? target : target?.constructor;
}
function GetDirectStoreFromMetadata(metadata) {
  if (!metadata) throw new Error(`Decorator metadata is unavailable; the Symbol.metadata (${String(MetadataSymbol)}) polyfill must run before decorated classes are evaluated.`);
  if (!HasOwn(metadata, __bjsSerializableKey)) metadata[__bjsSerializableKey] = {};
  return metadata[__bjsSerializableKey];
}
function GetMergedStore(target) {
  const ctor = GetConstructor(target);
  const metadata = ctor ? ctor[MetadataSymbol] : void 0;
  if (!metadata) return {};
  const cached = _mergedStoreCache.get(metadata);
  if (cached) return cached;
  const store = {};
  const chain = [];
  let current = metadata;
  while (current) {
    chain.push(current);
    current = Object.getPrototypeOf(current);
  }
  for (const meta of chain) if (HasOwn(meta, __bjsSerializableKey)) {
    const initialStore = meta[__bjsSerializableKey];
    for (const property in initialStore) store[property] = initialStore[property];
  }
  _mergedStoreCache.set(metadata, store);
  return store;
}
function generateSerializableMember(type, sourceName) {
  return (_value, context) => {
    if (!context.metadata) return;
    const propertyKey = String(context.name);
    const store = GetDirectStoreFromMetadata(context.metadata);
    if (!store[propertyKey]) store[propertyKey] = {
      type,
      sourceName
    };
  };
}
function generateExpandMember(setCallback, targetKey = null) {
  return (_value, context) => {
    const key = targetKey || "_" + String(context.name);
    return {
      init(value) {
        if (value !== void 0 || !(key in this)) this[key] = value;
        return value;
      },
      get() {
        return this[key];
      },
      set(value) {
        if (typeof this[key]?.equals === "function") {
          if (this[key].equals(value)) return;
        }
        if (this[key] === value) return;
        this[key] = value;
        this[setCallback]();
      }
    };
  };
}
function expandToProperty(callback, targetKey = null) {
  return generateExpandMember(callback, targetKey);
}
function serialize(sourceName) {
  return generateSerializableMember(0, sourceName);
}
function serializeAsTexture(sourceName) {
  return generateSerializableMember(1, sourceName);
}
function serializeAsColor3(sourceName) {
  return generateSerializableMember(2, sourceName);
}
function serializeAsFresnelParameters(sourceName) {
  return generateSerializableMember(3, sourceName);
}
function serializeAsVector3(sourceName) {
  return generateSerializableMember(5, sourceName);
}
function serializeAsMeshReference(sourceName) {
  return generateSerializableMember(6, sourceName);
}
function serializeAsColorCurves(sourceName) {
  return generateSerializableMember(7, sourceName);
}
function serializeAsColor4(sourceName) {
  return generateSerializableMember(8, sourceName);
}
function serializeAsQuaternion(sourceName) {
  return generateSerializableMember(10, sourceName);
}
function ApplyNativeOverride(originalMethod, context, resolveNative) {
  const propertyKey = String(context.name);
  let resolvedFunc = null;
  const wrapper = function(...params) {
    if (resolvedFunc === null) {
      resolvedFunc = originalMethod;
      if (typeof _native !== "undefined" && _native[propertyKey]) resolvedFunc = resolveNative(_native[propertyKey], originalMethod);
      const target = this && (context.static ? this : Object.getPrototypeOf(this));
      if (target?.[propertyKey] === wrapper) target[propertyKey] = resolvedFunc;
    }
    return resolvedFunc.apply(this, params);
  };
  return wrapper;
}
function nativeOverride(originalMethod, context) {
  return ApplyNativeOverride(originalMethod, context, (nativeFunc) => nativeFunc);
}
nativeOverride.filter = function(predicate) {
  return (originalMethod, context) => {
    return ApplyNativeOverride(originalMethod, context, (nativeFunc, jsFunc) => {
      return function(...args) {
        if (predicate(...args)) return nativeFunc(...args);
        return jsFunc.apply(this, args);
      };
    });
  };
};
var CopySource = function(creationFunction, source, instanciate, options = {}) {
  const destination = creationFunction();
  if (Tags && Tags.HasTags(source)) Tags.AddTagsTo(destination, Tags.GetTags(source, true));
  const classStore = GetMergedStore(destination);
  const textureMap = {};
  for (const property in classStore) {
    const propertyDescriptor = classStore[property];
    const sourceProperty = source[property];
    const propertyType = propertyDescriptor.type;
    if (sourceProperty !== void 0 && sourceProperty !== null && (property !== "uniqueId" || SerializationHelper.AllowLoadingUniqueId)) switch (propertyType) {
      case 0:
      case 6:
      case 9:
      case 11:
        if (typeof sourceProperty.slice === "function") destination[property] = sourceProperty.slice();
        else destination[property] = sourceProperty;
        break;
      case 1:
        if (options.cloneTexturesOnlyOnce && textureMap[sourceProperty.uniqueId]) destination[property] = textureMap[sourceProperty.uniqueId];
        else {
          destination[property] = instanciate || sourceProperty.isRenderTarget ? sourceProperty : sourceProperty.clone();
          textureMap[sourceProperty.uniqueId] = destination[property];
        }
        break;
      case 2:
      case 3:
      case 4:
      case 5:
      case 7:
      case 8:
      case 10:
      case 12:
        destination[property] = instanciate ? sourceProperty : sourceProperty.clone();
        break;
    }
  }
  return destination;
};
var SerializationHelper = class SerializationHelper2 {
  static AppendSerializedAnimations(source, destination) {
    if (source.animations) {
      destination.animations = [];
      for (let animationIndex = 0; animationIndex < source.animations.length; animationIndex++) {
        const animation = source.animations[animationIndex];
        destination.animations.push(animation.serialize());
      }
    }
  }
  static Serialize(entity, serializationObject) {
    if (!serializationObject) serializationObject = {};
    if (Tags) serializationObject.tags = Tags.GetTags(entity);
    const serializedProperties = GetMergedStore(entity);
    for (const property in serializedProperties) {
      const propertyDescriptor = serializedProperties[property];
      const targetPropertyName = propertyDescriptor.sourceName || property;
      const propertyType = propertyDescriptor.type;
      const sourceProperty = entity[property];
      if (sourceProperty !== void 0 && sourceProperty !== null && (property !== "uniqueId" || SerializationHelper2.AllowLoadingUniqueId)) switch (propertyType) {
        case 0:
          if (Array.isArray(sourceProperty)) serializationObject[targetPropertyName] = sourceProperty.slice();
          else serializationObject[targetPropertyName] = sourceProperty;
          break;
        case 1:
          serializationObject[targetPropertyName] = sourceProperty.serialize();
          break;
        case 2:
          serializationObject[targetPropertyName] = sourceProperty.asArray();
          break;
        case 3:
          serializationObject[targetPropertyName] = sourceProperty.serialize();
          break;
        case 4:
          serializationObject[targetPropertyName] = sourceProperty.asArray();
          break;
        case 5:
          serializationObject[targetPropertyName] = sourceProperty.asArray();
          break;
        case 6:
          serializationObject[targetPropertyName] = sourceProperty.id;
          break;
        case 7:
          serializationObject[targetPropertyName] = sourceProperty.serialize();
          break;
        case 8:
          serializationObject[targetPropertyName] = sourceProperty.asArray();
          break;
        case 9:
          serializationObject[targetPropertyName] = sourceProperty.serialize();
          break;
        case 10:
          serializationObject[targetPropertyName] = sourceProperty.asArray();
          break;
        case 11:
          serializationObject[targetPropertyName] = sourceProperty.id;
          break;
        case 12:
          serializationObject[targetPropertyName] = sourceProperty.asArray();
          break;
      }
    }
    return serializationObject;
  }
  static ParseProperties(source, destination, scene, rootUrl) {
    if (!rootUrl) rootUrl = "";
    const classStore = GetMergedStore(destination);
    for (const property in classStore) {
      const propertyDescriptor = classStore[property];
      const sourceProperty = source[propertyDescriptor.sourceName || property];
      const propertyType = propertyDescriptor.type;
      if (sourceProperty !== void 0 && sourceProperty !== null && (property !== "uniqueId" || SerializationHelper2.AllowLoadingUniqueId)) {
        const dest = destination;
        switch (propertyType) {
          case 0:
            dest[property] = sourceProperty;
            break;
          case 1:
            if (scene) dest[property] = SerializationHelper2._TextureParser(sourceProperty, scene, rootUrl);
            break;
          case 2:
            dest[property] = Color3.FromArray(sourceProperty);
            break;
          case 3:
            dest[property] = SerializationHelper2._FresnelParametersParser(sourceProperty);
            break;
          case 4:
            dest[property] = Vector2.FromArray(sourceProperty);
            break;
          case 5:
            dest[property] = Vector3.FromArray(sourceProperty);
            break;
          case 6:
            if (scene) dest[property] = scene.getLastMeshById(sourceProperty);
            break;
          case 7:
            dest[property] = SerializationHelper2._ColorCurvesParser(sourceProperty);
            break;
          case 8:
            dest[property] = Color4.FromArray(sourceProperty);
            break;
          case 9:
            dest[property] = SerializationHelper2._ImageProcessingConfigurationParser(sourceProperty);
            break;
          case 10:
            dest[property] = Quaternion.FromArray(sourceProperty);
            break;
          case 11:
            if (scene) dest[property] = scene.getCameraById(sourceProperty);
            break;
          case 12:
            dest[property] = Matrix.FromArray(sourceProperty);
            break;
        }
      }
    }
  }
  static Parse(creationFunction, source, scene, rootUrl = null) {
    const destination = creationFunction();
    if (Tags) Tags.AddTagsTo(destination, source.tags);
    SerializationHelper2.ParseProperties(source, destination, scene, rootUrl);
    return destination;
  }
  static Clone(creationFunction, source, options = {}) {
    return CopySource(creationFunction, source, false, options);
  }
  static Instanciate(creationFunction, source) {
    return CopySource(creationFunction, source, true);
  }
};
SerializationHelper.AllowLoadingUniqueId = false;
SerializationHelper._ImageProcessingConfigurationParser = (sourceProperty) => {
  throw _WarnImport("ImageProcessingConfiguration");
};
SerializationHelper._FresnelParametersParser = (sourceProperty) => {
  throw _WarnImport("FresnelParameters");
};
SerializationHelper._ColorCurvesParser = (sourceProperty) => {
  throw _WarnImport("ColorCurves");
};
SerializationHelper._TextureParser = (sourceProperty, scene, rootUrl) => {
  throw _WarnImport("Texture");
};
var Size = class Size2 {
  constructor(width, height) {
    this.width = width;
    this.height = height;
  }
  toString() {
    return `{W: ${this.width}, H: ${this.height}}`;
  }
  getClassName() {
    return "Size";
  }
  getHashCode() {
    let hash = this.width | 0;
    hash = hash * 397 ^ (this.height | 0);
    return hash;
  }
  copyFrom(src) {
    this.width = src.width;
    this.height = src.height;
  }
  copyFromFloats(width, height) {
    this.width = width;
    this.height = height;
    return this;
  }
  set(width, height) {
    return this.copyFromFloats(width, height);
  }
  multiplyByFloats(w, h) {
    return new Size2(this.width * w, this.height * h);
  }
  clone() {
    return new Size2(this.width, this.height);
  }
  equals(other) {
    if (!other) return false;
    return this.width === other.width && this.height === other.height;
  }
  get surface() {
    return this.width * this.height;
  }
  static Zero() {
    return new Size2(0, 0);
  }
  add(otherSize) {
    return new Size2(this.width + otherSize.width, this.height + otherSize.height);
  }
  subtract(otherSize) {
    return new Size2(this.width - otherSize.width, this.height - otherSize.height);
  }
  scale(scale) {
    return new Size2(this.width * scale, this.height * scale);
  }
  static Lerp(start, end, amount) {
    const w = start.width + (end.width - start.width) * amount;
    const h = start.height + (end.height - start.height) * amount;
    return new Size2(w, h);
  }
};
var ThinTexture = class ThinTexture2 {
  get wrapU() {
    return this._wrapU;
  }
  set wrapU(value) {
    this._wrapU = value;
  }
  get wrapV() {
    return this._wrapV;
  }
  set wrapV(value) {
    this._wrapV = value;
  }
  get coordinatesMode() {
    return 0;
  }
  get isCube() {
    if (!this._texture) return false;
    return this._texture.isCube;
  }
  set isCube(value) {
    if (!this._texture) return;
    this._texture.isCube = value;
  }
  get is3D() {
    if (!this._texture) return false;
    return this._texture.is3D;
  }
  set is3D(value) {
    if (!this._texture) return;
    this._texture.is3D = value;
  }
  get is2DArray() {
    if (!this._texture) return false;
    return this._texture.is2DArray;
  }
  set is2DArray(value) {
    if (!this._texture) return;
    this._texture.is2DArray = value;
  }
  getClassName() {
    return "ThinTexture";
  }
  static _IsRenderTargetWrapper(texture) {
    return texture?.shareDepth !== void 0;
  }
  constructor(internalTexture) {
    this._wrapU = 1;
    this._wrapV = 1;
    this.wrapR = 1;
    this.anisotropicFilteringLevel = 4;
    this.delayLoadState = 0;
    this._texture = null;
    this._engine = null;
    this._cachedSize = Size.Zero();
    this._cachedBaseSize = Size.Zero();
    this._initialSamplingMode = 2;
    this._texture = ThinTexture2._IsRenderTargetWrapper(internalTexture) ? internalTexture.texture : internalTexture;
    if (this._texture) {
      this._engine = this._texture.getEngine();
      this.wrapU = this._texture._cachedWrapU ?? this.wrapU;
      this.wrapV = this._texture._cachedWrapV ?? this.wrapV;
      this.wrapR = this._texture._cachedWrapR ?? this.wrapR;
    }
  }
  isReady() {
    if (this.delayLoadState === 4) {
      this.delayLoad();
      return false;
    }
    if (this._texture) return this._texture.isReady;
    return false;
  }
  delayLoad() {
  }
  getInternalTexture() {
    return this._texture;
  }
  getSize() {
    if (this._texture) {
      if (this._texture.width) {
        this._cachedSize.width = this._texture.width;
        this._cachedSize.height = this._texture.height;
        return this._cachedSize;
      }
      if (this._texture._size) {
        this._cachedSize.width = this._texture._size;
        this._cachedSize.height = this._texture._size;
        return this._cachedSize;
      }
    }
    return this._cachedSize;
  }
  getBaseSize() {
    if (!this.isReady() || !this._texture) {
      this._cachedBaseSize.width = 0;
      this._cachedBaseSize.height = 0;
      return this._cachedBaseSize;
    }
    if (this._texture._size) {
      this._cachedBaseSize.width = this._texture._size;
      this._cachedBaseSize.height = this._texture._size;
      return this._cachedBaseSize;
    }
    this._cachedBaseSize.width = this._texture.baseWidth;
    this._cachedBaseSize.height = this._texture.baseHeight;
    return this._cachedBaseSize;
  }
  get samplingMode() {
    if (!this._texture) return this._initialSamplingMode;
    return this._texture.samplingMode;
  }
  updateSamplingMode(samplingMode, generateMipMaps = false) {
    if (this._texture && this._engine) this._engine.updateTextureSamplingMode(samplingMode, this._texture, this._texture.generateMipMaps && generateMipMaps);
  }
  releaseInternalTexture() {
    if (this._texture) {
      this._texture.dispose();
      this._texture = null;
    }
  }
  dispose() {
    if (this._texture) {
      this.releaseInternalTexture();
      this._engine = null;
    }
  }
};
var _a;
var BaseTexture = (() => {
  var _a2;
  let _classSuper = ThinTexture;
  let _instanceExtraInitializers = [];
  let _uniqueId_decorators;
  let _uniqueId_initializers = [];
  let _uniqueId_extraInitializers = [];
  let _name_decorators;
  let _name_initializers = [];
  let _name_extraInitializers = [];
  let _displayName_decorators;
  let _displayName_initializers = [];
  let _displayName_extraInitializers = [];
  let _metadata_decorators;
  let _metadata_initializers = [];
  let _metadata_extraInitializers = [];
  let __hasAlpha_decorators;
  let __hasAlpha_initializers = [];
  let __hasAlpha_extraInitializers = [];
  let __getAlphaFromRGB_decorators;
  let __getAlphaFromRGB_initializers = [];
  let __getAlphaFromRGB_extraInitializers = [];
  let _level_decorators;
  let _level_initializers = [];
  let _level_extraInitializers = [];
  let __coordinatesIndex_decorators;
  let __coordinatesIndex_initializers = [];
  let __coordinatesIndex_extraInitializers = [];
  let _optimizeUVAllocation_decorators;
  let _optimizeUVAllocation_initializers = [];
  let _optimizeUVAllocation_extraInitializers = [];
  let __coordinatesMode_decorators;
  let __coordinatesMode_initializers = [];
  let __coordinatesMode_extraInitializers = [];
  let _get_wrapU_decorators;
  let _get_wrapV_decorators;
  let _wrapR_decorators;
  let _wrapR_initializers = [];
  let _wrapR_extraInitializers = [];
  let _anisotropicFilteringLevel_decorators;
  let _anisotropicFilteringLevel_initializers = [];
  let _anisotropicFilteringLevel_extraInitializers = [];
  let _get_isCube_decorators;
  let _get_is3D_decorators;
  let _get_is2DArray_decorators;
  let _get_gammaSpace_decorators;
  let _invertZ_decorators;
  let _invertZ_initializers = [];
  let _invertZ_extraInitializers = [];
  let _lodLevelInAlpha_decorators;
  let _lodLevelInAlpha_initializers = [];
  let _lodLevelInAlpha_extraInitializers = [];
  let _get_lodGenerationOffset_decorators;
  let _get_lodGenerationScale_decorators;
  let _get_linearSpecularLOD_decorators;
  let _get_irradianceTexture_decorators;
  let _isRenderTarget_decorators;
  let _isRenderTarget_initializers = [];
  let _isRenderTarget_extraInitializers = [];
  return _a2 = class BaseTexture extends _classSuper {
    set hasAlpha(value) {
      if (this._hasAlpha === value) return;
      this._hasAlpha = value;
      if (this._scene) this._scene.markAllMaterialsAsDirty(1, (mat) => {
        return mat.hasTexture(this);
      });
    }
    get hasAlpha() {
      return this._hasAlpha;
    }
    set getAlphaFromRGB(value) {
      if (this._getAlphaFromRGB === value) return;
      this._getAlphaFromRGB = value;
      if (this._scene) this._scene.markAllMaterialsAsDirty(1, (mat) => {
        return mat.hasTexture(this);
      });
    }
    get getAlphaFromRGB() {
      return this._getAlphaFromRGB;
    }
    set coordinatesIndex(value) {
      if (this._coordinatesIndex === value) return;
      this._coordinatesIndex = value;
      if (this._scene) this._scene.markAllMaterialsAsDirty(1, (mat) => {
        return mat.hasTexture(this);
      });
    }
    get coordinatesIndex() {
      return this._coordinatesIndex;
    }
    set coordinatesMode(value) {
      if (this._coordinatesMode === value) return;
      this._coordinatesMode = value;
      if (this._scene) this._scene.markAllMaterialsAsDirty(1, (mat) => {
        return mat.hasTexture(this);
      });
    }
    get coordinatesMode() {
      return this._coordinatesMode;
    }
    get wrapU() {
      return this._wrapU;
    }
    set wrapU(value) {
      this._wrapU = value;
    }
    get wrapV() {
      return this._wrapV;
    }
    set wrapV(value) {
      this._wrapV = value;
    }
    get isCube() {
      if (!this._texture) return this._isCube;
      return this._texture.isCube;
    }
    set isCube(value) {
      if (!this._texture) this._isCube = value;
      else this._texture.isCube = value;
    }
    get is3D() {
      if (!this._texture) return false;
      return this._texture.is3D;
    }
    set is3D(value) {
      if (!this._texture) return;
      this._texture.is3D = value;
    }
    get is2DArray() {
      if (!this._texture) return false;
      return this._texture.is2DArray;
    }
    set is2DArray(value) {
      if (!this._texture) return;
      this._texture.is2DArray = value;
    }
    get gammaSpace() {
      if (!this._texture) return this._gammaSpace;
      else if (this._texture._gammaSpace === null) this._texture._gammaSpace = this._gammaSpace;
      return this._texture._gammaSpace && !this._texture._useSRGBBuffer;
    }
    set gammaSpace(gamma) {
      if (!this._texture) {
        if (this._gammaSpace === gamma) return;
        this._gammaSpace = gamma;
      } else {
        if (this._texture._gammaSpace === gamma) return;
        this._texture._gammaSpace = gamma;
      }
      this.getScene()?.markAllMaterialsAsDirty(1, (mat) => {
        return mat.hasTexture(this);
      });
    }
    get isRGBD() {
      return this._texture != null && this._texture._isRGBD;
    }
    set isRGBD(value) {
      if (value === this.isRGBD) return;
      if (this._texture) this._texture._isRGBD = value;
      this.getScene()?.markAllMaterialsAsDirty(1, (mat) => {
        return mat.hasTexture(this);
      });
    }
    get noMipmap() {
      return false;
    }
    get lodGenerationOffset() {
      if (this._texture) return this._texture._lodGenerationOffset;
      return 0;
    }
    set lodGenerationOffset(value) {
      if (this._texture) this._texture._lodGenerationOffset = value;
    }
    get lodGenerationScale() {
      if (this._texture) return this._texture._lodGenerationScale;
      return 0;
    }
    set lodGenerationScale(value) {
      if (this._texture) this._texture._lodGenerationScale = value;
    }
    get linearSpecularLOD() {
      if (this._texture) return this._texture._linearSpecularLOD;
      return false;
    }
    set linearSpecularLOD(value) {
      if (this._texture) this._texture._linearSpecularLOD = value;
    }
    get irradianceTexture() {
      if (this._texture) return this._texture._irradianceTexture;
      return null;
    }
    set irradianceTexture(value) {
      if (this._texture) this._texture._irradianceTexture = value;
    }
    get uid() {
      if (!this._uid) this._uid = RandomGUID();
      return this._uid;
    }
    toString() {
      return this.name;
    }
    getClassName() {
      return "BaseTexture";
    }
    set onDispose(callback) {
      if (this._onDisposeObserver) this.onDisposeObservable.remove(this._onDisposeObserver);
      this._onDisposeObserver = this.onDisposeObservable.add(callback);
    }
    get isBlocking() {
      return true;
    }
    get loadingError() {
      return this._loadingError;
    }
    get errorObject() {
      return this._errorObject;
    }
    constructor(sceneOrEngine, internalTexture = null) {
      super(null);
      this.uniqueId = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _uniqueId_initializers, void 0));
      this.name = (__runInitializers(this, _uniqueId_extraInitializers), __runInitializers(this, _name_initializers, void 0));
      this.displayName = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _displayName_initializers, void 0));
      this.metadata = (__runInitializers(this, _displayName_extraInitializers), __runInitializers(this, _metadata_initializers, null));
      this._internalMetadata = __runInitializers(this, _metadata_extraInitializers);
      this.reservedDataStore = null;
      this._hasAlpha = __runInitializers(this, __hasAlpha_initializers, false);
      this._getAlphaFromRGB = (__runInitializers(this, __hasAlpha_extraInitializers), __runInitializers(this, __getAlphaFromRGB_initializers, false));
      this.level = (__runInitializers(this, __getAlphaFromRGB_extraInitializers), __runInitializers(this, _level_initializers, 1));
      this._coordinatesIndex = (__runInitializers(this, _level_extraInitializers), __runInitializers(this, __coordinatesIndex_initializers, 0));
      this.optimizeUVAllocation = (__runInitializers(this, __coordinatesIndex_extraInitializers), __runInitializers(this, _optimizeUVAllocation_initializers, true));
      this._coordinatesMode = (__runInitializers(this, _optimizeUVAllocation_extraInitializers), __runInitializers(this, __coordinatesMode_initializers, 0));
      this.wrapR = (__runInitializers(this, __coordinatesMode_extraInitializers), __runInitializers(this, _wrapR_initializers, 1));
      this.anisotropicFilteringLevel = (__runInitializers(this, _wrapR_extraInitializers), __runInitializers(this, _anisotropicFilteringLevel_initializers, _a2.DEFAULT_ANISOTROPIC_FILTERING_LEVEL));
      this._isCube = (__runInitializers(this, _anisotropicFilteringLevel_extraInitializers), false);
      this._gammaSpace = true;
      this.invertZ = __runInitializers(this, _invertZ_initializers, false);
      this.lodLevelInAlpha = (__runInitializers(this, _invertZ_extraInitializers), __runInitializers(this, _lodLevelInAlpha_initializers, false));
      this._dominantDirection = (__runInitializers(this, _lodLevelInAlpha_extraInitializers), null);
      this.isRenderTarget = __runInitializers(this, _isRenderTarget_initializers, false);
      this._prefiltered = (__runInitializers(this, _isRenderTarget_extraInitializers), false);
      this._forceSerialize = false;
      this.animations = [];
      this.onDisposeObservable = new Observable();
      this._onDisposeObserver = null;
      this._scene = null;
      this._uid = null;
      this._parentContainer = null;
      this._loadingError = false;
      if (sceneOrEngine) if (_a2._IsScene(sceneOrEngine)) this._scene = sceneOrEngine;
      else this._engine = sceneOrEngine;
      else this._scene = EngineStore.LastCreatedScene;
      if (this._scene) {
        this.uniqueId = this._scene.getUniqueId();
        this._scene.addTexture(this);
        this._engine = this._scene.getEngine();
      }
      this._texture = internalTexture;
      this._uid = null;
    }
    getScene() {
      return this._scene;
    }
    _getEngine() {
      return this._engine;
    }
    getTextureMatrix() {
      return Matrix.IdentityReadOnly;
    }
    getReflectionTextureMatrix() {
      return Matrix.IdentityReadOnly;
    }
    getRefractionTextureMatrix() {
      return this.getReflectionTextureMatrix();
    }
    isReadyOrNotBlocking() {
      return !this.isBlocking || this.isReady() || this.loadingError;
    }
    scale(ratio) {
    }
    get canRescale() {
      return false;
    }
    _getFromCache(url, noMipmap, sampling, invertY, useSRGBBuffer, isCube) {
      const engine = this._getEngine();
      if (!engine) return null;
      const correctedUseSRGBBuffer = engine._getUseSRGBBuffer(!!useSRGBBuffer, noMipmap);
      const texturesCache = engine.getLoadedTexturesCache();
      for (let index = 0; index < texturesCache.length; index++) {
        const texturesCacheEntry = texturesCache[index];
        if (useSRGBBuffer === void 0 || correctedUseSRGBBuffer === texturesCacheEntry._useSRGBBuffer) {
          if (invertY === void 0 || invertY === texturesCacheEntry.invertY) {
            if (texturesCacheEntry.url === url && texturesCacheEntry.generateMipMaps === !noMipmap) {
              if (!sampling || sampling === texturesCacheEntry.samplingMode) {
                if (isCube === void 0 || isCube === texturesCacheEntry.isCube) {
                  texturesCacheEntry.incrementReferences();
                  return texturesCacheEntry;
                }
              }
            }
          }
        }
      }
      return null;
    }
    _rebuild(_fromContextLost = false) {
    }
    clone() {
      return null;
    }
    get textureType() {
      if (!this._texture) return 0;
      return this._texture.type !== void 0 ? this._texture.type : 0;
    }
    get textureFormat() {
      if (!this._texture) return 5;
      return this._texture.format !== void 0 ? this._texture.format : 5;
    }
    _markAllSubMeshesAsTexturesDirty() {
      const scene = this.getScene();
      if (!scene) return;
      scene.markAllMaterialsAsDirty(1);
    }
    readPixels(faceIndex = 0, level = 0, buffer = null, flushRenderer = true, noDataConversion = false, x = 0, y = 0, width = Number.MAX_VALUE, height = Number.MAX_VALUE) {
      if (!this._texture) return null;
      const engine = this._getEngine();
      if (!engine) return null;
      const size = this.getSize();
      let maxWidth = size.width;
      let maxHeight = size.height;
      if (level !== 0) {
        maxWidth = maxWidth / Math.pow(2, level);
        maxHeight = maxHeight / Math.pow(2, level);
        maxWidth = Math.round(maxWidth);
        maxHeight = Math.round(maxHeight);
      }
      width = Math.min(maxWidth, width);
      height = Math.min(maxHeight, height);
      try {
        if (this._texture.isCube || this._texture.is2DArray) return engine._readTexturePixels(this._texture, width, height, faceIndex, level, buffer, flushRenderer, noDataConversion, x, y);
        return engine._readTexturePixels(this._texture, width, height, -1, level, buffer, flushRenderer, noDataConversion, x, y);
      } catch (e) {
        return null;
      }
    }
    _readPixelsSync(faceIndex = 0, level = 0, buffer = null, flushRenderer = true, noDataConversion = false) {
      if (!this._texture) return null;
      const size = this.getSize();
      let width = size.width;
      let height = size.height;
      const engine = this._getEngine();
      if (!engine) return null;
      if (level != 0) {
        width = width / Math.pow(2, level);
        height = height / Math.pow(2, level);
        width = Math.round(width);
        height = Math.round(height);
      }
      try {
        if (this._texture.isCube) return engine._readTexturePixelsSync(this._texture, width, height, faceIndex, level, buffer, flushRenderer, noDataConversion);
        return engine._readTexturePixelsSync(this._texture, width, height, -1, level, buffer, flushRenderer, noDataConversion);
      } catch (e) {
        return null;
      }
    }
    get _lodTextureHigh() {
      if (this._texture) return this._texture._lodTextureHigh;
      return null;
    }
    get _lodTextureMid() {
      if (this._texture) return this._texture._lodTextureMid;
      return null;
    }
    get _lodTextureLow() {
      if (this._texture) return this._texture._lodTextureLow;
      return null;
    }
    dispose() {
      if (this._scene) {
        if (this._scene.stopAnimation) this._scene.stopAnimation(this);
        this._scene.removePendingData(this);
        const index = this._scene.textures.indexOf(this);
        if (index >= 0) this._scene.textures.splice(index, 1);
        this._scene.onTextureRemovedObservable.notifyObservers(this);
        this._scene = null;
        if (this._parentContainer) {
          const index2 = this._parentContainer.textures.indexOf(this);
          if (index2 > -1) this._parentContainer.textures.splice(index2, 1);
          this._parentContainer = null;
        }
      }
      this.onDisposeObservable.notifyObservers(this);
      this.onDisposeObservable.clear();
      this.metadata = null;
      super.dispose();
    }
    serialize(allowEmptyName = false) {
      if (!this.name && !allowEmptyName) return null;
      const serializationObject = SerializationHelper.Serialize(this);
      SerializationHelper.AppendSerializedAnimations(this, serializationObject);
      return serializationObject;
    }
    static WhenAllReady(textures, callback) {
      let numRemaining = textures.length;
      if (numRemaining === 0) {
        callback();
        return;
      }
      for (let i = 0; i < textures.length; i++) {
        const texture = textures[i];
        if (texture.isReady()) {
          if (--numRemaining === 0) callback();
        } else {
          const onLoadObservable = texture.onLoadObservable;
          if (onLoadObservable) onLoadObservable.addOnce(() => {
            if (--numRemaining === 0) callback();
          });
          else if (--numRemaining === 0) callback();
        }
      }
    }
    static _IsScene(sceneOrEngine) {
      return sceneOrEngine.getClassName() === "Scene";
    }
  }, (() => {
    const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
    _uniqueId_decorators = [serialize()];
    _name_decorators = [serialize()];
    _displayName_decorators = [serialize()];
    _metadata_decorators = [serialize()];
    __hasAlpha_decorators = [serialize("hasAlpha")];
    __getAlphaFromRGB_decorators = [serialize("getAlphaFromRGB")];
    _level_decorators = [serialize()];
    __coordinatesIndex_decorators = [serialize("coordinatesIndex")];
    _optimizeUVAllocation_decorators = [serialize()];
    __coordinatesMode_decorators = [serialize("coordinatesMode")];
    _get_wrapU_decorators = [serialize()];
    _get_wrapV_decorators = [serialize()];
    _wrapR_decorators = [serialize()];
    _anisotropicFilteringLevel_decorators = [serialize()];
    _get_isCube_decorators = [serialize()];
    _get_is3D_decorators = [serialize()];
    _get_is2DArray_decorators = [serialize()];
    _get_gammaSpace_decorators = [serialize()];
    _invertZ_decorators = [serialize()];
    _lodLevelInAlpha_decorators = [serialize()];
    _get_lodGenerationOffset_decorators = [serialize()];
    _get_lodGenerationScale_decorators = [serialize()];
    _get_linearSpecularLOD_decorators = [serialize()];
    _get_irradianceTexture_decorators = [serializeAsTexture()];
    _isRenderTarget_decorators = [serialize()];
    __esDecorate(_a2, null, _get_wrapU_decorators, {
      kind: "getter",
      name: "wrapU",
      static: false,
      private: false,
      access: {
        has: (obj) => "wrapU" in obj,
        get: (obj) => obj.wrapU
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(_a2, null, _get_wrapV_decorators, {
      kind: "getter",
      name: "wrapV",
      static: false,
      private: false,
      access: {
        has: (obj) => "wrapV" in obj,
        get: (obj) => obj.wrapV
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(_a2, null, _get_isCube_decorators, {
      kind: "getter",
      name: "isCube",
      static: false,
      private: false,
      access: {
        has: (obj) => "isCube" in obj,
        get: (obj) => obj.isCube
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(_a2, null, _get_is3D_decorators, {
      kind: "getter",
      name: "is3D",
      static: false,
      private: false,
      access: {
        has: (obj) => "is3D" in obj,
        get: (obj) => obj.is3D
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(_a2, null, _get_is2DArray_decorators, {
      kind: "getter",
      name: "is2DArray",
      static: false,
      private: false,
      access: {
        has: (obj) => "is2DArray" in obj,
        get: (obj) => obj.is2DArray
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(_a2, null, _get_gammaSpace_decorators, {
      kind: "getter",
      name: "gammaSpace",
      static: false,
      private: false,
      access: {
        has: (obj) => "gammaSpace" in obj,
        get: (obj) => obj.gammaSpace
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(_a2, null, _get_lodGenerationOffset_decorators, {
      kind: "getter",
      name: "lodGenerationOffset",
      static: false,
      private: false,
      access: {
        has: (obj) => "lodGenerationOffset" in obj,
        get: (obj) => obj.lodGenerationOffset
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(_a2, null, _get_lodGenerationScale_decorators, {
      kind: "getter",
      name: "lodGenerationScale",
      static: false,
      private: false,
      access: {
        has: (obj) => "lodGenerationScale" in obj,
        get: (obj) => obj.lodGenerationScale
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(_a2, null, _get_linearSpecularLOD_decorators, {
      kind: "getter",
      name: "linearSpecularLOD",
      static: false,
      private: false,
      access: {
        has: (obj) => "linearSpecularLOD" in obj,
        get: (obj) => obj.linearSpecularLOD
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(_a2, null, _get_irradianceTexture_decorators, {
      kind: "getter",
      name: "irradianceTexture",
      static: false,
      private: false,
      access: {
        has: (obj) => "irradianceTexture" in obj,
        get: (obj) => obj.irradianceTexture
      },
      metadata: _metadata
    }, null, _instanceExtraInitializers);
    __esDecorate(null, null, _uniqueId_decorators, {
      kind: "field",
      name: "uniqueId",
      static: false,
      private: false,
      access: {
        has: (obj) => "uniqueId" in obj,
        get: (obj) => obj.uniqueId,
        set: (obj, value) => {
          obj.uniqueId = value;
        }
      },
      metadata: _metadata
    }, _uniqueId_initializers, _uniqueId_extraInitializers);
    __esDecorate(null, null, _name_decorators, {
      kind: "field",
      name: "name",
      static: false,
      private: false,
      access: {
        has: (obj) => "name" in obj,
        get: (obj) => obj.name,
        set: (obj, value) => {
          obj.name = value;
        }
      },
      metadata: _metadata
    }, _name_initializers, _name_extraInitializers);
    __esDecorate(null, null, _displayName_decorators, {
      kind: "field",
      name: "displayName",
      static: false,
      private: false,
      access: {
        has: (obj) => "displayName" in obj,
        get: (obj) => obj.displayName,
        set: (obj, value) => {
          obj.displayName = value;
        }
      },
      metadata: _metadata
    }, _displayName_initializers, _displayName_extraInitializers);
    __esDecorate(null, null, _metadata_decorators, {
      kind: "field",
      name: "metadata",
      static: false,
      private: false,
      access: {
        has: (obj) => "metadata" in obj,
        get: (obj) => obj.metadata,
        set: (obj, value) => {
          obj.metadata = value;
        }
      },
      metadata: _metadata
    }, _metadata_initializers, _metadata_extraInitializers);
    __esDecorate(null, null, __hasAlpha_decorators, {
      kind: "field",
      name: "_hasAlpha",
      static: false,
      private: false,
      access: {
        has: (obj) => "_hasAlpha" in obj,
        get: (obj) => obj._hasAlpha,
        set: (obj, value) => {
          obj._hasAlpha = value;
        }
      },
      metadata: _metadata
    }, __hasAlpha_initializers, __hasAlpha_extraInitializers);
    __esDecorate(null, null, __getAlphaFromRGB_decorators, {
      kind: "field",
      name: "_getAlphaFromRGB",
      static: false,
      private: false,
      access: {
        has: (obj) => "_getAlphaFromRGB" in obj,
        get: (obj) => obj._getAlphaFromRGB,
        set: (obj, value) => {
          obj._getAlphaFromRGB = value;
        }
      },
      metadata: _metadata
    }, __getAlphaFromRGB_initializers, __getAlphaFromRGB_extraInitializers);
    __esDecorate(null, null, _level_decorators, {
      kind: "field",
      name: "level",
      static: false,
      private: false,
      access: {
        has: (obj) => "level" in obj,
        get: (obj) => obj.level,
        set: (obj, value) => {
          obj.level = value;
        }
      },
      metadata: _metadata
    }, _level_initializers, _level_extraInitializers);
    __esDecorate(null, null, __coordinatesIndex_decorators, {
      kind: "field",
      name: "_coordinatesIndex",
      static: false,
      private: false,
      access: {
        has: (obj) => "_coordinatesIndex" in obj,
        get: (obj) => obj._coordinatesIndex,
        set: (obj, value) => {
          obj._coordinatesIndex = value;
        }
      },
      metadata: _metadata
    }, __coordinatesIndex_initializers, __coordinatesIndex_extraInitializers);
    __esDecorate(null, null, _optimizeUVAllocation_decorators, {
      kind: "field",
      name: "optimizeUVAllocation",
      static: false,
      private: false,
      access: {
        has: (obj) => "optimizeUVAllocation" in obj,
        get: (obj) => obj.optimizeUVAllocation,
        set: (obj, value) => {
          obj.optimizeUVAllocation = value;
        }
      },
      metadata: _metadata
    }, _optimizeUVAllocation_initializers, _optimizeUVAllocation_extraInitializers);
    __esDecorate(null, null, __coordinatesMode_decorators, {
      kind: "field",
      name: "_coordinatesMode",
      static: false,
      private: false,
      access: {
        has: (obj) => "_coordinatesMode" in obj,
        get: (obj) => obj._coordinatesMode,
        set: (obj, value) => {
          obj._coordinatesMode = value;
        }
      },
      metadata: _metadata
    }, __coordinatesMode_initializers, __coordinatesMode_extraInitializers);
    __esDecorate(null, null, _wrapR_decorators, {
      kind: "field",
      name: "wrapR",
      static: false,
      private: false,
      access: {
        has: (obj) => "wrapR" in obj,
        get: (obj) => obj.wrapR,
        set: (obj, value) => {
          obj.wrapR = value;
        }
      },
      metadata: _metadata
    }, _wrapR_initializers, _wrapR_extraInitializers);
    __esDecorate(null, null, _anisotropicFilteringLevel_decorators, {
      kind: "field",
      name: "anisotropicFilteringLevel",
      static: false,
      private: false,
      access: {
        has: (obj) => "anisotropicFilteringLevel" in obj,
        get: (obj) => obj.anisotropicFilteringLevel,
        set: (obj, value) => {
          obj.anisotropicFilteringLevel = value;
        }
      },
      metadata: _metadata
    }, _anisotropicFilteringLevel_initializers, _anisotropicFilteringLevel_extraInitializers);
    __esDecorate(null, null, _invertZ_decorators, {
      kind: "field",
      name: "invertZ",
      static: false,
      private: false,
      access: {
        has: (obj) => "invertZ" in obj,
        get: (obj) => obj.invertZ,
        set: (obj, value) => {
          obj.invertZ = value;
        }
      },
      metadata: _metadata
    }, _invertZ_initializers, _invertZ_extraInitializers);
    __esDecorate(null, null, _lodLevelInAlpha_decorators, {
      kind: "field",
      name: "lodLevelInAlpha",
      static: false,
      private: false,
      access: {
        has: (obj) => "lodLevelInAlpha" in obj,
        get: (obj) => obj.lodLevelInAlpha,
        set: (obj, value) => {
          obj.lodLevelInAlpha = value;
        }
      },
      metadata: _metadata
    }, _lodLevelInAlpha_initializers, _lodLevelInAlpha_extraInitializers);
    __esDecorate(null, null, _isRenderTarget_decorators, {
      kind: "field",
      name: "isRenderTarget",
      static: false,
      private: false,
      access: {
        has: (obj) => "isRenderTarget" in obj,
        get: (obj) => obj.isRenderTarget,
        set: (obj, value) => {
          obj.isRenderTarget = value;
        }
      },
      metadata: _metadata
    }, _isRenderTarget_initializers, _isRenderTarget_extraInitializers);
    if (_metadata) Object.defineProperty(_a2, Symbol.metadata, {
      enumerable: true,
      configurable: true,
      writable: true,
      value: _metadata
    });
  })(), _a2.DEFAULT_ANISOTROPIC_FILTERING_LEVEL = 4, _a2;
})();
(_a = BaseTexture.prototype).forceSphericalPolynomialsRecompute ?? (_a.forceSphericalPolynomialsRecompute = _MissingSideEffect("BaseTexture", "forceSphericalPolynomialsRecompute"));
if (!Object.getOwnPropertyDescriptor(BaseTexture.prototype, "sphericalPolynomial")) Object.defineProperty(BaseTexture.prototype, "sphericalPolynomial", _MissingSideEffectProperty("BaseTexture", "sphericalPolynomial"));
export {
  __esDecorate as _,
  serialize as a,
  serializeAsColorCurves as c,
  serializeAsQuaternion as d,
  serializeAsTexture as f,
  __classPrivateFieldSet as g,
  __classPrivateFieldGet as h,
  nativeOverride as i,
  serializeAsFresnelParameters as l,
  GetDirectStoreFromMetadata as m,
  SerializationHelper as n,
  serializeAsColor3 as o,
  serializeAsVector3 as p,
  expandToProperty as r,
  serializeAsColor4 as s,
  BaseTexture as t,
  serializeAsMeshReference as u,
  __runInitializers as v,
  Tags as y
};
