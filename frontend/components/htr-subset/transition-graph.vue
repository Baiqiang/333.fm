<script setup lang="ts">
import type { HTRSubsetStat } from '~/utils/htr-subset-stats'

const props = defineProps<{
  subsets: HTRSubsetStat[]
  /** Stack QT levels as rows instead of columns, for narrow screens. */
  vertical?: boolean
}>()

const emit = defineEmits<{
  select: [name: string]
}>()

const NODE_H = 26

const levels = computed(() => [...new Set(props.subsets.map(s => s.qt))].sort((a, b) => b - a))
const maxPerLevel = computed(() => Math.max(...levels.value.map(qt => props.subsets.filter(s => s.qt === qt).length)))

const layout = computed(() => props.vertical
  ? { width: 340, nodeW: 88, label: 36, gap: 58, top: 4 }
  : { width: 760, nodeW: 82, label: 0, gap: 46, top: 26 })

const size = computed(() => {
  const { width, gap, top } = layout.value
  return props.vertical
    ? { width, height: top + (levels.value.length - 1) * gap + NODE_H + 4 }
    : { width, height: top + maxPerLevel.value * gap }
})

const nodes = computed(() => {
  const { width, nodeW, label, gap, top } = layout.value
  return props.subsets.map((s) => {
    const level = levels.value.indexOf(s.qt)
    const siblings = props.subsets.filter(x => x.qt === s.qt)
    const index = siblings.indexOf(s)
    if (props.vertical) {
      const slot = (width - label) / siblings.length
      return { subset: s, x: label + slot * index + (slot - nodeW) / 2, y: top + level * gap }
    }
    const columnGap = (width - nodeW) / (levels.value.length - 1)
    const offset = (maxPerLevel.value - siblings.length) * gap / 2
    return { subset: s, x: level * columnGap, y: top + offset + index * gap }
  })
})

const labels = computed(() => {
  const { width, nodeW, gap, top } = layout.value
  return levels.value.map((qt, i) => props.vertical
    ? { qt, x: 0, y: top + i * gap + NODE_H / 2 + 4, anchor: 'start' }
    : { qt, x: i * (width - nodeW) / (levels.value.length - 1) + nodeW / 2, y: 12, anchor: 'middle' })
})

const edges = computed(() => {
  const { nodeW } = layout.value
  const byName = new Map(nodes.value.map(n => [n.subset.name, n]))
  return nodes.value.flatMap(from => from.subset.transitions
    .filter(t => t.qt < from.subset.qt)
    .map((t) => {
      const to = byName.get(t.name)!
      let d: string
      if (props.vertical) {
        const x1 = from.x + nodeW / 2
        const y1 = from.y + NODE_H
        const x2 = to.x + nodeW / 2
        const y2 = to.y - 4
        const mid = (y1 + y2) / 2
        d = `M ${x1} ${y1} C ${x1} ${mid}, ${x2} ${mid}, ${x2} ${y2}`
      }
      else {
        const x1 = from.x + nodeW
        const y1 = from.y + NODE_H / 2
        const x2 = to.x - 4
        const y2 = to.y + NODE_H / 2
        const mid = (x1 + x2) / 2
        d = `M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`
      }
      return { key: `${from.subset.name}->${t.name}`, color: HTR_GROUP_STYLES[from.subset.group].hex, d }
    }))
})
</script>

<template>
  <svg :viewBox="`-2 0 ${size.width + 4} ${size.height}`" class="w-full" :class="vertical ? '' : 'min-w-[640px]'">
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
      v-for="l in labels"
      :key="l.qt"
      :x="l.x"
      :y="l.y"
      :text-anchor="l.anchor"
      class="fill-gray-500 text-[11px] font-semibold"
    >
      {{ l.qt }}QT
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
      <rect :x="n.x" :y="n.y" :width="layout.nodeW" :height="NODE_H" :fill="HTR_GROUP_STYLES[n.subset.group].hex" />
      <text :x="n.x + layout.nodeW / 2" :y="n.y + NODE_H / 2 + 4" text-anchor="middle" class="fill-white text-[12px] font-semibold">
        {{ n.subset.name }}
      </text>
    </g>
  </svg>
</template>
