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
import { BODY_COLOR, colorToHex, CUBIE_GAP, filterColor, getFaceletPositions } from '~/utils/cube'

import type { Axis } from '~/utils/cube'

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
let renderer: WebGLRenderer | null = null
let controls: OrbitControls | null = null
let animating = false
let staticCanvas: HTMLCanvasElement | null = null
let liveCanvas: HTMLCanvasElement | null = null
let deactivateTimer: ReturnType<typeof setTimeout> | null = null
const cubeMeshes: Mesh[] = []

const BODY_HEX = colorToHex(BODY_COLOR)
const CUBIE_SIZE = 1 - CUBIE_GAP
const faceletPositions = getFaceletPositions()

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
  for (const { i, x, y, z, axis, dir } of faceletPositions)
    push(x, y, z, axis, dir, colorToHex(filterColor(props.filter, fl[i], x, y, z, fl)))
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
      roughness: hex === BODY_HEX ? 1.0 : 0.9,
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
            return getMat(fc[index]?.[axis]?.[n] ?? BODY_HEX)
          }
          return getMat(BODY_HEX)
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

function buildScene() {
  scene = new Scene()
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
}

function renderToStaticCanvas(target?: HTMLCanvasElement): HTMLCanvasElement {
  const tmpCanvas = document.createElement('canvas')
  const tmpRenderer = new WebGLRenderer({ antialias: true, canvas: tmpCanvas, alpha: true })
  tmpRenderer.setPixelRatio(window.devicePixelRatio)
  tmpRenderer.setSize(width.value, width.value)
  camera.aspect = 1
  camera.updateProjectionMatrix()
  tmpRenderer.render(scene, camera)

  const out = target || document.createElement('canvas')
  out.width = tmpCanvas.width
  out.height = tmpCanvas.height
  out.style.width = '100%'
  out.style.height = '100%'
  const ctx = out.getContext('2d')!
  ctx.drawImage(tmpCanvas, 0, 0)
  tmpRenderer.dispose()
  return out
}

function init() {
  const dom = cubeElement.value!
  buildScene()

  if (props.isStatic) {
    staticCanvas = renderToStaticCanvas()
    dom.appendChild(staticCanvas)
    staticCanvas.addEventListener('pointerdown', activate)
  }
  else {
    liveCanvas = document.createElement('canvas')
    liveCanvas.tabIndex = -1
    liveCanvas.style.outline = 'none'
    liveCanvas.addEventListener('mousedown', e => e.preventDefault())
    liveCanvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false })
    dom.appendChild(liveCanvas)
    renderer = new WebGLRenderer({ antialias: true, canvas: liveCanvas, alpha: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.shadowMap.enabled = false
    controls = new OrbitControls(camera, liveCanvas)
    controls.enablePan = false
    controls.enableZoom = false
    controls.rotateSpeed = 0.8
    controls.minPolarAngle = Math.PI * 0.1
    controls.maxPolarAngle = Math.PI * 0.8
    controls.enableDamping = true
    controls.dampingFactor = 0.12
    setSize()
    animating = true
    render()
  }
}

function activate() {
  if (!props.isStatic || !scene || !staticCanvas)
    return
  const dom = cubeElement.value!
  if (deactivateTimer) {
    clearTimeout(deactivateTimer)
    deactivateTimer = null
  }

  if (renderer)
    return

  liveCanvas = document.createElement('canvas')
  liveCanvas.tabIndex = -1
  liveCanvas.style.outline = 'none'
  liveCanvas.addEventListener('mousedown', e => e.preventDefault())
  liveCanvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false })
  dom.replaceChild(liveCanvas, staticCanvas!)

  renderer = new WebGLRenderer({ antialias: true, canvas: liveCanvas, alpha: true })
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = false
  controls = new OrbitControls(camera, liveCanvas)
  controls.enablePan = false
  controls.enableZoom = false
  controls.rotateSpeed = 0.8
  controls.minPolarAngle = Math.PI * 0.1
  controls.maxPolarAngle = Math.PI * 0.8
  controls.enableDamping = true
  controls.dampingFactor = 0.12

  setSize()
  animating = true
  render()

  liveCanvas.addEventListener('pointerup', scheduleDeactivate)
  liveCanvas.addEventListener('pointerleave', scheduleDeactivate)
}

function scheduleDeactivate() {
  if (deactivateTimer)
    clearTimeout(deactivateTimer)
  deactivateTimer = setTimeout(deactivate, 1500)
}

function deactivate() {
  if (!renderer || !props.isStatic)
    return
  const dom = cubeElement.value
  if (!dom)
    return

  animating = false
  renderToStaticCanvas(staticCanvas!)
  dom.replaceChild(staticCanvas!, liveCanvas!)
  staticCanvas!.addEventListener('pointerdown', activate)

  renderer.dispose()
  renderer = null
  controls?.dispose()
  controls = null
  liveCanvas = null
  deactivateTimer = null
}

function render() {
  if (!animating)
    return
  requestAnimationFrame(render)
  controls?.update()
  renderer?.render(scene, camera)
}

watch(facelet, () => {
  updateMaterials()
  if (props.isStatic && staticCanvas && !renderer)
    renderToStaticCanvas(staticCanvas)
})
watch(width, () => {
  if (props.isStatic && staticCanvas && !renderer) {
    renderToStaticCanvas(staticCanvas)
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
  if (deactivateTimer)
    clearTimeout(deactivateTimer)
  if (renderer)
    renderer.dispose()
  controls?.dispose()
})
</script>

<template>
  <div ref="cubeElement" class="max-w-xs" />
</template>
