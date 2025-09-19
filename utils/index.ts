export function debounce(func: (...args: any[]) => void, wait = 200) {
  let timeout: NodeJS.Timeout
  return (...args: any[]) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => func(...args), wait)
  }
}

export function mustInject<T>(key: InjectionKey<T>): T {
  const value = inject(key)
  if (!value) {
    throw new Error(`${String(key)} is not injected`)
  }
  return value
}

export function getValue<T>(obj: object, path: string): T | undefined {
  const keys = path.split('.')
  let current: any = obj

  for (const key of keys) {
    if (current === null || typeof current !== 'object' || !(key in current)) {
      return undefined
    }
    current = current[key]
  }

  return current as T
}
