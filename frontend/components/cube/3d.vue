<script setup lang="ts">
import type { Axis, FrAxisKey, FrEmphasis } from '~/utils/cube'
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
  Spherical,
  Vector3,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

import { BODY_COLOR, colorToHex, CUBIE_GAP, filterColor, getFaceletPositions } from '~/utils/cube'

/** WebGL 3D cube renderer. For pages with many cubes, use CubeCss3d instead. */
const props = withDefaults(defineProps<{
  moves?: string
  cubieCube?: {
    corners: number[]
    edges: number[]
    placement: number
  }
  filter?: 'dr' | 'fr'
  frAxis?: FrAxisKey
  frEmphasis?: FrEmphasis
  /** When false (full FR), middle-layer edges are shown normally instead of dimmed. */
  leaveSlice?: boolean
  keyboardControls?: boolean
}>(), {
  frEmphasis: 'axis',
  leaveSlice: true,
})

const cubeElement = ref<HTMLElement>()
const { width } = useElementSize(cubeElement)
let scene: Scene
let camera: PerspectiveCamera
let renderer: WebGLRenderer | null = null
let controls: OrbitControls | null = null
let animating = false
let sceneReady = false
let isInViewport = false
let visibilityObserver: IntersectionObserver | null = null
let canvas: HTMLCanvasElement | null = null
const cubeMeshes: Mesh[] = []
const keyboardRotationKeys = new Set(['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'])
const pressedKeyboardKeys = new Set<string>()
const keyboardOffset = new Vector3()
const keyboardSpherical = new Spherical()
let keyboardThetaVelocity = 0
let keyboardPhiVelocity = 0

const BODY_HEX = colorToHex(BODY_COLOR)
const CUBIE_SIZE = 1 - CUBIE_GAP
const faceletPositions = getFaceletPositions()
const KEYBOARD_ROTATE_SPEED = 0.07
const KEYBOARD_ROTATE_ACCELERATION = 0.22
const KEYBOARD_ROTATE_FRICTION = 0.82
const KEYBOARD_ROTATE_EPSILON = 0.000_5

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
  const frOptions = props.filter === 'fr' && props.frAxis
    ? { axis: props.frAxis, emphasis: props.frEmphasis, leaveSlice: props.leaveSlice }
    : undefined
  for (const { i, x, y, z, axis, dir } of faceletPositions)
    push(x, y, z, axis, dir, colorToHex(filterColor(props.filter, fl[i], x, y, z, fl, frOptions)))
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
  cubeMeshes.length = 0
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

function destroyAll() {
  clearKeyboardRotation()
  animating = false
  if (renderer) {
    renderer.dispose()
    renderer = null
  }
  controls?.dispose()
  controls = null
  canvas = null
  cubeMeshes.length = 0
  sceneReady = false
  cubeElement.value?.replaceChildren()
}

function tryInit() {
  if (!isInViewport || !cubeElement.value || renderer)
    return
  init()
}

function init() {
  if (!cubeElement.value || width.value === 0 || renderer)
    return

  const dom = cubeElement.value

  if (!sceneReady) {
    buildScene()
    sceneReady = true
  }

  canvas = document.createElement('canvas')
  canvas.tabIndex = -1
  canvas.style.outline = 'none'
  canvas.addEventListener('mousedown', e => e.preventDefault())
  canvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false })
  dom.appendChild(canvas)
  renderer = new WebGLRenderer({ antialias: true, canvas, alpha: true })
  renderer.setClearColor(0x00_00_00, 0)
  renderer.setPixelRatio(window.devicePixelRatio)
  renderer.shadowMap.enabled = false
  controls = new OrbitControls(camera, canvas)
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

function handleKeyboardDown(e: KeyboardEvent) {
  if (!props.keyboardControls || !keyboardRotationKeys.has(e.key) || e.altKey || e.ctrlKey || e.metaKey)
    return
  e.preventDefault()
  if (renderer)
    pressedKeyboardKeys.add(e.key)
}

function handleKeyboardUp(e: KeyboardEvent) {
  if (!props.keyboardControls || !keyboardRotationKeys.has(e.key))
    return
  e.preventDefault()
  pressedKeyboardKeys.delete(e.key)
}

function clearKeyboardRotation() {
  pressedKeyboardKeys.clear()
  keyboardThetaVelocity = 0
  keyboardPhiVelocity = 0
}

function updateKeyboardRotation() {
  if (!props.keyboardControls || !controls)
    return

  const thetaDirection = Number(pressedKeyboardKeys.has('ArrowRight')) - Number(pressedKeyboardKeys.has('ArrowLeft'))
  const phiDirection = Number(pressedKeyboardKeys.has('ArrowUp')) - Number(pressedKeyboardKeys.has('ArrowDown'))

  keyboardThetaVelocity += (thetaDirection * KEYBOARD_ROTATE_SPEED - keyboardThetaVelocity) * KEYBOARD_ROTATE_ACCELERATION
  keyboardPhiVelocity += (phiDirection * KEYBOARD_ROTATE_SPEED - keyboardPhiVelocity) * KEYBOARD_ROTATE_ACCELERATION

  if (thetaDirection === 0)
    keyboardThetaVelocity *= KEYBOARD_ROTATE_FRICTION
  if (phiDirection === 0)
    keyboardPhiVelocity *= KEYBOARD_ROTATE_FRICTION

  if (Math.abs(keyboardThetaVelocity) < KEYBOARD_ROTATE_EPSILON)
    keyboardThetaVelocity = 0
  if (Math.abs(keyboardPhiVelocity) < KEYBOARD_ROTATE_EPSILON)
    keyboardPhiVelocity = 0
  if (keyboardThetaVelocity === 0 && keyboardPhiVelocity === 0)
    return

  keyboardOffset.copy(camera.position).sub(controls.target)
  keyboardSpherical.setFromVector3(keyboardOffset)
  keyboardSpherical.theta -= keyboardThetaVelocity
  keyboardSpherical.phi = Math.min(
    controls.maxPolarAngle,
    Math.max(controls.minPolarAngle, keyboardSpherical.phi + keyboardPhiVelocity),
  )
  keyboardSpherical.makeSafe()
  keyboardOffset.setFromSpherical(keyboardSpherical)
  camera.position.copy(controls.target).add(keyboardOffset)
  camera.lookAt(controls.target)
}

function render() {
  if (!animating)
    return
  requestAnimationFrame(render)
  controls?.update()
  updateKeyboardRotation()
  renderer?.render(scene, camera)
}

watch(
  () => [facelet.value, props.filter, props.frAxis, props.frEmphasis, props.leaveSlice] as const,
  () => {
    if (!sceneReady)
      return
    updateMaterials()
  },
)
watch(width, () => {
  if (isInViewport)
    tryInit()
  if (sceneReady)
    setSize()
})

onMounted(() => {
  const dom = cubeElement.value!
  if (props.keyboardControls) {
    window.addEventListener('keydown', handleKeyboardDown, { capture: true })
    window.addEventListener('keyup', handleKeyboardUp, { capture: true })
    window.addEventListener('blur', clearKeyboardRotation)
  }

  visibilityObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      isInViewport = entry.isIntersecting
      if (entry.isIntersecting) {
        tryInit()
        if (renderer) {
          visibilityObserver?.disconnect()
          visibilityObserver = null
        }
      }
    })
  }, { root: null })
  visibilityObserver.observe(dom)
})

onUnmounted(() => {
  visibilityObserver?.disconnect()
  visibilityObserver = null
  window.removeEventListener('keydown', handleKeyboardDown, { capture: true })
  window.removeEventListener('keyup', handleKeyboardUp, { capture: true })
  window.removeEventListener('blur', clearKeyboardRotation)
  destroyAll()
})
</script>

<template>
  <div
    ref="cubeElement"
    class="max-w-xs aspect-square w-full relative overflow-hidden"
  />
</template>
