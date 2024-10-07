export interface Tab {
  name: string | ComputedRef<string>
  hash?: string
  active: boolean
}

export const SYMBOL_ACTIVE_INDEX: InjectionKey<Ref<number>> = Symbol('activeIndex')
export const SYMBOL_ADD_TAB: InjectionKey<(tab: Tab) => void> = Symbol('addTab')
export const SYMBOL_REMOVE_TAB: InjectionKey<(tab: Tab) => void> = Symbol('removeTab')
export const SYMBOL_SET_TAB: InjectionKey<(tab: Tab) => void> = Symbol('setTab')
