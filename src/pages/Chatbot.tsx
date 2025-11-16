import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Send, Loader2, Plus, MessageSquare, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export default function Chatbot() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [runId, setRunId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    const conversationId = searchParams.get('conversation');
    if (conversationId && conversationId !== currentConversationId) {
      setCurrentConversationId(conversationId);
      loadMessages(conversationId);
    } else if (!conversationId && conversations.length > 0) {
      // Load the most recent conversation
      const mostRecent = conversations[0];
      setSearchParams({ conversation: mostRecent.id });
    }
  }, [searchParams, conversations, user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);
    }
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error loading conversations:', error);
      return;
    }

    setConversations(data || []);
  };

  const loadMessages = async (conversationId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      return;
    }

    const typedMessages: Message[] = (data || []).map(msg => ({
      role: msg.role as "user" | "assistant",
      content: msg.content
    }));

    setMessages(typedMessages);
  };

  const createNewConversation = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .insert({ user_id: user.id })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      toast({
        title: "Error",
        description: "Failed to create new conversation",
        variant: "destructive",
      });
      return;
    }

    setConversations([data, ...conversations]);
    setSearchParams({ conversation: data.id });
    setMessages([]);
    setRunId(null);
  };

  const deleteConversation = async (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    const { error } = await supabase
      .from('conversations')
      .delete()
      .eq('id', conversationId);

    if (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
      return;
    }

    const updatedConversations = conversations.filter(c => c.id !== conversationId);
    setConversations(updatedConversations);

    if (conversationId === currentConversationId) {
      if (updatedConversations.length > 0) {
        setSearchParams({ conversation: updatedConversations[0].id });
      } else {
        setSearchParams({});
        setMessages([]);
        setCurrentConversationId(null);
      }
    }
  };

  const saveMessage = async (conversationId: string, role: "user" | "assistant", content: string) => {
    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        role,
        content
      });

    if (error) {
      console.error('Error saving message:', error);
    }

    // Update conversation title based on first user message
    if (role === "user" && messages.length === 0) {
      const title = content.slice(0, 50) + (content.length > 50 ? "..." : "");
      await supabase
        .from('conversations')
        .update({ title })
        .eq('id', conversationId);
      
      // Refresh conversations to show new title
      loadConversations();
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleStreamResponse = async (response: Response): Promise<string> => {
    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error("No response body");
    }

    // Add empty assistant message that we'll update
    setMessages(prev => [...prev, { role: "assistant", content: "" }]);
    
    let accumulatedContent = "";

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      accumulatedContent += chunk;
      
      // Update the last message with accumulated content
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: accumulatedContent
        };
        return updated;
      });
    }

    return accumulatedContent;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Create a new conversation if none exists
    let conversationId = currentConversationId;
    if (!conversationId) {
      const { data, error } = await supabase
        .from('conversations')
        .insert({ user_id: user.id })
        .select()
        .single();

      if (error || !data) {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return;
      }

      conversationId = data.id;
      setCurrentConversationId(conversationId);
      setConversations([data, ...conversations]);
      setSearchParams({ conversation: conversationId });
    }

    const userMessage = inputMessage.trim();
    setInputMessage("");
    setMessages(prev => [...prev, { role: "user", content: userMessage }]);
    setIsLoading(true);

    // Save user message
    await saveMessage(conversationId, "user", userMessage);

    try {
      abortControllerRef.current = new AbortController();

      const isFirstMessage = runId === null;
      const url = isFirstMessage
        ? "https://agents.toolhouse.ai/d2774614-d0d0-439c-b1f8-432b7012d819"
        : `https://agents.toolhouse.ai/d2774614-d0d0-439c-b1f8-432b7012d819/${runId}`;

      const method = isFirstMessage ? "POST" : "PUT";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userMessage }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      // Get runId from headers on first message
      if (isFirstMessage) {
        const newRunId = response.headers.get("X-Toolhouse-Run-ID");
        if (newRunId) {
          setRunId(newRunId);
        }
      }

      const assistantMessage = await handleStreamResponse(response);
      
      // Save assistant message
      if (conversationId && assistantMessage) {
        await saveMessage(conversationId, "assistant", assistantMessage);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        console.log("Request aborted");
      } else {
        console.error("Error sending message:", error);
        toast({
          title: "Error",
          description: "Failed to send message. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Header user={user} />

      <main className="container mx-auto px-4 py-8 max-w-7xl flex gap-4">
        {/* Conversations Sidebar */}
        <Card className="w-64 flex-shrink-0 p-4 bg-card/50 backdrop-blur-sm border-border h-[calc(100vh-140px)]">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-foreground">Conversations</h2>
            <Button
              onClick={createNewConversation}
              size="icon"
              variant="ghost"
              className="h-8 w-8"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          
          <ScrollArea className="h-[calc(100%-3rem)]">
            <div className="space-y-2">
              {conversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer hover:bg-muted/50 transition-colors ${
                    conversation.id === currentConversationId ? 'bg-muted' : ''
                  }`}
                  onClick={() => setSearchParams({ conversation: conversation.id })}
                >
                  <MessageSquare className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm truncate flex-1">{conversation.title}</span>
                  <Button
                    onClick={(e) => deleteConversation(conversation.id, e)}
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 hover:text-destructive"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))}
              {conversations.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No conversations yet
                </p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground mb-2">AI Assistant</h1>
            <p className="text-muted-foreground">Ask me anything about your cases or legal research</p>
          </div>

          <Card className="flex flex-col flex-1 bg-card/50 backdrop-blur-sm border-border">
          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {messages.length === 0 && (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="text-6xl mb-4">💬</div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Start a conversation
                  </h3>
                  <p className="text-muted-foreground">
                    Ask me anything and I'll help you out!
                  </p>
                </div>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-6 py-4 ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-foreground border border-border"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-muted/50 rounded-2xl px-6 py-4 border border-border">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Container */}
          <div className="border-t border-border p-4 bg-background/50">
            <div className="flex gap-2 items-end">
              <Textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your message... (Shift+Enter for new line)"
                className="min-h-[60px] max-h-[200px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={sendMessage}
                disabled={!inputMessage.trim() || isLoading}
                size="icon"
                className="h-[60px] w-[60px] shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
          </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
