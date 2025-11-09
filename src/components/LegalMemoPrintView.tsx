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
        throw error;
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
      // Try to extract a meaningful error from the edge function (may be nested JSON strings)
      const getFriendlyMessage = (e: any) => {
        const raw = e?.message ?? e?.error ?? e;
        const tryParse = (s: any) => {
          try { return typeof s === 'string' ? JSON.parse(s) : s; } catch { return s; }
        };
        const parsed1 = tryParse(raw);
        const nested = parsed1?.error ? tryParse(parsed1.error) : undefined;
        const text = [nested?.message, parsed1?.message, typeof raw === 'string' ? raw : ''].filter(Boolean).join(' ');
        const lower = String(text).toLowerCase();
        if (lower.includes('payment_required') || lower.includes('not enough credits') || lower.includes('402')) {
          return 'AI credits exhausted. Please add credits in Settings → Workspace → Usage, then try again.';
        }
        if (lower.includes('too many requests') || lower.includes('rate limit') || lower.includes('429')) {
          return 'Rate limit reached. Please wait a minute and try again.';
        }
        return typeof raw === 'string' && raw ? raw : 'Failed to generate PDF';
      };

      toast.dismiss();
      toast.error(getFriendlyMessage(error));
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
