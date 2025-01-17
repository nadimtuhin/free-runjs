"use client";

import { useState } from "react";
import Editor from "@monaco-editor/react";

export default function Home() {
  const [code, setCode] = useState<string>(
    '// Write your JavaScript code here\nconsole.log("Hello World!");'
  );
  const [output, setOutput] = useState<string>("");

  const handleRunCode = async () => {
    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error);
      }

      setOutput(data.output || "No output");
    } catch (error: unknown) {
      setOutput(`Error: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col p-4">
      <nav className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">RunJS</h1>
        <div className="flex items-center gap-4">
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
