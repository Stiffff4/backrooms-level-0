import { t as ShaderStore } from "./shaderStore-Bfhtreha.js";
import { t as helperFunctions } from "./helperFunctions-CPqKBgbe.js";
var name = "rgbdDecodePixelShader";
var shader = `varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;
if (!ShaderStore.ShadersStore[name]) ShaderStore.ShadersStore[name] = shader;
var includes = [helperFunctions];
for (const inc of includes) if (!ShaderStore.IncludesShadersStore[inc.name]) ShaderStore.IncludesShadersStore[inc.name] = inc.shader;
var rgbdDecodePixelShader = {
  name,
  shader
};
export {
  rgbdDecodePixelShader
};
