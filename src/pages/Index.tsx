import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, Brain, LogOut } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Session } from "@supabase/supabase-js";
import MultiFileUpload from "@/components/MultiFileUpload";
import ModuleSelector from "@/components/ModuleSelector";
import AnalysisResults from "@/components/AnalysisResults";

const Index = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [selectedModules, setSelectedModules] = useState<string[]>(["innocence", "bias", "summary", "language"]);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
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

    try {
      // Process first file for now (can be extended for batch processing)
      const file = files[0];
      const fileExt = file.name.split('.').pop();
      
      // Check if file is PDF - need to inform user about limitation
      if (file.type === 'application/pdf') {
        toast({
          title: "PDF files require text extraction",
          description: "For best results, please convert your PDF to plain text (.txt) first, or copy/paste the transcript content into a text file.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }

      const filePath = `${user.id}/${crypto.randomUUID()}.${fileExt}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('transcripts')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Read file content
      const text = await file.text();

      // Create analysis record
      const { data: analysisData, error: insertError } = await supabase
        .from('analyses')
        .insert({
          user_id: user.id,
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          analysis_modules: selectedModules,
          status: 'pending'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setIsUploading(false);
      setIsAnalyzing(true);

      // Call edge function for analysis
      const { error: functionError } = await supabase.functions.invoke('analyze-transcript', {
        body: {
          analysisId: analysisData.id,
          transcriptText: text,
          modules: selectedModules
        }
      });

      if (functionError) {
        if (functionError.message.includes("Rate limit")) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again in a few moments.",
            variant: "destructive",
          });
        } else if (functionError.message.includes("credits")) {
          toast({
            title: "Credits exhausted",
            description: "Please add AI credits to continue analysis.",
            variant: "destructive",
          });
        } else {
          throw functionError;
        }
        setIsAnalyzing(false);
        return;
      }

      // Poll for results
      const pollInterval = setInterval(async () => {
        const { data: updatedAnalysis, error: fetchError } = await supabase
          .from('analyses')
          .select('*')
          .eq('id', analysisData.id)
          .single();

        if (fetchError) {
          clearInterval(pollInterval);
          throw fetchError;
        }

        if (updatedAnalysis.status === 'completed') {
          clearInterval(pollInterval);
          setAnalysis(updatedAnalysis.results);
          setIsAnalyzing(false);
          toast({
            title: "Analysis complete",
            description: "Your transcript has been analyzed successfully",
          });
        } else if (updatedAnalysis.status === 'failed') {
          clearInterval(pollInterval);
          setIsAnalyzing(false);
          toast({
            title: "Analysis failed",
            description: updatedAnalysis.error_message || "An error occurred during analysis",
            variant: "destructive",
          });
        }
      }, 2000);

      // Timeout after 2 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        if (isAnalyzing) {
          setIsAnalyzing(false);
          toast({
            title: "Analysis timeout",
            description: "The analysis is taking longer than expected. Please try again.",
            variant: "destructive",
          });
        }
      }, 120000);

    } catch (error) {
      console.error('Analysis error:', error);
      setIsUploading(false);
      setIsAnalyzing(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to analyze transcript",
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
              onNewAnalysis={() => {
                setAnalysis(null);
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
