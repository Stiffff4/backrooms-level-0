import { t as ShaderStore } from "./shaderStore-CeBEoMrR.js";
import { i as clipPlaneFragmentDeclarationWGSL, n as clipPlaneFragmentWGSL, r as fogFragmentDeclarationWGSL, t as fogFragmentWGSL } from "./fogFragment-MPR4eiO8.js";
//#region node_modules/@babylonjs/core/ShadersWGSL/color.fragment.js
var name = "colorPixelShader";
var shader = `#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
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
if (!ShaderStore.ShadersStoreWGSL[name]) ShaderStore.ShadersStoreWGSL[name] = shader;
var includes = [
	clipPlaneFragmentDeclarationWGSL,
	fogFragmentDeclarationWGSL,
	clipPlaneFragmentWGSL,
	fogFragmentWGSL
];
for (const inc of includes) if (!ShaderStore.IncludesShadersStoreWGSL[inc.name]) ShaderStore.IncludesShadersStoreWGSL[inc.name] = inc.shader;
/** @internal */
var colorPixelShaderWGSL = {
	name,
	shader
};
//#endregion
export { colorPixelShaderWGSL };
