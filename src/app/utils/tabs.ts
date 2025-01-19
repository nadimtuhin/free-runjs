import { generateUUID } from './uuid'
import { ModuleType, defaultCode } from './moduleTypes'

export type EditorTab = {
  id: string
  name: string
  code: string
  moduleType: ModuleType
}

export const createNewTab = (moduleType: ModuleType): EditorTab => ({
  id: generateUUID(),
  name: 'Untitled',
  code: defaultCode[moduleType],
  moduleType,
})

export const isValidTab = (tab: any): tab is EditorTab => {
  return (
    tab &&
    typeof tab === 'object' &&
    typeof tab.id === 'string' &&
    typeof tab.name === 'string' &&
    typeof tab.code === 'string' &&
    (tab.moduleType === 'esm' || tab.moduleType === 'commonjs')
  )
}

export const isValidTabs = (tabs: any): tabs is EditorTab[] => {
  return Array.isArray(tabs) && tabs.length > 0 && tabs.every(isValidTab)
}
