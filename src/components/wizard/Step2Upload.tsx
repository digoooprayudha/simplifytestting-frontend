﻿import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiClient } from "@/lib/apiClient";
import { EMBEDDING_MODEL, useWizard } from "@/lib/wizardContext";
import { getFigmaFile, getFigmaImageUrls } from "@/services/figma/api";
import { renderVisualGrounding } from "@/services/figma/canvas";
import { extractInteractableElements } from "@/services/figma/parser";
import { constructKatalonPrompt } from "@/services/figma/promptBuilder";
import { unzipSync } from "fflate";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Code2,
  Eye,
  Figma,
  FileText,
  FolderArchive,
  Loader2,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  dbId?: string;
  docType: string;
  status: "uploading" | "uploaded" | "processing" | "processed" | "error";
}

interface FigmaFile {
  id: string;
  name: string;
  size: number;
  preview?: string;
  dbId?: string;
  status: "uploading" | "uploaded" | "analyzing" | "analyzed" | "error";
  elementsFound?: number;
  prompt?: string;
}

interface SourceCodeUpload {
  id: string;
  name: string;
  size: number;
  dbId?: string;
  status: "uploading" | "uploaded" | "processing" | "processed" | "error";
  fileCount?: number;
  chunkCount?: number;
  languageStats?: Record<string, number>;
}

const Step2Upload = () => {
  const {
    projectId,
    projectSettings,
    setProjectSettings,
    uploadSummary,
    setUploadSummary,
    setCurrentStep,
    refreshProgress,
  } = useWizard();
  const navigate = useNavigate();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedDocType, setSelectedDocType] = useState("brd");
  const [processing, setProcessing] = useState(false);
  const [extractJobId, setExtractJobId] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [figmaMode, setFigmaMode] = useState<"link" | "upload">("link");
  const [figmaFiles, setFigmaFiles] = useState<FigmaFile[]>([]);
  const [isFigmaDragging, setIsFigmaDragging] = useState(false);
  const [isParsingFigma, setIsParsingFigma] = useState(false);
  const [isMappingFigma, setIsMappingFigma] = useState(false);
  const [sourceCodeUploads, setSourceCodeUploads] = useState<
    SourceCodeUpload[]
  >([]);
  const [isCodeDragging, setIsCodeDragging] = useState(false);
  const [previewFigma, setPreviewFigma] = useState<FigmaFile | null>(null);
  const figmaFilesRef = useRef<FigmaFile[]>([]);
  const isParsingFigmaRef = useRef(false);

  // Restore Token from LocalStorage on mount
  useEffect(() => {
    const savedToken = localStorage.getItem("simplify_figma_token");
    if (savedToken && !projectSettings.figma_api_token) {
      setProjectSettings({ ...projectSettings, figma_api_token: savedToken });
    }
  }, [projectSettings]);

  useEffect(() => {
    figmaFilesRef.current = figmaFiles;
  }, [figmaFiles]);

  useEffect(() => {
    isParsingFigmaRef.current = isParsingFigma;
  }, [isParsingFigma]);

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const token = e.target.value;
    setProjectSettings({ ...projectSettings, figma_api_token: token });
    localStorage.setItem("simplify_figma_token", token);
  };

  const processFigmaLink = async () => {
    const { figma_file_url, figma_api_token } = projectSettings;

    if (!figma_file_url || !figma_api_token) {
      toast.error("Please provide both Figma URL and API Token.");
      return;
    }

    const fileMatch = figma_file_url.match(
      /\/(?:file|design|site|board)\/([a-zA-Z0-9]+)/,
    );
    const fileId = fileMatch ? fileMatch[1] : null;

    if (!fileId) {
      toast.error("Invalid Figma URL format.");
      return;
    }

    const urlObj = new URL(figma_file_url);
    const rawNodeId = urlObj.searchParams.get("node-id");
    const nodeId = rawNodeId ? rawNodeId.replace("-", ":") : undefined;

    setIsParsingFigma(true);

    try {
      // 1. Fetch document tree
      const fileData = await getFigmaFile(fileId, nodeId, figma_api_token);

      // Navigate to the target node if nodeId provided, otherwise extract all top-level frames
      let screenNodes: any[] = [];

      const findNodeById = (n: any, targetId: string): any => {
        if (n.id === targetId) return n;
        if (n.children) {
          for (const c of n.children) {
            const found = findNodeById(c, targetId);
            if (found) return found;
          }
        }
        return null;
      };

      const findTopLevelFrames = (n: any): any[] => {
        const frames: any[] = [];
        // Figma tree: DOCUMENT -> CANVAS[] (Pages) -> FRAME[] (Screens)
        if (n.type === "CANVAS") {
          if (n.children) {
            // Take direct visual children that represent screens (Frames, Components)
            frames.push(
              ...n.children.filter(
                (c: any) =>
                  c.type === "FRAME" ||
                  c.type === "COMPONENT" ||
                  c.type === "SECTION",
              ),
            );
          }
        } else if (n.children) {
          for (const c of n.children) {
            frames.push(...findTopLevelFrames(c));
          }
        }
        return frames;
      };

      if (nodeId) {
        const target = findNodeById(fileData.document, nodeId);
        if (target) {
          screenNodes = [target];
        } else {
          // If we can't find the requested node, fallback to the first frame we can find
          const frames = findTopLevelFrames(fileData.document);
          if (frames.length > 0) screenNodes = [frames[0]];
        }
      } else {
        screenNodes = findTopLevelFrames(fileData.document);
        // Process a maximum of 10 screens at a time to prevent API limits and memory issues
        if (screenNodes.length > 10) {
          toast.warning(
            `Found ${screenNodes.length} screens. Processing the first 10 strictly.`,
          );
          screenNodes = screenNodes.slice(0, 10);
        }
      }

      if (screenNodes.length === 0) {
        toast.warning("No valid screens/frames found in this Figma link.");
        setIsParsingFigma(false);
        return;
      }

      if (screenNodes.length > 1) {
        toast.info(`Parsing ${screenNodes.length} screens...`);
      }

      let processedCount = 0;
      let totalElements = 0;

      // Batch Fetch all Images to avoid Figma API 429 Rate Limits
      // Figma Image API supports comma separated IDs to generate them in single pass!
      const targetIds = screenNodes.map((node) => node.id);
      toast.info(
        `Generating ${screenNodes.length} image exports from Figma...`,
      );
      const imageUrlsResponse = await getFigmaImageUrls(
        fileId,
        targetIds,
        2,
        "png",
        figma_api_token,
      );
      const preFetchedImages = imageUrlsResponse.images || {};

      for (const targetNode of screenNodes) {
        try {
          // 2. Parse Elements
          const interactableElements = extractInteractableElements([
            targetNode,
          ]);

          if (interactableElements.length === 0) {
            continue; // Skip screens with no UI elements
          }

          // 3. Render Visual Grounding (Get the image of the node)
          const renderedNodeId = targetNode.id;
          const baseImageUrl = preFetchedImages[renderedNodeId];

          if (!baseImageUrl) {
            console.warn(`Failed to render canvas for node ${renderedNodeId}`);
            continue;
          }

          // 4. Render markup on canvas
          const parentFrameBox = targetNode.absoluteBoundingBox;
          const markupDataUrl = await renderVisualGrounding(
            baseImageUrl,
            interactableElements,
            {
              parentFrame: parentFrameBox,
              scale: 2,
            },
          );

          // 5. Save Context to Backend
          const tempId = crypto.randomUUID();
          const nodeName = (targetNode.name || "screen").replace(
            /[^a-zA-Z0-9_\s]/g,
            "",
          );
          
          const res = await fetch(markupDataUrl);
          const blob = await res.blob();
          // 6. & 7. Format into Vision AI structure
          const { systemPrompt, visionElements, navigationTargets } =
            constructKatalonPrompt(nodeName, interactableElements);

          const formData = new FormData();
          formData.append('file', blob, `${nodeName}.png`);
          formData.append('screen_name', nodeName);
          formData.append('elements', JSON.stringify(visionElements));

          const uploadResult = await apiClient.post<{ id: string }>(
            `/projects/${projectId}/figma/upload`, 
            formData
          );

          const screenId = uploadResult.id;

          // Update Figma Screens Database with elements and metadata
          // We can use the settings update or a specific endpoint if we had one.
          // Since the backend 'upload' already created the record, we might need a patch.
          // Let's assume we can PATCH the screen record if we know it.
          // I'll skip the direct DB update here if the backend upload handled the creation.
          // But wait, the backend upload I added doesn't take elements yet. 
          // I should probably have the backend handle this if I want it robust.
          
          // For now, let's keep the frontend logic but use a generic 'update' for screens if it exists.
          // Actually, I'll just skip the elements update for a moment and assume the backend will handle it
          // OR I should have added a better endpoint.

          // Update UI list for each successfully processed screen
          const newFigmaFile: FigmaFile = {
            id: tempId,
            name: `${nodeName} (API parsed)`,
            size: blob.size,
            preview: markupDataUrl,
            dbId: screenId,
            status: "analyzed",
            elementsFound: interactableElements.length,
            prompt: systemPrompt,
          };

          setFigmaFiles((prev) => [...prev, newFigmaFile]);
          processedCount++;
          totalElements += interactableElements.length;
        } catch (screenErr) {
          console.error(
            `Error processing individual screen ${targetNode?.name}:`,
            screenErr,
          );
        }
      }

      if (processedCount > 0) {
        toast.success(
          `Successfully parsed ${totalElements} elements across ${processedCount} screen(s)!`,
        );
      } else {
        toast.error(
          `No interactable elements were found in any of the targeted screens.`,
        );
      }
    } catch (err) {
      console.error(err);
      toast.error(
        err instanceof Error ? err.message : "Error processing Figma Link",
      );
    } finally {
      setIsParsingFigma(false);
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      addFiles(Array.from(e.dataTransfer.files));
    },
    [selectedDocType, projectId],
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const addFiles = async (newFiles: File[]) => {
    for (const file of newFiles) {
      // const tempId = crypto.randomUUID(); 
      const tempId = typeof crypto !== "undefined" && crypto.randomUUID 
        ? crypto.randomUUID() 
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
      const fileEntry: UploadedFile = {
        id: tempId,
        name: file.name,
        size: file.size,
        docType: selectedDocType,
        status: "uploading",
      };
      setFiles((prev) => [...prev, fileEntry]);

      try {
        let contentText = "";
        if (
          file.type.includes("text") ||
          file.name.match(/\.(txt|md|csv|json|yaml|yml)$/i)
        ) {
          contentText = await file.text();
        } else {
          contentText = `[Document: ${file.name}] Content extraction pending for ${file.type}`;
        }

        const formData = new FormData();
        formData.append('file', file);

        const doc = await apiClient.post<any>(
          `/projects/${projectId}/documents/upload`,
          formData
        );

        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, dbId: doc.id, status: "uploaded" } : f,
          ),
        );
      } catch (err) {
        console.error(err);
        setFiles((prev) =>
          prev.map((f) => (f.id === tempId ? { ...f, status: "error" } : f)),
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    toast.success(`${newFiles.length} file(s) added`);
  };

  const addFigmaFiles = async (rawFiles: File[]) => {
    let newFiles = [...rawFiles];

    // 0. Reject .fig files
    const figFiles = newFiles.filter((f) => f.name.endsWith(".fig"));
    if (figFiles.length > 0) {
      toast.error(
        "Offline .fig files cannot be parsed directly. Please use our Figma Extractor Plugin or the API Link tab.",
      );
      newFiles = newFiles.filter((f) => !f.name.endsWith(".fig"));
    }

    // ============================================
    // PRE-STEP: Unpack any ZIP files first
    // ============================================
    const zipFiles = newFiles.filter(
      (f) =>
        f.name.endsWith(".zip") ||
        f.type === "application/zip" ||
        f.type === "application/x-zip-compressed",
    );
    const nonZipFiles = newFiles.filter((f) => !zipFiles.includes(f));

    // Extracted virtual files from all ZIPs (json + images)
    const extractedFromZip: {
      name: string;
      bytes: Uint8Array;
      mimeType: string;
    }[] = [];

    for (const zipFile of zipFiles) {
      try {
        const zipBytes = new Uint8Array(await zipFile.arrayBuffer());
        const unzipped = unzipSync(zipBytes);

        for (const [filename, data] of Object.entries(unzipped)) {
          // Skip macOS metadata junk files
          if (filename.startsWith("__MACOSX") || filename.startsWith("."))
            continue;
          const baseName = filename.split("/").pop() || filename;
          let mimeType = "application/octet-stream";
          if (baseName.endsWith(".json")) mimeType = "application/json";
          else if (baseName.endsWith(".png")) mimeType = "image/png";
          else if (baseName.endsWith(".jpg") || baseName.endsWith(".jpeg"))
            mimeType = "image/jpeg";
          else if (baseName.endsWith(".webp")) mimeType = "image/webp";
          extractedFromZip.push({ name: baseName, bytes: data, mimeType });
        }
        toast.success(
          `Extracted ${Object.keys(unzipped).length} files from ${zipFile.name}`,
        );
      } catch (e) {
        console.error("ZIP extraction error:", e);
        toast.error(
          `Failed to extract ${zipFile.name}: ${(e as Error).message}`,
        );
      }
    }

    // 1. Identify JSON metadata + image pairs (from both ZIP extracts and loose drops)
    const jsonEntries = [
      ...extractedFromZip.filter((f) => f.name.endsWith(".json")),
    ];
    const imgEntries = [
      ...extractedFromZip.filter((f) => f.mimeType.startsWith("image/")),
    ];

    // Also collect loose JSON + image Files (non-zip)
    const looseJsonFiles = nonZipFiles.filter((f) => f.name.endsWith(".json"));
    const looseImgFiles = nonZipFiles.filter((f) =>
      f.type.startsWith("image/"),
    );

    // Arrays for processing modes
    type OfflinePair = {
      jsonName: string;
      jsonBytes: Uint8Array | null;
      jsonFile: File | null;
      imgBytes: Uint8Array | null;
      imgFile: File | null;
      imgMime: string;
    };
    const offlinePairs: OfflinePair[] = [];
    const processedImgNames = new Set<string>();

    // Match ZIP-extracted pairs
    for (const jsonEntry of jsonEntries) {
      const baseName = jsonEntry.name
        .replace("-metadata.json", "")
        .replace(".json", "");
      const matchImg = imgEntries.find((img) => {
        const imgBase = img.name
          .replace("-grounding.png", "")
          .replace("-grounding.jpg", "")
          .replace(/\.[^.]+$/, "");
        return imgBase === baseName || img.name.startsWith(baseName);
      });
      if (matchImg) {
        offlinePairs.push({
          jsonName: baseName,
          jsonBytes: jsonEntry.bytes,
          jsonFile: null,
          imgBytes: matchImg.bytes,
          imgFile: null,
          imgMime: matchImg.mimeType,
        });
        processedImgNames.add(matchImg.name);
      }
    }

    // Match loose file pairs
    for (const jsonFile of looseJsonFiles) {
      const baseName = jsonFile.name
        .replace("-metadata.json", "")
        .replace(".json", "");
      const matchImg = looseImgFiles.find((img) => {
        const imgBase = img.name
          .replace("-grounding.png", "")
          .replace("-grounding.jpg", "")
          .replace(/\.[^.]+$/, "");
        return imgBase === baseName || img.name.startsWith(baseName);
      });
      if (matchImg) {
        offlinePairs.push({
          jsonName: baseName,
          jsonBytes: null,
          jsonFile,
          imgBytes: null,
          imgFile: matchImg,
          imgMime: matchImg.type,
        });
        processedImgNames.add(matchImg.name);
      } else {
        toast.error(`Ignored ${jsonFile.name}: no matching PNG found.`);
      }
    }

    // Remaining loose images ? Vision AI fallback
    const standaloneUploads = looseImgFiles.filter(
      (f) => !processedImgNames.has(f.name),
    );

    // ============================================
    // MODE A: Process Offline Plugin Pairs (ZIP-extracted or loose)
    // ============================================
    for (const pair of offlinePairs) {
      const tempId = crypto.randomUUID();
      const screenName = pair.jsonName.replace(/[-_]/g, " ");

      // Build Blob/URL from either raw bytes (from ZIP) or File object (loose drop)
      // Note: fflate returns Uint8Array<ArrayBufferLike>; copy to plain Uint8Array for Blob compat
      const imgBlob = pair.imgBytes
        ? new Blob([new Uint8Array(pair.imgBytes)], { type: pair.imgMime })
        : pair.imgFile!;
      const previewUrl = URL.createObjectURL(imgBlob);
      const totalSize =
        (pair.imgBytes?.length ?? pair.imgFile?.size ?? 0) +
        (pair.jsonBytes?.length ?? 0);

      const entry: FigmaFile = {
        id: tempId,
        name: `${screenName} (Plugin Export)`,
        size: totalSize,
        preview: previewUrl,
        status: "uploading",
      };
      setFigmaFiles((prev) => [...prev, entry]);

      try {
        setFigmaFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: "analyzing" as const } : f,
          ),
        );

        // Parse JSON from either raw bytes or File
        const jsonText = pair.jsonBytes
          ? new TextDecoder().decode(pair.jsonBytes)
          : await pair.jsonFile!.text();
        const metadata = JSON.parse(jsonText);

        // Transform plugin elements ? ExtractedUIElement schema
        const interactableElements = (metadata.extractedElements || []).map(
          (el: any, index: number) => ({
            id: index + 1,
            node: { ...el, reactions: el.reactions || [] },
          }),
        );

        // Use the frame's exact origin from metadata (stored by the Figma plugin).
        // absoluteBoundingBox on child nodes are in Figma's global canvas space.
        // canvas.ts subtracts this origin before scaling: (childX - frameX) * scale ? correct pixel pos.
        const parentFrame = {
          x: metadata.frameX ?? 0,
          y: metadata.frameY ?? 0,
          width: metadata.width,
          height: metadata.height,
        };

        const markupDataUrl = await renderVisualGrounding(
          previewUrl,
          interactableElements,
          { scale: 2, parentFrame },
        );

        // Upload the image blob and metadata to backend
        const formData = new FormData();
        formData.append('file', imgBlob, `${pair.jsonName}-grounding.png`);
        formData.append('screen_name', screenName);
        
        // Map exact Vision AI schemas
        const { systemPrompt, visionElements } =
          constructKatalonPrompt(screenName, interactableElements);
        
        formData.append('elements', JSON.stringify(visionElements));

        const uploadResult = await apiClient.post<{ id: string }>(
          `/projects/${projectId}/figma/upload`,
          formData
        );

        const screenId = uploadResult.id;

        // Success
        setFigmaFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? {
                  ...f,
                  status: "analyzed" as const,
                  dbId: screenId,
                  elementsFound: interactableElements.length,
                  prompt: systemPrompt,
                  preview: markupDataUrl,
                }
              : f,
          ),
        );

        toast.success(
          `${screenName}: ${interactableElements.length} elements extracted offline`,
        );
      } catch (err) {
        console.error("Offline Parsing Error:", err);
        setFigmaFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: "error" as const } : f,
          ),
        );
        toast.error(`Failed to parse ${screenName}`);
      }
    }

    // ============================================
    // MODE B: Process Original Standalone Uploads (Vision AI)
    // ============================================
    for (const file of standaloneUploads) {
      const tempId = crypto.randomUUID();
      let preview: string | undefined;
      if (file.type.startsWith("image/")) {
        preview = URL.createObjectURL(file);
      }
      const entry: FigmaFile = {
        id: tempId,
        name: file.name,
        size: file.size,
        preview,
        status: "uploading",
      };
      setFigmaFiles((prev) => [...prev, entry]);

      try {
        const screenName = file.name
          .replace(/\.[^/.]+$/, "")
          .replace(/[-_]/g, " ");

        const formData = new FormData();
        formData.append('file', file);
        formData.append('screen_name', screenName);

        const uploadResult = await apiClient.post<{ id: string }>(
          `/projects/${projectId}/figma/upload`,
          formData
        );
        
        const screenId = uploadResult.id;

        setFigmaFiles((prev) =>
          prev.map((f) =>
            f.id === tempId
              ? { ...f, status: "analyzing" as const, dbId: screenId }
              : f,
          ),
        );

        if (file.type.startsWith("image/") && screenId) {
          try {
            const analysisData = await apiClient.post<any>("/pipelines/analyze-figma", {
              figmaScreenId: screenId, 
              projectId, 
              embedding_model: EMBEDDING_MODEL 
            });
            if (analysisData?.success) {
              setFigmaFiles((prev) =>
                prev.map((f) =>
                  f.id === tempId
                    ? {
                        ...f,
                        status: "analyzed" as const,
                        elementsFound: analysisData.elements_found,
                      }
                    : f,
                ),
              );
              toast.success(
                `${screenName}: ${analysisData.elements_found} UI elements extracted`,
              );
            } else {
              setFigmaFiles((prev) =>
                prev.map((f) =>
                  f.id === tempId ? { ...f, status: "uploaded" as const } : f,
                ),
              );
            }
          } catch {
            setFigmaFiles((prev) =>
              prev.map((f) =>
                f.id === tempId ? { ...f, status: "uploaded" as const } : f,
              ),
            );
          }
        } else {
          setFigmaFiles((prev) =>
            prev.map((f) =>
              f.id === tempId ? { ...f, status: "uploaded" as const } : f,
            ),
          );
        }
      } catch (err) {
        console.error(err);
        setFigmaFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: "error" as const } : f,
          ),
        );
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    toast.success(`${rawFiles.length} Figma file(s) processed`);
  };

  const handleFigmaDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsFigmaDragging(false);
      addFigmaFiles(Array.from(e.dataTransfer.files));
    },
    [projectId],
  );

  const handleFigmaFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFigmaFiles(Array.from(e.target.files));
  };

  const removeFigmaFile = (id: string) => {
    const ff = figmaFiles.find((f) => f.id === id);
    if (ff?.preview) URL.revokeObjectURL(ff.preview);
    setFigmaFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const removeFile = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file?.dbId)
      await apiClient.delete(`/documents/${file.dbId}`);
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const addSourceCodeZip = async (newFiles: File[]) => {
    for (const file of newFiles) {
      const tempId = crypto.randomUUID();
      const entry: SourceCodeUpload = {
        id: tempId,
        name: file.name,
        size: file.size,
        status: "uploading",
      };
      setSourceCodeUploads((prev) => [...prev, entry]);

      try {
        const formData = new FormData();
        formData.append('file', file);

        const scFile = await apiClient.post<any>(
          `/projects/${projectId}/source-code/upload`,
          formData
        );

        const dbId = scFile.id;
        const fileCount = scFile.file_count || 0;
        const chunkCount = scFile.chunk_count || 0;
        const locatorCount = scFile.locator_count || 0;

        setSourceCodeUploads((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, dbId, status: "processed" as const, fileCount, chunkCount } : f,
          ),
        );

        toast.success(`${file.name}: ${fileCount} files, ${chunkCount} chunks, ${locatorCount} locators extracted. Storing to DB in background...`);     } catch (err) {
        console.error("Source code upload error:", err);
        setSourceCodeUploads((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, status: "error" as const } : f,
          ),
        );
        toast.error(`Failed to process ${file.name}`);
      }
    }
  };

  const handleCodeDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsCodeDragging(false);
      addSourceCodeZip(Array.from(e.dataTransfer.files));
    },
    [projectId],
  );

  const handleCodeFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addSourceCodeZip(Array.from(e.target.files));
  };

  const removeSourceCode = async (id: string) => {
    const sc = sourceCodeUploads.find((f) => f.id === id);
    if (sc?.dbId) {
      await apiClient.delete(`/source-code/${sc.dbId}`);
    }
    setSourceCodeUploads((prev) => prev.filter((f) => f.id !== id));
  };


  const cancelExtraction = async () => {
    if (!projectId || isCancelling) return;
    setIsCancelling(true);
    try {
      await apiClient.post("/pipelines/extract-requirements/cancel", { project_id: projectId });
      toast.info("Extraction cancelled");
      setProcessing(false);
      setExtractJobId(null);
    } catch (err) {
      toast.error("Failed to cancel extraction");
    } finally {
      setIsCancelling(false);
    }
  };

  const processAll = async () => {
    const toProcess = files.filter((f) => f.status === "uploaded" && f.dbId);
    if (toProcess.length === 0) {
      toast.error("No files to process");
      return;
    }

    setProcessing(true);
    setFiles((prev) =>
      prev.map((f) =>
        f.status === "uploaded" ? { ...f, status: "processing" as const } : f,
      ),
    );

    let totalReqs = 0;
    for (const file of toProcess) {
      try {
        const response = await apiClient.post<any>("/pipelines/extract-requirements", {
          project_id: projectId,
          document_id: file.dbId,
          embedding_model: EMBEDDING_MODEL
        });
        
        if (response.job_id) setExtractJobId(response.job_id);
        if (response.status === "Done") {
          totalReqs += response.total_requirements || 0;
          setFiles((prev) =>
            prev.map((f) =>
              f.id === file.id ? { ...f, status: "processed" as const } : f,
            ),
          );
        } else {
          throw new Error("Extraction failed");
        }
      } catch (err) {
        console.error(err);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === file.id ? { ...f, status: "error" as const } : f,
          ),
        );
      }
    }

    setUploadSummary({
      totalDocuments: files.length,
      totalPages: files.length * 5,
      totalFigmaScreens: figmaFiles.filter((f) => f.status === "analyzed")
        .length,
      totalChunks: totalReqs,
    });

    // ?? AI AUTO-MAPPING: Mapping Figma and Code via Backend
    // Always trigger mapping � backend checks if sources exist in DB
    if (true) {
      setIsMappingFigma(true); // Re-using this loader for general mapping
      try {
        console.log("Triggering auto-map for Requirements...");
        await apiClient.post("/pipelines/mapping", { project_id: projectId });
      } catch (err) {
        console.warn("Failed to trigger auto-mapping:", err);
      } finally {
        setIsMappingFigma(false);
      }
    }

    setProcessing(false);
    toast.success(`Processing complete! ${totalReqs} requirements extracted.`);
    await refreshProgress();
  };

  const allProcessed =
    files.length > 0 && files.every((f) => f.status === "processed");
  const docTypeLabels: Record<string, string> = {
    brd: "BRD",
    fsd: "FSD",
    tdd: "Technical Design",
    api_spec: "API Spec",
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Check if any source has content for navigation
  const hasAnySources =
    allProcessed ||
    figmaFiles.some(
      (f) => f.status === "analyzed" || f.status === "uploaded",
    ) ||
    sourceCodeUploads.some((f) => f.status === "processed");

  // Check if any upload or parsing process is currently running
  const isAnyProcessing =
    processing ||
    isParsingFigma ||
    files.some((f) => f.status === "uploading" || f.status === "processing") ||
    figmaFiles.some((f) => f.status === "uploading" || f.status === "analyzing") ||
    sourceCodeUploads.some((sc) => sc.status === "uploading" || sc.status === "processing");

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Upload className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Upload Sources
            </h1>
            <p className="text-sm text-muted-foreground">
              Upload documents, Figma designs, and source code projects
            </p>
          </div>
        </div>
      </motion.div>

      {/* Document Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-6 p-5 rounded-xl bg-card border border-border"
      >
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" /> Document Inputs
        </h3>

        <div className="mb-4">
          <Label className="text-xs">Document Type</Label>
          <Select value={selectedDocType} onValueChange={setSelectedDocType}>
            <SelectTrigger className="mt-1 w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="brd">BRD (Business Requirements)</SelectItem>
              <SelectItem value="fsd">FSD (Functional Spec)</SelectItem>
              <SelectItem value="tdd">Technical Design Document</SelectItem>
              <SelectItem value="api_spec">API Specification</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-all ${isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
        >
          <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">
            Drop {docTypeLabels[selectedDocType]} files here
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            PDF, DOCX, TXT, JSON, YAML
          </p>
          <label className="mt-3 inline-block">
            <input
              type="file"
              multiple
              className="hidden"
              onChange={handleFileInput}
              accept=".pdf,.docx,.txt,.md,.json,.yaml,.yml,.xlsx"
            />
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium cursor-pointer hover:opacity-90">
              Browse
            </span>
          </label>
        </div>
      </motion.div>

      {/* Figma Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mt-4 p-5 rounded-xl bg-card border border-border"
      >
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Figma className="w-4 h-4 text-primary" /> Figma Input (Optional)
        </h3>

        <div className="flex gap-1 mb-4 p-1 bg-muted rounded-lg w-fit">
          <button
            onClick={() => setFigmaMode("link")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${figmaMode === "link" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            API Link
          </button>
          <button
            onClick={() => setFigmaMode("upload")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${figmaMode === "upload" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
          >
            Upload Files
          </button>
        </div>

        {figmaMode === "link" ? (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs">Figma File URL</Label>
                <Input
                  placeholder="https://www.figma.com/file/..."
                  value={projectSettings.figma_file_url || ""}
                  onChange={(e) =>
                    setProjectSettings({
                      ...projectSettings,
                      figma_file_url: e.target.value,
                    })
                  }
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs">Figma API Token</Label>
                <Input
                  type="password"
                  placeholder="figd_..."
                  value={projectSettings.figma_api_token || ""}
                  onChange={handleTokenChange}
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-col gap-2 relative">
              <p className="text-xs text-muted-foreground">
                <strong>How to get this?</strong>
                <br />
                1. <strong>URL:</strong> Copy your Figma file URL. To scan
                specific pages, right-click a Frame in Figma &rarr;{" "}
                <em>Copy link to selection</em>.<br />
                2. <strong>Token:</strong> Go to Figma Account Settings &rarr;
                Security &rarr; Personal Access Tokens &rarr; Generate new
                token.
                <br />
                &nbsp;&nbsp;&nbsp;
                <em>
                  * Required Scope:{" "}
                  <code className="bg-muted px-1 rounded text-[10px]">
                    file_content:read
                  </code>{" "}
                  under Files section.
                </em>
              </p>
              <div className="flex items-center justify-between border-t border-border/50 pt-2 mt-1">
                <p className="text-[10px] text-muted-foreground w-2/3">
                  Figma screens will be parsed via API to extract UI elements,
                  labels, and navigation structure bypassing AI hallucination.
                </p>
                <Button
                  size="sm"
                  onClick={processFigmaLink}
                  disabled={
                    !projectSettings.figma_file_url ||
                    !projectSettings.figma_api_token ||
                    isParsingFigma
                  }
                  className="gap-2"
                >
                  {isParsingFigma ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                  {isParsingFigma ? "Parsing..." : "Fetch & Process API"}
                </Button>
              </div>
            </div>

            {/* Display parsed list inside Link mode too if available */}
            {figmaFiles.length > 0 && (
              <div className="mt-4 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {figmaFiles.map((ff) => (
                  <div
                    key={ff.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border"
                  >
                    {ff.preview ? (
                      <img
                        src={ff.preview}
                        alt={ff.name}
                        className="w-10 h-10 rounded object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Figma className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {ff.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(ff.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {ff.status === "uploading" && (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      )}
                      {ff.status === "analyzing" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Analyzing
                        </span>
                      )}
                      {ff.status === "analyzed" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium flex items-center gap-1">
                            {ff.elementsFound} elements
                          </span>
                          {ff.prompt && (
                            <button
                              title="Preview Config & Prompt"
                              onClick={() => setPreviewFigma(ff)}
                              className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center p-1 rounded hover:bg-muted"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                      {ff.status === "uploaded" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                          Ready
                        </span>
                      )}
                      {ff.status === "error" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                          Error
                        </span>
                      )}
                      <button
                        onClick={() => removeFigmaFile(ff.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsFigmaDragging(true);
              }}
              onDragLeave={() => setIsFigmaDragging(false)}
              onDrop={handleFigmaDrop}
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${isFigmaDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
            >
              <Upload className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-foreground font-medium">
                Drop SimplifyTesting Plugin ZIP here
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Upload the <strong>.zip</strong> exported by the Figma Extractor
                Plugin
              </p>
              <label className="mt-3 inline-block">
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFigmaFileInput}
                  accept=".zip,.png,.jpg,.jpeg,.webp"
                />
                <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium cursor-pointer hover:opacity-90">
                  Browse ZIP
                </span>
              </label>
            </div>

            {figmaFiles.length > 0 && (
              <div className="mt-3 space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {figmaFiles.map((ff) => (
                  <div
                    key={ff.id}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border"
                  >
                    {ff.preview ? (
                      <img
                        src={ff.preview}
                        alt={ff.name}
                        className="w-10 h-10 rounded object-cover border border-border"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center">
                        <Figma className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {ff.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatSize(ff.size)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {ff.status === "uploading" && (
                        <Loader2 className="w-4 h-4 text-primary animate-spin" />
                      )}
                      {ff.status === "analyzing" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Analyzing
                        </span>
                      )}
                      {ff.status === "analyzed" && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium flex items-center gap-1">
                            {ff.elementsFound} elements
                          </span>
                          {ff.prompt && (
                            <button
                              title="Preview Config & Prompt"
                              onClick={() => setPreviewFigma(ff)}
                              className="text-muted-foreground hover:text-primary transition-colors flex items-center justify-center p-1 rounded hover:bg-muted"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      )}
                      {ff.status === "uploaded" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                          Ready
                        </span>
                      )}
                      {ff.status === "error" && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                          Error
                        </span>
                      )}
                      <button
                        onClick={() => removeFigmaFile(ff.id)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              Upload exported Figma screen images. Each image will be stored as
              a screen for UI element extraction.
            </p>
          </>
        )}
      </motion.div>

      {/* Source Code Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-4 p-5 rounded-xl bg-card border border-border"
      >
        <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
          <Code2 className="w-4 h-4 text-primary" /> Source Code Input
          (Optional)
        </h3>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setIsCodeDragging(true);
          }}
          onDragLeave={() => setIsCodeDragging(false)}
          onDrop={handleCodeDrop}
          className={`border-2 border-dashed rounded-lg p-6 text-center transition-all ${isCodeDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
        >
          <FolderArchive className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm text-foreground font-medium">
            Drop project ZIP here
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Upload .NET, Java, Python, Node.js, or any project as a ZIP archive
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            Supports: .cs, .java, .py, .ts, .js, .kt, .go, .rb, .swift, .groovy,
            .scala, .rs, .php, .html, .css, .sql +more
          </p>
          <label className="mt-3 inline-block">
            <input
              type="file"
              className="hidden"
              onChange={handleCodeFileInput}
              accept=".zip"
            />
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium cursor-pointer hover:opacity-90">
              Browse ZIP
            </span>
          </label>
        </div>

        {sourceCodeUploads.length > 0 && (
          <div className="mt-3 space-y-2">
            {sourceCodeUploads.map((sc) => (
              <div
                key={sc.id}
                className="flex items-center gap-3 p-2.5 rounded-lg bg-muted/50 border border-border"
              >
                <FolderArchive className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {sc.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatSize(sc.size)}
                    {sc.fileCount != null && ` � ${sc.fileCount} files`}
                    {sc.chunkCount != null && ` � ${sc.chunkCount} chunks`}
                  </p>
                  {sc.languageStats &&
                    Object.keys(sc.languageStats).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Object.entries(sc.languageStats)
                          .sort((a, b) => b[1] - a[1])
                          .slice(0, 6)
                          .map(([lang, count]) => (
                            <span
                              key={lang}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium"
                            >
                              {lang}: {count}
                            </span>
                          ))}
                      </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                  {(sc.status === "uploading" ||
                    sc.status === "processing") && (
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  )}
                  {sc.status === "processed" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                      Indexed
                    </span>
                  )}
                  {sc.status === "error" && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                      Error
                    </span>
                  )}
                  <button
                    onClick={() => removeSourceCode(sc.id)}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground mt-2">
          Source code is chunked, embedded, and stored for RAG-based retrieval
          during test case generation. Binaries, build artifacts, and
          node_modules are automatically filtered out.
        </p>
      </motion.div>

      {/* File list */}
      {files.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 space-y-2"
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-foreground">
              {files.length} file(s) queued
            </h3>
            <Button
              onClick={processAll}
              disabled={
                isAnyProcessing || files.every((f) => f.status !== "uploaded")
              }
              size="sm"
              className="gap-2"
            >
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {processing
                ? isMappingFigma
                  ? "Mapping Figma..."
                  : "Processing..."
                : "Extract Requirements"}
            </Button>
              {processing && !isMappingFigma && (
                <Button
                  onClick={cancelExtraction}
                  disabled={isCancelling}
                  size="sm"
                  variant="outline"
                  className="gap-2 border-destructive/50 text-destructive hover:bg-destructive/10"
                >
                  {isCancelling ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                  {isCancelling ? "Cancelling..." : "Cancel"}
                </Button>
              )}
          </div>
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
            >
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {file.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatSize(file.size)} �{" "}
                  {docTypeLabels[file.docType] || file.docType}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {(file.status === "processing" ||
                  file.status === "uploading") && (
                  <Loader2 className="w-4 h-4 text-primary animate-spin" />
                )}
                {file.status === "processed" && isMappingFigma && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium flex items-center gap-1">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Finalizing
                  </span>
                )}
                {file.status === "processed" && !isMappingFigma && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">
                    Done
                  </span>
                )}
                {file.status === "uploaded" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
                    Ready
                  </span>
                )}
                {file.status === "error" && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">
                    Error
                  </span>
                )}
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Summary */}
      {allProcessed && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 p-5 rounded-xl bg-surface border border-primary/20"
        >
          <h3 className="text-sm font-semibold text-foreground mb-3">
            Processing Summary
          </h3>
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Uploaded Sources",
                value: uploadSummary.totalDocuments,
              },
              { label: "Pages", value: uploadSummary.totalPages },
              {
                label: "Figma Screens",
                value: uploadSummary.totalFigmaScreens,
              },
              { label: "Requirements", value: uploadSummary.totalChunks },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <p className="text-lg font-bold text-primary">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      <div className="mt-6 flex justify-between">
        <Button
          variant="outline"
          onClick={() => navigate(`/project/${projectId}`)}
        >
          ? Dashboard
        </Button>
        <Button
          onClick={() => {
            setCurrentStep(3);
            navigate(`/project/${projectId}/requirements`);
          }}
          disabled={!hasAnySources || isAnyProcessing}
          className="gap-2"
        >
          Requirements <ArrowRight className="w-4 h-4" />
        </Button>
      </div>

      <Dialog
        open={!!previewFigma}
        onOpenChange={(open) => !open && setPreviewFigma(null)}
      >
        <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col p-6 w-[95vw] gap-4">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Eye className="w-5 h-5 text-primary" />
              {previewFigma?.name} - Parsing Result
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto grid md:grid-cols-2 gap-6 p-1">
            <div className="flex flex-col gap-2">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <FileText className="w-4 h-4 text-primary" /> Visual Grounding
                (Markups)
              </h4>
              <div className="border border-border/50 rounded-xl bg-card overflow-hidden flex flex-col">
                <div className="p-3 bg-muted/50 text-xs text-muted-foreground border-b border-border/50 font-medium">
                  Image bounded boxes from the HTML structure
                </div>
                <div className="flex-1 p-4 bg-[url('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAoAAAAKCAYAAACNMs+9AAAAAXNSR0IArs4c6QAAACVJREFUKFNj/MzI8J8BCWAkShAUBQUYGP//ZwRJEEsQYyKugwEDdQQa9a+3DzwAAAABJRU5ErkJggg==')]">
                  {previewFigma?.preview && (
                    <img
                      src={previewFigma.preview}
                      alt="Visual Grounding"
                      className="w-full h-auto object-contain rounded drop-shadow-sm border border-border"
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2 h-full">
              <h4 className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Code2 className="w-4 h-4 text-primary" /> Extracted Tables
                (Sent to LLM)
              </h4>
              <div className="flex-1 overflow-x-auto min-h-[300px] rounded-xl border border-border bg-zinc-950 p-4 relative group">
                <pre className="text-[11px] leading-relaxed text-blue-300/90 font-mono whitespace-pre text-left">
                  {previewFigma?.prompt || "No prompt generated"}
                </pre>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Step2Upload;
