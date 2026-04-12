figma.showUI(__html__, { width: 320, height: 220, themeColors: true });

// ── Manual base64 encoder (btoa is NOT available in Figma's QuickJS sandbox) ──
function uint8ToBase64(bytes: Uint8Array): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    let result = '';
    const len = bytes.length;
    for (let i = 0; i < len; i += 3) {
        const b0 = bytes[i];
        const b1 = i + 1 < len ? bytes[i + 1] : 0;
        const b2 = i + 2 < len ? bytes[i + 2] : 0;
        result += chars[b0 >> 2];
        result += chars[((b0 & 3) << 4) | (b1 >> 4)];
        result += i + 1 < len ? chars[((b1 & 15) << 2) | (b2 >> 6)] : '=';
        result += i + 2 < len ? chars[b2 & 63] : '=';
    }
    return result;
}

// ─── Minimal ZIP Builder (no external deps, Figma sandbox safe) ──────────────
// Implements ZIP "store" method (no compression) – pure bytes, pure function.
// Manual UTF-8 encoder - Figma's QuickJS sandbox does NOT have TextEncoder
function strToBytes(str: string): Uint8Array {
    const bytes: number[] = [];
    for (let i = 0; i < str.length; i++) {
        let code = str.charCodeAt(i);
        if (code < 0x80) {
            bytes.push(code);
        } else if (code < 0x800) {
            bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f));
        } else {
            bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f));
        }
    }
    return new Uint8Array(bytes);
}

function buildZip(files: Record<string, Uint8Array>): Uint8Array {
    const enc = (s: string) => strToBytes(s);

    const u16 = (n: number, buf: Uint8Array, off: number) => {
        buf[off] = n & 0xff;
        buf[off + 1] = (n >> 8) & 0xff;
    };
    const u32 = (n: number, buf: Uint8Array, off: number) => {
        buf[off] = n & 0xff;
        buf[off + 1] = (n >> 8) & 0xff;
        buf[off + 2] = (n >> 16) & 0xff;
        buf[off + 3] = (n >> 24) & 0xff;
    };

    const crc32 = (data: Uint8Array): number => {
        let crc = 0xffffffff;
        const table = new Uint32Array(256);
        for (let i = 0; i < 256; i++) {
            let c = i;
            for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
            table[i] = c;
        }
        for (let i = 0; i < data.length; i++) crc = table[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
        return (crc ^ 0xffffffff) >>> 0;
    };

    const localHeaders: Uint8Array[] = [];
    const centralDirs: Uint8Array[] = [];
    let offset = 0;

    const fileEntries = Object.entries(files);

    for (const [name, data] of fileEntries) {
        const nameBytes = enc(name);
        const crc = crc32(data);
        const size = data.length;

        // Local file header (30 bytes + filename)
        const local = new Uint8Array(30 + nameBytes.length);
        local.set([0x50, 0x4b, 0x03, 0x04]); // Signature
        u16(20, local, 4);   // Version needed
        u16(0, local, 6);    // General purpose bit flag
        u16(0, local, 8);    // Compression method: 0 = store
        u16(0, local, 10);   // Mod time
        u16(0, local, 12);   // Mod date
        u32(crc, local, 14); // CRC-32
        u32(size, local, 18); // Compressed size
        u32(size, local, 22); // Uncompressed size
        u16(nameBytes.length, local, 26); // File name length
        u16(0, local, 28);   // Extra field length
        local.set(nameBytes, 30);

        localHeaders.push(local);
        localHeaders.push(data);

        // Central directory entry (46 bytes + filename)
        const cd = new Uint8Array(46 + nameBytes.length);
        cd.set([0x50, 0x4b, 0x01, 0x02]); // Signature
        u16(20, cd, 4);    // Version made by
        u16(20, cd, 6);    // Version needed
        u16(0, cd, 8);     // Bit flag
        u16(0, cd, 10);    // Compression method
        u16(0, cd, 12);    // Mod time
        u16(0, cd, 14);    // Mod date
        u32(crc, cd, 16);  // CRC-32
        u32(size, cd, 20); // Compressed size
        u32(size, cd, 24); // Uncompressed size
        u16(nameBytes.length, cd, 28); // File name length
        u16(0, cd, 30);    // Extra field length
        u16(0, cd, 32);    // File comment length
        u16(0, cd, 34);    // Disk number start
        u16(0, cd, 36);    // Internal attributes
        u32(0, cd, 38);    // External attributes
        u32(offset, cd, 42); // Local header offset
        cd.set(nameBytes, 46);

        centralDirs.push(cd);
        offset += local.length + size;
    }

    // End of central directory record (22 bytes)
    const cdSize = centralDirs.reduce((sum, d) => sum + d.length, 0);
    const eocd = new Uint8Array(22);
    eocd.set([0x50, 0x4b, 0x05, 0x06]); // Signature
    u16(0, eocd, 4);    // Disk number
    u16(0, eocd, 6);    // Disk with CD start
    u16(fileEntries.length, eocd, 8);  // CD entries on disk
    u16(fileEntries.length, eocd, 10); // Total CD entries
    u32(cdSize, eocd, 12);   // CD size
    u32(offset, eocd, 16);   // CD offset
    u16(0, eocd, 20);        // Comment length

    // Concat everything
    const totalSize = localHeaders.reduce((s, b) => s + b.length, 0)
        + centralDirs.reduce((s, b) => s + b.length, 0)
        + eocd.length;
    const result = new Uint8Array(totalSize);
    let pos = 0;
    for (const b of [...localHeaders, ...centralDirs, eocd]) {
        result.set(b, pos);
        pos += b.length;
    }
    return result;
}
// ─────────────────────────────────────────────────────────────────────────────

figma.ui.onmessage = async (msg) => {
    if (msg.type !== 'export-data') return;

    const selections = figma.currentPage.selection;
    const targetNodes = selections.filter(n =>
        n.type === 'FRAME' || n.type === 'COMPONENT' ||
        n.type === 'INSTANCE' || n.type === 'SECTION'
    ) as Array<FrameNode | ComponentNode | InstanceNode | SectionNode>;

    if (targetNodes.length === 0) {
        figma.ui.postMessage({ type: 'error', message: 'Please select at least one Frame, Component, or Section.' });
        return;
    }

    try {
        const zipFiles: Record<string, Uint8Array> = {};

        for (let idx = 0; idx < targetNodes.length; idx++) {
            const targetNode = targetNodes[idx];

            figma.ui.postMessage({ type: 'export-progress', text: `Processing ${idx + 1}/${targetNodes.length}: "${targetNode.name}"...` });
            const extractedElements: any[] = [];

            const walk = (node: SceneNode) => {
                const isInteractable =
                    node.type === 'INSTANCE' || node.type === 'COMPONENT' || node.type === 'TEXT' ||
                    (node.type === 'FRAME' && /(btn|button|input|checkbox|toggle|link|tab|radio|dropdown|select)/i.test(node.name));

                if (isInteractable && 'absoluteBoundingBox' in node && node.absoluteBoundingBox) {
                    extractedElements.push({
                        id: node.id,
                        name: node.name,
                        type: node.type,
                        absoluteBoundingBox: node.absoluteBoundingBox,
                        characters: node.type === 'TEXT' ? node.characters : undefined,
                        reactions: 'reactions' in node ? node.reactions : undefined
                    });
                    if (/(btn|button|input|checkbox|radio)/i.test(node.name) || node.type === 'TEXT') return;
                }
                if ('children' in node) {
                    for (const child of node.children) walk(child);
                }
            };

            walk(targetNode);

            const imageBytes = await targetNode.exportAsync({
                format: 'PNG',
                constraint: { type: 'SCALE', value: 2 }
            });

            const rawName = targetNode.name || 'Untitled';
            const safeFileName = rawName.replace(/[^a-zA-Z0-9_-]/g, '_').toLowerCase();

            // Store the frame's own absolute position in Figma canvas space.
            // Child absoluteBoundingBox coords are global; we subtract this origin in canvas.ts.
            const frameBbox = ('absoluteBoundingBox' in targetNode) ? (targetNode as FrameNode).absoluteBoundingBox : null;
            const frameX = (frameBbox && frameBbox.x != null) ? frameBbox.x : 0;
            const frameY = (frameBbox && frameBbox.y != null) ? frameBbox.y : 0;

            const metadata = {
                frameName: rawName,
                width: targetNode.width,
                height: targetNode.height,
                frameX,
                frameY,
                extractedElements
            };
            const jsonBytes = strToBytes(JSON.stringify(metadata, null, 2));

            zipFiles[`${safeFileName}-metadata.json`] = jsonBytes;
            zipFiles[`${safeFileName}-grounding.png`] = imageBytes;
        }

        // Build ZIP in main thread (no external deps)
        const zippedBytes = buildZip(zipFiles);

        // Encode ZIP bytes to base64 using manual implementation
        // (btoa is NOT available in Figma's QuickJS plugin sandbox)
        const base64Zip = uint8ToBase64(zippedBytes);

        figma.ui.postMessage({ type: 'export-complete', base64Zip, count: targetNodes.length });

    } catch (err) {
        console.error(err);
        figma.ui.postMessage({ type: 'error', message: 'Export failed: ' + (err as Error).message });
    }
};
