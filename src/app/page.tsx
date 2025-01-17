'use client'

import { useState, useRef, useEffect } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useRouter, useSearchParams } from 'next/navigation'

type ModuleType = 'esm' | 'commonjs'

type EditorTab = {
  id: string
  name: string
  code: string
  moduleType: ModuleType
}

const defaultCode = {
  esm: '// Write your JavaScript code here using ES Modules\nimport axios from "axios";\nconsole.log("Hello World!");',
  commonjs: '// Write your JavaScript code here using CommonJS\nconst axios = require("axios");\nconsole.log("Hello World!");'
}

const createNewTab = (moduleType: ModuleType): EditorTab => ({
  id: crypto.randomUUID(),
  name: 'Untitled',
  code: defaultCode[moduleType],
  moduleType,
})

// Validation functions
const isValidModuleType = (type: any): type is ModuleType => {
  return type === 'esm' || type === 'commonjs'
}

const isValidTab = (tab: any): tab is EditorTab => {
  return (
    tab &&
    typeof tab === 'object' &&
    typeof tab.id === 'string' &&
    typeof tab.name === 'string' &&
    typeof tab.code === 'string' &&
    isValidModuleType(tab.moduleType)
  )
}

const isValidTabs = (tabs: any): tabs is EditorTab[] => {
  return Array.isArray(tabs) && tabs.length > 0 && tabs.every(isValidTab)
}

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlModuleType = searchParams.get('moduleType') as ModuleType | null
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const hasLoadedFromUrl = useRef(false)
  const [tabs, setTabs] = useState<EditorTab[]>(() => {
    try {
      const savedTabs = typeof window !== 'undefined' ? localStorage.getItem('editor-tabs') : null
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs)
        if (isValidTabs(parsedTabs)) {
          return parsedTabs
        }
      }
    } catch (error) {
      console.error('Failed to load tabs from localStorage:', error)
    }
    return [createNewTab(urlModuleType || 'esm')]
  })
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    try {
      const savedActiveTab = typeof window !== 'undefined' ? localStorage.getItem('active-tab-id') : null
      if (savedActiveTab && tabs.some(tab => tab.id === savedActiveTab)) {
        return savedActiveTab
      }
    } catch (error) {
      console.error('Failed to load active tab from localStorage:', error)
    }
    return tabs[0].id
  })
  const [output, setOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [installedPackages, setInstalledPackages] = useState<string[]>([])
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  // Persist tabs and active tab to localStorage
  useEffect(() => {
    localStorage.setItem('editor-tabs', JSON.stringify(tabs))
  }, [tabs])

  useEffect(() => {
    localStorage.setItem('active-tab-id', activeTabId)
  }, [activeTabId])

  // Sync URL with active tab's module type and code
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId)
    if (activeTab) {
      const params = new URLSearchParams(searchParams)
      params.set('moduleType', activeTab.moduleType)

      // Base64 encode the code and add it to URL
      const encodedCode = btoa(activeTab.code)
      params.set('code', encodedCode)

      router.replace(`?${params.toString()}`)
    }
  }, [activeTabId, tabs, urlModuleType, router, searchParams])

  // Load code from URL on initial render only
  useEffect(() => {
    if (hasLoadedFromUrl.current) return
    hasLoadedFromUrl.current = true

    const encodedCode = searchParams.get('code')
    if (encodedCode) {
      try {
        const decodedCode = atob(encodedCode)
        const moduleType = searchParams.get('moduleType')

        if (!isValidModuleType(moduleType)) {
          throw new Error('Invalid module type in URL')
        }

        setTabs([{
          id: crypto.randomUUID(),
          name: 'Shared Code',
          code: decodedCode,
          moduleType
        }])
      } catch (error) {
        console.error('Failed to load code from URL:', error)
        // Fallback to default tab if URL data is invalid
        const defaultTab = createNewTab('esm')
        setTabs([defaultTab])
        setActiveTabId(defaultTab.id)
      }
    }
  }, [searchParams])

  // Validate active tab exists
  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeTabId)) {
      setActiveTabId(tabs[0].id)
    }
  }, [tabs, activeTabId])

  const handleEditorMount: OnMount = editor => {
    editorRef.current = editor
    editor.addCommand(
      // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Enter
      2048 | 3,
      () => handleRunCode()
    )
  }

  const handleModuleTypeChange = (type: ModuleType) => {
    const updatedTabs = tabs.map(tab =>
      tab.id === activeTabId ? { ...tab, moduleType: type, code: defaultCode[type] } : tab
    )
    setTabs(updatedTabs)
  }

  const handleRunCode = async () => {
    if (isRunning) return

    const activeTab = tabs.find(tab => tab.id === activeTabId)
    if (!activeTab) return

    setIsRunning(true)
    try {
      const currentCode = editorRef.current?.getValue() || activeTab.code
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: currentCode, moduleType: activeTab.moduleType }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setOutput(data.output || 'No output')
      if (data.installedPackages) {
        setInstalledPackages(data.installedPackages)
      }
    } catch (error: unknown) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsRunning(false)
    }
  }

  const addNewTab = () => {
    const activeTab = tabs.find(tab => tab.id === activeTabId)
    const newTab = createNewTab(activeTab?.moduleType || 'esm')
    setTabs([...tabs, newTab])
    setActiveTabId(newTab.id)
  }

  const closeTab = (tabId: string) => {
    if (tabs.length === 1) return
    const newTabs = tabs.filter(tab => tab.id !== tabId)
    setTabs(newTabs)
    if (activeTabId === tabId) {
      setActiveTabId(newTabs[0].id)
    }
  }

  const updateTabName = (tabId: string, newName: string) => {
    setTabs(tabs.map(tab => (tab.id === tabId ? { ...tab, name: newName } : tab)))
  }

  const activeTab = tabs.find(tab => tab.id === activeTabId)

  return (
    <main className="flex min-h-screen">
      {/* Sidebar */}
      <div
        className={`bg-gray-900 transition-all duration-300 ${
          isSidebarOpen ? 'w-64' : 'w-12'
        } flex flex-col`}
      >
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-2 hover:bg-gray-800 text-gray-400 hover:text-white"
        >
          {isSidebarOpen ? '◀' : '▶'}
        </button>
        {isSidebarOpen && (
          <div className="p-4">
            <h2 className="text-lg font-semibold mb-4">Files</h2>
            <div className="space-y-2">
              {tabs.map(tab => (
                <div
                  key={tab.id}
                  className={`p-2 rounded cursor-pointer ${
                    tab.id === activeTabId ? 'bg-primary text-white' : 'hover:bg-gray-800'
                  }`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  <input
                    type="text"
                    value={tab.name}
                    onChange={e => updateTabName(tab.id, e.target.value)}
                    onClick={e => e.stopPropagation()}
                    className={`bg-transparent outline-none w-full ${
                      tab.id === activeTabId ? 'text-white' : 'text-gray-300'
                    }`}
                  />
                </div>
              ))}
            </div>
            <button
              onClick={addNewTab}
              className="mt-4 w-full p-2 bg-gray-800 hover:bg-gray-700 rounded text-white"
            >
              + New File
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col p-4">
        <nav className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold">RunJS</h1>
            <div className="flex items-center gap-2 bg-gray-800 p-1 rounded">
              <button
                onClick={() => handleModuleTypeChange('esm')}
                className={`px-3 py-1 rounded ${
                  activeTab?.moduleType === 'esm'
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                ES Modules
              </button>
              <button
                onClick={() => handleModuleTypeChange('commonjs')}
                className={`px-3 py-1 rounded ${
                  activeTab?.moduleType === 'commonjs'
                    ? 'bg-primary text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                CommonJS
              </button>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={handleRunCode}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-1 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Running...
                </>
              ) : (
                'Run'
              )}
            </button>
          </div>
        </nav>

        <div className="flex flex-1 gap-4">
          <div className="flex-1 min-h-[500px]">
            {activeTab && (
              <Editor
                height="100%"
                defaultLanguage="javascript"
                theme="vs-dark"
                value={activeTab.code}
                onChange={value => {
                  if (!value) return
                  setTabs(tabs.map(tab => (tab.id === activeTabId ? { ...tab, code: value } : tab)))
                }}
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                }}
                onMount={handleEditorMount}
              />
            )}
          </div>
          <div className="flex-1 flex flex-col gap-4">
            <div className="bg-gray-800 p-4 rounded min-h-[400px] font-mono whitespace-pre-wrap overflow-auto">
              {output || 'Output will appear here...'}
            </div>
            {installedPackages.length > 0 && (
              <div className="bg-gray-800 p-4 rounded">
                <h2 className="text-sm font-semibold mb-2">Installed Packages:</h2>
                <div className="flex flex-wrap gap-2">
                  {installedPackages.map(pkg => (
                    <span key={pkg} className="bg-gray-700 text-xs px-2 py-1 rounded">
                      {pkg}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
