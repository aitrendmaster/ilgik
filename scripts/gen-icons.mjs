/**
 * PWA 아이콘 생성기 — 의존성 없이 PNG를 직접 인코딩한다.
 *
 * 이미지 라이브러리를 넣지 않는 이유: 아이콘은 브랜드 색 하나와 단순 도형뿐이고,
 * sharp 같은 네이티브 의존성을 빌드에 끌어들이면 정적 export의 이점이 사라진다.
 *
 * 실행: npm run icons
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const OUT_DIR = resolve(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'icons')

// DESIGN-ILGIK 토큰
const YELLOW = [0xff, 0xd0, 0x2f] // brand-yellow
const INK = [0x1c, 0x1c, 0x1e] // primary
const CANVAS = [0xff, 0xff, 0xff]

// ── PNG 인코딩 ────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const table = new Int32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c
  }
  return table
})()

function crc32(buf) {
  let c = -1
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
  return (c ^ -1) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length, 0)
  const typeBuf = Buffer.from(type, 'ascii')
  const crcBuf = Buffer.alloc(4)
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0)
  return Buffer.concat([len, typeBuf, data, crcBuf])
}

function encodePNG(width, height, rgb) {
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(width, 0)
  ihdr.writeUInt32BE(height, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 2 // color type: truecolor RGB
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // 각 스캔라인 앞에 필터 바이트 0
  const stride = width * 3
  const raw = Buffer.alloc(height * (stride + 1))
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ])
}

// ── 드로잉 ────────────────────────────────────────────────────
function insideRoundedRect(px, py, x, y, w, h, r) {
  if (px < x || py < y || px >= x + w || py >= y + h) return false
  const cx = Math.min(Math.max(px, x + r), x + w - r)
  const cy = Math.min(Math.max(py, y + r), y + h - r)
  const dx = px - cx
  const dy = py - cy
  return dx * dx + dy * dy <= r * r
}

/**
 * 노란 바탕 위 흰 메모지, 그 위 짙은 가로줄 3개.
 * "일당노트"의 노트를 그대로 형상화한다.
 * @param {number} size
 * @param {number} inset 0~0.5. maskable은 안전영역 안으로 넣기 위해 크게 준다.
 */
function drawIcon(size, inset) {
  const rgb = Buffer.alloc(size * size * 3)

  const noteW = size * (1 - inset * 2) * 0.62
  const noteH = noteW * 1.18
  const noteX = (size - noteW) / 2
  const noteY = (size - noteH) / 2
  const noteR = noteW * 0.12

  const lineH = Math.max(2, Math.round(noteH * 0.075))
  const lineX = noteX + noteW * 0.16
  const lineR = lineH / 2
  const lines = [
    { y: noteY + noteH * 0.24, w: noteW * 0.68 },
    { y: noteY + noteH * 0.45, w: noteW * 0.68 },
    { y: noteY + noteH * 0.66, w: noteW * 0.4 },
  ]

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let color = YELLOW
      if (insideRoundedRect(x, y, noteX, noteY, noteW, noteH, noteR)) {
        color = CANVAS
        for (const line of lines) {
          if (insideRoundedRect(x, y, lineX, line.y, line.w, lineH, lineR)) {
            color = INK
            break
          }
        }
      }
      const i = (y * size + x) * 3
      rgb[i] = color[0]
      rgb[i + 1] = color[1]
      rgb[i + 2] = color[2]
    }
  }

  return encodePNG(size, size, rgb)
}

mkdirSync(OUT_DIR, { recursive: true })

const targets = [
  { file: 'icon-192.png', size: 192, inset: 0.06 },
  { file: 'icon-512.png', size: 512, inset: 0.06 },
  { file: 'apple-touch-icon.png', size: 180, inset: 0.06 },
  // maskable은 바깥 20%가 잘릴 수 있어 내용을 안쪽으로 넣는다
  { file: 'icon-maskable-512.png', size: 512, inset: 0.18 },
]

for (const { file, size, inset } of targets) {
  const png = drawIcon(size, inset)
  writeFileSync(resolve(OUT_DIR, file), png)
  console.log(`${file}  ${size}x${size}  ${(png.length / 1024).toFixed(1)} KB`)
}
