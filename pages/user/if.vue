<script setup lang="ts">
const { t } = useI18n()
const route = useRoute()
useSeoMeta({
  title: t('user.if'),
})
definePageMeta({
  middleware: 'auth',
})
const userIFs: Ref<InsertionFinder[]> = ref([])
const meta = usePaginationMeta()
const removeModal = ref(false)
const editModal = ref(false)
const removeDialog = useConfirmDialog(removeModal)
const editDialog = useConfirmDialog(editModal)
const name = ref('')
async function fetchData() {
  const { data } = await useApi<Pagination<InsertionFinder>>('/user/ifs', {
    params: {
      page: route.query.page,
      limit: DEFAULT_LIMIT,
    },
  })
  userIFs.value = data.value!.items
  meta.value = data.value!.meta
}
async function remove(hash: string) {
  const { isCanceled } = await removeDialog.reveal()
  if (isCanceled)
    return
  const { error } = await useApiDelete(`/user/if/${hash}`)
  if (!error.value)
    await fetchData()

  else alert(error.value.message)
}
async function edit(userIF: InsertionFinder) {
  name.value = userIF.name
  const { isCanceled } = await editDialog.reveal()
  if (isCanceled) {
    name.value = ''
    return
  }
  const { error } = await useApiPost(`/user/if/${userIF.hash}`, {
    body: {
      name: name.value,
    },
  })
  if (!error.value) {
    userIF.name = name.value
    name.value = ''
  }
}
await fetchData()
</script>

<template>
  <div>
    <Heading1>
      {{ $t('user.if') }}
    </Heading1>
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6 sm:gap-x-2 md:gap-x-3">
      <IfSummary
        v-for="userIF in userIFs"
        :key="userIF.hash"
        :finder="userIF"
        editable
        @remove="remove"
        @edit="edit"
      />
    </div>
    <Pagination :meta="meta" @update="fetchData" />
  </div>
  <Teleport to="body">
    <Modal v-if="removeModal" :cancel="removeDialog.cancel">
      <div class="mb-5 font-bold">
        {{ $t('form.removeConfirm') }}
      </div>
      <div class="flex gap-2 justify-end">
        <button class="bg-rose-500 hover:bg-opacity-90 text-white cursor-pointer px-2 py-1" @click="removeDialog.confirm">
          {{ $t('form.remove') }}
        </button>
        <button class="bg-gray-300 hover:bg-opacity-80 cursor-pointer px-2 py-1" @click="removeDialog.cancel">
          {{ $t('form.cancel') }}
        </button>
      </div>
    </Modal>
  </Teleport>
  <Teleport to="body">
    <Modal v-if="editModal" :cancel="editDialog.cancel">
      <div class="mb-4">
        <p class="mb-1">
          {{ $t('if.name.description') }}
        </p>
        <input
          v-model="name"
          class="w-full"
        >
      </div>
      <div class="flex gap-2 justify-end">
        <button class="bg-rose-500 hover:bg-opacity-90 text-white cursor-pointer px-2 py-1" @click="editDialog.confirm">
          {{ $t('form.submit') }}
        </button>
        <button class="bg-gray-300 hover:bg-opacity-80 cursor-pointer px-2 py-1" @click="editDialog.cancel">
          {{ $t('form.cancel') }}
        </button>
      </div>
    </Modal>
  </Teleport>
</template>
