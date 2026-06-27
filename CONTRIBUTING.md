# Contributing to free-runjs

Thanks for taking the time to contribute!

## Getting Started

```bash
git clone https://github.com/nadimtuhin/free-runjs.git
cd free-runjs
npm install
cp .env.example .env.local
npm run dev
```

## Development Workflow

- `npm run dev` — start the dev server at http://localhost:3000
- `npm run lint` — run ESLint
- `npm run format` — run Prettier
- `npm test` (or `npm run test:chrome`) — run Playwright tests

## Submitting Changes

1. Fork the repo and create a branch from `main`.
2. Make your changes and ensure `npm run lint` passes.
3. Open a pull request describing what you changed and why.

## Reporting Bugs

Open an issue at https://github.com/nadimtuhin/free-runjs/issues with:
- Steps to reproduce
- Expected vs. actual behavior
- Browser/Node version

## Code Style

This project uses ESLint + Prettier. Run `npm run format` before committing.
