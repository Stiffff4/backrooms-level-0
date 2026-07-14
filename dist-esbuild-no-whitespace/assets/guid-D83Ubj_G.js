import { a as ToHalfFloat, r as FromHalfFloat } from "./typeStore-BMcSg10V.js";
import { t as Logger } from "./logger-Ck8R5Aic.js";
function IsWindowObjectExist() {
  return typeof window < "u";
}
function IsNavigatorAvailable() {
  return typeof navigator < "u";
}
function IsDocumentAvailable() {
  return typeof document < "u";
}
function GetDOMTextContent(element) {
  let result = "", child = element.firstChild;
  for (; child; )
    child.nodeType === 3 && (result += child.textContent), child = child.nextSibling;
  return result;
}
var PrecisionDate = class {
  static get Now() {
    return IsWindowObjectExist() && window.performance && window.performance.now ? window.performance.now() : Date.now();
  }
}, WarnedMap = {};
function _WarnImport(name, warnOnce = !1) {
  if (!(warnOnce && WarnedMap[name]))
    return WarnedMap[name] = !0, `${name} needs to be imported before as it contains a side-effect required by your code.`;
}
var _StubWarnedMap = {}, _MissingSideEffectWarningsEnabled = !1, _MissingSideEffectWarningsSuppressionDepth = 0;
function _MissingSideEffect(className, methodName, warn = !1) {
  const stub = function() {
    if ((warn || _MissingSideEffectWarningsEnabled) && _MissingSideEffectWarningsSuppressionDepth === 0) {
      const key = `${className}.${methodName}`;
      _StubWarnedMap[key] || (_StubWarnedMap[key] = !0, console.warn(`[Babylon.js] ${key}() requires a side-effect import. See: https://doc.babylonjs.com/setup/treeshaking`));
    }
  };
  return stub.__isSideEffectStub = !0, stub;
}
function _IsSideEffectImplemented(fn) {
  return fn ? !fn.__isSideEffectStub : !1;
}
function _MissingSideEffectProperty(className, propName) {
  return {
    get() {
    },
    set(value) {
      Object.defineProperty(this, propName, {
        value,
        writable: !0,
        configurable: !0,
        enumerable: !0
      });
    },
    configurable: !0,
    enumerable: !0
  };
}
var EngineFunctionContext = {};
function _ConcatenateShader(source, defines, shaderVersion = "") {
  return shaderVersion + (defines ? defines + `
` : "") + source;
}
function _LoadFile(url, onSuccess, onProgress, offlineProvider, useArrayBuffer, onError, injectedLoadFile) {
  const loadFileFn = injectedLoadFile || EngineFunctionContext.loadFile;
  if (!loadFileFn) throw _WarnImport("FileTools");
  return loadFileFn(url, onSuccess, onProgress, offlineProvider, useArrayBuffer, onError);
}
function _GetGlobalDefines(defines, isNDCHalfZRange, useReverseDepthBuffer, useExactSrgbConversions) {
  if (defines) {
    isNDCHalfZRange ? defines.IS_NDC_HALF_ZRANGE = "" : delete defines.IS_NDC_HALF_ZRANGE, useReverseDepthBuffer ? defines.USE_REVERSE_DEPTHBUFFER = "" : delete defines.USE_REVERSE_DEPTHBUFFER, useExactSrgbConversions ? defines.USE_EXACT_SRGB_CONVERSIONS = "" : delete defines.USE_EXACT_SRGB_CONVERSIONS;
    return;
  } else {
    let s = "";
    return isNDCHalfZRange && (s += "#define IS_NDC_HALF_ZRANGE"), useReverseDepthBuffer && (s && (s += `
`), s += "#define USE_REVERSE_DEPTHBUFFER"), useExactSrgbConversions && (s && (s += `
`), s += "#define USE_EXACT_SRGB_CONVERSIONS"), s;
  }
}
function allocateAndCopyTypedBuffer(type, sizeOrDstBuffer, sizeInBytes = !1, copyBuffer) {
  switch (type) {
    case 3: {
      const buffer2 = new Int8Array(sizeOrDstBuffer);
      return copyBuffer && buffer2.set(new Int8Array(copyBuffer)), buffer2;
    }
    case 0: {
      const buffer2 = new Uint8Array(sizeOrDstBuffer);
      return copyBuffer && buffer2.set(new Uint8Array(copyBuffer)), buffer2;
    }
    case 4: {
      const buffer2 = typeof sizeOrDstBuffer != "number" ? new Int16Array(sizeOrDstBuffer) : new Int16Array(sizeInBytes ? sizeOrDstBuffer / 2 : sizeOrDstBuffer);
      return copyBuffer && buffer2.set(new Int16Array(copyBuffer)), buffer2;
    }
    case 5:
    case 8:
    case 9:
    case 10:
    case 2: {
      const buffer2 = typeof sizeOrDstBuffer != "number" ? new Uint16Array(sizeOrDstBuffer) : new Uint16Array(sizeInBytes ? sizeOrDstBuffer / 2 : sizeOrDstBuffer);
      return copyBuffer && buffer2.set(new Uint16Array(copyBuffer)), buffer2;
    }
    case 6: {
      const buffer2 = typeof sizeOrDstBuffer != "number" ? new Int32Array(sizeOrDstBuffer) : new Int32Array(sizeInBytes ? sizeOrDstBuffer / 4 : sizeOrDstBuffer);
      return copyBuffer && buffer2.set(new Int32Array(copyBuffer)), buffer2;
    }
    case 7:
    case 11:
    case 12:
    case 13:
    case 14:
    case 15: {
      const buffer2 = typeof sizeOrDstBuffer != "number" ? new Uint32Array(sizeOrDstBuffer) : new Uint32Array(sizeInBytes ? sizeOrDstBuffer / 4 : sizeOrDstBuffer);
      return copyBuffer && buffer2.set(new Uint32Array(copyBuffer)), buffer2;
    }
    case 1: {
      const buffer2 = typeof sizeOrDstBuffer != "number" ? new Float32Array(sizeOrDstBuffer) : new Float32Array(sizeInBytes ? sizeOrDstBuffer / 4 : sizeOrDstBuffer);
      return copyBuffer && buffer2.set(new Float32Array(copyBuffer)), buffer2;
    }
  }
  const buffer = new Uint8Array(sizeOrDstBuffer);
  return copyBuffer && buffer.set(new Uint8Array(copyBuffer)), buffer;
}
var DefaultAttributeKeywordName = "attribute", DefaultVaryingKeywordName = "varying", ShaderCodeNode = class {
  constructor() {
    this.children = [];
  }
  isValid(preprocessors) {
    return !0;
  }
  process(preprocessors, options, preProcessorsFromCode) {
    let result = "";
    if (this.line) {
      let value = this.line;
      const processor = options.processor;
      if (processor) {
        processor.lineProcessor && (value = processor.lineProcessor(value, options.isFragment, options.processingContext));
        const attributeKeyword = options.processor?.attributeKeywordName ?? DefaultAttributeKeywordName, varyingKeyword = options.isFragment && options.processor?.varyingFragmentKeywordName ? options.processor?.varyingFragmentKeywordName : !options.isFragment && options.processor?.varyingVertexKeywordName ? options.processor?.varyingVertexKeywordName : DefaultVaryingKeywordName;
        !options.isFragment && processor.attributeProcessor && this.line.startsWith(attributeKeyword) ? value = processor.attributeProcessor(this.line, preprocessors, options.processingContext) : processor.varyingProcessor && (processor.varyingCheck?.(this.line, options.isFragment) || !processor.varyingCheck && this.line.startsWith(varyingKeyword)) ? value = processor.varyingProcessor(this.line, options.isFragment, preprocessors, options.processingContext) : processor.uniformProcessor && processor.uniformRegexp && processor.uniformRegexp.test(this.line) ? options.lookForClosingBracketForUniformBuffer || (value = processor.uniformProcessor(this.line, options.isFragment, preprocessors, options.processingContext)) : processor.uniformBufferProcessor && processor.uniformBufferRegexp && processor.uniformBufferRegexp.test(this.line) ? options.lookForClosingBracketForUniformBuffer || (value = processor.uniformBufferProcessor(this.line, options.isFragment, options.processingContext), options.lookForClosingBracketForUniformBuffer = !0) : processor.textureProcessor && processor.textureRegexp && processor.textureRegexp.test(this.line) ? value = processor.textureProcessor(this.line, options.isFragment, preprocessors, options.processingContext) : (processor.uniformProcessor || processor.uniformBufferProcessor) && this.line.startsWith("uniform") && !options.lookForClosingBracketForUniformBuffer && (/uniform\s+(?:(?:highp)?|(?:lowp)?)\s*(\S+)\s+(\S+)\s*;/.test(this.line) ? processor.uniformProcessor && (value = processor.uniformProcessor(this.line, options.isFragment, preprocessors, options.processingContext)) : processor.uniformBufferProcessor && (value = processor.uniformBufferProcessor(this.line, options.isFragment, options.processingContext), options.lookForClosingBracketForUniformBuffer = !0)), options.lookForClosingBracketForUniformBuffer && this.line.indexOf("}") !== -1 && (options.lookForClosingBracketForUniformBuffer = !1, processor.endOfUniformBufferProcessor && (value = processor.endOfUniformBufferProcessor(this.line, options.isFragment, options.processingContext)));
      }
      result += value + `
`;
    }
    for (const child of this.children) result += child.process(preprocessors, options, preProcessorsFromCode);
    return this.additionalDefineKey && (preprocessors[this.additionalDefineKey] = this.additionalDefineValue || "true", preProcessorsFromCode[this.additionalDefineKey] = preprocessors[this.additionalDefineKey]), result;
  }
}, ShaderCodeCursor = class {
  constructor() {
    this._lines = [];
  }
  get currentLine() {
    return this._lines[this.lineIndex];
  }
  get canRead() {
    return this.lineIndex < this._lines.length - 1;
  }
  set lines(value) {
    this._lines.length = 0;
    for (const line of value) {
      if (!line || line === "\r") continue;
      if (line[0] === "#") {
        this._lines.push(line);
        continue;
      }
      const trimmedLine = line.trim();
      if (!trimmedLine) continue;
      if (trimmedLine.startsWith("//")) {
        this._lines.push(line);
        continue;
      }
      const semicolonIndex = trimmedLine.indexOf(";");
      if (semicolonIndex === -1) this._lines.push(trimmedLine);
      else if (semicolonIndex === trimmedLine.length - 1)
        trimmedLine.length > 1 && this._lines.push(trimmedLine);
      else {
        const split = line.split(";");
        for (let index = 0; index < split.length; index++) {
          let subLine = split[index];
          subLine && (subLine = subLine.trim(), subLine && this._lines.push(subLine + (index !== split.length - 1 ? ";" : "")));
        }
      }
    }
  }
}, ShaderCodeConditionNode = class extends ShaderCodeNode {
  process(preprocessors, options, preProcessorsFromCode) {
    for (let index = 0; index < this.children.length; index++) {
      const node = this.children[index];
      if (node.isValid(preprocessors)) return node.process(preprocessors, options, preProcessorsFromCode);
    }
    return "";
  }
}, ShaderCodeTestNode = class extends ShaderCodeNode {
  isValid(preprocessors) {
    return this.testExpression.isTrue(preprocessors);
  }
}, ShaderDefineExpression = class ShaderDefineExpression2 {
  isTrue(preprocessors) {
    return !0;
  }
  static postfixToInfix(postfix) {
    const stack = [];
    for (const c of postfix) if (ShaderDefineExpression2._OperatorPriority[c] === void 0) stack.push(c);
    else {
      const v1 = stack[stack.length - 1], v2 = stack[stack.length - 2];
      stack.length -= 2, stack.push(`(${v2}${c}${v1})`);
    }
    return stack[stack.length - 1];
  }
  static infixToPostfix(infix) {
    const cacheItem = ShaderDefineExpression2._InfixToPostfixCache.get(infix);
    if (cacheItem)
      return cacheItem.accessTime = Date.now(), cacheItem.result;
    if (!infix.includes("&&") && !infix.includes("||") && !infix.includes(")") && !infix.includes("(")) return [infix];
    const result = [];
    let stackIdx = -1;
    const pushOperand = () => {
      operand = operand.trim(), operand !== "" && (result.push(operand), operand = "");
    }, push = (s) => {
      stackIdx < ShaderDefineExpression2._Stack.length - 1 && (ShaderDefineExpression2._Stack[++stackIdx] = s);
    }, peek = () => ShaderDefineExpression2._Stack[stackIdx], pop = () => stackIdx === -1 ? "!!INVALID EXPRESSION!!" : ShaderDefineExpression2._Stack[stackIdx--];
    let idx = 0, operand = "";
    for (; idx < infix.length; ) {
      const c = infix.charAt(idx), token = idx < infix.length - 1 ? infix.substring(idx, 2 + idx) : "";
      if (c === "(")
        operand = "", push(c);
      else if (c === ")") {
        for (pushOperand(); stackIdx !== -1 && peek() !== "("; ) result.push(pop());
        pop();
      } else if (ShaderDefineExpression2._OperatorPriority[token] > 1) {
        for (pushOperand(); stackIdx !== -1 && ShaderDefineExpression2._OperatorPriority[peek()] >= ShaderDefineExpression2._OperatorPriority[token]; ) result.push(pop());
        push(token), idx++;
      } else operand += c;
      idx++;
    }
    for (pushOperand(); stackIdx !== -1; ) peek() === "(" ? pop() : result.push(pop());
    return ShaderDefineExpression2._InfixToPostfixCache.size >= ShaderDefineExpression2.InfixToPostfixCacheLimitSize && ShaderDefineExpression2.ClearCache(), ShaderDefineExpression2._InfixToPostfixCache.set(infix, {
      result,
      accessTime: Date.now()
    }), result;
  }
  static ClearCache() {
    const sortedCache = Array.from(ShaderDefineExpression2._InfixToPostfixCache.entries()).sort((a, b) => a[1].accessTime - b[1].accessTime);
    for (let i = 0; i < ShaderDefineExpression2.InfixToPostfixCacheCleanupSize; i++) ShaderDefineExpression2._InfixToPostfixCache.delete(sortedCache[i][0]);
  }
};
ShaderDefineExpression.InfixToPostfixCacheLimitSize = 5e4;
ShaderDefineExpression.InfixToPostfixCacheCleanupSize = 25e3;
ShaderDefineExpression._InfixToPostfixCache = /* @__PURE__ */ new Map();
ShaderDefineExpression._OperatorPriority = {
  ")": 0,
  "(": 1,
  "||": 2,
  "&&": 3
};
ShaderDefineExpression._Stack = [
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  "",
  ""
];
var ShaderDefineIsDefinedOperator = class extends ShaderDefineExpression {
  constructor(define, not = !1) {
    super(), this.define = define, this.not = not;
  }
  isTrue(preprocessors) {
    let condition = preprocessors[this.define] !== void 0;
    return this.not && (condition = !condition), condition;
  }
}, ShaderDefineOrOperator = class extends ShaderDefineExpression {
  isTrue(preprocessors) {
    return this.leftOperand.isTrue(preprocessors) || this.rightOperand.isTrue(preprocessors);
  }
}, ShaderDefineAndOperator = class extends ShaderDefineExpression {
  isTrue(preprocessors) {
    return this.leftOperand.isTrue(preprocessors) && this.rightOperand.isTrue(preprocessors);
  }
}, ShaderDefineArithmeticOperator = class extends ShaderDefineExpression {
  constructor(define, operand, testValue) {
    super(), this.define = define, this.operand = operand, this.testValue = testValue;
  }
  toString() {
    return `${this.define} ${this.operand} ${this.testValue}`;
  }
  isTrue(preprocessors) {
    let condition = !1;
    const left = parseInt(preprocessors[this.define] != null ? preprocessors[this.define] : this.define), right = parseInt(preprocessors[this.testValue] != null ? preprocessors[this.testValue] : this.testValue);
    if (isNaN(left) || isNaN(right)) return !1;
    switch (this.operand) {
      case ">":
        condition = left > right;
        break;
      case "<":
        condition = left < right;
        break;
      case "<=":
        condition = left <= right;
        break;
      case ">=":
        condition = left >= right;
        break;
      case "==":
        condition = left === right;
        break;
      case "!=":
        condition = left !== right;
        break;
    }
    return condition;
  }
}, RegexSe = /defined\s*?\((.+?)\)/g, RegexSeRevert = /defined\s*?\[(.+?)\]/g, RegexShaderInclude = /#include\s?<(.+)>(\((.*)\))*(\[(.*)\])*/g, RegexShaderDecl = /__decl__/, RegexLightX = /light\{X\}.(\w*)/g, RegexX = /\{X\}/g, ReusableMatches = [], MoveCursorRegex = /(#ifdef)|(#else)|(#elif)|(#endif)|(#ifndef)|(#if)/;
function Initialize(options) {
  options.processor && options.processor.initializeShaders && options.processor.initializeShaders(options.processingContext);
}
function Process(sourceCode, options, callback, engine) {
  options.processor?.preProcessShaderCode && (sourceCode = options.processor.preProcessShaderCode(sourceCode, options.isFragment)), ProcessIncludes(sourceCode, options, (codeWithIncludes) => {
    options.processCodeAfterIncludes && (codeWithIncludes = options.processCodeAfterIncludes(options.isFragment ? "fragment" : "vertex", codeWithIncludes, options.defines)), callback(ProcessShaderConversion(codeWithIncludes, options, engine), codeWithIncludes);
  });
}
function Finalize(vertexCode, fragmentCode, options) {
  return !options.processor || !options.processor.finalizeShaders ? {
    vertexCode,
    fragmentCode
  } : options.processor.finalizeShaders(vertexCode, fragmentCode, options.processingContext);
}
function ProcessPrecision(source, options) {
  if (options.processor?.noPrecision) return source;
  const shouldUseHighPrecisionShader = options.shouldUseHighPrecisionShader;
  return source.indexOf("precision highp float") === -1 ? shouldUseHighPrecisionShader ? source = `precision highp float;
` + source : source = `precision mediump float;
` + source : shouldUseHighPrecisionShader || (source = source.replace("precision highp float", "precision mediump float")), source;
}
function ExtractOperation(expression) {
  const match = /defined\((.+)\)/.exec(expression);
  if (match && match.length) return new ShaderDefineIsDefinedOperator(match[1].trim(), expression[0] === "!");
  const operators = [
    "==",
    "!=",
    ">=",
    "<=",
    "<",
    ">"
  ];
  let operator = "", indexOperator = 0;
  for (operator of operators)
    if (indexOperator = expression.indexOf(operator), indexOperator > -1) break;
  if (indexOperator === -1) return new ShaderDefineIsDefinedOperator(expression);
  const define = expression.substring(0, indexOperator).trim(), value = expression.substring(indexOperator + operator.length).trim();
  return new ShaderDefineArithmeticOperator(define, operator, value);
}
function BuildSubExpression(expression) {
  expression = expression.replace(RegexSe, "defined[$1]");
  const postfix = ShaderDefineExpression.infixToPostfix(expression), stack = [];
  for (const c of postfix) if (c !== "||" && c !== "&&") stack.push(c);
  else if (stack.length >= 2) {
    let v1 = stack[stack.length - 1], v2 = stack[stack.length - 2];
    stack.length -= 2;
    const operator = c == "&&" ? new ShaderDefineAndOperator() : new ShaderDefineOrOperator();
    typeof v1 == "string" && (v1 = v1.replace(RegexSeRevert, "defined($1)")), typeof v2 == "string" && (v2 = v2.replace(RegexSeRevert, "defined($1)")), operator.leftOperand = typeof v2 == "string" ? ExtractOperation(v2) : v2, operator.rightOperand = typeof v1 == "string" ? ExtractOperation(v1) : v1, stack.push(operator);
  }
  let result = stack[stack.length - 1];
  return typeof result == "string" && (result = result.replace(RegexSeRevert, "defined($1)")), typeof result == "string" ? ExtractOperation(result) : result;
}
function BuildExpression(line, start) {
  const node = new ShaderCodeTestNode(), command = line.substring(0, start);
  let expression = line.substring(start);
  return expression = expression.substring(0, (expression.indexOf("//") + 1 || expression.length + 1) - 1).trim(), command === "#ifdef" ? node.testExpression = new ShaderDefineIsDefinedOperator(expression) : command === "#ifndef" ? node.testExpression = new ShaderDefineIsDefinedOperator(expression, !0) : node.testExpression = BuildSubExpression(expression), node;
}
function MoveCursorWithinIf(cursor, rootNode, ifNode, preProcessorsFromCode) {
  let line;
  for (; MoveCursor(cursor, ifNode, preProcessorsFromCode); ) {
    line = cursor.currentLine;
    const first5 = line.substring(0, 5).toLowerCase();
    if (first5 === "#else") {
      const elseNode = new ShaderCodeNode();
      rootNode.children.push(elseNode), MoveCursor(cursor, elseNode, preProcessorsFromCode);
      return;
    } else if (first5 === "#elif") {
      const elifNode = BuildExpression(line, 5);
      rootNode.children.push(elifNode), ifNode = elifNode;
    }
  }
}
function MoveCursor(cursor, rootNode, preProcessorsFromCode) {
  for (; cursor.canRead; ) {
    cursor.lineIndex++;
    const line = cursor.currentLine;
    if (line.indexOf("#") >= 0) {
      const matches = MoveCursorRegex.exec(line);
      if (matches && matches.length) {
        switch (matches[0]) {
          case "#ifdef": {
            const newRootNode = new ShaderCodeConditionNode();
            rootNode.children.push(newRootNode);
            const ifNode = BuildExpression(line, 6);
            newRootNode.children.push(ifNode), MoveCursorWithinIf(cursor, newRootNode, ifNode, preProcessorsFromCode);
            break;
          }
          case "#else":
          case "#elif":
            return !0;
          case "#endif":
            return !1;
          case "#ifndef": {
            const newRootNode = new ShaderCodeConditionNode();
            rootNode.children.push(newRootNode);
            const ifNode = BuildExpression(line, 7);
            newRootNode.children.push(ifNode), MoveCursorWithinIf(cursor, newRootNode, ifNode, preProcessorsFromCode);
            break;
          }
          case "#if": {
            const newRootNode = new ShaderCodeConditionNode(), ifNode = BuildExpression(line, 3);
            rootNode.children.push(newRootNode), newRootNode.children.push(ifNode), MoveCursorWithinIf(cursor, newRootNode, ifNode, preProcessorsFromCode);
            break;
          }
        }
        continue;
      }
    }
    const newNode = new ShaderCodeNode();
    if (newNode.line = line, rootNode.children.push(newNode), line[0] === "#" && line[1] === "d") {
      const split = line.replace(";", "").split(" ");
      newNode.additionalDefineKey = split[1], split.length === 3 && (newNode.additionalDefineValue = split[2]);
    }
  }
  return !1;
}
function EvaluatePreProcessors(sourceCode, preprocessors, options, preProcessorsFromCode) {
  const rootNode = new ShaderCodeNode(), cursor = new ShaderCodeCursor();
  return cursor.lineIndex = -1, cursor.lines = sourceCode.split(`
`), MoveCursor(cursor, rootNode, preProcessorsFromCode), rootNode.process(preprocessors, options, preProcessorsFromCode);
}
function PreparePreProcessors(options, engine) {
  const defines = options.defines, preprocessors = {};
  for (const define of defines) {
    const split = define.replace("#define", "").replace(";", "").trim().split(" ");
    preprocessors[split[0]] = split.length > 1 ? split[1] : "";
  }
  return options.processor?.shaderLanguage === 0 && (preprocessors.GL_ES = "true"), preprocessors.__VERSION__ = options.version, preprocessors[options.platformName] = "true", _GetGlobalDefines(preprocessors, engine?.isNDCHalfZRange, engine?.useReverseDepthBuffer, engine?.useExactSrgbConversions), preprocessors;
}
function ProcessShaderConversion(sourceCode, options, engine) {
  let preparedSourceCode = ProcessPrecision(sourceCode, options);
  if (!options.processor || options.processor.shaderLanguage === 0 && preparedSourceCode.indexOf("#version 3") !== -1 && (preparedSourceCode = preparedSourceCode.replace("#version 300 es", ""), !options.processor.parseGLES3))
    return preparedSourceCode;
  const defines = options.defines, preprocessors = PreparePreProcessors(options, engine);
  options.processor.preProcessor && (preparedSourceCode = options.processor.preProcessor(preparedSourceCode, defines, preprocessors, options.isFragment, options.processingContext));
  const preProcessorsFromCode = {};
  return preparedSourceCode = EvaluatePreProcessors(preparedSourceCode, preprocessors, options, preProcessorsFromCode), options.processor.postProcessor && (preparedSourceCode = options.processor.postProcessor(preparedSourceCode, defines, options.isFragment, options.processingContext, engine ? { drawBuffersExtensionDisabled: !engine.getCaps().drawBuffersExtension } : {}, preprocessors, preProcessorsFromCode)), engine?._features.needShaderCodeInlining && (preparedSourceCode = engine.inlineShaderCode(preparedSourceCode)), preparedSourceCode;
}
function ProcessIncludes(sourceCode, options, callback) {
  ReusableMatches.length = 0;
  let match;
  for (; (match = RegexShaderInclude.exec(sourceCode)) !== null; ) ReusableMatches.push(match);
  let parts = [sourceCode], keepProcessing = !1;
  for (const match2 of ReusableMatches) {
    let includeFile = match2[1];
    if (includeFile.indexOf("__decl__") !== -1 && (includeFile = includeFile.replace(RegexShaderDecl, ""), options.supportsUniformBuffers && (includeFile = includeFile.replace("Vertex", "Ubo").replace("Fragment", "Ubo")), includeFile = includeFile + "Declaration"), options.includesShadersStore[includeFile]) {
      let includeContent = options.includesShadersStore[includeFile];
      if (match2[2]) {
        const splits = match2[3].split(",");
        for (let index = 0; index < splits.length; index += 2) {
          const source = new RegExp(splits[index], "g"), dest = splits[index + 1];
          includeContent = includeContent.replace(source, dest);
        }
      }
      if (match2[4]) {
        const indexString = match2[5];
        if (indexString.indexOf("..") !== -1) {
          const indexSplits = indexString.split(".."), minIndex = parseInt(indexSplits[0]);
          let maxIndex = parseInt(indexSplits[1]), sourceIncludeContent = includeContent.slice(0);
          includeContent = "", isNaN(maxIndex) && (maxIndex = options.indexParameters[indexSplits[1]]);
          for (let i = minIndex; i < maxIndex; i++)
            options.supportsUniformBuffers || (sourceIncludeContent = sourceIncludeContent.replace(RegexLightX, (str, p1) => p1 + "{X}")), includeContent += sourceIncludeContent.replace(RegexX, i.toString()) + `
`;
        } else
          options.supportsUniformBuffers || (includeContent = includeContent.replace(RegexLightX, (str, p1) => p1 + "{X}")), includeContent = includeContent.replace(RegexX, indexString);
      }
      const newParts = [];
      for (const part of parts) {
        const splitPart = part.split(match2[0]);
        for (let i = 0; i < splitPart.length - 1; i++)
          newParts.push(splitPart[i]), newParts.push(includeContent);
        newParts.push(splitPart[splitPart.length - 1]);
      }
      parts = newParts, keepProcessing = keepProcessing || includeContent.indexOf("#include<") >= 0 || includeContent.indexOf("#include <") >= 0;
    } else {
      const includeShaderUrl = options.shadersRepository + "ShadersInclude/" + includeFile + ".fx";
      _FunctionContainer.loadFile(includeShaderUrl, (fileContent) => {
        options.includesShadersStore[includeFile] = fileContent, ProcessIncludes(parts.join(""), options, callback);
      });
      return;
    }
  }
  ReusableMatches.length = 0;
  const returnValue = parts.join("");
  keepProcessing ? ProcessIncludes(returnValue.toString(), options, callback) : callback(returnValue);
}
var _FunctionContainer = { loadFile: (url, onSuccess, onProgress, offlineProvider, useArrayBuffer, onError) => {
  throw _WarnImport("FileTools");
} }, ImmediateQueue = [], TimingTools = class {
  static SetImmediate(action) {
    ImmediateQueue.length === 0 && setTimeout(() => {
      const functionsToCall = ImmediateQueue;
      ImmediateQueue = [];
      for (const func of functionsToCall) func();
    }, 1), ImmediateQueue.push(action);
  }
};
function RunWithCondition(condition, onSuccess, onError) {
  try {
    if (condition())
      return onSuccess(), !0;
  } catch (e) {
    return onError?.(e), !0;
  }
  return !1;
}
var _RetryWithInterval = (condition, onSuccess, onError, step = 16, maxTimeout = 3e4, checkConditionOnCall = !0, additionalStringOnTimeout) => {
  if (checkConditionOnCall && RunWithCondition(condition, onSuccess, onError))
    return null;
  const int = setInterval(() => {
    RunWithCondition(condition, onSuccess, onError) ? clearInterval(int) : (maxTimeout -= step, maxTimeout < 0 && (clearInterval(int), onError?.(/* @__PURE__ */ new Error("Operation timed out after maximum retries. " + (additionalStringOnTimeout || "")), !0)));
  }, step);
  return () => clearInterval(int);
};
function GetFloatValue(dataView, type, byteOffset, normalized) {
  switch (type) {
    case 5120: {
      let value = dataView.getInt8(byteOffset);
      return normalized && (value = Math.max(value / 127, -1)), value;
    }
    case 5121: {
      let value = dataView.getUint8(byteOffset);
      return normalized && (value = value / 255), value;
    }
    case 5122: {
      let value = dataView.getInt16(byteOffset, !0);
      return normalized && (value = Math.max(value / 32767, -1)), value;
    }
    case 5123: {
      let value = dataView.getUint16(byteOffset, !0);
      return normalized && (value = value / 65535), value;
    }
    case 5131:
      return FromHalfFloat(dataView.getUint16(byteOffset, !0));
    case 5124:
      return dataView.getInt32(byteOffset, !0);
    case 5125:
      return dataView.getUint32(byteOffset, !0);
    case 5126:
      return dataView.getFloat32(byteOffset, !0);
    default:
      throw new Error(`Invalid component type ${type}`);
  }
}
function SetFloatValue(dataView, type, byteOffset, normalized, value) {
  switch (type) {
    case 5120:
      normalized && (value = Math.round(value * 127)), dataView.setInt8(byteOffset, value);
      break;
    case 5121:
      normalized && (value = Math.round(value * 255)), dataView.setUint8(byteOffset, value);
      break;
    case 5122:
      normalized && (value = Math.round(value * 32767)), dataView.setInt16(byteOffset, value, !0);
      break;
    case 5123:
      normalized && (value = Math.round(value * 65535)), dataView.setUint16(byteOffset, value, !0);
      break;
    case 5131:
      dataView.setUint16(byteOffset, ToHalfFloat(value), !0);
      break;
    case 5124:
      dataView.setInt32(byteOffset, value, !0);
      break;
    case 5125:
      dataView.setUint32(byteOffset, value, !0);
      break;
    case 5126:
      dataView.setFloat32(byteOffset, value, !0);
      break;
    default:
      throw new Error(`Invalid component type ${type}`);
  }
}
function GetTypeByteLength(type) {
  switch (type) {
    case 5120:
    case 5121:
      return 1;
    case 5122:
    case 5123:
    case 5131:
      return 2;
    case 5124:
    case 5125:
    case 5126:
      return 4;
    default:
      throw new Error(`Invalid type '${type}'`);
  }
}
function GetTypedArrayConstructor(componentType) {
  switch (componentType) {
    case 5120:
      return Int8Array;
    case 5121:
      return Uint8Array;
    case 5122:
      return Int16Array;
    case 5123:
      return Uint16Array;
    case 5131:
      return Uint16Array;
    case 5124:
      return Int32Array;
    case 5125:
      return Uint32Array;
    case 5126:
      return Float32Array;
    default:
      throw new Error(`Invalid component type '${componentType}'`);
  }
}
function EnumerateFloatValues(data, byteOffset, byteStride, componentCount, componentType, count, normalized, callback) {
  const oldValues = new Array(componentCount), newValues = new Array(componentCount);
  if (data instanceof Array) {
    let offset = byteOffset / 4;
    const stride = byteStride / 4;
    for (let index = 0; index < count; index += componentCount) {
      for (let componentIndex = 0; componentIndex < componentCount; componentIndex++) oldValues[componentIndex] = newValues[componentIndex] = data[offset + componentIndex];
      callback(newValues, index);
      for (let componentIndex = 0; componentIndex < componentCount; componentIndex++) oldValues[componentIndex] !== newValues[componentIndex] && (data[offset + componentIndex] = newValues[componentIndex]);
      offset += stride;
    }
  } else {
    const dataView = ArrayBuffer.isView(data) ? new DataView(data.buffer, data.byteOffset, data.byteLength) : new DataView(data), componentByteLength = GetTypeByteLength(componentType);
    for (let index = 0; index < count; index += componentCount) {
      for (let componentIndex = 0, componentByteOffset = byteOffset; componentIndex < componentCount; componentIndex++, componentByteOffset += componentByteLength) oldValues[componentIndex] = newValues[componentIndex] = GetFloatValue(dataView, componentType, componentByteOffset, normalized);
      callback(newValues, index);
      for (let componentIndex = 0, componentByteOffset = byteOffset; componentIndex < componentCount; componentIndex++, componentByteOffset += componentByteLength) oldValues[componentIndex] !== newValues[componentIndex] && SetFloatValue(dataView, componentType, componentByteOffset, normalized, newValues[componentIndex]);
      byteOffset += byteStride;
    }
  }
}
function GetFloatData(data, size, type, byteOffset, byteStride, normalized, totalVertices, forceCopy) {
  const tightlyPackedByteStride = size * GetTypeByteLength(type), count = totalVertices * size;
  if (type !== 5126 || byteStride !== tightlyPackedByteStride) {
    const copy = new Float32Array(count);
    return EnumerateFloatValues(data, byteOffset, byteStride, size, type, count, normalized, (values, index) => {
      for (let i = 0; i < size; i++) copy[index + i] = values[i];
    }), copy;
  }
  if (!(data instanceof Array || data instanceof Float32Array) || byteOffset !== 0 || data.length !== count) if (data instanceof Array) {
    const offset = byteOffset / 4;
    return data.slice(offset, offset + count);
  } else if (ArrayBuffer.isView(data)) {
    const offset = data.byteOffset + byteOffset;
    return (offset & 3) !== 0 && (Logger.Warn("Float array must be aligned to 4-bytes border"), forceCopy = !0), forceCopy ? new Float32Array(data.buffer.slice(offset, offset + count * Float32Array.BYTES_PER_ELEMENT)) : new Float32Array(data.buffer, offset, count);
  } else return new Float32Array(data, byteOffset, count);
  return forceCopy ? data.slice() : data;
}
function GetTypedArrayData(data, size, type, byteOffset, byteStride, totalVertices, forceCopy) {
  const typeByteLength = GetTypeByteLength(type), constructor = GetTypedArrayConstructor(type), count = totalVertices * size;
  if (Array.isArray(data)) {
    if ((byteOffset & 3) !== 0 || (byteStride & 3) !== 0) throw new Error("byteOffset and byteStride must be a multiple of 4 for number[] data.");
    const offset = byteOffset / 4, stride = byteStride / 4;
    if (offset + (totalVertices - 1) * stride + size > data.length) throw new Error("Last accessed index is out of bounds.");
    if (stride < size) throw new Error("Data stride cannot be smaller than the component size.");
    if (stride !== size) {
      const copy = new constructor(count);
      return EnumerateFloatValues(data, byteOffset, byteStride, size, type, count, !1, (values, index) => {
        for (let i = 0; i < size; i++) copy[index + i] = values[i];
      }), copy;
    }
    return new constructor(data.slice(offset, offset + count));
  }
  let buffer, adjustedByteOffset = byteOffset;
  if (ArrayBuffer.isView(data) ? (buffer = data.buffer, adjustedByteOffset += data.byteOffset) : buffer = data, adjustedByteOffset + (totalVertices - 1) * byteStride + size * typeByteLength > buffer.byteLength) throw new Error("Last accessed byte is out of bounds.");
  const tightlyPackedByteStride = size * typeByteLength;
  if (byteStride < tightlyPackedByteStride) throw new Error("Byte stride cannot be smaller than the component's byte size.");
  if (byteStride !== tightlyPackedByteStride) {
    const copy = new constructor(count), src = new Uint8Array(buffer, adjustedByteOffset), dst = new Uint8Array(copy.buffer), rowBytes = size * typeByteLength;
    for (let v = 0, s = 0, d = 0; v < totalVertices; v++, s += byteStride, d += rowBytes) dst.set(src.subarray(s, s + rowBytes), d);
    return copy;
  }
  return typeByteLength !== 1 && (adjustedByteOffset & typeByteLength - 1) !== 0 && (Logger.Warn("Array must be aligned to border of element size. Data will be copied."), forceCopy = !0), forceCopy ? new constructor(buffer.slice(adjustedByteOffset, adjustedByteOffset + count * typeByteLength)) : new constructor(buffer, adjustedByteOffset, count);
}
function CopyFloatData(input, size, type, byteOffset, byteStride, normalized, totalVertices, output) {
  const tightlyPackedByteStride = size * GetTypeByteLength(type), count = totalVertices * size;
  if (output.length !== count) throw new Error("Output length is not valid");
  if (type !== 5126 || byteStride !== tightlyPackedByteStride) {
    EnumerateFloatValues(input, byteOffset, byteStride, size, type, count, normalized, (values, index) => {
      for (let i = 0; i < size; i++) output[index + i] = values[i];
    });
    return;
  }
  if (input instanceof Array) {
    const offset = byteOffset / 4;
    output.set(input, offset);
  } else if (ArrayBuffer.isView(input)) {
    const offset = input.byteOffset + byteOffset;
    if ((offset & 3) !== 0) {
      Logger.Warn("Float array must be aligned to 4-bytes border"), output.set(new Float32Array(input.buffer.slice(offset, offset + count * Float32Array.BYTES_PER_ELEMENT)));
      return;
    }
    const floatData = new Float32Array(input.buffer, offset, count);
    output.set(floatData);
  } else {
    const floatData = new Float32Array(input, byteOffset, count);
    output.set(floatData);
  }
}
function GetBlobBufferSource(view) {
  const buffer = view.buffer;
  if (buffer instanceof ArrayBuffer) return view;
  const unsharedBuffer = new ArrayBuffer(view.byteLength);
  return new Uint8Array(unsharedBuffer).set(new Uint8Array(buffer, view.byteOffset, view.byteLength)), unsharedBuffer;
}
function RandomGUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    return (c === "x" ? r : r & 3 | 8).toString(16);
  });
}
export {
  _WarnImport as C,
  IsNavigatorAvailable as D,
  IsDocumentAvailable as E,
  IsWindowObjectExist as O,
  _MissingSideEffectProperty as S,
  GetDOMTextContent as T,
  _GetGlobalDefines as _,
  GetFloatData as a,
  _IsSideEffectImplemented as b,
  TimingTools as c,
  Initialize as d,
  Process as f,
  _ConcatenateShader as g,
  EngineFunctionContext as h,
  GetBlobBufferSource as i,
  _RetryWithInterval as l,
  _FunctionContainer as m,
  CopyFloatData as n,
  GetTypeByteLength as o,
  ProcessIncludes as p,
  EnumerateFloatValues as r,
  GetTypedArrayData as s,
  RandomGUID as t,
  Finalize as u,
  _LoadFile as v,
  PrecisionDate as w,
  _MissingSideEffect as x,
  allocateAndCopyTypedBuffer as y
};
