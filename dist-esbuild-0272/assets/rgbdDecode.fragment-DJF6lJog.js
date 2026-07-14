import{t as ShaderStore}from"./shaderStore-DrmLqj-8.js";import{t as helperFunctions}from"./helperFunctions-VuBKqBsB.js";var name="rgbdDecodePixelShader",shader=`varying vec2 vUV;uniform sampler2D textureSampler;
#include<helperFunctions>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) 
{gl_FragColor=vec4(fromRGBD(texture2D(textureSampler,vUV)),1.0);}`;ShaderStore.ShadersStore[name]||(ShaderStore.ShadersStore[name]=shader);var includes=[helperFunctions];for(const inc of includes)ShaderStore.IncludesShadersStore[inc.name]||(ShaderStore.IncludesShadersStore[inc.name]=inc.shader);var rgbdDecodePixelShader={name,shader};export{rgbdDecodePixelShader};
