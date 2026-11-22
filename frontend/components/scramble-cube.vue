<script setup lang="ts">
const props = defineProps<{
  moves: string
  cubieCube?: {
    corners: number[]
    edges: number[]
    placement: number
  }
  /** The competition has ended or the user has submitted to this scramble. */
  finished?: boolean
}>()
const mode = usePreference('scrambleCubeMode', 'each')
const revealed = ref(false)
const showCube = computed(() => revealed.value
  || mode.value === 'always'
  || (mode.value === 'finished' && props.finished))
const settingsOpen = ref(false)
</script>

<template>
  <div :class="showCube ? 'flex flex-col items-start' : 'flex items-center gap-1'">
    <CubeExpanded v-if="showCube" :moves="moves" :cubie-cube="cubieCube" class="w-full" />
    <button
      v-else
      class="my-2 flex items-center gap-1 text-sm text-blue-500 hover:text-blue-600"
      @click="revealed = true"
    >
      <Icon name="mdi:cube-unfolded" />
      {{ $t('home.showCube') }}
    </button>
    <button
      v-if="mode !== 'always'"
      :class="showCube ? 'mt-1' : 'my-2'"
      class="flex items-center text-gray-400 hover:text-gray-600"
      :title="$t('settings.scrambleCube')"
      :aria-label="$t('settings.scrambleCube')"
      @click="settingsOpen = true"
    >
      <Icon name="mdi:cog-outline" />
    </button>
    <Teleport to="body">
      <Modal v-if="settingsOpen" :cancel="() => settingsOpen = false">
        <div class="mb-4 font-bold">
          {{ $t('settings.scrambleCube') }}
        </div>
        <ScrambleCubeModeOptions />
        <div class="mt-5 flex justify-end">
          <button class="bg-indigo-500 hover:bg-indigo-500/90 text-white cursor-pointer px-2 py-1" @click="settingsOpen = false">
            {{ $t('form.confirm') }}
          </button>
        </div>
      </Modal>
    </Teleport>
  </div>
</template>
