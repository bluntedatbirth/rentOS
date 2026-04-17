export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: '14.5';
  };
  public: {
    Tables: {
      ai_rate_limits: {
        Row: {
          count: number;
          endpoint: string;
          user_id: string;
          window_start: string;
        };
        Insert: {
          count?: number;
          endpoint: string;
          user_id: string;
          window_start: string;
        };
        Update: {
          count?: number;
          endpoint?: string;
          user_id?: string;
          window_start?: string;
        };
        Relationships: [];
      };
      ai_spend_log: {
        Row: {
          called_at: string;
          cost_usd: number;
          endpoint: string;
          id: string;
          input_tokens: number;
          output_tokens: number;
          user_id: string;
        };
        Insert: {
          called_at?: string;
          cost_usd: number;
          endpoint: string;
          id?: string;
          input_tokens: number;
          output_tokens: number;
          user_id: string;
        };
        Update: {
          called_at?: string;
          cost_usd?: number;
          endpoint?: string;
          id?: string;
          input_tokens?: number;
          output_tokens?: number;
          user_id?: string;
        };
        Relationships: [];
      };
      contract_analyses: {
        Row: {
          analyzed_at: string;
          clause_ratings: Json;
          contract_id: string;
          id: string;
          missing_clauses: Json;
          risks: Json;
          summary_en: string | null;
          summary_th: string | null;
        };
        Insert: {
          analyzed_at?: string;
          clause_ratings?: Json;
          contract_id: string;
          id?: string;
          missing_clauses?: Json;
          risks?: Json;
          summary_en?: string | null;
          summary_th?: string | null;
        };
        Update: {
          analyzed_at?: string;
          clause_ratings?: Json;
          contract_id?: string;
          id?: string;
          missing_clauses?: Json;
          risks?: Json;
          summary_en?: string | null;
          summary_th?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contract_analyses_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: true;
            referencedRelation: 'contracts';
            referencedColumns: ['id'];
          },
        ];
      };
      contract_templates: {
        Row: {
          category: string;
          created_at: string;
          description_en: string | null;
          description_th: string | null;
          id: string;
          is_system: boolean;
          landlord_id: string | null;
          name_en: string;
          name_th: string;
          template_text: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          description_en?: string | null;
          description_th?: string | null;
          id?: string;
          is_system?: boolean;
          landlord_id?: string | null;
          name_en: string;
          name_th: string;
          template_text: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          description_en?: string | null;
          description_th?: string | null;
          id?: string;
          is_system?: boolean;
          landlord_id?: string | null;
          name_en?: string;
          name_th?: string;
          template_text?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contract_templates_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      contracts: {
        Row: {
          co_tenants: Json | null;
          created_at: string | null;
          due_day: number | null;
          file_type: string | null;
          id: string;
          landlord_id: string | null;
          lease_end: string | null;
          lease_start: string | null;
          monthly_rent: number | null;
          notes: string | null;
          original_file_url: string | null;
          pairing_code: string | null;
          pairing_expires_at: string | null;
          property_id: string | null;
          property_name: string | null;
          raw_text_th: string | null;
          renewal_changes: Json | null;
          renewed_from: string | null;
          security_deposit: number | null;
          status: string | null;
          structured_clauses: Json | null;
          tenant_id: string | null;
          translated_text_en: string | null;
        };
        Insert: {
          co_tenants?: Json | null;
          created_at?: string | null;
          due_day?: number | null;
          file_type?: string | null;
          id?: string;
          landlord_id?: string | null;
          lease_end?: string | null;
          lease_start?: string | null;
          monthly_rent?: number | null;
          notes?: string | null;
          original_file_url?: string | null;
          pairing_code?: string | null;
          pairing_expires_at?: string | null;
          property_id?: string | null;
          property_name?: string | null;
          raw_text_th?: string | null;
          renewal_changes?: Json | null;
          renewed_from?: string | null;
          security_deposit?: number | null;
          status?: string | null;
          structured_clauses?: Json | null;
          tenant_id?: string | null;
          translated_text_en?: string | null;
        };
        Update: {
          co_tenants?: Json | null;
          created_at?: string | null;
          due_day?: number | null;
          file_type?: string | null;
          id?: string;
          landlord_id?: string | null;
          lease_end?: string | null;
          lease_start?: string | null;
          monthly_rent?: number | null;
          notes?: string | null;
          original_file_url?: string | null;
          pairing_code?: string | null;
          pairing_expires_at?: string | null;
          property_id?: string | null;
          property_name?: string | null;
          raw_text_th?: string | null;
          renewal_changes?: Json | null;
          renewed_from?: string | null;
          security_deposit?: number | null;
          status?: string | null;
          structured_clauses?: Json | null;
          tenant_id?: string | null;
          translated_text_en?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contracts_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contracts_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contracts_renewed_from_fkey';
            columns: ['renewed_from'];
            isOneToOne: false;
            referencedRelation: 'contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contracts_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          category: string;
          contract_id: string | null;
          created_at: string;
          file_name: string;
          file_size: number | null;
          id: string;
          landlord_id: string;
          mime_type: string | null;
          notes: string | null;
          property_id: string | null;
          public_url: string;
          storage_path: string;
          version: number;
        };
        Insert: {
          category: string;
          contract_id?: string | null;
          created_at?: string;
          file_name: string;
          file_size?: number | null;
          id?: string;
          landlord_id: string;
          mime_type?: string | null;
          notes?: string | null;
          property_id?: string | null;
          public_url: string;
          storage_path: string;
          version?: number;
        };
        Update: {
          category?: string;
          contract_id?: string | null;
          created_at?: string;
          file_name?: string;
          file_size?: number | null;
          id?: string;
          landlord_id?: string;
          mime_type?: string | null;
          notes?: string | null;
          property_id?: string | null;
          public_url?: string;
          storage_path?: string;
          version?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'documents_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      maintenance_requests: {
        Row: {
          actual_cost: number | null;
          assigned_to: string | null;
          completed_at: string | null;
          contract_id: string;
          created_at: string | null;
          description: string | null;
          estimated_cost: number | null;
          id: string;
          photo_urls: Json | null;
          raised_by: string;
          sla_deadline: string | null;
          status: string | null;
          title: string;
        };
        Insert: {
          actual_cost?: number | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          contract_id: string;
          created_at?: string | null;
          description?: string | null;
          estimated_cost?: number | null;
          id?: string;
          photo_urls?: Json | null;
          raised_by: string;
          sla_deadline?: string | null;
          status?: string | null;
          title: string;
        };
        Update: {
          actual_cost?: number | null;
          assigned_to?: string | null;
          completed_at?: string | null;
          contract_id?: string;
          created_at?: string | null;
          description?: string | null;
          estimated_cost?: number | null;
          id?: string;
          photo_urls?: Json | null;
          raised_by?: string;
          sla_deadline?: string | null;
          status?: string | null;
          title?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'maintenance_requests_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'maintenance_requests_raised_by_fkey';
            columns: ['raised_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_rules: {
        Row: {
          created_at: string;
          days_offset: number;
          id: string;
          is_active: boolean;
          landlord_id: string;
          message_template: string;
          name: string;
          trigger_type: string;
        };
        Insert: {
          created_at?: string;
          days_offset?: number;
          id?: string;
          is_active?: boolean;
          landlord_id: string;
          message_template: string;
          name: string;
          trigger_type: string;
        };
        Update: {
          created_at?: string;
          days_offset?: number;
          id?: string;
          is_active?: boolean;
          landlord_id?: string;
          message_template?: string;
          name?: string;
          trigger_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notification_rules_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notifications: {
        Row: {
          body: string | null;
          body_en: string | null;
          body_th: string | null;
          id: string;
          payload: Json | null;
          read_at: string | null;
          recipient_id: string;
          sent_at: string | null;
          title: string | null;
          title_en: string | null;
          title_th: string | null;
          type: string | null;
          url: string | null;
        };
        Insert: {
          body?: string | null;
          body_en?: string | null;
          body_th?: string | null;
          id?: string;
          payload?: Json | null;
          read_at?: string | null;
          recipient_id: string;
          sent_at?: string | null;
          title?: string | null;
          title_en?: string | null;
          title_th?: string | null;
          type?: string | null;
          url?: string | null;
        };
        Update: {
          body?: string | null;
          body_en?: string | null;
          body_th?: string | null;
          id?: string;
          payload?: Json | null;
          read_at?: string | null;
          recipient_id?: string;
          sent_at?: string | null;
          title?: string | null;
          title_en?: string | null;
          title_th?: string | null;
          type?: string | null;
          url?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      payments: {
        Row: {
          amount: number;
          claimed_at: string | null;
          claimed_by: string | null;
          claimed_note: string | null;
          contract_id: string;
          created_at: string | null;
          due_date: string;
          id: string;
          notes: string | null;
          paid_date: string | null;
          payment_type: string | null;
          penalty_notified_at: string | null;
          promptpay_ref: string | null;
          status: string | null;
        };
        Insert: {
          amount: number;
          claimed_at?: string | null;
          claimed_by?: string | null;
          claimed_note?: string | null;
          contract_id: string;
          created_at?: string | null;
          due_date: string;
          id?: string;
          notes?: string | null;
          paid_date?: string | null;
          payment_type?: string | null;
          penalty_notified_at?: string | null;
          promptpay_ref?: string | null;
          status?: string | null;
        };
        Update: {
          amount?: number;
          claimed_at?: string | null;
          claimed_by?: string | null;
          claimed_note?: string | null;
          contract_id?: string;
          created_at?: string | null;
          due_date?: string;
          id?: string;
          notes?: string | null;
          paid_date?: string | null;
          payment_type?: string | null;
          penalty_notified_at?: string | null;
          promptpay_ref?: string | null;
          status?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_claimed_by_fkey';
            columns: ['claimed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payments_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'contracts';
            referencedColumns: ['id'];
          },
        ];
      };
      penalties: {
        Row: {
          calculated_amount: number | null;
          clause_id: string | null;
          confirmed_amount: number | null;
          contract_id: string;
          created_at: string | null;
          description_en: string | null;
          description_th: string | null;
          id: string;
          landlord_resolution_note: string | null;
          raised_by: string;
          resolved_at: string | null;
          status: string | null;
          tenant_appeal_note: string | null;
        };
        Insert: {
          calculated_amount?: number | null;
          clause_id?: string | null;
          confirmed_amount?: number | null;
          contract_id: string;
          created_at?: string | null;
          description_en?: string | null;
          description_th?: string | null;
          id?: string;
          landlord_resolution_note?: string | null;
          raised_by: string;
          resolved_at?: string | null;
          status?: string | null;
          tenant_appeal_note?: string | null;
        };
        Update: {
          calculated_amount?: number | null;
          clause_id?: string | null;
          confirmed_amount?: number | null;
          contract_id?: string;
          created_at?: string | null;
          description_en?: string | null;
          description_th?: string | null;
          id?: string;
          landlord_resolution_note?: string | null;
          raised_by?: string;
          resolved_at?: string | null;
          status?: string | null;
          tenant_appeal_note?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'penalties_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'penalties_raised_by_fkey';
            columns: ['raised_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      penalty_rules: {
        Row: {
          auto_apply: boolean;
          clause_id: string | null;
          contract_id: string;
          created_at: string;
          id: string;
          is_active: boolean;
          landlord_id: string;
          penalty_amount: number;
          penalty_description: string | null;
          trigger_days: number;
          trigger_type: string;
        };
        Insert: {
          auto_apply?: boolean;
          clause_id?: string | null;
          contract_id: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          landlord_id: string;
          penalty_amount: number;
          penalty_description?: string | null;
          trigger_days?: number;
          trigger_type: string;
        };
        Update: {
          auto_apply?: boolean;
          clause_id?: string | null;
          contract_id?: string;
          created_at?: string;
          id?: string;
          is_active?: boolean;
          landlord_id?: string;
          penalty_amount?: number;
          penalty_description?: string | null;
          trigger_days?: number;
          trigger_type?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'penalty_rules_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'contracts';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'penalty_rules_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      profiles: {
        Row: {
          active_mode: string;
          created_at: string | null;
          fcm_token: string | null;
          founding_member: boolean | null;
          full_name: string | null;
          id: string;
          language: string | null;
          notification_preferences: Json | null;
          phone: string | null;
          purchased_slots: number;
          role: string;
          tier: string | null;
          tier_expires_at: string | null;
        };
        Insert: {
          active_mode: string;
          created_at?: string | null;
          fcm_token?: string | null;
          founding_member?: boolean | null;
          full_name?: string | null;
          id: string;
          language?: string | null;
          notification_preferences?: Json | null;
          phone?: string | null;
          purchased_slots?: number;
          role: string;
          tier?: string | null;
          tier_expires_at?: string | null;
        };
        Update: {
          active_mode?: string;
          created_at?: string | null;
          fcm_token?: string | null;
          founding_member?: boolean | null;
          full_name?: string | null;
          id?: string;
          language?: string | null;
          notification_preferences?: Json | null;
          phone?: string | null;
          purchased_slots?: number;
          role?: string;
          tier?: string | null;
          tier_expires_at?: string | null;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          address: string | null;
          cover_image_url: string | null;
          created_at: string | null;
          created_by_tenant_id: string | null;
          current_tenant_id: string | null;
          daily_rate: number | null;
          grace_period_ends_at: string | null;
          id: string;
          is_active: boolean | null;
          is_shell: boolean;
          landlord_id: string | null;
          last_tenant_id: string | null;
          lease_end: string | null;
          lease_start: string | null;
          monthly_rent: number | null;
          name: string;
          pair_code: string | null;
          pair_code_rotated_at: string | null;
          previous_tenant_count: number;
          unit_number: string | null;
        };
        Insert: {
          address?: string | null;
          cover_image_url?: string | null;
          created_at?: string | null;
          created_by_tenant_id?: string | null;
          current_tenant_id?: string | null;
          daily_rate?: number | null;
          grace_period_ends_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_shell?: boolean;
          landlord_id?: string | null;
          last_tenant_id?: string | null;
          lease_end?: string | null;
          lease_start?: string | null;
          monthly_rent?: number | null;
          name: string;
          pair_code?: string | null;
          pair_code_rotated_at?: string | null;
          previous_tenant_count?: number;
          unit_number?: string | null;
        };
        Update: {
          address?: string | null;
          cover_image_url?: string | null;
          created_at?: string | null;
          created_by_tenant_id?: string | null;
          current_tenant_id?: string | null;
          daily_rate?: number | null;
          grace_period_ends_at?: string | null;
          id?: string;
          is_active?: boolean | null;
          is_shell?: boolean;
          landlord_id?: string | null;
          last_tenant_id?: string | null;
          lease_end?: string | null;
          lease_start?: string | null;
          monthly_rent?: number | null;
          name?: string;
          pair_code?: string | null;
          pair_code_rotated_at?: string | null;
          previous_tenant_count?: number;
          unit_number?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'properties_created_by_tenant_id_fkey';
            columns: ['created_by_tenant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'properties_current_tenant_id_fkey';
            columns: ['current_tenant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'properties_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'properties_last_tenant_id_fkey';
            columns: ['last_tenant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      property_images: {
        Row: {
          category: string;
          created_at: string;
          file_name: string | null;
          file_size: number | null;
          id: string;
          landlord_id: string;
          property_id: string;
          public_url: string;
          storage_path: string;
        };
        Insert: {
          category: string;
          created_at?: string;
          file_name?: string | null;
          file_size?: number | null;
          id?: string;
          landlord_id: string;
          property_id: string;
          public_url: string;
          storage_path: string;
        };
        Update: {
          category?: string;
          created_at?: string;
          file_name?: string | null;
          file_size?: number | null;
          id?: string;
          landlord_id?: string;
          property_id?: string;
          public_url?: string;
          storage_path?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'property_images_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'property_images_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
        ];
      };
      slot_purchases: {
        Row: {
          amount_thb: number;
          created_at: string;
          id: string;
          omise_charge_id: string | null;
          paid_at: string | null;
          slots_added: number;
          status: string;
          user_id: string;
        };
        Insert: {
          amount_thb: number;
          created_at?: string;
          id?: string;
          omise_charge_id?: string | null;
          paid_at?: string | null;
          slots_added: number;
          status?: string;
          user_id: string;
        };
        Update: {
          amount_thb?: number;
          created_at?: string;
          id?: string;
          omise_charge_id?: string | null;
          paid_at?: string | null;
          slots_added?: number;
          status?: string;
          user_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'slot_purchases_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_bill_payments: {
        Row: {
          bill_id: string;
          created_at: string;
          due_date: string;
          id: string;
          notes: string | null;
          paid_date: string | null;
          status: string;
        };
        Insert: {
          bill_id: string;
          created_at?: string;
          due_date: string;
          id?: string;
          notes?: string | null;
          paid_date?: string | null;
          status?: string;
        };
        Update: {
          bill_id?: string;
          created_at?: string;
          due_date?: string;
          id?: string;
          notes?: string | null;
          paid_date?: string | null;
          status?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_bill_payments_bill_id_fkey';
            columns: ['bill_id'];
            isOneToOne: false;
            referencedRelation: 'tenant_bills';
            referencedColumns: ['id'];
          },
        ];
      };
      tenant_bills: {
        Row: {
          amount: number;
          category: string;
          created_at: string;
          due_day: number;
          id: string;
          is_recurring: boolean;
          name: string;
          status: string;
          tenant_id: string;
        };
        Insert: {
          amount: number;
          category?: string;
          created_at?: string;
          due_day?: number;
          id?: string;
          is_recurring?: boolean;
          name: string;
          status?: string;
          tenant_id: string;
        };
        Update: {
          amount?: number;
          category?: string;
          created_at?: string;
          due_day?: number;
          id?: string;
          is_recurring?: boolean;
          name?: string;
          status?: string;
          tenant_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tenant_bills_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      translation_reports: {
        Row: {
          created_at: string;
          current_value: string;
          id: string;
          key: string;
          locale: string;
          reviewed_at: string | null;
          reviewed_by: string | null;
          status: string;
          suggestion: string | null;
          user_id: string;
        };
        Insert: {
          created_at?: string;
          current_value: string;
          id?: string;
          key: string;
          locale: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          suggestion?: string | null;
          user_id: string;
        };
        Update: {
          created_at?: string;
          current_value?: string;
          id?: string;
          key?: string;
          locale?: string;
          reviewed_at?: string | null;
          reviewed_by?: string | null;
          status?: string;
          suggestion?: string | null;
          user_id?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      increment_rate_limit: {
        Args: { p_endpoint: string; p_user_id: string; p_window_start: string };
        Returns: undefined;
      };
      increment_purchased_slots: {
        Args: { p_user_id: string; p_slots: number };
        Returns: undefined;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema['Tables']
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema['Enums']
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema['CompositeTypes']
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
