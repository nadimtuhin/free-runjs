import Link from 'next/link'

export default function Privacy() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 text-center relative overflow-hidden">
      <div className="max-w-3xl bg-gray-900 p-8 rounded-lg shadow-xl">
        <h1 className="text-3xl font-bold mb-6">Privacy Policy</h1>
        <div className="text-left space-y-4">
          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Information Collection and Use</h2>
            <p className="text-gray-300">
              RunJS is a JavaScript playground that executes code on our secure servers. We do not store or retain any code after execution. Your code is temporarily processed on our servers solely for execution purposes and is immediately discarded afterward.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Code Execution</h2>
            <p className="text-gray-300">
              When you run code on RunJS, it is transmitted to our servers for execution in an isolated environment. We implement strict security measures to ensure the safety and privacy of code execution. We do not log or store the executed code or its results beyond the immediate execution context.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Local Storage</h2>
            <p className="text-gray-300">
              We use browser local storage only to save your preferences and temporary session data. This data remains on your device and is not transmitted to our servers except when necessary for code execution.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Analytics</h2>
            <p className="text-gray-300">
              We may use basic analytics tools to understand how users interact with our application. This data is anonymized and does not contain any personally identifiable information or code content.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Third-Party Services</h2>
            <p className="text-gray-300">
              When you use external packages or APIs through RunJS, you may be subject to their respective privacy policies. We recommend reviewing the privacy policies of any third-party services you utilize.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Changes to This Policy</h2>
            <p className="text-gray-300">
              We reserve the right to update this privacy policy at any time. We will notify users of any material changes by posting the new privacy policy on this page.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold text-primary mb-3">Contact Us</h2>
            <p className="text-gray-300">
              If you have any questions about this Privacy Policy, please contact us at{' '}
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
