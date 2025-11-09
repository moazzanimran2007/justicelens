import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Pencil, Check, X, Shield, Upload } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [memberCases, setMemberCases] = useState<CaseInfo[]>([]);
  const [teamStats, setTeamStats] = useState({
    totalCases: 0,
    totalUrgent: 0,
    totalHigh: 0,
    avgCasesPerMember: 0,
  });
  const [teamSettings, setTeamSettings] = useState({
    id: "",
    team_name: "Justice Team",
    team_icon: "⚖️",
    logo_url: null as string | null,
  });
  const [editingTeamSettings, setEditingTeamSettings] = useState(false);
  const [editingTeamSettingsName, setEditingTeamSettingsName] = useState("");
  const [editingTeamSettingsIcon, setEditingTeamSettingsIcon] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
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
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);

      // Check if user is admin
      const { data: rolesData } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      setIsAdmin(rolesData?.some((r) => r.role === "admin") || false);
    }
  };
  const fetchTeamData = async () => {
    // Get all profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name, nickname, job_title, team_name, bio, avatar_url")
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
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("assigned_to", profile.id);
        const { count: highPriorityCount } = await supabase
          .from("analyses")
          .select("*", {
            count: "exact",
            head: true,
          })
          .eq("assigned_to", profile.id)
          .eq("priority", "high");
        const { count: urgentCount } = await supabase
          .from("analyses")
          .select("*", {
            count: "exact",
            head: true,
          })
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
    const { count: allCasesCount } = await supabase.from("analyses").select("*", {
      count: "exact",
      head: true,
    });
    const { count: allHighCount } = await supabase
      .from("analyses")
      .select("*", {
        count: "exact",
        head: true,
      })
      .eq("priority", "high");
    const { count: allUrgentCount } = await supabase
      .from("analyses")
      .select("*", {
        count: "exact",
        head: true,
      })
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
      .order("created_at", {
        ascending: false,
      });
    if (!error && data) {
      setMemberCases(data);
    }
  };
  const fetchTeamSettings = async () => {
    const { data, error } = await supabase.from("team_settings").select("*").maybeSingle();
    if (!error && data) {
      setTeamSettings({
        id: data.id,
        team_name: data.team_name,
        team_icon: data.team_icon,
        logo_url: data.logo_url,
      });
    }
  };
  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Error",
        description: "Please upload an image file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "File size must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    setUploadingLogo(true);
    try {
      // Delete old logo if exists
      if (teamSettings.logo_url) {
        const oldPath = teamSettings.logo_url.split("/").pop();
        if (oldPath) {
          await supabase.storage.from("team-logos").remove([oldPath]);
        }
      }

      // Upload new logo
      const fileExt = file.name.split(".").pop();
      const fileName = `team-logo-${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("team-logos").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from("team-logos").getPublicUrl(fileName);

      // Update team settings
      const { error: updateError } = await supabase
        .from("team_settings")
        .update({
          logo_url: publicUrl,
        })
        .eq("id", teamSettings.id);
      if (updateError) throw updateError;
      toast({
        title: "Success",
        description: "Team logo updated successfully",
      });
      fetchTeamSettings();
    } catch (error: any) {
      console.error("Error uploading logo:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to upload logo",
        variant: "destructive",
      });
    } finally {
      setUploadingLogo(false);
    }
  };
  const handleRemoveLogo = async () => {
    if (!teamSettings.logo_url) return;
    try {
      // Delete from storage
      const path = teamSettings.logo_url.split("/").pop();
      if (path) {
        await supabase.storage.from("team-logos").remove([path]);
      }

      // Update team settings
      const { error } = await supabase
        .from("team_settings")
        .update({
          logo_url: null,
        })
        .eq("id", teamSettings.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Team logo removed",
      });
      fetchTeamSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
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
          team_icon: editingTeamSettingsIcon,
        })
        .eq("id", teamSettings.id);
      if (error) throw error;
      toast({
        title: "Success",
        description: "Team settings updated",
      });
      handleCancelEditTeamSettings();
      fetchTeamSettings();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
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
  const handleAddRole = async (memberId: string, role: "admin" | "investigator" | "attorney" | "advocate") => {
    try {
      const { error } = await supabase.from("user_roles").insert({
        user_id: memberId,
        role: role as any,
      });
      if (error) throw error;
      toast({
        title: "Success",
        description: `Role '${role}' added`,
      });
      fetchTeamData();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };
  const handleRemoveRole = async (memberId: string, role: "admin" | "investigator" | "attorney" | "advocate") => {
    try {
      const { error } = await supabase.from("user_roles").delete().eq("user_id", memberId).eq("role", role);
      if (error) throw error;
      toast({
        title: "Success",
        description: `Role '${role}' removed`,
      });
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
                    {teamSettings.logo_url ? (
                      <div className="relative group">
                        <img
                          src={teamSettings.logo_url}
                          alt="Team Logo"
                          className="w-16 h-16 object-contain rounded-lg border border-border"
                        />
                        {isAdmin && (
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center gap-1">
                            <label htmlFor="logo-upload" className="cursor-pointer">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 text-white hover:text-white"
                                asChild
                              >
                                <span>
                                  <Upload className="h-3 w-3" />
                                </span>
                              </Button>
                            </label>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-white hover:text-white"
                              onClick={handleRemoveLogo}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="relative group">
                        <div className="text-4xl">{teamSettings.team_icon}</div>
                        {isAdmin && (
                          <label
                            htmlFor="logo-upload"
                            className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center cursor-pointer"
                          >
                            <Upload className="h-5 w-5 text-white" />
                          </label>
                        )}
                      </div>
                    )}
                    <input
                      id="logo-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleLogoUpload}
                      disabled={!isAdmin || uploadingLogo}
                    />
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
              <p className="text-xs text-muted-foreground mt-1">Cases you have access to</p>
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
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Team Members</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Click on a member to view their cases</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {teamMembers.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-4 p-4 rounded-lg border transition-colors cursor-pointer hover:bg-accent/50 ${selectedMember === member.id ? "border-primary bg-primary/5" : "border-border"}`}
                  onClick={() => setSelectedMember(member.id)}
                >
                  {/* Avatar */}
                  <Avatar className="w-12 h-12">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {getInitials(member.full_name, member.email)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Name and Role */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-sm truncate">{member.full_name || member.email}</h4>
                      {isAdmin && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Shield className="h-3 w-3" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent onClick={(e) => e.stopPropagation()}>
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
                                  {member.roles.length === 0 ? (
                                    <Badge variant="outline">No roles assigned</Badge>
                                  ) : (
                                    member.roles.map((role) => (
                                      <Badge key={role} variant="secondary" className="flex items-center gap-1">
                                        {role}
                                        <X
                                          className="h-3 w-3 cursor-pointer"
                                          onClick={() => handleRemoveRole(member.id, role as any)}
                                        />
                                      </Badge>
                                    ))
                                  )}
                                </div>
                              </div>
                              <div>
                                <p className="text-sm font-medium mb-2">Add Role:</p>
                                <Select onValueChange={(role) => handleAddRole(member.id, role as any)}>
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
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {member.roles.length > 0 ? (
                        member.roles.map((role) => (
                          <Badge key={role} variant="outline" className="text-xs">
                            {role}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-xs text-muted-foreground">No role assigned</span>
                      )}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-6 text-sm">
                    <div className="text-center">
                      <p className="font-bold text-lg">{member.case_count}</p>
                      <p className="text-xs text-muted-foreground">Total</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg text-orange-600">{member.high_priority_count}</p>
                      <p className="text-xs text-muted-foreground">High</p>
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-lg text-red-600">{member.urgent_count}</p>
                      <p className="text-xs text-muted-foreground">Urgent</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {selectedMember && (
          <Card className="mt-6">
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
