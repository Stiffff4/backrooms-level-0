var IsWeakRefSupported = typeof WeakRef < "u", EventState = class {
  constructor(mask, skipNextObservers = !1, target, currentTarget) {
    this.initialize(mask, skipNextObservers, target, currentTarget);
  }
  initialize(mask, skipNextObservers = !1, target, currentTarget) {
    return this.mask = mask, this.skipNextObservers = skipNextObservers, this.target = target, this.currentTarget = currentTarget, this;
  }
}, Observer = class {
  constructor(callback, mask, scope = null) {
    this.callback = callback, this.mask = mask, this.scope = scope, this._willBeUnregistered = !1, this.unregisterOnNextCall = !1, this._remove = null;
  }
  remove(defer = !1) {
    this._remove && this._remove(defer);
  }
}, Observable = class Observable2 {
  static FromPromise(promise, onErrorObservable) {
    const observable = new Observable2();
    return promise.then((ret) => {
      observable.notifyObservers(ret);
    }).catch((err) => {
      if (onErrorObservable) onErrorObservable.notifyObservers(err);
      else throw err;
    }), observable;
  }
  get observers() {
    return this._observers;
  }
  constructor(onObserverAdded, notifyIfTriggered = !1) {
    this.notifyIfTriggered = notifyIfTriggered, this._observers = new Array(), this._numObserversMarkedAsDeleted = 0, this._hasNotified = !1, this._eventState = new EventState(0), onObserverAdded && (this._onObserverAdded = onObserverAdded);
  }
  add(callback, mask = -1, insertFirst = !1, scope = null, unregisterOnFirstCall = !1) {
    if (!callback) return null;
    const observer = new Observer(callback, mask, scope);
    observer.unregisterOnNextCall = unregisterOnFirstCall, insertFirst ? this._observers.unshift(observer) : this._observers.push(observer), this._onObserverAdded && this._onObserverAdded(observer), this._hasNotified && this.notifyIfTriggered && this._lastNotifiedValue !== void 0 && this.notifyObserver(observer, this._lastNotifiedValue);
    const observableWeakRef = IsWeakRefSupported ? new WeakRef(this) : { deref: () => this };
    return observer._remove = (defer = !1) => {
      const observable = observableWeakRef.deref();
      observable && (defer ? observable.remove(observer) : observable._remove(observer));
    }, observer;
  }
  addOnce(callback) {
    return this.add(callback, void 0, void 0, void 0, !0);
  }
  remove(observer) {
    return observer ? (observer._remove = null, this._observers.indexOf(observer) !== -1 ? (this._deferUnregister(observer), !0) : !1) : !1;
  }
  removeCallback(callback, scope) {
    for (let index = 0; index < this._observers.length; index++) {
      const observer = this._observers[index];
      if (!observer._willBeUnregistered && observer.callback === callback && (!scope || scope === observer.scope))
        return this._deferUnregister(observer), !0;
    }
    return !1;
  }
  _deferUnregister(observer) {
    observer._willBeUnregistered || (this._numObserversMarkedAsDeleted++, observer.unregisterOnNextCall = !1, observer._willBeUnregistered = !0, setTimeout(() => {
      this._remove(observer);
    }, 0));
  }
  _remove(observer, updateCounter = !0) {
    if (!observer) return !1;
    const index = this._observers.indexOf(observer);
    return index !== -1 ? (updateCounter && this._numObserversMarkedAsDeleted--, this._observers.splice(index, 1), !0) : !1;
  }
  makeObserverTopPriority(observer) {
    this._remove(observer, !1), this._observers.unshift(observer);
  }
  makeObserverBottomPriority(observer) {
    this._remove(observer, !1), this._observers.push(observer);
  }
  notifyObservers(eventData, mask = -1, target, currentTarget, userInfo) {
    if (this.notifyIfTriggered && (this._hasNotified = !0, this._lastNotifiedValue = eventData), !this._observers.length) return !0;
    const state = this._eventState;
    state.mask = mask, state.target = target, state.currentTarget = currentTarget, state.skipNextObservers = !1, state.lastReturnValue = eventData, state.userInfo = userInfo;
    for (const obs of this._observers)
      if (!obs._willBeUnregistered && (obs.mask & mask && (obs.unregisterOnNextCall && this._deferUnregister(obs), obs.scope ? state.lastReturnValue = obs.callback.apply(obs.scope, [eventData, state]) : state.lastReturnValue = obs.callback(eventData, state)), state.skipNextObservers))
        return !1;
    return !0;
  }
  notifyObserver(observer, eventData, mask = -1) {
    if (this.notifyIfTriggered && (this._hasNotified = !0, this._lastNotifiedValue = eventData), observer._willBeUnregistered) return;
    const state = this._eventState;
    state.mask = mask, state.skipNextObservers = !1, observer.unregisterOnNextCall && this._deferUnregister(observer), observer.callback(eventData, state);
  }
  hasObservers() {
    return this._observers.length - this._numObserversMarkedAsDeleted > 0;
  }
  clear() {
    for (; this._observers.length; ) {
      const o = this._observers.pop();
      o && (o._remove = null);
    }
    this._onObserverAdded = null, this._numObserversMarkedAsDeleted = 0, this.cleanLastNotifiedState();
  }
  cleanLastNotifiedState() {
    this._hasNotified = !1, this._lastNotifiedValue = void 0;
  }
  clone() {
    const result = new Observable2();
    return result._observers = this._observers.slice(0), result;
  }
  hasSpecificMask(mask = -1) {
    for (const obs of this._observers) if (obs.mask & mask || obs.mask === mask) return !0;
    return !1;
  }
}, EngineStore = class {
  static get LastCreatedEngine() {
    return this.Instances.length === 0 ? null : this.Instances[this.Instances.length - 1];
  }
  static get LastCreatedScene() {
    return this._LastCreatedScene;
  }
};
EngineStore.Instances = [];
EngineStore.OnEnginesDisposedObservable = new Observable();
EngineStore._LastCreatedScene = null;
EngineStore.UseFallbackTexture = !0;
EngineStore.FallbackTexture = "";
var Tables = null;
function GenerateTables() {
  if (Tables) return Tables;
  const buffer = /* @__PURE__ */ new ArrayBuffer(4), floatView = new Float32Array(buffer), uint32View = new Uint32Array(buffer), baseTable = /* @__PURE__ */ new Uint32Array(512), shiftTable = /* @__PURE__ */ new Uint32Array(512);
  for (let i = 0; i < 256; ++i) {
    const e = i - 127;
    e < -24 ? (baseTable[i] = 0, baseTable[i | 256] = 32768, shiftTable[i] = 24, shiftTable[i | 256] = 24) : e < -14 ? (baseTable[i] = 1024 >> -e - 14, baseTable[i | 256] = 1024 >> -e - 14 | 32768, shiftTable[i] = -e - 1, shiftTable[i | 256] = -e - 1) : e <= 15 ? (baseTable[i] = e + 15 << 10, baseTable[i | 256] = e + 15 << 10 | 32768, shiftTable[i] = 13, shiftTable[i | 256] = 13) : e < 128 ? (baseTable[i] = 31744, baseTable[i | 256] = 64512, shiftTable[i] = 24, shiftTable[i | 256] = 24) : (baseTable[i] = 31744, baseTable[i | 256] = 64512, shiftTable[i] = 13, shiftTable[i | 256] = 13);
  }
  const mantissaTable = /* @__PURE__ */ new Uint32Array(2048), exponentTable = /* @__PURE__ */ new Uint32Array(64), offsetTable = /* @__PURE__ */ new Uint32Array(64);
  for (let i = 1; i < 1024; ++i) {
    let m = i << 13, e = 0;
    for (; (m & 8388608) === 0; )
      m <<= 1, e -= 8388608;
    m &= -8388609, e += 947912704, mantissaTable[i] = m | e;
  }
  for (let i = 1024; i < 2048; ++i) mantissaTable[i] = 939524096 + (i - 1024 << 13);
  for (let i = 1; i < 31; ++i) exponentTable[i] = i << 23;
  exponentTable[31] = 1199570944, exponentTable[32] = 2147483648;
  for (let i = 33; i < 63; ++i) exponentTable[i] = 2147483648 + (i - 32 << 23);
  exponentTable[63] = 3347054592;
  for (let i = 1; i < 64; ++i) i !== 32 && (offsetTable[i] = 1024);
  return Tables = {
    floatView,
    uint32View,
    baseTable,
    shiftTable,
    mantissaTable,
    exponentTable,
    offsetTable
  }, Tables;
}
var MaxHalfFloat = 65504;
function ToHalfFloat(value) {
  const tables = GenerateTables();
  tables.floatView[0] = value;
  const f = tables.uint32View[0], e = f >> 23 & 511;
  return tables.baseTable[e] + ((f & 8388607) >> tables.shiftTable[e]);
}
function FromHalfFloat(value) {
  const tables = GenerateTables();
  return tables.uint32View[0] = tables.mantissaTable[tables.offsetTable[value >> 10] + (value & 1023)] + tables.exponentTable[value >> 10], tables.floatView[0];
}
var RegisteredTypes = {};
function RegisterClass(className, type) {
  RegisteredTypes[className] = type;
}
function GetClass(fqdn) {
  return RegisteredTypes[fqdn];
}
export {
  ToHalfFloat as a,
  MaxHalfFloat as i,
  RegisterClass as n,
  EngineStore as o,
  FromHalfFloat as r,
  Observable as s,
  GetClass as t
};
