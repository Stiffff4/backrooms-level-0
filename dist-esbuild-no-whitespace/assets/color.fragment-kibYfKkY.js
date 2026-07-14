import { t as ShaderStore } from "./shaderStore-Bfhtreha.js";
import { i as clipPlaneFragmentDeclarationWGSL, n as clipPlaneFragmentWGSL, r as fogFragmentDeclarationWGSL, t as fogFragmentWGSL } from "./fogFragment-Crg1OxR6.js";
var name = "colorPixelShader", shader = `#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
#define VERTEXCOLOR
varying vColor: vec4f;
#else
uniform color: vec4f;
#endif
#include<clipPlaneFragmentDeclaration>
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
fragmentOutputs.color=input.vColor;
#else
fragmentOutputs.color=uniforms.color;
#endif
#include<fogFragment>(color,fragmentOutputs.color)
#define CUSTOM_FRAGMENT_MAIN_END
}`;
ShaderStore.ShadersStoreWGSL[name] || (ShaderStore.ShadersStoreWGSL[name] = shader);
var includes = [
  clipPlaneFragmentDeclarationWGSL,
  fogFragmentDeclarationWGSL,
  clipPlaneFragmentWGSL,
  fogFragmentWGSL
];
for (const inc of includes) ShaderStore.IncludesShadersStoreWGSL[inc.name] || (ShaderStore.IncludesShadersStoreWGSL[inc.name] = inc.shader);
var colorPixelShaderWGSL = {
  name,
  shader
};
export {
  colorPixelShaderWGSL
};
