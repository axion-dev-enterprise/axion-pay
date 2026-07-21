/* Generate required SEO assets (OG image, favicons, manifest, robots, sitemap)
 * for the Vite webapp that lives at apps/axion-pay/webapp.
 *
 * Kept deterministic and local (no network).
 */
const fs = require('fs')
const path = require('path')
const { PNG } = require('pngjs')
const pngToIco = require('png-to-ico')

const root = path.join(__dirname, '..')
const webRoot = path.join(root, 'webapp')
const pub = path.join(webRoot, 'public')
const ogDir = path.join(pub, 'og')

const SITE_URL = 'https://pay.axionenterprise.cloud/'
const TODAY = '2026-02-10'

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true })
}

function writeText(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8')
}

function clamp01(x) {
  if (x < 0) return 0
  if (x > 1) return 1
  return x
}

function lerp(a, b, t) {
  return a + (b - a) * t
}

function hexToRgb(hex) {
  const h = String(hex).replace('#', '').trim()
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return { r, g, b }
}

function setPx(img, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= img.width || y >= img.height) return
  const i = (img.width * y + x) << 2
  img.data[i + 0] = r
  img.data[i + 1] = g
  img.data[i + 2] = b
  img.data[i + 3] = a
}

function fillLinear(img, c0, c1, angleDeg = 135) {
  const a = (angleDeg * Math.PI) / 180
  const dx = Math.cos(a)
  const dy = Math.sin(a)
  const { r: r0, g: g0, b: b0 } = hexToRgb(c0)
  const { r: r1, g: g1, b: b1 } = hexToRgb(c1)

  const cx = img.width / 2
  const cy = img.height / 2
  const denom = Math.abs(dx) * img.width / 2 + Math.abs(dy) * img.height / 2 || 1

  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const proj = ((x - cx) * dx + (y - cy) * dy) / denom
      const t = clamp01(0.5 + proj / 2)
      const r = Math.round(lerp(r0, r1, t))
      const g = Math.round(lerp(g0, g1, t))
      const b = Math.round(lerp(b0, b1, t))
      setPx(img, x, y, r, g, b, 255)
    }
  }
}

function drawCircle(img, cx, cy, rad, color, alpha = 255) {
  const { r, g, b } = hexToRgb(color)
  const r2 = rad * rad
  const x0 = Math.floor(cx - rad)
  const x1 = Math.ceil(cx + rad)
  const y0 = Math.floor(cy - rad)
  const y1 = Math.ceil(cy + rad)
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const dx = x - cx
      const dy = y - cy
      if (dx * dx + dy * dy <= r2) setPx(img, x, y, r, g, b, alpha)
    }
  }
}

function drawRect(img, x, y, w, h, color, alpha = 255) {
  const { r, g, b } = hexToRgb(color)
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPx(img, xx, yy, r, g, b, alpha)
  }
}

// Minimal 5x7 bitmap font for needed glyphs.
const FONT_5X7 = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['11111', '00100', '00100', '00100', '00100', '00100', '11111'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  X: ['10001', '01010', '00100', '00100', '00100', '01010', '10001'],
  Y: ['10001', '01010', '00100', '00100', '00100', '00100', '00100'],
  '|': ['00100', '00100', '00100', '00100', '00100', '00100', '00100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
}

function drawText5x7(img, x, y, text, scale, color, alpha = 255, letterGap = 1) {
  const { r, g, b } = hexToRgb(color)
  let cx = x
  for (const chRaw of String(text)) {
    const ch = chRaw.toUpperCase()
    const glyph = FONT_5X7[ch] || FONT_5X7[' ']
    for (let gy = 0; gy < 7; gy++) {
      const row = glyph[gy] || '00000'
      for (let gx = 0; gx < 5; gx++) {
        if (row[gx] === '1') {
          for (let sy = 0; sy < scale; sy++) {
            for (let sx = 0; sx < scale; sx++) {
              setPx(img, cx + gx * scale + sx, y + gy * scale + sy, r, g, b, alpha)
            }
          }
        }
      }
    }
    cx += 5 * scale + letterGap * scale
  }
}

function pngToBuffer(img) {
  return PNG.sync.write(img, { colorType: 6 })
}

function writePng(filePath, img) {
  fs.writeFileSync(filePath, pngToBuffer(img))
}

function copyIfExists(src, dst) {
  if (!fs.existsSync(src)) return false
  fs.copyFileSync(src, dst)
  return true
}

async function main() {
  ensureDir(pub)
  ensureDir(ogDir)

  // Ensure stable /axionpay_logo.png for meta tags + schema.
  const srcLogo = path.join(root, 'axionpay_logo.png')
  const dstLogo = path.join(pub, 'axionpay_logo.png')
  const copiedLogo = copyIfExists(srcLogo, dstLogo)

  // favicon.svg
  writeText(
    path.join(pub, 'favicon.svg'),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" role="img" aria-label="AxionPAY">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#2563eb" />
      <stop offset="0.55" stop-color="#3b82f6" />
      <stop offset="1" stop-color="#10b981" />
    </linearGradient>
  </defs>
  <rect x="6" y="6" width="52" height="52" rx="14" fill="#0b1b2b" />
  <path d="M18 42 L26.5 18 H37.5 L46 42 H39 L36.8 36.2 H27.2 L25 42 Z M30 31.8 H34 L32 26.9 Z" fill="url(#g)" />
</svg>
`,
  )

  // PWA manifest
  writeText(
    path.join(pub, 'site.webmanifest'),
    JSON.stringify(
      {
        name: 'AxionPAY',
        short_name: 'AxionPAY',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#0b1b2b',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      null,
      2,
    ) + '\n',
  )

  // robots + sitemap
  writeText(path.join(pub, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${SITE_URL}sitemap.xml\n`)
  writeText(
    path.join(pub, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
      `  <url><loc>${SITE_URL}</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>\n` +
      `  <url><loc>${SITE_URL}docs</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>\n` +
      `  <url><loc>${SITE_URL}support</loc><lastmod>${TODAY}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>\n` +
      `  <url><loc>${SITE_URL}status</loc><lastmod>${TODAY}</lastmod><changefreq>daily</changefreq><priority>0.7</priority></url>\n` +
      `  <url><loc>${SITE_URL}products/pix</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n` +
      `  <url><loc>${SITE_URL}products/split</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n` +
      `  <url><loc>${SITE_URL}products/antifraude</loc><lastmod>${TODAY}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>\n` +
      `</urlset>\n`,
  )

  const iconBg0 = '#0b1b2b'
  const iconBg1 = '#102a44'
  const accent = '#2563eb'
  const accent2 = '#10b981'
  const accent3 = '#3b82f6'

  function makeIcon(size, label) {
    const img = new PNG({ width: size, height: size })
    fillLinear(img, iconBg0, iconBg1, 135)
    drawCircle(img, Math.round(size * 0.28), Math.round(size * 0.28), Math.round(size * 0.15), accent3, 110)
    drawCircle(img, Math.round(size * 0.80), Math.round(size * 0.24), Math.round(size * 0.10), accent2, 90)
    drawCircle(img, Math.round(size * 0.76), Math.round(size * 0.78), Math.round(size * 0.16), accent, 85)

    const scale = Math.max(2, Math.floor(size / 40))
    const text = String(label || 'AP')
    const w = text.length * (5 * scale + scale) - scale
    const x = Math.floor((size - w) / 2)
    const y = Math.floor(size * 0.52 - (7 * scale) / 2)
    drawText5x7(img, x, y, text, scale, '#ffffff', 235, 1)
    return img
  }

  writePng(path.join(pub, 'icon-192.png'), makeIcon(192, 'AP'))
  writePng(path.join(pub, 'icon-512.png'), makeIcon(512, 'AP'))
  writePng(path.join(pub, 'apple-touch-icon.png'), makeIcon(180, 'AP'))

  // favicon.ico
  const icoPng = makeIcon(64, 'A')
  const icoBuf = await pngToIco([pngToBuffer(icoPng)])
  fs.writeFileSync(path.join(pub, 'favicon.ico'), icoBuf)

  // OG image 1200x630
  const og = new PNG({ width: 1200, height: 630 })
  fillLinear(og, '#ffffff', '#f8fafc', 135)
  drawCircle(og, 190, 170, 200, accent3, 52)
  drawCircle(og, 1040, 120, 140, accent2, 40)
  drawCircle(og, 1000, 520, 260, accent, 36)
  drawRect(og, 80, 88, 1040, 1, '#0b1b2b', 26)
  drawRect(og, 80, 540, 1040, 1, '#0b1b2b', 20)
  drawText5x7(og, 90, 200, 'AXIONPAY', 10, '#0b1b2b', 225, 1)
  drawText5x7(og, 90, 320, 'PIX | CARTOES | ANTIFRAUDE', 6, '#0b1b2b', 205, 1)
  drawText5x7(og, 90, 410, 'CHECKOUT | PAY-TAGS | DASHBOARD', 5, '#0b1b2b', 190, 1)
  writePng(path.join(ogDir, 'og-image-1200x630.png'), og)

  process.stdout.write(`[axion-pay] webapp public assets generated (logoCopied=${copiedLogo ? '1' : '0'})\n`)
}

main().catch((e) => {
  process.stderr.write(`[axion-pay] assets generation failed: ${e?.message || String(e)}\n`)
  process.exit(1)
})

