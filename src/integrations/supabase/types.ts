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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      custom_ai_models: {
        Row: {
          api_key: string | null
          base_url: string | null
          created_at: string
          display_label: string
          id: string
          model_id: string
          notes: string | null
          project_id: string
        }
        Insert: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string
          display_label: string
          id?: string
          model_id: string
          notes?: string | null
          project_id: string
        }
        Update: {
          api_key?: string | null
          base_url?: string | null
          created_at?: string
          display_label?: string
          id?: string
          model_id?: string
          notes?: string | null
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "custom_ai_models_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      document_chunks: {
        Row: {
          chunk_index: number
          content: string
          created_at: string
          document_id: string | null
          embedding: string | null
          figma_screen_id: string | null
          id: string
          metadata: Json | null
          page_number: number | null
          project_id: string
          screen_name: string | null
          section_name: string | null
          source_type: string
          token_count: number | null
        }
        Insert: {
          chunk_index?: number
          content: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          figma_screen_id?: string | null
          id?: string
          metadata?: Json | null
          page_number?: number | null
          project_id: string
          screen_name?: string | null
          section_name?: string | null
          source_type?: string
          token_count?: number | null
        }
        Update: {
          chunk_index?: number
          content?: string
          created_at?: string
          document_id?: string | null
          embedding?: string | null
          figma_screen_id?: string | null
          id?: string
          metadata?: Json | null
          page_number?: number | null
          project_id?: string
          screen_name?: string | null
          section_name?: string | null
          source_type?: string
          token_count?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "document_chunks_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_figma_screen_id_fkey"
            columns: ["figma_screen_id"]
            isOneToOne: false
            referencedRelation: "figma_screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_chunks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          chunks_count: number | null
          content_text: string | null
          created_at: string
          document_type: string | null
          error_message: string | null
          file_size: number
          file_type: string
          id: string
          name: string
          pages_count: number | null
          project_id: string | null
          status: string
          storage_path: string | null
          updated_at: string
        }
        Insert: {
          chunks_count?: number | null
          content_text?: string | null
          created_at?: string
          document_type?: string | null
          error_message?: string | null
          file_size?: number
          file_type: string
          id?: string
          name: string
          pages_count?: number | null
          project_id?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Update: {
          chunks_count?: number | null
          content_text?: string | null
          created_at?: string
          document_type?: string | null
          error_message?: string | null
          file_size?: number
          file_type?: string
          id?: string
          name?: string
          pages_count?: number | null
          project_id?: string | null
          status?: string
          storage_path?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      figma_screens: {
        Row: {
          created_at: string
          elements: Json | null
          id: string
          navigation_targets: string[] | null
          project_id: string
          screen_name: string
        }
        Insert: {
          created_at?: string
          elements?: Json | null
          id?: string
          navigation_targets?: string[] | null
          project_id: string
          screen_name: string
        }
        Update: {
          created_at?: string
          elements?: Json | null
          id?: string
          navigation_targets?: string[] | null
          project_id?: string
          screen_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "figma_screens_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      generation_jobs: {
        Row: {
          completed_batches: number
          created_at: string
          credits_exhausted: boolean
          error_message: string | null
          failed_batches: number
          id: string
          job_type: string
          partial: boolean
          percentage: number
          phase: string
          project_id: string
          scripts_generated: number
          status: string
          total_batches: number
          total_items: number
          updated_at: string
        }
        Insert: {
          completed_batches?: number
          created_at?: string
          credits_exhausted?: boolean
          error_message?: string | null
          failed_batches?: number
          id?: string
          job_type?: string
          partial?: boolean
          percentage?: number
          phase?: string
          project_id: string
          scripts_generated?: number
          status?: string
          total_batches?: number
          total_items?: number
          updated_at?: string
        }
        Update: {
          completed_batches?: number
          created_at?: string
          credits_exhausted?: boolean
          error_message?: string | null
          failed_batches?: number
          id?: string
          job_type?: string
          partial?: boolean
          percentage?: number
          phase?: string
          project_id?: string
          scripts_generated?: number
          status?: string
          total_batches?: number
          total_items?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "generation_jobs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      katalon_objects: {
        Row: {
          content: string
          created_at: string
          element_label: string | null
          file_path: string
          id: string
          locator_type: string
          locator_value: string
          name: string
          notes: string | null
          project_id: string
          screen: string
        }
        Insert: {
          content: string
          created_at?: string
          element_label?: string | null
          file_path: string
          id?: string
          locator_type: string
          locator_value: string
          name: string
          notes?: string | null
          project_id: string
          screen: string
        }
        Update: {
          content?: string
          created_at?: string
          element_label?: string | null
          file_path?: string
          id?: string
          locator_type?: string
          locator_value?: string
          name?: string
          notes?: string | null
          project_id?: string
          screen?: string
        }
        Relationships: [
          {
            foreignKeyName: "katalon_objects_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      katalon_scripts: {
        Row: {
          content: string
          created_at: string
          file_path: string
          id: string
          project_id: string
          script_type: string
          tc_code: string
          test_case_id: string | null
          updated_at: string
        }
        Insert: {
          content: string
          created_at?: string
          file_path: string
          id?: string
          project_id: string
          script_type?: string
          tc_code: string
          test_case_id?: string | null
          updated_at?: string
        }
        Update: {
          content?: string
          created_at?: string
          file_path?: string
          id?: string
          project_id?: string
          script_type?: string
          tc_code?: string
          test_case_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "katalon_scripts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "katalon_scripts_test_case_id_fkey"
            columns: ["test_case_id"]
            isOneToOne: false
            referencedRelation: "test_cases"
            referencedColumns: ["id"]
          },
        ]
      }
      katalon_suites: {
        Row: {
          content: string
          created_at: string
          file_path: string
          id: string
          included_test_cases: string[] | null
          name: string
          project_id: string
        }
        Insert: {
          content: string
          created_at?: string
          file_path: string
          id?: string
          included_test_cases?: string[] | null
          name: string
          project_id: string
        }
        Update: {
          content?: string
          created_at?: string
          file_path?: string
          id?: string
          included_test_cases?: string[] | null
          name?: string
          project_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "katalon_suites_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      project_settings: {
        Row: {
          ai_model: string
          base_url: string
          browser_type: string
          ci_auth_token: string | null
          ci_provider: string | null
          ci_webhook_url: string | null
          created_at: string
          figma_api_token: string | null
          figma_file_url: string | null
          id: string
          locator_strategy: string
          naming_convention: string
          project_name: string
          updated_at: string
        }
        Insert: {
          ai_model?: string
          base_url: string
          browser_type?: string
          ci_auth_token?: string | null
          ci_provider?: string | null
          ci_webhook_url?: string | null
          created_at?: string
          figma_api_token?: string | null
          figma_file_url?: string | null
          id?: string
          locator_strategy?: string
          naming_convention?: string
          project_name: string
          updated_at?: string
        }
        Update: {
          ai_model?: string
          base_url?: string
          browser_type?: string
          ci_auth_token?: string | null
          ci_provider?: string | null
          ci_webhook_url?: string | null
          created_at?: string
          figma_api_token?: string | null
          figma_file_url?: string | null
          id?: string
          locator_strategy?: string
          naming_convention?: string
          project_name?: string
          updated_at?: string
        }
        Relationships: []
      }
      requirement_figma_mappings: {
        Row: {
          created_at: string
          figma_screen_id: string
          id: string
          requirement_id: string
        }
        Insert: {
          created_at?: string
          figma_screen_id: string
          id?: string
          requirement_id: string
        }
        Update: {
          created_at?: string
          figma_screen_id?: string
          id?: string
          requirement_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_figma_mappings_figma_screen_id_fkey"
            columns: ["figma_screen_id"]
            isOneToOne: false
            referencedRelation: "figma_screens"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_figma_mappings_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          category: string | null
          created_at: string
          description: string
          document_id: string
          embedding: string | null
          id: string
          priority: string
          project_id: string | null
          req_code: string
          source_reference: string | null
          title: string
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          description: string
          document_id: string
          embedding?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          req_code: string
          source_reference?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          description?: string
          document_id?: string
          embedding?: string | null
          id?: string
          priority?: string
          project_id?: string | null
          req_code?: string
          source_reference?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirements_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      source_code_files: {
        Row: {
          chunk_count: number | null
          created_at: string
          file_count: number | null
          id: string
          language_stats: Json | null
          project_id: string
          status: string
          zip_name: string
        }
        Insert: {
          chunk_count?: number | null
          created_at?: string
          file_count?: number | null
          id?: string
          language_stats?: Json | null
          project_id: string
          status?: string
          zip_name: string
        }
        Update: {
          chunk_count?: number | null
          created_at?: string
          file_count?: number | null
          id?: string
          language_stats?: Json | null
          project_id?: string
          status?: string
          zip_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "source_code_files_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
        ]
      }
      test_cases: {
        Row: {
          api_endpoint: string | null
          automation_eligible: boolean | null
          created_at: string
          description: string | null
          expected_result: string
          id: string
          module: string | null
          preconditions: string | null
          priority: string
          requirement_id: string
          source: string | null
          source_ref: string | null
          status: string
          steps: string
          tc_code: string
          test_level: string
          test_suite: string | null
          test_type: string | null
          title: string
          updated_at: string
        }
        Insert: {
          api_endpoint?: string | null
          automation_eligible?: boolean | null
          created_at?: string
          description?: string | null
          expected_result: string
          id?: string
          module?: string | null
          preconditions?: string | null
          priority?: string
          requirement_id: string
          source?: string | null
          source_ref?: string | null
          status?: string
          steps: string
          tc_code: string
          test_level?: string
          test_suite?: string | null
          test_type?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          api_endpoint?: string | null
          automation_eligible?: boolean | null
          created_at?: string
          description?: string | null
          expected_result?: string
          id?: string
          module?: string | null
          preconditions?: string | null
          priority?: string
          requirement_id?: string
          source?: string | null
          source_ref?: string | null
          status?: string
          steps?: string
          tc_code?: string
          test_level?: string
          test_suite?: string | null
          test_type?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "test_cases_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      test_runs: {
        Row: {
          callback_token: string
          completed_at: string | null
          created_at: string
          error_message: string | null
          failed: number
          id: string
          passed: number
          project_id: string
          results_json: Json | null
          skipped: number
          status: string
          total_tests: number
          triggered_at: string
          updated_at: string
          webhook_url: string | null
        }
        Insert: {
          callback_token?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed?: number
          id?: string
          passed?: number
          project_id: string
          results_json?: Json | null
          skipped?: number
          status?: string
          total_tests?: number
          triggered_at?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Update: {
          callback_token?: string
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          failed?: number
          id?: string
          passed?: number
          project_id?: string
          results_json?: Json | null
          skipped?: number
          status?: string
          total_tests?: number
          triggered_at?: string
          updated_at?: string
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "test_runs_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "project_settings"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      match_chunks: {
        Args: {
          match_limit?: number
          match_project_id: string
          match_source_types?: string[]
          match_threshold?: number
          query_embedding: string
        }
        Returns: {
          content: string
          id: string
          metadata: Json
          page_number: number
          screen_name: string
          section_name: string
          similarity: number
          source_type: string
        }[]
      }
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
