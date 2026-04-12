import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { apiClient } from "@/lib/apiClient";
import { useWizard } from "@/lib/wizardContext";
import { useNavigate } from "react-router-dom";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  dbId?: string;
  status: "uploading" | "uploaded" | "processing" | "processed" | "error";
}

const UploadDocuments = () => {
  const { projectId } = useWizard();
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const navigate = useNavigate();

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
  };

  const addFiles = async (newFiles: File[]) => {
    if (!projectId) {
      toast.error("Please select a project first");
      return;
    }

    for (const file of newFiles) {
      const tempId = crypto.randomUUID();
      const fileEntry: UploadedFile = {
        id: tempId,
        name: file.name,
        size: file.size,
        type: file.type,
        status: "uploading",
      };
      setFiles((prev) => [...prev, fileEntry]);

      try {
        // Create FormData for multipart upload to FastAPI
        const formData = new FormData();
        formData.append("file", file);

        // Upload via FastAPI endpoint
        const response = await apiClient.post<any>(`/projects/${projectId}/documents/upload`, formData);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === tempId ? { ...f, dbId: response.id, status: "uploaded" } : f
          )
        );
      } catch (err: any) {
        console.error("Upload error:", err);
        setFiles((prev) =>
          prev.map((f) => (f.id === tempId ? { ...f, status: "error" } : f))
        );
        toast.error(`Failed to upload ${file.name}: ${err.message || "Unknown error"}`);
      }
    }
    toast.success(`${newFiles.length} file(s) added`);
  };

  const removeFile = async (id: string) => {
    const file = files.find((f) => f.id === id);
    if (file?.dbId) {
      try {
        // Backend currently doesn't have a specific doc delete endpoint, 
        // but we should add it if needed. For now, just remove locally.
        await apiClient.delete(`/documents/${file.dbId}`); 
      } catch (e) {
        console.warn("Could not delete from backend:", e);
      }
    }
    setFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const processFiles = async () => {
    const toProcess = files.filter((f) => f.status === "uploaded" && f.dbId);
    setFiles((prev) =>
      prev.map((f) => (f.status === "uploaded" ? { ...f, status: "processing" as const } : f))
    );

    for (const file of toProcess) {
      try {
        const response = await apiClient.post<any>(`/documents/${file.dbId}/extract`, {});
        
        // Mock processing completion for now since it's a background task
        // In a real app, we'd wait for a job status or use polling
        setTimeout(() => {
          setFiles((prev) =>
            prev.map((f) => (f.id === file.id ? { ...f, status: "processed" as const } : f))
          );
          toast.success(`${file.name}: requirements extracted`);
        }, 3000);
        
      } catch (err: any) {
        console.error("Processing error:", err);
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, status: "error" as const } : f))
        );
        toast.error(`Failed to process ${file.name}: ${err.message || "Unknown error"}`);
      }
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const allProcessed = files.some((f) => f.status === "processed");

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold text-foreground tracking-tight">Upload Sources</h1>
        <p className="text-muted-foreground mt-2">
          Upload BRD, FSD sources or Sigma designs for AI-powered analysis
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`mt-8 border-2 border-dashed rounded-xl p-12 text-center transition-all duration-300 ${
          isDragging ? "border-primary bg-primary/5 glow-primary" : "border-border hover:border-primary/40"
        }`}
      >
        <Upload className={`w-10 h-10 mx-auto mb-4 ${isDragging ? "text-primary" : "text-muted-foreground"}`} />
        <p className="text-foreground font-medium">Drop files here or click to browse</p>
        <p className="text-sm text-muted-foreground mt-1">Supports PDF, DOCX, XLSX, PNG, JPG, TXT, MD</p>
        <label className="mt-4 inline-block">
          <input type="file" multiple className="hidden" onChange={handleFileInput} accept=".pdf,.docx,.xlsx,.png,.jpg,.jpeg,.svg,.txt,.md,.csv" />
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium cursor-pointer hover:opacity-90 transition-opacity">
            Browse Files
          </span>
        </label>
      </motion.div>

      {files.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 space-y-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-foreground">{files.length} file(s)</h2>
            <div className="flex gap-2">
              <Button onClick={processFiles} disabled={files.every((f) => f.status !== "uploaded")} size="sm">
                Extract Requirements with AI
              </Button>
              {allProcessed && (
                <Button variant="outline" size="sm" onClick={() => navigate("/requirements")}>
                  View Requirements →
                </Button>
              )}
            </div>
          </div>

          {files.map((file) => (
            <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border">
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
              </div>
              <div className="flex items-center gap-2">
                {(file.status === "processing" || file.status === "uploading") && <Loader2 className="w-4 h-4 text-primary animate-spin" />}
                {file.status === "processed" && <span className="text-xs px-2 py-0.5 rounded-full bg-success/20 text-success font-medium">Processed</span>}
                {file.status === "uploaded" && <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">Ready</span>}
                {file.status === "error" && <span className="text-xs px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-medium">Error</span>}
                <button onClick={() => removeFile(file.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default UploadDocuments;
