import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
const authSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100)
});
const Auth = () => {
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [teams, setTeams] = useState<Array<{
    id: string;
    name: string;
  }>>([]);
  const [selectedTeam, setSelectedTeam] = useState<string>("");
  const [createTeam, setCreateTeam] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [showTeamStep, setShowTeamStep] = useState(false);
  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      if (session) {
        navigate("/");
      }
    });
    loadTeams();
  }, [navigate]);
  const loadTeams = async () => {
    const {
      data
    } = await supabase.from("teams").select("id, name").order("name");
    setTeams(data || []);
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = authSchema.parse({
        email,
        password
      });
      setLoading(true);
      const redirectUrl = `${window.location.origin}/`;
      const {
        error
      } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: redirectUrl
        }
      });
      if (error) {
        if (error.message.includes("User already registered")) {
          toast({
            title: "Account exists",
            description: "This email is already registered. Please sign in instead.",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Sign up failed",
            description: error.message,
            variant: "destructive"
          });
        }
      } else {
        // Check if there's a pending invite
        const pendingInvite = sessionStorage.getItem("pending_invite");
        if (pendingInvite) {
          sessionStorage.removeItem("pending_invite");
          navigate(`/invite?code=${pendingInvite}`);
        } else {
          setShowTeamStep(true);
          toast({
            title: "Account created!",
            description: "Now choose how to join a team."
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validated = authSchema.parse({
        email,
        password
      });
      setLoading(true);
      const {
        error
      } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password
      });
      if (error) {
        toast({
          title: "Sign in failed",
          description: error.message,
          variant: "destructive"
        });
      } else {
        // Check if there's a pending invite
        const pendingInvite = sessionStorage.getItem("pending_invite");
        if (pendingInvite) {
          sessionStorage.removeItem("pending_invite");
          navigate(`/invite?code=${pendingInvite}`);
        } else {
          navigate("/");
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation error",
          description: error.errors[0].message,
          variant: "destructive"
        });
      }
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-6">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Function Overview Section */}
        <div className="hidden lg:block space-y-6">
          <div className="space-y-4">
            
            <h1 className="text-4xl font-bold text-foreground">
              #JusticeLens
            </h1>
            <p className="text-xl text-muted-foreground">
              Parole Insight Analyzer
            </p>
            <p className="text-base text-muted-foreground leading-relaxed">
              Streamline your parole case analysis with AI-powered insights, commissioner bias detection, and collaborative team workflows.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">AI Analysis</h3>
                <p className="text-sm text-muted-foreground">Automated transcript analysis with innocence scoring and legal memo generation</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Bias Detection</h3>
                <p className="text-sm text-muted-foreground">Track and analyze commissioner bias patterns across cases</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-4 rounded-lg bg-card border border-border shadow-sm">
              <div className="w-10 h-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
                <Brain className="w-5 h-5 text-success" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground mb-1">Team Collaboration</h3>
                <p className="text-sm text-muted-foreground">Manage cases with your team using pipeline workflows and role-based access</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Form Section */}
        <Card className="w-full p-8 shadow-lg">
          <div className="lg:hidden flex items-center gap-3 mb-6 justify-center">
            <Brain className="w-8 h-8 text-primary" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">#JusticeLens</h1>
              <p className="text-sm text-muted-foreground">Parole Insight Analyzer</p>
            </div>
          </div>

          <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="signin">Sign In</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground">Email</label>
                <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="mt-1" />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">Password</label>
                <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="mt-1" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            {!showTeamStep ? <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-foreground">Email</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required className="mt-1" />
                </div>
                <div>
                  <label className="text-sm font-medium text-foreground">Password</label>
                  <Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required className="mt-1" minLength={6} />
                  <p className="text-xs text-muted-foreground mt-1">
                    Must be at least 6 characters
                  </p>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Creating account..." : "Sign Up"}
                </Button>
              </form> : <div className="space-y-4">
                <div className="text-center mb-4">
                  <h3 className="font-semibold text-lg">Join or Create a Team</h3>
                  <p className="text-sm text-muted-foreground">Teams help you collaborate on cases</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <Button variant={createTeam ? "default" : "outline"} onClick={() => setCreateTeam(true)}>
                    Create Team
                  </Button>
                  <Button variant={!createTeam ? "default" : "outline"} onClick={() => setCreateTeam(false)}>
                    Join Team
                  </Button>
                </div>

                {createTeam ? <div className="space-y-3">
                    <Input placeholder="Team Name" value={newTeamName} onChange={e => setNewTeamName(e.target.value)} />
                    <Button className="w-full" disabled={loading || !newTeamName} onClick={async () => {
                  setLoading(true);
                  try {
                    const {
                      data: {
                        user
                      }
                    } = await supabase.auth.getUser();
                    if (!user) throw new Error("Not authenticated");
                    const {
                      error
                    } = await supabase.from("teams").insert({
                      name: newTeamName,
                      created_by: user.id
                    });
                    if (error) throw error;
                    toast({
                      title: "Team created!",
                      description: "You've been added as admin."
                    });
                    navigate("/");
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message,
                      variant: "destructive"
                    });
                  } finally {
                    setLoading(false);
                  }
                }}>
                      Create Team
                    </Button>
                  </div> : <div className="space-y-3">
                    <select className="w-full px-3 py-2 rounded-md border border-input bg-background" value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)}>
                      <option value="">Select a team...</option>
                      {teams.map(team => <option key={team.id} value={team.id}>{team.name}</option>)}
                    </select>
                    <Button className="w-full" disabled={loading || !selectedTeam} onClick={async () => {
                  setLoading(true);
                  try {
                    const {
                      data: {
                        user
                      }
                    } = await supabase.auth.getUser();
                    if (!user) throw new Error("Not authenticated");
                    const {
                      error
                    } = await supabase.from("team_members").insert({
                      team_id: selectedTeam,
                      user_id: user.id,
                      role: "member",
                      status: "pending"
                    });
                    if (error) throw error;
                    toast({
                      title: "Request sent!",
                      description: "Waiting for admin approval."
                    });
                    navigate("/");
                  } catch (error: any) {
                    toast({
                      title: "Error",
                      description: error.message,
                      variant: "destructive"
                    });
                  } finally {
                    setLoading(false);
                  }
                }}>
                      Request to Join
                    </Button>
                  </div>}

                <Button variant="ghost" className="w-full mt-4" onClick={() => navigate("/")}>
                  Skip for now
                </Button>
              </div>}
          </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>;
};
export default Auth;