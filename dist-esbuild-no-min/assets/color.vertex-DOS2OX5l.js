import { t as ShaderStore } from "./shaderStore-Bfhtreha.js";
import { a as bonesVertexWGSL, c as fogVertexDeclarationWGSL, d as bonesDeclarationWGSL, i as bakedVertexAnimationWGSL, l as clipPlaneVertexDeclarationWGSL, n as fogVertexWGSL, o as instancesVertexWGSL, r as clipPlaneVertexWGSL, s as instancesDeclarationWGSL, t as vertexColorMixingWGSL, u as bakedVertexAnimationDeclarationWGSL } from "./vertexColorMixing-Cc-GRpvO.js";
var name = "colorVertexShader";
var shader = `attribute position: vec3f;
#ifdef VERTEXCOLOR
attribute color: vec4f;
#endif
#include<bonesDeclaration>
#include<bakedVertexAnimationDeclaration>
#include<clipPlaneVertexDeclaration>
#include<fogVertexDeclaration>
#ifdef FOG
uniform view: mat4x4f;
#endif
#include<instancesDeclaration>
uniform viewProjection: mat4x4f;
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
varying vColor: vec4f;
#endif
#define CUSTOM_VERTEX_DEFINITIONS
@vertex
fn main(input : VertexInputs)->FragmentInputs {
#define CUSTOM_VERTEX_MAIN_BEGIN
#ifdef VERTEXCOLOR
var colorUpdated: vec4f=vertexInputs.color;
#endif
#include<instancesVertex>
#include<bonesVertex>
#include<bakedVertexAnimation>
var worldPos: vec4f=finalWorld* vec4f(vertexInputs.position,1.0);vertexOutputs.position=uniforms.viewProjection*worldPos;
#include<clipPlaneVertex>
#include<fogVertex>
#include<vertexColorMixing>
#define CUSTOM_VERTEX_MAIN_END
}`;
if (!ShaderStore.ShadersStoreWGSL[name]) ShaderStore.ShadersStoreWGSL[name] = shader;
var includes = [
  bonesDeclarationWGSL,
  bakedVertexAnimationDeclarationWGSL,
  clipPlaneVertexDeclarationWGSL,
  fogVertexDeclarationWGSL,
  instancesDeclarationWGSL,
  instancesVertexWGSL,
  bonesVertexWGSL,
  bakedVertexAnimationWGSL,
  clipPlaneVertexWGSL,
  fogVertexWGSL,
  vertexColorMixingWGSL
];
for (const inc of includes) if (!ShaderStore.IncludesShadersStoreWGSL[inc.name]) ShaderStore.IncludesShadersStoreWGSL[inc.name] = inc.shader;
var colorVertexShaderWGSL = {
  name,
  shader
};
export {
  colorVertexShaderWGSL
};
