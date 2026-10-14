<div align="center">

# RunJS

![RunJS, a JavaScript playground in your browser with real npm packages](https://raw.githubusercontent.com/nadimtuhin/free-runjs/main/docs/images/hero.svg)

**Try JavaScript without a project.** Open the page, write code, hit Run.

[`MIT`](LICENSE) `Node 18+`

</div>

<br>

Testing an idea or an npm package usually means a new folder, an `npm init`, and a terminal. RunJS gives you an editor and an output panel in one tab. It runs ES Modules and CommonJS, and installs the npm packages you import when you hit Run.

<br>

![Get started](https://raw.githubusercontent.com/nadimtuhin/free-runjs/main/docs/images/h-start.svg)

To run your own copy, you need Node 18 or newer. Paste each line as is.

**1. Get the code and install:**

```bash
git clone https://github.com/nadimtuhin/free-runjs.git
cd free-runjs
npm install
```

**2. Start it:**

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). You should see the editor.

<br>

![How to use it](https://raw.githubusercontent.com/nadimtuhin/free-runjs/main/docs/images/h-use.svg)

**Write.** Pick ES Modules or CommonJS and type your JavaScript.

**Install.** Click "Packages", type a package name, press Enter.

**Run.** Click "Run", or press Ctrl+Enter (Cmd+Enter on Mac).

**Share.** Your code is saved in the URL. Copy the link.

<br>

![Need help](https://raw.githubusercontent.com/nadimtuhin/free-runjs/main/docs/images/h-help.svg)

<details>
<summary>Run fails because of a missing temp folder</summary>

Create the folders it runs code in: `mkdir -p temp/cjs temp/esm`. `npm install` normally does this for you.

</details>

<details>
<summary>"Port already in use"</summary>

Start it on another port: `PORT=3001 npm run dev`.

</details>

<details>
<summary>Something about the Node version</summary>

You need Node 18 or newer. Run `node --version` to check.

</details>

<br>

![For developers](https://raw.githubusercontent.com/nadimtuhin/free-runjs/main/docs/images/h-dev.svg)

Everything below is reference. You don't need it to get started.

[Features](#features) · [Installation](#installation) · [Usage](#usage) · [Structure](#project-structure) · [Built with](#built-with) · [Common issues](#common-issues)

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

4. Optional environment variables: `NEXT_PUBLIC_DOMAIN` and `NEXT_PUBLIC_PROTOCOL` (set them in `.env.local`). Dev defaults to `localhost:3000`, so you can skip this locally.

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
