import fs from 'fs';
try {
  const path = 'C:\\Users\\Millerium\\.gemini\\antigravity-ide\\brain\\eb4360d5-d93a-472e-ad0e-d51b8c66304f\\uploaded_media_1783778660826.img';
  const buffer = fs.readFileSync(path);
  console.log('File size:', buffer.length);
  console.log('First 20 bytes (hex):', buffer.toString('hex', 0, 20));
  console.log('First 20 bytes (ascii):', buffer.toString('ascii', 0, 20));
} catch (e) {
  console.error(e);
}
