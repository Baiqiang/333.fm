<script setup lang="ts">
const props = defineProps<{
  wcaCompetitionId: string
  existingDescription?: string | null
}>()

const emit = defineEmits<{
  updated: []
}>()

const { t } = useI18n()
const description = ref(props.existingDescription ?? '')
const submitting = ref(false)
const error = ref('')
const saved = ref(false)

async function save() {
  submitting.value = true
  error.value = ''
  saved.value = false
  try {
    await useClientApi(`wca/reconstruction/${props.wcaCompetitionId}/description`, {
      method: 'PUT',
      body: { description: description.value },
    })
    saved.value = true
    emit('updated')
    setTimeout(() => {
      saved.value = false
    }, 2000)
  }
  catch (e: any) {
    error.value = e?.data?.message || e?.message || 'Failed'
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <form class="space-y-2" @submit.prevent="save">
    <label class="block font-bold text-sm">{{ t('wca.recon.description') }}</label>
    <ClientOnly>
      <MdEditor v-model="description" :placeholder="t('wca.recon.descriptionPlaceholder')" />
      <template #fallback>
        <textarea
          v-model="description"
          rows="4"
          class="block w-full shadow-sm border-gray-300 focus:ring-2 focus:ring-opacity-50 focus:border-indigo-300 focus:ring-indigo-200 text-sm"
          :placeholder="t('wca.recon.descriptionPlaceholder')"
        />
      </template>
    </ClientOnly>
    <div class="flex items-center gap-2">
      <button
        type="submit"
        :disabled="submitting"
        class="bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white px-3 py-1.5 text-sm shadow-md transition-all duration-200 disabled:opacity-50"
      >
        {{ submitting ? t('loading') : t('wca.recon.saveDescription') }}
      </button>
      <span v-if="saved" class="text-green-600 text-sm flex items-center gap-0.5">
        <Icon name="heroicons:check-circle-16-solid" />
        {{ t('wca.recon.saved') }}
      </span>
      <span v-if="error" class="text-red-600 text-sm">{{ error }}</span>
    </div>
  </form>
</template>
