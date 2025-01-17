import Link from 'next/link'

export default function Credits() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
      {/* GitHub Fork Ribbon */}
      <a
        href="https://github.com/nadimtuhin/runjs"
        className="absolute -right-20 top-12 w-80 text-center transform rotate-45 bg-primary text-white font-semibold py-2 shadow-lg hover:bg-blue-600 transition-colors"
        target="_blank"
        rel="noopener noreferrer"
      >
        Fork me on GitHub
      </a>

      <div className="max-w-2xl bg-gray-900 p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold mb-6">Credits</h1>
        <div className="space-y-4">
          <div>
            <h2 className="text-2xl font-semibold text-primary">Nadim Tuhin</h2>
            <p className="text-gray-300 mt-2">Creator & Developer</p>
            <div className="mt-4 space-y-2">
              <p>
                <a href="mailto:nadimtuhin@gmail.com" className="text-primary hover:underline">
                  nadimtuhin@gmail.com
                </a>
              </p>
              <p>
                <a href="https://nadimtuhin.com" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  nadimtuhin.com
                </a>
              </p>
              <p>
                <a href="https://github.com/nadimtuhin" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  github.com/nadimtuhin
                </a>
              </p>
            </div>
          </div>
        </div>
        <Link href="/" className="inline-block mt-8 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded transition-colors">
          Back to Editor
        </Link>
      </div>
    </main>
  )
}
