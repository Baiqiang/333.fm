import type { UseFetchOptions } from 'nuxt/app'

export async function useApi<DataT>(url: string, options?: UseFetchOptions<DataT>) {
  const config = useRuntimeConfig()
  const user = useUser()
  const accessToken = useAccessToken()
  const headers: HeadersInit = {}
  if (accessToken.value)
    headers.Authorization = `Bearer ${accessToken.value}`

  const res = await useFetch<DataT>(url, {
    baseURL: config.public.baseURL,
    credentials: 'include',
    ...options as any,
    headers: {
      ...options?.headers,
      ...headers,
    },
  })
  if (res.error.value?.statusCode === 401)
    user.signOut()

  return res
}

export async function useClientApi<DataT>(url: string, options?: UseFetchOptions<DataT>) {
  const config = useRuntimeConfig()
  const user = useUser()
  const accessToken = useAccessToken()
  const headers: HeadersInit = {}
  if (accessToken.value)
    headers.Authorization = `Bearer ${accessToken.value}`

  try {
    const res = await $fetch<DataT>(url, {
      baseURL: config.public.baseURL,
      credentials: 'include',
      ...options as any,
      headers: {
        ...options?.headers,
        ...headers,
      },
    })

    return res
  }
  catch (e: any) {
    if (e.statusCode === 401)
      user.signOut()

    throw e
  }
}

export function useApiPost<DataT>(url: string, options?: UseFetchOptions<DataT>) {
  return useApi<DataT>(url, {
    ...options,
    method: 'POST',
  })
}

export function useApiDelete<DataT>(url: string, options?: UseFetchOptions<DataT>) {
  return useApi<DataT>(url, {
    ...options,
    method: 'DELETE',
  })
}

export default useApi
