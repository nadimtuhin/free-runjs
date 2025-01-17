'use client'

import { FaGithub, FaTwitter, FaFacebook } from 'react-icons/fa'
import { useEffect, useCallback } from 'react'
import { APP_CONFIG } from '../config/app'

interface LoveModalProps {
  isOpen: boolean
  onClose: () => void
}

export function LoveModal({ isOpen, onClose }: LoveModalProps) {
  const handleEscapeKey = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      onClose()
    }
  }, [onClose])

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscapeKey)
      return () => {
        document.removeEventListener('keydown', handleEscapeKey)
      }
    }
  }, [isOpen, handleEscapeKey])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-semibold text-white">Show Some Love! ❤️</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white focus:outline-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="p-6 space-y-6">
          <div className="space-y-4">
            <p className="text-gray-300">
              Enjoying RunJS? Help us make it even better by:
            </p>

            <div className="flex flex-col gap-4">
              <a
                href={APP_CONFIG.social.githubRepo}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
              >
                <FaGithub className="text-xl" />
                <span>Star us on GitHub</span>
              </a>

              <a
                href={APP_CONFIG.social.githubIssues}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
              >
                <FaGithub className="text-xl" />
                <span>Report an Issue</span>
              </a>

              <a
                href={APP_CONFIG.social.feedbackForm}
                target="_blank"
                rel="noopener noreferrer"
                className="p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
              >
                Provide Feedback
              </a>

              <div className="flex gap-3">
                <a
                  href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(APP_CONFIG.contact.website)}&text=${encodeURIComponent(APP_CONFIG.sharing.defaultText)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
                >
                  <FaTwitter className="text-xl" />
                  <span>Share</span>
                </a>

                <a
                  href={`https://www.facebook.com/dialog/share?app_id=${APP_CONFIG.social.facebookAppId}&href=${encodeURIComponent(APP_CONFIG.contact.website)}&display=popup`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 flex items-center justify-center gap-2 p-3 bg-gray-800 hover:bg-gray-700 rounded-lg text-white transition-colors"
                >
                  <FaFacebook className="text-xl" />
                  <span>Share</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
