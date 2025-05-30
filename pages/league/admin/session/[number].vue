<script setup lang="ts">
import { Algorithm } from 'insertionfinder'
import leagueS6 from '~/assets/league-s6.json'

const config = useRuntimeConfig()
const accessToken = useAccessToken()
const user = useUser()
const { number: sessionNumber } = useRoute().params
const router = useRouter()
const { data, error } = await useApi<LeagueSession>(`/league/admin/session/${sessionNumber}`)
if (error.value || !data.value) {
  throw createError({
    statusCode: 404,
    statusMessage: 'Session not found',
  })
}

const baseURL = `/league/admin/session/${sessionNumber}`
const session = ref(data.value)
const isDev = config.public.mode !== 'production'

async function updateSession() {
  try {
    const { data } = await useApi<LeagueSession>(`/league/admin/session/${sessionNumber}`)
    if (data.value) {
      session.value = data.value
    }
  }
  catch {

  }
}

// tiers
const weeks = computed(() => session.value.competitions.length + 1)
const canEditTier = computed(() => session.value.status === LeagueSessionStatus.NOT_STARTED && session.value.competitions.every(c => c.status === CompetitionStatus.NOT_STARTED))
const tierPlayers = ref<Record<number, User[]>>(Object.fromEntries(session.value.tiers.map(tier => [tier.id, tier.players.map(player => player.user)])))
const tierEdited = ref<Record<number, boolean>>(Object.fromEntries(session.value.tiers.map(tier => [tier.id, false])))
const editingIndex = ref<string>('')
const search = ref('')
const searchInput = ref<HTMLInputElement[]>([])
const searchResults = ref<User[]>([])
const searchWCAPersonDebounced = debounce(searchWCAPerson)

watch(editingIndex, (index) => {
  if (index) {
    nextTick(() => searchInput.value[0]?.focus())
  }
})

function pickPlayer(tierId: number, index: number, user: User) {
  tierPlayers.value[tierId][index] = user
  tierEdited.value[tierId] = true
  editingIndex.value = ''
  searchResults.value = []
  search.value = ''
}

async function importS6() {
  if (!confirm('This will override current tier settings. Please confirm to import!')) {
    return
  }
  for (const tier of session.value.tiers) {
    const players = leagueS6.filter(s => s.level === tier.level).slice(0, weeks.value)
    tierPlayers.value[tier.id] = players as any
    await saveTierPlayers(tier.id)
  }
}

async function searchWCAPerson() {
  try {
    const data = await $fetch<{ result: { wca_id: string, name: string, avatar: { thumb_url: string } }[] }>(`https://www.worldcubeassociation.org/api/v0/search/persons?q=${search.value}`)
    searchResults.value = data.result.map(row => ({
      wcaId: row.wca_id,
      name: row.name,
      avatarThumb: row.avatar.thumb_url,
    } as User))
  }
  catch (error) {
    console.error(error)
    searchResults.value = []
  }
}

async function saveTierPlayers(tierId: number) {
  try {
    await useApiPost(`${baseURL}/players`, {
      body: {
        tierId,
        players: tierPlayers.value[tierId],
      },
    })
    tierEdited.value[tierId] = false
    editingIndex.value = ''
    await updateSession()
    tierPlayers.value = Object.fromEntries(session.value.tiers.map(tier => [tier.id, tier.players.map(player => player.user)]))
  }
  catch (error) {
    console.error(error)
  }
}

// schedules
const tierSchedules = ref<TierSchedule[]>([])
const generating = ref(false)
const canGenerate = computed(() => {
  return canEditTier.value
    && Object.values(tierEdited.value).every(edited => !edited)
    && Object.values(tierPlayers.value).every(players => players.length === weeks.value)
})

await updateSchedules()

async function updateSchedules() {
  try {
    const { data } = await useApi<TierSchedule[]>(`${baseURL}/schedules`)
    if (data.value) {
      tierSchedules.value = data.value
    }
  }
  catch {

  }
}

async function generateSchedules() {
  if (generating.value)
    return
  generating.value = true
  try {
    await useApiPost(`${baseURL}/schedules`)
    await updateSchedules()
  }
  catch (error) {
    console.error(error)
  }
  finally {
    generating.value = false
  }
}

// scrambles
const editModal = ref(false)
const editDialog = useConfirmDialog(editModal)
const scramblesString = ref('')
const scramblesValid = computed(() => {
  const scrambles = scramblesString.value.trim().split('\n')
  return scrambles.length === 3 && scrambles.every((s) => {
    try {
      const _ = new Algorithm(s)
      return true
    }
    catch {
      return false
    }
  })
})
async function generateScrambles(competition: Competition) {
  try {
    await useApiPost(`${baseURL}/${leagueWeek(competition)}/generate-scrambles`)
    await updateSession()
  }
  catch {
  }
}

async function importScrambles(competition: Competition) {
  const { isCanceled } = await editDialog.reveal()
  if (isCanceled) {
    return
  }
  try {
    await useApiPost(`${baseURL}/${leagueWeek(competition)}/scrambles`, {
      body: {
        scrambles: scramblesString.value.trim().split('\n'),
      },
    })
    await updateSession()
  }
  catch {
  }
}

async function startCompetition(competition: Competition) {
  try {
    await useApiPost(`${baseURL}/${leagueWeek(competition)}/start`)
    await updateSession()
  }
  catch {
  }
}

async function endCompetition(competition: Competition) {
  try {
    await useApiPost(`${baseURL}/${leagueWeek(competition)}/end`)
    await updateSession()
  }
  catch {
  }
}

// test functions
async function deleteSession() {
  if (!confirm('Are you sure you want to delete this session?')) {
    return
  }
  try {
    await useApiDelete(`/league/admin/session/${sessionNumber}`)
    router.push('/league/admin')
  }
  catch {
  }
}

async function signInAs({ wcaId }: User) {
  try {
    const { data, error } = await useApiPost<{ accessToken: string, user: User }>('/league/admin/signin-as', {
      body: {
        wcaId,
      },
    })
    if (!data.value || error.value) {
      throw new Error('Failed to login')
    }
    user.signIn(data.value.user)
    accessToken.value = data.value.accessToken
    router.push('/league')
  }
  catch {

  }
}
</script>

<template>
  <div>
    <h1 class="text-2xl font-bold my-2">
      {{ session.title }}
    </h1>
    <h3 class="text-lg font-bold my-2 w-full clear-both">
      Tiers
    </h3>
    <button v-if="canEditTier" class="bg-indigo-500 text-white text-sm mb-2 px-2 py-1" @click="importS6">
      Import S6 tier preset
    </button>
    <div class="flex flex-wrap gap-3">
      <div v-for="tier, index in session.tiers" :key="tier.id" :class="tierBackgrounds[index]">
        <h4 class="font-bold p-2 border-b border-gray-500">
          {{ tier.name }}
        </h4>
        <div class="flex flex-col gap-1 p-2">
          <div v-for="week in weeks" :key="week">
            <div v-if="editingIndex === `${tier.id}-${week}`" class="relative">
              <div class="flex items-center gap-1">
                <input
                  ref="searchInput"
                  v-model="search"
                  class="w-full text-xs py-px px-1 placeholder:text-xs"
                  placeholder="Search WCA ID or name"
                  @input="searchWCAPersonDebounced"
                >
                <Icon name="heroicons:x-mark-16-solid" class="cursor-pointer" @click="editingIndex = ''" />
              </div>
              <div
                v-if="searchResults.length > 0 && search"
                class="absolute top-15 left-0 pl-2 pr-6 py-2 bg-white rounded-md shadow-md"
              >
                <UserAvatarName
                  v-for="result in searchResults"
                  :key="result.wcaId"
                  :size="4"
                  :user="result"
                  :link="false"
                  class="cursor-pointer"
                  @click="pickPlayer(tier.id, week - 1, result)"
                />
              </div>
            </div>
            <div v-else-if="tierPlayers[tier.id][week - 1]" class="flex items-center gap-2">
              <UserAvatarName :user="tierPlayers[tier.id][week - 1]" />
              <Icon
                v-if="canEditTier"
                name="heroicons:pencil-16-solid"
                class="cursor-pointer hover:text-indigo-500"
                @click="editingIndex = `${tier.id}-${week}`"
              />
              <Icon
                v-if="isDev"
                name="material-symbols:person-alert"
                class="cursor-pointer hover:text-red-500"
                @click="signInAs(tierPlayers[tier.id][week - 1])"
              />
            </div>
            <div v-else class="cursor-pointer hover:text-indigo-500" @click="editingIndex = `${tier.id}-${week}`">
              <Icon name="heroicons:plus-16-solid" />
            </div>
          </div>
        </div>
        <div v-if="tierEdited[tier.id]" class="flex mt-2">
          <button class="text-xs bg-indigo-500 text-white px-2 py-1" @click="saveTierPlayers(tier.id)">
            Save
          </button>
        </div>
      </div>
    </div>
    <h3 class="text-lg font-bold my-2 w-full">
      Weeks
    </h3>
    <div v-for="competition in session.competitions" :key="competition.id" class="py-2 border-t border-gray-300">
      <div class="flex gap-2 items-center">
        <div class="font-bold">
          Week {{ competition.alias.split('-')[2] }}
        </div>
        <WeeklyStatus class="text-gray-600 text-sm" :competition="competition" />
      </div>
      <div v-for="{ scramble, number } in competition.scrambles" :key="number">
        <Sequence :sequence="scramble" :source="scramble" :prefix="`No.${number} `" />
      </div>
      <div class="flex gap-2">
        <button v-if="competition.status === CompetitionStatus.NOT_STARTED" class="text-white bg-indigo-500 px-2 py-1 text-sm" @click="generateScrambles(competition)">
          Generate Scrambles
        </button>
        <button v-if="competition.status === CompetitionStatus.NOT_STARTED" class="text-white bg-indigo-500 px-2 py-1 text-sm" @click="importScrambles(competition)">
          Import Scrambles
        </button>
        <button v-if="competition.status !== CompetitionStatus.ON_GOING && isDev" class="text-white bg-indigo-500 px-2 py-1 text-sm" @click="startCompetition(competition)">
          Start
        </button>
        <button v-if="competition.status === CompetitionStatus.ON_GOING && isDev" class="text-white bg-indigo-500 px-2 py-1 text-sm" @click="endCompetition(competition)">
          End
        </button>
      </div>
    </div>
    <h3 class="text-lg font-bold my-2 w-full">
      Schedules
    </h3>
    <LeagueSchedules :tier-schedules="tierSchedules" :session="session" />
    <div class="flex flex-wrap gap-2 my-2">
      <button
        class="bg-indigo-500 text-white px-2 py-1 text-sm"
        :class="{
          'cursor-not-allowed bg-opacity-80': !canGenerate,
        }"
        :disabled="!canGenerate"
        @click="generateSchedules"
      >
        {{ generating ? 'Generatring...' : 'Generate Schedules' }}
      </button>
    </div>
    <button v-if="isDev" class="text-xs bg-red-500 text-white px-2 py-1 my-2" @click="deleteSession">
      <Icon name="heroicons:trash-16-solid" />
    </button>
    <Teleport to="body">
      <Modal v-if="editModal" :cancel="editDialog.cancel">
        <div class="mb-4">
          <p class="mb-1">
            One scramble per line
          </p>
          <textarea
            v-model="scramblesString"
            class="w-96"
            rows="8"
          />
        </div>
        <div class="flex gap-2 justify-end">
          <button
            class="bg-indigo-500 text-white px-2 py-1"
            :class="{
              'cursor-pointer hover:bg-opacity-90': scramblesValid,
              'cursor-not-allowed bg-opacity-80': !scramblesValid,
            }"
            :disabled="!scramblesValid"
            @click="editDialog.confirm"
          >
            {{ $t('form.submit') }}
          </button>
          <button class="bg-gray-300 hover:bg-opacity-80 cursor-pointer px-2 py-1" @click="editDialog.cancel">
            {{ $t('form.cancel') }}
          </button>
        </div>
      </Modal>
    </Teleport>
  </div>
</template>
