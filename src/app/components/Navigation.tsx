'use client'

import { ModuleType } from '../utils/moduleTypes'

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
            className={`px-3 py-1 rounded ${
              activeModuleType === 'esm'
                ? 'bg-primary text-white'
                : 'text-gray-300 hover:text-white'
            }`}
          >
            ES Modules
          </button>
          <button
            onClick={() => onModuleTypeChange('commonjs')}
            className={`px-3 py-1 rounded ${
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
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded flex items-center gap-2"
        >
          Packages ({installedPackagesCount})
        </button>
        <a
          href="/credits"
          className="bg-gray-800 hover:bg-gray-700 text-white px-4 py-1 rounded"
        >
          Credits
        </a>
        <button
          onClick={onShare}
          className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 rounded hover:bg-gray-700"
        >
          Share
        </button>
        <button
          onClick={onEmbed}
          className="px-3 py-1.5 text-sm font-medium text-white bg-gray-600 rounded hover:bg-gray-700"
        >
          Embed
        </button>
      </div>
    </nav>
  )
}