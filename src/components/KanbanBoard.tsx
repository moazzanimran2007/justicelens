import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { CaseCard } from "./CaseCard";
import { CaseDetailsModal } from "./CaseDetailsModal";
import { useToast } from "@/hooks/use-toast";

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
}

export const KanbanBoard = () => {
  const [stages, setStages] = useState<PipelineStage[]>([]);
  const [cases, setCases] = useState<Case[]>([]);
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [draggedCase, setDraggedCase] = useState<Case | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchStages();
    fetchCases();
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
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error loading cases", variant: "destructive" });
      return;
    }
    setCases(data || []);
  };

  const handleDragStart = (e: React.DragEvent, caseItem: Case) => {
    setDraggedCase(caseItem);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (!draggedCase || draggedCase.stage_id === stageId) {
      setDraggedCase(null);
      return;
    }

    const { error } = await supabase
      .from("analyses")
      .update({ stage_id: stageId })
      .eq("id", draggedCase.id);

    if (error) {
      toast({ title: "Error updating case", variant: "destructive" });
      return;
    }

    setCases((prev) =>
      prev.map((c) => (c.id === draggedCase.id ? { ...c, stage_id: stageId } : c))
    );

    toast({ title: "Case moved successfully" });
    setDraggedCase(null);
  };

  const getCasesForStage = (stageId: string) => {
    return cases.filter((c) => c.stage_id === stageId);
  };

  return (
    <>
      <div className="flex gap-4 overflow-x-auto pb-4 min-h-[calc(100vh-12rem)]">
        {stages.map((stage) => (
          <div
            key={stage.id}
            className="flex-shrink-0 w-80"
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, stage.id)}
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
                    onDragStart={handleDragStart}
                    onClick={() => setSelectedCase(caseItem)}
                  />
                ))}
              </div>
            </Card>
          </div>
        ))}
      </div>

      {selectedCase && (
        <CaseDetailsModal
          caseId={selectedCase.id}
          isOpen={!!selectedCase}
          onClose={() => setSelectedCase(null)}
          onUpdate={fetchCases}
        />
      )}
    </>
  );
};
