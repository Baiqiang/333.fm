<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  EdgesGeometry,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshStandardMaterial,
  PerspectiveCamera,
  Scene,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

type Axis = 'x' | 'y' | 'z'

const props = defineProps<{
  moves?: string
  cubieCube?: {
    corners: number[]
    edges: number[]
    placement: number
  }
  filter?: 'dr'
  isStatic?: boolean
}>()

const cubeElement = ref<HTMLElement>()
const { width } = useElementSize(cubeElement)
let scene: Scene
let camera: PerspectiveCamera
let renderer: WebGLRenderer
let controls: OrbitControls
let animating = false
let staticCanvas: HTMLCanvasElement | null = null
const cubeMeshes: Mesh[] = []

const colorMap: Record<string, number> = {
  U: 0xFF_FF_FF,
  D: 0xFF_E0_00,
  L: 0xFF_7B_00,
  R: 0xDD_00_00,
  F: 0x00_AA_44,
  B: 0x00_66_DD,
}
const BODY_COLOR = 0x1A_1A_1A
const GRAY_COLOR = 0x80_80_80
const GAP = 0.06
const CUBIE_SIZE = 1 - GAP

const facelet = computed(() => {
  if (props.cubieCube)
    return Cube.fromCubieCube(props.cubieCube.corners, props.cubieCube.edges, props.cubieCube.placement).toFaceletString()
  const cube = new Cube()
  try {
    cube.twist(new Algorithm(removeComment(props.moves || '')))
  }
  catch {}
  return cube.toFaceletString()
})

const DR_BAD_ON_SIDE = 0xFF_FF_FF
const DR_BAD_ON_UD = 0x88_CC_FF

function isEdgePosition(x: number, y: number, z: number): boolean {
  const abs = [Math.abs(x), Math.abs(y), Math.abs(z)]
  return abs.filter(v => v === 1).length === 2 && abs.filter(v => v === 0).length === 1
}

function applyFilter(axis: Axis, stickerFace: string, x: number, y: number, z: number): number {
  if (props.filter !== 'dr')
    return colorMap[stickerFace]
  const isUD = stickerFace === 'U' || stickerFace === 'D'
  if (isUD)
    return axis === 'y' ? GRAY_COLOR : DR_BAD_ON_SIDE
  if (axis === 'y' && isEdgePosition(x, y, z))
    return DR_BAD_ON_UD
  return GRAY_COLOR
}

function buildFaceColors(fl: string) {
  const colors: Record<number, Record<string, Record<number, number>>> = {}
  function push(x: number, y: number, z: number, axis: Axis, n: number, color: number) {
    const index = x + 1 + (y + 1) * 3 + (z + 1) * 9
    if (!colors[index])
      colors[index] = {}
    if (!colors[index][axis])
      colors[index][axis] = {}
    colors[index][axis][n] = color
  }
  for (let i = 0; i < 18; i++) {
    const y = i < 9 ? 1 : -1
    const x = i % 3 - 1
    const z = (Math.floor(i % 9 / 3) - 1) * y
    push(x, y, z, 'y', y, applyFilter('y', fl[i], x, y, z))
  }
  for (let i = 18; i < 36; i++) {
    const x = i < 27 ? 1 : -1
    const y = 1 - Math.floor(i % 9 / 3)
    const z = (i % 3 - 1) * -x
    push(x, y, z, 'x', x, applyFilter('x', fl[i], x, y, z))
  }
  for (let i = 36; i < 54; i++) {
    const z = i < 45 ? 1 : -1
    const x = (i % 3 - 1) * z
    const y = 1 - Math.floor(i % 9 / 3)
    push(x, y, z, 'z', z, applyFilter('z', fl[i], x, y, z))
  }
  return colors
}

const colorConditions: [Axis, 1 | -1][] = [
  ['x', 1],
  ['x', -1],
  ['y', 1],
  ['y', -1],
  ['z', 1],
  ['z', -1],
]
const cubePositions = [-1, 0, 1]

const matCache = new Map<number, MeshStandardMaterial>()
function getMat(hex: number) {
  if (!matCache.has(hex)) {
    matCache.set(hex, new MeshStandardMaterial({
      color: new Color(hex),
      roughness: hex === BODY_COLOR ? 1.0 : 0.9,
      metalness: 0,
    }))
  }
  return matCache.get(hex)!
}

function updateMaterials() {
  if (cubeMeshes.length === 0)
    return
  const fc = buildFaceColors(facelet.value)
  let idx = 0
  cubePositions.forEach((x) => {
    cubePositions.forEach((y) => {
      cubePositions.forEach((z) => {
        const mesh = cubeMeshes[idx++]
        const matArray = colorConditions.map(([axis, n]) => {
          if (({ x, y, z })[axis] === n) {
            const index = (x + 1) + (y + 1) * 3 + (z + 1) * 9
            return getMat(fc[index]?.[axis]?.[n] ?? BODY_COLOR)
          }
          return getMat(BODY_COLOR)
        })
        mesh.material = matArray
      })
    })
  })
}

function setSize() {
  if (!renderer || !camera || width.value === 0)
    return
  camera.aspect = 1
  camera.updateProjectionMatrix()
  renderer.setSize(width.value, width.value)
}

function init() {
  const dom = cubeElement.value!
  scene = new Scene()
  const canvas = document.createElement('canvas')
  canvas.tabIndex = -1
  canvas.style.outline = 'none'
  canvas.addEventListener('mousedown', e => e.preventDefault())
  canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false })
  dom.appendChild(canvas)

  renderer = new WebGLRenderer({ antialias: true, canvas, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = false

  camera = new PerspectiveCamera(40, 1, 1, 100)
  camera.position.set(5.5, 4.5, 5.5)
  camera.lookAt(0, 0, 0)

  const ambient = new AmbientLight(0xFF_FF_FF, 3.5)
  scene.add(ambient)
  const dirLight = new DirectionalLight(0xFF_FF_FF, 0.6)
  dirLight.position.set(4, 8, 6)
  scene.add(dirLight)
  const fillLight = new DirectionalLight(0xFF_FF_FF, 0.3)
  fillLight.position.set(-3, -2, -4)
  scene.add(fillLight)

  if (!props.isStatic) {
    controls = new OrbitControls(camera, canvas)
    controls.enablePan = false
    controls.enableZoom = false
    controls.rotateSpeed = 0.8
    controls.minPolarAngle = Math.PI * 0.1
    controls.maxPolarAngle = Math.PI * 0.8
    controls.enableDamping = true
    controls.dampingFactor = 0.12
  }

  const geometry = new BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE)
  const edgesGeo = new EdgesGeometry(geometry)
  const edgeMat = new LineBasicMaterial({ color: 0x00_00_00, linewidth: 1 })
  cubePositions.forEach((x) => {
    cubePositions.forEach((y) => {
      cubePositions.forEach((z) => {
        const mesh = new Mesh(geometry, [])
        mesh.position.set(x, y, z)
        const edges = new LineSegments(edgesGeo, edgeMat)
        mesh.add(edges)
        cubeMeshes.push(mesh)
        scene.add(mesh)
      })
    })
  })

  updateMaterials()
  setSize()
  if (props.isStatic) {
    renderer.render(scene, camera)
    const srcCanvas = renderer.domElement
    const w = srcCanvas.width
    const h = srcCanvas.height
    const canvas2d = document.createElement('canvas')
    canvas2d.width = w
    canvas2d.height = h
    canvas2d.style.width = '100%'
    canvas2d.style.height = '100%'
    const ctx = canvas2d.getContext('2d')!
    ctx.drawImage(srcCanvas, 0, 0)
    dom.replaceChild(canvas2d, srcCanvas)
    staticCanvas = canvas2d
    renderer.dispose()
    renderer = null as any
  }
  else {
    animating = true
    render()
  }
}

function render() {
  if (!animating)
    return
  requestAnimationFrame(render)
  controls?.update()
  renderer.render(scene, camera)
}

function staticRerender() {
  if (!props.isStatic || !scene || !staticCanvas)
    return
  const dom = cubeElement.value
  if (!dom || width.value === 0)
    return
  const tmpCanvas = document.createElement('canvas')
  const tmpRenderer = new WebGLRenderer({ antialias: true, canvas: tmpCanvas, alpha: true })
  tmpRenderer.setPixelRatio(window.devicePixelRatio)
  tmpRenderer.setSize(width.value, width.value)
  camera.aspect = 1
  camera.updateProjectionMatrix()
  tmpRenderer.render(scene, camera)
  staticCanvas.width = tmpCanvas.width
  staticCanvas.height = tmpCanvas.height
  const ctx = staticCanvas.getContext('2d')!
  ctx.drawImage(tmpCanvas, 0, 0)
  tmpRenderer.dispose()
}

watch(facelet, () => {
  updateMaterials()
  if (props.isStatic)
    staticRerender()
})
watch(width, () => {
  if (props.isStatic) {
    staticRerender()
  }
  else {
    setSize()
  }
})

onMounted(() => {
  const dom = cubeElement.value!
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        init()
        observer.disconnect()
      }
    })
  }, { root: null })
  observer.observe(dom)
})

onUnmounted(() => {
  animating = false
  if (renderer)
    renderer.dispose()
  controls?.dispose()
})
</script>

<template>
  <div ref="cubeElement" class="max-w-xs" />
</template>
