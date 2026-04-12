import { FigmaFileResponse, FigmaImageResponse } from './types';

// Using Vite environment variables (will fall back to a default empty string if not set)
// In production, the backend/Supabase Edge function should handle the token directly
// We allow passing an explicit token from UI
const getFigmaToken = (overrideToken?: string) => overrideToken || import.meta.env.VITE_FIGMA_ACCESS_TOKEN || '';

const FIGMA_API_BASE = 'https://api.figma.com/v1';

/**
 * Fetches the document tree structure of a Figma file
 * @param fileId The ID of the Figma file (from URL)
 * @param nodeId Optional specific node ID to fetch
 * @param token Optional Figma API token to override env var
 */
export async function getFigmaFile(fileId: string, nodeId?: string, token?: string): Promise<FigmaFileResponse> {
    let url = `${FIGMA_API_BASE}/files/${fileId}`;

    // If specific node is provided, only fetch that part of the tree to save bandwidth
    if (nodeId) {
        url += `?ids=${nodeId}`;
    }

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'X-Figma-Token': getFigmaToken(token),
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Figma API Error (${response.status}): ${await response.text()}`);
    }

    return await response.json() as FigmaFileResponse;
}

/**
 * Renders nodes into images and returns an image URL mapped to the node ID
 * @param fileId The ID of the Figma file
 * @param nodeIds Array of node IDs to render 
 * @param scale Image scale (defaults to 1 for 1x size)
 * @param format Render format (defaults to png)
 * @param token Optional Figma API token to override env var
 */
export async function getFigmaImageUrls(
    fileId: string,
    nodeIds: string[],
    scale: number = 1,
    format: 'jpg' | 'png' | 'svg' | 'pdf' = 'png',
    token?: string
): Promise<FigmaImageResponse> {
    const idsParam = nodeIds.join(',');
    const url = `${FIGMA_API_BASE}/images/${fileId}?ids=${idsParam}&scale=${scale}&format=${format}`;

    const response = await fetch(url, {
        method: 'GET',
        headers: {
            'X-Figma-Token': getFigmaToken(token),
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) {
        throw new Error(`Figma Image API Error (${response.status}): ${await response.text()}`);
    }

    return await response.json() as FigmaImageResponse;
}
