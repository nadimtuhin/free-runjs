import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'RunJS - JavaScript Playground',
  description: 'Write and execute JavaScript code with different Node.js versions',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="bg-secondary min-h-screen">
        {children}
      </body>
    </html>
  )
} 