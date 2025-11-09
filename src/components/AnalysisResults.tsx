import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, Brain, FileText, BarChart3, Download, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AnalysisResultsProps {
  analysis: any;
  onNewAnalysis: () => void;
}

const AnalysisResults = ({ analysis, onNewAnalysis }: AnalysisResultsProps) => {
  const getSeverityColor = (severity: string) => {
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
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export Report
        </Button>
      </div>

      {/* Innocence Claims */}
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
              {analysis.innocenceClaims.examples.map((claim: string, idx: number) => (
                <div key={idx} className="p-4 bg-muted rounded-lg border-l-4 border-primary">
                  <p className="text-sm text-foreground italic">"{claim}"</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Bias Indicators */}
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
              {analysis.biasIndicators.categories.map((category: any, idx: number) => (
                <div key={idx} className="space-y-2">
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Summary & Key Facts */}
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

      {/* Language Analysis */}
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
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold text-primary mb-1">
                  {analysis.languageAnalysis.insight.frequency}
                </p>
                <p className="text-sm text-muted-foreground mb-2">"Insight" mentions</p>
                <Badge variant="secondary">{analysis.languageAnalysis.insight.context} usage</Badge>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold text-accent mb-1">
                  {analysis.languageAnalysis.remorse.frequency}
                </p>
                <p className="text-sm text-muted-foreground mb-2">"Remorse" mentions</p>
                <Badge variant="secondary">{analysis.languageAnalysis.remorse.context} usage</Badge>
              </div>
              <div className="p-4 bg-muted rounded-lg text-center">
                <p className="text-2xl font-bold text-success mb-1">
                  {analysis.languageAnalysis.accountability.frequency}
                </p>
                <p className="text-sm text-muted-foreground mb-2">"Accountability" mentions</p>
                <Badge variant="secondary">{analysis.languageAnalysis.accountability.context} usage</Badge>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalysisResults;
