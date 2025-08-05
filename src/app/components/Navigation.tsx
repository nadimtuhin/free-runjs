'use client'

import { ModuleType } from '../utils/moduleTypes'
import { ExecutionMode, executionModeLabels } from '../utils/executionTypes'
import { FaGithub, FaCube, FaCog, FaPlay, FaBox, FaShare, FaCode, FaStar } from 'react-icons/fa'
import { useState, useEffect } from 'react'
import { APP_CONFIG } from '../config/app'

interface NavigationProps {
  activeModuleType: ModuleType
  onModuleTypeChange: (type: ModuleType) => void
  activeExecutionMode: ExecutionMode
  onExecutionModeChange: (mode: ExecutionMode) => void
  onOpenPackages: () => void
  onShare: () => void
  onEmbed: () => void
  installedPackagesCount: number
}

export function Navigation({
  activeModuleType,
  onModuleTypeChange,
  activeExecutionMode,
  onExecutionModeChange,
  onOpenPackages,
  onShare,
  onEmbed,
  installedPackagesCount,
}: NavigationProps) {
  const [starCount, setStarCount] = useState<number | null>(null)

  useEffect(() => {
    const fetchStarCount = async () => {
      try {
        const repoPath = APP_CONFIG.social.githubRepo.replace('https://github.com/', '')
        const response = await fetch(`https://api.github.com/repos/${repoPath}`)
        const data = await response.json()
        setStarCount(data.stargazers_count)
      } catch (error) {
        console.error('Failed to fetch star count:', error)
      }
    }
    fetchStarCount()
  }, [])

  return (
    <div className="h-9 bg-vscode-menu border-b border-vscode-border flex items-center justify-between px-4">
      {/* Left side - Menu items */}
      <div className="flex items-center">
        <div className="flex items-center space-x-6">
          <div className="text-vscode-text font-bold text-sm">RunJS</div>
          
          {/* Module Type Selector */}
          <div className="flex items-center">
            <span className="text-vscode-text-muted text-xs mr-2">Module:</span>
            <div className="flex">
              <button
                onClick={() => onModuleTypeChange('esm')}
                className={`px-2 py-1 text-xs border-r border-vscode-border first:rounded-l last:rounded-r ${
                  activeModuleType === 'esm'
                    ? 'bg-vscode-accent text-white'
                    : 'bg-vscode-panel text-vscode-text hover:bg-vscode-hover'
                }`}
              >
                ESM
              </button>
              <button
                onClick={() => onModuleTypeChange('commonjs')}
                className={`px-2 py-1 text-xs first:rounded-l last:rounded-r ${
                  activeModuleType === 'commonjs'
                    ? 'bg-vscode-accent text-white'
                    : 'bg-vscode-panel text-vscode-text hover:bg-vscode-hover'
                }`}
              >
                CJS
              </button>
            </div>
          </div>
          
          {/* Execution Mode Selector */}
          <div className="flex items-center">
            <span className="text-vscode-text-muted text-xs mr-2">Runtime:</span>
            <div className="flex">
              <button
                onClick={() => onExecutionModeChange('native')}
                className={`px-2 py-1 text-xs flex items-center gap-1 border-r border-vscode-border first:rounded-l ${
                  activeExecutionMode === 'native'
                    ? 'bg-vscode-accent text-white'
                    : 'bg-vscode-panel text-vscode-text hover:bg-vscode-hover'
                }`}
                title="Execute in standard Node.js environment"
              >
                <FaCog className="w-3 h-3" />
                Native
              </button>
              <button
                onClick={() => onExecutionModeChange('wasm')}
                className={`px-2 py-1 text-xs flex items-center gap-1 last:rounded-r ${
                  activeExecutionMode === 'wasm'
                    ? 'bg-vscode-warning text-vscode-bg'
                    : 'bg-vscode-panel text-vscode-text hover:bg-vscode-hover'
                }`}
                title="Execute in secure WebAssembly sandbox"
              >
                <FaCube className="w-3 h-3" />
                WASM
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center space-x-1">
        <button
          onClick={onOpenPackages}
          className="flex items-center gap-1 px-2 py-1 text-xs text-vscode-text hover:bg-vscode-hover rounded"
          title="Manage packages"
        >
          <FaBox className="w-3 h-3" />
          <span>{installedPackagesCount}</span>
        </button>
        
        <button
          onClick={onShare}
          className="flex items-center gap-1 px-2 py-1 text-xs text-vscode-text hover:bg-vscode-hover rounded"
          title="Share code"
        >
          <FaShare className="w-3 h-3" />
        </button>
        
        <button
          onClick={onEmbed}
          className="flex items-center gap-1 px-2 py-1 text-xs text-vscode-text hover:bg-vscode-hover rounded"
          title="Embed code"
        >
          <FaCode className="w-3 h-3" />
        </button>
        
        <a
          href={APP_CONFIG.social.githubRepo}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2 py-1 text-xs text-vscode-text hover:bg-vscode-hover rounded"
          title="GitHub repository"
        >
          <FaGithub className="w-3 h-3" />
          <FaStar className="w-3 h-3 text-vscode-warning" />
          <span>{starCount !== null ? starCount.toLocaleString() : '...'}</span>
        </a>
        
        <a
          href={APP_CONFIG.social.feedbackForm}
          target="_blank"
          rel="noopener noreferrer"
          className="px-2 py-1 text-xs text-vscode-text hover:bg-vscode-hover rounded"
          title="Send feedback"
        >
          Feedback
        </a>
      </div>
    </div>
  )
}
