import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Brain, FileText, BarChart3, Download, ArrowLeft, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import LegalMemoDisplay from "./LegalMemoDisplay";

interface AnalysisResultsProps {
  analysis: any;
  onNewAnalysis: () => void;
  analysisId?: string;
}

const BiasCategory = ({ category, getSeverityColor }: { category: any; getSeverityColor: (s: string) => "default" | "destructive" | "outline" | "secondary" | "success" | "warning" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const hasOccurrences = category.occurrences && category.occurrences.length > 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="font-medium text-foreground">{category.type}</span>
          <Badge variant={getSeverityColor(category.severity)}>
            {category.severity}
          </Badge>
        </div>
        <span className="text-sm text-muted-foreground">
          {category.count} occurrences
        </span>
      </div>
      <Progress 
        value={(category.count / 15) * 100} 
        className="h-2"
      />
      
      {hasOccurrences && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen} className="mt-2">
          <CollapsibleTrigger asChild>
            <Button 
              variant="ghost" 
              size="sm" 
              className="w-full justify-between text-xs hover:bg-muted"
            >
              <span>View occurrences with page locations</span>
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {category.occurrences.map((occurrence: any, occIdx: number) => (
              <div key={occIdx} className="p-3 bg-muted/50 rounded-lg border-l-4 border-accent text-sm">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className="font-semibold text-accent text-xs">{occurrence.page}</span>
                  {occurrence.context && (
                    <span className="text-xs text-muted-foreground italic">{occurrence.context}</span>
                  )}
                </div>
                <p className="text-foreground italic">"{occurrence.quote}"</p>
              </div>
            ))}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

const AnalysisResults = ({ analysis, onNewAnalysis, analysisId }: AnalysisResultsProps) => {
  const navigate = useNavigate();
  const [legalMemo, setLegalMemo] = useState<any>(null);
  const [loadingMemo, setLoadingMemo] = useState(false);

  useEffect(() => {
    const fetchLegalMemo = async () => {
      if (!analysisId) return;
      
      setLoadingMemo(true);
      try {
        const { data, error } = await supabase
          .from('legal_memos' as any)
          .select('*')
          .eq('analysis_id', analysisId)
          .maybeSingle();
        
        if (error) throw error;
        setLegalMemo(data);
      } catch (error) {
        console.error('Error fetching legal memo:', error);
      } finally {
        setLoadingMemo(false);
      }
    };

    fetchLegalMemo();
  }, [analysisId]);
  
  const getSeverityColor = (severity: string): "default" | "destructive" | "outline" | "secondary" | "success" | "warning" => {
    switch (severity) {
      case "high":
        return "destructive";
      case "moderate":
        return "warning";
      default:
        return "secondary";
    }
  };

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
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate("/guide")} className="gap-2">
            <BookOpen className="w-4 h-4" />
            Interpretation Guide
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Innocence Claims */}
      {analysis.innocenceClaims && (
        <Card className="p-6 border-border shadow-md">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertCircle className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Innocence Claims Detected
              </h3>
              <p className="text-muted-foreground mb-4">
                Found {analysis.innocenceClaims.count} explicit or implicit claims of innocence
              </p>
              <div className="space-y-3">
                {analysis.innocenceClaims.examples?.map((claim: string, idx: number) => (
                  <div key={idx} className="p-4 bg-muted rounded-lg border-l-4 border-primary">
                    <p className="text-sm text-foreground italic">"{claim}"</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Bias Indicators */}
      {analysis.biasIndicators && (
        <Card className="p-6 border-border shadow-md">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 rounded-lg bg-accent/10">
              <BarChart3 className="w-6 h-6 text-accent" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Bias & Fairness Indicators
              </h3>
              <p className="text-muted-foreground mb-4">
                Analysis of potentially problematic language patterns
              </p>
              <div className="space-y-4">
                {analysis.biasIndicators.categories?.map((category: any, idx: number) => (
                  <BiasCategory key={idx} category={category} getSeverityColor={getSeverityColor} />
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Legal Memo / Fact Sheet */}
      {legalMemo && <LegalMemoDisplay memo={legalMemo} />}
      
      {/* Legacy Summary Display (if no legal memo available) */}
      {!legalMemo && analysis.summary && (
        <Card className="p-6 border-border shadow-md">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 rounded-lg bg-success/10">
              <FileText className="w-6 h-6 text-success" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Advocate Fact Sheet
              </h3>
              <p className="text-muted-foreground mb-4">
                Key information extracted from the hearing
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Offense Context</p>
                  <p className="text-sm text-foreground">{analysis.summary.offenseContext}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Years Served</p>
                  <p className="text-sm text-foreground">{analysis.summary.yearsServed} years</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Programming</p>
                  <p className="text-sm text-foreground">{analysis.summary.programming}</p>
                </div>
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-xs text-muted-foreground uppercase mb-1">Parole Factors</p>
                  <p className="text-sm text-foreground">{analysis.summary.paroleFactors}</p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Language Analysis */}
      {analysis.languageAnalysis && (
        <Card className="p-6 border-border shadow-md">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 rounded-lg bg-warning/10">
              <Brain className="w-6 h-6 text-warning" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-foreground mb-2">
                Language Pattern Analysis
              </h3>
              <p className="text-muted-foreground mb-4">
                Frequency and context of key terms used by the board
              </p>
              <div className="grid md:grid-cols-3 gap-4">
                {analysis.languageAnalysis.insight && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-center mb-3">
                      <p className="text-2xl font-bold text-primary mb-1">
                        {analysis.languageAnalysis.insight.frequency}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">"Insight" mentions</p>
                      <Badge variant="secondary">{analysis.languageAnalysis.insight.context} usage</Badge>
                    </div>
                    {analysis.languageAnalysis.insight.examples && analysis.languageAnalysis.insight.examples.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {analysis.languageAnalysis.insight.examples.slice(0, 2).map((example: string, idx: number) => (
                          <p key={idx} className="text-xs text-muted-foreground italic border-l-2 border-primary pl-2">
                            "{example}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {analysis.languageAnalysis.remorse && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-center mb-3">
                      <p className="text-2xl font-bold text-accent mb-1">
                        {analysis.languageAnalysis.remorse.frequency}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">"Remorse" mentions</p>
                      <Badge variant="secondary">{analysis.languageAnalysis.remorse.context} usage</Badge>
                    </div>
                    {analysis.languageAnalysis.remorse.examples && analysis.languageAnalysis.remorse.examples.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {analysis.languageAnalysis.remorse.examples.slice(0, 2).map((example: string, idx: number) => (
                          <p key={idx} className="text-xs text-muted-foreground italic border-l-2 border-accent pl-2">
                            "{example}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {analysis.languageAnalysis.accountability && (
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-center mb-3">
                      <p className="text-2xl font-bold text-success mb-1">
                        {analysis.languageAnalysis.accountability.frequency}
                      </p>
                      <p className="text-sm text-muted-foreground mb-2">"Accountability" mentions</p>
                      <Badge variant="secondary">{analysis.languageAnalysis.accountability.context} usage</Badge>
                    </div>
                    {analysis.languageAnalysis.accountability.examples && analysis.languageAnalysis.accountability.examples.length > 0 && (
                      <div className="mt-3 space-y-2">
                        {analysis.languageAnalysis.accountability.examples.slice(0, 2).map((example: string, idx: number) => (
                          <p key={idx} className="text-xs text-muted-foreground italic border-l-2 border-success pl-2">
                            "{example}"
                          </p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default AnalysisResults;
