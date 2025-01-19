'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    plausible: {
      (...args: any[]): void
      q?: any[]
    }
  }
}

export function Analytics() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.plausible = window.plausible || function(...args) {
        (window.plausible.q = window.plausible.q || []).push(args)
      }
    }
  }, [])

  return null
}
