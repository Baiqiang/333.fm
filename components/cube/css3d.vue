<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'
import { BODY_COLOR, CUBIE_GAP, filterColor, getFaceletPositions } from '~/utils/cube'

const props = defineProps<{
  moves?: string
  filter?: 'dr'
}>()

const container = ref<HTMLElement>()
const canvas = ref<HTMLCanvasElement>()
const { width: containerWidth } = useElementSize(container)
let rotX = 25
let rotY = -45
let dragging = false
let lastPx = 0
let lastPy = 0

const faceletPositions = getFaceletPositions()

const facelet = computed(() => {
  const cube = new Cube()
  try {
    cube.twist(new Algorithm(removeComment(props.moves || '')))
  }
  catch {}
  return cube.toFaceletString()
})

interface Quad {
  pts: [number, number, number][]
  color: string
}

function buildQuads(): Quad[] {
  const fl = facelet.value
  const quads: Quad[] = []
  const S = 1 - CUBIE_GAP
  const H = S / 2

  function addSticker(cx: number, cy: number, cz: number, axis: 'x' | 'y' | 'z', dir: number, color: string) {
    const pts: [number, number, number][] = []
    if (axis === 'y') {
      const y = cy + dir * H
      pts.push([cx - H, y, cz - H], [cx + H, y, cz - H], [cx + H, y, cz + H], [cx - H, y, cz + H])
    }
    else if (axis === 'x') {
      const x = cx + dir * H
      pts.push([x, cy - H, cz - H], [x, cy + H, cz - H], [x, cy + H, cz + H], [x, cy - H, cz + H])
    }
    else {
      const z = cz + dir * H
      pts.push([cx - H, cy - H, z], [cx + H, cy - H, z], [cx + H, cy + H, z], [cx - H, cy + H, z])
    }
    quads.push({ pts, color })
  }

  function addBody(cx: number, cy: number, cz: number, axis: 'x' | 'y' | 'z', dir: number) {
    addSticker(cx, cy, cz, axis, dir, BODY_COLOR)
  }

  const POS = [-1, 0, 1]
  for (const x of POS) {
    for (const y of POS) {
      for (const z of POS) {
        if (x === 1)
          addBody(x, y, z, 'x', 1)
        if (x === -1)
          addBody(x, y, z, 'x', -1)
        if (y === 1)
          addBody(x, y, z, 'y', 1)
        if (y === -1)
          addBody(x, y, z, 'y', -1)
        if (z === 1)
          addBody(x, y, z, 'z', 1)
        if (z === -1)
          addBody(x, y, z, 'z', -1)
      }
    }
  }

  for (const { i, x, y, z, axis, dir } of faceletPositions)
    addSticker(x, y, z, axis, dir, filterColor(props.filter, fl[i], x, y, z, fl))
  return quads
}

function rotatePoint(p: [number, number, number], rx: number, ry: number): [number, number, number] {
  const cosX = Math.cos(rx)
  const sinX = Math.sin(rx)
  const cosY = Math.cos(ry)
  const sinY = Math.sin(ry)
  const [px, py, pz] = p
  const x1 = px * cosY + pz * sinY
  const z1 = -px * sinY + pz * cosY
  const y2 = py * cosX - z1 * sinX
  const z2 = py * sinX + z1 * cosX
  return [x1, y2, z2]
}

function draw() {
  const cvs = canvas.value
  if (!cvs)
    return
  const size = containerWidth.value
  if (size === 0)
    return
  const dpr = window.devicePixelRatio || 1
  cvs.width = size * dpr
  cvs.height = size * dpr
  cvs.style.width = `${size}px`
  cvs.style.height = `${size}px`
  const ctx = cvs.getContext('2d')!
  ctx.scale(dpr, dpr)
  ctx.clearRect(0, 0, size, size)

  const rx = rotX * Math.PI / 180
  const ry = rotY * Math.PI / 180
  const dist = 8
  const fov = size * 0.9

  const quads = buildQuads()
  const projected = quads.map((q) => {
    const rPts = q.pts.map(p => rotatePoint(p, rx, ry))
    const avgZ = rPts.reduce((s, p) => s + p[2], 0) / rPts.length
    const pts2d = rPts.map((p) => {
      const scale = fov / (dist - p[2])
      return [size / 2 + p[0] * scale, size / 2 - p[1] * scale] as [number, number]
    })
    return { pts2d, color: q.color, z: avgZ }
  })

  projected.sort((a, b) => a.z - b.z)

  for (const q of projected) {
    ctx.beginPath()
    ctx.moveTo(q.pts2d[0][0], q.pts2d[0][1])
    for (let i = 1; i < q.pts2d.length; i++)
      ctx.lineTo(q.pts2d[i][0], q.pts2d[i][1])
    ctx.closePath()
    ctx.fillStyle = q.color
    ctx.fill()
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 0.5
    ctx.stroke()
  }
}

watch([facelet, containerWidth], draw)

onMounted(() => {
  nextTick(draw)
})

function onPointerDown(e: PointerEvent) {
  dragging = true
  lastPx = e.clientX
  lastPy = e.clientY
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onPointerMove(e: PointerEvent) {
  if (!dragging)
    return
  const speed = 180 / Math.max(containerWidth.value, 100)
  rotY += (e.clientX - lastPx) * speed
  rotX = Math.max(-89, Math.min(89, rotX + (e.clientY - lastPy) * speed))
  lastPx = e.clientX
  lastPy = e.clientY
  draw()
}

function onPointerUp() {
  dragging = false
}
</script>

<template>
  <div
    ref="container"
    class="select-none touch-none cursor-grab active:cursor-grabbing"
    @pointerdown.prevent="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerUp"
  >
    <canvas ref="canvas" />
  </div>
</template>
