import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Brain, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AcceptInvite = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<any>(null);
  const [teamName, setTeamName] = useState("");
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAuthAndLoadInvite();
  }, []);

  const checkAuthAndLoadInvite = async () => {
    const inviteCode = searchParams.get("code");
    
    if (!inviteCode) {
      toast({
        title: "Invalid invite",
        description: "No invitation code provided",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);

    // Load invitation details
    const { data: inviteData, error: inviteError } = await supabase
      .from("team_invitations")
      .select("*")
      .eq("invite_code", inviteCode)
      .eq("status", "active")
      .single();

    if (inviteError || !inviteData) {
      toast({
        title: "Invalid invite",
        description: "This invitation link is invalid or has expired",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Check if invitation has expired
    if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
      toast({
        title: "Invite expired",
        description: "This invitation has expired",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    // Check if max uses reached
    if (inviteData.max_uses && inviteData.uses_count >= inviteData.max_uses) {
      toast({
        title: "Invite no longer available",
        description: "This invitation has reached its maximum uses",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    setInvitation(inviteData);

    // Load team name
    const { data: teamData } = await supabase
      .from("teams")
      .select("name")
      .eq("id", inviteData.team_id)
      .single();

    if (teamData) {
      setTeamName(teamData.name);
    }

    setLoading(false);
  };

  const handleAcceptInvite = async () => {
    if (!user) {
      // Store invite code in sessionStorage and redirect to auth
      sessionStorage.setItem("pending_invite", searchParams.get("code") || "");
      navigate("/auth");
      return;
    }

    setAccepting(true);
    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from("team_members")
        .select("id")
        .eq("team_id", invitation.team_id)
        .eq("user_id", user.id)
        .single();

      if (existingMember) {
        toast({
          title: "Already a member",
          description: "You are already a member of this team",
        });
        navigate("/team");
        return;
      }

      // Add user to team
      const { error: memberError } = await supabase
        .from("team_members")
        .insert({
          team_id: invitation.team_id,
          user_id: user.id,
          role: "member",
          status: "approved",
        });

      if (memberError) throw memberError;

      // Increment uses_count
      const { error: updateError } = await supabase
        .from("team_invitations")
        .update({ uses_count: invitation.uses_count + 1 })
        .eq("id", invitation.id);

      if (updateError) console.error("Error updating invite count:", updateError);

      toast({
        title: "Success!",
        description: `You've joined ${teamName}`,
      });

      navigate("/team");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 flex items-center justify-center p-6">
      <Card className="w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-6 justify-center">
          <div className="p-2 rounded-lg bg-primary/10">
            <Brain className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">#JusticeLens</h1>
            <p className="text-sm text-muted-foreground">Team Invitation</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold mb-2">
              You've been invited to join
            </h2>
            <p className="text-2xl font-bold text-primary">{teamName}</p>
          </div>

          {invitation.expires_at && (
            <p className="text-sm text-muted-foreground text-center">
              This invitation expires on{" "}
              {new Date(invitation.expires_at).toLocaleDateString()}
            </p>
          )}

          {!user && (
            <p className="text-sm text-muted-foreground text-center">
              You need to sign in or create an account to accept this invitation
            </p>
          )}

          <Button
            onClick={handleAcceptInvite}
            disabled={accepting}
            className="w-full"
          >
            {accepting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Accepting...
              </>
            ) : user ? (
              "Accept Invitation"
            ) : (
              "Sign In to Accept"
            )}
          </Button>

          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="w-full"
          >
            Cancel
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default AcceptInvite;