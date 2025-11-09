import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, ExternalLink, Search, Loader2, CheckCircle } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PeopleMentionedCardProps {
  people: any[];
  additionalInfo?: any[];
  analysisId?: string;
  onUpdate?: () => void;
}

export const PeopleMentionedCard = ({ 
  people, 
  additionalInfo, 
  analysisId,
  onUpdate 
}: PeopleMentionedCardProps) => {
  const { toast } = useToast();
  const [searchingPerson, setSearchingPerson] = useState<string | null>(null);

  if (!people || people.length === 0) return null;

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

  return (
    <Card className="p-6 border-border shadow-md bg-gradient-to-br from-card to-muted/20">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-3 rounded-lg bg-primary/10">
          <Users className="w-7 h-7 text-primary" />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-foreground mb-2">
            People Mentioned in Transcript
          </h3>
          <p className="text-muted-foreground">
            {people.length} {people.length === 1 ? 'person' : 'people'} identified with automatic CDCR-focused research
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        {people.map((person: any, idx: number) => {
          const info = additionalInfo?.find((i: any) => i.name === person.name);
          const isSearching = searchingPerson === person.name;
          const hasInfo = !!info;

          return (
            <Card 
              key={idx} 
              className={`p-4 border-2 transition-all ${
                hasInfo 
                  ? 'border-primary/30 bg-primary/5' 
                  : 'border-border hover:border-primary/20'
              }`}
            >
              <div className="space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-lg text-foreground mb-1">
                      {person.name}
                    </h4>
                    <Badge variant="outline" className="text-xs">
                      {person.role}
                    </Badge>
                  </div>
                  {hasInfo && (
                    <Badge variant="default" className="bg-primary/10 text-primary border-primary/20">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Researched
                    </Badge>
                  )}
                </div>

                {/* Context */}
                {person.context && (
                  <p className="text-sm text-muted-foreground border-l-2 border-muted pl-3">
                    {person.context}
                  </p>
                )}

                {/* CDCR Research Results */}
                {hasInfo && (
                  <div className="pt-3 border-t border-border/50">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="text-xs bg-primary/5 text-primary border-primary/30">
                        CDCR-Focused Research
                      </Badge>
                      {info.auto_searched && (
                        <Badge variant="outline" className="text-xs">
                          Auto-searched
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-2">
                      {info.summary}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Searched: {new Date(info.searched_at).toLocaleDateString()}
                    </p>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {!hasInfo && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1"
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
                    variant={hasInfo ? "outline" : "default"}
                    className={hasInfo ? "flex-1" : "flex-1"}
                    onClick={() => window.open(`https://ciris.mt.cdcr.ca.gov/search?name=${encodeURIComponent(person.name)}`, '_blank')}
                  >
                    <ExternalLink className="w-3 h-3 mr-1" />
                    CDCR Lookup
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
};
