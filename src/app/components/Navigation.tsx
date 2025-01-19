'use client'

import { ModuleType } from '../utils/moduleTypes'
import { FaGithub } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { FaFacebook } from 'react-icons/fa'
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
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded flex items-center gap-2 cursor-pointer"
        >
          <FaGithub className="text-lg" />
        </a>
        <a
          href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(APP_CONFIG.contact.website)}&text=${encodeURIComponent(APP_CONFIG.sharing.defaultText)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded flex items-center gap-2 cursor-pointer"
        >
          <FaXTwitter className="text-lg" />
        </a>
        <a
          href={`https://www.facebook.com/dialog/share?app_id=${APP_CONFIG.social.facebookAppId}&href=${encodeURIComponent(APP_CONFIG.contact.website)}&display=popup`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded flex items-center gap-2 cursor-pointer"
        >
          <FaFacebook className="text-lg" />
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
