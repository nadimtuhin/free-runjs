'use client'

import { useRef, useState, useEffect } from 'react'
import { APP_CONFIG } from '../config/app'

interface ShareModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const [isCopied, setIsCopied] = useState(false)
  const [url, setUrl] = useState('')
  const shareInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const path = window.location.pathname + window.location.search + window.location.hash
      setUrl(APP_CONFIG.contact.website + path)
    }
  }, [])

  if (!isOpen) return null

  const handleCopyShare = async () => {
    try {
      await navigator.clipboard.writeText(url)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy URL:', error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Share Code</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white focus:outline-none"
          >
            ×
          </button>
        </div>
        <div className="p-4">
          <div className="flex items-center gap-2">
            <input
              ref={shareInputRef}
              type="text"
              value={url}
              readOnly
              className="flex-1 bg-gray-800 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyShare}
                className="bg-primary hover:bg-blue-600 text-white px-4 py-2 rounded"
              >
                Copy
              </button>
              {isCopied && (
                <span className="text-green-500 text-sm">Copied!</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
