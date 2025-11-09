import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send } from "lucide-react";

interface Comment {
  id: string;
  user_id: string;
  comment_text: string;
  created_at: string;
  updated_at: string;
}

interface CommentsSectionProps {
  caseId: string;
}

export const CommentsSection = ({ caseId }: CommentsSectionProps) => {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCurrentUser();
    fetchComments();
    subscribeToComments();
  }, [caseId]);

  const fetchCurrentUser = async () => {
    const { data } = await supabase.auth.getUser();
    setCurrentUserId(data.user?.id || null);
  };

  const fetchComments = async () => {
    const { data, error } = await supabase
      .from("case_comments")
      .select("*")
      .eq("case_id", caseId)
      .order("created_at", { ascending: true });

    if (!error && data) {
      setComments(data);
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
        () => {
          fetchComments();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setLoading(true);
    const { error } = await supabase.from("case_comments").insert({
      case_id: caseId,
      user_id: currentUserId,
      comment_text: newComment.trim(),
    });

    if (error) {
      toast({ title: "Error posting comment", variant: "destructive" });
    } else {
      setNewComment("");
      toast({ title: "Comment posted" });
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
                <span className="text-xs text-muted-foreground">
                  {comment.user_id === currentUserId ? "You" : "Team member"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{comment.comment_text}</p>
            </Card>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="min-h-[80px]"
          maxLength={5000}
        />
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
