import en from '~/messages/en'
import zhCN from '~/messages/zh-CN'

export default defineI18nConfig(() => ({
  legacy: false,
  locale: 'en',
  messages: {
    en,
    'zh-CN': zhCN,
  },
  availableLocales: ['en', 'zh-CN'],
}))
