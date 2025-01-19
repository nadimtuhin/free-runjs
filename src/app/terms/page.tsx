import Link from 'next/link'

export default function Terms() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
      <div className="max-w-3xl bg-gray-900 p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold mb-6">Terms of Service</h1>
        <div className="text-left space-y-4">
          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Acceptance of Terms</h2>
            <p className="text-gray-300">
              By accessing and using RunJS, you accept and agree to be bound by the terms and provisions of this agreement.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Use License</h2>
            <p className="text-gray-300">
              RunJS is open-source software licensed under the MIT license. You are free to use, modify, and distribute the software in accordance with the license terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Code Execution</h2>
            <p className="text-gray-300">
              Your code is executed on our secure servers in an isolated environment. You agree not to submit code that attempts to breach our systems, access unauthorized resources, or perform malicious actions. We reserve the right to terminate access for users who violate these terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Resource Limits</h2>
            <p className="text-gray-300">
              We may impose limits on execution time, memory usage, and other computational resources to ensure fair usage. These limits may be adjusted at any time to maintain service stability.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">User Content</h2>
            <p className="text-gray-300">
              You retain all rights to any code you submit for execution. However, you are solely responsible for the code you submit and its execution results. We do not monitor or control the content of submitted code.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Security</h2>
            <p className="text-gray-300">
              While we implement security measures to protect our service, you agree not to attempt to circumvent these measures or use RunJS for any security testing without explicit permission.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Disclaimer</h2>
            <p className="text-gray-300">
              RunJS is provided &quot;as is&quot; without any warranties of any kind. We do not guarantee that the service will be uninterrupted, secure, or error-free. We are not responsible for any damage or loss resulting from your use of the service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Third-Party Services</h2>
            <p className="text-gray-300">
              When using external packages or APIs through RunJS, you are subject to their respective terms of service. We are not responsible for third-party services or content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Changes to Terms</h2>
            <p className="text-gray-300">
              We reserve the right to modify these terms at any time. Continued use of RunJS after any modifications indicates your acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Contact</h2>
            <p className="text-gray-300">
              For any questions regarding these terms, please contact{' '}
              <a href="mailto:nadimtuhin@gmail.com" className="text-primary hover:underline">
                nadimtuhin@gmail.com
              </a>
            </p>
          </section>
        </div>

        <Link href="/" className="inline-block mt-8 px-4 py-2 bg-primary hover:bg-blue-600 text-white rounded transition-colors">
          Back to Editor
        </Link>
      </div>
    </main>
  )
}
