import { t as ShaderStore } from "./shaderStore-CeBEoMrR.js";
//#region node_modules/@babylonjs/core/Shaders/ShadersInclude/clipPlaneFragmentDeclaration.js
var name$3 = "clipPlaneFragmentDeclaration";
var shader$3 = `#ifdef CLIPPLANE
varying float fClipDistance;
#endif
#ifdef CLIPPLANE2
varying float fClipDistance2;
#endif
#ifdef CLIPPLANE3
varying float fClipDistance3;
#endif
#ifdef CLIPPLANE4
varying float fClipDistance4;
#endif
#ifdef CLIPPLANE5
varying float fClipDistance5;
#endif
#ifdef CLIPPLANE6
varying float fClipDistance6;
#endif
`;
if (!ShaderStore.IncludesShadersStore[name$3]) ShaderStore.IncludesShadersStore[name$3] = shader$3;
/** @internal */
var clipPlaneFragmentDeclaration = {
	name: name$3,
	shader: shader$3
};
//#endregion
//#region node_modules/@babylonjs/core/Shaders/ShadersInclude/fogFragmentDeclaration.js
var name$2 = "fogFragmentDeclaration";
var shader$2 = `#ifdef FOG
#define FOGMODE_NONE 0.
#define FOGMODE_EXP 1.
#define FOGMODE_EXP2 2.
#define FOGMODE_LINEAR 3.
#define E 2.71828
uniform vec4 vFogInfos;uniform vec3 vFogColor;varying vec3 vFogDistance;float CalcFogFactor()
{float fogCoeff=1.0;float fogStart=vFogInfos.y;float fogEnd=vFogInfos.z;float fogDensity=vFogInfos.w;float fogDistance=length(vFogDistance);if (FOGMODE_LINEAR==vFogInfos.x)
{fogCoeff=(fogEnd-fogDistance)/(fogEnd-fogStart);}
else if (FOGMODE_EXP==vFogInfos.x)
{fogCoeff=1.0/pow(E,fogDistance*fogDensity);}
else if (FOGMODE_EXP2==vFogInfos.x)
{fogCoeff=1.0/pow(E,fogDistance*fogDistance*fogDensity*fogDensity);}
return clamp(fogCoeff,0.0,1.0);}
#endif
`;
if (!ShaderStore.IncludesShadersStore[name$2]) ShaderStore.IncludesShadersStore[name$2] = shader$2;
/** @internal */
var fogFragmentDeclaration = {
	name: name$2,
	shader: shader$2
};
//#endregion
//#region node_modules/@babylonjs/core/Shaders/ShadersInclude/clipPlaneFragment.js
var name$1 = "clipPlaneFragment";
var shader$1 = `#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
if (false) {}
#endif
#ifdef CLIPPLANE
else if (fClipDistance>0.0)
{discard;}
#endif
#ifdef CLIPPLANE2
else if (fClipDistance2>0.0)
{discard;}
#endif
#ifdef CLIPPLANE3
else if (fClipDistance3>0.0)
{discard;}
#endif
#ifdef CLIPPLANE4
else if (fClipDistance4>0.0)
{discard;}
#endif
#ifdef CLIPPLANE5
else if (fClipDistance5>0.0)
{discard;}
#endif
#ifdef CLIPPLANE6
else if (fClipDistance6>0.0)
{discard;}
#endif
`;
if (!ShaderStore.IncludesShadersStore[name$1]) ShaderStore.IncludesShadersStore[name$1] = shader$1;
/** @internal */
var clipPlaneFragment = {
	name: name$1,
	shader: shader$1
};
//#endregion
//#region node_modules/@babylonjs/core/Shaders/ShadersInclude/fogFragment.js
var name = "fogFragment";
var shader = `#ifdef FOG
float fog=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color.rgb=mix(vFogColor,color.rgb,fog);
#endif
`;
if (!ShaderStore.IncludesShadersStore[name]) ShaderStore.IncludesShadersStore[name] = shader;
/** @internal */
var fogFragment = {
	name,
	shader
};
//#endregion
export { clipPlaneFragmentDeclaration as i, clipPlaneFragment as n, fogFragmentDeclaration as r, fogFragment as t };
