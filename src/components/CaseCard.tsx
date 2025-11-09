import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Clock, User, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface CaseCardProps {
  caseItem: {
    id: string;
    file_name: string;
    client_name: string | null;
    case_number: string | null;
    priority: string;
    assigned_to: string | null;
    created_at: string;
    status: string;
  };
  onDragStart: (e: React.DragEvent, caseItem: any) => void;
  onClick: () => void;
}

export const CaseCard = ({ caseItem, onDragStart, onClick }: CaseCardProps) => {
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
    }
  };

  return (
    <Card
      draggable
      onDragStart={(e) => onDragStart(e, caseItem)}
      onClick={onClick}
      className="p-3 cursor-pointer hover:shadow-md transition-shadow bg-card"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-sm truncate">
              {caseItem.client_name || caseItem.file_name}
            </h4>
            {caseItem.case_number && (
              <p className="text-xs text-muted-foreground">{caseItem.case_number}</p>
            )}
          </div>
          {caseItem.priority !== "medium" && (
            <Badge variant={getPriorityColor(caseItem.priority)} className="text-xs">
              {caseItem.priority}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span>{formatDistanceToNow(new Date(caseItem.created_at), { addSuffix: true })}</span>
          </div>
          {caseItem.assigned_to && (
            <div className="flex items-center gap-1">
              <User className="w-3 h-3" />
              <span>Assigned</span>
            </div>
          )}
        </div>

        {caseItem.status === "error" && (
          <div className="flex items-center gap-1 text-xs text-destructive">
            <AlertCircle className="w-3 h-3" />
            <span>Processing error</span>
          </div>
        )}
      </div>
    </Card>
  );
};
