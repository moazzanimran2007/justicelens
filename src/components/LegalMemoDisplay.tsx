import { Card } from "@/components/ui/card";
import { FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface LegalMemoDisplayProps {
  memo: any;
}

const LegalMemoDisplay = ({ memo }: LegalMemoDisplayProps) => {
  if (!memo) return null;

  const InfoField = ({ label, value }: { label: string; value: any }) => {
    if (!value || (Array.isArray(value) && value.length === 0)) return null;
    
    return (
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground uppercase mb-1 font-semibold">{label}</p>
        {Array.isArray(value) ? (
          <ul className="list-disc list-inside space-y-1">
            {value.map((item: string, idx: number) => (
              <li key={idx} className="text-sm text-foreground">{item}</li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-foreground">{value}</p>
        )}
      </div>
    );
  };

  return (
    <Card className="p-6 border-border shadow-md">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2 rounded-lg bg-success/10">
          <FileText className="w-6 h-6 text-success" />
        </div>
        <div className="flex-1">
          <h3 className="text-xl font-bold text-foreground mb-2">
            Legal Memo & Fact Sheet
          </h3>
          <p className="text-muted-foreground">
            Comprehensive case information extracted from transcript
          </p>
        </div>
      </div>

      {/* Client Information */}
      {(memo.client_name || memo.cdcr_number || memo.date_of_birth) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
            Client Information
          </h4>
          <div className="grid md:grid-cols-2 gap-3">
            <InfoField label="Client Name" value={memo.client_name} />
            <InfoField label="CDCR Number" value={memo.cdcr_number} />
            <InfoField label="Date of Birth" value={memo.date_of_birth} />
            <InfoField label="Contact Information" value={memo.contact_information} />
          </div>
        </div>
      )}

      {/* Introduction */}
      {(memo.short_summary || memo.evidence_used_to_convict || memo.potential_theory_of_case) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground mb-3">Introduction</h4>
          <div className="space-y-3">
            <InfoField label="Summary" value={memo.short_summary} />
            <InfoField label="Evidence Used to Convict" value={memo.evidence_used_to_convict} />
            <InfoField label="Potential Theory of the Case" value={memo.potential_theory_of_case} />
          </div>
        </div>
      )}

      {/* Conviction & Sentence Summary */}
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-foreground mb-3">Conviction & Sentence Summary</h4>
        <div className="grid md:grid-cols-2 gap-3">
          <InfoField label="Date of Crime" value={memo.date_of_crime} />
          <InfoField label="Location of Crime" value={memo.location_of_crime} />
          <InfoField label="Date of Arrest" value={memo.date_of_arrest} />
          <InfoField label="Date of Conviction" value={memo.date_of_conviction} />
          <InfoField label="Convicted Of" value={memo.convicted_of} />
          <InfoField label="County of Conviction" value={memo.county_of_conviction} />
          <InfoField label="Sentence" value={memo.sentence} />
          <InfoField label="Parole Eligibility Date" value={memo.parole_eligibility_date} />
          <InfoField label="Prior Parole Hearing Result" value={memo.prior_parole_hearing_result} />
          <InfoField label="Client's Priors" value={memo.client_priors} />
        </div>
      </div>

      {/* Superior Court Case Information */}
      {(memo.trial_court_case_no || memo.trial_attorney || memo.prosecuting_attorney) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground mb-3">Superior Court Case Information</h4>
          <div className="grid md:grid-cols-2 gap-3">
            <InfoField label="Trial Court Case No." value={memo.trial_court_case_no} />
            <InfoField label="Trial Court/Judge/Dept." value={memo.trial_court_judge_dept} />
            <InfoField label="Trial Attorney" value={memo.trial_attorney} />
            <InfoField label="Prosecuting Attorney" value={memo.prosecuting_attorney} />
            <InfoField label="Co-Defendant" value={memo.co_defendant} />
            <InfoField label="Co-Defendant's Attorney" value={memo.co_defendant_attorney} />
          </div>
        </div>
      )}

      {/* Appellate Court Information */}
      {(memo.appellate_case_no || memo.appellate_attorneys) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground mb-3">Appellate Court Information</h4>
          <div className="grid md:grid-cols-2 gap-3">
            <InfoField label="Appellate Case No." value={memo.appellate_case_no} />
            <InfoField label="Appellate Attorneys" value={memo.appellate_attorneys} />
          </div>
        </div>
      )}

      {/* Post-Conviction Issues */}
      {(memo.direct_appeal_date || memo.petition_for_review_date || memo.habeas_petition_date) && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground mb-3">Post-Conviction Issues Raised</h4>
          
          {memo.direct_appeal_date && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">A. State Direct Appeal</p>
              <div className="space-y-3">
                <InfoField label="Date Filed" value={memo.direct_appeal_date} />
                <InfoField label="Issues Raised" value={memo.direct_appeal_issues} />
              </div>
            </div>
          )}
          
          {memo.petition_for_review_date && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">Petition for Review</p>
              <div className="space-y-3">
                <InfoField label="Date Filed" value={memo.petition_for_review_date} />
                <InfoField label="Issues Raised" value={memo.petition_for_review_issues} />
              </div>
            </div>
          )}
          
          {memo.habeas_petition_date && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">B. Habeas Petitions</p>
              <div className="space-y-3">
                <InfoField label="Date Filed" value={memo.habeas_petition_date} />
                <InfoField label="Issues Raised" value={memo.habeas_petition_issues} />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Case Presentations */}
      {(memo.prosecution_presented || memo.defense_presented) && (
        <div className="mb-6">
          <div className="grid md:grid-cols-2 gap-3">
            <InfoField label="Prosecution Presented" value={memo.prosecution_presented} />
            <InfoField label="Defense Presented" value={memo.defense_presented} />
          </div>
        </div>
      )}

      {/* People Mentioned */}
      {memo.people_mentioned && memo.people_mentioned.length > 0 && (
        <div className="mb-6">
          <h4 className="text-lg font-semibold text-foreground mb-3">People Mentioned in Transcript</h4>
          <div className="grid md:grid-cols-2 gap-3">
            {memo.people_mentioned.map((person: any, idx: number) => (
              <div key={idx} className="p-3 bg-muted/50 rounded-lg border border-border">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-foreground">{person.name}</p>
                  <Badge variant="secondary" className="text-xs">
                    {person.role}
                  </Badge>
                </div>
                {person.context && (
                  <p className="text-xs text-muted-foreground mt-1">{person.context}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wrongful Conviction Issues */}
      {memo.wrongful_conviction_issues && memo.wrongful_conviction_issues.length > 0 && (
        <div>
          <h4 className="text-lg font-semibold text-foreground mb-3">Wrongful Conviction Issues</h4>
          <div className="flex flex-wrap gap-2">
            {memo.wrongful_conviction_issues.map((issue: string, idx: number) => (
              <Badge key={idx} variant="outline" className="text-sm">
                {issue}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
};

export default LegalMemoDisplay;