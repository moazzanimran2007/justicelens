import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Activity, ArrowRight, User, Upload } from "lucide-react";

interface ActivityItem {
  id: string;
  activity_type: string;
  description: string;
  created_at: string;
  metadata: any;
  profiles?: {
    full_name: string | null;
    email: string;
  };
}

interface ActivityTimelineProps {
  caseId: string;
}

export const ActivityTimeline = ({ caseId }: ActivityTimelineProps) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  useEffect(() => {
    fetchActivities();
    
    const channel = supabase
      .channel(`activities:${caseId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "case_activities",
          filter: `case_id=eq.${caseId}`,
        },
        (payload) => {
          console.log('Activity update received:', payload);
          fetchActivities();
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up activity subscription');
      supabase.removeChannel(channel);
    };
  }, [caseId]);

  const fetchActivities = async () => {
    const { data, error } = await supabase
      .from("case_activities")
      .select(`
        *,
        profiles!case_activities_user_id_fkey (
          full_name,
          email
        )
      `)
      .eq("case_id", caseId)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setActivities(data as any);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "stage_changed":
        return <ArrowRight className="w-4 h-4" />;
      case "assignment_changed":
        return <User className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="space-y-3">
      {activities.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>No activity yet</p>
        </div>
      ) : (
        <div className="relative space-y-3 before:absolute before:left-5 before:top-0 before:bottom-0 before:w-px before:bg-border">
          {activities.map((activity) => (
            <Card key={activity.id} className="p-3 ml-12 relative">
              <div className="absolute -left-12 top-3 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                {getActivityIcon(activity.activity_type)}
              </div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <p className="text-sm">{activity.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-xs text-muted-foreground">
                      {activity.profiles?.full_name || activity.profiles?.email || "System"}
                    </p>
                    <span className="text-xs text-muted-foreground">•</span>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                    </p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">
                  {activity.activity_type.replace("_", " ")}
                </Badge>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
