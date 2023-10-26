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
