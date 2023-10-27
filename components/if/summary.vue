<script setup lang="ts">
const props = defineProps<{
  finder: InsertionFinder
  editable?: boolean
  users?: User[]
}>()
const emit = defineEmits<{
  remove: [hash: string]
  edit: [userIF: InsertionFinder]
}>()
const { t } = useI18n()
const hasName = computed(() => props.finder.name !== undefined)
const isIF = computed(() => props.finder.type === IFType.INSERTION_FINDER)
const isSF = computed(() => props.finder.type === IFType.SLICEY_FINDER)
const type = computed(() => isIF.value ? t('if.title') : t('sf.title'))
</script>

<template>
  <div class="flex flex-col">
    <fieldset class="flex-1 border border-opacity-50 px-4 py-2 transition-colors hover:bg-opacity-50" :class="{ 'border-if hover:bg-if': isIF, 'border-sf hover:bg-sf': isSF }">
      <legend class="bg-opacity-50 px-2 text-gray" :class="{ 'bg-if': isIF, 'bg-sf': isSF }">
        {{ type }}
      </legend>
      <NuxtLink :to="`/${isIF ? 'if' : 'sf'}/${finder.hash}`" class="block h-full">
        <div v-if="hasName">
          <div class="font-bold text-sm">
            {{ $t('if.name.label') }}
          </div>
          <div class="text-true-gray-500">
            {{ finder.name || '-' }}
          </div>
        </div>
        <div v-if="isIF" class="mb-2">
          <div class="font-bold text-sm">
            {{ $t('if.scramble.label') }}
          </div>
          <div class="text-true-gray-500">
            {{ finder.scramble }}
          </div>
        </div>
        <div>
          <div class="font-bold text-sm">
            {{ $t('if.skeleton.label') }}
          </div>
          <div class="text-true-gray-500">
            {{ finder.skeleton }}
          </div>
        </div>
        <div v-if="finder.status === IFStatus.FINISHED">
          <div class="font-bold text-sm">
            {{ $t('if.fewestmoves') }}
          </div>
          <div class="text-true-gray-500">
            {{ finder.result.fewest_moves }}
          </div>
        </div>
        <div v-else>
          <div class="font-bold text-sm">
            {{ $t('common.status') }}
          </div>
          <div class="text-true-gray-500">
            {{ finder.result.fewest_moves }}
          </div>
        </div>
        <div>
          <div class="font-bold text-sm">
            {{ $t('common.createdAt') }}
          </div>
          <div class="text-true-gray-500">
            {{ $dayjs(finder.createdAt).format('YYYY-MM-DD HH:mm:ss') }}
          </div>
        </div>
      </NuxtLink>
    </fieldset>
    <div v-if="editable" class="flex gap-2 my-1">
      <button class="bg-sky-500 hover:bg-opacity-90 text-white px-2 py-1 flex items-center" @click="emit('edit', finder)">
        <Icon name="solar:pen-new-square-bold-duotone" size="20" />
      </button>
      <button class="bg-rose-500 hover:bg-opacity-90 text-white px-2 py-1 flex items-center" @click="emit('remove', finder.hash)">
        <Icon name="solar:trash-bin-2-bold-duotone" size="20" />
      </button>
    </div>
    <div v-if="users">
      <NuxtLink v-for="user in users" :key="user.id" :to="{ path: '/admin/user/if', query: { id: user.id } }" class="text-blue-500 my-2">
        {{ user.name }}
      </NuxtLink>
    </div>
  </div>
</template>
