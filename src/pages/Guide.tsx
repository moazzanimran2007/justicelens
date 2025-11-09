import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Brain, ArrowLeft, AlertCircle, BarChart3, FileText, MessageSquare, Scale } from "lucide-react";
import { useNavigate } from "react-router-dom";

const Guide = () => {
  const navigate = useNavigate();

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
                <h1 className="text-2xl font-bold text-foreground">Results Interpretation Guide</h1>
                <p className="text-sm text-muted-foreground">Understanding Your Analysis</p>
              </div>
            </div>
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Analyzer
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Introduction */}
          <Card className="p-8 border-border shadow-lg">
            <h2 className="text-3xl font-bold text-foreground mb-4">How to Interpret Your Results</h2>
            <p className="text-muted-foreground text-lg">
              #JusticeLens uses advanced AI to analyze parole hearing transcripts across four key dimensions.
              This guide will help you understand what each analysis module reveals and how to use the insights 
              to advocate more effectively for justice reform.
            </p>
          </Card>

          {/* Innocence Likelihood Score */}
          <Card className="p-8 border-border shadow-lg bg-gradient-to-br from-primary/5 to-primary/10">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/20">
                <Scale className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Innocence Likelihood Score
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">What It Measures:</h4>
                    <p className="text-muted-foreground mb-3">
                      An AI-calculated composite score (0-100) that synthesizes findings from innocence claims, 
                      bias indicators, wrongful conviction issues, and evidence quality assessment. This score 
                      serves as a screening tool to prioritize cases for further investigation.
                    </p>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Score Ranges:</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="px-3 py-1 bg-primary text-primary-foreground text-xs rounded font-semibold">75-100</span>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">High Likelihood</p>
                          <p className="text-sm text-muted-foreground">
                            Strong indicators suggest potential wrongful conviction. Priority: <strong>Urgent/High</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="px-3 py-1 bg-warning text-warning-foreground text-xs rounded font-semibold">50-74</span>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Moderate Likelihood</p>
                          <p className="text-sm text-muted-foreground">
                            Notable concerns warrant further investigation. Priority: <strong>Medium/High</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="px-3 py-1 bg-accent text-accent-foreground text-xs rounded font-semibold">25-49</span>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Low-Moderate Likelihood</p>
                          <p className="text-sm text-muted-foreground">
                            Some indicators present but not conclusive. Priority: <strong>Medium/Low</strong>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="px-3 py-1 bg-muted text-muted-foreground text-xs rounded font-semibold">0-24</span>
                        <div className="flex-1">
                          <p className="font-semibold text-foreground">Low Likelihood</p>
                          <p className="text-sm text-muted-foreground">
                            Limited indicators of potential innocence. Priority: <strong>Low</strong>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Score Components:</h4>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>Innocence Claims (30 pts max):</strong> 5 points per claim detected</li>
                      <li><strong>Wrongful Conviction Issues (35 pts max):</strong> 7 points per issue identified</li>
                      <li><strong>Bias Indicators (25 pts max):</strong> Weighted by severity (high=2x, moderate=1.5x)</li>
                      <li><strong>Evidence Quality (10 pts max):</strong> Fewer pieces of evidence may indicate weaker case</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Automatic Priority Assignment:</h4>
                    <p className="text-muted-foreground mb-2">
                      Cases are automatically assigned priorities based on their innocence score:
                    </p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-2 bg-destructive/10 rounded text-center">
                        <p className="font-semibold text-destructive text-sm">Urgent</p>
                        <p className="text-xs text-muted-foreground">Score &gt; 80</p>
                      </div>
                      <div className="p-2 bg-primary/10 rounded text-center">
                        <p className="font-semibold text-primary text-sm">High</p>
                        <p className="text-xs text-muted-foreground">Score 66-80</p>
                      </div>
                      <div className="p-2 bg-secondary/50 rounded text-center">
                        <p className="font-semibold text-secondary-foreground text-sm">Medium</p>
                        <p className="text-xs text-muted-foreground">Score 36-65</p>
                      </div>
                      <div className="p-2 bg-muted rounded text-center">
                        <p className="font-semibold text-muted-foreground text-sm">Low</p>
                        <p className="text-xs text-muted-foreground">Score &lt; 36</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-background p-4 rounded-lg border-2 border-primary">
                    <p className="text-sm text-foreground">
                      <strong>Important Note:</strong> This score is generated by AI analysis and should be used as a 
                      screening tool only. It does not constitute legal advice and requires human review and validation. 
                      High scores indicate cases that may benefit from deeper investigation by legal experts.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Innocence Claims */}
          <Card className="p-8 border-border shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-lg bg-primary/10">
                <AlertCircle className="w-8 h-8 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Innocence Claims Detector
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">What It Detects:</h4>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Explicit statements denying guilt or involvement in the crime</li>
                      <li>Implicit suggestions of innocence through language patterns</li>
                      <li>Claims of wrongful conviction or false testimony</li>
                      <li>References to coercion, false confessions, or inadequate defense</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">How to Use This:</h4>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>High count (5+):</strong> Strong indicators of maintained innocence that may warrant further investigation</li>
                      <li><strong>Moderate count (2-4):</strong> Some innocence claims present; consider context and consistency</li>
                      <li><strong>Low count (0-1):</strong> Few or no innocence claims detected in transcript</li>
                      <li>Review quoted examples to assess credibility and patterns</li>
                      <li>Cross-reference with case files and post-conviction review opportunities</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg border-l-4 border-primary">
                    <p className="text-sm text-foreground">
                      <strong>Advocacy Tip:</strong> Use direct quotes in appeals, clemency petitions, or innocence project 
                      submissions. Document the persistence and consistency of innocence claims across multiple hearings.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Bias & Fairness */}
          <Card className="p-8 border-border shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-lg bg-accent/10">
                <BarChart3 className="w-8 h-8 text-accent" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Bias & Fairness Indicators
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">What It Detects:</h4>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>Victim-centric framing:</strong> Excessive focus on victim impact rather than rehabilitation</li>
                      <li><strong>Demeanor comments:</strong> Subjective judgments about body language or emotional expression</li>
                      <li><strong>Stigmatizing language:</strong> Labels that dehumanize or pre-judge the individual</li>
                      <li><strong>Unchangeable past focus:</strong> Overemphasis on the crime rather than current growth</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Understanding Severity Levels:</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded font-semibold">HIGH</span>
                        <p className="text-sm text-muted-foreground flex-1">
                          Pervasive bias that may constitute due process violations. Consider formal complaints or appeals.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded font-semibold">MODERATE</span>
                        <p className="text-sm text-muted-foreground flex-1">
                          Notable bias patterns that could affect fairness. Document for advocacy purposes.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-secondary/50 text-secondary-foreground text-xs rounded font-semibold">LOW</span>
                        <p className="text-sm text-muted-foreground flex-1">
                          Minor instances that reflect systemic tendencies but may not individually affect outcome.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-muted p-4 rounded-lg border-l-4 border-accent">
                    <p className="text-sm text-foreground">
                      <strong>Advocacy Tip:</strong> Use bias indicators to challenge parole denials, request panel recusal, 
                      or support systemic reform efforts. Compile patterns across multiple hearings to demonstrate institutional bias.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Advocate Fact Sheet */}
          <Card className="p-8 border-border shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-lg bg-success/10">
                <FileText className="w-8 h-8 text-success" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Advocate Fact Sheet
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">What It Provides:</h4>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Concise summary of offense context and circumstances</li>
                      <li>Calculation of time served (helps assess sentence proportionality)</li>
                      <li>Programming accomplishments and rehabilitation evidence</li>
                      <li>Key parole suitability factors mentioned by the board</li>
                      <li>Supporting evidence for release readiness</li>
                      <li>Concerns raised that need to be addressed</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">How to Use This:</h4>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li>Use as a quick reference sheet when preparing appeals or clemency applications</li>
                      <li>Compare years served against state averages for similar offenses</li>
                      <li>Highlight programming accomplishments in advocacy materials</li>
                      <li>Address board concerns proactively in future hearings</li>
                      <li>Identify gaps in the record that need additional documentation</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg border-l-4 border-success">
                    <p className="text-sm text-foreground">
                      <strong>Advocacy Tip:</strong> This summary is optimized for quick briefings to attorneys, journalists, 
                      or policymakers. Use it to create one-page advocacy materials or media packets.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Language Pattern Analysis */}
          <Card className="p-8 border-border shadow-lg">
            <div className="flex items-start gap-4 mb-4">
              <div className="p-3 rounded-lg bg-warning/10">
                <MessageSquare className="w-8 h-8 text-warning" />
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-foreground mb-3">
                  Language Pattern Analysis
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold text-foreground mb-2">What It Tracks:</h4>
                    <p className="text-muted-foreground mb-3">
                      This module analyzes how frequently and in what context the parole board uses three critical terms:
                    </p>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>"Insight":</strong> Often required for parole but can be weaponized if standards are unclear</li>
                      <li><strong>"Remorse":</strong> Subjective assessment that may penalize different cultural expressions</li>
                      <li><strong>"Accountability":</strong> Can mean taking responsibility or can signal the board wants more confession</li>
                    </ul>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Understanding Context Labels:</h4>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-success/10 text-success text-xs rounded font-semibold">POSITIVE</span>
                        <p className="text-sm text-muted-foreground flex-1">
                          Term used favorably, indicating the individual is meeting expectations in this area.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-destructive/10 text-destructive text-xs rounded font-semibold">NEGATIVE</span>
                        <p className="text-sm text-muted-foreground flex-1">
                          Term used critically, suggesting deficiency or lack. This is a key area to address before next hearing.
                        </p>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="px-2 py-1 bg-warning/10 text-warning text-xs rounded font-semibold">MIXED</span>
                        <p className="text-sm text-muted-foreground flex-1">
                          Both positive and negative uses detected. Review examples to understand nuances.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-semibold text-foreground mb-2">Frequency Interpretation:</h4>
                    <ul className="list-disc list-inside space-y-2 text-muted-foreground">
                      <li><strong>High frequency (8+):</strong> This is a major focus of the board's evaluation</li>
                      <li><strong>Moderate frequency (3-7):</strong> Important factor but not the primary concern</li>
                      <li><strong>Low frequency (0-2):</strong> Not a significant issue in this hearing</li>
                    </ul>
                  </div>

                  <div className="bg-muted p-4 rounded-lg border-l-4 border-warning">
                    <p className="text-sm text-foreground">
                      <strong>Advocacy Tip:</strong> If a term appears frequently in negative context, prepare specific 
                      statements and documentation addressing that issue for the next hearing. Compare usage across multiple 
                      hearings to identify shifting standards or inconsistent application of criteria.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Best Practices */}
          <Card className="p-8 border-border shadow-lg bg-primary/5">
            <h3 className="text-2xl font-bold text-foreground mb-4">Best Practices for Using These Results</h3>
            <div className="space-y-3 text-muted-foreground">
              <p className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">1.</span>
                <span><strong>Document patterns:</strong> Run analyses on multiple hearings to identify trends and systemic issues</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">2.</span>
                <span><strong>Combine insights:</strong> Cross-reference findings across all four modules for comprehensive advocacy</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">3.</span>
                <span><strong>Export reports:</strong> Use the export feature to share findings with legal teams and advocates</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">4.</span>
                <span><strong>Track changes:</strong> Compare results across hearings to measure progress and identify persistent barriers</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="text-primary font-bold mt-1">5.</span>
                <span><strong>Collaborate:</strong> Share anonymized patterns with reform organizations to support systemic change</span>
              </p>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="container mx-auto px-6 py-8">
          <p className="text-center text-sm text-muted-foreground">
            #JusticeLens • Advancing fairness through data-driven analysis
          </p>
        </div>
      </footer>
    </div>
  );
};

export default Guide;