import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Download, ArrowLeft } from "lucide-react";

interface AnalysisResultsProps {
  analysis: any;
  onNewAnalysis: () => void;
}

const AnalysisResults = ({ analysis, onNewAnalysis }: AnalysisResultsProps) => {
  const results = analysis.results || {};

  return (
    <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Legal Memo Analysis</h2>
          <p className="text-sm text-muted-foreground">Confidential Interoffice Memorandum – Work Product</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onNewAnalysis} variant="ghost" className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            New Analysis
          </Button>
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Client Information */}
      {results.clientInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Client Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.clientInfo.name && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Name: </span>
                <span className="text-sm font-bold">{results.clientInfo.name}</span>
              </div>
            )}
            {results.clientInfo.cdcrNumber && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">CDCR No.: </span>
                <span className="text-sm">{results.clientInfo.cdcrNumber}</span>
              </div>
            )}
            {results.clientInfo.dateOfBirth && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Date of Birth: </span>
                <span className="text-sm">{results.clientInfo.dateOfBirth}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Introduction */}
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle>Introduction</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.shortSummary && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Short Summary</h3>
              <p className="text-sm text-foreground leading-relaxed">{results.shortSummary}</p>
            </div>
          )}

          {results.evidenceUsedToConvict && results.evidenceUsedToConvict.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Evidence Used to Convict</h3>
              <ol className="list-decimal list-inside space-y-1">
                {results.evidenceUsedToConvict.map((evidence: string, index: number) => (
                  <li key={index} className="text-sm text-foreground">{evidence}</li>
                ))}
              </ol>
            </div>
          )}

          {results.potentialTheory && (
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Potential Theory of the Case</h3>
              <p className="text-sm text-foreground">{results.potentialTheory}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conviction & Sentence Summary */}
      {results.convictionSummary && (
        <Card>
          <CardHeader>
            <CardTitle>Conviction & Sentence Summary</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            {results.convictionSummary.dateOfCrime && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date of Crime</p>
                <p className="text-sm font-medium text-foreground">{results.convictionSummary.dateOfCrime}</p>
              </div>
            )}
            {results.convictionSummary.locationOfCrime && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Location of Crime</p>
                <p className="text-sm font-medium text-foreground">{results.convictionSummary.locationOfCrime}</p>
              </div>
            )}
            {results.convictionSummary.dateOfArrest && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date of Arrest</p>
                <p className="text-sm font-medium text-foreground">{results.convictionSummary.dateOfArrest}</p>
              </div>
            )}
            {results.convictionSummary.dateOfConviction && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Date of Conviction</p>
                <p className="text-sm font-medium text-foreground">{results.convictionSummary.dateOfConviction}</p>
              </div>
            )}
            {results.convictionSummary.convictedOf && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Convicted of</p>
                <p className="text-sm font-medium text-foreground">{results.convictionSummary.convictedOf}</p>
              </div>
            )}
            {results.convictionSummary.county && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">County of Conviction</p>
                <p className="text-sm font-medium text-foreground">{results.convictionSummary.county}</p>
              </div>
            )}
            {results.convictionSummary.sentence && (
              <div>
                <p className="text-xs text-muted-foreground mb-1">Sentence</p>
                <p className="text-sm font-medium text-foreground">{results.convictionSummary.sentence}</p>
              </div>
            )}
            {results.convictionSummary.paroleEligibility && (
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Parole Eligibility Date</p>
                <p className="text-sm font-medium text-foreground">{results.convictionSummary.paroleEligibility}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Court Information */}
      {results.courtInfo && (
        <Card>
          <CardHeader>
            <CardTitle>Superior Court Case Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {results.courtInfo.trialCaseNo && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Trial Court Case No.: </span>
                <span className="text-sm text-foreground">{results.courtInfo.trialCaseNo}</span>
              </div>
            )}
            {results.courtInfo.trialJudge && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Trial Court/Judge: </span>
                <span className="text-sm text-foreground">{results.courtInfo.trialJudge}</span>
              </div>
            )}
            {results.courtInfo.trialAttorney && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Trial Attorney: </span>
                <span className="text-sm text-foreground">{results.courtInfo.trialAttorney}</span>
              </div>
            )}
            {results.courtInfo.prosecutor && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Prosecuting Attorney: </span>
                <span className="text-sm text-foreground">{results.courtInfo.prosecutor}</span>
              </div>
            )}
            {results.courtInfo.coDefendant && (
              <div>
                <span className="text-sm font-medium text-muted-foreground">Co-Defendant: </span>
                <span className="text-sm text-foreground">{results.courtInfo.coDefendant}</span>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Prosecution & Defense */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {results.prosecutionPresented && (
          <Card>
            <CardHeader>
              <CardTitle>Prosecution Presented</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{results.prosecutionPresented}</p>
            </CardContent>
          </Card>
        )}

        {results.defensePresented && (
          <Card>
            <CardHeader>
              <CardTitle>Defense Presented</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-foreground leading-relaxed">{results.defensePresented}</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Wrongful Conviction Issues */}
      {results.wrongfulConvictionIssues && results.wrongfulConvictionIssues.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Wrongful Conviction Issues</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {results.wrongfulConvictionIssues.map((issue: string, index: number) => (
                <div key={index} className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="text-sm text-foreground">{issue}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Innocence Claims */}
      {results.innocenceClaims && results.innocenceClaims.count > 0 && (
        <Card className="border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Innocence Claims
              <Badge variant="secondary">{results.innocenceClaims.count} Claims</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {results.innocenceClaims.claims?.map((claim: any, index: number) => (
              <div key={index} className="border-l-4 border-primary pl-4 py-2">
                <p className="text-sm font-medium text-foreground mb-1">
                  "{claim.quote}"
                </p>
                <p className="text-xs text-muted-foreground">{claim.context}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AnalysisResults;
