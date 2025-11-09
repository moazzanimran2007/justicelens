import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { LogOut, Upload, LayoutDashboard, Users } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";

interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  case_count: number;
  high_priority_count: number;
  urgent_count: number;
  roles: string[];
}

interface CaseInfo {
  id: string;
  client_name: string | null;
  file_name: string;
  priority: string;
  status: string;
  created_at: string;
}

export default function Team() {
  const navigate = useNavigate();
  const [user, setUser] = useState<any>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberCases, setMemberCases] = useState<CaseInfo[]>([]);

  useEffect(() => {
    checkAuth();
    fetchTeamData();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      fetchMemberCases(selectedMember);
    }
  }, [selectedMember]);

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

  const fetchTeamData = async () => {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .order("full_name");

    if (profilesError || !profiles) return;

    // Get roles for all users
    const { data: rolesData } = await supabase
      .from("user_roles")
      .select("user_id, role");

    const rolesByUser = (rolesData || []).reduce((acc, { user_id, role }) => {
      if (!acc[user_id]) acc[user_id] = [];
      acc[user_id].push(role);
      return acc;
    }, {} as Record<string, string[]>);

    // Get case counts for each member
    const membersWithCounts = await Promise.all(
      profiles.map(async (profile) => {
        const { count: totalCount } = await supabase
          .from("analyses")
          .select("*", { count: "exact", head: true })
          .eq("assigned_to", profile.id);

        const { count: highPriorityCount } = await supabase
          .from("analyses")
          .select("*", { count: "exact", head: true })
          .eq("assigned_to", profile.id)
          .eq("priority", "high");

        const { count: urgentCount } = await supabase
          .from("analyses")
          .select("*", { count: "exact", head: true })
          .eq("assigned_to", profile.id)
          .eq("priority", "urgent");

        return {
          ...profile,
          case_count: totalCount || 0,
          high_priority_count: highPriorityCount || 0,
          urgent_count: urgentCount || 0,
          roles: rolesByUser[profile.id] || [],
        };
      })
    );

    setTeamMembers(membersWithCounts);
  };

  const fetchMemberCases = async (memberId: string) => {
    const { data, error } = await supabase
      .from("analyses")
      .select("id, client_name, file_name, priority, status, created_at")
      .eq("assigned_to", memberId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMemberCases(data);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
    }
    return email.slice(0, 2).toUpperCase();
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "destructive";
      case "high":
        return "default";
      case "medium":
        return "secondary";
      default:
        return "outline";
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
                <Button variant="ghost" size="sm" onClick={() => navigate("/new-case")}>
                  <Upload className="w-4 h-4 mr-2" />
                  New Case
                </Button>
                <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
                  <LayoutDashboard className="w-4 h-4 mr-2" />
                  Pipeline
                </Button>
                <Button variant="ghost" size="sm">
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
          <h2 className="text-2xl font-semibold mb-2">Team Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            View team members and their workload distribution
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-6">
          {teamMembers.map((member) => (
            <Card
              key={member.id}
              className={`cursor-pointer transition-colors hover:border-primary ${
                selectedMember === member.id ? "border-primary bg-primary/5" : ""
              }`}
              onClick={() => setSelectedMember(member.id)}
            >
              <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(member.full_name, member.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base truncate">
                      {member.full_name || member.email}
                    </CardTitle>
                    {member.roles.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {member.roles[0]}
                      </Badge>
                    )}
                  </div>
                  {member.full_name && (
                    <p className="text-xs text-muted-foreground truncate">
                      {member.email}
                    </p>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-2xl font-bold">{member.case_count}</p>
                    <p className="text-xs text-muted-foreground">Total Cases</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-orange-600">
                      {member.high_priority_count}
                    </p>
                    <p className="text-xs text-muted-foreground">High</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">
                      {member.urgent_count}
                    </p>
                    <p className="text-xs text-muted-foreground">Urgent</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {selectedMember && (
          <Card>
            <CardHeader>
              <CardTitle>
                Cases for{" "}
                {teamMembers.find((m) => m.id === selectedMember)?.full_name ||
                  teamMembers.find((m) => m.id === selectedMember)?.email}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {memberCases.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No cases assigned
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberCases.map((case_) => (
                      <TableRow
                        key={case_.id}
                        className="cursor-pointer"
                        onClick={() => navigate("/")}
                      >
                        <TableCell className="font-medium">
                          {case_.client_name || case_.file_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(case_.priority)}>
                            {case_.priority}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{case_.status}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {new Date(case_.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
