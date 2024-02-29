<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'
import { BoxGeometry, Color, Mesh, PerspectiveCamera, Scene, ShaderMaterial, WebGLRenderer } from 'three'
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
const cubes: Mesh[] = []

const bgs: Record<string, string> = {
  U: 'white',
  D: 'yellow',
  L: 'orange',
  R: 'red',
  F: 'green',
  B: 'blue',
}
const facelet = computed(() => {
  if (props.cubieCube)
    return Cube.fromCubieCube(props.cubieCube.corners, props.cubieCube.edges, props.cubieCube.placement).toFaceletString()
  const cube = new Cube()
  try {
    cube.twist(new Algorithm(removeComment(props.moves || '')))
  }
  catch (e) {
  }
  return cube.toFaceletString()
})
const faceColors = computed(() => {
  // 0-9: U, 9-18: D, 18-27: R, 27-36: L, 36-45: F, 45-54: B
  const colors: Record<number, Record<string, Record<number, string>>> = {}
  for (let i = 0; i < 18; i++) {
    const face = facelet.value[i]
    const y = i < 9 ? 1 : -1
    const x = i % 3 - 1
    const z = (Math.floor(i % 9 / 3) - 1) * y
    push(x, y, z, 'y', y, bgs[face])
  }
  for (let i = 18; i < 36; i++) {
    const face = facelet.value[i]
    const x = i < 27 ? 1 : -1
    const y = 1 - Math.floor(i % 9 / 3)
    const z = (i % 3 - 1) * -x
    push(x, y, z, 'x', x, bgs[face])
  }
  for (let i = 36; i < 54; i++) {
    const face = facelet.value[i]
    const z = i < 45 ? 1 : -1
    const x = (i % 3 - 1) * z
    const y = 1 - Math.floor(i % 9 / 3)
    push(x, y, z, 'z', z, bgs[face])
  }
  function push(x: number, y: number, z: number, axis: Axis, n: number, color: string) {
    const index = x + 1 + (y + 1) * 3 + (z + 1) * 9
    if (!colors[index])
      colors[index] = {}
    if (!colors[index][axis])
      colors[index][axis] = {}
    colors[index][axis][n] = color
  }
  return colors
})
const fragmentShader = `
varying vec2 vUv;
uniform vec3 faceColor;

void main() {
    vec3 border = vec3(0.533);
    float bl = smoothstep(0.0, 0.03, vUv.x);
    float br = smoothstep(1.0, 0.97, vUv.x);
    float bt = smoothstep(0.0, 0.03, vUv.y);
    float bb = smoothstep(1.0, 0.97, vUv.y);
    vec3 c = mix(border, faceColor, bt*br*bb*bl);
    gl_FragColor = vec4(c, 1.0);
}
`
const vertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}
`
const materials: Record<string, ShaderMaterial> = {
  white: createMaterial(new Color(Color.NAMES.white)),
  yellow: createMaterial(new Color(Color.NAMES.yellow)),
  orange: createMaterial(new Color(Color.NAMES.orange)),
  red: createMaterial(new Color(Color.NAMES.red)),
  green: createMaterial(new Color('#00bb00')),
  blue: createMaterial(new Color(Color.NAMES.blue)),
  gray: createMaterial(new Color(Color.NAMES.gray)),
}
const cubePositions = [-1, 0, 1]
const colorConditions: [Axis, 1 | -1][] = [
  ['x', 1],
  ['x', -1],
  ['y', 1],
  ['y', -1],
  ['z', 1],
  ['z', -1],
]

function createMaterial(color: Color) {
  return new ShaderMaterial({
    fragmentShader,
    vertexShader,
    uniforms: { faceColor: { type: 'v3', value: color } } as any,
  })
}
function setSize() {
  camera.updateProjectionMatrix()
  renderer.setSize(width.value, width.value)
}
function init() {
  const dom = cubeElement.value!
  scene = new Scene()
  const canvas = document.createElement('canvas')
  canvas.width = width.value
  canvas.height = width.value
  dom.appendChild(canvas)

  renderer = new WebGLRenderer({ antialias: true, canvas })
  renderer.setClearColor('#f0f0f0')
  renderer.setSize(width.value, width.value)
  renderer.setPixelRatio(window.devicePixelRatio)
  camera = new PerspectiveCamera(45, 1, 1, 1000)
  camera.position.set(4, 4, 4)
  controls = new OrbitControls(camera, canvas)
  // disallow drag and zoom
  controls.enablePan = false
  controls.enableZoom = false
  createCube()
  render()

  window.addEventListener('resize', setSize)
}
function createCube() {
  const geometry = new BoxGeometry(1, 1, 1)
  const createCube = (position: Record<Axis, number>) => {
    const material = []
    for (const colorCondition of colorConditions) {
      if (position[colorCondition[0]] === colorCondition[1]) {
        // calculate facelet index
        const index = (position.x + 1) + (position.y + 1) * 3 + (position.z + 1) * 9
        const color = faceColors.value[index][colorCondition[0]][colorCondition[1]]
        material.push(materials[color])
      }
      else {
        material.push(materials.gray)
      }
    }
    const cube = new Mesh(geometry, material)
    cube.position.set(position.x, position.y, position.z)
    cubes.push(cube)
    scene.add(cube)
  }

  cubePositions.forEach((x) => {
    cubePositions.forEach((y) => {
      cubePositions.forEach((z) => {
        createCube({ x, y, z })
      })
    })
  })
}
function render() {
  requestAnimationFrame(render)
  renderer.render(scene, camera)
}
onMounted(async () => {
  const dom = cubeElement.value!
  // add events to detect if dom is visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        init()
        observer.disconnect()
      }
    })
  }, {
    root: document.documentElement,
  })
  observer.observe(dom)
})
</script>

<template>
  <div ref="cubeElement" class="max-w-xs" />
</template>
