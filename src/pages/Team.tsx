import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Check, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";

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
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberCases, setMemberCases] = useState<CaseInfo[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [teamStats, setTeamStats] = useState({
    totalCases: 0,
    totalUrgent: 0,
    totalHigh: 0,
    avgCasesPerMember: 0,
  });

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
      
      // Check if user is admin
      const { data: rolesData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      
      setIsAdmin(rolesData?.some(r => r.role === "admin") || false);
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
    const { data: rolesData } = await supabase.from("user_roles").select("user_id, role");

    const rolesByUser = (rolesData || []).reduce(
      (acc, { user_id, role }) => {
        if (!acc[user_id]) acc[user_id] = [];
        acc[user_id].push(role);
        return acc;
      },
      {} as Record<string, string[]>,
    );

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
      }),
    );

    setTeamMembers(membersWithCounts);

    // Get ALL cases in the system (not just assigned ones)
    const { count: allCasesCount } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true });

    const { count: allHighCount } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true })
      .eq("priority", "high");

    const { count: allUrgentCount } = await supabase
      .from("analyses")
      .select("*", { count: "exact", head: true })
      .eq("priority", "urgent");

    setTeamStats({
      totalCases: allCasesCount || 0,
      totalUrgent: allUrgentCount || 0,
      totalHigh: allHighCount || 0,
      avgCasesPerMember: membersWithCounts.length > 0 ? Math.round((allCasesCount || 0) / membersWithCounts.length) : 0,
    });
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

  const handleStartEdit = (memberId: string, currentName: string | null, email: string) => {
    setEditingMemberId(memberId);
    setEditingName(currentName || email);
  };

  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditingName("");
  };

  const handleSaveEdit = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: editingName })
        .eq("id", memberId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team member name updated",
      });

      setEditingMemberId(null);
      setEditingName("");
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Header user={user} />

      <main className="container mx-auto px-4 py-6">
        <div className="mb-6">
          <h2 className="text-2xl font-semibold mb-2">Team Dashboard</h2>
          <p className="text-sm text-muted-foreground">View team members and their workload distribution</p>
        </div>

        {/* Team Statistics Overview */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm font-medium text-muted-foreground">Team Size</p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{teamMembers.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Active members</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm font-medium text-muted-foreground">Total Cases</p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{teamStats.totalCases}</div>
              <p className="text-xs text-muted-foreground mt-1">~{teamStats.avgCasesPerMember} per member</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm font-medium text-muted-foreground">High Priority</p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-orange-600">{teamStats.totalHigh}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {teamStats.totalCases > 0 ? Math.round((teamStats.totalHigh / teamStats.totalCases) * 100) : 0}% of
                total
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <p className="text-sm font-medium text-muted-foreground">Urgent</p>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{teamStats.totalUrgent}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {teamStats.totalCases > 0 ? Math.round((teamStats.totalUrgent / teamStats.totalCases) * 100) : 0}% of
                total
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Team Members Section */}
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Team Members</h3>
          <p className="text-sm text-muted-foreground">Click on a member to view their cases</p>
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
                    {editingMemberId === member.id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <Input
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          className="h-8 text-sm"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSaveEdit(member.id);
                          }}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 w-8 p-0"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCancelEdit();
                          }}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <>
                        <CardTitle className="text-base truncate">{member.full_name || member.email}</CardTitle>
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartEdit(member.id, member.full_name, member.email);
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                        {member.roles.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            {member.roles.join(", ")}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                  {member.full_name && editingMemberId !== member.id && (
                    <p className="text-xs text-muted-foreground truncate">{member.email}</p>
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
                    <p className="text-2xl font-bold text-orange-600">{member.high_priority_count}</p>
                    <p className="text-xs text-muted-foreground">High</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-600">{member.urgent_count}</p>
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
                <p className="text-center text-muted-foreground py-8">No cases assigned</p>
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
                      <TableRow key={case_.id} className="cursor-pointer" onClick={() => navigate("/")}>
                        <TableCell className="font-medium">{case_.client_name || case_.file_name}</TableCell>
                        <TableCell>
                          <Badge variant={getPriorityColor(case_.priority)}>{case_.priority}</Badge>
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
