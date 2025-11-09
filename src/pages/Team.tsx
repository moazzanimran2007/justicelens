import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Check, X, Shield, UserCog, Users as UsersIcon } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
interface TeamMember {
  id: string;
  email: string;
  full_name: string | null;
  nickname: string | null;
  job_title: string | null;
  team_name: string | null;
  bio: string | null;
  avatar_url: string | null;
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
  const {
    toast
  } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberCases, setMemberCases] = useState<CaseInfo[]>([]);
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingNickname, setEditingNickname] = useState("");
  const [editingJobTitle, setEditingJobTitle] = useState("");
  const [editingTeamName, setEditingTeamName] = useState("");
  const [editingBio, setEditingBio] = useState("");
  const [managingRolesMemberId, setManagingRolesMemberId] = useState<string | null>(null);
  const [teamStats, setTeamStats] = useState({
    totalCases: 0,
    totalUrgent: 0,
    totalHigh: 0,
    avgCasesPerMember: 0
  });
  const [teamSettings, setTeamSettings] = useState({
    id: "",
    team_name: "Justice Team",
    team_icon: "⚖️"
  });
  const [editingTeamSettings, setEditingTeamSettings] = useState(false);
  const [editingTeamSettingsName, setEditingTeamSettingsName] = useState("");
  const [editingTeamSettingsIcon, setEditingTeamSettingsIcon] = useState("");
  useEffect(() => {
    checkAuth();
    fetchTeamData();
    fetchTeamSettings();
  }, []);
  useEffect(() => {
    if (selectedMember) {
      fetchMemberCases(selectedMember);
    }
  }, [selectedMember]);
  const checkAuth = async () => {
    const {
      data: {
        user
      }
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);

      // Check if user is admin
      const {
        data: rolesData
      } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin(rolesData?.some(r => r.role === "admin") || false);
    }
  };
  const fetchTeamData = async () => {
    // Get all profiles
    const {
      data: profiles,
      error: profilesError
    } = await supabase.from("profiles").select("id, email, full_name, nickname, job_title, team_name, bio, avatar_url").order("full_name");
    if (profilesError || !profiles) return;

    // Get roles for all users
    const {
      data: rolesData
    } = await supabase.from("user_roles").select("user_id, role");
    const rolesByUser = (rolesData || []).reduce((acc, {
      user_id,
      role
    }) => {
      if (!acc[user_id]) acc[user_id] = [];
      acc[user_id].push(role);
      return acc;
    }, {} as Record<string, string[]>);

    // Get case counts for each member
    const membersWithCounts = await Promise.all(profiles.map(async profile => {
      const {
        count: totalCount
      } = await supabase.from("analyses").select("*", {
        count: "exact",
        head: true
      }).eq("assigned_to", profile.id);
      const {
        count: highPriorityCount
      } = await supabase.from("analyses").select("*", {
        count: "exact",
        head: true
      }).eq("assigned_to", profile.id).eq("priority", "high");
      const {
        count: urgentCount
      } = await supabase.from("analyses").select("*", {
        count: "exact",
        head: true
      }).eq("assigned_to", profile.id).eq("priority", "urgent");
      return {
        ...profile,
        case_count: totalCount || 0,
        high_priority_count: highPriorityCount || 0,
        urgent_count: urgentCount || 0,
        roles: rolesByUser[profile.id] || []
      };
    }));
    setTeamMembers(membersWithCounts);

    // Get ALL cases in the system (not just assigned ones)
    const {
      count: allCasesCount
    } = await supabase.from("analyses").select("*", {
      count: "exact",
      head: true
    });
    const {
      count: allHighCount
    } = await supabase.from("analyses").select("*", {
      count: "exact",
      head: true
    }).eq("priority", "high");
    const {
      count: allUrgentCount
    } = await supabase.from("analyses").select("*", {
      count: "exact",
      head: true
    }).eq("priority", "urgent");
    setTeamStats({
      totalCases: allCasesCount || 0,
      totalUrgent: allUrgentCount || 0,
      totalHigh: allHighCount || 0,
      avgCasesPerMember: membersWithCounts.length > 0 ? Math.round((allCasesCount || 0) / membersWithCounts.length) : 0
    });
  };
  const fetchMemberCases = async (memberId: string) => {
    const {
      data,
      error
    } = await supabase.from("analyses").select("id, client_name, file_name, priority, status, created_at").eq("assigned_to", memberId).order("created_at", {
      ascending: false
    });
    if (!error && data) {
      setMemberCases(data);
    }
  };

  const fetchTeamSettings = async () => {
    const { data, error } = await supabase
      .from("team_settings")
      .select("*")
      .maybeSingle();
    
    if (!error && data) {
      setTeamSettings({
        id: data.id,
        team_name: data.team_name,
        team_icon: data.team_icon
      });
    }
  };

  const handleStartEditTeamSettings = () => {
    setEditingTeamSettings(true);
    setEditingTeamSettingsName(teamSettings.team_name);
    setEditingTeamSettingsIcon(teamSettings.team_icon);
  };

  const handleCancelEditTeamSettings = () => {
    setEditingTeamSettings(false);
    setEditingTeamSettingsName("");
    setEditingTeamSettingsIcon("");
  };

  const handleSaveTeamSettings = async () => {
    try {
      const { error } = await supabase
        .from("team_settings")
        .update({
          team_name: editingTeamSettingsName,
          team_icon: editingTeamSettingsIcon
        })
        .eq("id", teamSettings.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Team settings updated"
      });

      handleCancelEditTeamSettings();
      fetchTeamSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const getInitials = (name: string | null, email: string) => {
    if (name) {
      return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
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
  const handleStartEdit = (member: TeamMember) => {
    setEditingMemberId(member.id);
    setEditingName(member.full_name || "");
    setEditingNickname(member.nickname || "");
    setEditingJobTitle(member.job_title || "");
    setEditingTeamName(member.team_name || "");
    setEditingBio(member.bio || "");
  };
  const handleCancelEdit = () => {
    setEditingMemberId(null);
    setEditingName("");
    setEditingNickname("");
    setEditingJobTitle("");
    setEditingTeamName("");
    setEditingBio("");
  };
  const handleSaveEdit = async (memberId: string) => {
    try {
      const {
        error
      } = await supabase.from("profiles").update({
        full_name: editingName || null,
        nickname: editingNickname || null,
        job_title: editingJobTitle || null,
        team_name: editingTeamName || null,
        bio: editingBio || null
      }).eq("id", memberId);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Team member information updated"
      });
      handleCancelEdit();
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleAddRole = async (memberId: string, role: "admin" | "investigator" | "attorney" | "advocate") => {
    try {
      const {
        error
      } = await supabase.from("user_roles").insert({
        user_id: memberId,
        role: role as any
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: `Role '${role}' added`
      });
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  const handleRemoveRole = async (memberId: string, role: "admin" | "investigator" | "attorney" | "advocate") => {
    try {
      const {
        error
      } = await supabase.from("user_roles").delete().eq("user_id", memberId).eq("role", role);
      if (error) throw error;
      toast({
        title: "Success",
        description: `Role '${role}' removed`
      });
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive"
      });
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Header user={user} />

      <main className="container mx-auto px-4 py-6">
        {/* Team Header Section */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {editingTeamSettings ? (
                  <div className="flex items-center gap-3">
                    <Input
                      value={editingTeamSettingsIcon}
                      onChange={(e) => setEditingTeamSettingsIcon(e.target.value)}
                      placeholder="Icon"
                      className="w-20 text-2xl text-center"
                      maxLength={2}
                    />
                    <Input
                      value={editingTeamSettingsName}
                      onChange={(e) => setEditingTeamSettingsName(e.target.value)}
                      placeholder="Team Name"
                      className="text-2xl font-bold"
                    />
                    <Button size="sm" onClick={handleSaveTeamSettings}>
                      <Check className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleCancelEditTeamSettings}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="text-4xl">{teamSettings.team_icon}</div>
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        {teamSettings.team_name}
                        {isAdmin && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={handleStartEditTeamSettings}
                          >
                            <Pencil className="h-3 w-3" />
                          </Button>
                        )}
                      </h2>
                      <p className="text-sm text-muted-foreground">View team members and their workload distribution</p>
                    </div>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

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
                {teamStats.totalCases > 0 ? Math.round(teamStats.totalHigh / teamStats.totalCases * 100) : 0}% of
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
                {teamStats.totalCases > 0 ? Math.round(teamStats.totalUrgent / teamStats.totalCases * 100) : 0}% of
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
          {teamMembers.map(member => <Card key={member.id} className={`cursor-pointer transition-colors hover:border-primary ${selectedMember === member.id ? "border-primary bg-primary/5" : ""}`} onClick={() => setSelectedMember(member.id)}>
              <CardHeader className="flex flex-row items-center gap-4 pb-3">
                <Avatar>
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {getInitials(member.full_name, member.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {editingMemberId === member.id ? <div className="flex flex-col gap-2 flex-1" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-2">
                          <Input value={editingName} onChange={e => setEditingName(e.target.value)} placeholder="Full Name" className="h-8 text-sm" />
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={e => {
                      e.stopPropagation();
                      handleSaveEdit(member.id);
                    }}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={e => {
                      e.stopPropagation();
                      handleCancelEdit();
                    }}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input value={editingNickname} onChange={e => setEditingNickname(e.target.value)} placeholder="Nickname" className="h-8 text-sm" />
                        <Input value={editingJobTitle} onChange={e => setEditingJobTitle(e.target.value)} placeholder="Job Title" className="h-8 text-sm" />
                        
                        
                      </div> : <>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="flex-1">
                              <CardTitle className="text-base truncate">
                                {member.nickname ? `${member.nickname} (${member.full_name || member.email})` : member.full_name || member.email}
                              </CardTitle>
                              {member.job_title && <p className="text-xs text-muted-foreground">{member.job_title}</p>}
                              {member.team_name && <Badge variant="outline" className="text-xs mt-1">
                                  {member.team_name}
                                </Badge>}
                            </div>
                            {isAdmin && <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => {
                          e.stopPropagation();
                          handleStartEdit(member);
                        }}>
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Button size="sm" variant="ghost" className="h-6 w-6 p-0" onClick={e => e.stopPropagation()}>
                                      <Shield className="h-3 w-3" />
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent onClick={e => e.stopPropagation()}>
                                    <DialogHeader>
                                      <DialogTitle>Manage Roles</DialogTitle>
                                      <DialogDescription>
                                        Assign or remove roles for {member.full_name || member.email}
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4">
                                      <div>
                                        <p className="text-sm font-medium mb-2">Current Roles:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {member.roles.length === 0 ? <Badge variant="outline">No roles assigned</Badge> : member.roles.map(role => <Badge key={role} variant="secondary" className="flex items-center gap-1">
                                                {role}
                                                <X className="h-3 w-3 cursor-pointer" onClick={() => handleRemoveRole(member.id, role as any)} />
                                              </Badge>)}
                                        </div>
                                      </div>
                                      <div>
                                        <p className="text-sm font-medium mb-2">Add Role:</p>
                                        <Select onValueChange={role => handleAddRole(member.id, role as any)}>
                                          <SelectTrigger>
                                            <SelectValue placeholder="Select a role" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="admin">Admin</SelectItem>
                                            <SelectItem value="attorney">Attorney</SelectItem>
                                            <SelectItem value="investigator">Investigator</SelectItem>
                                            <SelectItem value="advocate">Advocate</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </div>}
                          </div>
                        </div>
                      </>}
                  </div>
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
            </Card>)}
        </div>

        {selectedMember && <Card>
            <CardHeader>
              <CardTitle>
                Cases for{" "}
                {teamMembers.find(m => m.id === selectedMember)?.full_name || teamMembers.find(m => m.id === selectedMember)?.email}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {memberCases.length === 0 ? <p className="text-center text-muted-foreground py-8">No cases assigned</p> : <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Case Name</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {memberCases.map(case_ => <TableRow key={case_.id} className="cursor-pointer" onClick={() => navigate("/")}>
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
                      </TableRow>)}
                  </TableBody>
                </Table>}
            </CardContent>
          </Card>}
      </main>
    </div>;
}