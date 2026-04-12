const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const statusDiv = document.getElementById('status') as HTMLDivElement;

exportBtn.onclick = () => {
    exportBtn.disabled = true;
    statusDiv.style.color = '#666';
    statusDiv.innerText = 'Extracting & rendering frames...';
    parent.postMessage({ pluginMessage: { type: 'export-data' } }, '*');
};

window.onmessage = (event: MessageEvent) => {
    const msg = event.data.pluginMessage;
    if (!msg) return;

    if (msg.type === 'export-complete') {
        statusDiv.innerText = `Compressing ${msg.count} screen(s) into ZIP...`;

        try {
            // Decode base64 back to binary, then create a data: URI for download
            // (Figma sandbox blocks URL.createObjectURL, but data: URIs work fine)
            const binaryStr = atob(msg.base64Zip);
            const bytes = new Uint8Array(binaryStr.length);
            for (let i = 0; i < binaryStr.length; i++) {
                bytes[i] = binaryStr.charCodeAt(i);
            }

            const blob = new Blob([bytes], { type: 'application/zip' });
            const dataUrl = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = dataUrl;
            a.download = `simplify-exports-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            // Revoke after short delay so browser has time to start the download
            setTimeout(() => URL.revokeObjectURL(dataUrl), 2000);

            statusDiv.innerText = `✅ ZIP downloaded with ${msg.count} screen(s)!`;
            exportBtn.disabled = false;
            setTimeout(() => { statusDiv.innerText = ''; }, 4000);

        } catch (e) {
            statusDiv.style.color = '#F24822';
            statusDiv.innerText = 'Zip decode failed: ' + (e as Error).message;
            exportBtn.disabled = false;
        }

    } else if (msg.type === 'error') {
        statusDiv.style.color = '#F24822';
        statusDiv.innerText = '❌ ' + msg.message;
        exportBtn.disabled = false;
    }
};
