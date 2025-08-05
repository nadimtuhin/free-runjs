import './globals.css'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Analytics } from './components/Analytics'
import { APP_CONFIG } from './config/app'

export const metadata: Metadata = {
  title: 'RunJS - JavaScript Playground',
  description: 'Write and execute JavaScript code with different Node.js versions',
  metadataBase: new URL(APP_CONFIG.domains.baseUrl),
  icons: {
    icon: [
      { url: '/favicon/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon.ico', sizes: '48x48' },
    ],
    apple: [{ url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    other: [
      {
        rel: 'mask-icon',
        url: '/favicon/favicon.svg',
        color: '#007acc',
      },
    ],
  },
  manifest: '/favicon/site.webmanifest',
  other: {
    'msapplication-TileColor': '#68a063',
    'msapplication-config': '/favicon/browserconfig.xml',
    'theme-color': '#68a063',
  },
  openGraph: {
    title: 'RunJS - Node.js/JavaScript Playground',
    description: 'Write and execute JavaScript code with different Node.js versions',
    type: 'website',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'RunJS - Node.js/JavaScript Playground',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RunJS - Node.js/JavaScript Playground',
    description: 'Write and execute JavaScript code with different Node.js versions',
    images: ['/og-image.png'],
  },
}

function StatusBar() {
  return (
    <div className="h-6 bg-vscode-accent text-white flex items-center justify-between px-4 text-xs font-vscode">
      <div className="flex items-center space-x-4">
        <Link href="/privacy" className="hover:bg-white/10 px-2 py-1 rounded">
          Privacy
        </Link>
        <Link href="/terms" className="hover:bg-white/10 px-2 py-1 rounded">
          Terms
        </Link>
      </div>
      <div className="flex items-center space-x-4">
        <span>RunJS v1.0.0</span>
        <span>JavaScript</span>
        <span>UTF-8</span>
      </div>
    </div>
  )
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        {APP_CONFIG.analytics.plausible.enabled && (
          <script
            defer
            data-domain={APP_CONFIG.analytics.plausible.domain}
            src={APP_CONFIG.analytics.plausible.scriptSrc}
          ></script>
        )}
      </head>
      <body className="bg-vscode-bg min-h-screen font-vscode text-vscode-text flex flex-col">
        <Analytics />
        <div className="flex-1 flex flex-col">
          {children}
        </div>
        <StatusBar />
      </body>
    </html>
  )
}
