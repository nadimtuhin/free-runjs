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
      { url: '/favicon/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon/favicon.ico', sizes: '48x48' },
    ],
    apple: [
      { url: '/favicon/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
    other: [
      {
        rel: 'mask-icon',
        url: '/favicon/safari-pinned-tab.svg',
        color: '#5bbad5'
      },
    ],
  },
  manifest: '/favicon/site.webmanifest',
  other: {
    'msapplication-TileColor': '#2b5797',
    'msapplication-config': '/favicon/browserconfig.xml',
    'theme-color': '#ffffff'
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
      <head>
        {APP_CONFIG.analytics.plausible.enabled && (
          <script
            defer
            data-domain={APP_CONFIG.analytics.plausible.domain}
            src={APP_CONFIG.analytics.plausible.scriptSrc}
          ></script>
        )}
      </head>
      <body className="bg-secondary min-h-screen">
        <Analytics />
        {children}
        <Footer />
      </body>
    </html>
  )
}
