var Logger = class Logger2 {
  static _CheckLimit(message, limit) {
    let entry = Logger2._LogLimitOutputs[message];
    if (!entry) {
      entry = {
        limit,
        current: 1
      };
      Logger2._LogLimitOutputs[message] = entry;
    } else entry.current++;
    return entry.current <= entry.limit;
  }
  static _GenerateLimitMessage(message, level = 1) {
    const entry = Logger2._LogLimitOutputs[message];
    if (!entry || !Logger2.MessageLimitReached) return;
    const type = this._Levels[level];
    if (entry.current === entry.limit) Logger2[type.name](Logger2.MessageLimitReached.replace(/%LIMIT%/g, "" + entry.limit).replace(/%TYPE%/g, type.name ?? ""));
  }
  static _AddLogEntry(entry) {
    Logger2._LogCache = entry + Logger2._LogCache;
    if (Logger2.OnNewCacheEntry) Logger2.OnNewCacheEntry(entry);
  }
  static _FormatMessage(message) {
    const padStr = (i) => i < 10 ? "0" + i : "" + i;
    const date = /* @__PURE__ */ new Date();
    return "[" + padStr(date.getHours()) + ":" + padStr(date.getMinutes()) + ":" + padStr(date.getSeconds()) + "]: " + message;
  }
  static _LogDisabled(message, limit) {
  }
  static _LogEnabled(level = 1, message, limit) {
    const msg = Array.isArray(message) ? message[0] : message;
    if (limit !== void 0 && !Logger2._CheckLimit(msg, limit)) return;
    const formattedMessage = Logger2._FormatMessage(msg);
    const type = this._Levels[level];
    const optionals = Array.isArray(message) ? message.slice(1) : [];
    type.logFunc && type.logFunc("BJS - " + formattedMessage, ...optionals);
    const entry = `<div style='color:${type.color}'>${formattedMessage}</div><br>`;
    Logger2._AddLogEntry(entry);
    Logger2._GenerateLimitMessage(msg, level);
  }
  static get LogCache() {
    return Logger2._LogCache;
  }
  static ClearLogCache() {
    Logger2._LogCache = "";
    Logger2._LogLimitOutputs = {};
    Logger2.errorsCount = 0;
  }
  static set LogLevels(level) {
    Logger2.Log = Logger2._LogDisabled;
    Logger2.Warn = Logger2._LogDisabled;
    Logger2.Error = Logger2._LogDisabled;
    const levels = [
      Logger2.MessageLogLevel,
      Logger2.WarningLogLevel,
      Logger2.ErrorLogLevel
    ];
    for (const l of levels) if ((level & l) === l) {
      const type = this._Levels[l];
      Logger2[type.name] = Logger2._LogEnabled.bind(Logger2, l);
    }
  }
};
Logger.NoneLogLevel = 0;
Logger.MessageLogLevel = 1;
Logger.WarningLogLevel = 2;
Logger.ErrorLogLevel = 4;
Logger.AllLogLevel = 7;
Logger.MessageLimitReached = "Too many %TYPE%s (%LIMIT%), no more %TYPE%s will be reported for this message.";
Logger._LogCache = "";
Logger._LogLimitOutputs = {};
Logger._Levels = [
  {},
  {
    color: "white",
    logFunc: console.log,
    name: "Log"
  },
  {
    color: "orange",
    logFunc: console.warn,
    name: "Warn"
  },
  {},
  {
    color: "red",
    logFunc: console.error,
    name: "Error"
  }
];
Logger.errorsCount = 0;
Logger.Log = Logger._LogEnabled.bind(Logger, Logger.MessageLogLevel);
Logger.Warn = Logger._LogEnabled.bind(Logger, Logger.WarningLogLevel);
Logger.Error = Logger._LogEnabled.bind(Logger, Logger.ErrorLogLevel);
export {
  Logger as t
};
