import type { Metadata } from 'next'
import '../globals.css'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'RunJS - Embedded Editor',
  description: 'Run JavaScript code directly in your browser',
}

export default function EmbedLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-gray-900 text-white min-h-screen">
        <header className="border-b border-gray-800 px-2 py-1">
          <Link href="/" className="text-lg font-semibold hover:text-gray-300 flex items-center gap-2">
            <span className="text-yellow-500">Run</span>
            <span>JS</span>
          </Link>
        </header>
        {children}
      </body>
    </html>
  )
}
