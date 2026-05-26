<script setup lang="ts">
const props = defineProps<{
  alias: string
  existingDescription?: string | null
}>()

const emit = defineEmits<{
  updated: [description: string]
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
    await useClientApi(`practice/${props.alias}/description`, {
      method: 'PUT',
      body: { description: description.value },
    })
    saved.value = true
    emit('updated', description.value)
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
    <label class="block font-bold text-sm">{{ t('practice.description') }}</label>
    <ClientOnly>
      <MdEditor v-model="description" :placeholder="t('practice.descriptionPlaceholder')" />
      <template #fallback>
        <textarea
          v-model="description"
          rows="4"
          class="block w-full shadow-xs border-gray-300 focus:ring-2 focus:border-indigo-300 focus:ring-indigo-200/50 text-sm"
          :placeholder="t('practice.descriptionPlaceholder')"
        />
      </template>
    </ClientOnly>
    <div class="flex items-center gap-2">
      <button
        type="submit"
        :disabled="submitting"
        class="bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white px-3 py-1.5 text-sm shadow-md transition-all duration-200 disabled:opacity-50"
      >
        {{ submitting ? t('loading') : t('form.save') }}
      </button>
      <span v-if="saved" class="text-green-600 text-sm flex items-center gap-0.5">
        <Icon name="heroicons:check-circle-16-solid" />
        {{ t('form.saved') }}
      </span>
      <span v-if="error" class="text-red-600 text-sm">{{ error }}</span>
    </div>
  </form>
</template>
