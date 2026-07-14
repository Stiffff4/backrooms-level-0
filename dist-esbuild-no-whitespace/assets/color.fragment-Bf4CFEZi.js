import { t as ShaderStore } from "./shaderStore-Bfhtreha.js";
import { i as clipPlaneFragmentDeclaration, n as clipPlaneFragment, r as fogFragmentDeclaration, t as fogFragment } from "./fogFragment-DA-Stt-Z.js";
var name = "colorPixelShader", shader = `#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
#define VERTEXCOLOR
varying vec4 vColor;
#else
uniform vec4 color;
#endif
#include<clipPlaneFragmentDeclaration>
#include<fogFragmentDeclaration>
#define CUSTOM_FRAGMENT_DEFINITIONS
void main(void) {
#define CUSTOM_FRAGMENT_MAIN_BEGIN
#include<clipPlaneFragment>
#if defined(VERTEXCOLOR) || defined(INSTANCESCOLOR) && defined(INSTANCES)
gl_FragColor=vColor;
#else
gl_FragColor=color;
#endif
#include<fogFragment>(color,gl_FragColor)
#define CUSTOM_FRAGMENT_MAIN_END
}`;
ShaderStore.ShadersStore[name] || (ShaderStore.ShadersStore[name] = shader);
var includes = [
  clipPlaneFragmentDeclaration,
  fogFragmentDeclaration,
  clipPlaneFragment,
  fogFragment
];
for (const inc of includes) ShaderStore.IncludesShadersStore[inc.name] || (ShaderStore.IncludesShadersStore[inc.name] = inc.shader);
var colorPixelShader = {
  name,
  shader
};
export {
  colorPixelShader
};
