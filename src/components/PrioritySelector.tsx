import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { AlertCircle } from "lucide-react";

interface PrioritySelectorProps {
  caseId: string;
  currentPriority: string;
  onUpdate: () => void;
}

export const PrioritySelector = ({
  caseId,
  currentPriority,
  onUpdate,
}: PrioritySelectorProps) => {
  const { toast } = useToast();

  const handlePriorityChange = async (priority: string) => {
    const { error } = await supabase
      .from("analyses")
      .update({ priority })
      .eq("id", caseId);

    if (error) {
      toast({ title: "Error updating priority", variant: "destructive" });
      return;
    }

    toast({ title: "Priority updated" });
    onUpdate();
  };

  return (
    <Select value={currentPriority} onValueChange={handlePriorityChange}>
      <SelectTrigger className="w-32">
        <AlertCircle className="w-4 h-4 mr-2" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="low">Low</SelectItem>
        <SelectItem value="medium">Medium</SelectItem>
        <SelectItem value="high">High</SelectItem>
        <SelectItem value="urgent">Urgent</SelectItem>
      </SelectContent>
    </Select>
  );
};
