import { o as EngineStore, s as Observable } from "./typeStore-Bi_ki0b5.js";
import { C as _WarnImport, S as _MissingSideEffectProperty, t as RandomGUID, x as _MissingSideEffect } from "./guid-DgALBCu_.js";
import { a as Matrix, l as Vector2, n as Color4, o as Quaternion, t as Color3, u as Vector3 } from "./math.color.pure-Cmv0AWRo.js";
//#region node_modules/@babylonjs/core/Misc/andOrNotEvaluator.js
/**
* Class used to evaluate queries containing `and` and `or` operators
*/
var AndOrNotEvaluator = class AndOrNotEvaluator {
	/**
	* Evaluate a query
	* @param query defines the query to evaluate
	* @param evaluateCallback defines the callback used to filter result
	* @returns true if the query matches
	*/
	static Eval(query, evaluateCallback) {
		if (!query.match(/\([^()]*\)/g)) query = AndOrNotEvaluator._HandleParenthesisContent(query, evaluateCallback);
		else query = query.replace(/\([^()]*\)/g, (r) => {
			r = r.slice(1, r.length - 1);
			return AndOrNotEvaluator._HandleParenthesisContent(r, evaluateCallback);
		});
		if (query === "true") return true;
		if (query === "false") return false;
		return AndOrNotEvaluator.Eval(query, evaluateCallback);
	}
	static _HandleParenthesisContent(parenthesisContent, evaluateCallback) {
		evaluateCallback = evaluateCallback || ((r) => {
			return r === "true" ? true : false;
		});
		let result;
		const or = parenthesisContent.split("||");
		for (const i in or) if (Object.prototype.hasOwnProperty.call(or, i)) {
			let ori = AndOrNotEvaluator._SimplifyNegation(or[i].trim());
			const and = ori.split("&&");
			if (and.length > 1) for (let j = 0; j < and.length; ++j) {
				const andj = AndOrNotEvaluator._SimplifyNegation(and[j].trim());
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
//#endregion
//#region node_modules/@babylonjs/core/Misc/tags.js
/**
* Class used to store custom tags
*/
var Tags = class Tags {
	/**
	* Adds support for tags on the given object
	* @param obj defines the object to use
	*/
	static EnableFor(obj) {
		obj._tags = obj._tags || {};
		obj.hasTags = () => {
			return Tags.HasTags(obj);
		};
		obj.addTags = (tagsString) => {
			return Tags.AddTagsTo(obj, tagsString);
		};
		obj.removeTags = (tagsString) => {
			return Tags.RemoveTagsFrom(obj, tagsString);
		};
		obj.matchesTagsQuery = (tagsQuery) => {
			return Tags.MatchesQuery(obj, tagsQuery);
		};
	}
	/**
	* Removes tags support
	* @param obj defines the object to use
	*/
	static DisableFor(obj) {
		delete obj._tags;
		delete obj.hasTags;
		delete obj.addTags;
		delete obj.removeTags;
		delete obj.matchesTagsQuery;
	}
	/**
	* Gets a boolean indicating if the given object has tags
	* @param obj defines the object to use
	* @returns a boolean
	*/
	static HasTags(obj) {
		if (!obj._tags) return false;
		const tags = obj._tags;
		for (const i in tags) if (Object.prototype.hasOwnProperty.call(tags, i)) return true;
		return false;
	}
	/**
	* Gets the tags available on a given object
	* @param obj defines the object to use
	* @param asString defines if the tags must be returned as a string instead of an array of strings
	* @returns the tags
	*/
	static GetTags(obj, asString = true) {
		if (!obj._tags) return null;
		if (asString) {
			const tagsArray = [];
			for (const tag in obj._tags) if (Object.prototype.hasOwnProperty.call(obj._tags, tag) && obj._tags[tag] === true) tagsArray.push(tag);
			return tagsArray.join(" ");
		} else return obj._tags;
	}
	/**
	* Adds tags to an object
	* @param obj defines the object to use
	* @param tagsString defines the tag string. The tags 'true' and 'false' are reserved and cannot be used as tags.
	* A tag cannot start with '||', '&&', and '!'. It cannot contain whitespaces
	*/
	static AddTagsTo(obj, tagsString) {
		if (!tagsString) return;
		if (typeof tagsString !== "string") return;
		const tags = tagsString.split(" ");
		for (const tag of tags) Tags._AddTagTo(obj, tag);
	}
	/**
	* @internal
	*/
	static _AddTagTo(obj, tag) {
		tag = tag.trim();
		if (tag === "" || tag === "true" || tag === "false") return;
		if (tag.match(/[\s]/) || tag.match(/^([!]|([|]|[&]){2})/)) return;
		Tags.EnableFor(obj);
		obj._tags[tag] = true;
	}
	/**
	* Removes specific tags from a specific object
	* @param obj defines the object to use
	* @param tagsString defines the tags to remove
	*/
	static RemoveTagsFrom(obj, tagsString) {
		if (!Tags.HasTags(obj)) return;
		const tags = tagsString.split(" ");
		for (const t in tags) Tags._RemoveTagFrom(obj, tags[t]);
	}
	/**
	* @internal
	*/
	static _RemoveTagFrom(obj, tag) {
		delete obj._tags[tag];
	}
	/**
	* Defines if tags hosted on an object match a given query
	* @param obj defines the object to use
	* @param tagsQuery defines the tag query
	* @returns a boolean
	*/
	static MatchesQuery(obj, tagsQuery) {
		if (tagsQuery === void 0) return true;
		if (tagsQuery === "") return Tags.HasTags(obj);
		return AndOrNotEvaluator.Eval(tagsQuery, (r) => Tags.HasTags(obj) && obj._tags[r]);
	}
};
//#endregion
//#region node_modules/@babylonjs/core/tslib.es6.js
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
//#endregion
//#region node_modules/@babylonjs/core/Misc/decorators.functions.js
/**
* Internal helpers for reading and writing decorator metadata used by serialization.
*
* The serialization store is attached to each class constructor via `Symbol.metadata`. The polyfill
* required for `Symbol.metadata` lives in `symbolMetadataPolyfill.ts` and is applied at package
* entry points.
*/
var __bjsSerializableKey = "__bjs_serializable__";
var _mergedStoreCache = /* @__PURE__ */ new WeakMap();
function HasOwn(target, key) {
	return Object.prototype.hasOwnProperty.call(target, key);
}
function GetMetadataSymbol() {
	let metadataSymbol = Symbol.metadata;
	if (!metadataSymbol) {
		metadataSymbol = Symbol("Symbol.metadata");
		Object.defineProperty(Symbol, "metadata", {
			configurable: true,
			writable: true,
			value: metadataSymbol
		});
	}
	return metadataSymbol;
}
/**
* The well-known `Symbol.metadata` symbol, resolved once at module-evaluation time.
*
* Reading (and thereby resolving) this symbol at module load guarantees that `Symbol.metadata`
* exists BEFORE any decorated class which imports the decorator infrastructure evaluates its class
* body. TypeScript's TC39 decorator emit captures `context.metadata` from `Symbol.metadata` at the
* top of the class `static {}` block (before the decorator factory runs), so if the symbol is not
* yet installed the metadata object is `void 0` and every metadata-based decorator throws.
*
* It is intentionally an exported `const` initialized from a function call: bundlers that treat this
* module as side-effect-free may drop bare top-level calls, but they cannot drop a `const` whose
* value is referenced by the retained decorator helpers below. The tree-shaking side-effect detector
* likewise skips `const X = ...` initializers, so this module stays classified as pure and remains
* importable from `.pure` modules.
* @internal
*/
var MetadataSymbol = GetMetadataSymbol();
function GetConstructor(target) {
	return typeof target === "function" ? target : target?.constructor;
}
/**
* Returns (creating if necessary) the serialization store owned by the provided decorator metadata.
* Used by the TC39 decorators, which receive `context.metadata` directly.
* @internal
*/
function GetDirectStoreFromMetadata(metadata) {
	if (!metadata) throw new Error(`Decorator metadata is unavailable; the Symbol.metadata (${String(MetadataSymbol)}) polyfill must run before decorated classes are evaluated.`);
	if (!HasOwn(metadata, __bjsSerializableKey)) metadata[__bjsSerializableKey] = {};
	return metadata[__bjsSerializableKey];
}
/**
* @returns the list of properties flagged as serializable
* @param target host object
*/
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
//#endregion
//#region node_modules/@babylonjs/core/Misc/decorators.js
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
/**
* Shared implementation for the {@link nativeOverride} decorator and its `.filter` variant.
* Both flavors install a wrapper that, on first invocation, resolves the function to use once:
* either the original JS function or (when running in a Babylon Native context) a native-aware
* function produced by `resolveNative`. The resolved function then replaces the wrapper on the
* target so subsequent calls skip this setup entirely.
* @param originalMethod - The decorated JS method.
* @param context - The TC39 method decorator context.
* @param resolveNative - Builds the function to use when a native override is present, given the
* native function and the original JS function.
* @returns The wrapper function that replaces the decorated method.
*/
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
/**
* Decorator used to redirect a function to a native implementation if available.
* @internal
*/
function nativeOverride(originalMethod, context) {
	return ApplyNativeOverride(originalMethod, context, (nativeFunc) => nativeFunc);
}
/**
* Decorator factory that applies the nativeOverride decorator, but determines whether to redirect to the native implementation based on a filter function that evaluates the function arguments.
* @param predicate
* @example @nativeOverride.filter((arg1: string) => arg1.length > 20)
*          public someMethod(arg1: string, arg2: number): string {
* @internal
*/
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
//#endregion
//#region node_modules/@babylonjs/core/Misc/decorators.serialization.js
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
/**
* Class used to help serialization objects
*/
var SerializationHelper = class SerializationHelper {
	/**
	* Appends the serialized animations from the source animations
	* @param source Source containing the animations
	* @param destination Target to store the animations
	*/
	static AppendSerializedAnimations(source, destination) {
		if (source.animations) {
			destination.animations = [];
			for (let animationIndex = 0; animationIndex < source.animations.length; animationIndex++) {
				const animation = source.animations[animationIndex];
				destination.animations.push(animation.serialize());
			}
		}
	}
	/**
	* Static function used to serialized a specific entity
	* @param entity defines the entity to serialize
	* @param serializationObject defines the optional target object where serialization data will be stored
	* @returns a JSON compatible object representing the serialization of the entity
	*/
	static Serialize(entity, serializationObject) {
		if (!serializationObject) serializationObject = {};
		if (Tags) serializationObject.tags = Tags.GetTags(entity);
		const serializedProperties = GetMergedStore(entity);
		for (const property in serializedProperties) {
			const propertyDescriptor = serializedProperties[property];
			const targetPropertyName = propertyDescriptor.sourceName || property;
			const propertyType = propertyDescriptor.type;
			const sourceProperty = entity[property];
			if (sourceProperty !== void 0 && sourceProperty !== null && (property !== "uniqueId" || SerializationHelper.AllowLoadingUniqueId)) switch (propertyType) {
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
	/**
	* Given a source json and a destination object in a scene, this function will parse the source and will try to apply its content to the destination object
	* @param source the source json data
	* @param destination the destination object
	* @param scene the scene where the object is
	* @param rootUrl root url to use to load assets
	*/
	static ParseProperties(source, destination, scene, rootUrl) {
		if (!rootUrl) rootUrl = "";
		const classStore = GetMergedStore(destination);
		for (const property in classStore) {
			const propertyDescriptor = classStore[property];
			const sourceProperty = source[propertyDescriptor.sourceName || property];
			const propertyType = propertyDescriptor.type;
			if (sourceProperty !== void 0 && sourceProperty !== null && (property !== "uniqueId" || SerializationHelper.AllowLoadingUniqueId)) {
				const dest = destination;
				switch (propertyType) {
					case 0:
						dest[property] = sourceProperty;
						break;
					case 1:
						if (scene) dest[property] = SerializationHelper._TextureParser(sourceProperty, scene, rootUrl);
						break;
					case 2:
						dest[property] = Color3.FromArray(sourceProperty);
						break;
					case 3:
						dest[property] = SerializationHelper._FresnelParametersParser(sourceProperty);
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
						dest[property] = SerializationHelper._ColorCurvesParser(sourceProperty);
						break;
					case 8:
						dest[property] = Color4.FromArray(sourceProperty);
						break;
					case 9:
						dest[property] = SerializationHelper._ImageProcessingConfigurationParser(sourceProperty);
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
	/**
	* Creates a new entity from a serialization data object
	* @param creationFunction defines a function used to instanciated the new entity
	* @param source defines the source serialization data
	* @param scene defines the hosting scene
	* @param rootUrl defines the root url for resources
	* @returns a new entity
	*/
	static Parse(creationFunction, source, scene, rootUrl = null) {
		const destination = creationFunction();
		if (Tags) Tags.AddTagsTo(destination, source.tags);
		SerializationHelper.ParseProperties(source, destination, scene, rootUrl);
		return destination;
	}
	/**
	* Clones an object
	* @param creationFunction defines the function used to instanciate the new object
	* @param source defines the source object
	* @param options defines the options to use
	* @returns the cloned object
	*/
	static Clone(creationFunction, source, options = {}) {
		return CopySource(creationFunction, source, false, options);
	}
	/**
	* Instanciates a new object based on a source one (some data will be shared between both object)
	* @param creationFunction defines the function used to instanciate the new object
	* @param source defines the source object
	* @returns the new object
	*/
	static Instanciate(creationFunction, source) {
		return CopySource(creationFunction, source, true);
	}
};
/**
* Gets or sets a boolean to indicate if the UniqueId property should be serialized
*/
SerializationHelper.AllowLoadingUniqueId = false;
/**
* @internal
*/
SerializationHelper._ImageProcessingConfigurationParser = (sourceProperty) => {
	throw _WarnImport("ImageProcessingConfiguration");
};
/**
* @internal
*/
SerializationHelper._FresnelParametersParser = (sourceProperty) => {
	throw _WarnImport("FresnelParameters");
};
/**
* @internal
*/
SerializationHelper._ColorCurvesParser = (sourceProperty) => {
	throw _WarnImport("ColorCurves");
};
/**
* @internal
*/
SerializationHelper._TextureParser = (sourceProperty, scene, rootUrl) => {
	throw _WarnImport("Texture");
};
//#endregion
//#region node_modules/@babylonjs/core/Maths/math.size.js
/**
* Size containing width and height
*/
var Size = class Size {
	/**
	* Creates a Size object from the given width and height (floats).
	* @param width width of the new size
	* @param height height of the new size
	*/
	constructor(width, height) {
		this.width = width;
		this.height = height;
	}
	/**
	* Returns a string with the Size width and height
	* @returns a string with the Size width and height
	*/
	toString() {
		return `{W: ${this.width}, H: ${this.height}}`;
	}
	/**
	* "Size"
	* @returns the string "Size"
	*/
	getClassName() {
		return "Size";
	}
	/**
	* Returns the Size hash code.
	* @returns a hash code for a unique width and height
	*/
	getHashCode() {
		let hash = this.width | 0;
		hash = hash * 397 ^ (this.height | 0);
		return hash;
	}
	/**
	* Updates the current size from the given one.
	* @param src the given size
	*/
	copyFrom(src) {
		this.width = src.width;
		this.height = src.height;
	}
	/**
	* Updates in place the current Size from the given floats.
	* @param width width of the new size
	* @param height height of the new size
	* @returns the updated Size.
	*/
	copyFromFloats(width, height) {
		this.width = width;
		this.height = height;
		return this;
	}
	/**
	* Updates in place the current Size from the given floats.
	* @param width width to set
	* @param height height to set
	* @returns the updated Size.
	*/
	set(width, height) {
		return this.copyFromFloats(width, height);
	}
	/**
	* Multiplies the width and height by numbers
	* @param w factor to multiple the width by
	* @param h factor to multiple the height by
	* @returns a new Size set with the multiplication result of the current Size and the given floats.
	*/
	multiplyByFloats(w, h) {
		return new Size(this.width * w, this.height * h);
	}
	/**
	* Clones the size
	* @returns a new Size copied from the given one.
	*/
	clone() {
		return new Size(this.width, this.height);
	}
	/**
	* True if the current Size and the given one width and height are strictly equal.
	* @param other the other size to compare against
	* @returns True if the current Size and the given one width and height are strictly equal.
	*/
	equals(other) {
		if (!other) return false;
		return this.width === other.width && this.height === other.height;
	}
	/**
	* The surface of the Size : width * height (float).
	*/
	get surface() {
		return this.width * this.height;
	}
	/**
	* Create a new size of zero
	* @returns a new Size set to (0.0, 0.0)
	*/
	static Zero() {
		return new Size(0, 0);
	}
	/**
	* Sums the width and height of two sizes
	* @param otherSize size to add to this size
	* @returns a new Size set as the addition result of the current Size and the given one.
	*/
	add(otherSize) {
		return new Size(this.width + otherSize.width, this.height + otherSize.height);
	}
	/**
	* Subtracts the width and height of two
	* @param otherSize size to subtract to this size
	* @returns a new Size set as the subtraction result of  the given one from the current Size.
	*/
	subtract(otherSize) {
		return new Size(this.width - otherSize.width, this.height - otherSize.height);
	}
	/**
	* Scales the width and height
	* @param scale the scale to multiply the width and height by
	* @returns a new Size set with the multiplication result of the current Size and the given floats.
	*/
	scale(scale) {
		return new Size(this.width * scale, this.height * scale);
	}
	/**
	* Creates a new Size set at the linear interpolation "amount" between "start" and "end"
	* @param start starting size to lerp between
	* @param end end size to lerp between
	* @param amount amount to lerp between the start and end values
	* @returns a new Size set at the linear interpolation "amount" between "start" and "end"
	*/
	static Lerp(start, end, amount) {
		const w = start.width + (end.width - start.width) * amount;
		const h = start.height + (end.height - start.height) * amount;
		return new Size(w, h);
	}
};
//#endregion
//#region node_modules/@babylonjs/core/Materials/Textures/thinTexture.js
/**
* Base class of all the textures in babylon.
* It groups all the common properties required to work with Thin Engine.
*/
var ThinTexture = class ThinTexture {
	/**
	* | Value | Type               | Description |
	* | ----- | ------------------ | ----------- |
	* | 0     | CLAMP_ADDRESSMODE  |             |
	* | 1     | WRAP_ADDRESSMODE   |             |
	* | 2     | MIRROR_ADDRESSMODE |             |
	*/
	get wrapU() {
		return this._wrapU;
	}
	set wrapU(value) {
		this._wrapU = value;
	}
	/**
	* | Value | Type               | Description |
	* | ----- | ------------------ | ----------- |
	* | 0     | CLAMP_ADDRESSMODE  |             |
	* | 1     | WRAP_ADDRESSMODE   |             |
	* | 2     | MIRROR_ADDRESSMODE |             |
	*/
	get wrapV() {
		return this._wrapV;
	}
	set wrapV(value) {
		this._wrapV = value;
	}
	/**
	* How a texture is mapped.
	* Unused in thin texture mode.
	*/
	get coordinatesMode() {
		return 0;
	}
	/**
	* Define if the texture is a cube texture or if false a 2d texture.
	*/
	get isCube() {
		if (!this._texture) return false;
		return this._texture.isCube;
	}
	set isCube(value) {
		if (!this._texture) return;
		this._texture.isCube = value;
	}
	/**
	* Define if the texture is a 3d texture (webgl 2) or if false a 2d texture.
	*/
	get is3D() {
		if (!this._texture) return false;
		return this._texture.is3D;
	}
	set is3D(value) {
		if (!this._texture) return;
		this._texture.is3D = value;
	}
	/**
	* Define if the texture is a 2d array texture (webgl 2) or if false a 2d texture.
	*/
	get is2DArray() {
		if (!this._texture) return false;
		return this._texture.is2DArray;
	}
	set is2DArray(value) {
		if (!this._texture) return;
		this._texture.is2DArray = value;
	}
	/**
	* Get the class name of the texture.
	* @returns "ThinTexture"
	*/
	getClassName() {
		return "ThinTexture";
	}
	static _IsRenderTargetWrapper(texture) {
		return texture?.shareDepth !== void 0;
	}
	/**
	* Instantiates a new ThinTexture.
	* Base class of all the textures in babylon.
	* This can be used as an internal texture wrapper in AbstractEngine to benefit from the cache
	* @param internalTexture Define the internalTexture to wrap. You can also pass a RenderTargetWrapper, in which case the texture will be the render target's texture
	*/
	constructor(internalTexture) {
		this._wrapU = 1;
		this._wrapV = 1;
		/**
		* | Value | Type               | Description |
		* | ----- | ------------------ | ----------- |
		* | 0     | CLAMP_ADDRESSMODE  |             |
		* | 1     | WRAP_ADDRESSMODE   |             |
		* | 2     | MIRROR_ADDRESSMODE |             |
		*/
		this.wrapR = 1;
		/**
		* With compliant hardware and browser (supporting anisotropic filtering)
		* this defines the level of anisotropic filtering in the texture.
		* The higher the better but the slower. This defaults to 4 as it seems to be the best tradeoff.
		*/
		this.anisotropicFilteringLevel = 4;
		/**
		* Define the current state of the loading sequence when in delayed load mode.
		*/
		this.delayLoadState = 0;
		/** @internal */
		this._texture = null;
		this._engine = null;
		this._cachedSize = Size.Zero();
		this._cachedBaseSize = Size.Zero();
		/** @internal */
		this._initialSamplingMode = 2;
		this._texture = ThinTexture._IsRenderTargetWrapper(internalTexture) ? internalTexture.texture : internalTexture;
		if (this._texture) {
			this._engine = this._texture.getEngine();
			this.wrapU = this._texture._cachedWrapU ?? this.wrapU;
			this.wrapV = this._texture._cachedWrapV ?? this.wrapV;
			this.wrapR = this._texture._cachedWrapR ?? this.wrapR;
		}
	}
	/**
	* Get if the texture is ready to be used (downloaded, converted, mip mapped...).
	* @returns true if fully ready
	*/
	isReady() {
		if (this.delayLoadState === 4) {
			this.delayLoad();
			return false;
		}
		if (this._texture) return this._texture.isReady;
		return false;
	}
	/**
	* Triggers the load sequence in delayed load mode.
	*/
	delayLoad() {}
	/**
	* Get the underlying lower level texture from Babylon.
	* @returns the internal texture
	*/
	getInternalTexture() {
		return this._texture;
	}
	/**
	* Get the size of the texture.
	* @returns the texture size.
	*/
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
	/**
	* Get the base size of the texture.
	* It can be different from the size if the texture has been resized for POT for instance
	* @returns the base size
	*/
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
	/**
	* Get the current sampling mode associated with the texture.
	*/
	get samplingMode() {
		if (!this._texture) return this._initialSamplingMode;
		return this._texture.samplingMode;
	}
	/**
	* Update the sampling mode of the texture.
	* Default is Trilinear mode.
	*
	* | Value | Type               | Description |
	* | ----- | ------------------ | ----------- |
	* | 1     | NEAREST_SAMPLINGMODE or NEAREST_NEAREST_MIPLINEAR  | Nearest is: mag = nearest, min = nearest, mip = linear |
	* | 2     | BILINEAR_SAMPLINGMODE or LINEAR_LINEAR_MIPNEAREST | Bilinear is: mag = linear, min = linear, mip = nearest |
	* | 3     | TRILINEAR_SAMPLINGMODE or LINEAR_LINEAR_MIPLINEAR | Trilinear is: mag = linear, min = linear, mip = linear |
	* | 4     | NEAREST_NEAREST_MIPNEAREST |             |
	* | 5    | NEAREST_LINEAR_MIPNEAREST |             |
	* | 6    | NEAREST_LINEAR_MIPLINEAR |             |
	* | 7    | NEAREST_LINEAR |             |
	* | 8    | NEAREST_NEAREST |             |
	* | 9   | LINEAR_NEAREST_MIPNEAREST |             |
	* | 10   | LINEAR_NEAREST_MIPLINEAR |             |
	* | 11   | LINEAR_LINEAR |             |
	* | 12   | LINEAR_NEAREST |             |
	*
	*    > _mag_: magnification filter (close to the viewer)
	*    > _min_: minification filter (far from the viewer)
	*    > _mip_: filter used between mip map levels
	*@param samplingMode Define the new sampling mode of the texture
	*@param generateMipMaps Define if the texture should generate mip maps or not. Default is false.
	*/
	updateSamplingMode(samplingMode, generateMipMaps = false) {
		if (this._texture && this._engine) this._engine.updateTextureSamplingMode(samplingMode, this._texture, this._texture.generateMipMaps && generateMipMaps);
	}
	/**
	* Release and destroy the underlying lower level texture aka internalTexture.
	*/
	releaseInternalTexture() {
		if (this._texture) {
			this._texture.dispose();
			this._texture = null;
		}
	}
	/**
	* Dispose the texture and release its associated resources.
	*/
	dispose() {
		if (this._texture) {
			this.releaseInternalTexture();
			this._engine = null;
		}
	}
};
//#endregion
//#region node_modules/@babylonjs/core/Materials/Textures/baseTexture.pure.js
/** This file must only contain pure code and pure imports */
var _a;
/**
* Base class of all the textures in babylon.
* It groups all the common properties the materials, post process, lights... might need
* in order to make a correct use of the texture.
*/
var BaseTexture = (() => {
	var _a;
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
	return _a = class BaseTexture extends _classSuper {
		/**
		* Define if the texture is having a usable alpha value (can be use for transparency or glossiness for instance).
		*/
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
		/**
		* Defines if the alpha value should be determined via the rgb values.
		* If true the luminance of the pixel might be used to find the corresponding alpha value.
		*/
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
		/**
		* Define the UV channel to use starting from 0 and defaulting to 0.
		* This is part of the texture as textures usually maps to one uv set.
		*/
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
		/**
		* How a texture is mapped.
		*
		* | Value | Type                                | Description |
		* | ----- | ----------------------------------- | ----------- |
		* | 0     | EXPLICIT_MODE                       |             |
		* | 1     | SPHERICAL_MODE                      |             |
		* | 2     | PLANAR_MODE                         |             |
		* | 3     | CUBIC_MODE                          |             |
		* | 4     | PROJECTION_MODE                     |             |
		* | 5     | SKYBOX_MODE                         |             |
		* | 6     | INVCUBIC_MODE                       |             |
		* | 7     | EQUIRECTANGULAR_MODE                |             |
		* | 8     | FIXED_EQUIRECTANGULAR_MODE          |             |
		* | 9     | FIXED_EQUIRECTANGULAR_MIRRORED_MODE |             |
		*/
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
		/**
		* | Value | Type               | Description |
		* | ----- | ------------------ | ----------- |
		* | 0     | CLAMP_ADDRESSMODE  |             |
		* | 1     | WRAP_ADDRESSMODE   |             |
		* | 2     | MIRROR_ADDRESSMODE |             |
		*/
		get wrapU() {
			return this._wrapU;
		}
		set wrapU(value) {
			this._wrapU = value;
		}
		/**
		* | Value | Type               | Description |
		* | ----- | ------------------ | ----------- |
		* | 0     | CLAMP_ADDRESSMODE  |             |
		* | 1     | WRAP_ADDRESSMODE   |             |
		* | 2     | MIRROR_ADDRESSMODE |             |
		*/
		get wrapV() {
			return this._wrapV;
		}
		set wrapV(value) {
			this._wrapV = value;
		}
		/**
		* Define if the texture is a cube texture or if false a 2d texture.
		*/
		get isCube() {
			if (!this._texture) return this._isCube;
			return this._texture.isCube;
		}
		set isCube(value) {
			if (!this._texture) this._isCube = value;
			else this._texture.isCube = value;
		}
		/**
		* Define if the texture is a 3d texture (webgl 2) or if false a 2d texture.
		*/
		get is3D() {
			if (!this._texture) return false;
			return this._texture.is3D;
		}
		set is3D(value) {
			if (!this._texture) return;
			this._texture.is3D = value;
		}
		/**
		* Define if the texture is a 2d array texture (webgl 2) or if false a 2d texture.
		*/
		get is2DArray() {
			if (!this._texture) return false;
			return this._texture.is2DArray;
		}
		set is2DArray(value) {
			if (!this._texture) return;
			this._texture.is2DArray = value;
		}
		/**
		* Define if the texture contains data in gamma space (most of the png/jpg aside bump).
		* HDR texture are usually stored in linear space.
		* This only impacts the PBR and Background materials
		*/
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
		/**
		* Gets or sets whether or not the texture contains RGBD data.
		*/
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
		/**
		* Are mip maps generated for this texture or not.
		*/
		get noMipmap() {
			return false;
		}
		/**
		* With prefiltered texture, defined the offset used during the prefiltering steps.
		*/
		get lodGenerationOffset() {
			if (this._texture) return this._texture._lodGenerationOffset;
			return 0;
		}
		set lodGenerationOffset(value) {
			if (this._texture) this._texture._lodGenerationOffset = value;
		}
		/**
		* With prefiltered texture, defined the scale used during the prefiltering steps.
		*/
		get lodGenerationScale() {
			if (this._texture) return this._texture._lodGenerationScale;
			return 0;
		}
		set lodGenerationScale(value) {
			if (this._texture) this._texture._lodGenerationScale = value;
		}
		/**
		* With prefiltered texture, defined if the specular generation is based on a linear ramp.
		* By default we are using a log2 of the linear roughness helping to keep a better resolution for
		* average roughness values.
		*/
		get linearSpecularLOD() {
			if (this._texture) return this._texture._linearSpecularLOD;
			return false;
		}
		set linearSpecularLOD(value) {
			if (this._texture) this._texture._linearSpecularLOD = value;
		}
		/**
		* In case a better definition than spherical harmonics is required for the diffuse part of the environment.
		* You can set the irradiance texture to rely on a texture instead of the spherical approach.
		* This texture need to have the same characteristics than its parent (Cube vs 2d, coordinates mode, Gamma/Linear, RGBD).
		*/
		get irradianceTexture() {
			if (this._texture) return this._texture._irradianceTexture;
			return null;
		}
		set irradianceTexture(value) {
			if (this._texture) this._texture._irradianceTexture = value;
		}
		/**
		* Define the unique id of the texture in the scene.
		*/
		get uid() {
			if (!this._uid) this._uid = RandomGUID();
			return this._uid;
		}
		/**
		* Return a string representation of the texture.
		* @returns the texture as a string
		*/
		toString() {
			return this.name;
		}
		/**
		* Get the class name of the texture.
		* @returns "BaseTexture"
		*/
		getClassName() {
			return "BaseTexture";
		}
		/**
		* Callback triggered when the texture has been disposed.
		* Kept for back compatibility, you can use the onDisposeObservable instead.
		*/
		set onDispose(callback) {
			if (this._onDisposeObserver) this.onDisposeObservable.remove(this._onDisposeObserver);
			this._onDisposeObserver = this.onDisposeObservable.add(callback);
		}
		/**
		* Define if the texture is preventing a material to render or not.
		* If not and the texture is not ready, the engine will use a default black texture instead.
		*/
		get isBlocking() {
			return true;
		}
		/**
		* Was there any loading error?
		*/
		get loadingError() {
			return this._loadingError;
		}
		/**
		* If a loading error occurred this object will be populated with information about the error.
		*/
		get errorObject() {
			return this._errorObject;
		}
		/**
		* Instantiates a new BaseTexture.
		* Base class of all the textures in babylon.
		* It groups all the common properties the materials, post process, lights... might need
		* in order to make a correct use of the texture.
		* @param sceneOrEngine Define the scene or engine the texture belongs to
		* @param internalTexture Define the internal texture associated with the texture
		*/
		constructor(sceneOrEngine, internalTexture = null) {
			super(null);
			/**
			* Gets or sets the unique id of the texture
			*/
			this.uniqueId = (__runInitializers(this, _instanceExtraInitializers), __runInitializers(this, _uniqueId_initializers, void 0));
			/**
			* Define the name of the texture.
			*/
			this.name = (__runInitializers(this, _uniqueId_extraInitializers), __runInitializers(this, _name_initializers, void 0));
			/**
			* Define the display name of the texture, which is used as tree item name of the dedicated node in the inspector
			*/
			this.displayName = (__runInitializers(this, _name_extraInitializers), __runInitializers(this, _displayName_initializers, void 0));
			/**
			* Gets or sets an object used to store user defined information.
			*/
			this.metadata = (__runInitializers(this, _displayName_extraInitializers), __runInitializers(this, _metadata_initializers, null));
			/** @internal */
			this._internalMetadata = __runInitializers(this, _metadata_extraInitializers);
			/**
			* For internal use only. Please do not use.
			*/
			this.reservedDataStore = null;
			this._hasAlpha = __runInitializers(this, __hasAlpha_initializers, false);
			this._getAlphaFromRGB = (__runInitializers(this, __hasAlpha_extraInitializers), __runInitializers(this, __getAlphaFromRGB_initializers, false));
			/**
			* Intensity or strength of the texture.
			* It is commonly used by materials to fine tune the intensity of the texture
			*/
			this.level = (__runInitializers(this, __getAlphaFromRGB_extraInitializers), __runInitializers(this, _level_initializers, 1));
			this._coordinatesIndex = (__runInitializers(this, _level_extraInitializers), __runInitializers(this, __coordinatesIndex_initializers, 0));
			/**
			* Gets or sets a boolean indicating that the texture should try to reduce shader code if there is no UV manipulation.
			* (ie. when texture.getTextureMatrix().isIdentityAs3x2() returns true)
			*/
			this.optimizeUVAllocation = (__runInitializers(this, __coordinatesIndex_extraInitializers), __runInitializers(this, _optimizeUVAllocation_initializers, true));
			this._coordinatesMode = (__runInitializers(this, _optimizeUVAllocation_extraInitializers), __runInitializers(this, __coordinatesMode_initializers, 0));
			/**
			* | Value | Type               | Description |
			* | ----- | ------------------ | ----------- |
			* | 0     | CLAMP_ADDRESSMODE  |             |
			* | 1     | WRAP_ADDRESSMODE   |             |
			* | 2     | MIRROR_ADDRESSMODE |             |
			*/
			this.wrapR = (__runInitializers(this, __coordinatesMode_extraInitializers), __runInitializers(this, _wrapR_initializers, 1));
			/**
			* With compliant hardware and browser (supporting anisotropic filtering)
			* this defines the level of anisotropic filtering in the texture.
			* The higher the better but the slower. This defaults to 4 as it seems to be the best tradeoff.
			*/
			this.anisotropicFilteringLevel = (__runInitializers(this, _wrapR_extraInitializers), __runInitializers(this, _anisotropicFilteringLevel_initializers, _a.DEFAULT_ANISOTROPIC_FILTERING_LEVEL));
			/** @internal */
			this._isCube = (__runInitializers(this, _anisotropicFilteringLevel_extraInitializers), false);
			/** @internal */
			this._gammaSpace = true;
			/**
			* Is Z inverted in the texture (useful in a cube texture).
			*/
			this.invertZ = __runInitializers(this, _invertZ_initializers, false);
			/**
			* @internal
			*/
			this.lodLevelInAlpha = (__runInitializers(this, _invertZ_extraInitializers), __runInitializers(this, _lodLevelInAlpha_initializers, false));
			/**
			* Indicates the average direction of light in an environment map. This
			* can be treated as the most dominant direction but it's magnitude also
			* tells you something about how dominant that direction is.
			*/
			/** @internal */
			this._dominantDirection = (__runInitializers(this, _lodLevelInAlpha_extraInitializers), null);
			/**
			* Define if the texture is a render target.
			*/
			this.isRenderTarget = __runInitializers(this, _isRenderTarget_initializers, false);
			/** @internal */
			this._prefiltered = (__runInitializers(this, _isRenderTarget_extraInitializers), false);
			/** @internal */
			this._forceSerialize = false;
			/**
			* Define the list of animation attached to the texture.
			*/
			this.animations = [];
			/**
			* An event triggered when the texture is disposed.
			*/
			this.onDisposeObservable = new Observable();
			this._onDisposeObserver = null;
			this._scene = null;
			/** @internal */
			this._uid = null;
			/** @internal */
			this._parentContainer = null;
			this._loadingError = false;
			if (sceneOrEngine) if (_a._IsScene(sceneOrEngine)) this._scene = sceneOrEngine;
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
		/**
		* Get the scene the texture belongs to.
		* @returns the scene or null if undefined
		*/
		getScene() {
			return this._scene;
		}
		/** @internal */
		_getEngine() {
			return this._engine;
		}
		/**
		* Get the texture transform matrix used to offset tile the texture for instance.
		* @returns the transformation matrix
		*/
		getTextureMatrix() {
			return Matrix.IdentityReadOnly;
		}
		/**
		* Get the texture reflection matrix used to rotate/transform the reflection.
		* @returns the reflection matrix
		*/
		getReflectionTextureMatrix() {
			return Matrix.IdentityReadOnly;
		}
		/**
		* Gets a suitable rotate/transform matrix when the texture is used for refraction.
		* There's a separate function from getReflectionTextureMatrix because refraction requires a special configuration of the matrix in right-handed mode.
		* @returns The refraction matrix
		*/
		getRefractionTextureMatrix() {
			return this.getReflectionTextureMatrix();
		}
		/**
		* Get if the texture is ready to be consumed (either it is ready or it is not blocking)
		* @returns true if ready, not blocking or if there was an error loading the texture
		*/
		isReadyOrNotBlocking() {
			return !this.isBlocking || this.isReady() || this.loadingError;
		}
		/**
		* Scales the texture if is `canRescale()`
		* @param ratio the resize factor we want to use to rescale
		*/
		scale(ratio) {}
		/**
		* Get if the texture can rescale.
		*/
		get canRescale() {
			return false;
		}
		/**
		* @internal
		*/
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
		/** @internal */
		_rebuild(_fromContextLost = false) {}
		/**
		* Clones the texture.
		* @returns the cloned texture
		*/
		clone() {
			return null;
		}
		/**
		* Get the texture underlying type (INT, FLOAT...)
		*/
		get textureType() {
			if (!this._texture) return 0;
			return this._texture.type !== void 0 ? this._texture.type : 0;
		}
		/**
		* Get the texture underlying format (RGB, RGBA...)
		*/
		get textureFormat() {
			if (!this._texture) return 5;
			return this._texture.format !== void 0 ? this._texture.format : 5;
		}
		/**
		* Indicates that textures need to be re-calculated for all materials
		*/
		_markAllSubMeshesAsTexturesDirty() {
			const scene = this.getScene();
			if (!scene) return;
			scene.markAllMaterialsAsDirty(1);
		}
		/**
		* Reads the pixels stored in the webgl texture and returns them as an ArrayBuffer.
		* This will returns an RGBA array buffer containing either in values (0-255) or
		* float values (0-1) depending of the underlying buffer type.
		* Note that you can use {@link GetTextureDataAsync} instead, which will also support reading from a compressed texture (by rendering it to an intermediate RGBA texture and retrieving the bytes from it).
		* @param faceIndex defines the face of the texture to read (in case of cube texture)
		* @param level defines the LOD level of the texture to read (in case of Mip Maps)
		* @param buffer defines a user defined buffer to fill with data (can be null)
		* @param flushRenderer true to flush the renderer from the pending commands before reading the pixels
		* @param noDataConversion false to convert the data to Uint8Array (if texture type is UNSIGNED_BYTE) or to Float32Array (if texture type is anything but UNSIGNED_BYTE). If true, the type of the generated buffer (if buffer==null) will depend on the type of the texture
		* @param x defines the region x coordinates to start reading from (default to 0)
		* @param y defines the region y coordinates to start reading from (default to 0)
		* @param width defines the region width to read from (default to the texture size at level)
		* @param height defines the region width to read from (default to the texture size at level)
		* @returns The Array buffer promise containing the pixels data.
		*/
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
		/**
		* @internal
		*/
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
		/** @internal */
		get _lodTextureHigh() {
			if (this._texture) return this._texture._lodTextureHigh;
			return null;
		}
		/** @internal */
		get _lodTextureMid() {
			if (this._texture) return this._texture._lodTextureMid;
			return null;
		}
		/** @internal */
		get _lodTextureLow() {
			if (this._texture) return this._texture._lodTextureLow;
			return null;
		}
		/**
		* Dispose the texture and release its associated resources.
		*/
		dispose() {
			if (this._scene) {
				if (this._scene.stopAnimation) this._scene.stopAnimation(this);
				this._scene.removePendingData(this);
				const index = this._scene.textures.indexOf(this);
				if (index >= 0) this._scene.textures.splice(index, 1);
				this._scene.onTextureRemovedObservable.notifyObservers(this);
				this._scene = null;
				if (this._parentContainer) {
					const index = this._parentContainer.textures.indexOf(this);
					if (index > -1) this._parentContainer.textures.splice(index, 1);
					this._parentContainer = null;
				}
			}
			this.onDisposeObservable.notifyObservers(this);
			this.onDisposeObservable.clear();
			this.metadata = null;
			super.dispose();
		}
		/**
		* Serialize the texture into a JSON representation that can be parsed later on.
		* @param allowEmptyName True to force serialization even if name is empty. Default: false
		* @returns the JSON representation of the texture
		*/
		serialize(allowEmptyName = false) {
			if (!this.name && !allowEmptyName) return null;
			const serializationObject = SerializationHelper.Serialize(this);
			SerializationHelper.AppendSerializedAnimations(this, serializationObject);
			return serializationObject;
		}
		/**
		* Helper function to be called back once a list of texture contains only ready textures.
		* @param textures Define the list of textures to wait for
		* @param callback Define the callback triggered once the entire list will be ready
		*/
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
		__esDecorate(_a, null, _get_wrapU_decorators, {
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
		__esDecorate(_a, null, _get_wrapV_decorators, {
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
		__esDecorate(_a, null, _get_isCube_decorators, {
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
		__esDecorate(_a, null, _get_is3D_decorators, {
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
		__esDecorate(_a, null, _get_is2DArray_decorators, {
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
		__esDecorate(_a, null, _get_gammaSpace_decorators, {
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
		__esDecorate(_a, null, _get_lodGenerationOffset_decorators, {
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
		__esDecorate(_a, null, _get_lodGenerationScale_decorators, {
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
		__esDecorate(_a, null, _get_linearSpecularLOD_decorators, {
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
		__esDecorate(_a, null, _get_irradianceTexture_decorators, {
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
		if (_metadata) Object.defineProperty(_a, Symbol.metadata, {
			enumerable: true,
			configurable: true,
			writable: true,
			value: _metadata
		});
	})(), _a.DEFAULT_ANISOTROPIC_FILTERING_LEVEL = 4, _a;
})();
(_a = BaseTexture.prototype).forceSphericalPolynomialsRecompute ?? (_a.forceSphericalPolynomialsRecompute = _MissingSideEffect("BaseTexture", "forceSphericalPolynomialsRecompute"));
if (!Object.getOwnPropertyDescriptor(BaseTexture.prototype, "sphericalPolynomial")) Object.defineProperty(BaseTexture.prototype, "sphericalPolynomial", _MissingSideEffectProperty("BaseTexture", "sphericalPolynomial"));
//#endregion
export { __esDecorate as _, serialize as a, serializeAsColorCurves as c, serializeAsQuaternion as d, serializeAsTexture as f, __classPrivateFieldSet as g, __classPrivateFieldGet as h, nativeOverride as i, serializeAsFresnelParameters as l, GetDirectStoreFromMetadata as m, SerializationHelper as n, serializeAsColor3 as o, serializeAsVector3 as p, expandToProperty as r, serializeAsColor4 as s, BaseTexture as t, serializeAsMeshReference as u, __runInitializers as v, Tags as y };
