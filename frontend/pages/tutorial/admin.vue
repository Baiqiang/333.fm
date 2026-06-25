<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus'

definePageMeta({
  middleware: 'auth',
})
const user = useUser()
if (!user.isTutorialAdmin)
  throw createError({ statusCode: 403 })

interface Tutorial {
  id: number
  title: string
  url: string
  category: string
  language: 'en' | 'zh-CN' | 'bilingual'
  sort: number
}

interface CategoryGroup {
  name: string
  items: Tutorial[]
}

const { t } = useI18n()
useSeoMeta({
  title: t('admin.tutorial.title'),
})

const loading = ref(false)
const sortDirty = ref(false)
const categoryGroups = ref<CategoryGroup[]>([])

async function fetchData() {
  const { data } = await useApi<Tutorial[]>('/tutorial')
  const tutorials = data.value || []
  const map = new Map<string, Tutorial[]>()
  for (const t of tutorials) {
    if (!map.has(t.category))
      map.set(t.category, [])
    map.get(t.category)!.push(t)
  }
  categoryGroups.value = Array.from(map.entries()).map(([name, items]) => ({ name, items }))
  sortDirty.value = false
}
await fetchData()

const existingCategories = computed(() => categoryGroups.value.map(g => g.name))

function onSortChange() {
  sortDirty.value = true
}

async function saveSort() {
  loading.value = true
  try {
    const items: { id: number, sort: number, category: string }[] = []
    let globalSort = 0
    for (const group of categoryGroups.value) {
      for (const item of group.items) {
        item.sort = globalSort
        item.category = group.name
        items.push({ id: item.id, sort: globalSort, category: group.name })
        globalSort++
      }
    }
    await useClientApi('/tutorial/sort', {
      method: 'PUT',
      body: { items },
    } as any)
    sortDirty.value = false
  }
  catch (e: any) {
    alert(e.message)
  }
  finally {
    loading.value = false
  }
}

const languageOptions = [
  { label: 'English', value: 'en' },
  { label: '中文', value: 'zh-CN' },
  { label: 'Bilingual', value: 'bilingual' },
]

const editing = ref<Tutorial | null>(null)
const form = ref({
  title: '',
  url: '',
  category: '',
  language: 'en' as string,
})

function resetForm() {
  form.value = { title: '', url: '', category: '', language: 'en' }
  editing.value = null
}

function editTutorial(tutorial: Tutorial) {
  editing.value = tutorial
  form.value = {
    title: tutorial.title,
    url: tutorial.url,
    category: tutorial.category,
    language: tutorial.language,
  }
}

async function submit() {
  if (!form.value.title || !form.value.url || !form.value.category)
    return
  loading.value = true
  try {
    if (editing.value) {
      const { error, refresh } = await useApi<Tutorial>(`/tutorial/${editing.value.id}`, {
        method: 'PUT',
        body: form.value,
        immediate: false,
      })
      await refresh()
      if (error.value)
        throw error.value
    }
    else {
      const { error, refresh } = await useApiPost<Tutorial>('/tutorial', {
        body: form.value,
        immediate: false,
      })
      await refresh()
      if (error.value)
        throw error.value
    }
    resetForm()
    await fetchData()
  }
  catch (e: any) {
    const message = (e.data || e.response?.data)?.message || e.message
    alert(message)
  }
  finally {
    loading.value = false
  }
}

async function removeTutorial(tutorial: Tutorial) {
  if (!confirm(`Delete "${tutorial.title}"?`))
    return
  try {
    await useClientApi(`/tutorial/${tutorial.id}`, { method: 'DELETE' } as any)
    await fetchData()
  }
  catch (e: any) {
    alert(e.message)
  }
}
</script>

<template>
  <div>
    <Heading1>
      {{ $t('admin.tutorial.title') }}
    </Heading1>

    <div class="bg-white shadow-md p-4 mb-6">
      <h2 class="font-bold text-lg mb-3">
        {{ editing ? $t('admin.tutorial.edit') : $t('admin.tutorial.add') }}
      </h2>
      <FormWrapper @submit.prevent="submit">
        <FormInput
          v-model="form.title"
          type="text"
          :label="$t('admin.tutorial.form.title')"
          :state="null"
        />
        <FormInput
          v-model="form.url"
          type="text"
          :label="$t('admin.tutorial.form.url')"
          :state="null"
        />
        <FormInput
          v-model="form.category"
          type="text"
          :label="$t('admin.tutorial.form.category')"
          :state="null"
        >
          <template #description>
            <div v-if="existingCategories.length" class="flex flex-wrap gap-1 mt-1">
              <button
                v-for="cat in existingCategories"
                :key="cat"
                type="button"
                class="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 hover:bg-indigo-100 hover:text-indigo-600 transition-colors"
                @click="form.category = cat"
              >
                {{ cat }}
              </button>
            </div>
          </template>
        </FormInput>
        <FormInput
          v-model="form.language"
          type="select"
          :label="$t('admin.tutorial.form.language')"
          :options="languageOptions"
          :state="null"
        />
        <div class="col-span-full flex gap-2 mt-2">
          <button
            class="px-3 py-1 text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
            :disabled="loading"
            @click.prevent="submit"
          >
            {{ editing ? $t('form.save') : $t('form.submit') }}
          </button>
          <button
            v-if="editing"
            type="button"
            class="px-3 py-1 text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
            @click="resetForm"
          >
            {{ $t('form.cancel') }}
          </button>
        </div>
      </FormWrapper>
    </div>

    <Transition name="fade">
      <div v-if="sortDirty" class="sticky top-0 z-20 bg-yellow-50 border-b border-yellow-300 p-2 mb-4 flex items-center justify-between">
        <span class="text-sm text-yellow-800">{{ $t('admin.tutorial.unsaved') }}</span>
        <button
          class="px-3 py-1 text-white bg-indigo-500 hover:bg-indigo-600 transition-colors text-sm"
          :disabled="loading"
          @click="saveSort"
        >
          {{ $t('form.save') }}
        </button>
      </div>
    </Transition>

    <VueDraggable
      v-model="categoryGroups"
      :animation="200"
      handle=".category-drag-handle"
      @change="onSortChange"
    >
      <div v-for="group in categoryGroups" :key="group.name" class="mb-6">
        <h2 class="font-bold text-lg border-b-2 border-indigo-500 pb-1 mb-3 flex items-center gap-2">
          <Icon name="mdi:drag" class="category-drag-handle cursor-grab active:cursor-grabbing text-gray-400" />
          {{ group.name }}
        </h2>
        <VueDraggable
          v-model="group.items"
          group="tutorials"
          :animation="200"
          handle=".item-drag-handle"
          class="space-y-1 min-h-[2rem]"
          @change="onSortChange"
        >
          <div
            v-for="item in group.items"
            :key="item.id"
            class="flex items-center gap-2 p-2 hover:bg-gray-50 border-b border-gray-100"
          >
            <Icon name="mdi:drag" class="item-drag-handle cursor-grab active:cursor-grabbing text-gray-400 shrink-0" />
            <span
              class="text-xs px-1.5 py-0.5 font-medium shrink-0"
              :class="{
                'bg-blue-100 text-blue-700': item.language === 'en',
                'bg-red-100 text-red-700': item.language === 'zh-CN',
                'bg-purple-100 text-purple-700': item.language === 'bilingual',
              }"
            >
              {{ item.language === 'en' ? 'EN' : item.language === 'zh-CN' ? '中文' : 'EN/中文' }}
            </span>
            <a
              :href="item.url"
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-500 hover:underline truncate flex-1"
            >
              {{ item.title }}
            </a>
            <button
              type="button"
              class="px-2 py-0.5 text-xs text-indigo-600 hover:bg-indigo-50 transition-colors"
              @click="editTutorial(item)"
            >
              {{ $t('form.edit') }}
            </button>
            <button
              type="button"
              class="px-2 py-0.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
              @click="removeTutorial(item)"
            >
              {{ $t('form.delete') }}
            </button>
          </div>
        </VueDraggable>
      </div>
    </VueDraggable>
    <div v-if="!categoryGroups.length" class="text-gray-400 text-center py-12">
      No tutorials yet.
    </div>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from, .fade-leave-to {
  opacity: 0;
}
</style>
