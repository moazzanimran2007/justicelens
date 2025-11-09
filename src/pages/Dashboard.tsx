import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  FileText, 
  Plus, 
  Users, 
  AlertCircle, 
  CheckCircle, 
  Clock,
  TrendingUp,
  Activity
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface DashboardStats {
  totalCases: number;
  processingCases: number;
  stageStats: Record<string, number>;
  highPriorityCases: number;
}

interface RecentCase {
  id: string;
  client_name: string | null;
  file_name: string;
  status: string;
  priority: string;
  created_at: string;
  stage: {
    name: string;
    color: string;
  } | null;
}

interface RecentActivity {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  user: {
    full_name: string | null;
    email: string;
  };
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    processingCases: 0,
    stageStats: {},
    highPriorityCases: 0,
  });
  const [stages, setStages] = useState<any[]>([]);
  const [recentCases, setRecentCases] = useState<RecentCase[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);
      await loadDashboardData(user.id);
    }
  };

  const loadDashboardData = async (userId: string) => {
    // Load profile
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    
    setProfile(profileData);

    // Load stages
    const { data: stagesData } = await supabase
      .from("pipeline_stages")
      .select("*")
      .order("display_order");

    if (stagesData) {
      setStages(stagesData);
    }

    // Load stats
    const { data: casesData } = await supabase
      .from("analyses")
      .select("status, priority, stage_id");

    if (casesData && stagesData) {
      const stageStats: Record<string, number> = {};
      stagesData.forEach(stage => {
        stageStats[stage.id] = casesData.filter(c => c.stage_id === stage.id).length;
      });

      setStats({
        totalCases: casesData.length,
        processingCases: casesData.filter(c => c.status === "pending" || c.status === "failed").length,
        stageStats,
        highPriorityCases: casesData.filter(c => c.priority === "high").length,
      });
    }

    // Load recent cases with stage info
    const { data: recentCasesData } = await supabase
      .from("analyses")
      .select(`
        id, 
        client_name, 
        file_name, 
        status, 
        priority, 
        created_at,
        stage:pipeline_stages(name, color)
      `)
      .order("created_at", { ascending: false })
      .limit(5);

    if (recentCasesData) {
      setRecentCases(recentCasesData.map(c => ({
        ...c,
        stage: Array.isArray(c.stage) ? c.stage[0] : c.stage
      })));
    }

    // Load recent activity
    const { data: activityData } = await supabase
      .from("case_activities")
      .select(`
        id,
        activity_type,
        description,
        created_at,
        user_id
      `)
      .order("created_at", { ascending: false })
      .limit(8);

    if (activityData) {
      // Fetch user info for each activity
      const userIds = [...new Set(activityData.map(a => a.user_id))];
      const { data: usersData } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);

      const usersMap = new Map(usersData?.map(u => [u.id, u]) || []);
      
      setRecentActivity(
        activityData.map(a => ({
          ...a,
          user: usersMap.get(a.user_id) || { full_name: null, email: "Unknown" },
        }))
      );
    }
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, "destructive" | "default" | "secondary"> = {
      high: "destructive",
      medium: "default",
      low: "secondary",
    };
    return <Badge variant={variants[priority] || "default"}>{priority}</Badge>;
  };

  const getStageBadge = (stage: { name: string; color: string } | null) => {
    if (!stage) return <Badge variant="outline">No Stage</Badge>;
    return (
      <Badge 
        variant="outline" 
        style={{ 
          borderColor: stage.color, 
          color: stage.color,
          backgroundColor: `${stage.color}20`
        }}
      >
        {stage.name}
      </Badge>
    );
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Header user={user} />

      <main className="container mx-auto px-6 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-2">
            <Avatar className="h-16 w-16">
              <AvatarImage src={profile?.avatar_url} />
              <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                {profile?.full_name?.[0] || user.email[0].toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                Welcome back, {profile?.full_name || user.email.split('@')[0]}!
              </h1>
              <p className="text-muted-foreground">
                {profile?.job_title && `${profile.job_title} • `}
                {profile?.team_name || "JusticeLens"}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Cases
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCases}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Processing
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-warning">{stats.processingCases}</div>
            </CardContent>
          </Card>

          {stages.slice(0, 2).map((stage) => (
            <Card key={stage.id}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stage.name}
                </CardTitle>
                <div 
                  className="h-4 w-4 rounded-full" 
                  style={{ backgroundColor: stage.color }}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.stageStats[stage.id] || 0}</div>
              </CardContent>
            </Card>
          ))}

          {stages.length < 2 && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  High Priority
                </CardTitle>
                <AlertCircle className="h-4 w-4 text-destructive" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-destructive">{stats.highPriorityCases}</div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Quick Actions */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Button onClick={() => navigate("/new-case")} className="gap-2">
              <Plus className="h-4 w-4" />
              New Case
            </Button>
            <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
              <FileText className="h-4 w-4" />
              View Pipeline
            </Button>
            <Button variant="outline" onClick={() => navigate("/team")} className="gap-2">
              <Users className="h-4 w-4" />
              Manage Team
            </Button>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Recent Cases */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Recent Cases
              </CardTitle>
              <CardDescription>Your latest case submissions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCases.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No cases yet. Create your first case to get started.
                  </p>
                ) : (
                  recentCases.map((case_) => (
                    <div
                      key={case_.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/case/${case_.id}`)}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {case_.client_name || case_.file_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(case_.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(case_.priority)}
                        {getStageBadge(case_.stage)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
              <CardDescription>Latest updates across all cases</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivity.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No activity yet.
                  </p>
                ) : (
                  recentActivity.map((activity) => (
                    <div key={activity.id} className="flex gap-3 pb-3 border-b border-border last:border-0">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{activity.description}</p>
                        <p className="text-xs text-muted-foreground">
                          by {activity.user.full_name || activity.user.email.split('@')[0]} •{" "}
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
