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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      assessments: {
        Row: {
          created_at: string
          disorder_id: string
          id: string
          name: string
          source_reference: string | null
        }
        Insert: {
          created_at?: string
          disorder_id: string
          id?: string
          name: string
          source_reference?: string | null
        }
        Update: {
          created_at?: string
          disorder_id?: string
          id?: string
          name?: string
          source_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assessments_disorder_id_fkey"
            columns: ["disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          additional_notes: string | null
          age: string | null
          analysis: Json | null
          chief_complaint: string | null
          created_at: string
          education_history: string | null
          family_history: string | null
          gender: string | null
          hearing_history: string | null
          id: string
          language_history: string | null
          motor_milestones: string | null
          name: string
          natal_history: string | null
          postnatal_history: string | null
          prenatal_history: string | null
          speech_milestones: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          additional_notes?: string | null
          age?: string | null
          analysis?: Json | null
          chief_complaint?: string | null
          created_at?: string
          education_history?: string | null
          family_history?: string | null
          gender?: string | null
          hearing_history?: string | null
          id?: string
          language_history?: string | null
          motor_milestones?: string | null
          name: string
          natal_history?: string | null
          postnatal_history?: string | null
          prenatal_history?: string | null
          speech_milestones?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          additional_notes?: string | null
          age?: string | null
          analysis?: Json | null
          chief_complaint?: string | null
          created_at?: string
          education_history?: string | null
          family_history?: string | null
          gender?: string | null
          hearing_history?: string | null
          id?: string
          language_history?: string | null
          motor_milestones?: string | null
          name?: string
          natal_history?: string | null
          postnatal_history?: string | null
          prenatal_history?: string | null
          speech_milestones?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      clinical_sources: {
        Row: {
          created_at: string
          disorder_id: string | null
          disorder_name: string
          id: string
          kind: string
          primary_source: string | null
          secondary_source: string | null
          verification_status: string | null
        }
        Insert: {
          created_at?: string
          disorder_id?: string | null
          disorder_name: string
          id?: string
          kind: string
          primary_source?: string | null
          secondary_source?: string | null
          verification_status?: string | null
        }
        Update: {
          created_at?: string
          disorder_id?: string | null
          disorder_name?: string
          id?: string
          kind?: string
          primary_source?: string | null
          secondary_source?: string | null
          verification_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_sources_disorder_id_fkey"
            columns: ["disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      disorders: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          parent_id: string | null
          red_flags: string | null
          source_reference: string | null
          symptoms: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
          red_flags?: string | null
          source_reference?: string | null
          symptoms?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
          red_flags?: string | null
          source_reference?: string | null
          symptoms?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disorders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          created_at: string
          disorder_id: string
          id: string
          name: string
          source_reference: string | null
        }
        Insert: {
          created_at?: string
          disorder_id: string
          id?: string
          name: string
          source_reference?: string | null
        }
        Update: {
          created_at?: string
          disorder_id?: string
          id?: string
          name?: string
          source_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "materials_disorder_id_fkey"
            columns: ["disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string | null
          full_name: string | null
          id: string
          provider: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id: string
          provider?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string | null
          full_name?: string | null
          id?: string
          provider?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      therapy_goals: {
        Row: {
          created_at: string
          disorder_id: string
          goal: string
          id: string
          source_reference: string | null
        }
        Insert: {
          created_at?: string
          disorder_id: string
          goal: string
          id?: string
          source_reference?: string | null
        }
        Update: {
          created_at?: string
          disorder_id?: string
          goal?: string
          id?: string
          source_reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "therapy_goals_disorder_id_fkey"
            columns: ["disorder_id"]
            isOneToOne: false
            referencedRelation: "disorders"
            referencedColumns: ["id"]
          },
        ]
      }
      user_uploads: {
        Row: {
          created_at: string
          file_name: string
          file_path: string
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          file_name: string
          file_path: string
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          file_name?: string
          file_path?: string
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          user_id?: string
        }
        Relationships: []
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
