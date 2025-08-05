export type ExecutionMode = 'native' | 'wasm'

export interface ExecutionConfig {
  mode: ExecutionMode
  moduleType: 'esm' | 'commonjs'
}

export const defaultExecutionMode: ExecutionMode = 'native'

export const executionModeLabels: Record<ExecutionMode, string> = {
  native: 'Native Node.js',
  wasm: 'WASM Sandbox'
}

export const executionModeDescriptions: Record<ExecutionMode, string> = {
  native: 'Execute in standard Node.js environment',
  wasm: 'Execute in secure WebAssembly sandbox'
}