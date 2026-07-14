import { o as EngineStore, s as Observable } from "./typeStore-CRwQ34I6.js";
import { O as IsWindowObjectExist, c as TimingTools, h as EngineFunctionContext, i as GetBlobBufferSource, m as _FunctionContainer } from "./guid-CkhjUkgR.js";
import { t as Logger } from "./logger-X7NGrhaj.js";
function createXMLHttpRequest() {
  if (typeof _native !== "undefined" && _native.XMLHttpRequest) return new _native.XMLHttpRequest();
  else return new XMLHttpRequest();
}
var WebRequest = class WebRequest2 {
  constructor() {
    this._xhr = createXMLHttpRequest();
    this._requestURL = "";
  }
  static get IsCustomRequestAvailable() {
    return Object.keys(WebRequest2.CustomRequestHeaders).length > 0 || WebRequest2.CustomRequestModifiers.length > 0;
  }
  static _CleanUrl(url) {
    url = url.replace("file:http:", "http:");
    url = url.replace("file:https:", "https:");
    return url;
  }
  static _ShouldSkipRequestModifications(url) {
    return WebRequest2.SkipRequestModificationForBabylonCDN && (url.includes("preview.babylonjs.com") || url.includes("cdn.babylonjs.com"));
  }
  static _CollectCustomizations(url, baseHeaders = {}) {
    const headers = { ...baseHeaders };
    if (WebRequest2._ShouldSkipRequestModifications(url)) return {
      url,
      headers
    };
    for (const key in WebRequest2.CustomRequestHeaders) {
      const val = WebRequest2.CustomRequestHeaders[key];
      if (val) headers[key] = val;
    }
    const xhrProxy = { setRequestHeader: (name, value) => {
      headers[name] = value;
    } };
    for (const modifier of WebRequest2.CustomRequestModifiers) {
      if (WebRequest2._ShouldSkipRequestModifications(url)) break;
      const newUrl = modifier(xhrProxy, url);
      if (typeof newUrl === "string") url = newUrl;
    }
    return {
      url,
      headers
    };
  }
  static async FetchAsync(url, options = {}) {
    const method = options.method ?? "GET";
    if (typeof fetch !== "undefined") {
      const { url: resolvedUrl, headers } = WebRequest2._CollectCustomizations(WebRequest2._CleanUrl(url), options.headers ?? {});
      return await fetch(resolvedUrl, {
        method,
        headers,
        body: options.body ?? void 0
      });
    }
    return await new Promise((resolve, reject) => {
      const request = new WebRequest2();
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
  get requestURL() {
    return this._requestURL;
  }
  get onprogress() {
    return this._xhr.onprogress;
  }
  set onprogress(value) {
    this._xhr.onprogress = value;
  }
  get readyState() {
    return this._xhr.readyState;
  }
  get status() {
    return this._xhr.status;
  }
  get statusText() {
    return this._xhr.statusText;
  }
  get response() {
    return this._xhr.response;
  }
  get responseURL() {
    return this._xhr.responseURL;
  }
  get responseText() {
    return this._xhr.responseText;
  }
  get responseType() {
    return this._xhr.responseType;
  }
  set responseType(value) {
    this._xhr.responseType = value;
  }
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
  abort() {
    this._xhr.abort();
  }
  send(body) {
    this._xhr.send(body);
  }
  open(method, url, baseHeaders) {
    const { url: modifiedUrl, headers } = WebRequest2._CollectCustomizations(url, baseHeaders);
    this._requestURL = WebRequest2._CleanUrl(modifiedUrl);
    this._xhr.open(method, this._requestURL, true);
    for (const key in headers) this._xhr.setRequestHeader(key, headers[key]);
  }
  setRequestHeader(name, value) {
    this._xhr.setRequestHeader(name, value);
  }
  getResponseHeader(name) {
    return this._xhr.getResponseHeader(name);
  }
};
WebRequest.CustomRequestHeaders = {};
WebRequest.CustomRequestModifiers = new Array();
WebRequest.SkipRequestModificationForBabylonCDN = true;
var FilesInputStore = class {
};
FilesInputStore.FilesToLoad = {};
var RetryStrategy = class {
  static ExponentialBackoff(maxRetries = 3, baseInterval = 500) {
    return (url, request, retryIndex) => {
      if (request.status !== 0 || retryIndex >= maxRetries || url.indexOf("file:") !== -1) return -1;
      return Math.pow(2, retryIndex) * baseInterval;
    };
  }
};
var BaseError = class extends Error {
};
BaseError._setPrototypeOf = Object.setPrototypeOf || ((o, proto) => {
  o.__proto__ = proto;
  return o;
});
var ErrorCodes = {
  MeshInvalidPositionsError: 0,
  UnsupportedTextureError: 1e3,
  GLTFLoaderUnexpectedMagicError: 2e3,
  SceneLoaderError: 3e3,
  LoadFileError: 4e3,
  RequestFileError: 4001,
  ReadFileError: 4002
};
var RuntimeError = class RuntimeError2 extends BaseError {
  constructor(message, errorCode, innerError) {
    super(message);
    this.errorCode = errorCode;
    this.innerError = innerError;
    this.name = "RuntimeError";
    BaseError._setPrototypeOf(this, RuntimeError2.prototype);
  }
};
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
var EncodeArrayBufferToBase64 = (buffer) => {
  const bytes = ArrayBuffer.isView(buffer) ? new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength) : new Uint8Array(buffer);
  return typeof bytes.toBase64 === "function" ? bytes.toBase64() : JsEncodeArrayBufferToBase64(bytes);
};
var DecodeBase64ToString = (base64Data) => {
  return atob(base64Data);
};
var DecodeBase64ToBinary = (base64Data) => {
  return typeof Uint8Array.fromBase64 === "function" ? Uint8Array.fromBase64(base64Data).buffer : JsDecodeBase64ToBinary(base64Data);
};
var Base64DataUrlRegEx = /* @__PURE__ */ new RegExp(/^data:([^,]+\/[^,]+)?;base64,/i);
var LoadFileError = class LoadFileError2 extends RuntimeError {
  constructor(message, object) {
    super(message, ErrorCodes.LoadFileError);
    this.name = "LoadFileError";
    BaseError._setPrototypeOf(this, LoadFileError2.prototype);
    if (object instanceof WebRequest) this.request = object;
    else this.file = object;
  }
};
var RequestFileError = class RequestFileError2 extends RuntimeError {
  constructor(message, request) {
    super(message, ErrorCodes.RequestFileError);
    this.request = request;
    this.name = "RequestFileError";
    BaseError._setPrototypeOf(this, RequestFileError2.prototype);
  }
};
var ReadFileError = class ReadFileError2 extends RuntimeError {
  constructor(message, file) {
    super(message, ErrorCodes.ReadFileError);
    this.file = file;
    this.name = "ReadFileError";
    BaseError._setPrototypeOf(this, ReadFileError2.prototype);
  }
};
var CleanUrl = (url) => {
  url = url.replace(/#/gm, "%23");
  return url;
};
var FileToolsOptions = {
  DefaultRetryStrategy: RetryStrategy.ExponentialBackoff(),
  BaseUrl: "",
  CorsBehavior: "anonymous",
  PreprocessUrl: (url) => url,
  ScriptBaseUrl: "",
  ScriptPreprocessUrl: (url) => url,
  CleanUrl
};
var SetCorsBehavior = (url, element) => {
  if (url && url.indexOf("data:") === 0) return;
  if (FileToolsOptions.CorsBehavior) if (typeof FileToolsOptions.CorsBehavior === "string" || FileToolsOptions.CorsBehavior instanceof String) element.crossOrigin = FileToolsOptions.CorsBehavior;
  else {
    const result = FileToolsOptions.CorsBehavior(url);
    if (result) element.crossOrigin = result;
  }
};
var LoadImageConfiguration = { getRequiredSize: null };
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
      const url2 = URL.createObjectURL(blob);
      usingObjectURL = true;
      img.src = url2;
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
      abort: () => () => {
      }
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
var IsFileURL = () => {
  return typeof location !== "undefined" && location.protocol === "file:";
};
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
function DecodeBase64UrlToBinary(uri) {
  return DecodeBase64ToBinary(uri.split(",")[1]);
}
var DecodeBase64UrlToString = (uri) => {
  return DecodeBase64ToString(uri.split(",")[1]);
};
var FileTools;
var _injectLTSFileTools = (DecodeBase64UrlToBinary2, DecodeBase64UrlToString2, FileToolsOptions2, IsBase64DataUrl2, IsFileURL2, LoadFile2, LoadImage2, ReadFile2, RequestFile2, SetCorsBehavior2) => {
  FileTools = {
    DecodeBase64UrlToBinary: DecodeBase64UrlToBinary2,
    DecodeBase64UrlToString: DecodeBase64UrlToString2,
    DefaultRetryStrategy: FileToolsOptions2.DefaultRetryStrategy,
    BaseUrl: FileToolsOptions2.BaseUrl,
    CorsBehavior: FileToolsOptions2.CorsBehavior,
    PreprocessUrl: FileToolsOptions2.PreprocessUrl,
    IsBase64DataUrl: IsBase64DataUrl2,
    IsFileURL: IsFileURL2,
    LoadFile: LoadFile2,
    LoadImage: LoadImage2,
    ReadFile: ReadFile2,
    RequestFile: RequestFile2,
    SetCorsBehavior: SetCorsBehavior2
  };
  Object.defineProperty(FileTools, "DefaultRetryStrategy", {
    get: function() {
      return FileToolsOptions2.DefaultRetryStrategy;
    },
    set: function(value) {
      FileToolsOptions2.DefaultRetryStrategy = value;
    }
  });
  Object.defineProperty(FileTools, "BaseUrl", {
    get: function() {
      return FileToolsOptions2.BaseUrl;
    },
    set: function(value) {
      FileToolsOptions2.BaseUrl = value;
    }
  });
  Object.defineProperty(FileTools, "PreprocessUrl", {
    get: function() {
      return FileToolsOptions2.PreprocessUrl;
    },
    set: function(value) {
      FileToolsOptions2.PreprocessUrl = value;
    }
  });
  Object.defineProperty(FileTools, "CorsBehavior", {
    get: function() {
      return FileToolsOptions2.CorsBehavior;
    },
    set: function(value) {
      FileToolsOptions2.CorsBehavior = value;
    }
  });
};
var _Registered = false;
function RegisterFileTools() {
  if (_Registered) return;
  _Registered = true;
  _injectLTSFileTools(DecodeBase64UrlToBinary, DecodeBase64UrlToString, FileToolsOptions, IsBase64DataUrl, IsFileURL, LoadFile, LoadImage, ReadFile, RequestFile, SetCorsBehavior);
  EngineFunctionContext.loadFile = LoadFile;
  EngineFunctionContext.loadImage = LoadImage;
  _FunctionContainer.loadFile = LoadFile;
}
export {
  LoadImage as a,
  RequestFile as c,
  ErrorCodes as d,
  RuntimeError as f,
  LoadFile as i,
  SetCorsBehavior as l,
  FileToolsOptions as n,
  ReadFile as o,
  WebRequest as p,
  IsBase64DataUrl as r,
  RegisterFileTools as s,
  DecodeBase64UrlToBinary as t,
  EncodeArrayBufferToBase64 as u
};
