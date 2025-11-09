import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface LegalMemoPrintViewProps {
  memoContent: React.ReactNode;
  disabled?: boolean;
}

export const LegalMemoPrintView = ({ memoContent, disabled }: LegalMemoPrintViewProps) => {
  const handlePrint = () => {
    try {
      toast.info("Opening print dialog...");
      window.print();
    } catch (error) {
      console.error('Error printing:', error);
      toast.error("Failed to open print dialog");
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handlePrint}
      disabled={disabled}
    >
      <Download className="w-4 h-4" />
      Export PDF
    </Button>
  );
};
