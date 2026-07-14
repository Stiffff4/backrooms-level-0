const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["assets/iesTextureLoader-BJ2RaCN6.js","assets/math.scalar.functions-DxmoiihM.js","assets/ddsTextureLoader-BY3-NSGJ.js","assets/sphericalPolynomial.pure-CpfBjTEf.js","assets/math.color.pure-Cmv0AWRo.js","assets/typeStore-Bi_ki0b5.js","assets/dds.pure-ByMgJD4B.js","assets/logger-BcrUU1RW.js","assets/cubemapToSphericalPolynomial-DifTnaAa.js","assets/basisTextureLoader-D93cs6jI.js","assets/tools.pure-5yF7r6Yf.js","assets/guid-DgALBCu_.js","assets/fileTools.pure-CaQq64Ki.js","assets/internalTexture-BIxzv19R.js","assets/texture.pure-bJuYkYrJ.js","assets/baseTexture.pure-DPKCrMk9.js","assets/envTextureLoader-CknIdcm-.js","assets/postProcess.pure-DyzOl4n1.js","assets/preload-helper-NSp6fEao.js","assets/shaderStore-CeBEoMrR.js","assets/ktxTextureLoader-B1DA4f13.js","assets/tgaTextureLoader-DFZKCxKd.js","assets/exrTextureLoader-kO0i4P00.js"])))=>i.map(i=>d[i]);
import { t as Logger } from "./logger-BcrUU1RW.js";
import { t as __vitePreload } from "./preload-helper-NSp6fEao.js";
//#region node_modules/@babylonjs/core/Materials/Textures/Loaders/textureLoaderManager.js
var RegisteredTextureLoaders = /* @__PURE__ */ new Map();
/**
* Registers a texture loader.
* If a loader for the extension exists in the registry, it will be replaced.
* @param extension The name of the loader extension.
* @param loaderFactory The factory function that creates the loader extension.
*/
function registerTextureLoader(extension, loaderFactory) {
	if (unregisterTextureLoader(extension)) Logger.Warn(`Extension with the name '${extension}' already exists`);
	RegisteredTextureLoaders.set(extension, loaderFactory);
}
/**
* Unregisters a texture loader.
* @param extension The name of the loader extension.
* @returns A boolean indicating whether the extension has been unregistered
*/
function unregisterTextureLoader(extension) {
	return RegisteredTextureLoaders.delete(extension);
}
/**
* Function used to get the correct texture loader for a specific extension.
* @param extension defines the file extension of the file being loaded
* @param mimeType defines the optional mime type of the file being loaded
* @returns the IInternalTextureLoader or null if it wasn't found
*/
function _GetCompatibleTextureLoader(extension, mimeType) {
	if (mimeType === "image/ktx" || mimeType === "image/ktx2") extension = ".ktx";
	if (!RegisteredTextureLoaders.has(extension)) {
		if (extension.endsWith(".ies")) registerTextureLoader(".ies", async () => await __vitePreload(() => import("./iesTextureLoader-BJ2RaCN6.js").then((module) => new module._IESTextureLoader()), __vite__mapDeps([0,1])));
		if (extension.endsWith(".dds")) registerTextureLoader(".dds", async () => await __vitePreload(() => import("./ddsTextureLoader-BY3-NSGJ.js").then((module) => new module._DDSTextureLoader()), __vite__mapDeps([2,3,4,5,1,6,7,8])));
		if (extension.endsWith(".basis")) registerTextureLoader(".basis", async () => await __vitePreload(() => import("./basisTextureLoader-D93cs6jI.js").then((module) => new module._BasisTextureLoader()), __vite__mapDeps([9,7,10,5,11,12,13,14,15,4,1])));
		if (extension.endsWith(".env")) registerTextureLoader(".env", async () => await __vitePreload(() => import("./envTextureLoader-CknIdcm-.js").then((module) => new module._ENVTextureLoader()), __vite__mapDeps([16,11,5,7,17,15,4,1,18,19,13,3,8])));
		if (extension.endsWith(".hdr")) registerTextureLoader(".hdr", async () => await __vitePreload(() => import("./hdrTextureLoader-SjRMRtm4.js").then((module) => new module._HDRTextureLoader()), []));
		if (extension.endsWith(".ktx") || extension.endsWith(".ktx2")) {
			registerTextureLoader(".ktx", async () => await __vitePreload(() => import("./ktxTextureLoader-B1DA4f13.js").then((module) => new module._KTXTextureLoader()), __vite__mapDeps([20,7,10,5,11,12])));
			registerTextureLoader(".ktx2", async () => await __vitePreload(() => import("./ktxTextureLoader-B1DA4f13.js").then((module) => new module._KTXTextureLoader()), __vite__mapDeps([20,7,10,5,11,12])));
		}
		if (extension.endsWith(".tga")) registerTextureLoader(".tga", async () => await __vitePreload(() => import("./tgaTextureLoader-DFZKCxKd.js").then((module) => new module._TGATextureLoader()), __vite__mapDeps([21,7])));
		if (extension.endsWith(".exr")) registerTextureLoader(".exr", async () => await __vitePreload(() => import("./exrTextureLoader-kO0i4P00.js").then((module) => new module._ExrTextureLoader()), __vite__mapDeps([22,5,7,10,11,12,1])));
	}
	const registered = RegisteredTextureLoaders.get(extension);
	return registered ? Promise.resolve(registered(mimeType)) : null;
}
//#endregion
export { _GetCompatibleTextureLoader as t };
