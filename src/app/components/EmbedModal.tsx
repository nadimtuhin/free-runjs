'use client'

import { useRef, useState, useEffect } from 'react'
import { APP_CONFIG } from '../config/app'

interface EmbedModalProps {
  isOpen: boolean
  onClose: () => void
  code: string
  moduleType: string
}

export function EmbedModal({ isOpen, onClose, code, moduleType }: EmbedModalProps) {
  const [isEmbedCopied, setIsEmbedCopied] = useState(false)
  const embedInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const embedCode = `<iframe src="${APP_CONFIG.contact.website}/embed?code=${btoa(code)}&moduleType=${moduleType}" width="100%" height="600" frameborder="0"></iframe>`

  const handleCopyEmbed = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setIsEmbedCopied(true)
      setTimeout(() => setIsEmbedCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy embed code:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-3xl">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Embed Code</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <input
                ref={embedInputRef}
                type="text"
                value={embedCode}
                readOnly
                className="flex-1 bg-gray-800 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleCopyEmbed}
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Copy
              </button>
            </div>
            {isEmbedCopied && (
              <span className="text-green-500 text-sm">Copied!</span>
            )}
            <div className="mt-4">
              <h3 className="text-lg font-semibold mb-2">Preview</h3>
              <div className="border border-gray-700 rounded overflow-hidden">
                <iframe
                  src={`${APP_CONFIG.contact.website}/embed?code=${btoa(code)}&moduleType=${moduleType}`}
                  width="100%"
                  height="500"
                  frameBorder="0"
                  title="RunJS Embed Preview"
                  className="w-full"
                  style={{ minHeight: '500px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
