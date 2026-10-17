// Minimal dependency-free ZIP writer (deflate), enough for /csv exports.
// v0.18.16: zipFiles() streams source files from disk into a zip on disk — memory stays flat whatever the export size.
import { deflateRawSync, createDeflateRaw } from "node:zlib";
import { createReadStream, createWriteStream, statSync } from "node:fs";
import { pipeline } from "node:stream/promises";
import { Transform } from "node:stream";
const CRC = new Int32Array(256).map((_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c; });
const crcUpdate = (c, buf) => { for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return c; };
const crc32 = (buf) => (crcUpdate(-1, buf) ^ -1) >>> 0;
const dosTime = (d) => ((d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1)) & 0xffff;
const dosDate = (d) => (((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()) & 0xffff;
function localHeader(name, now, flags, crc, csize, usize) {
  const lh = Buffer.alloc(30); lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(flags, 6); lh.writeUInt16LE(8, 8);
  lh.writeUInt16LE(dosTime(now), 10); lh.writeUInt16LE(dosDate(now), 12); lh.writeUInt32LE(crc, 14); lh.writeUInt32LE(csize, 18); lh.writeUInt32LE(usize, 22); lh.writeUInt16LE(name.length, 26); lh.writeUInt16LE(0, 28);
  return lh;
}
function centralHeader(name, now, flags, crc, csize, usize, offset) {
  const ch = Buffer.alloc(46); ch.writeUInt32LE(0x02014b50, 0); ch.writeUInt16LE(20, 4); ch.writeUInt16LE(20, 6); ch.writeUInt16LE(flags, 8); ch.writeUInt16LE(8, 10);
  ch.writeUInt16LE(dosTime(now), 12); ch.writeUInt16LE(dosDate(now), 14); ch.writeUInt32LE(crc, 16); ch.writeUInt32LE(csize, 20); ch.writeUInt32LE(usize, 24); ch.writeUInt16LE(name.length, 28);
  ch.writeUInt16LE(0, 30); ch.writeUInt16LE(0, 32); ch.writeUInt16LE(0, 34); ch.writeUInt16LE(0, 36); ch.writeUInt32LE(0, 38); ch.writeUInt32LE(offset, 42);
  return ch;
}
function endRecord(n, cdLen, cdOffset) {
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(0, 4); end.writeUInt16LE(0, 6); end.writeUInt16LE(n, 8); end.writeUInt16LE(n, 10); end.writeUInt32LE(cdLen, 12); end.writeUInt32LE(cdOffset, 16); end.writeUInt16LE(0, 20);
  return end;
}
/** files: [{ name, data: Buffer|string }] → Buffer (zip). In-memory; fine for small exports. */
export function zip(files) {
  const now = new Date(), parts = [], central = []; let offset = 0;
  for (const f of files) {
    const name = Buffer.from(f.name), raw = Buffer.isBuffer(f.data) ? f.data : Buffer.from(f.data);
    const data = deflateRawSync(raw, { level: 6 }), crc = crc32(raw);
    const lh = localHeader(name, now, 0, crc, data.length, raw.length);
    central.push(centralHeader(name, now, 0, crc, data.length, raw.length, offset), name);
    parts.push(lh, name, data); offset += lh.length + name.length + data.length;
  }
  const cd = Buffer.concat(central);
  return Buffer.concat([...parts, cd, endRecord(files.length, cd.length, offset)]);
}
/** files: [{ name, path }] → writes a zip at outPath, streaming each source file through deflate (data-descriptor entries). Returns zip size. */
export async function zipFiles(files, outPath) {
  const now = new Date(), out = createWriteStream(outPath), central = []; let offset = 0; out.setMaxListeners(0); // v0.18.59: one pipeline per file adds a listener each — silences the MaxListeners warning on 11+ files
  const write = (buf) => new Promise((res, rej) => out.write(buf, (e) => (e ? rej(e) : res())));
  for (const f of files) {
    const name = Buffer.from(f.name), flags = 0x0008; // bit 3: sizes + crc follow the data
    const lh = localHeader(name, now, flags, 0, 0, 0), start = offset;
    await write(lh); await write(name); offset += lh.length + name.length;
    let crc = -1, usize = 0, csize = 0;
    const counter = new Transform({ transform(chunk, _, cb) { crc = crcUpdate(crc, chunk); usize += chunk.length; cb(null, chunk); } });
    const sizer = new Transform({ transform(chunk, _, cb) { csize += chunk.length; cb(null, chunk); } });
    await pipeline(createReadStream(f.path), counter, createDeflateRaw({ level: 6 }), sizer, out, { end: false });
    crc = (crc ^ -1) >>> 0;
    const dd = Buffer.alloc(16); dd.writeUInt32LE(0x08074b50, 0); dd.writeUInt32LE(crc, 4); dd.writeUInt32LE(csize, 8); dd.writeUInt32LE(usize, 12);
    await write(dd); offset += csize + dd.length;
    central.push(centralHeader(name, now, flags, crc, csize, usize, start), name);
  }
  const cd = Buffer.concat(central);
  await write(cd); await write(endRecord(files.length, cd.length, offset));
  await new Promise((res, rej) => out.end((e) => (e ? rej(e) : res())));
  return statSync(outPath).size;
}
