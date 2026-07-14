import { o as EngineStore, s as Observable, t as GetClass } from "./typeStore-BMcSg10V.js";
import { C as _WarnImport, D as IsNavigatorAvailable, O as IsWindowObjectExist, T as GetDOMTextContent, c as TimingTools, t as RandomGUID, w as PrecisionDate } from "./guid-D83Ubj_G.js";
import { t as Logger } from "./logger-Ck8R5Aic.js";
import { a as LoadImage, i as LoadFile, l as SetCorsBehavior, n as FileToolsOptions, o as ReadFile, p as WebRequest, r as IsBase64DataUrl, t as DecodeBase64UrlToBinary } from "./fileTools.pure-ChVaRlUk.js";
var CloneValue = (source, destinationObject, shallowCopyValues) => !source || source.getClassName && source.getClassName() === "Mesh" ? null : source.getClassName && (source.getClassName() === "SubMesh" || source.getClassName() === "PhysicsBody") ? source.clone(destinationObject) : source.clone ? source.clone() : Array.isArray(source) ? source.slice() : shallowCopyValues && typeof source == "object" ? { ...source } : null;
function GetAllPropertyNames(obj) {
  const props = [];
  do {
    const propNames = Object.getOwnPropertyNames(obj);
    for (const prop of propNames) props.indexOf(prop) === -1 && props.push(prop);
  } while (obj = Object.getPrototypeOf(obj));
  return props;
}
var DeepCopier = class {
  static DeepCopy(source, destination, doNotCopyList, mustCopyList, shallowCopyValues = !1) {
    const properties = GetAllPropertyNames(source);
    for (const prop of properties) {
      if (prop[0] === "_" && (!mustCopyList || mustCopyList.indexOf(prop) === -1) || prop.endsWith("Observable") || doNotCopyList && doNotCopyList.indexOf(prop) !== -1) continue;
      const sourceValue = source[prop], typeOfSourceValue = typeof sourceValue;
      if (typeOfSourceValue !== "function")
        try {
          if (typeOfSourceValue === "object") if (sourceValue instanceof Uint8Array) destination[prop] = Uint8Array.from(sourceValue);
          else if (sourceValue instanceof Array) {
            if (destination[prop] = [], sourceValue.length > 0) if (typeof sourceValue[0] == "object") for (let index = 0; index < sourceValue.length; index++) {
              const clonedValue = CloneValue(sourceValue[index], destination, shallowCopyValues);
              destination[prop].indexOf(clonedValue) === -1 && destination[prop].push(clonedValue);
            }
            else destination[prop] = sourceValue.slice(0);
          } else destination[prop] = CloneValue(sourceValue, destination, shallowCopyValues);
          else destination[prop] = sourceValue;
        } catch (e) {
          Logger.Warn(e.message);
        }
    }
  }
}, InstantiationTools = class {
  static Instantiate(className) {
    if (this.RegisteredExternalClasses && this.RegisteredExternalClasses[className]) return this.RegisteredExternalClasses[className];
    const internalClass = GetClass(className);
    if (internalClass) return internalClass;
    Logger.Warn(className + " not found, you may have missed an import.");
    const arr = className.split(".");
    let fn = typeof window < "u" ? window : typeof globalThis < "u" ? globalThis : this;
    for (let i = 0, len = arr.length; i < len; i++) fn = fn[arr[i]];
    return typeof fn != "function" ? null : fn;
  }
};
InstantiationTools.RegisteredExternalClasses = {};
var _a, Tools = class {
  static get BaseUrl() {
    return FileToolsOptions.BaseUrl;
  }
  static set BaseUrl(value) {
    FileToolsOptions.BaseUrl = value;
  }
  static get CleanUrl() {
    return FileToolsOptions.CleanUrl;
  }
  static set CleanUrl(value) {
    FileToolsOptions.CleanUrl = value;
  }
  static IsAbsoluteUrl(url) {
    return url.indexOf("//") === 0 ? !0 : url.indexOf("://") === -1 || url.indexOf(".") === -1 || url.indexOf("/") === -1 || url.indexOf(":") > url.indexOf("/") ? !1 : url.indexOf("://") < url.indexOf(".") || url.indexOf("data:") === 0 || url.indexOf("blob:") === 0;
  }
  static set ScriptBaseUrl(value) {
    FileToolsOptions.ScriptBaseUrl = value;
  }
  static get ScriptBaseUrl() {
    return FileToolsOptions.ScriptBaseUrl;
  }
  static set CDNBaseUrl(value) {
    _a.ScriptBaseUrl = value, _a.AssetBaseUrl = value;
  }
  static set ScriptPreprocessUrl(func) {
    FileToolsOptions.ScriptPreprocessUrl = func;
  }
  static get ScriptPreprocessUrl() {
    return FileToolsOptions.ScriptPreprocessUrl;
  }
  static get DefaultRetryStrategy() {
    return FileToolsOptions.DefaultRetryStrategy;
  }
  static set DefaultRetryStrategy(strategy) {
    FileToolsOptions.DefaultRetryStrategy = strategy;
  }
  static get CorsBehavior() {
    return FileToolsOptions.CorsBehavior;
  }
  static set CorsBehavior(value) {
    FileToolsOptions.CorsBehavior = value;
  }
  static get UseFallbackTexture() {
    return EngineStore.UseFallbackTexture;
  }
  static set UseFallbackTexture(value) {
    EngineStore.UseFallbackTexture = value;
  }
  static get RegisteredExternalClasses() {
    return InstantiationTools.RegisteredExternalClasses;
  }
  static set RegisteredExternalClasses(classes) {
    InstantiationTools.RegisteredExternalClasses = classes;
  }
  static get fallbackTexture() {
    return EngineStore.FallbackTexture;
  }
  static set fallbackTexture(value) {
    EngineStore.FallbackTexture = value;
  }
  static FetchToRef(u, v, width, height, pixels, color) {
    const position = ((Math.abs(u) * width % width | 0) + (Math.abs(v) * height % height | 0) * width) * 4;
    color.r = pixels[position] / 255, color.g = pixels[position + 1] / 255, color.b = pixels[position + 2] / 255, color.a = pixels[position + 3] / 255;
  }
  static Mix(a, b, alpha) {
    return 0;
  }
  static Instantiate(className) {
    return InstantiationTools.Instantiate(className);
  }
  static SetImmediate(action) {
    TimingTools.SetImmediate(action);
  }
  static IsExponentOfTwo(value) {
    return !0;
  }
  static FloatRound(value) {
    return Math.fround(value);
  }
  static GetFilename(path) {
    const index = path.lastIndexOf("/");
    return index < 0 ? path : path.substring(index + 1);
  }
  static GetFolderPath(uri, returnUnchangedIfNoSlash = !1) {
    const index = uri.lastIndexOf("/");
    return index < 0 ? returnUnchangedIfNoSlash ? uri : "" : uri.substring(0, index + 1);
  }
  static ToDegrees(angle) {
    return angle * 180 / Math.PI;
  }
  static ToRadians(angle) {
    return angle * Math.PI / 180;
  }
  static SmoothAngleChange(previousAngle, newAngle, smoothFactor = 0.9) {
    const previousAngleRad = this.ToRadians(previousAngle), newAngleRad = this.ToRadians(newAngle);
    return this.ToDegrees(Math.atan2((1 - smoothFactor) * Math.sin(newAngleRad) + smoothFactor * Math.sin(previousAngleRad), (1 - smoothFactor) * Math.cos(newAngleRad) + smoothFactor * Math.cos(previousAngleRad)));
  }
  static MakeArray(obj, allowsNullUndefined) {
    return allowsNullUndefined !== !0 && (obj === void 0 || obj == null) ? null : Array.isArray(obj) ? obj : [obj];
  }
  static GetPointerPrefix(engine) {
    return IsWindowObjectExist() && !window.PointerEvent ? "mouse" : "pointer";
  }
  static SetCorsBehavior(url, element) {
    SetCorsBehavior(url, element);
  }
  static SetReferrerPolicyBehavior(referrerPolicy, element) {
    element.referrerPolicy = referrerPolicy;
  }
  static get PreprocessUrl() {
    return FileToolsOptions.PreprocessUrl;
  }
  static set PreprocessUrl(processor) {
    FileToolsOptions.PreprocessUrl = processor;
  }
  static LoadImage(input, onLoad, onError, offlineProvider, mimeType, imageBitmapOptions) {
    return LoadImage(input, onLoad, onError, offlineProvider, mimeType, imageBitmapOptions);
  }
  static LoadFile(url, onSuccess, onProgress, offlineProvider, useArrayBuffer, onError) {
    return LoadFile(url, onSuccess, onProgress, offlineProvider, useArrayBuffer, onError);
  }
  static async LoadFileAsync(url, useArrayBuffer = !0) {
    return await new Promise((resolve, reject) => {
      LoadFile(url, (data) => {
        resolve(data);
      }, void 0, void 0, useArrayBuffer, (request, exception) => {
        reject(exception);
      });
    });
  }
  static GetAssetUrl(url) {
    if (!url) return "";
    if (_a.AssetBaseUrl && url.startsWith(_a._DefaultAssetsUrl)) {
      const baseUrl = _a.AssetBaseUrl.endsWith("/") ? _a.AssetBaseUrl.slice(0, -1) : _a.AssetBaseUrl;
      return url.replace(_a._DefaultAssetsUrl, baseUrl);
    }
    return url;
  }
  static GetBabylonScriptURL(scriptUrl, forceAbsoluteUrl) {
    if (!scriptUrl) return "";
    if (scriptUrl.startsWith(_a._DefaultCdnUrl)) {
      if (_a.ScriptBaseUrl) {
        const baseUrl = _a.ScriptBaseUrl.endsWith("/") ? _a.ScriptBaseUrl.slice(0, -1) : _a.ScriptBaseUrl;
        scriptUrl = scriptUrl.replace(_a._DefaultCdnUrl, baseUrl);
      } else if (_a._CdnVersion) {
        const versionedBase = `${_a._DefaultCdnUrl}/v${_a._CdnVersion}`;
        scriptUrl.startsWith(versionedBase) || (scriptUrl = scriptUrl.replace(_a._DefaultCdnUrl, versionedBase));
      }
    }
    return scriptUrl = _a.ScriptPreprocessUrl(scriptUrl), forceAbsoluteUrl && !_a.IsAbsoluteUrl(scriptUrl) && (scriptUrl = _a.GetAbsoluteUrl(scriptUrl)), scriptUrl;
  }
  static LoadBabylonScript(scriptUrl, onSuccess, onError, scriptId) {
    scriptUrl = _a.GetBabylonScriptURL(scriptUrl), _a.LoadScript(scriptUrl, onSuccess, onError);
  }
  static async LoadBabylonScriptAsync(scriptUrl) {
    return scriptUrl = _a.GetBabylonScriptURL(scriptUrl), await _a.LoadScriptAsync(scriptUrl);
  }
  static _LoadScriptNative(scriptUrl, onSuccess, onError) {
    _native && _a.LoadFile(scriptUrl, (data) => {
      try {
        Function(data).apply(null), onSuccess && onSuccess();
      } catch (exception) {
        onError && onError("LoadScript Error", exception);
      }
    }, void 0, void 0, !1, (_request, exception) => {
      onError && onError("LoadScript Error", exception);
    });
  }
  static _LoadScriptWeb(scriptUrl, onSuccess, onError, scriptId, useModule = !1) {
    if (typeof importScripts == "function") {
      try {
        importScripts(scriptUrl), onSuccess && onSuccess();
      } catch (e) {
        onError?.(`Unable to load script '${scriptUrl}' in worker`, e);
      }
      return;
    } else if (!IsWindowObjectExist()) {
      onError?.(`Cannot load script '${scriptUrl}' outside of a window or a worker`);
      return;
    }
    const head = document.getElementsByTagName("head")[0], script = document.createElement("script");
    useModule ? (script.setAttribute("type", "module"), script.innerText = scriptUrl) : (script.setAttribute("type", "text/javascript"), script.setAttribute("src", scriptUrl)), scriptId && (script.id = scriptId), script.onload = () => {
      onSuccess && onSuccess();
    }, script.onerror = (e) => {
      onError && onError(`Unable to load script '${scriptUrl}'`, e);
    }, head.appendChild(script);
  }
  static async LoadScriptAsync(scriptUrl, scriptId) {
    return await new Promise((resolve, reject) => {
      this.LoadScript(scriptUrl, () => {
        resolve();
      }, (message, exception) => {
        reject(exception || new Error(message));
      }, scriptId);
    });
  }
  static ReadFileAsDataURL(fileToLoad, callback, progressCallback) {
    const reader = new FileReader(), request = {
      onCompleteObservable: new Observable(),
      abort: () => reader.abort()
    };
    return reader.onloadend = () => {
      request.onCompleteObservable.notifyObservers(request);
    }, reader.onload = (e) => {
      callback(e.target.result);
    }, reader.onprogress = progressCallback, reader.readAsDataURL(fileToLoad), request;
  }
  static ReadFile(file, onSuccess, onProgress, useArrayBuffer, onError) {
    return ReadFile(file, onSuccess, onProgress, useArrayBuffer, onError);
  }
  static FileAsURL(content) {
    const fileBlob = new Blob([content]);
    return window.URL.createObjectURL(fileBlob);
  }
  static Format(value, decimals = 2) {
    return value.toFixed(decimals);
  }
  static DeepCopy(source, destination, doNotCopyList, mustCopyList) {
    DeepCopier.DeepCopy(source, destination, doNotCopyList, mustCopyList);
  }
  static IsEmpty(obj) {
    for (const i in obj) if (Object.prototype.hasOwnProperty.call(obj, i)) return !1;
    return !0;
  }
  static RegisterTopRootEvents(windowElement, events) {
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      windowElement.addEventListener(event.name, event.handler, !1);
      try {
        window.parent && window.parent.addEventListener(event.name, event.handler, !1);
      } catch {
      }
    }
  }
  static UnregisterTopRootEvents(windowElement, events) {
    for (let index = 0; index < events.length; index++) {
      const event = events[index];
      windowElement.removeEventListener(event.name, event.handler);
      try {
        windowElement.parent && windowElement.parent.removeEventListener(event.name, event.handler);
      } catch {
      }
    }
  }
  static async DumpFramebuffer(width, height, engine, successCallback, mimeType = "image/png", fileName, quality) {
    throw _WarnImport("DumpTools");
  }
  static DumpData(width, height, data, successCallback, mimeType = "image/png", fileName, invertY = !1, toArrayBuffer = !1, quality) {
    throw _WarnImport("DumpTools");
  }
  static async DumpDataAsync(width, height, data, mimeType = "image/png", fileName, invertY = !1, toArrayBuffer = !1, quality) {
    throw _WarnImport("DumpTools");
  }
  static _IsOffScreenCanvas(canvas) {
    return canvas.convertToBlob !== void 0;
  }
  static ToBlob(canvas, successCallback, mimeType = "image/png", quality) {
    !_a._IsOffScreenCanvas(canvas) && !canvas.toBlob && (canvas.toBlob = function(callback, type, quality2) {
      setTimeout(() => {
        const binStr = atob(this.toDataURL(type, quality2).split(",")[1]), len = binStr.length, arr = new Uint8Array(len);
        for (let i = 0; i < len; i++) arr[i] = binStr.charCodeAt(i);
        callback(new Blob([arr]));
      });
    }), _a._IsOffScreenCanvas(canvas) ? canvas.convertToBlob({
      type: mimeType,
      quality
    }).then((blob) => successCallback(blob)) : canvas.toBlob(function(blob) {
      successCallback(blob);
    }, mimeType, quality);
  }
  static DownloadBlob(blob, fileName) {
    if ("download" in document.createElement("a")) {
      if (!fileName) {
        const date = /* @__PURE__ */ new Date();
        fileName = "screenshot_" + ((date.getFullYear() + "-" + (date.getMonth() + 1)).slice(2) + "-" + date.getDate() + "_" + date.getHours() + "-" + ("0" + date.getMinutes()).slice(-2)) + ".png";
      }
      _a.Download(blob, fileName);
    } else if (blob && typeof URL < "u") {
      const url = URL.createObjectURL(blob), newWindow = window.open("");
      if (!newWindow) return;
      const img = newWindow.document.createElement("img");
      img.onload = function() {
        URL.revokeObjectURL(url);
      }, img.src = url, newWindow.document.body.appendChild(img);
    }
  }
  static EncodeScreenshotCanvasData(canvas, successCallback, mimeType = "image/png", fileName, quality) {
    if (typeof fileName == "string" || !successCallback) this.ToBlob(canvas, function(blob) {
      blob && _a.DownloadBlob(blob, fileName), successCallback && successCallback("");
    }, mimeType, quality);
    else if (successCallback) {
      if (_a._IsOffScreenCanvas(canvas)) {
        canvas.convertToBlob({
          type: mimeType,
          quality
        }).then((blob) => {
          const reader = new FileReader();
          reader.readAsDataURL(blob), reader.onloadend = () => {
            const base64data = reader.result;
            successCallback(base64data);
          };
        });
        return;
      }
      successCallback(canvas.toDataURL(mimeType, quality));
    }
  }
  static Download(blob, fileName) {
    if (typeof URL > "u") return;
    const url = window.URL.createObjectURL(blob), a = document.createElement("a");
    document.body.appendChild(a), a.style.display = "none", a.href = url, a.download = fileName, a.addEventListener("click", () => {
      a.parentElement && a.parentElement.removeChild(a);
    }), a.click(), window.URL.revokeObjectURL(url);
  }
  static BackCompatCameraNoPreventDefault(args) {
    return typeof args[0] == "boolean" ? args[0] : typeof args[1] == "boolean" ? args[1] : !1;
  }
  static CreateScreenshot(engine, camera, size, successCallback, mimeType = "image/png", forceDownload = !1, quality) {
    throw _WarnImport("ScreenshotTools");
  }
  static async CreateScreenshotAsync(engine, camera, size, mimeType = "image/png", quality) {
    throw _WarnImport("ScreenshotTools");
  }
  static CreateScreenshotUsingRenderTarget(engine, camera, size, successCallback, mimeType = "image/png", samples = 1, antialiasing = !1, fileName, renderSprites = !1, enableStencilBuffer = !1, useLayerMask = !0, quality, customizeTexture) {
    throw _WarnImport("ScreenshotTools");
  }
  static async CreateScreenshotUsingRenderTargetAsync(engine, camera, size, mimeType = "image/png", samples = 1, antialiasing = !1, fileName, renderSprites = !1, enableStencilBuffer = !1, useLayerMask = !0, quality, customizeTexture) {
    throw _WarnImport("ScreenshotTools");
  }
  static RandomId() {
    return RandomGUID();
  }
  static IsBase64(uri) {
    return IsBase64DataUrl(uri);
  }
  static DecodeBase64(uri) {
    return DecodeBase64UrlToBinary(uri);
  }
  static get errorsCount() {
    return Logger.errorsCount;
  }
  static Log(message) {
    Logger.Log(message);
  }
  static Warn(message) {
    Logger.Warn(message);
  }
  static Error(message) {
    Logger.Error(message);
  }
  static get LogCache() {
    return Logger.LogCache;
  }
  static ClearLogCache() {
    Logger.ClearLogCache();
  }
  static set LogLevels(level) {
    Logger.LogLevels = level;
  }
  static set PerformanceLogLevel(level) {
    if ((level & _a.PerformanceUserMarkLogLevel) === _a.PerformanceUserMarkLogLevel) {
      _native?.enablePerformanceLogging ? (_native.enablePerformanceLogging(1), _a.StartPerformanceCounter = _a._StartMarkNative, _a.EndPerformanceCounter = _a._EndMarkNative) : (_a.StartPerformanceCounter = _a._StartUserMark, _a.EndPerformanceCounter = _a._EndUserMark);
      return;
    }
    if ((level & _a.PerformanceConsoleLogLevel) === _a.PerformanceConsoleLogLevel) {
      _native?.enablePerformanceLogging ? (_native.enablePerformanceLogging(2), _a.StartPerformanceCounter = _a._StartMarkNative, _a.EndPerformanceCounter = _a._EndMarkNative) : (_a.StartPerformanceCounter = _a._StartPerformanceConsole, _a.EndPerformanceCounter = _a._EndPerformanceConsole);
      return;
    }
    _a.StartPerformanceCounter = _a._StartPerformanceCounterDisabled, _a.EndPerformanceCounter = _a._EndPerformanceCounterDisabled, _native?.disablePerformanceLogging?.();
  }
  static _StartPerformanceCounterDisabled(counterName, condition) {
  }
  static _EndPerformanceCounterDisabled(counterName, condition) {
  }
  static _StartUserMark(counterName, condition = !0) {
    if (!_a._Performance) {
      if (!IsWindowObjectExist()) return;
      _a._Performance = window.performance;
    }
    !condition || !_a._Performance.mark || _a._Performance.mark(counterName + "-Begin");
  }
  static _EndUserMark(counterName, condition = !0) {
    !condition || !_a._Performance.mark || (_a._Performance.mark(counterName + "-End"), _a._Performance.measure(counterName, counterName + "-Begin", counterName + "-End"));
  }
  static _StartPerformanceConsole(counterName, condition = !0) {
    condition && (_a._StartUserMark(counterName, condition), console.time && console.time(counterName));
  }
  static _EndPerformanceConsole(counterName, condition = !0) {
    condition && (_a._EndUserMark(counterName, condition), console.timeEnd(counterName));
  }
  static _StartMarkNative(counterName, condition = !0) {
    if (condition && _native?.startPerformanceCounter) if (_a._NativePerformanceCounterHandles.has(counterName)) _a.Warn(`Performance counter with name ${counterName} is already started.`);
    else {
      const handle = _native.startPerformanceCounter(counterName);
      _a._NativePerformanceCounterHandles.set(counterName, handle);
    }
  }
  static _EndMarkNative(counterName, condition = !0) {
    if (condition && _native?.endPerformanceCounter) {
      const handle = _a._NativePerformanceCounterHandles.get(counterName);
      handle ? (_native.endPerformanceCounter(handle), _a._NativePerformanceCounterHandles.delete(counterName)) : _a.Warn(`Performance counter with name ${counterName} was not started.`);
    }
  }
  static get Now() {
    return PrecisionDate.Now;
  }
  static GetClassName(object, isType = !1) {
    let name = null;
    return !isType && object.getClassName ? name = object.getClassName() : (object instanceof Object && (name = (isType ? object : Object.getPrototypeOf(object)).constructor.__bjsclassName__), name || (name = typeof object)), name;
  }
  static First(array, predicate) {
    for (const el of array) if (predicate(el)) return el;
    return null;
  }
  static getFullClassName(object, isType = !1) {
    let className = null, moduleName = null;
    if (!isType && object.getClassName) className = object.getClassName();
    else {
      if (object instanceof Object) {
        const classObj = isType ? object : Object.getPrototypeOf(object);
        className = classObj.constructor.__bjsclassName__, moduleName = classObj.constructor.__bjsmoduleName__;
      }
      className || (className = typeof object);
    }
    return className ? (moduleName != null ? moduleName + "." : "") + className : null;
  }
  static async DelayAsync(delay) {
    await new Promise((resolve) => {
      setTimeout(() => {
        resolve();
      }, delay);
    });
  }
  static IsSafari() {
    return IsNavigatorAvailable() ? /^((?!chrome|android).)*safari/i.test(navigator.userAgent) : !1;
  }
};
_a = Tools;
Tools.AssetBaseUrl = "";
Tools.UseCustomRequestHeaders = !1;
Tools.CustomRequestHeaders = WebRequest.CustomRequestHeaders;
Tools.GetDOMTextContent = GetDOMTextContent;
Tools._DefaultCdnUrl = "https://cdn.babylonjs.com";
Tools._CdnVersion = "9.16.1";
Tools._DefaultAssetsUrl = "https://assets.babylonjs.com/core";
Tools.LoadScript = typeof _native > "u" ? _a._LoadScriptWeb : _a._LoadScriptNative;
Tools.GetAbsoluteUrl = typeof document == "object" ? (url) => {
  const a = document.createElement("a");
  return a.href = url, a.href;
} : typeof URL == "function" && typeof location == "object" ? (url) => new URL(url, location.origin).href : () => {
  throw new Error("Unable to get absolute URL. Override BABYLON.Tools.GetAbsoluteUrl to a custom implementation for the current context.");
};
Tools.NoneLogLevel = Logger.NoneLogLevel;
Tools.MessageLogLevel = Logger.MessageLogLevel;
Tools.WarningLogLevel = Logger.WarningLogLevel;
Tools.ErrorLogLevel = Logger.ErrorLogLevel;
Tools.AllLogLevel = Logger.AllLogLevel;
Tools.IsWindowObjectExist = IsWindowObjectExist;
Tools.PerformanceNoneLogLevel = 0;
Tools.PerformanceUserMarkLogLevel = 1;
Tools.PerformanceConsoleLogLevel = 2;
Tools._NativePerformanceCounterHandles = /* @__PURE__ */ new Map();
Tools.StartPerformanceCounter = _a._StartPerformanceCounterDisabled;
Tools.EndPerformanceCounter = _a._EndPerformanceCounterDisabled;
var AsyncLoop = class AsyncLoop2 {
  constructor(iterations, func, successCallback, offset = 0) {
    this.iterations = iterations, this.index = offset - 1, this._done = !1, this._fn = func, this._successCallback = successCallback;
  }
  executeNext() {
    this._done || (this.index + 1 < this.iterations ? (++this.index, this._fn(this)) : this.breakLoop());
  }
  breakLoop() {
    this._done = !0, this._successCallback();
  }
  static Run(iterations, fn, successCallback, offset = 0) {
    const loop = new AsyncLoop2(iterations, fn, successCallback, offset);
    return loop.executeNext(), loop;
  }
  static SyncAsyncForLoop(iterations, syncedIterations, fn, callback, breakFunction, timeout = 0) {
    return AsyncLoop2.Run(Math.ceil(iterations / syncedIterations), (loop) => {
      breakFunction && breakFunction() ? loop.breakLoop() : setTimeout(() => {
        for (let i = 0; i < syncedIterations; ++i) {
          const iteration = loop.index * syncedIterations + i;
          if (iteration >= iterations) break;
          if (fn(iteration), breakFunction && breakFunction()) {
            loop.breakLoop();
            break;
          }
        }
        loop.executeNext();
      }, timeout);
    }, callback);
  }
};
export {
  DeepCopier as i,
  Tools as n,
  InstantiationTools as r,
  AsyncLoop as t
};
