# SimplifyTesting Figma Extractor Plugin Plan

## Overview
This document outlines the plan to build a custom Figma plugin ("SimplifyTesting Extractor"). The plugin goal is to allow users to select Figma frames, extract their raw UI metadata into a normalized JSON structure, and export the pre-rendered high-resolution image locally. This enables 100% offline parsing and validation within the SimplifyTesting application without hitting Figma API rate limits or requiring user API tokens.

## Objectives
1.  **Extract UI Metadata:** Parse the selected Figma Frame's node tree to extract interactable element properties (id, name, type, absolute coordinates, explicit text).
2.  **Export High-Res Image:** Render the selected frame at exactly 2x scale to generate a base Visual Grounding image offline.
3.  **Local Download:** Bundle and download both the metadata JSON and the reference PNG directly to the user's computer.
4.  **Match API Schema:** Ensure the output JSON structure perfectly mirrors the existing payload expected by `mapToVisionAIElements` in the current REST API workflow.

## Plugin Technical Stack
*   **Figma Plugin API:** To access the document canvas, node properties, and trigger local exports.
*   **TypeScript:** For writing the core extraction logic (`code.ts`).
*   **HTML/JS (UI iframe):** For rendering the simple UI interface and handling the browser-level File Download triggers (`ui.html`).
*   **Build Tool:** Webpack or Vite (configured by the default Figma Plugin template) to bundle the TS code.

## Implementation Steps

### Phase 1: Plugin Initialization & Setup
- [x] Create a new Figma Plugin via the Figma Desktop app (Menu > Plugins > Development > New Plugin).
- [x] Name it "SimplifyTesting Extractor".
- [x] Choose the "Figma design + UI" template.
- [x] Set up the local development environment and run the watch compiler (`npm run watch`).

### Phase 2: Core Extraction Logic (`code.ts`) [COMPLETED]
- [x] Implement `figma.on("selectionchange", ...)` to detect when a user selects a Frame node. Only allow top-level or explicitly selected Frames to be processed.
- [x] Create the recursive extraction function (similar to `extractInteractableElements` in our web app).
  - Walk the Figma node tree.
  - Identify interactable nodes based on explicit types (`TEXT`, `INSTANCE`, `COMPONENT`) and naming heuristics (`button`, `input`, etc.).
  - Extract physical absolute coordinates (`absoluteBoundingBox`).
  - Flatten the nested tree into a 1D array of `ExtractedUIElement` equivalents.
- [x] Implement the Image Export:
  - Call `await frame.exportAsync({ format: 'PNG', constraint: { type: 'SCALE', value: 2 } })`.
- [x] Package the extracted JSON array and the PNG `Uint8Array` back to the UI iframe via `figma.ui.postMessage`.

### Phase 3: User Interface & Download Generation (`ui.html`) [COMPLETED]
- [x] Build a minimal, clean UI showing the currently selected Frame name and an "Export for SimplifyTesting" button.
- [x] Listen for messages from `code.ts`.
- [x] Upon receiving the payload:
  - Serialize the JSON metadata.
  - Convert the `Uint8Array` image data into a Javascript `Blob`.
  - Use hidden `<a>` anchor tags with object URLs to force the browser to download both files simultaneously:
    - `[FrameName]-simplify-data.json`
    - `[FrameName]-simplify-render.png`

### Phase 4: Integration with Web App (`Step2Upload.tsx`) [COMPLETED]
- [x] Modify the file uploader dropzone to accept `.json` and `.png` file pairs.
- [x] Read the local `.json` file content.
- [x] Parse the JSON and route it directly into the existing `constructKatalonPrompt` mapper pipeline.
- [x] Read the local `.png` file as an object URL and route it into the existing `renderVisualGrounding` pipeline (passing the metadata for the red boxes).
- [x] Show the parsed result in the existing UI exactly as if it were fetched from the Figma REST API.

## Data Schema Alignment
To ensure compatibility with the web app, the exported JSON must conform to the following interface:

```typescript
interface ExportedMetadata {
  frameName: string;
  width: number;
  height: number;
  extractedElements: {
    id: string;
    type: string; // 'TEXT', 'INSTANCE', 'FRAME', etc.
    name: string;
    absoluteBoundingBox: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
    characters?: string; // For TEXT nodes
    reactions?: any[]; // For prototype Click Navigation targeting
  }[];
}
```

## Security & Maintenance
- **No Network Tracking:** The plugin operates 100% locally. It never sends the user's design data to any third-party server (other than when the user explicitly uploads the exported files to the SimplifyTesting web app).
- **Versioning:** Output JSON should include a `version: "1.0"` flag so the web app can handle future schema changes gracefully.
