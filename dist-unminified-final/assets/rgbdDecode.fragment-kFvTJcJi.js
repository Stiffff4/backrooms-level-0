import { t as ShaderStore } from "./shaderStore-CeBEoMrR.js";
import { t as helperFunctionsWGSL } from "./helperFunctions-CIjb1uV7.js";
//#region node_modules/@babylonjs/core/ShadersWGSL/rgbdDecode.fragment.js
var name = "rgbdDecodePixelShader";
var shader = `varying vUV: vec2f;var textureSamplerSampler: sampler;var textureSampler: texture_2d<f32>;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
@fragment
fn main(input: FragmentInputs)->FragmentOutputs {fragmentOutputs.color=vec4f(fromRGBD(textureSample(textureSampler,textureSamplerSampler,input.vUV)),1.0);}`;
if (!ShaderStore.ShadersStoreWGSL[name]) ShaderStore.ShadersStoreWGSL[name] = shader;
var includes = [helperFunctionsWGSL];
for (const inc of includes) if (!ShaderStore.IncludesShadersStoreWGSL[inc.name]) ShaderStore.IncludesShadersStoreWGSL[inc.name] = inc.shader;
/** @internal */
var rgbdDecodePixelShaderWGSL = {
	name,
	shader
};
//#endregion
export { rgbdDecodePixelShaderWGSL };
