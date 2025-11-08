import { useCallback } from "react";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranscriptUploadProps {
  onFileSelect: (file: File) => void;
}

const TranscriptUpload = ({ onFileSelect }: TranscriptUploadProps) => {
  const { toast } = useToast();

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      
      if (!file) return;

      if (file.type !== "application/pdf" && !file.name.endsWith(".txt")) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or TXT file",
          variant: "destructive",
        });
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 20MB",
          variant: "destructive",
        });
        return;
      }

      onFileSelect(file);
      toast({
        title: "File uploaded",
        description: `${file.name} is ready for analysis`,
      });
    },
    [onFileSelect, toast]
  );

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== "application/pdf" && !file.name.endsWith(".txt")) {
      toast({
        title: "Invalid file type",
        description: "Please upload a PDF or TXT file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please upload a file smaller than 20MB",
        variant: "destructive",
      });
      return;
    }

    onFileSelect(file);
    toast({
      title: "File uploaded",
      description: `${file.name} is ready for analysis`,
    });
  };

  return (
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
        onChange={handleFileInput}
      />
      <label htmlFor="file-upload" className="cursor-pointer">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="text-lg font-semibold text-foreground mb-2">
              Upload Hearing Transcript
            </p>
            <p className="text-sm text-muted-foreground mb-1">
              Drag and drop your file here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground">
              Supports PDF and TXT files up to 20MB
            </p>
          </div>
        </div>
      </label>
    </div>
  );
};

export default TranscriptUpload;
