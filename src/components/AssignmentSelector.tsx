import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { User } from "lucide-react";

interface AssignmentSelectorProps {
  caseId: string;
  currentAssignee: string | null;
  onUpdate: () => void;
}

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
}

export const AssignmentSelector = ({
  caseId,
  currentAssignee,
  onUpdate,
}: AssignmentSelectorProps) => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(currentAssignee);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  useEffect(() => {
    setSelectedUser(currentAssignee);
  }, [currentAssignee]);

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("full_name");

    if (!error && data) {
      setTeamMembers(data);
    }
  };

  const handleAssign = async (userId: string | null) => {
    const { error } = await supabase
      .from("analyses")
      .update({ assigned_to: userId })
      .eq("id", caseId);

    if (error) {
      toast({ title: "Error assigning case", variant: "destructive" });
      return;
    }

    setSelectedUser(userId);
    toast({ title: userId ? "Case assigned" : "Case unassigned" });
    onUpdate();
  };

  return (
    <Select value={selectedUser || "unassigned"} onValueChange={(value) => handleAssign(value === "unassigned" ? null : value)}>
      <SelectTrigger className="w-40">
        <User className="w-4 h-4 mr-2" />
        <SelectValue placeholder="Unassigned" />
      </SelectTrigger>
      <SelectContent className="bg-popover z-50">
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {teamMembers.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.full_name || member.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
