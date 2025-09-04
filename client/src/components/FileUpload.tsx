import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Upload, X, File } from "lucide-react";
import { Button } from "@/components/ui/button";

interface FileUploadProps {
  onFilesChange: (files: File[]) => void;
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  className?: string;
}

export default function FileUpload({
  onFilesChange,
  maxFiles = 10,
  maxFileSize = 50 * 1024 * 1024, // 50MB
  acceptedTypes = ["image/*", "video/*"],
  className,
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    handleFiles(droppedFiles);
  }, []);

  const handleFiles = (newFiles: File[]) => {
    const validFiles = newFiles.filter((file) => {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is ${maxFileSize / 1024 / 1024}MB.`);
        return false;
      }
      return true;
    });

    const updatedFiles = [...files, ...validFiles].slice(0, maxFiles);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeFile = (index: number) => {
    const updatedFiles = files.filter((_, i) => i !== index);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  return (
    <div className={cn("space-y-4", className)}>
      <div
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
          dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary",
        )}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => document.getElementById("file-upload")?.click()}
        data-testid="file-upload-area"
      >
        <Upload className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">Click to upload or drag and drop</p>
        <p className="text-sm text-muted-foreground mt-1">
          PNG, JPG, MP4 up to {maxFileSize / 1024 / 1024}MB each
        </p>
        <input
          id="file-upload"
          type="file"
          multiple
          accept={acceptedTypes.join(",")}
          onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files))}
          className="hidden"
          data-testid="input-file-upload"
        />
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-foreground">Uploaded Files</h4>
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted rounded-md"
              data-testid={`file-item-${index}`}
            >
              <div className="flex items-center space-x-3">
                <File size={16} className="text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium text-foreground">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile(index);
                }}
                data-testid={`button-remove-file-${index}`}
              >
                <X size={16} />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
