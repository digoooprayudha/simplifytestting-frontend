# Figma-to-Katalon Context Engine Implementation Task

## Objective
Implement a high-visibility visual grounding and token-efficient table generator for exporting Figma designs to Katalon test cases. Use HTML5 `<canvas>` for image merging and securely call an LLM API directly to generate the Katalon script.

## Phase 1: Setup & Data Fetching
- [x] Add Figma configuration properties (`FIGMA_ACCESS_TOKEN`, etc.) to `.env`.
- [x] Create a service to communicate with the Figma REST API (fetching file data and images securely).
- [x] Define the TypeScript interfaces and types for the Figma API response (Nodes, Document, BoundingBox).

## Phase 2: Figma Node Parsing & Filtering
- [x] Implement a recursive function to parse the `document.children` node tree.
- [x] Build filtering logic to identify actionable/interactable UI elements (e.g., buttons, inputs, checkboxes, links) based on properties like:
  - `reactions` (interactions)
  - `name` matches for standard UI patterns (e.g., "Input", "Button", "Checkbox")
  - `type` components (e.g., `INSTANCE`, `COMPONENT` properties).

## Phase 3: Visual Grounding & Feature Table (HTML5 Canvas)
- [x] Render the base image from the Figma URL using an HTML5 `<canvas>`.
- [x] Iterate through filtered nodes and calculate the expanded `BoundingBox` (`x - 10, y - 10`, `width + 20, height + 20`).
- [x] Draw the high-visibility visual grounding (Pure Red `#FF0000`, 3-5px border) coordinates onto the canvas.
- [x] Draw the labels (`[ID. Nama]`, e.g., "1. btn_login") just outside the top-left of the expanded red rectangles.
- [x] Export the final marked-up canvas image to a consumable data URL/Blob.

## Phase 4: Prompt Construction
- [x] Generate the Markdown table correlating the visual IDs with element metadata (Type, Text, Action).
- [x] Create the XPath generator or heuristics (`Selector Hint`) based on element properties to construct initial locators.
- [x] Construct the final system and user prompts combining the visual instructions and the markdown table context.

## Phase 5: LLM Integration
- [x] Integrate with the local application's secure LLM API endpoint (e.g., Supabase function to OpenAI/Anthropic/Gemini).
- [x] Pass the constructed Markdown context and the marked-up base-64 image blob via the LLM API.
- [x] Handle the LLM's streaming/asynchronous response.

## Phase 6: UI / UX Execution (Step2Upload Integration)
- [ ] Add a `Fetch & Process API` button in the `figmaMode === "link"` view of `Step2Upload.tsx`.
- [ ] Implement `processFigmaLink()` to parse the Figma URL (extract File ID and Node ID).
- [ ] Fetch the explicit Figma architecture via `getFigmaFile()` and parse interactable nodes via `extractInteractableElements()`.
- [ ] Render the high-visibility image Canvas (`renderVisualGrounding`) directly in the browser.
- [ ] Bypass the "Vision AI" Edge function to save cost/hallucination, instead insert the parsed Heuristic 100% accurate Node Elements directly to the Supabase `figma_screens` table.
- [ ] Embed the generated Table Context into the `document_chunks` table for RAG consumption by the `generate-katalon` AI agent.
- [ ] Show loading state and success feedback in the UI list when the node is successfully parsed and marked-up.
