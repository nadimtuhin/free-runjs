'use client'

import { useState } from 'react'
import { EditorTab } from '../utils/tabs'
import { FaFile, FaFileCode, FaChevronRight, FaChevronDown, FaPlus, FaEdit, FaTimes, FaFolder, FaFolderOpen } from 'react-icons/fa'

interface SidebarProps {
  tabs: EditorTab[]
  activeTabId: string
  isSidebarOpen: boolean
  setIsSidebarOpen: (isOpen: boolean) => void
  setActiveTabId: (id: string) => void
  updateTabName: (tabId: string, newName: string) => void
  closeTab: (tabId: string) => void
  addNewTab: () => void
}

export function Sidebar({
  tabs,
  activeTabId,
  isSidebarOpen,
  setIsSidebarOpen,
  setActiveTabId,
  updateTabName,
  closeTab,
  addNewTab,
}: SidebarProps) {
  const [editingTabId, setEditingTabId] = useState<string | null>(null)
  const [originalName, setOriginalName] = useState<string>('')
  const [isExplorerOpen, setIsExplorerOpen] = useState(true)

  const getFileIcon = (filename: string, moduleType: string) => {
    if (filename.endsWith('.js') || moduleType === 'commonjs') {
      return <FaFileCode className="w-3 h-3 text-vscode-warning" />
    }
    if (filename.endsWith('.mjs') || moduleType === 'esm') {
      return <FaFileCode className="w-3 h-3 text-vscode-success" />
    }
    return <FaFile className="w-3 h-3 text-vscode-text-muted" />
  }

  return (
    <div
      className={`bg-vscode-sidebar border-r border-vscode-border transition-all duration-200 ${
        isSidebarOpen ? 'w-64' : 'w-12'
      } flex flex-col min-h-0`}
    >
      {/* Sidebar toggle */}
      <div className="h-9 flex items-center px-3 border-b border-vscode-border">
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1 hover:bg-vscode-hover rounded text-vscode-text-muted hover:text-vscode-text"
          title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
        >
          {isSidebarOpen ? (
            <FaChevronRight className="w-3 h-3" />
          ) : (
            <FaFolder className="w-4 h-4" />
          )}
        </button>
        {isSidebarOpen && (
          <span className="ml-2 text-xs font-medium text-vscode-text-muted uppercase tracking-wide">
            Explorer
          </span>
        )}
      </div>

      {isSidebarOpen && (
        <div className="flex-1 overflow-hidden">
          {/* Explorer Section */}
          <div className="flex flex-col h-full">
            <div className="px-3 py-2">
              <button
                onClick={() => setIsExplorerOpen(!isExplorerOpen)}
                className="flex items-center gap-2 w-full text-left text-xs font-medium text-vscode-text hover:text-vscode-text uppercase tracking-wide"
              >
                {isExplorerOpen ? (
                  <FaChevronDown className="w-3 h-3" />
                ) : (
                  <FaChevronRight className="w-3 h-3" />
                )}
                <FaFolderOpen className="w-3 h-3 text-vscode-accent" />
                <span>RUNJS</span>
              </button>
            </div>

            {isExplorerOpen && (
              <div className="flex-1 px-3 pb-3 overflow-y-auto">
                <div className="space-y-0">
                  {tabs.map((tab, index) => (
                    <div
                      key={tab.id}
                      className={`group flex items-center gap-2 px-2 py-1 text-sm cursor-pointer rounded hover:bg-vscode-hover ${
                        tab.id === activeTabId 
                          ? 'bg-vscode-active text-vscode-text' 
                          : 'text-vscode-text-muted hover:text-vscode-text'
                      }`}
                      onClick={() => setActiveTabId(tab.id)}
                    >
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {getFileIcon(tab.name, tab.moduleType)}
                        {editingTabId === tab.id ? (
                          <input
                            type="text"
                            value={tab.name}
                            onChange={e => updateTabName(tab.id, e.target.value)}
                            onBlur={() => setEditingTabId(null)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                setEditingTabId(null)
                              } else if (e.key === 'Escape') {
                                updateTabName(tab.id, originalName)
                                setEditingTabId(null)
                              }
                            }}
                            onClick={e => e.stopPropagation()}
                            className="bg-vscode-panel border border-vscode-border rounded px-1 py-0 text-xs text-vscode-text outline-none focus:border-vscode-accent flex-1 min-w-0"
                            autoFocus
                          />
                        ) : (
                          <span className="truncate text-xs">
                            {tab.name}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            setOriginalName(tab.name)
                            setEditingTabId(tab.id)
                          }}
                          className="p-1 hover:bg-vscode-hover rounded text-vscode-text-muted hover:text-vscode-text"
                          title="Rename file"
                        >
                          <FaEdit className="w-3 h-3" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation()
                            closeTab(tab.id)
                          }}
                          className="p-1 hover:bg-vscode-hover rounded text-vscode-text-muted hover:text-vscode-error"
                          disabled={tabs.length === 1}
                          title={tabs.length === 1 ? "Can't delete the last tab" : 'Delete file'}
                        >
                          <FaTimes className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                
                <button
                  onClick={addNewTab}
                  className="flex items-center gap-2 w-full mt-3 px-2 py-1 text-xs text-vscode-text-muted hover:text-vscode-text hover:bg-vscode-hover rounded"
                  title="New file"
                >
                  <FaPlus className="w-3 h-3" />
                  <span>New File</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
