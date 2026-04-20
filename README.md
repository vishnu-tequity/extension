# AI Hover Explainer

AI-powered symbol explanations on hover, powered by a local [Ollama](https://ollama.com) model — no API keys, no internet, no cost.

## Requirements

- [Ollama](https://ollama.com) installed and running
- `codellama` model pulled: `ollama pull codellama`

## Setup

1. Install Ollama from [ollama.com](https://ollama.com)
2. Pull the model: `ollama pull codellama`
3. Ollama runs automatically in the background on Mac after install — if it doesn't, run `ollama serve` in your terminal
4. Install this extension and hover over any symbol

## Features

- Hover over any symbol to get an AI explanation
- Works offline — model runs locally on your machine
- Supports TypeScript, JavaScript, Python and more
- Caches results to avoid redundant calls

## Settings

| Setting | Default | Description |
|---|---|---|
| `aiHover.enabled` | `true` | Enable or disable hover explanations |
