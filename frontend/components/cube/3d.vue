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

/**
 * 3D cube renderer.
 *
 * WebGL context limit (browsers typically allow 8–16 active contexts):
 * - Default mode (isStatic=false): persistent WebGL context + animation loop.
 *   Use when the page has only one cube (analyze / practice / DR Trigger / Endless).
 * - Static mode (isStatic=true): transparent 2D snapshot by default (no persistent WebGL);
 *   click to temporarily activate interaction. For pages with many cubes on screen
 *   (FR tutorial), combined with viewport release that keeps the last snapshot visible.
 *   Single-cube pages must not use this mode.
 *
 * isStatic entry points:
 * - components/fr/tutorial-cube-step.vue
 * - components/fr/tutorial-case-card.vue (via FrCube)
 */
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
  /** Static display mode; see file header. Required for multi-cube lists (tutorial). */
  isStatic?: boolean
  /** When false (full FR), middle-layer edges are shown normally instead of dimmed. */
  leaveSlice?: boolean
  keyboardControls?: boolean
}>(), {
  frEmphasis: 'axis',
  isStatic: false,
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
let staticCanvas: HTMLCanvasElement | null = null
let liveCanvas: HTMLCanvasElement | null = null
let deactivateTimer: ReturnType<typeof setTimeout> | null = null
let livePointerDown = false
const awaitingRender = ref(props.isStatic)
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

/**
 * The tutorial page keeps dozens of static cubes in the DOM at once.
 * Creating a WebGLRenderer per cube (even with immediate dispose) can still
 * briefly exceed the context limit when scrolling quickly.
 * In isStatic mode, all instances share this offscreen renderer for 2D snapshots.
 */
let sharedStaticRenderer: WebGLRenderer | null = null

function getSharedStaticRenderer() {
  if (!sharedStaticRenderer) {
    const canvas = document.createElement('canvas')
    sharedStaticRenderer = new WebGLRenderer({ antialias: true, canvas, alpha: true })
    sharedStaticRenderer.setClearColor(0x00_00_00, 0)
  }
  return sharedStaticRenderer
}
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

function ensureStaticCanvas(dom: HTMLElement) {
  if (!staticCanvas) {
    staticCanvas = document.createElement('canvas')
    staticCanvas.style.width = '100%'
    staticCanvas.style.height = '100%'
    staticCanvas.style.display = 'block'
    dom.appendChild(staticCanvas)
    staticCanvas.addEventListener('pointerdown', onStaticPointerDown)
  }
  return staticCanvas
}

function unbindLivePointerHandlers() {
  if (!liveCanvas)
    return
  liveCanvas.removeEventListener('pointerdown', onLivePointerDown)
  liveCanvas.removeEventListener('pointerup', onLivePointerUp)
  liveCanvas.removeEventListener('pointercancel', onLivePointerUp)
}

function bindLivePointerHandlers() {
  if (!liveCanvas)
    return
  unbindLivePointerHandlers()
  liveCanvas.addEventListener('pointerdown', onLivePointerDown)
  liveCanvas.addEventListener('pointerup', onLivePointerUp)
  liveCanvas.addEventListener('pointercancel', onLivePointerUp)
}

function onLivePointerDown() {
  livePointerDown = true
  if (deactivateTimer) {
    clearTimeout(deactivateTimer)
    deactivateTimer = null
  }
}

function onLivePointerUp(e: PointerEvent) {
  livePointerDown = false
  if (e.buttons === 0)
    scheduleDeactivate()
}

function forwardPointerToLiveCanvas(e: PointerEvent) {
  if (!liveCanvas)
    return
  liveCanvas.dispatchEvent(new PointerEvent(e.type, {
    pointerId: e.pointerId,
    bubbles: true,
    cancelable: true,
    clientX: e.clientX,
    clientY: e.clientY,
    button: e.button,
    buttons: e.buttons,
    pointerType: e.pointerType,
  }))
}

function renderToStaticCanvas(target?: HTMLCanvasElement): HTMLCanvasElement {
  // isStatic only: writes to a 2D canvas; no persistent WebGL context
  const tmpRenderer = getSharedStaticRenderer()
  tmpRenderer.setPixelRatio(window.devicePixelRatio)
  tmpRenderer.setSize(width.value, width.value)
  camera.aspect = 1
  camera.updateProjectionMatrix()
  tmpRenderer.render(scene, camera)

  const out = target || document.createElement('canvas')
  out.width = tmpRenderer.domElement.width
  out.height = tmpRenderer.domElement.height
  out.style.width = '100%'
  out.style.height = '100%'
  out.style.display = 'block'
  const ctx = out.getContext('2d', { alpha: true })!
  ctx.clearRect(0, 0, out.width, out.height)
  ctx.drawImage(tmpRenderer.domElement, 0, 0)
  awaitingRender.value = false
  return out
}

function disposeLiveRenderer(dom?: HTMLElement | null) {
  if (!renderer)
    return

  animating = false
  livePointerDown = false
  unbindLivePointerHandlers()
  if (props.isStatic && liveCanvas && staticCanvas && dom) {
    renderToStaticCanvas(staticCanvas)
    dom.replaceChild(staticCanvas, liveCanvas)
    staticCanvas.addEventListener('pointerdown', onStaticPointerDown)
  }
  renderer.dispose()
  renderer = null
  controls?.dispose()
  controls = null
  liveCanvas = null
}

/** isStatic only: drop scene memory; keep last transparent 2D snapshot in the DOM */
function releaseScene() {
  if (!props.isStatic || renderer)
    return

  clearKeyboardRotation()
  if (deactivateTimer) {
    clearTimeout(deactivateTimer)
    deactivateTimer = null
  }
  disposeLiveRenderer(cubeElement.value)
  cubeMeshes.length = 0
  sceneReady = false
}

function destroyAll() {
  if (props.isStatic) {
    releaseScene()
    if (staticCanvas) {
      staticCanvas.removeEventListener('pointerdown', onStaticPointerDown)
      staticCanvas = null
    }
  }
  else {
    // Single-cube pages: live WebGL only, no snapshot path
    clearKeyboardRotation()
    if (deactivateTimer) {
      clearTimeout(deactivateTimer)
      deactivateTimer = null
    }
    if (renderer) {
      renderer.dispose()
      renderer = null
    }
    controls?.dispose()
    controls = null
    liveCanvas = null
    cubeMeshes.length = 0
    sceneReady = false
  }

  const dom = cubeElement.value
  if (dom)
    dom.replaceChildren()
  awaitingRender.value = props.isStatic
}

function tryInit() {
  if (!isInViewport || !cubeElement.value)
    return
  if (!props.isStatic && renderer)
    return
  init()
}

function init() {
  if (!cubeElement.value || width.value === 0)
    return
  if (!props.isStatic && renderer)
    return

  const dom = cubeElement.value

  if (!sceneReady) {
    buildScene()
    sceneReady = true
  }

  if (props.isStatic) {
    // Static mode: 2D snapshot by default; click upgrades to WebGL (one active context at a time)
    renderToStaticCanvas(ensureStaticCanvas(dom))
  }
  else {
    // Default mode: single-cube pages; creates a persistent WebGL context
    liveCanvas = document.createElement('canvas')
    liveCanvas.tabIndex = -1
    liveCanvas.style.outline = 'none'
    liveCanvas.addEventListener('mousedown', e => e.preventDefault())
    liveCanvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false })
    dom.appendChild(liveCanvas)
    renderer = new WebGLRenderer({ antialias: true, canvas: liveCanvas, alpha: true })
    renderer.setClearColor(0x00_00_00, 0)
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
    awaitingRender.value = false
    render()
  }
}

function onStaticPointerDown(e: PointerEvent) {
  if (renderer)
    return
  activate()
  requestAnimationFrame(() => forwardPointerToLiveCanvas(e))
}

function activate() {
  if (!props.isStatic || !staticCanvas)
    return
  const dom = cubeElement.value!
  if (deactivateTimer) {
    clearTimeout(deactivateTimer)
    deactivateTimer = null
  }

  if (renderer)
    return

  if (!sceneReady) {
    buildScene()
    sceneReady = true
  }

  liveCanvas = document.createElement('canvas')
  liveCanvas.tabIndex = -1
  liveCanvas.style.outline = 'none'
  liveCanvas.addEventListener('mousedown', e => e.preventDefault())
  liveCanvas.addEventListener('touchstart', e => e.preventDefault(), { passive: false })

  renderer = new WebGLRenderer({ antialias: true, canvas: liveCanvas, alpha: true })
  renderer.setClearColor(0x00_00_00, 0)
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
  renderer.render(scene, camera)
  dom.replaceChild(liveCanvas, staticCanvas!)
  animating = true
  render()

  bindLivePointerHandlers()
}

function scheduleDeactivate() {
  if (livePointerDown || !renderer)
    return
  if (deactivateTimer)
    clearTimeout(deactivateTimer)
  deactivateTimer = setTimeout(deactivate, 1500)
}

function deactivate() {
  if (livePointerDown || !renderer || !props.isStatic)
    return
  const dom = cubeElement.value
  if (!dom || !staticCanvas || !liveCanvas)
    return

  disposeLiveRenderer(dom)
  deactivateTimer = null
}

function handleKeyboardDown(e: KeyboardEvent) {
  if (!props.keyboardControls || !keyboardRotationKeys.has(e.key) || e.altKey || e.ctrlKey || e.metaKey)
    return
  e.preventDefault()

  if (props.isStatic && staticCanvas && !renderer)
    activate()

  if (renderer)
    pressedKeyboardKeys.add(e.key)
}

function handleKeyboardUp(e: KeyboardEvent) {
  if (!props.keyboardControls || !keyboardRotationKeys.has(e.key))
    return
  e.preventDefault()
  pressedKeyboardKeys.delete(e.key)

  if (props.isStatic && pressedKeyboardKeys.size === 0)
    scheduleDeactivate()
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
    if (props.isStatic && staticCanvas && !renderer)
      renderToStaticCanvas(staticCanvas)
  },
)
watch(width, () => {
  if (isInViewport)
    tryInit()
  if (!sceneReady)
    return
  if (props.isStatic && staticCanvas && !renderer) {
    renderToStaticCanvas(staticCanvas)
  }
  else {
    setSize()
  }
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
        // Single-cube pages: lazy-init once, then stop observing (no teardown on scroll-away)
        if (!props.isStatic && renderer) {
          visibilityObserver?.disconnect()
          visibilityObserver = null
        }
      }
      else if (props.isStatic && !renderer) {
        // Multi-cube tutorial: release scene memory but keep the last 2D snapshot visible
        releaseScene()
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
    :class="{ 'opacity-40 animate-pulse': awaitingRender }"
  />
</template>
