<script setup lang="ts">
const attachments = defineModel<Attachment[]>({ default: () => [] })
const uploading = defineModel<Promise<any> | undefined>('uploading')

const fileInputRef = ref<{ $el: HTMLElement } | null>(null)
const uploadingFiles = ref<File[]>([])

function triggerFileInput() {
  const input = fileInputRef.value?.$el?.querySelector('input[type="file"]') as HTMLInputElement | null
  input?.click()
}

async function upload(event: Event) {
  const files = (event.target as HTMLInputElement)?.files
  if (!files || files.length === 0)
    return
  let resolve = () => {}
  uploading.value = new Promise<void>(r => resolve = r)
  const formData = new FormData()
  for (const file of files) {
    formData.append('attachments', file)
  }
  uploadingFiles.value = [...files]
  const { data, error, refresh } = await useApiPost<Attachment[]>('attachment', {
    body: formData,
    immediate: false,
  })
  await refresh()
  if (error.value) {
    alert(error.value.data?.message || error.value.message)
    uploadingFiles.value = []
    resolve()
    return
  }
  attachments.value = (attachments.value || []).concat(data.value || [])
  uploadingFiles.value = []
  resolve()
}

function remove(attachment: Attachment) {
  attachments.value = attachments.value.filter(a => a.id !== attachment.id)
}

function getTmpURL(file: File) {
  return URL.createObjectURL(file)
}
</script>

<template>
  <FormInput
    ref="fileInputRef"
    type="file"
    :label="$t('form.working.label')"
    :state="null"
    :attrs="{
      multiple: true,
      accept: 'image/*',
      onChange: upload,
      class: 'appearance-none hidden',
    }"
    class="mt-4"
  >
    <span class="inline-block my-2 cursor-pointer" @click="triggerFileInput">
      <Icon name="mdi:image-plus-outline" size="36" />
    </span>
    <div v-viewer class="flex flex-wrap gap-2">
      <div v-for="attachment in attachments" :key="attachment.id">
        <div class="flex items-center gap-2">
          <SubmissionImg :src="attachment.url" :name="attachment.name" />
          <Icon name="mdi:delete" size="24" class="cursor-pointer text-gray-500" @click="remove(attachment)" />
        </div>
        <div class="text-xs text-gray-500 mt-1">
          {{ attachment.name }}
        </div>
      </div>
      <div v-for="file in uploadingFiles" :key="file.name">
        <div class="flex items-center gap-2">
          <SubmissionImg :src="getTmpURL(file)" :name="file.name" />
          <Spinner class="w-4 h-4 text-green-500 border-[3px]" />
        </div>
        <div class="text-xs text-gray-500 mt-1">
          {{ file.name }}
        </div>
      </div>
    </div>
  </FormInput>
</template>
