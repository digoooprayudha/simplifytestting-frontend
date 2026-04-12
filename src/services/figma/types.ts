export interface BoundingBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface FigmaNode {
    id: string;
    name: string;
    type: string;
    absoluteBoundingBox?: BoundingBox;
    children?: FigmaNode[];
    componentProperties?: Record<string, any>;
    characters?: string; // For text nodes
    layoutGrids?: any[];
    reactions?: any[]; // Interactions/prototyping
    styles?: Record<string, string>;
    isAsset?: boolean;
}

export interface FigmaDocument {
    id: string;
    name: string;
    type: string;
    children: FigmaNode[];
}

export interface FigmaFileResponse {
    name: string;
    lastModified: string;
    thumbnailUrl: string;
    version: string;
    role: string;
    editorType: string;
    linkAccess: string;
    document: FigmaDocument;
    components: Record<string, any>;
    componentSets: Record<string, any>;
    schemaVersion: number;
    styles: Record<string, any>;
}

export interface FigmaImageResponse {
    err: string | null;
    images: Record<string, string>;
}
