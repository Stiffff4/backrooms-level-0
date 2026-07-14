import { n as SphericalPolynomial } from "./sphericalPolynomial.pure-E3iX8D_l.js";
import { t as DDSTools } from "./dds.pure-W4a2iIsw.js";
var _DDSTextureLoader = class {
  constructor() {
    this.supportCascades = !0;
  }
  loadCubeData(imgs, texture, createPolynomials, onLoad) {
    const engine = texture.getEngine();
    let info, loadMipmap = !1, maxLevel = 1e3;
    if (Array.isArray(imgs)) for (let index = 0; index < imgs.length; index++) {
      const data = imgs[index];
      info = DDSTools.GetDDSInfo(data), texture.width = info.width, texture.height = info.height, loadMipmap = (info.isRGB || info.isLuminance || info.mipmapCount > 1) && texture.generateMipMaps, engine._unpackFlipY(info.isCompressed), DDSTools.UploadDDSLevels(engine, texture, data, info, loadMipmap, 6, -1, index), !info.isFourCC && info.mipmapCount === 1 ? engine.generateMipMapsForCubemap(texture) : maxLevel = info.mipmapCount - 1;
    }
    else {
      const data = imgs;
      info = DDSTools.GetDDSInfo(data), texture.width = info.width, texture.height = info.height, createPolynomials && (info.sphericalPolynomial = new SphericalPolynomial()), loadMipmap = (info.isRGB || info.isLuminance || info.mipmapCount > 1) && texture.generateMipMaps, engine._unpackFlipY(info.isCompressed), DDSTools.UploadDDSLevels(engine, texture, data, info, loadMipmap, 6), !info.isFourCC && info.mipmapCount === 1 ? engine.generateMipMapsForCubemap(texture, !1) : maxLevel = info.mipmapCount - 1;
    }
    engine._setCubeMapTextureParams(texture, loadMipmap, maxLevel), texture.isReady = !0, texture.onLoadedObservable.notifyObservers(texture), texture.onLoadedObservable.clear(), onLoad && onLoad({
      isDDS: !0,
      width: texture.width,
      info,
      data: imgs,
      texture
    });
  }
  loadData(data, texture, callback) {
    const info = DDSTools.GetDDSInfo(data), loadMipmap = (info.isRGB || info.isLuminance || info.mipmapCount > 1) && texture.generateMipMaps && Math.max(info.width, info.height) >> info.mipmapCount - 1 === 1;
    callback(info.width, info.height, loadMipmap, info.isFourCC, () => {
      DDSTools.UploadDDSLevels(texture.getEngine(), texture, data, info, loadMipmap, 1);
    });
  }
};
export {
  _DDSTextureLoader
};
