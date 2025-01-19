import type { Metadata } from 'next'
import '../globals.css'

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
      <body className="bg-gray-900 text-white">{children}</body>
    </html>
  )
}
