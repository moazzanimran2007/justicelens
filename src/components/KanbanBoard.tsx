import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CaseCard } from "./CaseCard";
import { useToast } from "@/hooks/use-toast";
import { calculateInnocenceScore } from "@/lib/innocence-score";

interface PipelineStage {
  id: string;
  name: string;
  display_order: number;
  color: string;
}

interface Case {
  id: string;
  file_name: string;
  client_name: string | null;
  case_number: string | null;
  priority: string;
  stage_id: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  status: string;
  results?: any;
  assignee?: {
    full_name: string | null;
    nickname: string | null;
  };
}

interface KanbanBoardProps {
  sortBy?: string;
  selectionMode?: boolean;
  selectedCases?: Set<string>;
  onCaseSelect?: (caseId: string, selected: boolean) => void;
}

export const KanbanBoard = ({ 
  sortBy = "created_at",
  selectionMode = false,
  selectedCases = new Set(),
  onCaseSelect
}: KanbanBoardProps) => {
  const navigate = useNavigate();
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchStages();
    fetchCases();

    // Subscribe to real-time updates for analyses
    const channel = supabase
      .channel('analyses-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'analyses'
        },
        (payload) => {
          console.log('Analyses change detected:', payload);
          fetchCases(); // Refetch all cases when any change occurs
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStages = async () => {
    const { data, error } = await supabase
      .from("pipeline_stages")
      .select("*")
      .order("display_order");

    if (error) {
      toast({ title: "Error loading stages", variant: "destructive" });
      return;
    }
    setStages(data || []);
  };

  const fetchCases = async () => {
    const { data, error } = await supabase
      .from("analyses")
      .select(`
        *,
        assignee:profiles!analyses_assigned_to_fkey(full_name, nickname)
      `)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading cases", variant: "destructive" });
      return;
    }
    // Transform data to handle assignee as single object
    const transformedData = data?.map(item => ({
      ...item,
      assignee: Array.isArray(item.assignee) && item.assignee.length > 0 ? item.assignee[0] : null
    }));
    setCases(transformedData || []);
  };


  const getCasesForStage = (stageId: string) => {
    const filtered = cases.filter((c) => c.stage_id === stageId);
    
    // Sort based on selected criteria
    if (sortBy === "innocence_score") {
      return [...filtered].sort((a, b) => {
        const scoreA = calculateInnocenceScore({
          innocenceClaims: a.results?.innocenceClaims,
          biasIndicators: a.results?.biasIndicators,
          legalMemo: a.results?.legalMemo,
        });
        const scoreB = calculateInnocenceScore({
          innocenceClaims: b.results?.innocenceClaims,
          biasIndicators: b.results?.biasIndicators,
          legalMemo: b.results?.legalMemo,
        });
        return scoreB - scoreA; // Highest score first
      });
    } else if (sortBy === "priority") {
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      return [...filtered].sort((a, b) => {
        const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
        const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
        return priorityA - priorityB;
      });
    } else {
      // Default: newest first
      return [...filtered].sort((a, b) => 
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    }
  };

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
      {stages.map((stage) => (
        <div
          key={stage.id}
          className="flex-shrink-0 w-80"
        >
          <Card className="h-full bg-muted/30">
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: stage.color }}
                />
                <h3 className="font-semibold text-sm">{stage.name}</h3>
                <span className="ml-auto text-xs text-muted-foreground">
                  {getCasesForStage(stage.id).length}
                </span>
              </div>
            </div>
            <div className="p-3 space-y-3 max-h-[calc(100vh-16rem)] overflow-y-auto">
              {getCasesForStage(stage.id).map((caseItem) => (
                <CaseCard
                  key={caseItem.id}
                  caseItem={caseItem}
                  onClick={() => {
                    if (!selectionMode) {
                      navigate(`/case/${caseItem.id}`);
                    }
                  }}
                  selectionMode={selectionMode}
                  isSelected={selectedCases.has(caseItem.id)}
                  onSelect={(selected) => onCaseSelect?.(caseItem.id, selected)}
                />
              ))}
            </div>
          </Card>
        </div>
      ))}
    </div>
  );
};
