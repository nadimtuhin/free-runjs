'use client'

interface OutputProps {
  output: string
}

export function Output({ output }: OutputProps) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="bg-gray-800 p-4 rounded min-h-[400px] font-mono whitespace-pre-wrap overflow-auto">
        {output || 'Output will appear here...'}
      </div>
    </div>
  )
}
