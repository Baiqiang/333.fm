export function useStatefulClipboard() {
  const { copy } = useClipboard()
  const copied = ref(false)
  return {
    copied,
    copy: (text: string) => {
      copy(text)
      copied.value = true
    },
  }
}
