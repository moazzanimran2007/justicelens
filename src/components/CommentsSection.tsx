import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send } from "lucide-react";
import { MentionsInput, Mention } from "react-mentions";
import "@/styles/mentions.css";

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
  mentioned_users?: string[];
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface TeamMember {
  id: string;
  display: string;
}

interface CommentsSectionProps {
  caseId: string;
}

export const CommentsSection = ({ caseId }: CommentsSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchComments();
    fetchTeamMembers();
    subscribeToComments();
  }, [caseId]);

  const fetchCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data.user?.id || null);
  };

  const fetchTeamMembers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, full_name, email")
      .order("full_name");

    if (!error && data) {
      setTeamMembers(
        data.map((member) => ({
          id: member.id,
          display: member.full_name || member.email,
        }))
      );
    }
  };

  const fetchComments = async () => {
    console.log('Fetching comments for case:', caseId);
    const { data, error } = await supabase
      .from("case_comments")
      .select(`
        *,
        profiles!case_comments_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error('Error fetching comments:', error);
    } else {
      console.log('Fetched comments:', data);
      setComments(data as any);
    }
  };

  const subscribeToComments = () => {
    const channel = supabase
      .channel(`comments:${caseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "case_comments",
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          console.log('Comment realtime update:', payload);
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const extractMentionedUsers = (text: string): string[] => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const userIds: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      userIds.push(match[2]);
    }
    
    return userIds;
  };

  const renderCommentText = (text: string) => {
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      parts.push(
        <span key={match.index} className="text-primary font-medium bg-primary/10 px-1 rounded">
          @{match[1]}
        </span>
      );
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!currentUserId) {
      toast({ 
        title: "Authentication Error", 
        description: "Please refresh the page and try again",
        variant: "destructive" 
      });
      return;
    }

    setLoading(true);
    
    const mentionedUsers = extractMentionedUsers(newComment);
    
    console.log('Submitting comment:', {
      case_id: caseId,
      user_id: currentUserId,
      comment_text: newComment.trim(),
      mentioned_users: mentionedUsers
    });

    const { data, error } = await supabase.from("case_comments").insert({
      case_id: caseId,
      user_id: currentUserId,
      comment_text: newComment.trim(),
      mentioned_users: mentionedUsers,
    }).select();

    if (error) {
      console.error('Comment insert error:', error);
      toast({ 
        title: "Error posting comment", 
        description: error.message,
        variant: "destructive" 
      });
    } else {
      console.log('Comment posted successfully:', data);
      setNewComment("");
      toast({ title: "Comment posted successfully" });
      fetchComments();
    }
    setLoading(false);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {comments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <Card
              key={comment.id}
              className={`p-3 ${
                comment.user_id === currentUserId ? "bg-primary/5 border-primary/20" : ""
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-xs font-medium">
                  {comment.user_id === currentUserId 
                    ? "You" 
                    : (comment.profiles?.full_name || comment.profiles?.email || "Team member")}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{renderCommentText(comment.comment_text)}</p>
            </Card>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <MentionsInput
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment... (Type @ to mention someone)"
          className="mentions-input"
          style={{
            control: {
              minHeight: 80,
            },
          }}
        >
          <Mention
            trigger="@"
            data={teamMembers}
            className="mentions__mention"
            displayTransform={(id, display) => `@${display}`}
          />
        </MentionsInput>
        <div className="flex justify-between items-center">
          <span className="text-xs text-muted-foreground">
            {newComment.length}/5000
          </span>
          <Button type="submit" disabled={loading || !newComment.trim()} size="sm">
            <Send className="w-4 h-4 mr-2" />
            Post Comment
          </Button>
        </div>
      </form>
    </div>
  );
};
