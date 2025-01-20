'use client'

import { ModuleType } from '../utils/moduleTypes'
import { FaGithub } from 'react-icons/fa'
import { FaStar } from 'react-icons/fa'
import { useState, useEffect } from 'react'
import { APP_CONFIG } from '../config/app'

interface NavigationProps {
  activeModuleType: ModuleType
  onModuleTypeChange: (type: ModuleType) => void
  onOpenPackages: () => void
  onShare: () => void
  onEmbed: () => void
  installedPackagesCount: number
}

export function Navigation({
  activeModuleType,
  onModuleTypeChange,
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
    <nav className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-bold">RunJS</h1>
        <div className="flex items-center gap-2 bg-gray-800 p-1 rounded">
          <button
            onClick={() => onModuleTypeChange('esm')}
            className={`px-3 py-1 rounded cursor-pointer ${
              activeModuleType === 'esm'
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            ES Modules
          </button>
          <button
            onClick={() => onModuleTypeChange('commonjs')}
            className={`px-3 py-1 rounded cursor-pointer ${
              activeModuleType === 'commonjs'
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
          onClick={onOpenPackages}
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded flex items-center gap-2 cursor-pointer"
        >
          Packages ({installedPackagesCount})
        </button>
        <a
          href={APP_CONFIG.social.githubRepo}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-primary hover:bg-blue-600 text-white px-4 py-1.5 rounded flex items-center gap-2 cursor-pointer transition-colors duration-200"
        >
          <FaGithub className="text-lg" />
          <FaStar className="text-lg text-yellow-300" />
          <span>{starCount !== null ? starCount.toLocaleString() : '...'}</span>
        </a>
        <a
          href={APP_CONFIG.social.feedbackForm}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded cursor-pointer"
        >
          Feedback
        </a>
        <a
          href="/credits"
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded cursor-pointer"
        >
          Credits
        </a>
        <button
          onClick={onShare}
          className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 rounded hover:bg-gray-700 cursor-pointer"
        >
          Share
        </button>
        <button
          onClick={onEmbed}
          className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 rounded hover:bg-gray-700 cursor-pointer"
        >
          Embed
        </button>
      </div>
    </nav>
  )
}
