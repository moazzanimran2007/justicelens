import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Clock, User, AlertCircle, ExternalLink, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";
import InnocenceScoreCard from "./InnocenceScoreCard";

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
    results?: any;
  };
  onClick: () => void;
}

export const CaseCard = ({ caseItem, onClick }: CaseCardProps) => {
  const navigate = useNavigate();
  
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

  const handleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/case/${caseItem.id}`);
  };

  const summary = caseItem.results?.legalMemo?.short_summary;
  const convicted = caseItem.results?.legalMemo?.convicted_of;
  const sentence = caseItem.results?.legalMemo?.sentence;

  return (
    <HoverCard openDelay={300}>
      <HoverCardTrigger asChild>
        <Card
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
      </HoverCardTrigger>
      
      <HoverCardContent className="w-96" side="right" align="start">
        <div className="space-y-4">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1">
              <h4 className="text-sm font-semibold">
                {caseItem.client_name || caseItem.file_name}
              </h4>
              {caseItem.case_number && (
                <p className="text-xs text-muted-foreground">{caseItem.case_number}</p>
              )}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExpand}
              className="gap-2"
            >
              <ExternalLink className="w-3 h-3" />
              Expand
            </Button>
          </div>

          {summary ? (
            <div className="space-y-3">
              {/* Innocence Score */}
              {caseItem.results && (
                <div className="p-3 bg-muted/50 rounded-lg border">
                  <InnocenceScoreCard 
                    analysis={caseItem.results} 
                    legalMemo={caseItem.results.legalMemo}
                    compact={true}
                  />
                </div>
              )}
              
              {convicted && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Convicted Of</label>
                  <p className="text-sm mt-1">{convicted}</p>
                </div>
              )}
              
              {sentence && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Sentence</label>
                  <p className="text-sm mt-1">{sentence}</p>
                </div>
              )}
              
              <div>
                <label className="text-xs font-medium text-muted-foreground">Summary</label>
                <p className="text-sm mt-1 line-clamp-4">{summary}</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
              <FileText className="w-4 h-4" />
              <span>
                {caseItem.status === "completed" 
                  ? "No analysis results available" 
                  : "Analysis in progress..."}
              </span>
            </div>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDistanceToNow(new Date(caseItem.created_at), { addSuffix: true })}</span>
            </div>
            <Badge variant={getPriorityColor(caseItem.priority)} className="text-xs">
              {caseItem.priority}
            </Badge>
          </div>
        </div>
      </HoverCardContent>
    </HoverCard>
  );
};
