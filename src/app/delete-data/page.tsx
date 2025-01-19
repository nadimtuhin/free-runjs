import React from 'react';

export default function DeleteData() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h1 className="text-3xl font-bold mb-6">Data Deletion Request</h1>

      <div className="prose prose-lg">
        <p className="mb-4">
          We respect your privacy and your right to control your personal data. If you would like to request the deletion of your data from RunJS, please follow these steps:
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-3">How to Request Data Deletion</h2>
        <ol className="list-decimal pl-6 mb-6">
          <li className="mb-2">Send an email to <a href="mailto:support@runjs.app" className="text-blue-600 hover:underline">support@runjs.app</a></li>
          <li className="mb-2">Include &ldquo;Data Deletion Request&rdquo; in the subject line</li>
          <li className="mb-2">Provide the email address associated with your RunJS account</li>
          <li className="mb-2">We will process your request within 30 days and send you a confirmation email</li>
        </ol>

        <h2 className="text-xl font-semibold mt-6 mb-3">What Data Will Be Deleted</h2>
        <ul className="list-disc pl-6 mb-6">
          <li className="mb-2">Your account information</li>
          <li className="mb-2">Your saved code snippets and projects</li>
          <li className="mb-2">Your usage history and preferences</li>
          <li className="mb-2">Any other personal data associated with your account</li>
        </ul>

        <p className="mb-4">
          Please note that some information might be retained for legal, security, or business purposes as outlined in our{' '}
          <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-3">Questions?</h2>
        <p>
          If you have any questions about the data deletion process, please contact us at{' '}
          <a href="mailto:nadimtuhin@gmail.com" className="text-blue-600 hover:underline">nadimtuhin@gmail.com</a>.
        </p>
      </div>
    </div>
  );
}
