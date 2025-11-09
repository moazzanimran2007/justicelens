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

  const fetchTeamMembers = async () => {
    // For now, we'll get users from user_roles table
    // In a production app, you'd want a proper profiles table
    const { data, error } = await supabase
      .from("user_roles")
      .select("user_id");

    if (!error && data) {
      // Get unique user IDs
      const userIds = [...new Set(data.map((r) => r.user_id))];
      
      // In production, you'd fetch user profiles here
      // For now, we'll just use the user IDs
      setTeamMembers(userIds.map(id => ({ id, email: id.substring(0, 8) })));
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
      <SelectContent>
        <SelectItem value="unassigned">Unassigned</SelectItem>
        {teamMembers.map((member) => (
          <SelectItem key={member.id} value={member.id}>
            {member.email}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
