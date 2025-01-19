'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    plausible: (...args: any[]) => void
  }
}

export function Analytics() {
  useEffect(() => {
    window.plausible = window.plausible || function() {
      (window.plausible.q = window.plausible.q || []).push(arguments)
    }
  }, [])

  return null
}
