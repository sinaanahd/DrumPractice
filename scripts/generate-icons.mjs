import { deflateSync } from 'node:zlib'
import { writeFileSync } from 'node:fs'

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) {
    crc ^= byte
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1))
  }
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const name = Buffer.from(type)
  const length = Buffer.alloc(4); length.writeUInt32BE(data.length)
  const checksum = Buffer.alloc(4); checksum.writeUInt32BE(crc32(Buffer.concat([name, data])))
  return Buffer.concat([length, name, data, checksum])
}

function makeIcon(size, output) {
  const pixels = Buffer.alloc((size * 4 + 1) * size)
  const radius = size * .22
  const background = [24, 61, 49, 255]
  const transparent = [0, 0, 0, 0]
  const sticks = [[.31,.40,.37,.72],[.47,.23,.50,.72],[.63,.34,.61,.72]]
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 4 + 1); pixels[row] = 0
    for (let x = 0; x < size; x += 1) {
      const dx = Math.max(radius - x, 0, x - (size - radius)); const dy = Math.max(radius - y, 0, y - (size - radius))
      let color = dx * dx + dy * dy > radius * radius ? transparent : background
      for (const [x1,y1,x2,y2] of sticks) {
        const ax=x-x1*size, ay=y-y1*size, bx=(x2-x1)*size, by=(y2-y1)*size
        const t=Math.max(0,Math.min(1,(ax*bx+ay*by)/(bx*bx+by*by))); const dist=Math.hypot(ax-t*bx,ay-t*by)
        if (dist < size*.032) color=[231,213,173,255]
      }
      const offset=row+1+x*4; pixels.set(color,offset)
    }
  }
  const header=Buffer.alloc(13); header.writeUInt32BE(size,0); header.writeUInt32BE(size,4); header.set([8,6,0,0,0],8)
  writeFileSync(output, Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(pixels)),chunk('IEND',Buffer.alloc(0))]))
}

makeIcon(192, 'public/pwa-192x192.png')
makeIcon(512, 'public/pwa-512x512.png')
makeIcon(180, 'public/apple-touch-icon.png')
