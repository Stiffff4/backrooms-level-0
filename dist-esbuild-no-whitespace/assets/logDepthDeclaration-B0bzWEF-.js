import { t as ShaderStore } from "./shaderStore-Bfhtreha.js";
var name$4 = "sceneUboDeclaration", shader$4 = `struct Scene {viewProjection : mat4x4<f32>,
#ifdef MULTIVIEW
viewProjectionR : mat4x4<f32>,
#endif 
view : mat4x4<f32>,
projection : mat4x4<f32>,
vEyePosition : vec4<f32>,
inverseProjection : mat4x4<f32>,};
#define SCENE_UBO
var<uniform> scene : Scene;
`;
ShaderStore.IncludesShadersStoreWGSL[name$4] || (ShaderStore.IncludesShadersStoreWGSL[name$4] = shader$4);
var sceneUboDeclarationWGSL = {
  name: name$4,
  shader: shader$4
}, name$3 = "meshUboDeclaration", shader$3 = `struct Mesh {world : mat4x4<f32>,
visibility : f32,};var<uniform> mesh : Mesh;
#define WORLD_UBO
`;
ShaderStore.IncludesShadersStoreWGSL[name$3] || (ShaderStore.IncludesShadersStoreWGSL[name$3] = shader$3);
var meshUboDeclarationWGSL = {
  name: name$3,
  shader: shader$3
}, name$2 = "defaultUboDeclaration", shader$2 = `uniform diffuseLeftColor: vec4f;uniform diffuseRightColor: vec4f;uniform opacityParts: vec4f;uniform reflectionLeftColor: vec4f;uniform reflectionRightColor: vec4f;uniform refractionLeftColor: vec4f;uniform refractionRightColor: vec4f;uniform emissiveLeftColor: vec4f;uniform emissiveRightColor: vec4f;uniform vDiffuseInfos: vec2f;uniform vAmbientInfos: vec2f;uniform vOpacityInfos: vec2f;uniform vEmissiveInfos: vec2f;uniform vLightmapInfos: vec2f;uniform vSpecularInfos: vec2f;uniform vBumpInfos: vec3f;uniform diffuseMatrix: mat4x4f;uniform ambientMatrix: mat4x4f;uniform opacityMatrix: mat4x4f;uniform emissiveMatrix: mat4x4f;uniform lightmapMatrix: mat4x4f;uniform specularMatrix: mat4x4f;uniform bumpMatrix: mat4x4f;uniform vTangentSpaceParams: vec2f;uniform pointSize: f32;uniform alphaCutOff: f32;uniform refractionMatrix: mat4x4f;uniform vRefractionInfos: vec4f;uniform vRefractionPosition: vec3f;uniform vRefractionSize: vec3f;uniform vSpecularColor: vec4f;uniform vEmissiveColor: vec3f;uniform vDiffuseColor: vec4f;uniform vAmbientColor: vec3f;uniform cameraInfo: vec4f;uniform vTextureRepetitionHexTilingParams: vec4f;uniform vReflectionInfos: vec2f;uniform reflectionMatrix: mat4x4f;uniform vReflectionPosition: vec3f;uniform vReflectionSize: vec3f;
#define ADDITIONAL_UBO_DECLARATION
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;
ShaderStore.IncludesShadersStoreWGSL[name$2] || (ShaderStore.IncludesShadersStoreWGSL[name$2] = shader$2);
var defaultUboDeclarationWGSL = {
  name: name$2,
  shader: shader$2
}, name$1 = "mainUVVaryingDeclaration", shader$1 = `#ifdef MAINUV{X}
varying vMainUV{X}: vec2f;
#endif
`;
ShaderStore.IncludesShadersStoreWGSL[name$1] || (ShaderStore.IncludesShadersStoreWGSL[name$1] = shader$1);
var mainUVVaryingDeclarationWGSL = {
  name: name$1,
  shader: shader$1
}, name = "logDepthDeclaration", shader = `#ifdef LOGARITHMICDEPTH
uniform logarithmicDepthConstant: f32;varying vFragmentDepth: f32;
#endif
`;
ShaderStore.IncludesShadersStoreWGSL[name] || (ShaderStore.IncludesShadersStoreWGSL[name] = shader);
var logDepthDeclarationWGSL = {
  name,
  shader
};
export {
  sceneUboDeclarationWGSL as a,
  meshUboDeclarationWGSL as i,
  mainUVVaryingDeclarationWGSL as n,
  defaultUboDeclarationWGSL as r,
  logDepthDeclarationWGSL as t
};
