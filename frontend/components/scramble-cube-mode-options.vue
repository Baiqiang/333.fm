<script setup lang="ts">
const mode = usePreference('scrambleCubeMode', 'each')
</script>

<template>
  <div class="space-y-2">
    <label
      v-for="option in SCRAMBLE_CUBE_MODES"
      :key="option"
      class="flex items-start gap-2 cursor-pointer"
    >
      <input
        v-model="mode"
        type="radio"
        name="scramble-cube-mode"
        :value="option"
        class="mt-1 text-indigo-500 focus:ring-indigo-200/50"
      >
      <div>
        <div class="font-medium">
          {{ $t(`settings.scrambleCubeModes.${option}.label`) }}
        </div>
        <div class="text-sm text-gray-500">
          {{ $t(`settings.scrambleCubeModes.${option}.description`) }}
        </div>
      </div>
    </label>
  </div>
</template>
