'use client'

import { useState, useRef, useEffect } from 'react'
import Editor, { OnMount } from '@monaco-editor/react'
import type { editor } from 'monaco-editor'
import { useSearchParams } from 'next/navigation'

type ModuleType = 'esm' | 'commonjs'

const defaultCode = {
  esm: '// Write your JavaScript code here using ES Modules\nimport axios from "axios";\nconsole.log("Hello World!");',
  commonjs: '// Write your JavaScript code here using CommonJS\nconst axios = require("axios");\nconsole.log("Hello World!");'
}

export default function EmbedPage() {
  const searchParams = useSearchParams()
  const urlModuleType = searchParams.get('moduleType') as ModuleType | null
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [code, setCode] = useState(() => {
    const encodedCode = searchParams.get('code')
    if (encodedCode) {
      try {
        return atob(encodedCode)
      } catch (error) {
        console.error('Failed to decode code from URL:', error)
      }
    }
    return defaultCode[urlModuleType || 'esm']
  })
  const [moduleType] = useState<ModuleType>(urlModuleType || 'esm')
  const [output, setOutput] = useState<string>('')
  const [isRunning, setIsRunning] = useState(false)

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

  const handleRunCode = async () => {
    if (isRunning) return

    setIsRunning(true)
    try {
      const currentCode = editorRef.current?.getValue() || code
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
    } catch (error: unknown) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <main className="flex min-h-screen flex-col">
      <div className="flex items-center justify-between p-2 bg-gray-900">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Module Type: {moduleType === 'esm' ? 'ES Modules' : 'CommonJS'}</span>
        </div>
        <button
          onClick={handleRunCode}
          className="bg-primary hover:bg-blue-600 text-white px-4 py-1 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
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

      <div className="flex flex-1 flex-col md:flex-row">
        <div className="flex-1 min-h-[300px]">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={value => {
              if (!value) return
              setCode(value)
            }}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
            onMount={handleEditorMount}
          />
        </div>
        <div className="flex-1 border-t border-gray-700 md:border-t-0 md:border-l">
          <div className="bg-gray-800 p-4 h-full font-mono whitespace-pre-wrap overflow-auto text-sm">
            {output || 'Output will appear here...'}
          </div>
        </div>
      </div>
    </main>
  )
}
