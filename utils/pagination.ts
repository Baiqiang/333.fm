export interface Pagination<DataT> {
  items: DataT[]
  meta: PaginationMeta
}

export interface PaginationMeta {
  totalItems: number
  itemCount: number
  itemsPerPage: number
  totalPages: number
  currentPage: number
}

export const DEFAULT_LIMIT = 24

export function usePaginationMeta() {
  return ref<PaginationMeta>({
    totalItems: 0,
    itemCount: 0,
    itemsPerPage: DEFAULT_LIMIT,
    totalPages: 0,
    currentPage: 1,
  })
}
