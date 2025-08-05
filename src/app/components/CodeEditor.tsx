'use client'

import Editor, { OnMount } from '@monaco-editor/react'
import { editor } from 'monaco-editor'
import { useRef } from 'react'
import { FaPlay, FaStop } from 'react-icons/fa'

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
    <div className="flex-1 bg-vscode-editor border-r border-vscode-border flex flex-col">
      {/* Tab Bar */}
      <div className="h-9 bg-vscode-tab border-b border-vscode-border flex items-center justify-between px-4">
        <div className="flex items-center">
          <div className="bg-vscode-tab-active border-t-2 border-vscode-accent px-3 py-2 text-sm text-vscode-text">
            main.js
          </div>
        </div>
        
        {/* Run Button */}
        <button
          onClick={onRun}
          className={`flex items-center gap-2 px-3 py-1 text-xs rounded transition-all ${
            isRunning
              ? 'bg-vscode-error text-white cursor-not-allowed'
              : 'bg-vscode-accent hover:bg-blue-600 text-white hover:shadow-md'
          }`}
          disabled={isRunning}
          title={isRunning ? 'Running...' : 'Run Code (Ctrl+Enter)'}
        >
          {isRunning ? (
            <>
              <div className="animate-spin">
                <FaStop className="w-3 h-3" />
              </div>
              <span>Running</span>
            </>
          ) : (
            <>
              <FaPlay className="w-3 h-3" />
              <span>Run</span>
            </>
          )}
        </button>
      </div>

      {/* Editor Area */}
      <div className="flex-1 relative">
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
            fontFamily: 'Menlo, Monaco, Consolas, Liberation Mono, Courier New, monospace',
            lineHeight: 19,
            wordWrap: 'on',
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            detectIndentation: false,
            renderWhitespace: 'boundary',
            renderControlCharacters: true,
            roundedSelection: false,
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto',
              verticalScrollbarSize: 14,
              horizontalScrollbarSize: 14,
              arrowSize: 11,
            },
            overviewRulerBorder: false,
            hideCursorInOverviewRuler: true,
            bracketPairColorization: {
              enabled: true,
            },
            guides: {
              indentation: true,
              bracketPairs: true,
              bracketPairsHorizontal: true,
              highlightActiveIndentation: true,
            },
            suggest: {
              showKeywords: true,
              showSnippets: true,
              showFunctions: true,
              showConstructors: true,
              showFields: true,
              showVariables: true,
              showClasses: true,
              showStructs: true,
              showInterfaces: true,
              showModules: true,
              showProperties: true,
              showEvents: true,
              showOperators: true,
              showUnits: true,
              showValues: true,
              showConstants: true,
              showEnums: true,
              showEnumMembers: true,
              showColors: true,
              showFiles: true,
              showReferences: true,
              showFolders: true,
              showTypeParameters: true,
              showIssues: true,
              showUsers: true,
            },
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            parameterHints: {
              enabled: true,
              cycle: true,
            },
            autoClosingBrackets: 'always',
            autoClosingQuotes: 'always',
            autoSurround: 'languageDefined',
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'mouseover',
            unfoldOnClickAfterEndOfLine: false,
            contextmenu: true,
            mouseWheelZoom: true,
            multiCursorModifier: 'alt',
            accessibilitySupport: 'auto',
          }}
          onMount={handleEditorMount}
        />
      </div>
    </div>
  )
}
