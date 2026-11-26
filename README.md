# React GitHub Actions Demo

A small React application that consumes the Rick and Morty API. The project is intended for practicing GitHub Actions, continuous integration, deployment, and AZ-400 concepts.

## Features

- React and TypeScript with Vite
- Character data from the Rick and Morty API
- Responsive character card layout
- Loading and error states
- A basic component test with Vitest and Testing Library

## Run locally

```bash
cd frontend
npm install
npm run dev
```

## Validate the project

```bash
cd frontend
npm test
npm run build
```

## Automation

Development requests run on [Agentic Forge](https://github.com/LuisiitoDev/agentic-forge): open an issue and add the label `forge`. The engine runs BA and Planner, waits for a human to add `ready-for-dev`, then runs Coder and Reviewer and delivers a pull request.
