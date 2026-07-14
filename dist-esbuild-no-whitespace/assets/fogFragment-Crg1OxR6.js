import { t as ShaderStore } from "./shaderStore-Bfhtreha.js";
var name$3 = "clipPlaneFragmentDeclaration", shader$3 = `#ifdef CLIPPLANE
varying fClipDistance: f32;
#endif
#ifdef CLIPPLANE2
varying fClipDistance2: f32;
#endif
#ifdef CLIPPLANE3
varying fClipDistance3: f32;
#endif
#ifdef CLIPPLANE4
varying fClipDistance4: f32;
#endif
#ifdef CLIPPLANE5
varying fClipDistance5: f32;
#endif
#ifdef CLIPPLANE6
varying fClipDistance6: f32;
#endif
`;
ShaderStore.IncludesShadersStoreWGSL[name$3] || (ShaderStore.IncludesShadersStoreWGSL[name$3] = shader$3);
var clipPlaneFragmentDeclarationWGSL = {
  name: name$3,
  shader: shader$3
}, name$2 = "fogFragmentDeclaration", shader$2 = `#ifdef FOG
#define FOGMODE_NONE 0.
#define FOGMODE_EXP 1.
#define FOGMODE_EXP2 2.
#define FOGMODE_LINEAR 3.
const E=2.71828;uniform vFogInfos: vec4f;uniform vFogColor: vec3f;varying vFogDistance: vec3f;fn CalcFogFactor()->f32
{var fogCoeff: f32=1.0;var fogStart: f32=uniforms.vFogInfos.y;var fogEnd: f32=uniforms.vFogInfos.z;var fogDensity: f32=uniforms.vFogInfos.w;var fogDistance: f32=length(fragmentInputs.vFogDistance);if (FOGMODE_LINEAR==uniforms.vFogInfos.x)
{fogCoeff=(fogEnd-fogDistance)/(fogEnd-fogStart);}
else if (FOGMODE_EXP==uniforms.vFogInfos.x)
{fogCoeff=1.0/pow(E,fogDistance*fogDensity);}
else if (FOGMODE_EXP2==uniforms.vFogInfos.x)
{fogCoeff=1.0/pow(E,fogDistance*fogDistance*fogDensity*fogDensity);}
return clamp(fogCoeff,0.0,1.0);}
#endif
`;
ShaderStore.IncludesShadersStoreWGSL[name$2] || (ShaderStore.IncludesShadersStoreWGSL[name$2] = shader$2);
var fogFragmentDeclarationWGSL = {
  name: name$2,
  shader: shader$2
}, name$1 = "clipPlaneFragment", shader$1 = `#if defined(CLIPPLANE) || defined(CLIPPLANE2) || defined(CLIPPLANE3) || defined(CLIPPLANE4) || defined(CLIPPLANE5) || defined(CLIPPLANE6)
if (false) {}
#endif
#ifdef CLIPPLANE
else if (fragmentInputs.fClipDistance>0.0)
{discard;}
#endif
#ifdef CLIPPLANE2
else if (fragmentInputs.fClipDistance2>0.0)
{discard;}
#endif
#ifdef CLIPPLANE3
else if (fragmentInputs.fClipDistance3>0.0)
{discard;}
#endif
#ifdef CLIPPLANE4
else if (fragmentInputs.fClipDistance4>0.0)
{discard;}
#endif
#ifdef CLIPPLANE5
else if (fragmentInputs.fClipDistance5>0.0)
{discard;}
#endif
#ifdef CLIPPLANE6
else if (fragmentInputs.fClipDistance6>0.0)
{discard;}
#endif
`;
ShaderStore.IncludesShadersStoreWGSL[name$1] || (ShaderStore.IncludesShadersStoreWGSL[name$1] = shader$1);
var clipPlaneFragmentWGSL = {
  name: name$1,
  shader: shader$1
}, name = "fogFragment", shader = `#ifdef FOG
var fog: f32=CalcFogFactor();
#ifdef PBR
fog=toLinearSpace(fog);
#endif
color= vec4f(mix(uniforms.vFogColor,color.rgb,fog),color.a);
#endif
`;
ShaderStore.IncludesShadersStoreWGSL[name] || (ShaderStore.IncludesShadersStoreWGSL[name] = shader);
var fogFragmentWGSL = {
  name,
  shader
};
export {
  clipPlaneFragmentDeclarationWGSL as i,
  clipPlaneFragmentWGSL as n,
  fogFragmentDeclarationWGSL as r,
  fogFragmentWGSL as t
};
