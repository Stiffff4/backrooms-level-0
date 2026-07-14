function GetByteIndex(bitIndex) {
  return Math.floor(bitIndex / 8);
}
function GetBitMask(bitIndex) {
  return 1 << bitIndex % 8;
}
var BitArray = class {
  constructor(size) {
    this.size = size;
    this._byteArray = new Uint8Array(Math.ceil(this.size / 8));
  }
  get(bitIndex) {
    if (bitIndex >= this.size) throw new RangeError("Bit index out of range");
    const byteIndex = GetByteIndex(bitIndex);
    const bitMask = GetBitMask(bitIndex);
    return (this._byteArray[byteIndex] & bitMask) !== 0;
  }
  set(bitIndex, value) {
    if (bitIndex >= this.size) throw new RangeError("Bit index out of range");
    const byteIndex = GetByteIndex(bitIndex);
    const bitMask = GetBitMask(bitIndex);
    if (value) this._byteArray[byteIndex] |= bitMask;
    else this._byteArray[byteIndex] &= ~bitMask;
  }
};
function OptimizeIndices(indices) {
  const faces = [];
  const faceCount = indices.length / 3;
  for (let i = 0; i < faceCount; i++) faces.push([
    indices[i * 3],
    indices[i * 3 + 1],
    indices[i * 3 + 2]
  ]);
  const vertexToFaceMap = /* @__PURE__ */ new Map();
  for (let faceIndex = 0; faceIndex < faces.length; faceIndex++) {
    const face = faces[faceIndex];
    for (const vertex of face) {
      let face2 = vertexToFaceMap.get(vertex);
      if (!face2) vertexToFaceMap.set(vertex, face2 = []);
      face2.push(faceIndex);
    }
  }
  const visited = new BitArray(faceCount);
  const sortedFaces = [];
  const deepFirstSearchStack = (startFaceIndex) => {
    const stack = [startFaceIndex];
    while (stack.length > 0) {
      const currentFaceIndex = stack.pop();
      if (visited.get(currentFaceIndex)) continue;
      visited.set(currentFaceIndex, true);
      sortedFaces.push(faces[currentFaceIndex]);
      for (const vertex of faces[currentFaceIndex]) {
        const neighbors = vertexToFaceMap.get(vertex);
        if (!neighbors) return;
        for (const neighborFaceIndex of neighbors) if (!visited.get(neighborFaceIndex)) stack.push(neighborFaceIndex);
      }
    }
  };
  for (let i = 0; i < faceCount; i++) if (!visited.get(i)) deepFirstSearchStack(i);
  let index = 0;
  for (const face of sortedFaces) {
    indices[index++] = face[0];
    indices[index++] = face[1];
    indices[index++] = face[2];
  }
}
export {
  OptimizeIndices
};
