# AI Brochure Generator

A client-side web application that converts any publicly accessible website URL into a professionally formatted digital brochure using large language models. The brochure is generated in the user's browser language, regardless of the source website's language, and can be exported as a PDF file named after the target brand.

---
<img width="865" height="583" alt="Ekran görüntüsü 2026-04-24 193709" src="https://github.com/user-attachments/assets/0aa7c686-cc0d-47e4-9610-ed1065e1e982" />
<img width="863" height="774" alt="Ekran görüntüsü 2026-04-24 193811" src="https://github.com/user-attachments/assets/8f02d3f2-0e40-41e0-b0be-b3a3db6a21be" />



## Overview

The application fetches the plain-text content of a given URL through the Jina Reader API, constructs a structured prompt that includes an output language directive derived from the user's browser locale, and forwards the request to the selected LLM provider. The result is rendered as a styled Markdown document and presented as a print-ready brochure inside the browser.

No backend server is required. All API calls are made directly from the browser to the respective AI provider endpoints using the user's own API key.

---

## Key Features

### Dynamic Model Fetching
Instead of maintaining a hardcoded list of models, the application queries each provider's `/models` endpoint in real time as soon as a valid API key is entered. The model selector is populated with the live response, filtered to include only text generation models. This ensures compatibility with newly released models without requiring a code update.

### Automatic Locale-Based Output Language
The application detects the user's browser language via `navigator.languages` and injects an explicit output language directive into the LLM prompt. The brochure is always generated in the user's system language, independent of the source website's language. A mapping of BCP-47 language codes to human-readable language names (e.g., `tr` to `Turkish / Turkce`) is used to construct the directive in a form the model reliably follows.

### Brand-Aware Dynamic PDF Naming
When the user downloads the brochure as a PDF, the filename is derived from the target URL rather than a static string. The hostname is parsed and split on `.` characters; known TLD and ccTLD tokens (`.com`, `.tr`, `.co`, `.uk`, etc.) are stripped from the right until the first non-TLD segment is reached. This segment is treated as the brand name. For example, `tr.pinterest.com` resolves to `Pinterest_Brosuru.pdf` and `www.apple.com.tr` resolves to `Apple_Brosuru.pdf`. If parsing fails, the filename falls back to `Dijital_Brosur.pdf`.

### Multi-Provider Support
The application supports three LLM providers through a unified interface:

- **Google Gemini** — API keys beginning with `AIza`
- **Groq** — API keys beginning with `gsk_`
- **OpenAI** — API keys beginning with `sk-`

The provider is detected automatically from the key prefix. Gemini uses the `generateContent` REST API; Groq and OpenAI share the OpenAI-compatible chat completions interface.

### Light and Dark Themes
A toggle switches between a light mode and a dark Cyber theme. The selected theme is applied as a class on the `<html>` element and affects all components, including the brochure paper, skeleton loader, input fields, and toolbar.

### Multi-Page PDF Export
The brochure is rendered to a canvas at 2x scale using `html2canvas`, then tiled across A4 pages using `jsPDF`. The File System Access API (`showSaveFilePicker`) is used in supported browsers to present a native save dialog. A standard anchor download fallback is provided for unsupported browsers.

---

## Technology Stack

| Layer | Library / Service | Version |
|---|---|---|
| UI Framework | React | 19 |
| Build Tool | Vite | 8 |
| Markdown Rendering | react-markdown | 10 |
| Icon Set | lucide-react | 1 |
| PDF Generation | jsPDF | 4 |
| DOM-to-Canvas | html2canvas | 1.4 |
| Web Content Fetching | Jina Reader API | — |
| LLM — Gemini | Google Generative Language API | v1beta |
| LLM — Groq | Groq OpenAI-compatible API | — |
| LLM — OpenAI | OpenAI Chat Completions API | v1 |
| Styling | Vanilla CSS (custom properties) | — |
| Typography | Inter, Playfair Display (Google Fonts) | — |

---

## Getting Started

### Prerequisites

- Node.js 18 or later
- npm 9 or later
- An API key from at least one of the supported providers (Gemini, Groq, or OpenAI)

### Installation

Clone the repository:

```bash
git clone https://github.com/Fatmanurkntr/ai-brochure-generator.git
cd ai-brochure-generator
```

Install dependencies:

```bash
npm install
```

### Running the Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5173` by default.

### Building for Production

```bash
npm run build
```

The output will be placed in the `dist/` directory and can be served from any static file host.

---

## Usage

1. Enter the URL of any publicly accessible website in the URL field.
2. Paste a valid API key for Gemini, Groq, or OpenAI. The provider is detected automatically.
3. Wait for the model list to load, then select the desired model from the dropdown.
4. Click "Brosur Uret" to generate the brochure.
5. Once the brochure is rendered, use the "PDF Indir" button to export it, or "Kopyala" to copy the raw Markdown.

---

## Project Structure

```
ai-brochure/
├── public/
│   └── favicon.png
├── src/
│   ├── api/
│   │   └── brochure.js       # Provider detection, model fetching, prompt construction, API calls
│   ├── App.jsx               # Main application component, state, PDF export
│   ├── App.css               # Component and brochure styles
│   ├── index.css             # Global design tokens and resets
│   └── main.jsx              # React entry point
├── index.html
├── package.json
└── vite.config.js
```

---

## API Key Security

API keys are never stored, logged, or transmitted to any server other than the respective LLM provider's official endpoint. All requests are made directly from the user's browser. The key exists only in component state for the duration of the browser session.

---

## License

This project was developed as part of a course exercise and is not licensed for commercial redistribution.
