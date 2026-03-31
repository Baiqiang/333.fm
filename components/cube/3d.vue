<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
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
}>()

const cubeElement = ref<HTMLElement>()
const { width } = useElementSize(cubeElement)
let scene: Scene
let camera: PerspectiveCamera
let renderer: WebGLRenderer
let controls: OrbitControls
let animating = false
const cubeMeshes: Mesh[] = []

const colorMap: Record<string, number> = {
  U: 0xFF_FF_FF,
  D: 0xFF_D5_00,
  L: 0xFF_8C_00,
  R: 0xC4_1E_3A,
  F: 0x00_9E_60,
  B: 0x00_51_BA,
}
const BODY_COLOR = 0x1A_1A_1A
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
    push(x, y, z, 'y', y, colorMap[fl[i]])
  }
  for (let i = 18; i < 36; i++) {
    const x = i < 27 ? 1 : -1
    const y = 1 - Math.floor(i % 9 / 3)
    const z = (i % 3 - 1) * -x
    push(x, y, z, 'x', x, colorMap[fl[i]])
  }
  for (let i = 36; i < 54; i++) {
    const z = i < 45 ? 1 : -1
    const x = (i % 3 - 1) * z
    const y = 1 - Math.floor(i % 9 / 3)
    push(x, y, z, 'z', z, colorMap[fl[i]])
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
      roughness: hex === BODY_COLOR ? 0.9 : 0.25,
      metalness: hex === BODY_COLOR ? 0.0 : 0.02,
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

  const ambient = new AmbientLight(0xFF_FF_FF, 2.5)
  scene.add(ambient)
  const dirLight = new DirectionalLight(0xFF_FF_FF, 1.5)
  dirLight.position.set(4, 8, 6)
  scene.add(dirLight)
  const fillLight = new DirectionalLight(0xFF_FF_FF, 0.8)
  fillLight.position.set(-3, -2, -4)
  scene.add(fillLight)

  controls = new OrbitControls(camera, canvas)
  controls.enablePan = false
  controls.enableZoom = false
  controls.rotateSpeed = 0.8
  controls.minPolarAngle = Math.PI * 0.1
  controls.maxPolarAngle = Math.PI * 0.8
  controls.enableDamping = true
  controls.dampingFactor = 0.12

  const geometry = new BoxGeometry(CUBIE_SIZE, CUBIE_SIZE, CUBIE_SIZE)
  cubePositions.forEach((x) => {
    cubePositions.forEach((y) => {
      cubePositions.forEach((z) => {
        const mesh = new Mesh(geometry, [])
        mesh.position.set(x, y, z)
        cubeMeshes.push(mesh)
        scene.add(mesh)
      })
    })
  })

  updateMaterials()
  setSize()
  animating = true
  render()
}

function render() {
  if (!animating)
    return
  requestAnimationFrame(render)
  controls.update()
  renderer.render(scene, camera)
}

watch(facelet, updateMaterials)
watch(width, setSize)

onMounted(() => {
  const dom = cubeElement.value!
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        init()
        observer.disconnect()
      }
    })
  }, { root: document.documentElement })
  observer.observe(dom)
})

onUnmounted(() => {
  animating = false
  renderer?.dispose()
  controls?.dispose()
})
</script>

<template>
  <div ref="cubeElement" class="max-w-xs" />
</template>
