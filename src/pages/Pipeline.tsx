import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
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
  const [assigneeFilter, setAssigneeFilter] = useState<string>("all");
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedCases, setSelectedCases] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  useEffect(() => {
    checkAuth();
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

      {/* Hero Section */}
      <section className="border-b border-border bg-card/30 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-12">
          <div className="max-w-4xl">
            <h1 className="text-4xl font-bold text-foreground mb-3 animate-fade-in">
              Welcome back, {user?.email?.split('@')[0]}
            </h1>
            <p className="text-lg text-muted-foreground animate-fade-in" style={{ animationDelay: '0.1s' }}>
              Manage your case pipeline and track progress across all stages
            </p>
          </div>
        </div>
      </section>

      <main className="container mx-auto px-6 py-8">
        {/* Controls Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <CheckSquare className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-foreground">Case Pipeline</h2>
                <p className="text-sm text-muted-foreground">Drag cases between stages or use controls</p>
              </div>
            </div>
            
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
                    <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                      <SelectTrigger className="w-[180px] border-0 shadow-none focus:ring-0">
                        <SelectValue placeholder="Filter by..." />
                      </SelectTrigger>
                      <SelectContent className="bg-card z-50">
                        <SelectItem value="all">All Cases</SelectItem>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        <SelectItem value="mine">Assigned to Me</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
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
        <div className="animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <KanbanBoard
            sortBy={sortBy}
            assigneeFilter={assigneeFilter}
            currentUserId={user?.id}
            selectionMode={selectionMode}
            selectedCases={selectedCases}
            onCaseSelect={handleCaseSelect}
          />
        </div>
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
