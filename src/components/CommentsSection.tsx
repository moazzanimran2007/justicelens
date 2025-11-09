import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { MessageSquare, Send, MoreVertical, Pencil, Trash2 } from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [showMentions, setShowMentions] = useState(false);
  const [mentionSearch, setMentionSearch] = useState("");
  const [cursorPosition, setCursorPosition] = useState(0);
  const [selectedMentionIndex, setSelectedMentionIndex] = useState(0);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [deleteCommentId, setDeleteCommentId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const editTextareaRef = useRef<HTMLTextAreaElement>(null);
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

  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    const position = e.target.selectionStart;
    setNewComment(value);
    setCursorPosition(position);

    // Check if user typed @ to trigger mentions
    const textBeforeCursor = value.slice(0, position);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    if (lastAtIndex !== -1) {
      const textAfterAt = textBeforeCursor.slice(lastAtIndex + 1);
      if (!textAfterAt.includes(" ") && textAfterAt.length >= 0) {
        setMentionSearch(textAfterAt);
        setShowMentions(true);
        setSelectedMentionIndex(0);
        return;
      }
    }
    
    setShowMentions(false);
  };

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (!showMentions) return;

    const filtered = filteredMembers;
    
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedMentionIndex((prev) => 
        prev < filtered.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedMentionIndex((prev) => (prev > 0 ? prev - 1 : 0));
    } else if (e.key === "Enter" && filtered.length > 0) {
      e.preventDefault();
      insertMention(filtered[selectedMentionIndex]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setShowMentions(false);
    }
  };

  const insertMention = (member: TeamMember) => {
    const textBeforeCursor = newComment.slice(0, cursorPosition);
    const textAfterCursor = newComment.slice(cursorPosition);
    const lastAtIndex = textBeforeCursor.lastIndexOf("@");
    
    const beforeAt = newComment.slice(0, lastAtIndex);
    const mention = `@[${member.display}](${member.id})`;
    const newText = beforeAt + mention + " " + textAfterCursor;
    
    setNewComment(newText);
    setShowMentions(false);
    setMentionSearch("");
    
    setTimeout(() => {
      textareaRef.current?.focus();
    }, 0);
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

  const filteredMembers = teamMembers.filter((member) =>
    member.display.toLowerCase().includes(mentionSearch.toLowerCase())
  );

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id);
    setEditText(comment.comment_text);
    setTimeout(() => editTextareaRef.current?.focus(), 0);
  };

  const handleCancelEdit = () => {
    setEditingCommentId(null);
    setEditText("");
  };

  const handleSaveEdit = async (commentId: string) => {
    if (!editText.trim()) return;

    const mentionedUsers = extractMentionedUsers(editText);

    const { error } = await supabase
      .from("case_comments")
      .update({ 
        comment_text: editText.trim(),
        mentioned_users: mentionedUsers,
      })
      .eq("id", commentId);

    if (error) {
      toast({
        title: "Error updating comment",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Comment updated successfully" });
      setEditingCommentId(null);
      setEditText("");
      fetchComments();
    }
  };

  const handleDeleteComment = async () => {
    if (!deleteCommentId) return;

    const { error } = await supabase
      .from("case_comments")
      .delete()
      .eq("id", deleteCommentId);

    if (error) {
      toast({
        title: "Error deleting comment",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Comment deleted successfully" });
      fetchComments();
    }
    setDeleteCommentId(null);
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium">
                    {comment.user_id === currentUserId 
                      ? "You" 
                      : (comment.profiles?.full_name || comment.profiles?.email || "Team member")}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                  </span>
                </div>
                {comment.user_id === currentUserId && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-popover z-50">
                      <DropdownMenuItem onClick={() => handleEditComment(comment)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => setDeleteCommentId(comment.id)}
                        className="text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
              {editingCommentId === comment.id ? (
                <div className="space-y-2">
                  <Textarea
                    ref={editTextareaRef}
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="min-h-[60px]"
                    maxLength={5000}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleSaveEdit(comment.id)}
                      disabled={!editText.trim()}
                    >
                      Save
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm whitespace-pre-wrap">{renderCommentText(comment.comment_text)}</p>
              )}
            </Card>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <div className="relative">
          <Textarea
            ref={textareaRef}
            value={newComment}
            onChange={handleTextareaChange}
            onKeyDown={handleTextareaKeyDown}
            placeholder="Add a comment... (Type @ to mention someone)"
            className="min-h-[80px]"
            maxLength={5000}
          />
          <Popover open={showMentions} onOpenChange={setShowMentions}>
            <PopoverTrigger asChild>
              <div className="absolute" style={{ top: 0, left: 0, visibility: "hidden" }} />
            </PopoverTrigger>
            <PopoverContent className="w-64 p-0 bg-popover z-50" align="start">
              <Command>
                <CommandInput placeholder="Search team members..." value={mentionSearch} />
                <CommandList>
                  <CommandEmpty>No team members found.</CommandEmpty>
                  <CommandGroup>
                    {filteredMembers.map((member, index) => (
                      <CommandItem
                        key={member.id}
                        onSelect={() => insertMention(member)}
                        className={`cursor-pointer ${
                          index === selectedMentionIndex ? "bg-accent" : ""
                        }`}
                      >
                        @{member.display}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
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

      <AlertDialog open={!!deleteCommentId} onOpenChange={(open) => !open && setDeleteCommentId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Comment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this comment? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteComment} className="bg-destructive hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
