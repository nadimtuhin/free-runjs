import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // VS Code Dark Theme Colors
        'vscode-bg': '#1e1e1e',           // Main background
        'vscode-sidebar': '#252526',       // Sidebar background
        'vscode-editor': '#1e1e1e',       // Editor background
        'vscode-panel': '#252526',        // Panel background
        'vscode-border': '#2d2d30',       // Border color
        'vscode-text': '#cccccc',         // Primary text
        'vscode-text-muted': '#969696',   // Muted text
        'vscode-accent': '#007acc',       // Accent blue
        'vscode-success': '#4ec9b0',      // Success green
        'vscode-warning': '#dcdcaa',      // Warning yellow
        'vscode-error': '#f44747',        // Error red
        'vscode-hover': '#2a2d2e',        // Hover background
        'vscode-active': '#37373d',       // Active background
        'vscode-tab': '#2d2d30',          // Tab background
        'vscode-tab-active': '#1e1e1e',   // Active tab
        'vscode-menu': '#3c3c3c',         // Menu background
        
        // Legacy colors for compatibility
        primary: '#007acc',
        secondary: '#1e1e1e',
      },
      fontFamily: {
        'vscode': [
          'Menlo',
          'Monaco', 
          'Consolas',
          '"Liberation Mono"',
          '"Courier New"',
          'monospace'
        ],
      },
      fontSize: {
        'vscode-sm': ['13px', '18px'],
        'vscode-base': ['14px', '19px'],
      },
    },
  },
  plugins: [],
}
export default config
