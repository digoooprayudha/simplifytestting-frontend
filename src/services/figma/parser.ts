import { FigmaNode } from './types';

// Common UI patterns to identify interactable elements based on layer names
const INTERACTABLE_NAME_PATTERN = /(btn|button|input|checkbox|toggle|link|tab|radio|dropdown|select)/i;
const DECORATIVE_NAME_PATTERN = /(icon|vector|illustration|graphic|img|image|avatar|bg|background|logo|divider|spacer)/i;

/**
 * Determines if a Figma node should be considered an interactable element
 * for the Katalon testing context.
 */
export function isInteractableNode(node: FigmaNode): boolean {
    // 1. Ignore explicitly hidden layers in Figma
    if ((node as any).visible === false) {
        return false;
    }

    // 2. Must have physical dimensions on the screen
    if (!node.absoluteBoundingBox) {
        return false;
    }

    // 3. Exclude decorative or purely structural elements by name heuristic
    const name = (node.name || '').toLowerCase();
    if (DECORATIVE_NAME_PATTERN.test(name)) {
        return false;
    }

    // 4. Explicit interactions (prototyping links mapped by designer)
    if (node.reactions && node.reactions.length > 0) {
        return true;
    }

    // 5. Component instances or components
    if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
        return true;
    }

    // 6. Text nodes are often what the user interacts with or needs to assert on
    if (node.type === 'TEXT') {
        return true;
    }

    // 7. Fallback to naming heuristics for general groups/frames
    if (INTERACTABLE_NAME_PATTERN.test(name)) {
        return true;
    }

    return false;
}

export interface ExtractedUIElement {
    id: number;
    node: FigmaNode;
}

/**
 * Recursively parses the Figma document tree and extracts all interactable elements.
 * Assigns a sequential ID to each extracted element for the visual grounding table.
 */
export function extractInteractableElements(
    nodes: FigmaNode[],
    extracted: ExtractedUIElement[] = [],
    counter = { current: 1 }
): ExtractedUIElement[] {
    // Safeguard to prevent recursive loops in extremely complex vectors
    if (counter.current > 500) {
        return extracted;
    }

    for (const node of nodes) {
        // If the node itself is interactable, we add it to our list
        // We also check physical bounds and filter out unrealistic UI elements (e.g. extremely long panoramas that are usually backgrounds/wrappers)
        if (
            isInteractableNode(node) &&
            node.absoluteBoundingBox &&
            node.absoluteBoundingBox.width > 0 &&
            node.absoluteBoundingBox.height > 0 &&
            node.absoluteBoundingBox.width < 3000 // Prevent mapping full-page background images or giant map SVGs as buttons
        ) {
            extracted.push({
                id: counter.current++,
                node: node,
            });
            // Optionally, we could choose NOT to traverse children of an interactable component 
            // if we consider it a single atomic element (like a Button). 
            // But for complex components like a Dropdown, we might want its internal items.
            // For now, let's keep it simple and skip traversing children of standard atomic inputs/buttons 
            // to avoid double-counting the text inside a button as a separate element.
            const isAtomic = /(btn|button|input|checkbox|radio)/i.test(node.name) || node.type === 'TEXT';
            if (isAtomic) {
                continue;
            }
        }

        // Traverse children if they exist
        if (node.children && node.children.length > 0) {
            extractInteractableElements(node.children, extracted, counter);
        }
    }

    return extracted;
}
