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
      ad_watches: {
        Row: {
          created_at: string
          id: string
          provider: string
          reward_mint: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          provider: string
          reward_mint?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          provider?: string
          reward_mint?: number
          user_id?: string
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          ad_reward_mint: number
          farming_cycle_hours: number
          farming_reward_mint: number
          id: number
          max_energy: number
          min_withdrawal_ton: number
          referral_l1_percent: number
          referral_l2_percent: number
          referral_l3_percent: number
          referral_usdt: number
          tap_reward_mint: number
          updated_at: string
          withdrawal_fee_percent: number
        }
        Insert: {
          ad_reward_mint?: number
          farming_cycle_hours?: number
          farming_reward_mint?: number
          id: number
          max_energy?: number
          min_withdrawal_ton?: number
          referral_l1_percent?: number
          referral_l2_percent?: number
          referral_l3_percent?: number
          referral_usdt?: number
          tap_reward_mint?: number
          updated_at?: string
          withdrawal_fee_percent?: number
        }
        Update: {
          ad_reward_mint?: number
          farming_cycle_hours?: number
          farming_reward_mint?: number
          id?: number
          max_energy?: number
          min_withdrawal_ton?: number
          referral_l1_percent?: number
          referral_l2_percent?: number
          referral_l3_percent?: number
          referral_usdt?: number
          tap_reward_mint?: number
          updated_at?: string
          withdrawal_fee_percent?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          device_fingerprint: string | null
          display_name: string | null
          energy: number
          farming_claimed_at: string | null
          farming_started_at: string | null
          id: string
          ip_address: string | null
          max_energy: number
          mint_balance: number
          referral_count: number
          referred_by: string | null
          telegram_id: number | null
          telegram_photo_url: string | null
          telegram_username: string | null
          ton_balance: number
          total_ads_watched: number
          total_taps: number
          updated_at: string
          usdt_balance: number
          user_id: string
        }
        Insert: {
          created_at?: string
          device_fingerprint?: string | null
          display_name?: string | null
          energy?: number
          farming_claimed_at?: string | null
          farming_started_at?: string | null
          id?: string
          ip_address?: string | null
          max_energy?: number
          mint_balance?: number
          referral_count?: number
          referred_by?: string | null
          telegram_id?: number | null
          telegram_photo_url?: string | null
          telegram_username?: string | null
          ton_balance?: number
          total_ads_watched?: number
          total_taps?: number
          updated_at?: string
          usdt_balance?: number
          user_id: string
        }
        Update: {
          created_at?: string
          device_fingerprint?: string | null
          display_name?: string | null
          energy?: number
          farming_claimed_at?: string | null
          farming_started_at?: string | null
          id?: string
          ip_address?: string | null
          max_energy?: number
          mint_balance?: number
          referral_count?: number
          referred_by?: string | null
          telegram_id?: number | null
          telegram_photo_url?: string | null
          telegram_username?: string | null
          ton_balance?: number
          total_ads_watched?: number
          total_taps?: number
          updated_at?: string
          usdt_balance?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promo_codes: {
        Row: {
          code: string
          created_at: string
          current_uses: number
          id: string
          is_active: boolean
          max_uses: number | null
          reward_mint: number
        }
        Insert: {
          code: string
          created_at?: string
          current_uses?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward_mint?: number
        }
        Update: {
          code?: string
          created_at?: string
          current_uses?: number
          id?: string
          is_active?: boolean
          max_uses?: number | null
          reward_mint?: number
        }
        Relationships: []
      }
      promo_redemptions: {
        Row: {
          created_at: string
          id: string
          promo_code_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          promo_code_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          promo_code_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "promo_redemptions_promo_code_id_fkey"
            columns: ["promo_code_id"]
            isOneToOne: false
            referencedRelation: "promo_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string
          id: string
          is_valid: boolean
          level: number
          referred_id: string
          referrer_id: string
          usdt_rewarded: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_valid?: boolean
          level?: number
          referred_id: string
          referrer_id: string
          usdt_rewarded?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_valid?: boolean
          level?: number
          referred_id?: string
          referrer_id?: string
          usdt_rewarded?: number
        }
        Relationships: [
          {
            foreignKeyName: "referrals_referred_id_fkey"
            columns: ["referred_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          reward_mint: number
          telegram_channel: string | null
          title: string
          type: Database["public"]["Enums"]["task_type"]
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          reward_mint?: number
          telegram_channel?: string | null
          title: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          reward_mint?: number
          telegram_channel?: string | null
          title?: string
          type?: Database["public"]["Enums"]["task_type"]
          updated_at?: string
          url?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_tasks: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          status: Database["public"]["Enums"]["task_status"]
          task_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          task_id: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["task_status"]
          task_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_tasks_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      withdrawals: {
        Row: {
          admin_note: string | null
          amount_ton: number
          created_at: string
          fee_ton: number
          id: string
          net_ton: number
          processed_at: string | null
          status: Database["public"]["Enums"]["withdrawal_status"]
          updated_at: string
          user_id: string
          wallet_address: string
        }
        Insert: {
          admin_note?: string | null
          amount_ton: number
          created_at?: string
          fee_ton?: number
          id?: string
          net_ton?: number
          processed_at?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id: string
          wallet_address: string
        }
        Update: {
          admin_note?: string | null
          amount_ton?: number
          created_at?: string
          fee_ton?: number
          id?: string
          net_ton?: number
          processed_at?: string | null
          status?: Database["public"]["Enums"]["withdrawal_status"]
          updated_at?: string
          user_id?: string
          wallet_address?: string
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
      increment_referral_count: {
        Args: { profile_id: string }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "admin" | "user"
      task_status: "pending" | "completed"
      task_type: "telegram" | "external"
      withdrawal_status: "pending" | "approved" | "rejected"
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
      task_status: ["pending", "completed"],
      task_type: ["telegram", "external"],
      withdrawal_status: ["pending", "approved", "rejected"],
    },
  },
} as const
