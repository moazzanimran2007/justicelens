import { Card } from "@/components/ui/card";
import { FileText, ExternalLink, Search, Loader2, Edit, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";

interface LegalMemoDisplayProps {
  memo: any;
  analysisId?: string;
  onUpdate?: () => void;
}

const LegalMemoDisplay = ({ memo, analysisId, onUpdate }: LegalMemoDisplayProps) => {
  const { toast } = useToast();
  const [searchingPerson, setSearchingPerson] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedMemo, setEditedMemo] = useState<any>(memo);
  const [saving, setSaving] = useState(false);
  const [isBulkSearching, setIsBulkSearching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [showResearch, setShowResearch] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    setEditedMemo(memo);
  }, [memo]);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();

    setIsAdmin(!!data);
  };

  const handleSaveEdits = async () => {
    if (!analysisId) return;

    setSaving(true);
    const { error } = await supabase
      .from("legal_memos")
      .update(editedMemo)
      .eq("analysis_id", analysisId);

    if (error) {
      toast({
        title: "Error saving changes",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Changes saved successfully",
      });
      setIsEditing(false);
      if (onUpdate) onUpdate();
    }
    setSaving(false);
  };

  const handleCancelEdit = () => {
    setEditedMemo(memo);
    setIsEditing(false);
  };

  const updateField = (field: string, value: any) => {
    setEditedMemo((prev: any) => ({ ...prev, [field]: value }));
  };

  if (!memo) return null;

  const handleSearchPerson = async (personName: string, personRole: string) => {
    if (!analysisId) {
      toast({
        title: "Error",
        description: "Analysis ID not available",
        variant: "destructive",
      });
      return;
    }

    setSearchingPerson(personName);
    setShowResearch(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('search-person-info', {
        body: {
          analysisId,
          personName,
          personRole
        }
      });

      if (error) {
        if (error.message.includes("402") || error.message.includes("credits exhausted")) {
          toast({
            title: "⚠️ AI Credits Exhausted",
            description: "Add credits in Settings → Workspace → Usage to continue.",
            variant: "destructive",
            duration: 8000,
          });
        } else if (error.message.includes("429") || error.message.includes("Rate limit")) {
          toast({
            title: "⏱️ Rate Limit Reached",
            description: "Please wait a moment and try again.",
            variant: "destructive",
          });
        } else {
          throw error;
        }
        return;
      }

      toast({
        title: "✓ Search Complete",
        description: `Found information for ${personName}`,
      });

      // Refresh the memo data
      if (onUpdate) onUpdate();

    } catch (error) {
      console.error('Error searching person:', error);
      toast({
        title: "Search Failed",
        description: error instanceof Error ? error.message : "Failed to search for person information",
        variant: "destructive",
      });
    } finally {
      setSearchingPerson(null);
    }
  };
  const handleBulkSearch = async () => {
    if (!analysisId) {
      toast({ title: "Error", description: "Analysis ID not available", variant: "destructive" });
      return;
    }
    setShowResearch(true);
    setIsBulkSearching(true);
    setBulkProgress(0);

    const pending = (memo.people_mentioned || []).filter((p: any) =>
      !(memo.people_additional_info || []).some((i: any) => i.name === p.name)
    );

    for (let i = 0; i < pending.length; i++) {
      await handleSearchPerson(pending[i].name, pending[i].role);
      setBulkProgress(i + 1);
      await new Promise((r) => setTimeout(r, 500));
    }

    setIsBulkSearching(false);
    onUpdate?.();
  };

  const InfoField = ({ label, value, field }: { label: string; value: any; field?: string }) => {
    if (!value && !isEditing) return null;
    
    const displayValue = isEditing && field ? editedMemo[field] : value;
    
    return (
      <div className="p-3 bg-muted/50 rounded-lg">
        <p className="text-xs text-muted-foreground uppercase mb-1 font-semibold">{label}</p>
        {isEditing && field ? (
          Array.isArray(displayValue) ? (
            <Textarea
              value={displayValue?.join("\n") || ""}
              onChange={(e) => updateField(field, e.target.value.split("\n").filter(Boolean))}
              className="min-h-[80px] text-sm"
            />
          ) : (
            <Input
              value={displayValue || ""}
              onChange={(e) => updateField(field, e.target.value)}
              className="text-sm"
            />
          )
        ) : Array.isArray(value) ? (
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
        {isAdmin && (
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCancelEdit}
                  disabled={saving}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdits}
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit Info
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Client Information */}
      {(memo.client_name || memo.cdcr_number || memo.date_of_birth) && (
        <div className="mb-8">
          <div className="mb-4 pb-2 border-b-2 border-primary/20">
            <h4 className="text-xl font-bold text-foreground uppercase tracking-wide">
              Client Information
            </h4>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <InfoField label="Client Name" value={memo.client_name} field="client_name" />
            <InfoField label="CDCR Number" value={memo.cdcr_number} field="cdcr_number" />
            <InfoField label="Date of Birth" value={memo.date_of_birth} field="date_of_birth" />
            <InfoField label="Contact Information" value={memo.contact_information} field="contact_information" />
          </div>
        </div>
      )}

      {/* Introduction */}
      {(memo.short_summary || memo.evidence_used_to_convict || memo.potential_theory_of_case) && (
        <div className="mb-8">
          <div className="mb-4 pb-2 border-b-2 border-primary/20">
            <h4 className="text-xl font-bold text-foreground uppercase tracking-wide">Introduction</h4>
          </div>
          <div className="space-y-3">
            <InfoField label="Summary" value={memo.short_summary} field="short_summary" />
            <InfoField label="Evidence Used to Convict" value={memo.evidence_used_to_convict} field="evidence_used_to_convict" />
            <InfoField label="Potential Theory of the Case" value={memo.potential_theory_of_case} field="potential_theory_of_case" />
          </div>
        </div>
      )}

      {/* Conviction & Sentence Summary */}
      <div className="mb-8">
        <div className="mb-4 pb-2 border-b-2 border-primary/20">
          <h4 className="text-xl font-bold text-foreground uppercase tracking-wide">Conviction & Sentence Summary</h4>
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <InfoField label="Date of Crime" value={memo.date_of_crime} field="date_of_crime" />
          <InfoField label="Location of Crime" value={memo.location_of_crime} field="location_of_crime" />
          <InfoField label="Date of Arrest" value={memo.date_of_arrest} field="date_of_arrest" />
          <InfoField label="Date of Conviction" value={memo.date_of_conviction} field="date_of_conviction" />
          <InfoField label="Convicted Of" value={memo.convicted_of} field="convicted_of" />
          <InfoField label="County of Conviction" value={memo.county_of_conviction} field="county_of_conviction" />
          <InfoField label="Sentence" value={memo.sentence} field="sentence" />
          <InfoField label="Parole Eligibility Date" value={memo.parole_eligibility_date} field="parole_eligibility_date" />
          <InfoField label="Prior Parole Hearing Result" value={memo.prior_parole_hearing_result} field="prior_parole_hearing_result" />
          <InfoField label="Client's Priors" value={memo.client_priors} field="client_priors" />
        </div>
      </div>

      {/* Superior Court Case Information */}
      {(memo.trial_court_case_no || memo.trial_attorney || memo.prosecuting_attorney) && (
        <div className="mb-8">
          <div className="mb-4 pb-2 border-b-2 border-primary/20">
            <h4 className="text-xl font-bold text-foreground uppercase tracking-wide">Superior Court Case Information</h4>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <InfoField label="Trial Court Case No." value={memo.trial_court_case_no} field="trial_court_case_no" />
            <InfoField label="Trial Court/Judge/Dept." value={memo.trial_court_judge_dept} field="trial_court_judge_dept" />
            <InfoField label="Trial Attorney" value={memo.trial_attorney} field="trial_attorney" />
            <InfoField label="Prosecuting Attorney" value={memo.prosecuting_attorney} field="prosecuting_attorney" />
            <InfoField label="Co-Defendant" value={memo.co_defendant} field="co_defendant" />
            <InfoField label="Co-Defendant's Attorney" value={memo.co_defendant_attorney} field="co_defendant_attorney" />
          </div>
        </div>
      )}

      {/* Appellate Court Information */}
      {(memo.appellate_case_no || memo.appellate_attorneys) && (
        <div className="mb-8">
          <div className="mb-4 pb-2 border-b-2 border-primary/20">
            <h4 className="text-xl font-bold text-foreground uppercase tracking-wide">Appellate Court Information</h4>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <InfoField label="Appellate Case No." value={memo.appellate_case_no} field="appellate_case_no" />
            <InfoField label="Appellate Attorneys" value={memo.appellate_attorneys} field="appellate_attorneys" />
          </div>
        </div>
      )}

      {/* Post-Conviction Issues */}
      {(memo.direct_appeal_date || memo.petition_for_review_date || memo.habeas_petition_date) && (
        <div className="mb-8">
          <div className="mb-4 pb-2 border-b-2 border-primary/20">
            <h4 className="text-xl font-bold text-foreground uppercase tracking-wide">Post-Conviction Issues Raised</h4>
          </div>
          
          {memo.direct_appeal_date && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">A. State Direct Appeal</p>
              <div className="space-y-3">
                <InfoField label="Date Filed" value={memo.direct_appeal_date} field="direct_appeal_date" />
                <InfoField label="Issues Raised" value={memo.direct_appeal_issues} field="direct_appeal_issues" />
              </div>
            </div>
          )}
          
          {memo.petition_for_review_date && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">Petition for Review</p>
              <div className="space-y-3">
                <InfoField label="Date Filed" value={memo.petition_for_review_date} field="petition_for_review_date" />
                <InfoField label="Issues Raised" value={memo.petition_for_review_issues} field="petition_for_review_issues" />
              </div>
            </div>
          )}
          
          {memo.habeas_petition_date && (
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">B. Habeas Petitions</p>
              <div className="space-y-3">
                <InfoField label="Date Filed" value={memo.habeas_petition_date} field="habeas_petition_date" />
                <InfoField label="Issues Raised" value={memo.habeas_petition_issues} field="habeas_petition_issues" />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Case Presentations */}
      {(memo.prosecution_presented || memo.defense_presented) && (
        <div className="mb-6">
          <div className="grid md:grid-cols-2 gap-3">
            <InfoField label="Prosecution Presented" value={memo.prosecution_presented} field="prosecution_presented" />
            <InfoField label="Defense Presented" value={memo.defense_presented} field="defense_presented" />
          </div>
        </div>
      )}

      {/* People Mentioned */}
      {memo.people_mentioned && memo.people_mentioned.length > 0 && (
        <div className="mb-8">
          <div className="mb-4 pb-2 border-b-2 border-primary/20">
            <h4 className="text-xl font-bold text-foreground uppercase tracking-wide">People Mentioned in Transcript</h4>
          </div>
          <div className="flex items-center justify-end gap-2 mb-4">
            <Button size="sm" onClick={handleBulkSearch} disabled={isBulkSearching}>
              {isBulkSearching ? (
                <>
                  <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  Searching {bulkProgress}/{memo.people_mentioned.length}
                </>
              ) : (
                <>
                  <Search className="w-3 h-3 mr-1" />
                  Search All
                </>
              )}
            </Button>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {memo.people_mentioned.map((person: any, idx: number) => {
              const additionalInfo = memo.people_additional_info?.find(
                (info: any) => info.name === person.name
              );
              const isSearching = searchingPerson === person.name;

              return (
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
                  
                  {/* Additional Information Section */}
                  {showResearch && additionalInfo && (
                    <div className="mt-3 pt-3 border-t border-border/50">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs text-muted-foreground">
                          <strong>CDCR-Focused Research:</strong>
                        </p>
                        {additionalInfo.auto_searched && (
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/20">
                            Auto-searched
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-foreground mb-2">{additionalInfo.summary}</p>
                      <p className="text-xs text-muted-foreground">
                        Searched: {new Date(additionalInfo.searched_at).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 mt-3">
                    {!additionalInfo && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7"
                        onClick={() => handleSearchPerson(person.name, person.role)}
                        disabled={isSearching}
                      >
                        {isSearching ? (
                          <>
                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="w-3 h-3 mr-1" />
                            Search Info
                          </>
                        )}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => window.open(`https://ciris.mt.cdcr.ca.gov/search?name=${encodeURIComponent(person.name)}`, '_blank')}
                    >
                      <ExternalLink className="w-3 h-3 mr-1" />
                      CDCR Lookup
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Wrongful Conviction Issues */}
      {memo.wrongful_conviction_issues && memo.wrongful_conviction_issues.length > 0 && (
        <div>
          <div className="mb-4 pb-2 border-b-2 border-primary/20">
            <h4 className="text-xl font-bold text-foreground uppercase tracking-wide">Wrongful Conviction Issues</h4>
          </div>
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