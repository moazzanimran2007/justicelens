import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { KanbanBoard } from "@/components/KanbanBoard";
import { ArrowDownUp, CheckSquare, Trash2, X } from "lucide-react";
import { BulkDeleteDialog } from "@/components/BulkDeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Header } from "@/components/Header";

export default function Pipeline() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [caseStats, setCaseStats] = useState({
    totalCases: 0,
    completedCases: 0,
    urgentCases: 0,
    highPriorityCases: 0,
  });

  useEffect(() => {
    checkAuth();
    fetchCaseStats();
  }, []);

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

  const fetchCaseStats = async () => {
    const { count: totalCount } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true });

    const { count: completedCount } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true })
      .eq("status", "completed");

    const { count: urgentCount } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true })
      .eq("priority", "urgent");

    const { count: highCount } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true })
      .eq("priority", "high");

    setCaseStats({
      totalCases: totalCount || 0,
      completedCases: completedCount || 0,
      urgentCases: urgentCount || 0,
      highPriorityCases: highCount || 0,
    });
  };


  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedCases(new Set());
  };

  const handleCaseSelect = (caseId: string, selected: boolean) => {
    const newSelected = new Set(selectedCases);
    if (selected) {
      newSelected.add(caseId);
    } else {
      newSelected.delete(caseId);
    }
    setSelectedCases(newSelected);
  };

  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedCases);

    try {
      const { error } = await supabase.from("analyses").delete().in("id", idsToDelete);

      if (error) throw error;

      toast({
        title: "Cases deleted",
        description: `Successfully deleted ${idsToDelete.length} case${idsToDelete.length > 1 ? "s" : ""}`,
      });

      setSelectedCases(new Set());
      setSelectionMode(false);

      // Trigger refresh by re-mounting KanbanBoard
      window.location.reload();
    } catch (error) {
      console.error("Error deleting cases:", error);
      toast({
        title: "Error",
        description: "Failed to delete cases. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Header user={user} />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Case Pipeline</h2>
          <p className="text-sm text-muted-foreground">View and manage cases across different stages</p>
        </div>

        {/* Case Statistics Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm font-medium text-muted-foreground">Total Cases</p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{caseStats.totalCases}</div>
              <p className="text-xs text-muted-foreground mt-1">All active cases</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm font-medium text-muted-foreground">Completed</p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{caseStats.completedCases}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {caseStats.totalCases > 0 ? Math.round((caseStats.completedCases / caseStats.totalCases) * 100) : 0}% completion rate
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm font-medium text-muted-foreground">High Priority</p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{caseStats.highPriorityCases}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {caseStats.totalCases > 0 ? Math.round((caseStats.highPriorityCases / caseStats.totalCases) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm font-medium text-muted-foreground">Urgent</p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{caseStats.urgentCases}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {caseStats.totalCases > 0 ? Math.round((caseStats.urgentCases / caseStats.totalCases) * 100) : 0}% of total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Controls Section */}
        <div className="mb-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              {!selectionMode ? (
                <>
                  <Button 
                    variant="outline" 
                    size="default" 
                    onClick={toggleSelectionMode} 
                    className="gap-2 hover-scale"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Select Cases
                  </Button>
                  
                  <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card">
                    <ArrowDownUp className="w-4 h-4 text-muted-foreground" />
                    <Select value={sortBy} onValueChange={setSortBy}>
                      <SelectTrigger className="w-[180px] border-0 shadow-none focus:ring-0">
                        <SelectValue placeholder="Sort by..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="created_at">Newest First</SelectItem>
                        <SelectItem value="innocence_score">Innocence Score</SelectItem>
                        <SelectItem value="priority">Priority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-3 bg-primary/10 px-6 py-3 rounded-lg border border-primary/20 animate-scale-in">
                  <span className="text-sm font-semibold text-foreground">
                    {selectedCases.size} case{selectedCases.size !== 1 ? 's' : ''} selected
                  </span>
                  <Button
                    variant="destructive"
                    size="default"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={selectedCases.size === 0}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </Button>
                  <Button variant="ghost" size="default" onClick={toggleSelectionMode} className="gap-2">
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kanban Board Section */}
        <KanbanBoard
          sortBy={sortBy}
          selectionMode={selectionMode}
          selectedCases={selectedCases}
          onCaseSelect={handleCaseSelect}
        />
      </main>

      <BulkDeleteDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        onConfirm={handleBulkDelete}
        count={selectedCases.size}
      />
    </div>
  );
}
