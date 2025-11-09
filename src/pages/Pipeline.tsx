import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { KanbanBoard } from "@/components/KanbanBoard";
import { LogOut, Upload, LayoutDashboard, Users, ArrowDownUp, CheckSquare, Trash2, X } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { BulkDeleteDialog } from "@/components/BulkDeleteDialog";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Pipeline() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<string>("created_at");
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
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
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold">JusticeLens</h1>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm">
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Pipeline
                </Button>

                <Button variant="ghost" size="sm" onClick={() => navigate("/new-case")}>
                  <Upload className="w-4 h-4 mr-2" />
                  New Case
                </Button>

                <Button variant="ghost" size="sm" onClick={() => navigate("/team")}>
                  <Users className="w-4 h-4 mr-2" />
                  Team
                </Button>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <NotificationBell />
              <span className="text-sm text-muted-foreground">{user?.email}</span>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold mb-2">Case Pipeline</h2>
              <p className="text-sm text-muted-foreground">View and manage cases across different stages</p>
            </div>
            <div className="flex items-center gap-2">
              {!selectionMode ? (
                <>
                  <Button variant="outline" size="sm" onClick={toggleSelectionMode} className="gap-2">
                    <CheckSquare className="w-4 h-4" />
                    Select Cases
                  </Button>
                  <ArrowDownUp className="w-4 h-4 text-muted-foreground" />
                  <Select value={sortBy} onValueChange={setSortBy}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Sort by..." />
                    </SelectTrigger>
                    <SelectContent className="bg-card z-50">
                      <SelectItem value="created_at">Newest First</SelectItem>
                      <SelectItem value="innocence_score">Innocence Score</SelectItem>
                      <SelectItem value="priority">Priority</SelectItem>
                    </SelectContent>
                  </Select>
                </>
              ) : (
                <div className="flex items-center gap-2 bg-primary/10 px-4 py-2 rounded-lg border border-primary/20">
                  <span className="text-sm font-medium">{selectedCases.size} selected</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    disabled={selectedCases.size === 0}
                    className="gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Selected
                  </Button>
                  <Button variant="ghost" size="sm" onClick={toggleSelectionMode} className="gap-2">
                    <X className="w-4 h-4" />
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
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
