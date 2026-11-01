// Photograph checks shared by the import script and the upload route.
export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;

// Judges a file by its first bytes, never by its name or the type the browser claims.
// Returns 'jpg', 'png', 'webp' or null.
export function imageKind(buf) {
  if (!Buffer.isBuffer(buf)) return null;
  if (buf.length > 12 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'jpg';
  if (buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png';
  if (buf.length > 12 && buf.subarray(0, 4).toString() === 'RIFF' && buf.subarray(8, 12).toString() === 'WEBP') return 'webp';
  return null;
}

export const MIME_BY_KIND = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
