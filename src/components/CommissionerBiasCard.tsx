import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CommissionerBiasCardProps {
  analysisId: string;
}

interface Commissioner {
  id: string;
  name: string;
  title: string;
  bias_score: number;
}

interface BiasStatement {
  id: string;
  bias_type: string;
  severity: string;
  quote: string;
  page_reference: string;
  context: string;
}

export const CommissionerBiasCard = ({ analysisId }: CommissionerBiasCardProps) => {
  const [commissioners, setCommissioners] = useState<Commissioner[]>([]);
  const [statements, setStatements] = useState<Record<string, BiasStatement[]>>({});
  const [loading, setLoading] = useState(true);
  const [expandedCommissioners, setExpandedCommissioners] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchCommissionersData();
  }, [analysisId]);

  const fetchCommissionersData = async () => {
    try {
      // Fetch bias statements for this analysis with commissioner info
      const { data: statementsData, error: statementsError } = await supabase
        .from('commissioner_bias_statements')
        .select(`
          *,
          commissioners (
            id,
            name,
            title,
            bias_score
          )
        `)
        .eq('analysis_id', analysisId);

      if (statementsError) throw statementsError;

      // Group statements by commissioner
      const commissionerMap = new Map<string, Commissioner>();
      const statementsByCommissioner: Record<string, BiasStatement[]> = {};

      statementsData?.forEach((statement: any) => {
        const commissioner = statement.commissioners;
        if (commissioner) {
          commissionerMap.set(commissioner.id, commissioner);
          
          if (!statementsByCommissioner[commissioner.id]) {
            statementsByCommissioner[commissioner.id] = [];
          }
          statementsByCommissioner[commissioner.id].push({
            id: statement.id,
            bias_type: statement.bias_type,
            severity: statement.severity,
            quote: statement.quote,
            page_reference: statement.page_reference,
            context: statement.context
          });
        }
      });

      setCommissioners(Array.from(commissionerMap.values()));
      setStatements(statementsByCommissioner);
    } catch (error) {
      console.error('Error fetching commissioners:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleExpanded = (commissionerId: string) => {
    setExpandedCommissioners(prev => {
      const newSet = new Set(prev);
      if (newSet.has(commissionerId)) {
        newSet.delete(commissionerId);
      } else {
        newSet.add(commissionerId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string): "default" | "destructive" | "warning" | "success" => {
    switch (severity) {
      case 'high': return 'destructive';
      case 'moderate': return 'warning';
      case 'low': return 'success';
      default: return 'default';
    }
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return 'text-destructive';
    if (score >= 50) return 'text-warning';
    if (score >= 20) return 'text-accent';
    return 'text-success';
  };

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return 'Severe';
    if (score >= 50) return 'High';
    if (score >= 20) return 'Moderate';
    return 'Low';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commissioner Bias Analysis</CardTitle>
          <CardDescription>Loading commissioner data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (commissioners.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Commissioner Bias Analysis</CardTitle>
          <CardDescription>No commissioners identified in bias statements</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          Commissioner Bias Analysis
        </CardTitle>
        <CardDescription>
          {commissioners.length} commissioner{commissioners.length !== 1 ? 's' : ''} identified with bias patterns
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {commissioners.map((commissioner) => {
          const commissionerStatements = statements[commissioner.id] || [];
          const isExpanded = expandedCommissioners.has(commissioner.id);

          return (
            <Card key={commissioner.id} className="bg-muted/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{commissioner.name}</CardTitle>
                    <CardDescription>{commissioner.title}</CardDescription>
                  </div>
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${getScoreColor(commissioner.bias_score)}`}>
                      {commissioner.bias_score}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {getScoreLabel(commissioner.bias_score)} Bias
                    </div>
                  </div>
                </div>
                <Progress 
                  value={commissioner.bias_score} 
                  className="h-2 mt-2"
                />
              </CardHeader>
              <CardContent>
                <div className="mb-3 text-sm text-muted-foreground">
                  {commissionerStatements.length} bias statement{commissionerStatements.length !== 1 ? 's' : ''} detected
                </div>
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(commissioner.id)}>
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="w-full justify-between">
                      <span>View bias statements</span>
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-3 space-y-3">
                    {commissionerStatements.map((statement) => (
                      <div key={statement.id} className="p-3 bg-background rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant={getSeverityColor(statement.severity)}>
                            {statement.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {statement.page_reference}
                          </span>
                        </div>
                        <div className="text-sm font-medium mb-1">{statement.bias_type}</div>
                        <p className="text-sm italic text-foreground mb-2">"{statement.quote}"</p>
                        {statement.context && (
                          <p className="text-xs text-muted-foreground">{statement.context}</p>
                        )}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
};
