import { ExtractedUIElement } from './parser';
import { FigmaNode } from './types';

/**
 * Heuristics to determine realistic element Type based on Figma API Node
 */
function determineElementType(node: FigmaNode): string {
    const name = node.name.toLowerCase();
    if (name.includes('button') || name.includes('btn')) return 'Button';
    if (name.includes('input') || name.includes('field') || name.includes('textfield')) return 'Input';
    if (name.includes('check') || name.includes('chk')) return 'Checkbox';
    if (name.includes('radio')) return 'Radio';
    if (name.includes('link') || name.includes('lnk')) return 'Link';
    if (name.includes('dropdown') || name.includes('select')) return 'Dropdown';
    if (name.includes('tab')) return 'Tab';
    if (name.includes('toggle')) return 'Toggle';
    if (name.includes('search')) return 'Input';
    if (name.includes('icon')) return 'Icon';

    // Fallback based on Figma node type
    if (node.type === 'TEXT') return 'Text';
    if (node.type === 'INSTANCE' || node.type === 'COMPONENT') return 'Component';
    return 'Element';
}

/**
 * Extracts visible text content inside a node (e.g. Button label or Input placeholder)
 * We recursively search down exactly 1 or 2 levels to find any text fields.
 */
function extractTextContent(node: FigmaNode, depth: number = 0): string {
    if (node.characters) return node.characters.trim();
    if (node.name.toLowerCase().includes('placeholder')) return `Placeholder: "${node.name}"`;

    // Look at immediate children for text
    if (depth < 2 && node.children) {
        for (const child of node.children) {
            const childText = extractTextContent(child, depth + 1);
            if (childText !== '') return childText;
        }
    }
    return '';
}

/**
 * Extracts implied interactions based on Figma "Reactions" (Prototyping) or name heuristics.
 */
function extractActionFlow(node: FigmaNode, type: string): string {
    // 1. Check Figma prototype reactions first
    if (node.reactions && node.reactions.length > 0) {
        const clickAction = node.reactions.find((r: any) => r.trigger && r.trigger.type === 'ON_CLICK');
        if (clickAction && clickAction.action) {
            if (clickAction.action.destinationId) {
                return `Click → Screen ${clickAction.action.destinationId}`;
            }
            if (clickAction.action.type === 'BACK') return 'Click → Back';
            if (clickAction.action.type === 'URL') return `Click → ${clickAction.action.url || 'External URL'}`;
        }
        const hoverAction = node.reactions.find((r: any) => r.trigger && r.trigger.type === 'ON_HOVER');
        if (hoverAction) return 'Hover → Show State';
    }

    // 2. Name-based heuristics
    const name = node.name.toLowerCase();
    if (type === 'Button') {
        if (name.includes('login') || name.includes('masuk') || name.includes('signin')) return 'Click → Login/Auth';
        if (name.includes('register') || name.includes('daftar') || name.includes('signup')) return 'Click → Register';
        if (name.includes('submit') || name.includes('kirim') || name.includes('send')) return 'Click → Submit Form';
        if (name.includes('cancel') || name.includes('batal')) return 'Click → Cancel/Close';
        if (name.includes('back') || name.includes('kembali')) return 'Click → Go Back';
        if (name.includes('next') || name.includes('lanjut')) return 'Click → Next Step';
        if (name.includes('save') || name.includes('simpan')) return 'Click → Save';
        if (name.includes('delete') || name.includes('hapus')) return 'Click → Delete';
        return 'Click → Action';
    }
    if (type === 'Input') {
        if (name.includes('search') || name.includes('cari')) return 'Type Text → Search';
        if (name.includes('password') || name.includes('sandi')) return 'Type Secret → Authenticate';
        if (name.includes('email')) return 'Type Text → Set Email';
        if (name.includes('phone') || name.includes('telp')) return 'Type Text → Set Phone';
        return 'Type Text';
    }
    if (type === 'Checkbox') return 'Check / Uncheck';
    if (type === 'Radio') return 'Select Option';
    if (type === 'Toggle') return 'Toggle On/Off';
    if (type === 'Link') return 'Click → Navigate';
    if (type === 'Dropdown' || type === 'Select') return 'Select → Choose Option';
    if (type === 'Tab') return 'Click → Switch Tab';
    return '-';
}

/**
 * Generates a clean element ID from the Figma layer name (slug format).
 */
function generateElementId(node: FigmaNode, type: string): string {
    const typePrefix: Record<string, string> = {
        'Button': 'btn',
        'Input': 'input',
        'Checkbox': 'chk',
        'Radio': 'radio',
        'Link': 'lnk',
        'Dropdown': 'sel',
        'Tab': 'tab',
        'Toggle': 'tgl',
        'Text': 'txt',
        'Component': 'cmp',
        'Icon': 'ico',
        'Element': 'el',
    };
    const prefix = typePrefix[type] || 'el';
    const slug = node.name
        .replace(/[^a-zA-Z0-9\s]/g, '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '_')
        .slice(0, 20);
    return `${prefix}_${slug || node.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}`;
}

/**
 * Generates an XPath selector hint based on Element Type, Name, and Text Content.
 * Prioritizes standard HTML structure since Katalon runs on standard web DOMs.
 */
function generateXPathHint(node: FigmaNode, type: string, textContent: string): string {
    const name = node.name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const cleanText = textContent.replace(/['"]/g, '').replace(/^Placeholder:\s*/, '').trim();

    switch (type) {
        case 'Button':
            if (cleanText) return `//button[contains(text(),'${cleanText}')] | //button[@id='${name}']`;
            return `//button[@id='${name}'] | //*[@class='${name}']`;
        case 'Input':
            if (cleanText.startsWith('Placeholder')) return `//input[@placeholder='${cleanText.replace('Placeholder: ', '')}']`;
            return `//input[@name='${name}'] | //input[@id='${name}']`;
        case 'Checkbox':
            return `//input[@type='checkbox'][@id='${name}']`;
        case 'Radio':
            return `//input[@type='radio'][@id='${name}']`;
        case 'Link':
            if (cleanText) return `//a[contains(text(),'${cleanText}')]`;
            return `//a[@id='${name}']`;
        case 'Dropdown':
            return `//select[@id='${name}'] | //*[@role='listbox'][@id='${name}']`;
        case 'Tab':
            return `//*[@role='tab'][contains(text(),'${cleanText || name}')]`;
        case 'Toggle':
            return `//*[@role='switch'][@id='${name}']`;
        case 'Text':
            if (cleanText) return `//*[contains(text(),'${cleanText.slice(0, 30)}')]`;
            return `//*[@id='${name}']`;
        default:
            return `//*[@id='${name}'] | //*[@data-testid='${name}']`;
    }
}

export interface VisionAIElement {
    id: string;
    type: string;
    name: string;
    text_content: string;
    action_flow: string;
    locator_hint: string;
    state: string;
    validation_rules: string | null;
}

/**
 * Maps the raw Figma Extracted Array into the flat JSON structure standardized by Vision AI.
 */
export function mapToVisionAIElements(elements: ExtractedUIElement[]): VisionAIElement[] {
    return elements.map((el, index) => {
        const type = determineElementType(el.node);
        const textContent = extractTextContent(el.node) || el.node.name;
        const xpathHint = generateXPathHint(el.node, type, textContent);
        const elementId = generateElementId(el.node, type);
        const actionFlow = extractActionFlow(el.node, type);
        const cleanName = textContent.replace(/\n|\r/g, ' ').trim() || el.node.name;

        return {
            id: elementId,
            type,
            name: cleanName,
            text_content: textContent,
            action_flow: actionFlow,
            locator_hint: xpathHint,
            state: 'default',
            validation_rules: null
        };
    });
}

function extractNavigationTargets(elements: ExtractedUIElement[]): string[] {
    const targets: string[] = [];
    for (const el of elements) {
        if (el.node.reactions && el.node.reactions.length > 0) {
            const clickAction = el.node.reactions.find((r: any) => r.trigger && r.trigger.type === 'ON_CLICK');
            if (clickAction && clickAction.action && clickAction.action.destinationId) {
                targets.push(`Screen Node: ${clickAction.action.destinationId}`);
            }
        }
    }
    return [...new Set(targets)];
}

/**
 * Generates the unified Document Chunk string format for Katalon RAG,
 * with a structured Markdown table of all UI elements.
 */
export function constructKatalonPrompt(screenName: string, elements: ExtractedUIElement[]): {
    systemPrompt: string,
    visionElements: VisionAIElement[],
    navigationTargets: string[]
} {
    const visionElements = mapToVisionAIElements(elements);
    const navTargets = extractNavigationTargets(elements);

    // Build the Markdown element table
    const tableHeader = [
        '| ID | Element Name | Type | Text / Content | Action / Flow | Selector Hint (XPath) |',
        '| --- | --- | --- | --- | --- | --- |',
    ].join('\n');

    const tableRows = visionElements.map((el, index) =>
        `| ${index + 1} | \`${el.id}\` | ${el.type} | ${el.text_content ? `"${el.text_content.replace(/\n/g, ' ').slice(0, 60)}"` : '-'} | ${el.action_flow} | \`${el.locator_hint.split(' | ')[0]}\` |`
    ).join('\n');

    const navSection = navTargets.length > 0
        ? `\n\n**Navigation Targets:** ${navTargets.join(', ')}`
        : '';

    const systemPrompt = `# Screen: ${screenName}

**Purpose:** Page/Frame representing "${screenName}"
**Total Elements:** ${visionElements.length}

## UI Element Map

${tableHeader}
${tableRows}
${navSection}

## Notes
- Coordinates from Figma design at 2x export scale
- XPath hints based on Figma layer naming conventions
- Action/Flow derived from Figma prototype reactions and layer name heuristics`;

    return {
        systemPrompt,
        visionElements,
        navigationTargets: navTargets
    };
}
