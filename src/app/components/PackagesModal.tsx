'use client'

interface PackageInfo {
  name: string
  version: string
}

interface PackagesModalProps {
  isOpen: boolean
  onClose: () => void
  installedPackages: PackageInfo[]
  isLoadingPackages: boolean
  packageInput: string
  setPackageInput: (value: string) => void
  isInstalling: boolean
  onInstall: () => void
  onUninstall: (packageName: string) => void
}

export function PackagesModal({
  isOpen,
  onClose,
  installedPackages,
  isLoadingPackages,
  packageInput,
  setPackageInput,
  isInstalling,
  onInstall,
  onUninstall,
}: PackagesModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-2xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Manage Packages</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={packageInput}
              onChange={e => setPackageInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  onInstall()
                }
              }}
              placeholder="Package name"
              className="flex-1 bg-gray-800 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={onInstall}
              className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isInstalling || !packageInput.trim()}
            >
              {isInstalling ? (
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
                  Installing...
                </>
              ) : (
                'Install'
              )}
            </button>
          </div>

          <div className="space-y-2 max-h-96 overflow-y-auto">
            {isLoadingPackages ? (
              <div className="text-center py-4">
                <svg className="animate-spin h-6 w-6 mx-auto" viewBox="0 0 24 24">
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
                <p className="text-gray-400 mt-2">Loading packages...</p>
              </div>
            ) : installedPackages.length === 0 ? (
              <p className="text-gray-400 text-center py-4">No packages installed</p>
            ) : (
              installedPackages.map(pkg => (
                <div
                  key={pkg.name}
                  className="flex items-center justify-between bg-gray-800 p-2 rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">{pkg.name}</span>
                    <span className="text-xs text-gray-400">{pkg.version}</span>
                  </div>
                  <button
                    onClick={() => onUninstall(pkg.name)}
                    className="text-red-400 hover:text-red-300 focus:outline-none px-2 py-1 hover:bg-gray-700 rounded"
                    title="Uninstall package"
                  >
                    Uninstall
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
