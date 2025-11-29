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
      controversial_topics: {
        Row: {
          category: string
          controversy: string
          created_at: string
          description: string
          id: string
          question: string | null
          title: string
          week_start: string
        }
        Insert: {
          category: string
          controversy: string
          created_at?: string
          description: string
          id?: string
          question?: string | null
          title: string
          week_start?: string
        }
        Update: {
          category?: string
          controversy?: string
          created_at?: string
          description?: string
          id?: string
          question?: string | null
          title?: string
          week_start?: string
        }
        Relationships: []
      }
      debates: {
        Row: {
          created_at: string
          debater1_id: string
          debater1_score: number
          debater2_id: string
          debater2_score: number
          deleted_at: string | null
          deleted_by: string | null
          id: string
          status: string
          timer_expires_at: string | null
          topic: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          debater1_id: string
          debater1_score?: number
          debater2_id: string
          debater2_score?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          status?: string
          timer_expires_at?: string | null
          topic: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          debater1_id?: string
          debater1_score?: number
          debater2_id?: string
          debater2_score?: number
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          status?: string
          timer_expires_at?: string | null
          topic?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "debates_debater1_id_fkey"
            columns: ["debater1_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "debates_debater2_id_fkey"
            columns: ["debater2_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      evidence: {
        Row: {
          claim: string
          claim_evaluation: string | null
          content_analyzed: boolean | null
          created_at: string
          debate_id: string
          debater_id: string
          id: string
          quote_example: string | null
          source_confidence: string | null
          source_rating: number | null
          source_reasoning: string | null
          source_type: string | null
          source_url: string | null
          source_warning: string | null
          status: string
          suggested_correction: string | null
        }
        Insert: {
          claim: string
          claim_evaluation?: string | null
          content_analyzed?: boolean | null
          created_at?: string
          debate_id: string
          debater_id: string
          id?: string
          quote_example?: string | null
          source_confidence?: string | null
          source_rating?: number | null
          source_reasoning?: string | null
          source_type?: string | null
          source_url?: string | null
          source_warning?: string | null
          status?: string
          suggested_correction?: string | null
        }
        Update: {
          claim?: string
          claim_evaluation?: string | null
          content_analyzed?: boolean | null
          created_at?: string
          debate_id?: string
          debater_id?: string
          id?: string
          quote_example?: string | null
          source_confidence?: string | null
          source_rating?: number | null
          source_reasoning?: string | null
          source_type?: string | null
          source_url?: string | null
          source_warning?: string | null
          status?: string
          suggested_correction?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "evidence_debate_id_fkey"
            columns: ["debate_id"]
            isOneToOne: false
            referencedRelation: "debates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "evidence_debater_id_fkey"
            columns: ["debater_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_discussion_participants: {
        Row: {
          discussion_id: string
          has_submitted_evidence: boolean
          id: string
          joined_at: string
          score: number
          stance: string | null
          user_id: string
        }
        Insert: {
          discussion_id: string
          has_submitted_evidence?: boolean
          id?: string
          joined_at?: string
          score?: number
          stance?: string | null
          user_id: string
        }
        Update: {
          discussion_id?: string
          has_submitted_evidence?: boolean
          id?: string
          joined_at?: string
          score?: number
          stance?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_discussion_participants_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "group_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_discussion_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_discussions: {
        Row: {
          created_at: string
          created_by: string
          id: string
          status: string
          topic_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          status?: string
          topic_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          status?: string
          topic_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_discussions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_discussions_topic_id_fkey"
            columns: ["topic_id"]
            isOneToOne: false
            referencedRelation: "controversial_topics"
            referencedColumns: ["id"]
          },
        ]
      }
      group_evidence: {
        Row: {
          claim: string
          created_at: string
          discussion_id: string
          id: string
          source_confidence: string | null
          source_rating: number | null
          source_reasoning: string | null
          source_type: string | null
          source_url: string | null
          source_warning: string | null
          user_id: string
        }
        Insert: {
          claim: string
          created_at?: string
          discussion_id: string
          id?: string
          source_confidence?: string | null
          source_rating?: number | null
          source_reasoning?: string | null
          source_type?: string | null
          source_url?: string | null
          source_warning?: string | null
          user_id: string
        }
        Update: {
          claim?: string
          created_at?: string
          discussion_id?: string
          id?: string
          source_confidence?: string | null
          source_rating?: number | null
          source_reasoning?: string | null
          source_type?: string | null
          source_url?: string | null
          source_warning?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_evidence_discussion_id_fkey"
            columns: ["discussion_id"]
            isOneToOne: false
            referencedRelation: "group_discussions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_evidence_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      group_evidence_responses: {
        Row: {
          created_at: string
          evidence_id: string
          id: string
          respondent_id: string
          response_type: string
        }
        Insert: {
          created_at?: string
          evidence_id: string
          id?: string
          respondent_id: string
          response_type: string
        }
        Update: {
          created_at?: string
          evidence_id?: string
          id?: string
          respondent_id?: string
          response_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "group_evidence_responses_evidence_id_fkey"
            columns: ["evidence_id"]
            isOneToOne: false
            referencedRelation: "group_evidence"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "group_evidence_responses_respondent_id_fkey"
            columns: ["respondent_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          phone_number: string | null
          political_view: string | null
          religion: string | null
          university_degree: string | null
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          phone_number?: string | null
          political_view?: string | null
          religion?: string | null
          university_degree?: string | null
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          phone_number?: string | null
          political_view?: string | null
          religion?: string | null
          university_degree?: string | null
          username?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_discussion_participant: {
        Args: { _discussion_id: string; _user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "user"
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
      app_role: ["admin", "user"],
    },
  },
} as const
