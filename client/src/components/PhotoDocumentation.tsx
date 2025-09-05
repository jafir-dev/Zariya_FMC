import { useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Camera, Upload, X, Image, Video, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface PhotoFile {
  file: File;
  preview: string;
  isBeforePhoto: boolean;
  id: string;
}

interface PhotoDocumentationProps {
  onFilesChange: (files: PhotoFile[]) => void;
  requestId?: string;
  mode?: 'creation' | 'documentation';
  className?: string;
}

export default function PhotoDocumentation({
  onFilesChange,
  requestId,
  mode = 'creation',
  className,
}: PhotoDocumentationProps) {
  const [files, setFiles] = useState<PhotoFile[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [activeTab, setActiveTab] = useState<'before' | 'after'>('before');

  const generateId = () => Math.random().toString(36).substr(2, 9);

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
    handleFiles(droppedFiles, activeTab === 'before');
  }, [activeTab]);

  const createFilePreview = (file: File): Promise<string> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      } else {
        resolve(''); // For video files, we could generate thumbnails later
      }
    });
  };

  const handleFiles = async (newFiles: File[], isBeforePhoto: boolean) => {
    const maxFileSize = 50 * 1024 * 1024; // 50MB
    const validFiles = newFiles.filter((file) => {
      if (file.size > maxFileSize) {
        alert(`File ${file.name} is too large. Maximum size is 50MB.`);
        return false;
      }
      if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
        alert(`File ${file.name} is not a valid image or video file.`);
        return false;
      }
      return true;
    });

    const photoFiles: PhotoFile[] = await Promise.all(
      validFiles.map(async (file) => ({
        file,
        preview: await createFilePreview(file),
        isBeforePhoto,
        id: generateId(),
      }))
    );

    const updatedFiles = [...files, ...photoFiles];
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const removeFile = (id: string) => {
    const updatedFiles = files.filter((f) => f.id !== id);
    setFiles(updatedFiles);
    onFilesChange(updatedFiles);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " bytes";
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1048576).toFixed(1) + " MB";
  };

  const beforePhotos = files.filter(f => f.isBeforePhoto);
  const afterPhotos = files.filter(f => !f.isBeforePhoto);

  const FileUploadArea = ({ isBeforePhoto }: { isBeforePhoto: boolean }) => (
    <div
      className={cn(
        "border-2 border-dashed rounded-lg p-6 text-center transition-colors cursor-pointer",
        dragActive ? "border-primary bg-primary/5" : "border-border hover:border-primary",
      )}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => document.getElementById(`file-upload-${isBeforePhoto ? 'before' : 'after'}`)?.click()}
    >
      <div className="flex flex-col items-center">
        <Camera className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
        <p className="text-muted-foreground">
          {isBeforePhoto ? 'Upload before photos/videos' : 'Upload after photos/videos'}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          Click to upload or drag and drop
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          PNG, JPG, MP4 up to 50MB each
        </p>
      </div>
      <input
        id={`file-upload-${isBeforePhoto ? 'before' : 'after'}`}
        type="file"
        multiple
        accept="image/*,video/*"
        onChange={(e) => e.target.files && handleFiles(Array.from(e.target.files), isBeforePhoto)}
        className="hidden"
      />
    </div>
  );

  const FilePreview = ({ photoFile }: { photoFile: PhotoFile }) => (
    <Card className="relative">
      <CardContent className="p-3">
        <div className="flex items-start justify-between mb-2">
          <Badge variant={photoFile.isBeforePhoto ? "secondary" : "default"}>
            {photoFile.isBeforePhoto ? 'Before' : 'After'}
          </Badge>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => removeFile(photoFile.id)}
            className="h-6 w-6 p-0"
          >
            <X size={12} />
          </Button>
        </div>
        
        {photoFile.file.type.startsWith('image/') ? (
          <div className="relative">
            <img
              src={photoFile.preview}
              alt={photoFile.file.name}
              className="w-full h-32 object-cover rounded"
            />
            <Image size={16} className="absolute top-2 right-2 text-white bg-black/50 rounded p-1" />
          </div>
        ) : (
          <div className="w-full h-32 bg-muted rounded flex items-center justify-center">
            <Video size={24} className="text-muted-foreground" />
          </div>
        )}
        
        <div className="mt-2">
          <p className="text-xs font-medium truncate">{photoFile.file.name}</p>
          <p className="text-xs text-muted-foreground">{formatFileSize(photoFile.file.size)}</p>
        </div>
      </CardContent>
    </Card>
  );

  if (mode === 'creation') {
    return (
      <div className={cn("space-y-4", className)}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera size={20} />
              Photo Documentation
            </CardTitle>
            <CardDescription>
              Upload photos or videos to document the issue. You can add more documentation after work is completed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <FileUploadArea isBeforePhoto={true} />
          </CardContent>
        </Card>

        {files.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {files.map((photoFile) => (
              <FilePreview key={photoFile.id} photoFile={photoFile} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera size={20} />
            Work Documentation
          </CardTitle>
          <CardDescription>
            Document your work with before and after photos/videos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'before' | 'after')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="before" className="flex items-center gap-2">
                <Camera size={16} />
                Before ({beforePhotos.length})
              </TabsTrigger>
              <TabsTrigger value="after" className="flex items-center gap-2">
                <Check size={16} />
                After ({afterPhotos.length})
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="before" className="space-y-4">
              <FileUploadArea isBeforePhoto={true} />
              {beforePhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {beforePhotos.map((photoFile) => (
                    <FilePreview key={photoFile.id} photoFile={photoFile} />
                  ))}
                </div>
              )}
            </TabsContent>
            
            <TabsContent value="after" className="space-y-4">
              <FileUploadArea isBeforePhoto={false} />
              {afterPhotos.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {afterPhotos.map((photoFile) => (
                    <FilePreview key={photoFile.id} photoFile={photoFile} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}