import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import TranscriptUpload from "@/components/TranscriptUpload";
import AnalysisResults from "@/components/AnalysisResults";

const Index = () => {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { toast } = useToast();

  const handleFileSelect = (selectedFile: File) => {
    setFile(selectedFile);
    setAnalysis(null);
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast({
        title: "No file selected",
        description: "Please upload a transcript first",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    
    // Simulate analysis for now - will be replaced with actual AI analysis
    setTimeout(() => {
      setAnalysis({
        innocenceClaims: {
          detected: true,
          count: 3,
          examples: [
            "I maintain my complete innocence in this matter",
            "I was wrongfully convicted and have evidence to support this",
            "The facts of the case do not align with what happened"
          ]
        },
        biasIndicators: {
          found: true,
          categories: [
            { type: "Victim-centric framing", count: 8, severity: "moderate" },
            { type: "Demeanor comments", count: 5, severity: "high" },
            { type: "Lack of insight language", count: 12, severity: "moderate" }
          ]
        },
        summary: {
          offenseContext: "Convicted in 2005 for second-degree robbery",
          programming: "Completed anger management, vocational training, and educational programs",
          paroleFactors: "Strong family support, employment offer, stable housing plan",
          yearsServed: 18
        },
        languageAnalysis: {
          insight: { frequency: 23, context: "high" },
          remorse: { frequency: 15, context: "moderate" },
          accountability: { frequency: 18, context: "high" }
        }
      });
      setIsAnalyzing(false);
      toast({
        title: "Analysis complete",
        description: "Your transcript has been analyzed successfully",
      });
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Brain className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">Justice Insights</h1>
              <p className="text-sm text-muted-foreground">Criminal Justice Transcript Analysis Platform</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          {!file && !analysis && (
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
          {!file && !analysis && (
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

          {/* Upload Section */}
          {!analysis && (
            <Card className="p-8 border-border shadow-lg">
              <TranscriptUpload onFileSelect={handleFileSelect} />
              
              {file && (
                <div className="mt-6 flex items-center justify-between p-4 bg-muted rounded-lg">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-primary" />
                    <div>
                      <p className="font-medium text-foreground">{file.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(file.size / 1024).toFixed(2)} KB
                      </p>
                    </div>
                  </div>
                  <Button 
                    onClick={handleAnalyze}
                    disabled={isAnalyzing}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isAnalyzing ? (
                      <>
                        <Brain className="w-4 h-4 mr-2 animate-pulse" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Brain className="w-4 h-4 mr-2" />
                        Analyze Transcript
                      </>
                    )}
                  </Button>
                </div>
              )}
            </Card>
          )}

          {/* Results Section */}
          {analysis && (
            <AnalysisResults 
              analysis={analysis} 
              onNewAnalysis={() => {
                setAnalysis(null);
                setFile(null);
              }}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-sm text-muted-foreground">
            Justice Insights • Advancing fairness through data-driven analysis
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
