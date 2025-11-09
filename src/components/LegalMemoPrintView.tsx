import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

interface LegalMemoPrintViewProps {
  memoData: any;
  disabled?: boolean;
}

export const LegalMemoPrintView = ({ memoData, disabled }: LegalMemoPrintViewProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  const handlePrint = async () => {
    try {
      setIsGenerating(true);
      toast.loading("Generating professional PDF format...");

      // Call the edge function to format the memo using AI
      const { data, error } = await supabase.functions.invoke('format-legal-memo', {
        body: { memoData }
      });

      if (error) {
        console.error('Edge function error:', error);
        // Extract the actual error message from the edge function response
        const errorMessage = error.message || JSON.stringify(error);
        
        // Check if it's a credits/payment error
        if (errorMessage.includes('payment_required') || errorMessage.includes('Not enough credits')) {
          throw new Error('AI credits exhausted. Please add credits to your Lovable workspace in Settings → Workspace → Usage to continue generating PDFs.');
        }
        
        throw new Error(errorMessage);
      }

      const { formattedContent } = data;

      // Open print window with formatted content
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Please allow pop-ups to export PDF");
        return;
      }
      
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
              ${formattedContent}
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
      
      toast.dismiss();
      toast.success("Print dialog opened - Ready to save as PDF");
    } catch (error) {
      console.error('Error printing:', error);
      toast.dismiss();
      toast.error(error instanceof Error ? error.message : "Failed to generate PDF");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={handlePrint}
      disabled={disabled || isGenerating}
    >
      {isGenerating ? (
        <>
          <Loader2 className="w-4 h-4 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <Download className="w-4 h-4" />
          Export PDF
        </>
      )}
    </Button>
  );
};
