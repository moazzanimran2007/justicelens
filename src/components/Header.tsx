import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Brain, LayoutDashboard, Users, FileText, LogOut, MessageSquare, Scale } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import { User } from "@supabase/supabase-js";
interface HeaderProps {
  user: User | null;
}
export const Header = ({
  user
}: HeaderProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };
  const isActive = (path: string) => location.pathname === path;
  return <header className="border-b border-border bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-6 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            
            <div>
              <h1 className="text-2xl font-bold text-foreground">#JusticeLens</h1>
              <p className="text-sm text-muted-foreground">Parole Insight Analyzer</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button variant={isActive("/") ? "secondary" : "ghost"} size="sm" onClick={() => navigate("/")} className="gap-2">
              <LayoutDashboard className="w-4 h-4" />
              Pipeline
            </Button>
            <Button variant={isActive("/new-case") ? "secondary" : "ghost"} size="sm" onClick={() => navigate("/new-case")} className="gap-2">
              <FileText className="w-4 h-4" />
              New Case
            </Button>
            <Button variant={isActive("/chatbot") ? "secondary" : "ghost"} size="sm" onClick={() => navigate("/chatbot")} className="gap-2">
              <MessageSquare className="w-4 h-4" />
              AI Assistant
            </Button>
            <Button variant={isActive("/commissioners") ? "secondary" : "ghost"} size="sm" onClick={() => navigate("/commissioners")} className="gap-2">
              <Scale className="w-4 h-4" />
              Commissioners
            </Button>
            <Button variant={isActive("/team") ? "secondary" : "ghost"} size="sm" onClick={() => navigate("/team")} className="gap-2">
              <Users className="w-4 h-4" />
              Team
            </Button>
            <NotificationBell />
            <Button variant="ghost" size="sm" onClick={() => navigate("/profile")} className="text-sm font-medium text-foreground hover:text-primary">
              {user?.email}
            </Button>
            <Button variant="outline" size="sm" onClick={handleSignOut} className="gap-2">
              <LogOut className="w-4 h-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>
    </header>;
};