import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CommentsSection } from "./CommentsSection";
import { ActivityTimeline } from "./ActivityTimeline";
import { AssignmentSelector } from "./AssignmentSelector";
import { PrioritySelector } from "./PrioritySelector";
import { StageSelector } from "./StageSelector";
import AnalysisResults from "./AnalysisResults";
import { X, FileText } from "lucide-react";

interface CaseDetailsModalProps {
  caseId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const CaseDetailsModal = ({
  caseId,
  isOpen,
  onClose,
  onUpdate,
}: CaseDetailsModalProps) => {
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isOpen && caseId) {
      fetchCaseDetails();
    }
  }, [isOpen, caseId]);

  const fetchCaseDetails = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", caseId)
      .single();

    if (!error && data) {
      setCaseData(data);
    }
    setLoading(false);
  };

  const handleUpdate = () => {
    fetchCaseDetails();
    onUpdate();
  };

  if (loading || !caseData) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <DialogTitle className="text-xl mb-2">
                {caseData.client_name || caseData.file_name}
              </DialogTitle>
              {caseData.case_number && (
                <p className="text-sm text-muted-foreground">{caseData.case_number}</p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <StageSelector caseId={caseId} currentStageId={caseData.stage_id} onUpdate={handleUpdate} />
              <AssignmentSelector caseId={caseId} currentAssignee={caseData.assigned_to} onUpdate={handleUpdate} />
              <PrioritySelector caseId={caseId} currentPriority={caseData.priority} onUpdate={handleUpdate} />
            </div>
          </div>
        </DialogHeader>

        <Tabs defaultValue="details" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="analysis">Analysis</TabsTrigger>
            <TabsTrigger value="activity">Activity</TabsTrigger>
            <TabsTrigger value="comments">Comments</TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-y-auto">
            <TabsContent value="details" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">File Name</label>
                  <p className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                    <FileText className="w-4 h-4" />
                    {caseData.file_name}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Status</label>
                  <div className="mt-1">
                    <Badge variant={caseData.status === "completed" ? "default" : "secondary"}>
                      {caseData.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Created</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(caseData.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Last Updated</label>
                  <p className="text-sm text-muted-foreground mt-1">
                    {new Date(caseData.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="analysis" className="mt-4">
              {caseData.results ? (
                <AnalysisResults
                  analysis={caseData.results}
                  analysisId={caseId}
                  onNewAnalysis={onClose}
                />
              ) : (
                <p className="text-sm text-muted-foreground">No analysis results available</p>
              )}
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <ActivityTimeline caseId={caseId} />
            </TabsContent>

            <TabsContent value="comments" className="mt-4">
              <CommentsSection caseId={caseId} />
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
