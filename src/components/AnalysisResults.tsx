import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, FileText, Download, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface AnalysisResultsProps {
  analysis: any;
  onNewAnalysis: () => void;
}

const AnalysisResults = ({ analysis, onNewAnalysis }: AnalysisResultsProps) => {
  const [legalMemo, setLegalMemo] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const fetchLegalMemo = async () => {
      try {
        const { data, error } = await supabase
          .from('legal_memos')
          .select('*')
          .eq('analysis_id', analysis.id)
          .single();

        if (error) throw error;
        setLegalMemo(data);
      } catch (error) {
        console.error('Error fetching legal memo:', error);
        toast({
          title: "Error loading memo",
          description: "Failed to load the legal memo data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchLegalMemo();
  }, [analysis.id, toast]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading legal memo...</p>
        </div>
      </div>
    );
  }

  if (!legalMemo) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="p-6 max-w-md">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <p className="text-center text-muted-foreground">No legal memo data found</p>
          <Button onClick={onNewAnalysis} className="w-full mt-4">New Analysis</Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button 
          variant="ghost" 
          onClick={onNewAnalysis}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          New Analysis
        </Button>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Client Information */}
      <Card className="p-6 border-border shadow-md">
        <div className="flex items-start gap-4">
          <div className="p-2 rounded-lg bg-primary/10">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-foreground mb-4">Client Information</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {legalMemo.client_name && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Client Name</p>
                  <p className="text-sm font-semibold">{legalMemo.client_name}</p>
                </div>
              )}
              {legalMemo.cdcr_number && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">CDCR Number</p>
                  <p className="text-sm font-mono">{legalMemo.cdcr_number}</p>
                </div>
              )}
              {legalMemo.date_of_birth && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Date of Birth</p>
                  <p className="text-sm">{legalMemo.date_of_birth}</p>
                </div>
              )}
              {legalMemo.contact_information && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Contact</p>
                  <p className="text-sm">{legalMemo.contact_information}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Introduction */}
      <Card className="p-6 border-border shadow-md">
        <h3 className="text-xl font-bold mb-4">Introduction</h3>
        
        {legalMemo.short_summary && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Short Summary</h4>
            <p className="text-muted-foreground">{legalMemo.short_summary}</p>
          </div>
        )}
        
        {legalMemo.evidence_used_to_convict?.length > 0 && (
          <div className="mb-4">
            <h4 className="font-semibold mb-2">Evidence Used to Convict</h4>
            <ul className="list-decimal list-inside space-y-1">
              {legalMemo.evidence_used_to_convict.map((evidence: string, idx: number) => (
                <li key={idx} className="text-sm text-muted-foreground">{evidence}</li>
              ))}
            </ul>
          </div>
        )}
        
        {legalMemo.potential_theory_of_case && (
          <div>
            <h4 className="font-semibold mb-2">Potential Theory of the Case</h4>
            <p className="text-muted-foreground">{legalMemo.potential_theory_of_case}</p>
          </div>
        )}
      </Card>

      {/* Conviction & Sentence Summary */}
      <Card className="p-6 border-border shadow-md">
        <h3 className="text-xl font-bold mb-4">Conviction & Sentence Summary</h3>
        <div className="grid md:grid-cols-3 gap-4">
          {legalMemo.date_of_crime && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-1">Date of Crime</p>
              <p className="text-sm">{legalMemo.date_of_crime}</p>
            </div>
          )}
          {legalMemo.location_of_crime && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-1">Location</p>
              <p className="text-sm">{legalMemo.location_of_crime}</p>
            </div>
          )}
          {legalMemo.date_of_arrest && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-1">Date of Arrest</p>
              <p className="text-sm">{legalMemo.date_of_arrest}</p>
            </div>
          )}
          {legalMemo.date_of_conviction && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-1">Date of Conviction</p>
              <p className="text-sm">{legalMemo.date_of_conviction}</p>
            </div>
          )}
          {legalMemo.convicted_of && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-1">Convicted Of</p>
              <p className="text-sm">{legalMemo.convicted_of}</p>
            </div>
          )}
          {legalMemo.county_of_conviction && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-1">County</p>
              <p className="text-sm">{legalMemo.county_of_conviction}</p>
            </div>
          )}
          {legalMemo.sentence && (
            <div className="p-3 bg-muted rounded-lg col-span-full">
              <p className="text-xs text-muted-foreground uppercase mb-1">Sentence</p>
              <p className="text-sm">{legalMemo.sentence}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Court Information */}
      <Card className="p-6 border-border shadow-md">
        <h3 className="text-xl font-bold mb-4">Court Information</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {legalMemo.trial_court_case_no && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-1">Case Number</p>
              <p className="text-sm font-mono">{legalMemo.trial_court_case_no}</p>
            </div>
          )}
          {legalMemo.trial_attorney && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-1">Defense Attorney</p>
              <p className="text-sm">{legalMemo.trial_attorney}</p>
            </div>
          )}
          {legalMemo.prosecuting_attorney && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground uppercase mb-1">Prosecutor</p>
              <p className="text-sm">{legalMemo.prosecuting_attorney}</p>
            </div>
          )}
        </div>
      </Card>

      {/* Prosecution & Defense */}
      {(legalMemo.prosecution_presented || legalMemo.defense_presented) && (
        <Card className="p-6 border-border shadow-md">
          <h3 className="text-xl font-bold mb-4">Case Presentations</h3>
          {legalMemo.prosecution_presented && (
            <div className="mb-4">
              <h4 className="font-semibold mb-2">Prosecution Presented</h4>
              <p className="text-muted-foreground">{legalMemo.prosecution_presented}</p>
            </div>
          )}
          {legalMemo.defense_presented && (
            <div>
              <h4 className="font-semibold mb-2">Defense Presented</h4>
              <p className="text-muted-foreground">{legalMemo.defense_presented}</p>
            </div>
          )}
        </Card>
      )}

      {/* Wrongful Conviction Issues */}
      {legalMemo.wrongful_conviction_issues?.length > 0 && (
        <Card className="p-6 border-border shadow-md">
          <div className="flex items-start gap-4">
            <div className="p-2 rounded-lg bg-destructive/10">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-4">Wrongful Conviction Issues Identified</h3>
              <div className="grid md:grid-cols-2 gap-2">
                {legalMemo.wrongful_conviction_issues.map((issue: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="justify-start">
                    {issue}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Innocence Claims */}
      {legalMemo.innocence_claims && (
        <Card className="p-6 border-border shadow-md">
          <h3 className="text-xl font-bold mb-4">Innocence Claims</h3>
          <div className="mb-4">
            <p className="text-muted-foreground mb-2">
              {legalMemo.innocence_claims.detected 
                ? `Found ${legalMemo.innocence_claims.count} innocence claim(s)`
                : "No innocence claims detected"
              }
            </p>
            {legalMemo.innocence_claims.analysis && (
              <p className="text-sm text-muted-foreground mb-4">{legalMemo.innocence_claims.analysis}</p>
            )}
          </div>
          {legalMemo.innocence_claims.examples?.length > 0 && (
            <div className="space-y-2">
              {legalMemo.innocence_claims.examples.map((claim: string, idx: number) => (
                <div key={idx} className="p-4 bg-muted rounded-lg border-l-4 border-primary">
                  <p className="text-sm italic">"{claim}"</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default AnalysisResults;
