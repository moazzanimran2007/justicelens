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
          created_at: string
          error_message: string | null
          file_name: string
          file_path: string
          file_size: number
          id: string
          results: Json | null
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          analysis_modules?: string[]
          created_at?: string
          error_message?: string | null
          file_name: string
          file_path: string
          file_size: number
          id?: string
          results?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          analysis_modules?: string[]
          created_at?: string
          error_message?: string | null
          file_name?: string
          file_path?: string
          file_size?: number
          id?: string
          results?: Json | null
          status?: string
          updated_at?: string
          user_id?: string | null
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
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
