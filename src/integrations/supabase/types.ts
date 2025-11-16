export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      analyses: {
        Row: {
          analysis_modules: string[]
          assigned_to: string | null
          case_number: string | null
          client_name: string | null
          created_at: string
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          priority: string | null
          results: Json | null
          stage_id: string | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_modules?: string[]
          assigned_to?: string | null
          case_number?: string | null
          client_name?: string | null
          created_at?: string
          error_message?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          priority?: string | null
          results?: Json | null
          stage_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_modules?: string[]
          assigned_to?: string | null
          case_number?: string | null
          client_name?: string | null
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          priority?: string | null
          results?: Json | null
          stage_id?: string | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "analyses_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "pipeline_stages"
            referencedColumns: ["id"]
          },
        ]
      }
      case_activities: {
        Row: {
          activity_type: string
          case_id: string
          created_at: string
          description: string
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          activity_type: string
          case_id: string
          created_at?: string
          description: string
          id?: string
          metadata?: Json | null
          user_id: string
        }
        Update: {
          activity_type?: string
          case_id?: string
          created_at?: string
          description?: string
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_activities_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      case_comments: {
        Row: {
          case_id: string
          comment_text: string
          created_at: string
          id: string
          mentioned_users: string[] | null
          updated_at: string
          user_id: string
        }
        Insert: {
          case_id: string
          comment_text: string
          created_at?: string
          id?: string
          mentioned_users?: string[] | null
          updated_at?: string
          user_id: string
        }
        Update: {
          case_id?: string
          comment_text?: string
          created_at?: string
          id?: string
          mentioned_users?: string[] | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "case_comments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_comments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      commissioner_bias_statements: {
        Row: {
          analysis_id: string
          bias_type: string
          commissioner_id: string
          context: string | null
          created_at: string | null
          id: string
          page_reference: string | null
          quote: string
          severity: string
        }
        Insert: {
          analysis_id: string
          bias_type: string
          commissioner_id: string
          context?: string | null
          created_at?: string | null
          id?: string
          page_reference?: string | null
          quote: string
          severity: string
        }
        Update: {
          analysis_id?: string
          bias_type?: string
          commissioner_id?: string
          context?: string | null
          created_at?: string | null
          id?: string
          page_reference?: string | null
          quote?: string
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "commissioner_bias_statements_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commissioner_bias_statements_commissioner_id_fkey"
            columns: ["commissioner_id"]
            isOneToOne: false
            referencedRelation: "commissioners"
            referencedColumns: ["id"]
          },
        ]
      }
      commissioners: {
        Row: {
          bias_score: number | null
          created_at: string | null
          first_appearance_date: string | null
          id: string
          name: string
          title: string | null
          total_cases: number | null
          updated_at: string | null
        }
        Insert: {
          bias_score?: number | null
          created_at?: string | null
          first_appearance_date?: string | null
          id?: string
          name: string
          title?: string | null
          total_cases?: number | null
          updated_at?: string | null
        }
        Update: {
          bias_score?: number | null
          created_at?: string | null
          first_appearance_date?: string | null
          id?: string
          name?: string
          title?: string | null
          total_cases?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversations: {
        Row: {
          created_at: string
          id: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      legal_memos: {
        Row: {
          analysis_id: string
          appellate_attorneys: string | null
          appellate_case_no: string | null
          cdcr_number: string | null
          client_name: string | null
          client_priors: string | null
          co_defendant: string | null
          co_defendant_attorney: string | null
          contact_information: string | null
          convicted_of: string | null
          county_of_conviction: string | null
          created_at: string
          date_of_arrest: string | null
          date_of_birth: string | null
          date_of_conviction: string | null
          date_of_crime: string | null
          defense_presented: string | null
          direct_appeal_date: string | null
          direct_appeal_issues: string[] | null
          evidence_used_to_convict: string[] | null
          habeas_petition_date: string | null
          habeas_petition_issues: string[] | null
          id: string
          innocence_claims: Json | null
          location_of_crime: string | null
          parole_eligibility_date: string | null
          people_additional_info: Json | null
          people_mentioned: Json | null
          petition_for_review_date: string | null
          petition_for_review_issues: string[] | null
          potential_theory_of_case: string | null
          prior_parole_hearing_result: string | null
          prosecuting_attorney: string | null
          prosecution_presented: string | null
          sentence: string | null
          short_summary: string | null
          trial_attorney: string | null
          trial_court_case_no: string | null
          trial_court_judge_dept: string | null
          updated_at: string
          wrongful_conviction_issues: string[] | null
        }
        Insert: {
          analysis_id: string
          appellate_attorneys?: string | null
          appellate_case_no?: string | null
          cdcr_number?: string | null
          client_name?: string | null
          client_priors?: string | null
          co_defendant?: string | null
          co_defendant_attorney?: string | null
          contact_information?: string | null
          convicted_of?: string | null
          county_of_conviction?: string | null
          created_at?: string
          date_of_arrest?: string | null
          date_of_birth?: string | null
          date_of_conviction?: string | null
          date_of_crime?: string | null
          defense_presented?: string | null
          direct_appeal_date?: string | null
          direct_appeal_issues?: string[] | null
          evidence_used_to_convict?: string[] | null
          habeas_petition_date?: string | null
          habeas_petition_issues?: string[] | null
          id?: string
          innocence_claims?: Json | null
          location_of_crime?: string | null
          parole_eligibility_date?: string | null
          people_additional_info?: Json | null
          people_mentioned?: Json | null
          petition_for_review_date?: string | null
          petition_for_review_issues?: string[] | null
          potential_theory_of_case?: string | null
          prior_parole_hearing_result?: string | null
          prosecuting_attorney?: string | null
          prosecution_presented?: string | null
          sentence?: string | null
          short_summary?: string | null
          trial_attorney?: string | null
          trial_court_case_no?: string | null
          trial_court_judge_dept?: string | null
          updated_at?: string
          wrongful_conviction_issues?: string[] | null
        }
        Update: {
          analysis_id?: string
          appellate_attorneys?: string | null
          appellate_case_no?: string | null
          cdcr_number?: string | null
          client_name?: string | null
          client_priors?: string | null
          co_defendant?: string | null
          co_defendant_attorney?: string | null
          contact_information?: string | null
          convicted_of?: string | null
          county_of_conviction?: string | null
          created_at?: string
          date_of_arrest?: string | null
          date_of_birth?: string | null
          date_of_conviction?: string | null
          date_of_crime?: string | null
          defense_presented?: string | null
          direct_appeal_date?: string | null
          direct_appeal_issues?: string[] | null
          evidence_used_to_convict?: string[] | null
          habeas_petition_date?: string | null
          habeas_petition_issues?: string[] | null
          id?: string
          innocence_claims?: Json | null
          location_of_crime?: string | null
          parole_eligibility_date?: string | null
          people_additional_info?: Json | null
          people_mentioned?: Json | null
          petition_for_review_date?: string | null
          petition_for_review_issues?: string[] | null
          potential_theory_of_case?: string | null
          prior_parole_hearing_result?: string | null
          prosecuting_attorney?: string | null
          prosecution_presented?: string | null
          sentence?: string | null
          short_summary?: string | null
          trial_attorney?: string | null
          trial_court_case_no?: string | null
          trial_court_judge_dept?: string | null
          updated_at?: string
          wrongful_conviction_issues?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "legal_memos_analysis_id_fkey"
            columns: ["analysis_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          case_id: string | null
          created_at: string
          id: string
          message: string
          metadata: Json | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          case_id?: string | null
          created_at?: string
          id?: string
          message: string
          metadata?: Json | null
          read?: boolean
          title: string
          type: string
          user_id: string
        }
        Update: {
          case_id?: string | null
          created_at?: string
          id?: string
          message?: string
          metadata?: Json | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "analyses"
            referencedColumns: ["id"]
          },
        ]
      }
      pipeline_stages: {
        Row: {
          color: string
          created_at: string
          display_order: number
          id: string
          name: string
        }
        Insert: {
          color?: string
          created_at?: string
          display_order: number
          id?: string
          name: string
        }
        Update: {
          color?: string
          created_at?: string
          display_order?: number
          id?: string
          name?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          job_title: string | null
          nickname: string | null
          team_name: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          job_title?: string | null
          nickname?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          nickname?: string | null
          team_name?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      team_invitations: {
        Row: {
          created_at: string
          created_by: string
          expires_at: string | null
          id: string
          invite_code: string
          max_uses: number | null
          status: string
          team_id: string
          updated_at: string
          uses_count: number | null
        }
        Insert: {
          created_at?: string
          created_by: string
          expires_at?: string | null
          id?: string
          invite_code: string
          max_uses?: number | null
          status?: string
          team_id: string
          updated_at?: string
          uses_count?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string
          expires_at?: string | null
          id?: string
          invite_code?: string
          max_uses?: number | null
          status?: string
          team_id?: string
          updated_at?: string
          uses_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "team_invitations_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_members: {
        Row: {
          created_at: string
          id: string
          role: string
          status: string
          team_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: string
          status?: string
          team_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          status?: string
          team_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "team_members_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      team_settings: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          team_icon: string | null
          team_name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          team_icon?: string | null
          team_name?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          team_icon?: string | null
          team_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_commissioner_bias_score: {
        Args: { commissioner_uuid: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "investigator" | "attorney" | "advocate"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "investigator", "attorney", "advocate"],
    },
  },
} as const
