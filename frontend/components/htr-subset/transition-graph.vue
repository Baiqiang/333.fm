<script setup lang="ts">
import type { HTRSubsetStat } from '~/utils/htr-subset-stats'

const props = defineProps<{
  subsets: HTRSubsetStat[]
}>()

const emit = defineEmits<{
  select: [name: string]
}>()

const WIDTH = 760
const NODE_W = 82
const NODE_H = 26
const ROW_GAP = 46
const TOP = 26

const levels = computed(() => [...new Set(props.subsets.map(s => s.qt))].sort((a, b) => b - a))
const columnGap = computed(() => (WIDTH - NODE_W) / (levels.value.length - 1))
const height = computed(() => TOP + Math.max(...levels.value.map(qt => props.subsets.filter(s => s.qt === qt).length)) * ROW_GAP)

const nodes = computed(() => {
  const maxRows = Math.max(...levels.value.map(qt => props.subsets.filter(s => s.qt === qt).length))
  return props.subsets.map((s) => {
    const column = levels.value.indexOf(s.qt)
    const siblings = props.subsets.filter(x => x.qt === s.qt)
    const row = siblings.indexOf(s)
    const offset = (maxRows - siblings.length) * ROW_GAP / 2
    return {
      subset: s,
      x: column * columnGap.value,
      y: TOP + offset + row * ROW_GAP,
    }
  })
})

const edges = computed(() => {
  const byName = new Map(nodes.value.map(n => [n.subset.name, n]))
  return nodes.value.flatMap(from => from.subset.transitions
    .filter(t => t.qt < from.subset.qt)
    .map((t) => {
      const to = byName.get(t.name)!
      const x1 = from.x + NODE_W
      const y1 = from.y + NODE_H / 2
      const x2 = to.x - 4
      const y2 = to.y + NODE_H / 2
      const mid = (x1 + x2) / 2
      return {
        key: `${from.subset.name}->${t.name}`,
        color: HTR_GROUP_STYLES[from.subset.group].hex,
        d: `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`,
      }
    }))
})
</script>

<template>
  <svg :viewBox="`-2 0 ${WIDTH + 4} ${height}`" class="w-full min-w-[640px]">
    <defs>
      <marker
        id="htr-arrow"
        viewBox="0 0 10 10"
        refX="9"
        refY="5"
        markerWidth="6"
        markerHeight="6"
        orient="auto-start-reverse"
      >
        <path d="M 0 0 L 10 5 L 0 10 z" fill="#9ca3af" />
      </marker>
    </defs>
    <text
      v-for="(qt, i) in levels"
      :key="qt"
      :x="i * columnGap + NODE_W / 2"
      y="12"
      text-anchor="middle"
      class="fill-gray-500 text-[11px] font-semibold"
    >
      {{ qt }}QT
    </text>
    <path
      v-for="e in edges"
      :key="e.key"
      :d="e.d"
      fill="none"
      :stroke="e.color"
      stroke-opacity="0.55"
      stroke-width="1.6"
      marker-end="url(#htr-arrow)"
    />
    <g
      v-for="n in nodes"
      :key="n.subset.name"
      class="cursor-pointer hover:opacity-80"
      @click="emit('select', n.subset.name)"
    >
      <rect :x="n.x" :y="n.y" :width="NODE_W" :height="NODE_H" :fill="HTR_GROUP_STYLES[n.subset.group].hex" />
      <text :x="n.x + NODE_W / 2" :y="n.y + NODE_H / 2 + 4" text-anchor="middle" class="fill-white text-[12px] font-semibold">
        {{ n.subset.name }}
      </text>
    </g>
  </svg>
</template>
