import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'RunJS - JavaScript Playground',
  description: 'Write and execute JavaScript code with different Node.js versions',
}

function Footer() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-gray-900 text-gray-400 py-2 px-4 text-sm text-center border-t border-gray-800">
      <div className="flex justify-center items-center gap-4">
        <Link href="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link>
        <span>•</span>
        <Link href="/terms" className="hover:text-white transition-colors">Terms of Service</Link>
      </div>
    </footer>
  )
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
        <Footer />
      </body>
    </html>
  )
}
