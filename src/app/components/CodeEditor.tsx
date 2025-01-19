'use client'

import Editor, { OnMount } from '@monaco-editor/react'
import { editor } from 'monaco-editor'
import { useRef } from 'react'

interface CodeEditorProps {
  code: string
  onChange: (value: string) => void
  onRun: () => void
  isRunning: boolean
}

export function CodeEditor({ code, onChange, onRun, isRunning }: CodeEditorProps) {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)

  const handleEditorMount: OnMount = editor => {
    editorRef.current = editor
    editor.addCommand(
      // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Enter
      2048 | 3,
      () => onRun()
    )
  }

  return (
    <div className="flex-1 min-h-[500px] relative">
      <button
        onClick={onRun}
        className="absolute top-2 right-2 z-10 bg-primary hover:bg-blue-600 text-white px-4 py-1 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg opacity-75 hover:opacity-100 hover:font-bold transition-all"
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
      <Editor
        height="100%"
        defaultLanguage="javascript"
        theme="vs-dark"
        value={code}
        onChange={value => {
          if (!value) return
          onChange(value)
        }}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
        }}
        onMount={handleEditorMount}
      />
    </div>
  )
}
