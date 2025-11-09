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
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Please allow pop-ups to export PDF");
        return;
      }

      const memoElement = document.getElementById('legal-memo-content');
      if (!memoElement) {
        toast.error("Legal Memo content not found");
        return;
      }

      const content = memoElement.innerHTML;
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>Legal Memo - Fact Sheet</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              
              body {
                font-family: 'Times New Roman', Times, serif;
                line-height: 1.6;
                color: #000;
                padding: 40px 60px;
                max-width: 8.5in;
                margin: 0 auto;
              }
              
              h1, h2, h3, h4, h5, h6 {
                font-weight: bold;
                margin-top: 24px;
                margin-bottom: 12px;
                color: #000;
              }
              
              h1 {
                font-size: 24px;
                text-align: center;
                border-bottom: 2px solid #000;
                padding-bottom: 8px;
                margin-bottom: 20px;
              }
              
              h2 {
                font-size: 20px;
                border-bottom: 1px solid #333;
                padding-bottom: 6px;
              }
              
              h3 {
                font-size: 18px;
              }
              
              h4 {
                font-size: 16px;
              }
              
              p {
                margin-bottom: 12px;
                text-align: justify;
              }
              
              ul, ol {
                margin-left: 30px;
                margin-bottom: 12px;
              }
              
              li {
                margin-bottom: 6px;
              }
              
              strong {
                font-weight: bold;
              }
              
              em {
                font-style: italic;
              }
              
              .memo-header {
                text-align: center;
                margin-bottom: 30px;
              }
              
              .memo-section {
                margin-bottom: 20px;
              }
              
              @media print {
                body {
                  padding: 20px;
                }
                
                @page {
                  margin: 0.5in;
                  size: letter;
                }
              }
            </style>
          </head>
          <body>
            <div class="memo-header">
              <h1>LEGAL MEMORANDUM</h1>
              <p><strong>Fact Sheet & Analysis</strong></p>
              <p>${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            <div class="memo-content">
              ${content}
            </div>
          </body>
        </html>
      `);
      
      printWindow.document.close();
      
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 250);
      };
      
      toast.success("Print dialog opened");
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
