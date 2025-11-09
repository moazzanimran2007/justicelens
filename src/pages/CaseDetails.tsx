import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
import { Card, CardContent } from "@/components/ui/card";
import { CommentsSection } from "@/components/CommentsSection";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { AssignmentSelector } from "@/components/AssignmentSelector";
import { PrioritySelector } from "@/components/PrioritySelector";
import { StageSelector } from "@/components/StageSelector";
import { NotificationBell } from "@/components/NotificationBell";
import AnalysisResults from "@/components/AnalysisResults";
import { ArrowLeft, FileText, Trash2, LogOut, Upload, LayoutDashboard, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CaseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (id) {
      fetchCaseDetails();
    }
  }, [id]);

  const checkAuth = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);
    }
  };

  const fetchCaseDetails = async () => {
    if (!id) return;
    
    setLoading(true);
    const { data, error } = await supabase
      .from("analyses")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setCaseData(data);
    } else if (error) {
      toast({
        title: "Error",
        description: "Failed to load case details.",
        variant: "destructive",
      });
      navigate("/");
    }
    setLoading(false);
  };

  const handleUpdate = () => {
    fetchCaseDetails();
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from("analyses")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast({
        title: "Case deleted",
        description: "The case has been successfully deleted.",
      });

      setShowDeleteDialog(false);
      navigate("/");
    } catch (error) {
      console.error("Error deleting case:", error);
      toast({
        title: "Error",
        description: "Failed to delete case. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!caseData) {
    return null;
  }

  return (
    <>
      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <h1 className="text-2xl font-bold">JusticeLens</h1>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => navigate("/new-case")}>
                    <Upload className="w-4 h-4 mr-2" />
                    New Case
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                    <LayoutDashboard className="w-4 h-4 mr-2" />
                    Pipeline
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => navigate("/team")}>
                    <Users className="w-4 h-4 mr-2" />
                    Team
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <span className="text-sm text-muted-foreground">{user?.email}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6">
          <div className="mb-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/")}
              className="mb-4"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Pipeline
            </Button>

            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h2 className="text-2xl font-bold mb-2">
                  {caseData.client_name || caseData.file_name}
                </h2>
                {caseData.case_number && (
                  <p className="text-sm text-muted-foreground">{caseData.case_number}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap mb-6">
              <StageSelector caseId={id!} currentStageId={caseData.stage_id} onUpdate={handleUpdate} />
              <AssignmentSelector caseId={id!} currentAssignee={caseData.assigned_to} onUpdate={handleUpdate} />
              <PrioritySelector caseId={id!} currentPriority={caseData.priority} onUpdate={handleUpdate} />
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

          <Tabs defaultValue="details" className="space-y-4">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardContent className="pt-6">
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
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analysis">
              <Card>
                <CardContent className="pt-6">
                  {caseData.results ? (
                    <AnalysisResults
                      analysis={caseData.results}
                      analysisId={id}
                      onNewAnalysis={() => navigate("/")}
                    />
                  ) : (
                    <p className="text-sm text-muted-foreground">No analysis results available</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="activity">
              <Card>
                <CardContent className="pt-6">
                  <ActivityTimeline caseId={id!} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="comments">
              <Card>
                <CardContent className="pt-6">
                  <CommentsSection caseId={id!} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>

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
}
