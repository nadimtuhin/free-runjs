'use client'

import { useState } from 'react'
import { EditorTab } from '../utils/tabs'

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

  return (
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
                        setEditingTabId(null)
                      } else if (e.key === 'Escape') {
                        updateTabName(tab.id, originalName)
                        setEditingTabId(null)
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
                      e.stopPropagation()
                      setOriginalName(tab.name)
                      setEditingTabId(tab.id)
                    }}
                    className="ml-2 p-1 hover:bg-gray-700 rounded"
                  >
                    ✎
                  </button>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      closeTab(tab.id)
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
  )
}
