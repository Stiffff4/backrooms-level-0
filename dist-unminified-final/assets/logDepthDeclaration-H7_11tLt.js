import { t as ShaderStore } from "./shaderStore-CeBEoMrR.js";
//#region node_modules/@babylonjs/core/Shaders/ShadersInclude/sceneUboDeclaration.js
var name$4 = "sceneUboDeclaration";
var shader$4 = `layout(std140,column_major) uniform;uniform Scene {mat4 viewProjection;
#ifdef MULTIVIEW
mat4 viewProjectionR;
#endif 
mat4 view;mat4 projection;vec4 vEyePosition;mat4 inverseProjection;};
`;
if (!ShaderStore.IncludesShadersStore[name$4]) ShaderStore.IncludesShadersStore[name$4] = shader$4;
/** @internal */
var sceneUboDeclaration = {
	name: name$4,
	shader: shader$4
};
//#endregion
//#region node_modules/@babylonjs/core/Shaders/ShadersInclude/meshUboDeclaration.js
var name$3 = "meshUboDeclaration";
var shader$3 = `#ifdef WEBGL2
uniform mat4 world;uniform float visibility;
#else
layout(std140,column_major) uniform;uniform Mesh
{mat4 world;float visibility;};
#endif
#define WORLD_UBO
`;
if (!ShaderStore.IncludesShadersStore[name$3]) ShaderStore.IncludesShadersStore[name$3] = shader$3;
/** @internal */
var meshUboDeclaration = {
	name: name$3,
	shader: shader$3
};
//#endregion
//#region node_modules/@babylonjs/core/Shaders/ShadersInclude/defaultUboDeclaration.js
var name$2 = "defaultUboDeclaration";
var shader$2 = `layout(std140,column_major) uniform;uniform Material
{vec4 diffuseLeftColor;vec4 diffuseRightColor;vec4 opacityParts;vec4 reflectionLeftColor;vec4 reflectionRightColor;vec4 refractionLeftColor;vec4 refractionRightColor;vec4 emissiveLeftColor;vec4 emissiveRightColor;vec2 vDiffuseInfos;vec2 vAmbientInfos;vec2 vOpacityInfos;vec2 vEmissiveInfos;vec2 vLightmapInfos;vec2 vSpecularInfos;vec3 vBumpInfos;mat4 diffuseMatrix;mat4 ambientMatrix;mat4 opacityMatrix;mat4 emissiveMatrix;mat4 lightmapMatrix;mat4 specularMatrix;mat4 bumpMatrix;vec2 vTangentSpaceParams;float pointSize;float alphaCutOff;mat4 refractionMatrix;vec4 vRefractionInfos;vec3 vRefractionPosition;vec3 vRefractionSize;vec4 vSpecularColor;vec3 vEmissiveColor;vec4 vDiffuseColor;vec3 vAmbientColor;vec4 cameraInfo;vec4 vTextureRepetitionHexTilingParams;vec2 vReflectionInfos;mat4 reflectionMatrix;vec3 vReflectionPosition;vec3 vReflectionSize;
#define ADDITIONAL_UBO_DECLARATION
};
#include<sceneUboDeclaration>
#include<meshUboDeclaration>
`;
if (!ShaderStore.IncludesShadersStore[name$2]) ShaderStore.IncludesShadersStore[name$2] = shader$2;
/** @internal */
var defaultUboDeclaration = {
	name: name$2,
	shader: shader$2
};
//#endregion
//#region node_modules/@babylonjs/core/Shaders/ShadersInclude/mainUVVaryingDeclaration.js
var name$1 = "mainUVVaryingDeclaration";
var shader$1 = `#ifdef MAINUV{X}
varying vec2 vMainUV{X};
#endif
`;
if (!ShaderStore.IncludesShadersStore[name$1]) ShaderStore.IncludesShadersStore[name$1] = shader$1;
/** @internal */
var mainUVVaryingDeclaration = {
	name: name$1,
	shader: shader$1
};
//#endregion
//#region node_modules/@babylonjs/core/Shaders/ShadersInclude/logDepthDeclaration.js
var name = "logDepthDeclaration";
var shader = `#ifdef LOGARITHMICDEPTH
uniform float logarithmicDepthConstant;varying float vFragmentDepth;
#endif
`;
if (!ShaderStore.IncludesShadersStore[name]) ShaderStore.IncludesShadersStore[name] = shader;
/** @internal */
var logDepthDeclaration = {
	name,
	shader
};
//#endregion
export { sceneUboDeclaration as a, meshUboDeclaration as i, mainUVVaryingDeclaration as n, defaultUboDeclaration as r, logDepthDeclaration as t };
