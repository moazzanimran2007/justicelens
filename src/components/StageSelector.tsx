import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface StageSelectorProps {
  caseId: string;
  currentStageId: string;
  onUpdate: () => void;
}

interface Stage {
  id: string;
  name: string;
  color: string;
}

export const StageSelector = ({
  caseId,
  currentStageId,
  onUpdate,
}: StageSelectorProps) => {
  const { toast } = useToast();
  const [stages, setStages] = useState<Stage[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>(currentStageId);

  useEffect(() => {
    fetchStages();
  }, []);

  useEffect(() => {
    setSelectedStage(currentStageId);
  }, [currentStageId]);

  const fetchStages = async () => {
    const { data, error } = await supabase
      .from("pipeline_stages")
      .select("id, name, color")
      .order("display_order");

    if (!error && data) {
      setStages(data);
    }
  };

  const currentStageIndex = stages.findIndex(s => s.id === selectedStage);
  const canMovePrevious = currentStageIndex > 0;
  const canMoveNext = currentStageIndex < stages.length - 1;

  const handleStageChange = async (direction: 'previous' | 'next') => {
    const newIndex = direction === 'previous' ? currentStageIndex - 1 : currentStageIndex + 1;
    if (newIndex < 0 || newIndex >= stages.length) return;

    const oldStage = stages[currentStageIndex];
    const newStage = stages[newIndex];

    const { error } = await supabase
      .from("analyses")
      .update({ stage_id: newStage.id })
      .eq("id", caseId);

    if (error) {
      toast({ title: "Error updating stage", variant: "destructive" });
      return;
    }

    setSelectedStage(newStage.id);
    toast({ 
      title: "Stage updated", 
      description: `Moved from ${oldStage?.name} to ${newStage?.name}`
    });
    onUpdate();
  };

  const currentStage = stages[currentStageIndex];

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleStageChange('previous')}
        disabled={!canMovePrevious}
      >
        <ChevronLeft className="w-4 h-4 mr-1" />
        Previous Stage
      </Button>
      {currentStage && (
        <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-muted">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: currentStage.color }}
          />
          <span className="text-sm font-medium">{currentStage.name}</span>
        </div>
      )}
      <Button
        variant="outline"
        size="sm"
        onClick={() => handleStageChange('next')}
        disabled={!canMoveNext}
      >
        Next Stage
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
};
