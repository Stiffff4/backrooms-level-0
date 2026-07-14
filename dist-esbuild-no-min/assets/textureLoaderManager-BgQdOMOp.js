const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/iesTextureLoader-DyuSSH5A.js","assets/math.scalar.functions-BxWMGrCV.js","assets/ddsTextureLoader-jvc-x4dH.js","assets/sphericalPolynomial.pure-YKiWfq2o.js","assets/math.color.pure-CMvYqpy_.js","assets/typeStore-CRwQ34I6.js","assets/dds.pure-BX4ZgjL7.js","assets/logger-X7NGrhaj.js","assets/cubemapToSphericalPolynomial-C06arCBE.js","assets/basisTextureLoader-DVatK_wZ.js","assets/tools.pure-DF2OeRfv.js","assets/guid-CkhjUkgR.js","assets/fileTools.pure-Bmuhm6QP.js","assets/internalTexture-Bd-9lST5.js","assets/texture.pure-D612BAlN.js","assets/baseTexture.pure-Cr8BPE06.js","assets/envTextureLoader-CgPNYvea.js","assets/postProcess.pure-CbZyFo-1.js","assets/preload-helper-C1VGUTyY.js","assets/shaderStore-Bfhtreha.js","assets/ktxTextureLoader-gRvvcNlc.js","assets/tgaTextureLoader-DvpW8ak8.js","assets/exrTextureLoader-DrYYq9xx.js"])))=>i.map(i=>d[i]);
import { t as Logger } from "./logger-X7NGrhaj.js";
import { t as __vitePreload } from "./preload-helper-C1VGUTyY.js";
var RegisteredTextureLoaders = /* @__PURE__ */ new Map();
function registerTextureLoader(extension, loaderFactory) {
  if (unregisterTextureLoader(extension)) Logger.Warn(`Extension with the name '${extension}' already exists`);
  RegisteredTextureLoaders.set(extension, loaderFactory);
}
function unregisterTextureLoader(extension) {
  return RegisteredTextureLoaders.delete(extension);
}
function _GetCompatibleTextureLoader(extension, mimeType) {
  if (mimeType === "image/ktx" || mimeType === "image/ktx2") extension = ".ktx";
  if (!RegisteredTextureLoaders.has(extension)) {
    if (extension.endsWith(".ies")) registerTextureLoader(".ies", async () => await __vitePreload(() => import("./iesTextureLoader-DyuSSH5A.js").then((module) => new module._IESTextureLoader()), __vite__mapDeps([0,1])));
    if (extension.endsWith(".dds")) registerTextureLoader(".dds", async () => await __vitePreload(() => import("./ddsTextureLoader-jvc-x4dH.js").then((module) => new module._DDSTextureLoader()), __vite__mapDeps([2,3,4,5,1,6,7,8])));
    if (extension.endsWith(".basis")) registerTextureLoader(".basis", async () => await __vitePreload(() => import("./basisTextureLoader-DVatK_wZ.js").then((module) => new module._BasisTextureLoader()), __vite__mapDeps([9,7,10,5,11,12,13,14,15,4,1])));
    if (extension.endsWith(".env")) registerTextureLoader(".env", async () => await __vitePreload(() => import("./envTextureLoader-CgPNYvea.js").then((module) => new module._ENVTextureLoader()), __vite__mapDeps([16,11,5,7,17,15,4,1,18,19,13,3,8])));
    if (extension.endsWith(".hdr")) registerTextureLoader(".hdr", async () => await __vitePreload(() => import("./hdrTextureLoader-Cjw8err3.js").then((module) => new module._HDRTextureLoader()), []));
    if (extension.endsWith(".ktx") || extension.endsWith(".ktx2")) {
      registerTextureLoader(".ktx", async () => await __vitePreload(() => import("./ktxTextureLoader-gRvvcNlc.js").then((module) => new module._KTXTextureLoader()), __vite__mapDeps([20,7,10,5,11,12])));
      registerTextureLoader(".ktx2", async () => await __vitePreload(() => import("./ktxTextureLoader-gRvvcNlc.js").then((module) => new module._KTXTextureLoader()), __vite__mapDeps([20,7,10,5,11,12])));
    }
    if (extension.endsWith(".tga")) registerTextureLoader(".tga", async () => await __vitePreload(() => import("./tgaTextureLoader-DvpW8ak8.js").then((module) => new module._TGATextureLoader()), __vite__mapDeps([21,7])));
    if (extension.endsWith(".exr")) registerTextureLoader(".exr", async () => await __vitePreload(() => import("./exrTextureLoader-DrYYq9xx.js").then((module) => new module._ExrTextureLoader()), __vite__mapDeps([22,5,7,10,11,12,1])));
  }
  const registered = RegisteredTextureLoaders.get(extension);
  return registered ? Promise.resolve(registered(mimeType)) : null;
}
export {
  _GetCompatibleTextureLoader as t
};
