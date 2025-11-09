import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, Brain, LogOut, LayoutDashboard, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import MultiFileUpload from "@/components/MultiFileUpload";
import ModuleSelector from "@/components/ModuleSelector";
import AnalysisResults from "@/components/AnalysisResults";
import { extractTextFromPdf } from "@/lib/pdf-text";
import { NotificationBell } from "@/components/NotificationBell";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>(["innocence", "bias", "summary", "language"]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analysisId, setAnalysisId] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [intakeStageId, setIntakeStageId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (!session) {
          navigate("/auth");
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (!session) {
        navigate("/auth");
      }
    });

    // Fetch intake stage ID
    const fetchIntakeStage = async () => {
      const { data } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("name", "Intake")
        .single();
      
      if (data) {
        setIntakeStageId(data.id);
      }
    };
    fetchIntakeStage();

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const handleModuleToggle = (module: string) => {
    setSelectedModules(prev =>
      prev.includes(module)
        ? prev.filter(m => m !== module)
        : [...prev, module]
    );
  };

  const handleAnalyze = async () => {
    if (files.length === 0) {
      toast({
        title: "No files selected",
        description: "Please upload at least one transcript",
        variant: "destructive",
      });
      return;
    }

    if (selectedModules.length === 0) {
      toast({
        title: "No modules selected",
        description: "Please select at least one analysis module",
        variant: "destructive",
      });
      return;
    }

    if (!user) {
      toast({
        title: "Authentication required",
        description: "Please sign in to analyze transcripts",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const allResults: any[] = [];
    const failedFiles: string[] = [];

    try {
      // Process each file sequentially
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileExt = file.name.split('.').pop();
        
        toast({
          title: `Processing file ${i + 1} of ${files.length}`,
          description: `Uploading ${file.name}...`,
        });


        try {
          const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

          // Upload file to storage
          const { error: uploadError } = await supabase.storage
            .from('transcripts')
            .upload(filePath, file);

          if (uploadError) throw uploadError;

          // Read file content (handle PDF or TXT)
          let text: string;
          if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
            toast({ title: `Extracting text`, description: `Reading ${file.name}...` });
            text = await extractTextFromPdf(file);
            if (!text || text.trim().length < 20) {
              throw new Error("No text found in PDF. If this is a scanned PDF, OCR is not yet supported.");
            }
          } else {
            text = await file.text();
          }

          // Create analysis record
          const { data: analysisData, error: insertError } = await supabase
            .from('analyses')
            .insert({
              user_id: user.id,
              file_name: file.name,
              file_path: filePath,
              file_size: file.size,
              analysis_modules: selectedModules,
              status: 'pending',
              stage_id: intakeStageId,
              priority: 'medium'
            })
            .select()
            .single();

          if (insertError) throw insertError;

          // Log initial activity
          await supabase.from('case_activities').insert({
            case_id: analysisData.id,
            user_id: user.id,
            activity_type: 'case_created',
            description: `Case created: ${file.name}`
          });

          if (i === 0) {
            setIsUploading(false);
            setIsAnalyzing(true);
          }

          toast({
            title: `Analyzing ${i + 1} of ${files.length}`,
            description: `Processing ${file.name}...`,
          });

          // Call edge function for analysis
          const { data: functionData, error: functionError } = await supabase.functions.invoke('analyze-transcript', {
            body: {
              analysisId: analysisData.id,
              transcriptText: text,
              modules: selectedModules
            }
          });

          if (functionError) {
            // Check for 402 Payment Required (AI credits exhausted)
            if (functionError.message.includes("402") || functionError.message.includes("credits exhausted")) {
              toast({
                title: "⚠️ AI Credits Exhausted",
                description: "Add credits in Settings → Workspace → Usage to continue analysis.",
                variant: "destructive",
                duration: 8000,
              });
              failedFiles.push(file.name);
              break; // Stop processing remaining files
            } 
            // Check for 429 Rate Limit
            else if (functionError.message.includes("429") || functionError.message.includes("Rate limit")) {
              toast({
                title: "⏱️ Rate Limit Reached",
                description: `Waiting 10 seconds before retrying ${file.name}...`,
                variant: "destructive",
              });
              await new Promise(resolve => setTimeout(resolve, 10000));
              // Retry this file once
              const { error: retryError } = await supabase.functions.invoke('analyze-transcript', {
                body: {
                  analysisId: analysisData.id,
                  transcriptText: text,
                  modules: selectedModules
                }
              });
              if (retryError) {
                throw retryError; // If retry fails, throw to outer catch
              }
            } else {
              throw functionError;
            }
          }

          // Poll for this file's results
          const result = await new Promise<any>((resolve, reject) => {
            const pollInterval = setInterval(async () => {
              const { data: updatedAnalysis, error: fetchError } = await supabase
                .from('analyses')
                .select('*')
                .eq('id', analysisData.id)
                .single();

              if (fetchError) {
                clearInterval(pollInterval);
                reject(fetchError);
                return;
              }

              if (updatedAnalysis.status === 'completed') {
                clearInterval(pollInterval);
                resolve({ results: updatedAnalysis.results, analysisId: analysisData.id });
              } else if (updatedAnalysis.status === 'failed') {
                clearInterval(pollInterval);
                reject(new Error(updatedAnalysis.error_message || "Analysis failed"));
              }
            }, 2000);

            // Timeout after 2 minutes per file
            setTimeout(() => {
              clearInterval(pollInterval);
              reject(new Error("Analysis timeout"));
            }, 120000);
          });

          allResults.push({ fileName: file.name, results: result.results, analysisId: result.analysisId });
        } catch (fileError) {
          console.error(`Error processing ${file.name}:`, fileError);
          failedFiles.push(file.name);
          toast({
            title: `Failed to process ${file.name}`,
            description: fileError instanceof Error ? fileError.message : "Unknown error",
            variant: "destructive",
          });
        }
      }

      setIsUploading(false);
      setIsAnalyzing(false);

      if (allResults.length > 0) {
        // For single file, show direct results
        if (allResults.length === 1) {
          setAnalysis(allResults[0].results);
          setAnalysisId(allResults[0].analysisId);
        } else {
          // For multiple files, combine results
          setAnalysis({ files: allResults });
          setAnalysisId(null); // Multiple files don't have a single ID
        }

        toast({
          title: "Batch analysis complete",
          description: `Successfully analyzed ${allResults.length} of ${files.length} file(s)`,
        });
        setFiles([]);
      } else {
        toast({
          title: "All files failed",
          description: "No files were successfully analyzed.",
          variant: "destructive",
        });
      }

    } catch (error) {
      console.error('Analysis error:', error);
      setIsUploading(false);
      setIsAnalyzing(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze transcripts",
        variant: "destructive",
      });
    }
  };

  if (!user) {
    return null; // Will redirect to auth
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Brain className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">JusticeLens</h1>
                <p className="text-sm text-muted-foreground">Parole Insight Analyzer</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate("/pipeline")} className="gap-2">
                <LayoutDashboard className="w-4 h-4" />
                Pipeline
              </Button>
              <Button variant="ghost" size="sm" onClick={() => navigate("/team")} className="gap-2">
                <Users className="w-4 h-4" />
                Team
              </Button>
              <NotificationBell />
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          {files.length === 0 && !analysis && (
            <div className="text-center mb-12">
              <h2 className="text-4xl font-bold text-foreground mb-4">
                Uncover Hidden Biases in Parole Hearings
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Advanced AI analysis to identify bias patterns, innocence claims, and systemic issues 
                in criminal justice transcripts
              </p>
            </div>
          )}

          {/* Features Grid */}
          {files.length === 0 && !analysis && (
            <div className="grid md:grid-cols-4 gap-6 mb-12">
              <Card className="p-6 text-center border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <AlertCircle className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Innocence Detection</h3>
                <p className="text-sm text-muted-foreground">
                  Flag explicit and implicit innocence claims
                </p>
              </Card>

              <Card className="p-6 text-center border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <Brain className="w-6 h-6 text-accent" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Bias Analysis</h3>
                <p className="text-sm text-muted-foreground">
                  Identify stigmatizing and proxy language
                </p>
              </Card>

              <Card className="p-6 text-center border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-success" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Smart Summaries</h3>
                <p className="text-sm text-muted-foreground">
                  Generate advocate-ready fact sheets
                </p>
              </Card>

              <Card className="p-6 text-center border-border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
                  <Upload className="w-6 h-6 text-warning" />
                </div>
                <h3 className="font-semibold mb-2 text-foreground">Easy Upload</h3>
                <p className="text-sm text-muted-foreground">
                  Support for PDF and text transcripts
                </p>
              </Card>
            </div>
          )}

          {/* Upload & Analysis Section */}
          {!analysis && (
            <Card className="p-8 border-border shadow-lg">
              <MultiFileUpload files={files} onFilesSelect={setFiles} />
              
              {files.length > 0 && (
                <>
                  <div className="mt-8">
                    <ModuleSelector 
                      selectedModules={selectedModules}
                      onModuleToggle={handleModuleToggle}
                    />
                  </div>

                  <div className="mt-6 flex justify-center">
                    <Button 
                      onClick={handleAnalyze}
                      disabled={isAnalyzing || isUploading || selectedModules.length === 0}
                      size="lg"
                      className="bg-primary hover:bg-primary/90"
                    >
                      {isUploading ? (
                        <>
                          <Upload className="w-5 h-5 mr-2 animate-pulse" />
                          Uploading...
                        </>
                      ) : isAnalyzing ? (
                        <>
                          <Brain className="w-5 h-5 mr-2 animate-pulse" />
                          Analyzing...
                        </>
                      ) : (
                        <>
                          <Brain className="w-5 h-5 mr-2" />
                          Analyze Transcript{files.length > 1 ? 's' : ''}
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </Card>
          )}

          {/* Results Section */}
          {analysis && (
            <AnalysisResults 
              analysis={analysis} 
              analysisId={analysisId || undefined}
              onNewAnalysis={() => {
                setAnalysis(null);
                setAnalysisId(null);
                setFiles([]);
              }}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-sm text-muted-foreground">
            JusticeLens • Advancing fairness through data-driven analysis
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
