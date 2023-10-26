<script setup lang="ts">
import { Algorithm, Cube } from 'insertionfinder'

const props = defineProps<{
  moves: string
  best?: boolean
}>()

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
  u: 'bg-white',
  d: 'bg-[yellow]',
  l: 'bg-[orange]',
  r: 'bg-[red]',
  f: 'bg-[green]',
  b: 'bg-[blue]',
}
const faceOrders = ['U', 'L', 'F', 'R', 'B', 'D']

function getFaceletIndex(face: string, row: number, col: number) {
  return facelet.value.charAt('UDRLFB'.indexOf(face) * 9 + row * 3 + col).toLowerCase() as keyof typeof bgs
}
function getFaceClass(index: number) {
  const row = Math.floor(index / 12)
  const col = index % 12
  let face: keyof typeof bgs | '' = ''
  switch (true) {
    case row < 3:
      if (col >= 3 && col < 6)
        face = getFaceletIndex('U', row, col - 3)
      break
    case row < 6:
      face = getFaceletIndex(faceOrders[Math.floor(col / 3) + 1], row - 3, col % 3)
      break
    case row < 9:
      if (col >= 3 && col < 6)
        face = getFaceletIndex('D', row - 6, col - 3)
      break
  }
  if (face)
    return `${bgs[face]} ring-1 ring-black`
  return ''
}
</script>

<template>
  <div class="grid grid-cols-12 grid-rows-9 gap-[1px] max-w-xs">
    <div v-for="(n, i) in 108" :key="i" class="pt-[100%]" :class="getFaceClass(i)" />
  </div>
</template>
