"use client";

import { useState } from "react";
import Editor, { OnMount } from "@monaco-editor/react";

export default function Home() {
  const [code, setCode] = useState<string>(
    '// Write your JavaScript code here\nconsole.log("Hello World!");'
  );
  const [output, setOutput] = useState<string>("");
  const [isRunning, setIsRunning] = useState(false);

  const handleEditorMount: OnMount = (editor) => {
    editor.addCommand(
      // Monaco.KeyMod.CtrlCmd | Monaco.KeyCode.Enter
      2048 | 3,
      handleRunCode
    );
  };

  const handleRunCode = async () => {
    if (isRunning) return;

    setIsRunning(true);
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
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col p-4">
      <nav className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold">RunJS</h1>
        <div className="flex items-center gap-4">
          <button
            onClick={handleRunCode}
            className="bg-primary hover:bg-blue-600 text-white px-4 py-1 rounded flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                Running...
              </>
            ) : (
              'Run'
            )}
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
            onMount={handleEditorMount}
          />
        </div>
        <div className="flex-1 bg-gray-800 p-4 rounded min-h-[500px] font-mono whitespace-pre-wrap overflow-auto">
          {output || "Output will appear here..."}
        </div>
      </div>
    </main>
  );
}
