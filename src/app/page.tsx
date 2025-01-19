'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ModuleType, convertCode, isValidModuleType } from './utils/moduleTypes'
import { EditorTab, createNewTab, isValidTab, isValidTabs } from './utils/tabs'
import { generateUUID } from './utils/uuid'
import { Sidebar } from './components/Sidebar'
import { Navigation } from './components/Navigation'
import { CodeEditor } from './components/CodeEditor'
import { Output } from './components/Output'
import { PackagesModal } from './components/PackagesModal'
import { ShareModal } from './components/ShareModal'
import { EmbedModal } from './components/EmbedModal'
import { LoveModal } from './components/LoveModal'
import { defaultCode } from './utils/moduleTypes'
import { MODAL_CONFIG } from './config/modals'

type PackageInfo = {
  name: string
  version: string
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
  const activeTab = tabs.find(tab => tab.id === activeTabId)
  const [isPackagesModalOpen, setIsPackagesModalOpen] = useState(false)
  const [installedPackages, setInstalledPackages] = useState<PackageInfo[]>([])
  const [packageInput, setPackageInput] = useState('')
  const [isInstalling, setIsInstalling] = useState(false)
  const [isLoadingPackages, setIsLoadingPackages] = useState(false)
  const [output, setOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [isShareModalOpen, setIsShareModalOpen] = useState(false)
  const [isEmbedModalOpen, setIsEmbedModalOpen] = useState(false)
  const [isLoveModalOpen, setIsLoveModalOpen] = useState(false)
  const loveModalTimeout = useRef<NodeJS.Timeout>()

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
    if (activeTab) {
      const params = new URLSearchParams(Array.from(searchParams.entries()))
      params.set('moduleType', activeTab.moduleType)

      // Base64 encode the code and add it to URL
      const encodedCode = btoa(activeTab.code)
      params.set('code', encodedCode)

      router.replace(`?${params.toString()}`)
    }
  }, [activeTabId, tabs, urlModuleType, router, searchParams, activeTab])

  // Validate active tab exists
  useEffect(() => {
    if (!tabs.some(tab => tab.id === activeTabId)) {
      setActiveTabId(tabs[0].id)
    }
  }, [tabs, activeTabId])

  // Add effect to show love modal after delay
  useEffect(() => {
    const hasShownBefore = localStorage.getItem(MODAL_CONFIG.love.storageKey)
    if (!hasShownBefore) {
      loveModalTimeout.current = setTimeout(() => {
        setIsLoveModalOpen(true)
        localStorage.setItem(MODAL_CONFIG.love.storageKey, 'true')
      }, MODAL_CONFIG.love.showDelay)
    }

    return () => {
      if (loveModalTimeout.current) {
        clearTimeout(loveModalTimeout.current)
      }
    }
  }, [])

  const handleRunCode = async () => {
    if (isRunning || !activeTab) return

    setIsRunning(true)
    try {
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: activeTab.code, moduleType: activeTab.moduleType }),
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

  return (
    <main className="flex min-h-screen">
      <Sidebar
        tabs={tabs}
        activeTabId={activeTabId}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        setActiveTabId={setActiveTabId}
        updateTabName={updateTabName}
        closeTab={closeTab}
        addNewTab={addNewTab}
      />

      <div className="flex-1 flex flex-col p-4">
        <Navigation
          activeModuleType={activeTab?.moduleType || 'esm'}
          onModuleTypeChange={handleModuleTypeChange}
          onOpenPackages={() => setIsPackagesModalOpen(true)}
          onShare={() => setIsShareModalOpen(true)}
          onEmbed={() => setIsEmbedModalOpen(true)}
          installedPackagesCount={installedPackages.length}
        />

        <div className="flex flex-1 gap-4">
          {activeTab && (
            <CodeEditor
              code={activeTab.code}
              onChange={value => {
                setTabs(tabs.map(tab => (tab.id === activeTabId ? { ...tab, code: value } : tab)))
              }}
              onRun={handleRunCode}
              isRunning={isRunning}
            />
          )}
          <Output output={output} />
        </div>
      </div>

      <PackagesModal
        isOpen={isPackagesModalOpen}
        onClose={() => setIsPackagesModalOpen(false)}
        installedPackages={installedPackages}
        isLoadingPackages={isLoadingPackages}
        packageInput={packageInput}
        setPackageInput={setPackageInput}
        isInstalling={isInstalling}
        onInstall={handleInstallPackage}
        onUninstall={handleUninstallPackage}
      />

      <ShareModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
      />

      {activeTab && (
        <EmbedModal
          isOpen={isEmbedModalOpen}
          onClose={() => setIsEmbedModalOpen(false)}
          code={activeTab.code}
          moduleType={activeTab.moduleType}
        />
      )}

      <LoveModal isOpen={isLoveModalOpen} onClose={() => setIsLoveModalOpen(false)} />
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
