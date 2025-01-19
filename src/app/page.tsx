'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useRouter, useSearchParams } from 'next/navigation'
import { generateUUID } from './utils/uuid'

type ModuleType = 'esm' | 'commonjs'

type EditorTab = {
  id: string
  name: string
  code: string
  moduleType: ModuleType
}

type PackageInfo = {
  name: string
  version: string
}

const defaultCode = {
  esm: '// Write your JavaScript code here using ES Modules\nimport axios from "axios";\nconsole.log("Hello World!");',
  commonjs: '// Write your JavaScript code here using CommonJS\nconst axios = require("axios");\nconsole.log("Hello World!");'
}

const createNewTab = (moduleType: ModuleType): EditorTab => ({
  id: generateUUID(),
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

function EditorContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlModuleType = searchParams.get('moduleType') as ModuleType | null
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const hasLoadedFromUrl = useRef(false)
  const hasInitialized = useRef(false)
  const [tabs, setTabs] = useState<EditorTab[]>([createNewTab(urlModuleType || 'esm')])
  const [activeTabId, setActiveTabId] = useState<string>(() => tabs[0].id)
  const [isPackagesModalOpen, setIsPackagesModalOpen] = useState(false)
  const [installedPackages, setInstalledPackages] = useState<PackageInfo[]>([])
  const [packageInput, setPackageInput] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)
  const [isLoadingPackages, setIsLoadingPackages] = useState(false)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState<string>('')
  const [output, setOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const shareInputRef = useRef<HTMLInputElement>(null)
  const [isCopied, setIsCopied] = useState(false)
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false)
  const embedInputRef = useRef<HTMLInputElement>(null)
  const [isEmbedCopied, setIsEmbedCopied] = useState(false)

  // Handle all client-side initialization in one effect
  useEffect(() => {
    if (hasInitialized.current) return

    // Try to load from localStorage first
    try {
      const savedTabs = localStorage.getItem('editor-tabs')
      if (savedTabs) {
        const parsedTabs = JSON.parse(savedTabs)
        if (isValidTabs(parsedTabs)) {
          setTabs(parsedTabs)
          const savedActiveTab = localStorage.getItem('active-tab-id')
          if (savedActiveTab && parsedTabs.some(tab => tab.id === savedActiveTab)) {
            setActiveTabId(savedActiveTab)
          }
          hasLoadedFromUrl.current = true
          hasInitialized.current = true
          return
        }
      }
    } catch (error) {
      console.error('Failed to load tabs from localStorage:', error)
    }

    // If no localStorage data, try URL params
    const encodedCode = searchParams.get('code')
    if (encodedCode) {
      try {
        const decodedCode = atob(encodedCode)
        const moduleType = searchParams.get('moduleType')

        if (!isValidModuleType(moduleType)) {
          throw new Error('Invalid module type in URL')
        }

        setTabs([{
          id: generateUUID(),
          name: 'Shared Code',
          code: decodedCode,
          moduleType
        }])
      } catch (error) {
        console.error('Failed to load code from URL:', error)
        const defaultTab = createNewTab('esm')
        setTabs([defaultTab])
        setActiveTabId(defaultTab.id)
      }
    }
    hasLoadedFromUrl.current = true
    hasInitialized.current = true
  }, [searchParams, urlModuleType])

  // Load packages on initialization
  useEffect(() => {
    if (!hasLoadedFromUrl.current) return
    fetchInstalledPackages()
  }, [])

  // Reload packages when active tab or module type changes
  useEffect(() => {
    if (!hasLoadedFromUrl.current) return
    fetchInstalledPackages()
  }, [activeTabId, activeTab?.moduleType])

  // Persist tabs and active tab to localStorage
  useEffect(() => {
    if (!hasInitialized.current) return
    localStorage.setItem('editor-tabs', JSON.stringify(tabs))
  }, [tabs])

  useEffect(() => {
    if (!hasInitialized.current) return
    localStorage.setItem('active-tab-id', activeTabId)
  }, [activeTabId])

  // Sync URL with active tab's module type and code
  useEffect(() => {
    const activeTab = tabs.find(tab => tab.id === activeTabId)
    if (activeTab) {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      params.set('moduleType', activeTab.moduleType)

      // Base64 encode the code and add it to URL
      const encodedCode = btoa(activeTab.code)
      params.set('code', encodedCode)

      router.replace(`?${params.toString()}`)
    }
  }, [activeTabId, tabs, urlModuleType, router, searchParams])

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
    // Run code automatically when editor loads
    handleRunCode()
  }

  const convertCode = (code: string, fromType: ModuleType, toType: ModuleType): string => {
    if (fromType === toType) return code;

    // Convert from ESM to CommonJS
    if (fromType === 'esm' && toType === 'commonjs') {
      return code
        // Convert import statements
        .replace(/import\s+(\w+)\s+from\s+['"]([^'"]+)['"]/g, 'const $1 = require("$2")')
        // Convert named imports
        .replace(/import\s*{\s*([^}]+)}\s+from\s+['"]([^'"]+)['"]/g, (_, imports, module) => {
          const vars = imports.split(',').map((i: string) => i.trim());
          return `const { ${vars.join(', ')} } = require("${module}")`;
        })
        // Convert default + named imports
        .replace(/import\s+(\w+)\s*,\s*{\s*([^}]+)}\s+from\s+['"]([^'"]+)['"]/g,
          'const $1 = require("$3"); const { $2 } = require("$3")')
        // Convert export default
        .replace(/export\s+default\s+([^;\n]+)/g, 'module.exports = $1')
        // Convert named exports
        .replace(/export\s+const\s+(\w+)/g, 'exports.$1')
        .replace(/export\s+function\s+(\w+)/g, 'exports.$1 = function');
    }

    // Convert from CommonJS to ESM
    if (fromType === 'commonjs' && toType === 'esm') {
      return code
        // Convert require statements
        .replace(/const\s+(\w+)\s*=\s*require\(['"]([^'"]+)['"]\)/g, 'import $1 from "$2"')
        // Convert destructured require
        .replace(/const\s*{\s*([^}]+)}\s*=\s*require\(['"]([^'"]+)['"]\)/g, 'import { $1 } from "$2"')
        // Convert module.exports
        .replace(/module\.exports\s*=\s*([^;\n]+)/g, 'export default $1')
        // Convert exports.x assignments
        .replace(/exports\.(\w+)\s*=\s*/g, 'export const $1 = ');
    }

    return code;
  };

  const handleModuleTypeChange = (type: ModuleType) => {
    const updatedTabs = tabs.map(tab => {
      if (tab.id === activeTabId) {
        // Only replace code if it's empty or matches the default code for current module type
        const shouldReplaceCode = !tab.code.trim() || tab.code === defaultCode[tab.moduleType];
        const newCode = shouldReplaceCode
          ? defaultCode[type]
          : convertCode(tab.code, tab.moduleType, type);

        return {
          ...tab,
          moduleType: type,
          code: newCode
        };
      }
      return tab;
    });
    setTabs(updatedTabs);
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

  const fetchInstalledPackages = async () => {
    setIsLoadingPackages(true)
    try {
      const response = await fetch('/api/packages')
      const data = await response.json()
      if (response.ok) {
        setInstalledPackages(data.packages)
      } else {
        console.error('Failed to fetch packages:', data.error)
      }
    } catch (error) {
      console.error('Failed to fetch packages:', error)
    } finally {
      setIsLoadingPackages(false)
    }
  }

  // Fetch packages when modal opens
  useEffect(() => {
    if (isPackagesModalOpen) {
      fetchInstalledPackages()
    }
  }, [isPackagesModalOpen])

  // Update packages list after installation/uninstallation
  const handleInstallPackage = async () => {
    if (!packageInput.trim() || isInstalling) return

    setIsInstalling(true)
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: `require('${packageInput.trim()}')`,
          moduleType: 'commonjs',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setOutput(`Successfully installed ${packageInput.trim()}`)
      setPackageInput('')
      await fetchInstalledPackages()
    } catch (error) {
      setOutput(`Error installing package: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsInstalling(false)
    }
  }

  const handleUninstallPackage = async (packageName: string) => {
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code: `
            const { execSync } = require('child_process');
            try {
              execSync('npm uninstall ${packageName}', { stdio: 'inherit' });
              console.log('Successfully uninstalled ${packageName}');
            } catch (error) {
              console.error('Failed to uninstall package:', error.message);
            }
          `,
          moduleType: 'commonjs',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setOutput(`Successfully uninstalled ${packageName}`)
      await fetchInstalledPackages()
    } catch (error) {
      setOutput(`Error uninstalling package: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  const handleShare = () => {
    setIsShareModalOpen(true)
    // Focus and select the input in the next tick after modal is rendered
    setTimeout(() => {
      if (shareInputRef.current) {
        shareInputRef.current.select()
      }
    }, 0)
  }

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

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
                  className={`p-2 rounded cursor-pointer flex items-center justify-between group ${
                    tab.id === activeTabId ? 'bg-primary text-white' : 'hover:bg-gray-800'
                  }`}
                  onClick={() => setActiveTabId(tab.id)}
                >
                  {editingTabId === tab.id ? (
                    <input
                      type="text"
                      value={tab.name}
                      onChange={e => updateTabName(tab.id, e.target.value)}
                      onBlur={() => setEditingTabId(null)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          setEditingTabId(null);
                        } else if (e.key === 'Escape') {
                          updateTabName(tab.id, originalName);
                          setEditingTabId(null);
                        }
                      }}
                      onClick={e => e.stopPropagation()}
                      className={`bg-transparent outline-none flex-1 ${
                        tab.id === activeTabId ? 'text-white' : 'text-gray-300'
                      }`}
                      autoFocus
                    />
                  ) : (
                    <span className={tab.id === activeTabId ? 'text-white' : 'text-gray-300'}>
                      {tab.name}
                    </span>
                  )}
                  <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setOriginalName(tab.name);
                        setEditingTabId(tab.id);
                      }}
                      className="ml-2 p-1 hover:bg-gray-700 rounded"
                    >
                      ✎
                    </button>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        closeTab(tab.id);
                      }}
                      className="ml-1 p-1 hover:bg-gray-700 rounded text-red-400"
                      disabled={tabs.length === 1}
                      title={tabs.length === 1 ? "Can't delete the last tab" : "Delete tab"}
                    >
                      ×
                    </button>
                  </div>
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
              onClick={() => setIsPackagesModalOpen(true)}
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded flex items-center gap-2"
            >
              Packages ({installedPackages.length})
            </button>
            <a
              href="/credits"
              className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded"
            >
              Credits
            </a>
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
            <button
              onClick={handleShare}
              className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 rounded hover:bg-gray-700"
            >
              Share
            </button>
            <button
              onClick={() => setIsEmbedModalOpen(true)}
              className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 rounded hover:bg-gray-700"
            >
              Embed
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
          <div className="flex-1 flex flex-col">
            <div className="bg-gray-800 p-4 rounded min-h-[400px] font-mono whitespace-pre-wrap overflow-auto">
              {output || 'Output will appear here...'}
            </div>
          </div>
        </div>
      </div>

      {/* Packages Modal */}
      {isPackagesModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Manage Packages</h2>
              <button
                onClick={() => setIsPackagesModalOpen(false)}
                className="text-gray-400 hover:text-white focus:outline-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-4">
                <input
                  type="text"
                  value={packageInput}
                  onChange={e => setPackageInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleInstallPackage()
                    }
                  }}
                  placeholder="Package name"
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  onClick={handleInstallPackage}
                  className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isInstalling || !packageInput.trim()}
                >
                  {isInstalling ? (
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
                      Installing...
                    </>
                  ) : (
                    'Install'
                  )}
                </button>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {isLoadingPackages ? (
                  <div className="text-center py-4">
                    <svg className="animate-spin h-6 w-6 mx-auto" viewBox="0 0 24 24">
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
                    <p className="text-gray-400 mt-2">Loading packages...</p>
                  </div>
                ) : installedPackages.length === 0 ? (
                  <p className="text-gray-400 text-center py-4">No packages installed</p>
                ) : (
                  installedPackages.map(pkg => (
                    <div
                      key={pkg.name}
                      className="flex items-center justify-between bg-gray-800 p-2 rounded"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{pkg.name}</span>
                        <span className="text-xs text-gray-400">{pkg.version}</span>
                      </div>
                      <button
                        onClick={() => handleUninstallPackage(pkg.name)}
                        className="text-red-400 hover:text-red-300 focus:outline-none px-2 py-1 hover:bg-gray-700 rounded"
                        title="Uninstall package"
                      >
                        Uninstall
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Modal */}
      {isShareModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Share Code</h2>
              <button
                onClick={() => setIsShareModalOpen(false)}
                className="text-gray-400 hover:text-white focus:outline-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2">
                <input
                  ref={shareInputRef}
                  type="text"
                  value={window.location.href}
                  readOnly
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyShare}
                    className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Copy
                  </button>
                  {isCopied && (
                    <span className="text-green-500 text-sm">Copied!</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Embed Modal */}
      {isEmbedModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-4 border-b border-gray-700">
              <h2 className="text-xl font-semibold text-white">Embed Code</h2>
              <button
                onClick={() => setIsEmbedModalOpen(false)}
                className="text-gray-400 hover:text-white focus:outline-none"
              >
                ×
              </button>
            </div>
            <div className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <input
                    ref={embedInputRef}
                    type="text"
                    value={`<iframe src="${window.location.origin}/embed?code=${btoa(activeTab?.code || '')}&moduleType=${activeTab?.moduleType}" width="100%" height="600" frameborder="0"></iframe>`}
                    readOnly
                    className="flex-1 bg-gray-800 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                  <button
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(embedInputRef.current?.value || '')
                        setIsEmbedCopied(true)
                        setTimeout(() => setIsEmbedCopied(false), 2000)
                      } catch (error) {
                        console.error('Failed to copy embed code:', error)
                      }
                    }}
                    className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded"
                  >
                    Copy
                  </button>
                </div>
                {isEmbedCopied && (
                  <span className="text-green-500 text-sm">Copied!</span>
                )}
                <div className="mt-4">
                  <h3 className="text-lg font-semibold mb-2">Preview</h3>
                  <div className="border border-gray-700 rounded">
                    <iframe
                      src={`/embed?code=${btoa(activeTab?.code || '')}&moduleType=${activeTab?.moduleType}`}
                      width="100%"
                      height="400"
                      frameBorder="0"
                      title="RunJS Embed Preview"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    }>
      <EditorContent />
    </Suspense>
  )
}
