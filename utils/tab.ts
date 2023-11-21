export interface Tab {
  name: string | ComputedRef<string>
  hash?: string | ComputedRef<string>
  active: boolean
}

export const SYMBOL_ACTIVE_INDEX = Symbol('activeIndex')
export const SYMBOL_ADD_TAB = Symbol('addTab')
export const SYMBOL_REMOVE_TAB = Symbol('removeTab')
export const SYMBOL_SET_TAB = Symbol('setTab')
export const TAB_INDEX = ref(1)
