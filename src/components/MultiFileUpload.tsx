import { useCallback } from "react";
import { Upload, X, CheckCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface MultiFileUploadProps {
  files: File[];
  onFilesSelect: (files: File[]) => void;
  uploadProgress?: Record<string, number>;
}

const MultiFileUpload = ({ files, onFilesSelect, uploadProgress = {} }: MultiFileUploadProps) => {
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    // Accept .txt and .pdf files
    const lower = file.name.toLowerCase();
    const isTxt = lower.endsWith(".txt");
    const isPdf = lower.endsWith(".pdf");
    if (!isTxt && !isPdf) {
      toast({
        title: "Unsupported file type",
        description: `${file.name}: Please upload .txt or .pdf files`,
        variant: "destructive",
      });
      return false;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: `${file.name}: Please upload files smaller than 20MB`,
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFiles = Array.from(e.dataTransfer.files);
      const validFiles = droppedFiles.filter(validateFile);
      
      if (validFiles.length > 0) {
        onFilesSelect([...files, ...validFiles]);
        toast({
          title: "Files added",
          description: `${validFiles.length} file(s) ready for analysis`,
        });
      }
    },
    [files, onFilesSelect, toast]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    
    const selectedFiles = Array.from(e.target.files);
    const validFiles = selectedFiles.filter(validateFile);
    
    if (validFiles.length > 0) {
      onFilesSelect([...files, ...validFiles]);
      toast({
        title: "Files added",
        description: `${validFiles.length} file(s) ready for analysis`,
      });
    }
  };

  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesSelect(newFiles);
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        className="border-2 border-dashed border-border rounded-lg p-12 text-center hover:border-primary transition-colors cursor-pointer bg-muted/30"
      >
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".txt,.pdf"
          multiple
          onChange={handleFileInput}
        />
        <label htmlFor="file-upload" className="cursor-pointer">
          <div className="flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground mb-2">
                Upload Hearing Transcripts
              </p>
              <p className="text-sm text-muted-foreground mb-1">
                Drag and drop your files here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports TXT and PDF up to 20MB
              </p>
            </div>
          </div>
        </label>
      </div>

      {files.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground">
            Selected files ({files.length}):
          </p>
          {files.map((file, index) => {
            const progress = uploadProgress[file.name];
            const isUploading = progress !== undefined && progress < 100;
            const isComplete = progress === 100;

            return (
              <div
                key={index}
                className="p-3 bg-muted rounded-lg space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-foreground text-sm truncate">{file.name}</p>
                      {isComplete && (
                        <CheckCircle2 className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB
                    </p>
                  </div>
                  {!isUploading && !isComplete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFile(index)}
                      className="h-8 w-8 p-0 flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
                {isUploading && (
                  <div className="space-y-1">
                    <Progress value={progress} className="h-2" />
                    <p className="text-xs text-muted-foreground text-right">
                      {progress}%
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MultiFileUpload;
