import { o as EngineStore, s as Observable } from "./typeStore-Bi_ki0b5.js";
import { O as IsWindowObjectExist, c as TimingTools, h as EngineFunctionContext, i as GetBlobBufferSource, m as _FunctionContainer } from "./guid-DgALBCu_.js";
import { t as Logger } from "./logger-BcrUU1RW.js";
//#region node_modules/@babylonjs/core/Misc/webRequest.js
/** @internal */
function createXMLHttpRequest() {
	if (typeof _native !== "undefined" && _native.XMLHttpRequest) return new _native.XMLHttpRequest();
	else return new XMLHttpRequest();
}
/**
* Extended version of XMLHttpRequest with support for customizations (headers, ...)
*/
var WebRequest = class WebRequest {
	constructor() {
		this._xhr = createXMLHttpRequest();
		this._requestURL = "";
	}
	/**
	* This function can be called to check if there are request modifiers for network requests
	* @returns true if there are any custom requests available
	*/
	static get IsCustomRequestAvailable() {
		return Object.keys(WebRequest.CustomRequestHeaders).length > 0 || WebRequest.CustomRequestModifiers.length > 0;
	}
	static _CleanUrl(url) {
		url = url.replace("file:http:", "http:");
		url = url.replace("file:https:", "https:");
		return url;
	}
	static _ShouldSkipRequestModifications(url) {
		return WebRequest.SkipRequestModificationForBabylonCDN && (url.includes("preview.babylonjs.com") || url.includes("cdn.babylonjs.com"));
	}
	/**
	* Merges `CustomRequestHeaders` and `CustomRequestModifiers` into a plain headers record and returns the
	* (possibly rewritten) URL. Can be used to apply URL and header customizations without making a network
	* request (e.g. for streaming media where the download is handled by the browser natively).
	* @param url - The initial URL to modify.
	* @param baseHeaders - An optional set of headers to start with (e.g. from the caller's options) that modifiers can further modify.
	* @returns An object containing the final URL and the merged headers after applying all modifiers and header customizations.
	* @internal
	*/
	static _CollectCustomizations(url, baseHeaders = {}) {
		const headers = { ...baseHeaders };
		if (WebRequest._ShouldSkipRequestModifications(url)) return {
			url,
			headers
		};
		for (const key in WebRequest.CustomRequestHeaders) {
			const val = WebRequest.CustomRequestHeaders[key];
			if (val) headers[key] = val;
		}
		const xhrProxy = { setRequestHeader: (name, value) => {
			headers[name] = value;
		} };
		for (const modifier of WebRequest.CustomRequestModifiers) {
			if (WebRequest._ShouldSkipRequestModifications(url)) break;
			const newUrl = modifier(xhrProxy, url);
			if (typeof newUrl === "string") url = newUrl;
		}
		return {
			url,
			headers
		};
	}
	/**
	* Performs a network request using the Fetch API when available on the platform, falling back to XMLHttpRequest.
	* `WebRequest.CustomRequestHeaders` and `WebRequest.CustomRequestModifiers` are applied in both cases.
	*
	* For `CustomRequestModifiers`, a minimal proxy XHR is provided to each modifier so that calls to
	* `setRequestHeader` on it are captured and forwarded to the underlying request. The URL returned by a
	* modifier (if any) replaces the current URL before the next modifier runs.
	*
	* @param url - The URL to request.
	* @param options - Optional request options (method, headers, body).
	* @returns A Promise that resolves to a `Response`.
	*/
	static async FetchAsync(url, options = {}) {
		const method = options.method ?? "GET";
		if (typeof fetch !== "undefined") {
			const { url: resolvedUrl, headers } = WebRequest._CollectCustomizations(WebRequest._CleanUrl(url), options.headers ?? {});
			return await fetch(resolvedUrl, {
				method,
				headers,
				body: options.body ?? void 0
			});
		}
		return await new Promise((resolve, reject) => {
			const request = new WebRequest();
			request.responseType = "arraybuffer";
			request.addEventListener("readystatechange", () => {
				if (request.readyState === 4) if (request.status >= 200 && request.status < 300) {
					const responseHeaders = typeof Headers !== "undefined" ? new Headers() : void 0;
					const contentType = request.getResponseHeader("Content-Type");
					if (contentType && responseHeaders) responseHeaders.set("Content-Type", contentType);
					if (typeof Response !== "undefined") resolve(new Response(request.response, {
						status: request.status,
						statusText: request.statusText,
						headers: responseHeaders
					}));
					else resolve({
						ok: true,
						status: request.status,
						statusText: request.statusText,
						headers: { get: (name) => request.getResponseHeader(name) },
						arrayBuffer: async () => await Promise.resolve(request.response)
					});
				} else reject(/* @__PURE__ */ new Error(`HTTP ${request.status} loading '${request.requestURL}': ${request.statusText}`));
			});
			request.open(method, url, options.headers);
			request.send(options.body ?? null);
		});
	}
	/**
	* Returns the requested URL once open has been called
	*/
	get requestURL() {
		return this._requestURL;
	}
	/**
	* Gets or sets a function to be called when loading progress changes
	*/
	get onprogress() {
		return this._xhr.onprogress;
	}
	set onprogress(value) {
		this._xhr.onprogress = value;
	}
	/**
	* Returns client's state
	*/
	get readyState() {
		return this._xhr.readyState;
	}
	/**
	* Returns client's status
	*/
	get status() {
		return this._xhr.status;
	}
	/**
	* Returns client's status as a text
	*/
	get statusText() {
		return this._xhr.statusText;
	}
	/**
	* Returns client's response
	*/
	get response() {
		return this._xhr.response;
	}
	/**
	* Returns client's response url
	*/
	get responseURL() {
		return this._xhr.responseURL;
	}
	/**
	* Returns client's response as text
	*/
	get responseText() {
		return this._xhr.responseText;
	}
	/**
	* Gets or sets the expected response type
	*/
	get responseType() {
		return this._xhr.responseType;
	}
	set responseType(value) {
		this._xhr.responseType = value;
	}
	/**
	* Gets or sets the timeout value in milliseconds
	*/
	get timeout() {
		return this._xhr.timeout;
	}
	set timeout(value) {
		this._xhr.timeout = value;
	}
	addEventListener(type, listener, options) {
		this._xhr.addEventListener(type, listener, options);
	}
	removeEventListener(type, listener, options) {
		this._xhr.removeEventListener(type, listener, options);
	}
	/**
	* Cancels any network activity
	*/
	abort() {
		this._xhr.abort();
	}
	/**
	* Initiates the request. The optional argument provides the request body. The argument is ignored if request method is GET or HEAD
	* @param body defines an optional request body
	*/
	send(body) {
		this._xhr.send(body);
	}
	/**
	* Sets the request method, request URL
	* @param method defines the method to use (GET, POST, etc..)
	* @param url defines the url to connect with
	* @param baseHeaders optional headers to include as a base before applying CustomRequestHeaders and modifiers
	*/
	open(method, url, baseHeaders) {
		const { url: modifiedUrl, headers } = WebRequest._CollectCustomizations(url, baseHeaders);
		this._requestURL = WebRequest._CleanUrl(modifiedUrl);
		this._xhr.open(method, this._requestURL, true);
		for (const key in headers) this._xhr.setRequestHeader(key, headers[key]);
	}
	/**
	* Sets the value of a request header.
	* @param name The name of the header whose value is to be set
	* @param value The value to set as the body of the header
	*/
	setRequestHeader(name, value) {
		this._xhr.setRequestHeader(name, value);
	}
	/**
	* Get the string containing the text of a particular header's value.
	* @param name The name of the header
	* @returns The string containing the text of the given header name
	*/
	getResponseHeader(name) {
		return this._xhr.getResponseHeader(name);
	}
};
/**
* Custom HTTP Request Headers to be sent with XMLHttpRequests
* i.e. when loading files, where the server/service expects an Authorization header
*/
WebRequest.CustomRequestHeaders = {};
/**
* Add callback functions in this array to update all the requests before they get sent to the network
*/
WebRequest.CustomRequestModifiers = new Array();
/**
* If set to true, requests to Babylon.js CDN requests will not be modified
*/
WebRequest.SkipRequestModificationForBabylonCDN = true;
//#endregion
//#region node_modules/@babylonjs/core/Misc/filesInputStore.js
/**
* Class used to help managing file picking and drag'n'drop
* File Storage
*/
var FilesInputStore = class {};
/**
* List of files ready to be loaded
*/
FilesInputStore.FilesToLoad = {};
//#endregion
//#region node_modules/@babylonjs/core/Misc/retryStrategy.js
/**
* Class used to define a retry strategy when error happens while loading assets
*/
var RetryStrategy = class {
	/**
	* Function used to defines an exponential back off strategy
	* @param maxRetries defines the maximum number of retries (3 by default)
	* @param baseInterval defines the interval between retries
	* @returns the strategy function to use
	*/
	static ExponentialBackoff(maxRetries = 3, baseInterval = 500) {
		return (url, request, retryIndex) => {
			if (request.status !== 0 || retryIndex >= maxRetries || url.indexOf("file:") !== -1) return -1;
			return Math.pow(2, retryIndex) * baseInterval;
		};
	}
};
//#endregion
//#region node_modules/@babylonjs/core/Misc/error.js
/**
* Base error. Due to limitations of typedoc-check and missing documentation
* in lib.es5.d.ts, cannot extend Error directly for RuntimeError.
* @ignore
*/
var BaseError = class extends Error {};
BaseError._setPrototypeOf = Object.setPrototypeOf || ((o, proto) => {
	o.__proto__ = proto;
	return o;
});
/**
* Error codes for BaseError
*/
var ErrorCodes = {
	/** Invalid or empty mesh vertex positions. */
	MeshInvalidPositionsError: 0,
	/** Unsupported texture found. */
	UnsupportedTextureError: 1e3,
	/** Unexpected magic number found in GLTF file header. */
	GLTFLoaderUnexpectedMagicError: 2e3,
	/** SceneLoader generic error code. Ideally wraps the inner exception. */
	SceneLoaderError: 3e3,
	/** Load file error */
	LoadFileError: 4e3,
	/** Request file error */
	RequestFileError: 4001,
	/** Read file error */
	ReadFileError: 4002
};
/**
* Application runtime error
*/
var RuntimeError = class RuntimeError extends BaseError {
	/**
	* Creates a new RuntimeError
	* @param message defines the message of the error
	* @param errorCode the error code
	* @param innerError the error that caused the outer error
	*/
	constructor(message, errorCode, innerError) {
		super(message);
		this.errorCode = errorCode;
		this.innerError = innerError;
		this.name = "RuntimeError";
		BaseError._setPrototypeOf(this, RuntimeError.prototype);
	}
};
//#endregion
//#region node_modules/@babylonjs/core/Misc/stringTools.js
function JsEncodeArrayBufferToBase64(bytes) {
	const keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
	let output = "";
	let chr1, chr2, chr3, enc1, enc2, enc3, enc4;
	let i = 0;
	while (i < bytes.length) {
		chr1 = bytes[i++];
		chr2 = i < bytes.length ? bytes[i++] : NaN;
		chr3 = i < bytes.length ? bytes[i++] : NaN;
		enc1 = chr1 >> 2;
		enc2 = (chr1 & 3) << 4 | chr2 >> 4;
		enc3 = (chr2 & 15) << 2 | chr3 >> 6;
		enc4 = chr3 & 63;
		if (isNaN(chr2)) enc3 = enc4 = 64;
		else if (isNaN(chr3)) enc4 = 64;
		output += keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4);
	}
	return output;
}
function JsDecodeBase64ToBinary(base64Data) {
	const decodedString = DecodeBase64ToString(base64Data);
	const bufferLength = decodedString.length;
	const bufferView = new Uint8Array(new ArrayBuffer(bufferLength));
	for (let i = 0; i < bufferLength; i++) bufferView[i] = decodedString.charCodeAt(i);
	return bufferView.buffer;
}
/**
* Encode a buffer to a base64 string
* @param buffer defines the buffer to encode
* @returns the encoded string
*/
var EncodeArrayBufferToBase64 = (buffer) => {
	const bytes = ArrayBuffer.isView(buffer) ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) : new Uint8Array(buffer);
	return typeof bytes.toBase64 === "function" ? bytes.toBase64() : JsEncodeArrayBufferToBase64(bytes);
};
/**
* Converts a given base64 string as an ASCII encoded stream of data
* @param base64Data The base64 encoded string to decode
* @returns Decoded ASCII string
*/
var DecodeBase64ToString = (base64Data) => {
	return atob(base64Data);
};
/**
* Converts a given base64 string into an ArrayBuffer of raw byte data
* @param base64Data The base64 encoded string to decode
* @returns ArrayBuffer of byte data
*/
var DecodeBase64ToBinary = (base64Data) => {
	return typeof Uint8Array.fromBase64 === "function" ? Uint8Array.fromBase64(base64Data).buffer : JsDecodeBase64ToBinary(base64Data);
};
//#endregion
//#region node_modules/@babylonjs/core/Misc/fileTools.pure.js
/** This file must only contain pure code and pure imports */
var Base64DataUrlRegEx = /*#__PURE__*/ new RegExp(/^data:([^,]+\/[^,]+)?;base64,/i);
/** @ignore */
var LoadFileError = class LoadFileError extends RuntimeError {
	/**
	* Creates a new LoadFileError
	* @param message defines the message of the error
	* @param object defines the optional web request
	*/
	constructor(message, object) {
		super(message, ErrorCodes.LoadFileError);
		this.name = "LoadFileError";
		BaseError._setPrototypeOf(this, LoadFileError.prototype);
		if (object instanceof WebRequest) this.request = object;
		else this.file = object;
	}
};
/** @ignore */
var RequestFileError = class RequestFileError extends RuntimeError {
	/**
	* Creates a new LoadFileError
	* @param message defines the message of the error
	* @param request defines the optional web request
	*/
	constructor(message, request) {
		super(message, ErrorCodes.RequestFileError);
		this.request = request;
		this.name = "RequestFileError";
		BaseError._setPrototypeOf(this, RequestFileError.prototype);
	}
};
/** @ignore */
var ReadFileError = class ReadFileError extends RuntimeError {
	/**
	* Creates a new ReadFileError
	* @param message defines the message of the error
	* @param file defines the optional file
	*/
	constructor(message, file) {
		super(message, ErrorCodes.ReadFileError);
		this.file = file;
		this.name = "ReadFileError";
		BaseError._setPrototypeOf(this, ReadFileError.prototype);
	}
};
/**
* Removes unwanted characters from an url
* @param url defines the url to clean
* @returns the cleaned url
*/
var CleanUrl = (url) => {
	url = url.replace(/#/gm, "%23");
	return url;
};
/**
* @internal
*/
var FileToolsOptions = {
	/**
	* Gets or sets the retry strategy to apply when an error happens while loading an asset.
	* When defining this function, return the wait time before trying again or return -1 to
	* stop retrying and error out.
	*/
	DefaultRetryStrategy: RetryStrategy.ExponentialBackoff(),
	/**
	* Gets or sets the base URL to use to load assets
	*/
	BaseUrl: "",
	/**
	* Default behaviour for cors in the application.
	* It can be a string if the expected behavior is identical in the entire app.
	* Or a callback to be able to set it per url or on a group of them (in case of Video source for instance)
	*/
	CorsBehavior: "anonymous",
	/**
	* Gets or sets a function used to pre-process url before using them to load assets
	* @param url
	* @returns the processed url
	*/
	PreprocessUrl: (url) => url,
	/**
	* Gets or sets the base URL to use to load scripts
	* Used for both JS and WASM
	*/
	ScriptBaseUrl: "",
	/**
	* Gets or sets a function used to pre-process script url before using them to load.
	* Used for both JS and WASM
	* @param url defines the url to process
	* @returns the processed url
	*/
	ScriptPreprocessUrl: (url) => url,
	/**
	* Gets or sets a function used to clean the url before using it to load assets
	* @param url defines the url to clean
	* @returns the cleaned url
	*/
	CleanUrl
};
/**
* Sets the cors behavior on a dom element. This will add the required Tools.CorsBehavior to the element.
* @param url define the url we are trying
* @param element define the dom element where to configure the cors policy
* @internal
*/
var SetCorsBehavior = (url, element) => {
	if (url && url.indexOf("data:") === 0) return;
	if (FileToolsOptions.CorsBehavior) if (typeof FileToolsOptions.CorsBehavior === "string" || FileToolsOptions.CorsBehavior instanceof String) element.crossOrigin = FileToolsOptions.CorsBehavior;
	else {
		const result = FileToolsOptions.CorsBehavior(url);
		if (result) element.crossOrigin = result;
	}
};
/**
* Configuration used to load images
* @see https://playground.babylonjs.com/#DKMEZK#2
*/
var LoadImageConfiguration = { getRequiredSize: null };
/**
* Loads an image as an HTMLImageElement.
* @param input url string, ArrayBuffer, or Blob to load
* @param onLoad callback called when the image successfully loads
* @param onError callback called when the image fails to load
* @param offlineProvider offline provider for caching
* @param mimeType optional mime type
* @param imageBitmapOptions
* @param engine the engine instance to use
* @returns the HTMLImageElement of the loaded image
* @internal
*/
var LoadImage = (input, onLoad, onError, offlineProvider, mimeType = "", imageBitmapOptions, engine = EngineStore.LastCreatedEngine) => {
	if (typeof HTMLImageElement === "undefined" && !engine?._features.forceBitmapOverHTMLImageElement) {
		onError("LoadImage is only supported in web or BabylonNative environments.");
		return null;
	}
	let url;
	let usingObjectURL = false;
	if (input instanceof ArrayBuffer || ArrayBuffer.isView(input)) if (typeof Blob !== "undefined" && typeof URL !== "undefined") {
		let source;
		if (input instanceof ArrayBuffer) source = input;
		else source = GetBlobBufferSource(input);
		url = URL.createObjectURL(new Blob([source], { type: mimeType }));
		usingObjectURL = true;
	} else url = `data:${mimeType};base64,` + EncodeArrayBufferToBase64(input);
	else if (input instanceof Blob) {
		url = URL.createObjectURL(input);
		usingObjectURL = true;
	} else {
		url = FileToolsOptions.CleanUrl(input);
		url = FileToolsOptions.PreprocessUrl(url);
	}
	const onErrorHandler = (exception) => {
		if (onError) {
			const inputText = url || input.toString();
			onError(`Error while trying to load image: ${inputText.indexOf("http") === 0 || inputText.length <= 128 ? inputText : inputText.slice(0, 128) + "..."}`, exception);
		}
	};
	if (engine?._features.forceBitmapOverHTMLImageElement) {
		LoadFile(url, (data) => {
			engine.createImageBitmap(new Blob([data], { type: mimeType }), {
				premultiplyAlpha: "none",
				colorSpaceConversion: "none",
				...imageBitmapOptions
			}).then((imgBmp) => {
				onLoad(imgBmp);
				if (usingObjectURL) URL.revokeObjectURL(url);
			}).catch((reason) => {
				if (onError) onError("Error while trying to load image: " + input, reason);
			});
		}, void 0, offlineProvider || void 0, true, (request, exception) => {
			onErrorHandler(exception);
		});
		return null;
	}
	const img = new Image();
	if (LoadImageConfiguration.getRequiredSize) {
		const size = LoadImageConfiguration.getRequiredSize(input);
		if (size.width) img.width = size.width;
		if (size.height) img.height = size.height;
	}
	SetCorsBehavior(url, img);
	const handlersList = [];
	const loadHandlersList = () => {
		for (const handler of handlersList) handler.target.addEventListener(handler.name, handler.handler);
	};
	const unloadHandlersList = () => {
		for (const handler of handlersList) handler.target.removeEventListener(handler.name, handler.handler);
		handlersList.length = 0;
	};
	const loadHandler = () => {
		unloadHandlersList();
		onLoad(img);
		if (usingObjectURL && img.src) URL.revokeObjectURL(img.src);
	};
	const errorHandler = (err) => {
		unloadHandlersList();
		onErrorHandler(err);
		if (usingObjectURL && img.src) URL.revokeObjectURL(img.src);
	};
	const cspHandler = (err) => {
		if (err.blockedURI !== img.src || err.disposition === "report") return;
		unloadHandlersList();
		const cspException = /* @__PURE__ */ new Error(`CSP violation of policy ${err.effectiveDirective} ${err.blockedURI}. Current policy is ${err.originalPolicy}`);
		EngineStore.UseFallbackTexture = false;
		onErrorHandler(cspException);
		if (usingObjectURL && img.src) URL.revokeObjectURL(img.src);
		img.src = "";
	};
	handlersList.push({
		target: img,
		name: "load",
		handler: loadHandler
	});
	handlersList.push({
		target: img,
		name: "error",
		handler: errorHandler
	});
	handlersList.push({
		target: document,
		name: "securitypolicyviolation",
		handler: cspHandler
	});
	loadHandlersList();
	const fromBlob = url.substring(0, 5) === "blob:";
	const fromData = url.substring(0, 5) === "data:";
	const noOfflineSupport = () => {
		if (fromBlob || fromData || !WebRequest.IsCustomRequestAvailable) img.src = url;
		else LoadFile(url, (data, _, contentType) => {
			const blob = new Blob([data], { type: !mimeType && contentType ? contentType : mimeType });
			const url = URL.createObjectURL(blob);
			usingObjectURL = true;
			img.src = url;
		}, void 0, offlineProvider || void 0, true, (_request, exception) => {
			onErrorHandler(exception);
		});
	};
	const loadFromOfflineSupport = () => {
		if (offlineProvider) offlineProvider.loadImage(url, img);
	};
	if (!fromBlob && !fromData && offlineProvider && offlineProvider.enableTexturesOffline) offlineProvider.open(loadFromOfflineSupport, noOfflineSupport);
	else {
		if (url.indexOf("file:") !== -1) {
			const textureName = decodeURIComponent(url.substring(5).toLowerCase());
			if (FilesInputStore.FilesToLoad[textureName] && typeof URL !== "undefined") {
				try {
					let blobURL;
					try {
						blobURL = URL.createObjectURL(FilesInputStore.FilesToLoad[textureName]);
					} catch (ex) {
						blobURL = URL.createObjectURL(FilesInputStore.FilesToLoad[textureName]);
					}
					img.src = blobURL;
					usingObjectURL = true;
				} catch (e) {
					img.src = "";
				}
				return img;
			}
		}
		noOfflineSupport();
	}
	return img;
};
/**
* Reads a file from a File object
* @param file defines the file to load
* @param onSuccess defines the callback to call when data is loaded
* @param onProgress defines the callback to call during loading process
* @param useArrayBuffer defines a boolean indicating that data must be returned as an ArrayBuffer
* @param onError defines the callback to call when an error occurs
* @returns a file request object
* @internal
*/
var ReadFile = (file, onSuccess, onProgress, useArrayBuffer, onError) => {
	const reader = new FileReader();
	const fileRequest = {
		onCompleteObservable: new Observable(),
		abort: () => reader.abort()
	};
	reader.onloadend = () => fileRequest.onCompleteObservable.notifyObservers(fileRequest);
	if (onError) reader.onerror = () => {
		onError(new ReadFileError(`Unable to read ${file.name}`, file));
	};
	reader.onload = (e) => {
		onSuccess(e.target["result"]);
	};
	if (onProgress) reader.onprogress = onProgress;
	if (!useArrayBuffer) reader.readAsText(file);
	else reader.readAsArrayBuffer(file);
	return fileRequest;
};
/**
* Loads a file from a url, a data url, or a file url
* @param fileOrUrl file, url, data url, or file url to load
* @param onSuccess callback called when the file successfully loads
* @param onProgress callback called while file is loading (if the server supports this mode)
* @param offlineProvider defines the offline provider for caching
* @param useArrayBuffer defines a boolean indicating that date must be returned as ArrayBuffer
* @param onError callback called when the file fails to load
* @param onOpened
* @returns a file request object
* @internal
*/
var LoadFile = (fileOrUrl, onSuccess, onProgress, offlineProvider, useArrayBuffer, onError, onOpened) => {
	if (fileOrUrl.name) return ReadFile(fileOrUrl, onSuccess, onProgress, useArrayBuffer, onError ? (error) => {
		onError(void 0, error);
	} : void 0);
	const url = fileOrUrl;
	if (url.indexOf("file:") !== -1) {
		let fileName = decodeURIComponent(url.substring(5).toLowerCase());
		if (fileName.indexOf("./") === 0) fileName = fileName.substring(2);
		const file = FilesInputStore.FilesToLoad[fileName];
		if (file) return ReadFile(file, onSuccess, onProgress, useArrayBuffer, onError ? (error) => onError(void 0, new LoadFileError(error.message, error.file)) : void 0);
	}
	const { match, type } = TestBase64DataUrl(url);
	if (match) {
		const fileRequest = {
			onCompleteObservable: new Observable(),
			abort: () => () => {}
		};
		try {
			onSuccess(useArrayBuffer ? DecodeBase64UrlToBinary(url) : DecodeBase64UrlToString(url), void 0, type);
		} catch (error) {
			if (onError) onError(void 0, error);
			else Logger.Error(error.message || "Failed to parse the Data URL");
		}
		TimingTools.SetImmediate(() => {
			fileRequest.onCompleteObservable.notifyObservers(fileRequest);
		});
		return fileRequest;
	}
	return RequestFile(url, (data, request) => {
		onSuccess(data, request?.responseURL, request?.getResponseHeader("content-type"));
	}, onProgress, offlineProvider, useArrayBuffer, onError ? (error) => {
		onError(error.request, new LoadFileError(error.message, error.request));
	} : void 0, onOpened);
};
/**
* Loads a file from a url
* @param url url to load
* @param onSuccess callback called when the file successfully loads
* @param onProgress callback called while file is loading (if the server supports this mode)
* @param offlineProvider defines the offline provider for caching
* @param useArrayBuffer defines a boolean indicating that date must be returned as ArrayBuffer
* @param onError callback called when the file fails to load
* @param onOpened callback called when the web request is opened
* @returns a file request object
* @internal
*/
var RequestFile = (url, onSuccess, onProgress, offlineProvider, useArrayBuffer, onError, onOpened) => {
	if (offlineProvider !== null) offlineProvider ?? (offlineProvider = EngineStore.LastCreatedScene?.offlineProvider);
	url = FileToolsOptions.CleanUrl(url);
	url = FileToolsOptions.PreprocessUrl(url);
	const loadUrl = FileToolsOptions.BaseUrl + url;
	let aborted = false;
	const fileRequest = {
		onCompleteObservable: new Observable(),
		abort: () => aborted = true
	};
	const requestFile = () => {
		let request = new WebRequest();
		let retryHandle = null;
		let onReadyStateChange;
		const unbindEvents = () => {
			if (!request) return;
			if (onProgress) request.removeEventListener("progress", onProgress);
			if (onReadyStateChange) request.removeEventListener("readystatechange", onReadyStateChange);
			request.removeEventListener("loadend", onLoadEnd);
		};
		let onLoadEnd = () => {
			unbindEvents();
			fileRequest.onCompleteObservable.notifyObservers(fileRequest);
			fileRequest.onCompleteObservable.clear();
			onProgress = void 0;
			onReadyStateChange = null;
			onLoadEnd = null;
			onError = void 0;
			onOpened = void 0;
			onSuccess = void 0;
		};
		fileRequest.abort = () => {
			aborted = true;
			if (onLoadEnd) onLoadEnd();
			if (request && request.readyState !== (XMLHttpRequest.DONE || 4)) request.abort();
			if (retryHandle !== null) {
				clearTimeout(retryHandle);
				retryHandle = null;
			}
			request = null;
		};
		const handleError = (error) => {
			const message = error.message || "Unknown error";
			if (onError && request) onError(new RequestFileError(message, request));
			else Logger.Error(message);
		};
		const retryLoop = (retryIndex) => {
			if (!request) return;
			request.open("GET", loadUrl);
			if (onOpened) try {
				onOpened(request);
			} catch (e) {
				handleError(e);
				return;
			}
			if (useArrayBuffer) request.responseType = "arraybuffer";
			if (onProgress) request.addEventListener("progress", onProgress);
			if (onLoadEnd) request.addEventListener("loadend", onLoadEnd);
			onReadyStateChange = () => {
				if (aborted || !request) return;
				if (request.readyState === (XMLHttpRequest.DONE || 4)) {
					if (onReadyStateChange) request.removeEventListener("readystatechange", onReadyStateChange);
					if (request.status >= 200 && request.status < 300 || request.status === 0 && (!IsWindowObjectExist() || IsFileURL())) {
						const data = useArrayBuffer ? request.response : request.responseText;
						if (data !== null) {
							try {
								if (onSuccess) onSuccess(data, request);
							} catch (e) {
								handleError(e);
							}
							return;
						}
					}
					const retryStrategy = FileToolsOptions.DefaultRetryStrategy;
					if (retryStrategy) {
						const waitTime = retryStrategy(loadUrl, request, retryIndex);
						if (waitTime !== -1) {
							unbindEvents();
							request = new WebRequest();
							retryHandle = setTimeout(() => retryLoop(retryIndex + 1), waitTime);
							return;
						}
					}
					const error = new RequestFileError("Error status: " + request.status + " " + request.statusText + " - Unable to load " + loadUrl, request);
					if (onError) onError(error);
				}
			};
			request.addEventListener("readystatechange", onReadyStateChange);
			request.send();
		};
		retryLoop(0);
	};
	if (offlineProvider && offlineProvider.enableSceneOffline && !url.startsWith("blob:")) {
		const noOfflineSupport = (request) => {
			if (request && request.status > 400) {
				if (onError) onError(request);
			} else requestFile();
		};
		const loadFromOfflineSupport = () => {
			if (offlineProvider) offlineProvider.loadFile(FileToolsOptions.BaseUrl + url, (data) => {
				if (!aborted && onSuccess) onSuccess(data);
				fileRequest.onCompleteObservable.notifyObservers(fileRequest);
			}, onProgress ? (event) => {
				if (!aborted && onProgress) onProgress(event);
			} : void 0, noOfflineSupport, useArrayBuffer);
		};
		offlineProvider.open(loadFromOfflineSupport, noOfflineSupport);
	} else requestFile();
	return fileRequest;
};
/**
* Checks if the loaded document was accessed via `file:`-Protocol.
* @returns boolean
* @internal
*/
var IsFileURL = () => {
	return typeof location !== "undefined" && location.protocol === "file:";
};
/**
* Test if the given uri is a valid base64 data url
* @param uri The uri to test
* @returns True if the uri is a base64 data url or false otherwise
* @internal
*/
var IsBase64DataUrl = (uri) => {
	return Base64DataUrlRegEx.test(uri);
};
var TestBase64DataUrl = (uri) => {
	const results = Base64DataUrlRegEx.exec(uri);
	if (results === null || results.length === 0) return {
		match: false,
		type: ""
	};
	else return {
		match: true,
		type: results[0].replace("data:", "").replace(";base64,", "")
	};
};
/**
* Decode the given base64 uri.
* @param uri The uri to decode
* @returns The decoded base64 data.
* @internal
*/
function DecodeBase64UrlToBinary(uri) {
	return DecodeBase64ToBinary(uri.split(",")[1]);
}
/**
* Decode the given base64 uri into a UTF-8 encoded string.
* @param uri The uri to decode
* @returns The decoded base64 data.
* @internal
*/
var DecodeBase64UrlToString = (uri) => {
	return DecodeBase64ToString(uri.split(",")[1]);
};
/**
* This will be executed automatically for UMD and es5.
* If esm dev wants the side effects to execute they will have to run it manually
* Once we build native modules those need to be exported.
* @internal
*/
/**
* FileTools defined as any.
* This should not be imported or used in future releases or in any module in the framework
* @internal
* @deprecated import the needed function from fileTools.ts
*/
var FileTools;
/**
* @internal
*/
var _injectLTSFileTools = (DecodeBase64UrlToBinary, DecodeBase64UrlToString, FileToolsOptions, IsBase64DataUrl, IsFileURL, LoadFile, LoadImage, ReadFile, RequestFile, SetCorsBehavior) => {
	/**
	* Backwards compatibility.
	* @internal
	* @deprecated
	*/
	FileTools = {
		DecodeBase64UrlToBinary,
		DecodeBase64UrlToString,
		DefaultRetryStrategy: FileToolsOptions.DefaultRetryStrategy,
		BaseUrl: FileToolsOptions.BaseUrl,
		CorsBehavior: FileToolsOptions.CorsBehavior,
		PreprocessUrl: FileToolsOptions.PreprocessUrl,
		IsBase64DataUrl,
		IsFileURL,
		LoadFile,
		LoadImage,
		ReadFile,
		RequestFile,
		SetCorsBehavior
	};
	Object.defineProperty(FileTools, "DefaultRetryStrategy", {
		get: function() {
			return FileToolsOptions.DefaultRetryStrategy;
		},
		set: function(value) {
			FileToolsOptions.DefaultRetryStrategy = value;
		}
	});
	Object.defineProperty(FileTools, "BaseUrl", {
		get: function() {
			return FileToolsOptions.BaseUrl;
		},
		set: function(value) {
			FileToolsOptions.BaseUrl = value;
		}
	});
	Object.defineProperty(FileTools, "PreprocessUrl", {
		get: function() {
			return FileToolsOptions.PreprocessUrl;
		},
		set: function(value) {
			FileToolsOptions.PreprocessUrl = value;
		}
	});
	Object.defineProperty(FileTools, "CorsBehavior", {
		get: function() {
			return FileToolsOptions.CorsBehavior;
		},
		set: function(value) {
			FileToolsOptions.CorsBehavior = value;
		}
	});
};
var _Registered = false;
/**
* Register side effects for fileTools.
* Safe to call multiple times; only the first call has an effect.
*/
function RegisterFileTools() {
	if (_Registered) return;
	_Registered = true;
	_injectLTSFileTools(DecodeBase64UrlToBinary, DecodeBase64UrlToString, FileToolsOptions, IsBase64DataUrl, IsFileURL, LoadFile, LoadImage, ReadFile, RequestFile, SetCorsBehavior);
	EngineFunctionContext.loadFile = LoadFile;
	EngineFunctionContext.loadImage = LoadImage;
	_FunctionContainer.loadFile = LoadFile;
}
//#endregion
export { LoadImage as a, RequestFile as c, ErrorCodes as d, RuntimeError as f, LoadFile as i, SetCorsBehavior as l, FileToolsOptions as n, ReadFile as o, WebRequest as p, IsBase64DataUrl as r, RegisterFileTools as s, DecodeBase64UrlToBinary as t, EncodeArrayBufferToBase64 as u };
