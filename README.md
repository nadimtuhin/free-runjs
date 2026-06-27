# RunJS - JavaScript Playground

A web-based JavaScript playground that lets you write and execute JavaScript code in both ES Modules and CommonJS formats.

## Features

- Support for both ES Modules and CommonJS
- Real-time package installation and management
- Multiple file tabs
- Auto-save to localStorage
- Shareable URLs
- Dark theme UI
- Instant code execution
- Clean output display

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nadimtuhin/free-runjs.git
cd free-runjs
```

2. Install dependencies:
```bash
npm install
```

3. Create required directories:
```bash
mkdir -p temp/cjs temp/esm
```

4. Set up environment variables:
```bash
touch .env.local
```

Add to `.env.local`:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Usage

1. **Write Code**: Choose ES Modules or CommonJS syntax and write your JavaScript in the editor.
2. **Install Packages**: Click "Packages" to install npm packages. Type the package name and click "Install" or press Enter.
3. **Run Code**: Click "Run" or press Ctrl+Enter (Cmd+Enter on Mac) to execute.
4. **Share Code**: Your code is automatically saved in the URL for sharing.

## Project Structure

```
.
├── src/
│   ├── app/              # Next.js app directory
│   │   ├── api/         # API routes
│   │   │   └── execute/ # Code execution endpoints
│   │   └── page.tsx    # Main editor page
│   └── styles/          # Global styles
├── temp/                # Temporary directory for code execution
│   ├── cjs/            # CommonJS modules
│   └── esm/            # ES modules
└── public/             # Static files
```

## Built With

- [Next.js](https://nextjs.org/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Tailwind CSS](https://tailwindcss.com/)
- [Node.js](https://nodejs.org/)

## Common Issues

1. **Missing temp directory**: Create the temp directories as described in the installation steps.

2. **Node.js version**: Requires v18 or higher. Check with:
```bash
node --version
```

3. **Port already in use**:
```bash
PORT=3001 npm run dev
```

## License

MIT - see the [LICENSE](LICENSE) file for details.
