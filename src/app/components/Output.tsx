'use client'

import { FaTerminal, FaTimes } from 'react-icons/fa'

interface OutputProps {
  output: string
}

export function Output({ output }: OutputProps) {
  const clearOutput = () => {
    // This would need to be passed from parent component
    // For now, just a placeholder
  }

  return (
    <div className="flex-1 bg-vscode-panel border-l border-vscode-border flex flex-col">
      {/* Panel Header */}
      <div className="h-9 bg-vscode-tab border-b border-vscode-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <FaTerminal className="w-3 h-3 text-vscode-text-muted" />
          <span className="text-sm text-vscode-text">Output</span>
        </div>
        <button
          onClick={clearOutput}
          className="p-1 hover:bg-vscode-hover rounded text-vscode-text-muted hover:text-vscode-text"
          title="Clear output"
        >
          <FaTimes className="w-3 h-3" />
        </button>
      </div>

      {/* Output Content */}
      <div className="flex-1 bg-vscode-bg overflow-hidden">
        <div className="h-full p-4 font-vscode text-vscode-sm text-vscode-text whitespace-pre-wrap overflow-auto">
          {output ? (
            <pre className="font-vscode">{output}</pre>
          ) : (
            <div className="text-vscode-text-muted italic">
              Output will appear here...
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
