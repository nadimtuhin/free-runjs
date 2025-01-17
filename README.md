# RunJS - JavaScript Playground

A web-based JavaScript playground that lets you write and execute JavaScript code in both ES Modules and CommonJS formats.

## Features

- 🔄 Support for both ES Modules and CommonJS
- 📦 Real-time package installation and management
- 📝 Multiple file tabs support
- 💾 Auto-save to localStorage
- 🔗 Shareable URLs
- 🎨 Modern dark theme UI
- ⚡️ Instant code execution
- 📋 Clean output display

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- Git

### Installation

1. Clone the repository:
```bash
git clone https://github.com/nadimtuhin/free-runjs.git
cd free-runjs
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Create required directories:
```bash
mkdir -p temp/cjs temp/esm
```

4. Set up environment variables:
```bash
# Create a .env.local file with the following content
touch .env.local
```

Add the following to `.env.local`:
```env
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

5. Run the development server:
```bash
npm run dev
# or
yarn dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

1. Build the application:
```bash
npm run build
# or
yarn build
```

2. Start the production server:
```bash
npm start
# or
yarn start
```

## Usage

1. **Write Code**: Choose between ES Modules or CommonJS syntax and write your JavaScript code in the editor.

2. **Install Packages**: Click the "Packages" button to install npm packages. Type the package name and click "Install" or press Enter.

3. **Run Code**: Click the "Run" button or press Ctrl+Enter (Cmd+Enter on Mac) to execute your code.

4. **Share Code**: Your code is automatically saved in the URL, making it easy to share with others.

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

- [Next.js](https://nextjs.org/) - React Framework
- [Monaco Editor](https://microsoft.github.io/monaco-editor/) - Code Editor
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Node.js](https://nodejs.org/) - Runtime Environment

## Common Issues

1. **Missing temp directory**: If you see errors about missing directories, make sure you've created the temp directories as mentioned in the installation steps.

2. **Node.js version**: Make sure you're using Node.js v18 or higher. You can check your version with:
```bash
node --version
```

3. **Port already in use**: If port 3000 is already in use, you can use a different port:
```bash
PORT=3001 npm run dev
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details. 
