"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

export default function Home() {
  const [code, setCode] = useState<string>(
    '// Write your JavaScript code here\nconsole.log("Hello World!");'
  );
  const [output, setOutput] = useState<string>("");
  const [nodeVersion, setNodeVersion] = useState<string>("14");

  const handleRunCode = async () => {
    try {
      // TODO: Implement API call to run code in Docker container
      setOutput("Code execution not implemented yet");
    } catch (error) {
      setOutput(`Error: ${error.message}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col p-4">
      <nav className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">RunJS</h1>
        <div className="flex items-center gap-4">
          <select
            value={nodeVersion}
            onChange={(e) => setNodeVersion(e.target.value)}
            className="bg-gray-700 text-white px-3 py-1 rounded"
          >
            <option value="14">Node.js 14</option>
            <option value="16">Node.js 16</option>
            <option value="18">Node.js 18</option>
            <option value="20">Node.js 20</option>
          </select>
          <button
            onClick={handleRunCode}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-1 rounded"
          >
            Run
          </button>
        </div>
      </nav>

      <div className="flex flex-1 gap-4">
        <div className="flex-1 min-h-[500px]">
          <Editor
            height="100%"
            defaultLanguage="javascript"
            theme="vs-dark"
            value={code}
            onChange={(value) => setCode(value || "")}
            options={{
              minimap: { enabled: false },
              fontSize: 14,
            }}
          />
        </div>
        <div className="flex-1 bg-gray-800 p-4 rounded min-h-[500px] font-mono whitespace-pre-wrap overflow-auto">
          {output || "Output will appear here..."}
        </div>
      </div>
    </main>
  );
}
