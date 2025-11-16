import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Plus, Check, X, UserPlus, Shield } from "lucide-react";

interface Team {
  id: string;
  name: string;
  description: string | null;
  created_by: string;
  created_at: string;
  member_count?: number;
  user_membership?: TeamMembership | null;
}

interface TeamMembership {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
}

interface TeamMemberWithProfile {
  id: string;
  user_id: string;
  role: string;
  status: string;
  created_at: string;
  profiles: {
    email: string;
    full_name: string | null;
    avatar_url: string | null;
  };
}

export default function Team() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [allTeams, setAllTeams] = useState<Team[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMemberWithProfile[]>([]);
  const [pendingRequests, setPendingRequests] = useState<TeamMemberWithProfile[]>([]);
  
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamDescription, setNewTeamDescription] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      fetchAllTeams();
      fetchMyTeams();
    }
  }, [user]);

  useEffect(() => {
    if (selectedTeam) {
      fetchTeamMembers(selectedTeam.id);
      fetchPendingRequests(selectedTeam.id);
    }
  }, [selectedTeam]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);
    }
  };

  const fetchAllTeams = async () => {
    const { data: teams, error } = await supabase
      .from("teams")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching teams:", error);
      return;
    }

    const teamsWithInfo = await Promise.all(
      (teams || []).map(async (team) => {
        const { count } = await supabase
          .from("team_members")
          .select("*", { count: "exact", head: true })
          .eq("team_id", team.id)
          .eq("status", "approved");

        const { data: membership } = await supabase
          .from("team_members")
          .select("*")
          .eq("team_id", team.id)
          .eq("user_id", user?.id)
          .single();

        return {
          ...team,
          member_count: count || 0,
          user_membership: membership || null,
        };
      })
    );

    setAllTeams(teamsWithInfo);
  };

  const fetchMyTeams = async () => {
    const { data: memberships, error } = await supabase
      .from("team_members")
      .select(`
        *,
        teams(*)
      `)
      .eq("user_id", user?.id)
      .eq("status", "approved");

    if (error) {
      console.error("Error fetching my teams:", error);
      return;
    }

    const teams = (memberships || []).map((m: any) => ({
      ...m.teams,
      user_membership: m,
    }));

    setMyTeams(teams);
  };

  const fetchTeamMembers = async (teamId: string) => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", teamId)
      .eq("status", "approved")
      .order("created_at");

    if (error) {
      console.error("Error fetching team members:", error);
      return;
    }

    const membersWithProfiles = await Promise.all(
      (data || []).map(async (member) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name, avatar_url")
          .eq("id", member.user_id)
          .single();

        return {
          ...member,
          profiles: profile || { email: "", full_name: null, avatar_url: null },
        };
      })
    );

    setTeamMembers(membersWithProfiles);
  };

  const fetchPendingRequests = async (teamId: string) => {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq("team_id", teamId)
      .eq("status", "pending")
      .order("created_at");

    if (error) {
      console.error("Error fetching pending requests:", error);
      return;
    }

    const requestsWithProfiles = await Promise.all(
      (data || []).map(async (request) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("email, full_name, avatar_url")
          .eq("id", request.user_id)
          .single();

        return {
          ...request,
          profiles: profile || { email: "", full_name: null, avatar_url: null },
        };
      })
    );

    setPendingRequests(requestsWithProfiles);
  };

  const createTeam = async () => {
    if (!newTeamName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a team name",
        variant: "destructive",
      });
      return;
    }

    const { data, error } = await supabase
      .from("teams")
      .insert({
        name: newTeamName,
        description: newTeamDescription,
        created_by: user?.id,
      })
      .select()
      .single();

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Team created successfully!",
    });

    setNewTeamName("");
    setNewTeamDescription("");
    setCreateDialogOpen(false);
    fetchAllTeams();
    fetchMyTeams();
  };

  const joinTeam = async (teamId: string) => {
    const { error } = await supabase
      .from("team_members")
      .insert({
        team_id: teamId,
        user_id: user?.id,
        role: "member",
        status: "pending",
      });

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Join request sent! Waiting for admin approval.",
    });

    fetchAllTeams();
  };

  const approveRequest = async (membershipId: string) => {
    const { error } = await supabase
      .from("team_members")
      .update({ status: "approved" })
      .eq("id", membershipId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Member approved!",
    });

    fetchPendingRequests(selectedTeam!.id);
    fetchTeamMembers(selectedTeam!.id);
    fetchAllTeams();
  };

  const rejectRequest = async (membershipId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", membershipId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Request rejected",
    });

    fetchPendingRequests(selectedTeam!.id);
  };

  const removeMember = async (membershipId: string) => {
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("id", membershipId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Member removed",
    });

    fetchTeamMembers(selectedTeam!.id);
    fetchAllTeams();
  };

  const makeAdmin = async (membershipId: string) => {
    const { error } = await supabase
      .from("team_members")
      .update({ role: "admin" })
      .eq("id", membershipId);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Member promoted to admin",
    });

    fetchTeamMembers(selectedTeam!.id);
  };

  const isTeamAdmin = (team: Team | null) => {
    if (!team || !user) return false;
    return team.user_membership?.role === "admin" && team.user_membership?.status === "approved";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header user={user} />
      <div className="container mx-auto py-8 px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-foreground">Teams</h1>
            <p className="text-muted-foreground mt-2">Create or join teams to collaborate</p>
          </div>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create a New Team</DialogTitle>
                <DialogDescription>
                  Start a new team and invite members to collaborate
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Team Name</label>
                  <Input
                    value={newTeamName}
                    onChange={(e) => setNewTeamName(e.target.value)}
                    placeholder="e.g., Legal Team Alpha"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newTeamDescription}
                    onChange={(e) => setNewTeamDescription(e.target.value)}
                    placeholder="Brief description of the team's purpose..."
                  />
                </div>
                <Button onClick={createTeam} className="w-full">
                  Create Team
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="all" className="space-y-6">
          <TabsList>
            <TabsTrigger value="all">All Teams</TabsTrigger>
            <TabsTrigger value="my-teams">My Teams ({myTeams.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {allTeams.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No teams yet. Create the first one!</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allTeams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {team.name}
                        {team.user_membership?.role === "admin" && (
                          <Badge variant="secondary">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {team.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {team.member_count} {team.member_count === 1 ? "member" : "members"}
                        </span>
                        {!team.user_membership ? (
                          <Button size="sm" onClick={() => joinTeam(team.id)}>
                            <UserPlus className="mr-2 h-4 w-4" />
                            Join
                          </Button>
                        ) : team.user_membership.status === "pending" ? (
                          <Badge variant="outline">Pending</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedTeam(team)}
                          >
                            View
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="my-teams" className="space-y-4">
            {myTeams.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">You haven't joined any teams yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {myTeams.map((team) => (
                  <Card key={team.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        {team.name}
                        {team.user_membership?.role === "admin" && (
                          <Badge variant="secondary">
                            <Shield className="mr-1 h-3 w-3" />
                            Admin
                          </Badge>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {team.description || "No description"}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full"
                        onClick={() => setSelectedTeam(team)}
                      >
                        Manage Team
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <Dialog open={!!selectedTeam} onOpenChange={() => setSelectedTeam(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedTeam?.name}
                {isTeamAdmin(selectedTeam) && (
                  <Badge variant="secondary">
                    <Shield className="mr-1 h-3 w-3" />
                    Admin
                  </Badge>
                )}
              </DialogTitle>
              <DialogDescription>{selectedTeam?.description}</DialogDescription>
            </DialogHeader>

            <Tabs defaultValue="members" className="mt-4">
              <TabsList>
                <TabsTrigger value="members">
                  Members ({teamMembers.length})
                </TabsTrigger>
                {isTeamAdmin(selectedTeam) && (
                  <TabsTrigger value="pending">
                    Pending Requests ({pendingRequests.length})
                  </TabsTrigger>
                )}
              </TabsList>

              <TabsContent value="members" className="mt-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Member</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      {isTeamAdmin(selectedTeam) && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {teamMembers.map((member) => (
                      <TableRow key={member.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar>
                              <AvatarFallback>
                                {member.profiles.full_name?.[0] || member.profiles.email[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span>{member.profiles.full_name || "Unknown"}</span>
                          </div>
                        </TableCell>
                        <TableCell>{member.profiles.email}</TableCell>
                        <TableCell>
                          <Badge variant={member.role === "admin" ? "default" : "secondary"}>
                            {member.role}
                          </Badge>
                        </TableCell>
                        {isTeamAdmin(selectedTeam) && (
                          <TableCell>
                            <div className="flex gap-2">
                              {member.role !== "admin" && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => makeAdmin(member.id)}
                                >
                                  Make Admin
                                </Button>
                              )}
                              {member.user_id !== user?.id && (
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => removeMember(member.id)}
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TabsContent>

              {isTeamAdmin(selectedTeam) && (
                <TabsContent value="pending" className="mt-4">
                  {pendingRequests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No pending requests
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Requested</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {pendingRequests.map((request) => (
                          <TableRow key={request.id}>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Avatar>
                                  <AvatarFallback>
                                    {request.profiles.full_name?.[0] || request.profiles.email[0]}
                                  </AvatarFallback>
                                </Avatar>
                                <span>{request.profiles.full_name || "Unknown"}</span>
                              </div>
                            </TableCell>
                            <TableCell>{request.profiles.email}</TableCell>
                            <TableCell>
                              {new Date(request.created_at).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="default"
                                  onClick={() => approveRequest(request.id)}
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => rejectRequest(request.id)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>
              )}
            </Tabs>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
