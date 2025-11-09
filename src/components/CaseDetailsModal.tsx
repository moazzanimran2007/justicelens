import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommentsSection } from "./CommentsSection";
import { ActivityTimeline } from "./ActivityTimeline";
import { AssignmentSelector } from "./AssignmentSelector";
import { PrioritySelector } from "./PrioritySelector";
import { StageSelector } from "./StageSelector";
import AnalysisResults from "./AnalysisResults";
import { X, FileText, Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [lawmaticsMatterId, setLawmaticsMatterId] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [currentStageName, setCurrentStageName] = useState<string>("");

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
      
      // Fetch stage name
      if (data.stage_id) {
        const { data: stageData } = await supabase
          .from("pipeline_stages")
          .select("name")
          .eq("id", data.stage_id)
          .single();
        
        if (stageData) {
          setCurrentStageName(stageData.name);
        }
      }
    }
    setLoading(false);
  };

  const handleUpdate = () => {
    fetchCaseDetails();
    onUpdate();
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from("analyses")
        .delete()
        .eq("id", caseId);

      if (error) throw error;

      toast({
        title: "Case deleted",
        description: "The case has been successfully deleted.",
      });

      setShowDeleteDialog(false);
      onClose();
      onUpdate();
    } catch (error) {
      console.error("Error deleting case:", error);
      toast({
        title: "Error",
        description: "Failed to delete case. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleTransferToLawmatics = async () => {
    if (!lawmaticsMatterId.trim()) {
      toast({
        title: "Matter ID required",
        description: "Please enter a Lawmatics Matter ID to continue.",
        variant: "destructive",
      });
      return;
    }

    setTransferring(true);
    try {
      const { data, error } = await supabase.functions.invoke('transfer-to-lawmatics', {
        body: {
          caseId: caseId,
          matterId: lawmaticsMatterId.trim(),
          caseData: {
            client_name: caseData.client_name,
            case_number: caseData.case_number,
            file_name: caseData.file_name,
            status: caseData.status,
            priority: caseData.priority,
            results: caseData.results,
          },
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Case transferred to Lawmatics successfully.",
      });

      setLawmaticsMatterId("");
    } catch (error: any) {
      console.error("Error transferring to Lawmatics:", error);
      toast({
        title: "Transfer failed",
        description: error.message || "Failed to transfer case to Lawmatics. Please try again.",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  if (loading || !caseData) {
    return null;
  }

  return (
    <>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowDeleteDialog(true)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </Button>
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

              {currentStageName.toLowerCase() === "advocacy ready" && (
                <div className="border-t pt-4 mt-6">
                  <h3 className="text-sm font-semibold mb-4">Transfer to Lawmatics</h3>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="lawmatics-matter-id">Lawmatics Matter ID</Label>
                      <Input
                        id="lawmatics-matter-id"
                        placeholder="Enter Matter ID"
                        value={lawmaticsMatterId}
                        onChange={(e) => setLawmaticsMatterId(e.target.value)}
                        disabled={transferring}
                      />
                      <p className="text-xs text-muted-foreground">
                        Enter the Lawmatics Matter ID to link this case for transfer
                      </p>
                    </div>
                    <Button
                      onClick={handleTransferToLawmatics}
                      disabled={!lawmaticsMatterId.trim() || transferring}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {transferring ? "Transferring..." : "Transfer to Lawmatics"}
                    </Button>
                  </div>
                </div>
              )}
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

    <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Case</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{caseData.client_name || caseData.file_name}"? 
            This action cannot be undone and will permanently remove the case and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </>
  );
};
