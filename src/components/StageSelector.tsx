import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useEffect, useState } from "react";
import { Layers } from "lucide-react";

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

  const handleStageChange = async (stageId: string) => {
    const oldStage = stages.find(s => s.id === selectedStage);
    const newStage = stages.find(s => s.id === stageId);

    const { error } = await supabase
      .from("analyses")
      .update({ stage_id: stageId })
      .eq("id", caseId);

    if (error) {
      toast({ title: "Error updating stage", variant: "destructive" });
      return;
    }

    setSelectedStage(stageId);
    toast({ 
      title: "Stage updated", 
      description: `Moved from ${oldStage?.name} to ${newStage?.name}`
    });
    onUpdate();
  };

  return (
    <Select value={selectedStage} onValueChange={handleStageChange}>
      <SelectTrigger className="w-48">
        <Layers className="w-4 h-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {stages.map((stage) => (
          <SelectItem key={stage.id} value={stage.id}>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: stage.color }}
              />
              {stage.name}
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
