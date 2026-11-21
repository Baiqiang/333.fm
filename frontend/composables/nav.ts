export interface NavEntry {
  title: string
  path: string
  icon: string
}

export function useTrainingNavs() {
  const { t } = useI18n()
  return computed<NavEntry[]>(() => [
    { title: t('endless.shortTitle'), path: '/endless', icon: 'mdi:stairs-up' },
    { title: t('drTrigger.shortTitle'), path: '/dr-trigger', icon: 'mdi:target' },
    { title: t('tools.frTrainer.title'), path: '/tools/fr-trainer', icon: 'mdi:cube-outline' },
    { title: t('tools.pensukeTrainer.title'), path: '/tools/pensuke-trainer', icon: 'mdi:school-outline' },
    { title: t('quiz.shortTitle'), path: '/quiz', icon: 'mdi:help-circle-outline' },
  ])
}

export function useToolNavs() {
  const { t } = useI18n()
  return computed<NavEntry[]>(() => [
    { title: t('if.title'), path: '/if', icon: 'mdi:wave-arrow-up' },
    { title: t('sf.title'), path: '/sf', icon: 'mdi:layers-outline' },
    { title: t('tools.drCaseRecognizer.title'), path: '/tools/dr-case-recognizer', icon: 'mdi:eye-outline' },
    { title: t('tools.htrSubsetStats.title'), path: '/tools/htr-subset-stats', icon: 'mdi:chart-bar' },
  ])
}
