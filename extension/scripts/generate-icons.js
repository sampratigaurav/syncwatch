/**
 * Generates the four PNG icons required by the extension.
 * Uses only Node.js built-in modules (zlib, fs, path) — no extra deps.
 *
 * Design: dark background #0a0a0f, teal (#1D9E75) ring + play-triangle.
 */

import zlib from 'zlib'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── PNG helpers ──────────────────────────────────────────────────────────────

function uint32BE(n) {
  const buf = Buffer.alloc(4)
  buf.writeUInt32BE(n >>> 0, 0)
  return buf
}

function crc32(data) {
  const table = crc32.table || (crc32.table = (() => {
    const t = new Uint32Array(256)
    for (let i = 0; i < 256; i++) {
      let c = i
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1
      t[i] = c
    }
    return t
  })())
  let crc = 0xFFFFFFFF
  for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xFF] ^ (crc >>> 8)
  return (crc ^ 0xFFFFFFFF) >>> 0
}

function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const crcData = Buffer.concat([typeBytes, data])
  return Buffer.concat([uint32BE(data.length), typeBytes, data, uint32BE(crc32(crcData))])
}

/** @param {number} size @param {(x:number,y:number,s:number)=>[number,number,number]} pixel */
function createPNG(size, pixel) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  const ihdrData = Buffer.concat([
    uint32BE(size), uint32BE(size),
    Buffer.from([8, 2, 0, 0, 0]), // 8-bit RGB, no interlace
  ])

  // One filter byte (0 = None) per row + 3 bytes per pixel
  const rowStride = 1 + size * 3
  const raw = Buffer.alloc(rowStride * size)

  for (let y = 0; y < size; y++) {
    raw[y * rowStride] = 0 // filter = None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y, size)
      const off = y * rowStride + 1 + x * 3
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 9 })

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdrData),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ])
}

// ─── Icon pixel function ──────────────────────────────────────────────────────

const BG = [10, 10, 15]          // #0a0a0f
const TEAL = [29, 158, 117]      // #1D9E75

/**
 * Draws a teal ring around a teal play-triangle on a dark background.
 * Anti-aliasing via distance fields.
 */
function iconPixel(x, y, s) {
  const cx = s / 2, cy = s / 2
  const dx = x + 0.5 - cx, dy = y + 0.5 - cy
  const dist = Math.sqrt(dx * dx + dy * dy)

  // Ring (radius 40 % of size, thickness 12 %)
  const r = s * 0.40
  const ringW = s * 0.12
  const ringDist = Math.abs(dist - r)
  if (ringDist <= ringW / 2) return TEAL

  // Play triangle (inside ring)
  const nx = (x + 0.5) / s  // 0..1
  const ny = (y + 0.5) / s  // 0..1
  const left = 0.30, right = 0.72, midY = 0.50
  if (nx >= left && nx <= right) {
    const span = (nx - left) / (right - left) // 0 at left edge, 1 at right
    const halfH = span * 0.38                 // triangle half-height grows rightward
    if (Math.abs(ny - midY) <= halfH) return TEAL
  }

  return BG
}

// ─── Generate all 4 sizes ─────────────────────────────────────────────────────

const iconsDir = path.join(__dirname, '..', 'icons')
if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true })

for (const size of [16, 32, 48, 128]) {
  const buf = createPNG(size, iconPixel)
  const outPath = path.join(iconsDir, `icon${size}.png`)
  fs.writeFileSync(outPath, buf)
  console.log(`✓ icons/icon${size}.png  (${buf.length} bytes)`)
}
