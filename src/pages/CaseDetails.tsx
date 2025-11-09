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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CommentsSection } from "@/components/CommentsSection";
import { AssignmentSelector } from "@/components/AssignmentSelector";
import { PrioritySelector } from "@/components/PrioritySelector";
import { StageSelector } from "@/components/StageSelector";
import { Header } from "@/components/Header";
import AnalysisResults from "@/components/AnalysisResults";
import { ArrowLeft, FileText, Trash2, ExternalLink, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CaseDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [caseData, setCaseData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [lawmaticsMatterId, setLawmaticsMatterId] = useState("");
  const [transferring, setTransferring] = useState(false);

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
          caseId: id,
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
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <Header user={user} />

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
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="comments">Comments</TabsTrigger>
            </TabsList>

            <TabsContent value="details">
              <Card>
                <CardContent className="pt-6">
                  <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Transcript File</label>
                          <Button
                            variant="link"
                            className="h-auto p-0 text-sm text-primary hover:underline flex items-center gap-2 mt-1"
                            onClick={async () => {
                              const { data } = await supabase.storage
                                .from('transcripts')
                                .createSignedUrl(caseData.file_path, 3600);
                              
                              if (data?.signedUrl) {
                                window.open(data.signedUrl, '_blank');
                              } else {
                                toast({
                                  title: "Error",
                                  description: "Failed to open PDF file",
                                  variant: "destructive",
                                });
                              }
                            }}
                          >
                            <FileText className="w-4 h-4" />
                            {caseData.file_name}
                            <ExternalLink className="w-3 h-3" />
                          </Button>
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
                    </div>

                    {/* Fact Sheet */}
                    {caseData.results?.legalMemo && (
                      <div className="border-t pt-6">
                        <h3 className="text-lg font-semibold mb-4">Fact Sheet</h3>
                        <div className="space-y-4">
                          {caseData.results.legalMemo.client_name && (
                            <div>
                              <label className="text-sm font-medium">Client Name</label>
                              <p className="text-sm mt-1">{caseData.results.legalMemo.client_name}</p>
                            </div>
                          )}
                          
                          {caseData.results.legalMemo.cdcr_number && (
                            <div>
                              <label className="text-sm font-medium">CDCR Number</label>
                              <p className="text-sm mt-1">{caseData.results.legalMemo.cdcr_number}</p>
                            </div>
                          )}
                          
                          {caseData.results.legalMemo.date_of_birth && (
                            <div>
                              <label className="text-sm font-medium">Date of Birth</label>
                              <p className="text-sm mt-1">{caseData.results.legalMemo.date_of_birth}</p>
                            </div>
                          )}

                          {caseData.results.legalMemo.short_summary && (
                            <div>
                              <label className="text-sm font-medium">Summary</label>
                              <p className="text-sm mt-1 whitespace-pre-wrap">{caseData.results.legalMemo.short_summary}</p>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-4">
                            {caseData.results.legalMemo.convicted_of && (
                              <div>
                                <label className="text-sm font-medium">Convicted Of</label>
                                <p className="text-sm mt-1">{caseData.results.legalMemo.convicted_of}</p>
                              </div>
                            )}
                            
                            {caseData.results.legalMemo.sentence && (
                              <div>
                                <label className="text-sm font-medium">Sentence</label>
                                <p className="text-sm mt-1">{caseData.results.legalMemo.sentence}</p>
                              </div>
                            )}
                            
                            {caseData.results.legalMemo.date_of_crime && (
                              <div>
                                <label className="text-sm font-medium">Date of Crime</label>
                                <p className="text-sm mt-1">{caseData.results.legalMemo.date_of_crime}</p>
                              </div>
                            )}
                            
                            {caseData.results.legalMemo.date_of_arrest && (
                              <div>
                                <label className="text-sm font-medium">Date of Arrest</label>
                                <p className="text-sm mt-1">{caseData.results.legalMemo.date_of_arrest}</p>
                              </div>
                            )}
                            
                            {caseData.results.legalMemo.date_of_conviction && (
                              <div>
                                <label className="text-sm font-medium">Date of Conviction</label>
                                <p className="text-sm mt-1">{caseData.results.legalMemo.date_of_conviction}</p>
                              </div>
                            )}
                            
                            {caseData.results.legalMemo.county_of_conviction && (
                              <div>
                                <label className="text-sm font-medium">County of Conviction</label>
                                <p className="text-sm mt-1">{caseData.results.legalMemo.county_of_conviction}</p>
                              </div>
                            )}
                            
                            {caseData.results.legalMemo.location_of_crime && (
                              <div>
                                <label className="text-sm font-medium">Location of Crime</label>
                                <p className="text-sm mt-1">{caseData.results.legalMemo.location_of_crime}</p>
                              </div>
                            )}
                            
                            {caseData.results.legalMemo.trial_court_case_no && (
                              <div>
                                <label className="text-sm font-medium">Trial Court Case No</label>
                                <p className="text-sm mt-1">{caseData.results.legalMemo.trial_court_case_no}</p>
                              </div>
                            )}
                          </div>

                          {caseData.results.legalMemo.trial_attorney && (
                            <div>
                              <label className="text-sm font-medium">Trial Attorney</label>
                              <p className="text-sm mt-1">{caseData.results.legalMemo.trial_attorney}</p>
                            </div>
                          )}
                          
                          {caseData.results.legalMemo.prosecuting_attorney && (
                            <div>
                              <label className="text-sm font-medium">Prosecuting Attorney</label>
                              <p className="text-sm mt-1">{caseData.results.legalMemo.prosecuting_attorney}</p>
                            </div>
                          )}

                          {caseData.results.legalMemo.evidence_used_to_convict && caseData.results.legalMemo.evidence_used_to_convict.length > 0 && (
                            <div>
                              <label className="text-sm font-medium">Evidence Used to Convict</label>
                              <ul className="text-sm mt-1 list-disc list-inside space-y-1">
                                {caseData.results.legalMemo.evidence_used_to_convict.map((evidence: string, idx: number) => (
                                  <li key={idx}>{evidence}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {caseData.results.legalMemo.defense_presented && (
                            <div>
                              <label className="text-sm font-medium">Defense Presented</label>
                              <p className="text-sm mt-1 whitespace-pre-wrap">{caseData.results.legalMemo.defense_presented}</p>
                            </div>
                          )}
                          
                          {caseData.results.legalMemo.prosecution_presented && (
                            <div>
                              <label className="text-sm font-medium">Prosecution Presented</label>
                              <p className="text-sm mt-1 whitespace-pre-wrap">{caseData.results.legalMemo.prosecution_presented}</p>
                            </div>
                          )}

                          {caseData.results.legalMemo.wrongful_conviction_issues && caseData.results.legalMemo.wrongful_conviction_issues.length > 0 && (
                            <div>
                              <label className="text-sm font-medium">Wrongful Conviction Issues</label>
                              <ul className="text-sm mt-1 list-disc list-inside space-y-1">
                                {caseData.results.legalMemo.wrongful_conviction_issues.map((issue: string, idx: number) => (
                                  <li key={idx}>{issue}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {caseData.results.legalMemo.parole_eligibility_date && (
                            <div>
                              <label className="text-sm font-medium">Parole Eligibility Date</label>
                              <p className="text-sm mt-1">{caseData.results.legalMemo.parole_eligibility_date}</p>
                            </div>
                          )}
                          
                          {caseData.results.legalMemo.prior_parole_hearing_result && (
                            <div>
                              <label className="text-sm font-medium">Prior Parole Hearing Result</label>
                              <p className="text-sm mt-1">{caseData.results.legalMemo.prior_parole_hearing_result}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Lawmatics Transfer */}
                    <div className="border-t pt-6">
                      <h3 className="text-lg font-semibold mb-4">Transfer to Lawmatics</h3>
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
