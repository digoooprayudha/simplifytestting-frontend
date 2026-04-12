import { BoundingBox } from './types';
import { ExtractedUIElement } from './parser';

/**
 * Loads an image from a URL into an HTML Image element.
 * Handles CORS issues that typically arise when downloading external images (like from Figma CDN).
 */
function loadImageFromUrl(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        // Allow cross-origin use for the canvas (Required since Figma images are hosted on AWS S3/Cloudfront)
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = (e) => reject(new Error('Failed to load image from URL'));
        img.src = url;
    });
}

/**
 * Calculates the bounding box for the entire base image (often parent frame).
 * Since elements inside have absolute coordinates, we need the origin offset
 * to translate them correctly onto the local canvas.
 */
function getCoordinateOffset(elements: ExtractedUIElement[]): { xOffset: number, yOffset: number } {
    // If we don't have enough elements, assume origin is 0,0
    if (elements.length === 0) return { xOffset: 0, yOffset: 0 };

    // Find the minimum X and Y among all elements.
    // In a perfect world, we know the exact coordinate of the parent frame,
    // but if we only have the elements, we approximate the top-left corner.
    // Ideally, the caller should pass the parent frame's absoluteBoundingBox.
    let minX = Infinity;
    let minY = Infinity;

    for (const el of elements) {
        if (el.node.absoluteBoundingBox) {
            if (el.node.absoluteBoundingBox.x < minX) minX = el.node.absoluteBoundingBox.x;
            if (el.node.absoluteBoundingBox.y < minY) minY = el.node.absoluteBoundingBox.y;
        }
    }

    return {
        xOffset: minX === Infinity ? 0 : minX,
        yOffset: minY === Infinity ? 0 : minY
    };
}

export interface RenderMarkupOptions {
    padding?: number; // Distance from the original bounding box (default 10)
    color?: string; // Color of the stroke (default Pure Red #FF0000)
    lineWidth?: number; // Thickness of the bounding box line (default 3)
    parentFrame?: BoundingBox; // The absolute bounding box of the parent frame rendered by the Figma Image API
    scale?: number; // Figma image export scale (default 1)
}

/**
 * Renders the base Figma image onto an HTML5 Canvas, then draws high-visibility
 * red bounding boxes with numerical ID labels corresponding to the extracted elements.
 * 
 * Returns a Base64 encoded PNG Data URL representing the final marked-up image.
 */
export async function renderVisualGrounding(
    baseImageUrl: string,
    elements: ExtractedUIElement[],
    options?: RenderMarkupOptions
): Promise<string> {
    const padding = options?.padding ?? 10;
    const color = options?.color ?? '#FF0000';
    const lineWidth = options?.lineWidth ?? 4;
    const scale = options?.scale ?? 1;

    // 1. Load the base image
    const image = await loadImageFromUrl(baseImageUrl);

    // 2. Setup the HTML5 Canvas
    const canvas = document.createElement('canvas');
    canvas.width = image.width;
    canvas.height = image.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Failed to get 2D context from canvas');
    }

    // 3. Draw the base image
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

    // 4. Calculate offset
    // The bounding boxes from the Figma API are in "Absolute" document coordinates.
    // But the image we downloaded from the Figma API is clipped to the Parent Frame.
    // So we must subtract the Top-Left (X,Y) of the Parent Frame from the child element coordinates.
    const xOrigin = options?.parentFrame?.x ?? 0;
    const yOrigin = options?.parentFrame?.y ?? 0;

    // 5. Draw the bounding boxes and labels
    for (const element of elements) {
        const box = element.node.absoluteBoundingBox;
        if (!box) continue;

        // Translate absolute coordinate to local Canvas coordinate and apply scale
        const localX = (box.x - xOrigin) * scale;
        const localY = (box.y - yOrigin) * scale;
        const scaledWidth = box.width * scale;
        const scaledHeight = box.height * scale;

        // Apply the padding offset (also scaled for visual consistency)
        const drawX = localX - (padding * scale);
        const drawY = localY - (padding * scale);
        const drawW = scaledWidth + (padding * scale * 2);
        const drawH = scaledHeight + (padding * scale * 2);

        // Draw the bright red rectangle
        ctx.beginPath();
        ctx.strokeStyle = color;
        ctx.lineWidth = lineWidth * scale;
        ctx.rect(drawX, drawY, drawW, drawH);
        ctx.stroke();

        // Draw the Label Background (A solid box to ensure the text is readable)
        const labelText = `[${element.id}. ${element.node.name}]`;
        const fontSize = Math.floor(12 * scale);
        ctx.font = `bold ${fontSize}px Inter, system-ui, sans-serif`;

        // Measure text to create a background box of the exact size
        const textMetrics = ctx.measureText(labelText);
        const textHeight = fontSize; // Approx height for font
        const labelBgWidth = textMetrics.width + (10 * scale);
        const labelBgHeight = textHeight + (10 * scale);

        // Position label strictly outside the expanded box if possible (Top-Left)
        // If it goes off-canvas (y < 0), put it just inside or below the top edge
        let labelY = drawY - labelBgHeight;
        if (labelY < 0) {
            labelY = drawY + (lineWidth * scale); // Push inside if it goes off the top edge
        }

        // Draw background corresponding to text size
        ctx.fillStyle = color;
        ctx.fillRect(drawX, labelY, labelBgWidth, labelBgHeight);

        // Draw the text itself (White text on Red background for high contrast)
        ctx.fillStyle = '#FFFFFF';
        ctx.textBaseline = 'top';
        ctx.fillText(labelText, drawX + (5 * scale), labelY + (5 * scale));
    }

    // 6. Output the final marked-up image as a Base64 string
    return canvas.toDataURL('image/png', 0.9);
}
