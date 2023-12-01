<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'
import Two from 'two.js'
import type { Group } from 'two.js/src/group'
import type { Rectangle } from 'two.js/src/shapes/rectangle'

const props = defineProps<{
  moves: string
  best?: boolean
}>()

const cubeElement = ref<HTMLCanvasElement>()

const facelet = computed(() => {
  try {
    const cube = new Cube()
    cube.twist(new Algorithm(removeComment(props.moves)))
    if (props.best) {
      // cube = cube.getBestPlacement()
    }
    return cube.toFaceletString()
  }
  catch (e) {
    return ''
  }
})
const bgs = {
  U: 'white',
  D: 'yellow',
  L: 'orange',
  R: 'red',
  F: 'green',
  B: 'blue',
}
let two: Two
let group: Group
let scale = 1
function setSize() {
  const dom = cubeElement.value!
  if (!dom || dom.clientWidth === 0)
    return
  scale = scale * dom.clientWidth / two.width
  two.width = dom.clientWidth
  two.height = dom.clientWidth * 3 / 4
  group.scale = scale
  two.update()
}
function init() {
  const dom = cubeElement.value!
  two.width = dom.clientWidth
  setSize()
  const rectSize = (two.width - 13) / 12 + 1
  for (let i = 0; i < 54; i++) {
    let x = i % 3
    let y = Math.floor(i / 3) % 3
    if (i < 18) {
      x += 3
      if (i >= 9)
        y += 6
    }
    else {
      x += Math.floor(i / 9) % 3 * 3
      if (i >= 45)
        x += 3
      y += 3
    }

    const rect = two.makeRectangle(x * rectSize + rectSize / 2, y * rectSize + rectSize / 2, rectSize, rectSize)
    rect.fill = bgs[facelet.value[i] as keyof typeof bgs]
    rect.stroke = 'black'
    group.add(rect)
  }
  group.position.set(0, 0)
  two.update()
  window.addEventListener('resize', setSize)
}
watch(facelet, () => {
  for (let i = 0; i < facelet.value.length; i++) {
    const rect = group.children[i] as Rectangle
    rect.fill = bgs[facelet.value[i] as keyof typeof bgs]
  }
  two.update()
})
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
  two = new Two({
    type: Two.Types.canvas,
  }).appendTo(dom)
  group = two.makeGroup()
})
</script>

<template>
  <div ref="cubeElement" class="max-w-xs" />
</template>
