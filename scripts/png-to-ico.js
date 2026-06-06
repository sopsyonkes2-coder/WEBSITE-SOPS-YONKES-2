const fs = require('fs');
const path = require('path');

function pngToIco(pngPath, outPath) {
  const png = fs.readFileSync(pngPath);
  // read width/height from IHDR (bytes 16..23)
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  const widthByte = width >= 256 ? 0 : width;
  const heightByte = height >= 256 ? 0 : height;

  const pngSize = png.length;

  const iconDir = Buffer.alloc(6);
  iconDir.writeUInt16LE(0, 0); // reserved
  iconDir.writeUInt16LE(1, 2); // type 1 = icon
  iconDir.writeUInt16LE(1, 4); // count

  const entry = Buffer.alloc(16);
  entry.writeUInt8(widthByte, 0); // width
  entry.writeUInt8(heightByte, 1); // height
  entry.writeUInt8(0, 2); // color count
  entry.writeUInt8(0, 3); // reserved
  entry.writeUInt16LE(1, 4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(pngSize, 8); // bytes in resource
  const imageOffset = 6 + 16; // iconDir + entry
  entry.writeUInt32LE(imageOffset, 12); // image offset

  const out = Buffer.concat([iconDir, entry, png]);
  fs.writeFileSync(outPath, out);
  console.log('Wrote', outPath, 'size', out.length, 'bytes');
}

const root = path.join(__dirname, '..');
const pngPath = path.join(root, 'public', 'images', 'logo-yonkes.png');
const outPath = path.join(root, 'app', 'favicon.ico');

if (!fs.existsSync(pngPath)) {
  console.error('Source PNG not found:', pngPath);
  process.exit(1);
}

try {
  pngToIco(pngPath, outPath);
} catch (err) {
  console.error(err);
  process.exit(1);
}
