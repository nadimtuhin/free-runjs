'use client'

import { useState, useRef, useEffect } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useRouter, useSearchParams } from 'next/navigation'

type ModuleType = 'esm' | 'commonjs'

const defaultCode = {
  esm: '// Write your JavaScript code here using ES Modules\nimport axios from "axios";\nconsole.log("Hello World!");',
  commonjs: '// Write your JavaScript code here using CommonJS\nconst axios = require("axios");\nconsole.log("Hello World!");'
}

export default function Home() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlModuleType = searchParams.get('moduleType') as ModuleType | null
  const [moduleType, setModuleType] = useState<ModuleType>(urlModuleType || 'esm')
  const [code, setCode] = useState<string>(defaultCode[urlModuleType || 'esm'])
  const [output, setOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)
  const [installedPackages, setInstalledPackages] = useState<string[]>([])
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  // Sync URL with module type
  useEffect(() => {
    if (urlModuleType !== moduleType) {
      const params = new URLSearchParams(searchParams)
      params.set('moduleType', moduleType)
      router.replace(`?${params.toString()}`)
    }
  }, [moduleType, urlModuleType, router, searchParams])

  // Sync state with URL changes
  useEffect(() => {
    if (urlModuleType && urlModuleType !== moduleType) {
      setModuleType(urlModuleType)
      setCode(defaultCode[urlModuleType])
    }
  }, [urlModuleType])

  const handleEditorMount: OnMount = editor => {
    editorRef.current = editor
    editor.addCommand(
      // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Enter
      2048 | 3,
      () => handleRunCode()
    )
  }

  const handleModuleTypeChange = (type: ModuleType) => {
    setModuleType(type)
    setCode(defaultCode[type])
  }

  const handleRunCode = async () => {
    if (isRunning) return

    setIsRunning(true)
    try {
      const currentCode = editorRef.current?.getValue() || code
      console.log('Running code:', currentCode)
      const response = await fetch('/api/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code: currentCode, moduleType }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error)
      }

      setOutput(data.output || 'No output')
      if (data.installedPackages) {
        setInstalledPackages(data.installedPackages)
      }
      console.log('Output:', data.output)
    } catch (error: unknown) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col p-4">
      <nav className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">RunJS</h1>
          <div className="flex items-center gap-2 bg-gray-800 p-1 rounded">
            <button
              onClick={() => handleModuleTypeChange('esm')}
              className={`px-3 py-1 rounded ${
                moduleType === 'esm'
                  ? 'bg-primary text-white'
                  : 'text-gray-300 hover:text-white'
              }`}
            >
              ES Modules
            </button>
            <button
              onClick={() => handleModuleTypeChange('commonjs')}
              className={`px-3 py-1 rounded ${
                moduleType === 'commonjs'
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
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={value => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
            onMount={handleEditorMount}
          />
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
                  <span
                    key={pkg}
                    className="bg-gray-700 text-xs px-2 py-1 rounded"
                  >
                    {pkg}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
