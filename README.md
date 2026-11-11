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

See [Agent pipeline and trigger labels](docs/agent-pipeline.md) for intake, the Planner handoff, and the human approval gate for implementation.
