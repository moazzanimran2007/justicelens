import { useCallback } from "react";
import { Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

interface MultiFileUploadProps {
  files: File[];
  onFilesSelect: (files: File[]) => void;
}

const MultiFileUpload = ({ files, onFilesSelect }: MultiFileUploadProps) => {
  const { toast } = useToast();

  const validateFile = (file: File): boolean => {
    if (file.type !== "application/pdf" && !file.name.endsWith(".txt")) {
      toast({
        title: "Invalid file type",
        description: `${file.name}: Please upload PDF or TXT files only`,
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
          accept=".pdf,.txt"
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
                Supports PDF and TXT files up to 20MB • Multiple files allowed
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
          {files.map((file, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 bg-muted rounded-lg"
            >
              <div>
                <p className="font-medium text-foreground text-sm">{file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => removeFile(index)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MultiFileUpload;
