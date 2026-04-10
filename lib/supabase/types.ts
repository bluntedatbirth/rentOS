export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface StructuredClause {
  clause_id: string;
  title_th: string;
  title_en: string;
  text_th: string;
  text_en: string;
  category:
    | 'payment'
    | 'deposit'
    | 'maintenance'
    | 'pets'
    | 'subletting'
    | 'utilities'
    | 'noise'
    | 'penalties'
    | 'renewal'
    | 'termination'
    | 'other';
  penalty_defined: boolean;
  penalty_amount: number | null;
  penalty_currency: string | null;
  penalty_description: string | null;
}

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: 'landlord' | 'tenant';
          full_name: string | null;
          phone: string | null;
          language: 'th' | 'en' | 'zh';
          fcm_token: string | null;
          tier: 'free' | 'pro';
          notification_preferences: Json | null;
          created_at: string;
          omise_customer_id: string | null;
          omise_schedule_id: string | null;
          tier_expires_at: string | null;
          billing_cycle: string | null;
          founding_member: boolean | null;
          purchased_slots: number;
        };
        Insert: {
          id: string;
          role: 'landlord' | 'tenant';
          full_name?: string | null;
          phone?: string | null;
          language?: 'th' | 'en' | 'zh';
          fcm_token?: string | null;
          tier?: 'free' | 'pro';
          notification_preferences?: Json | null;
          created_at?: string;
          omise_customer_id?: string | null;
          omise_schedule_id?: string | null;
          tier_expires_at?: string | null;
          billing_cycle?: string | null;
          founding_member?: boolean | null;
          purchased_slots?: number;
        };
        Update: {
          id?: string;
          role?: 'landlord' | 'tenant';
          full_name?: string | null;
          phone?: string | null;
          language?: 'th' | 'en' | 'zh';
          fcm_token?: string | null;
          tier?: 'free' | 'pro';
          notification_preferences?: Json | null;
          created_at?: string;
          omise_customer_id?: string | null;
          omise_schedule_id?: string | null;
          tier_expires_at?: string | null;
          billing_cycle?: string | null;
          founding_member?: boolean | null;
          purchased_slots?: number;
        };
        Relationships: [];
      };
      properties: {
        Row: {
          id: string;
          landlord_id: string;
          name: string;
          address: string | null;
          unit_number: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          landlord_id: string;
          name: string;
          address?: string | null;
          unit_number?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          landlord_id?: string;
          name?: string;
          address?: string | null;
          unit_number?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'properties_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      contracts: {
        Row: {
          id: string;
          property_id: string;
          tenant_id: string | null;
          landlord_id: string;
          original_file_url: string | null;
          file_type: 'image' | 'pdf' | null;
          raw_text_th: string | null;
          translated_text_en: string | null;
          structured_clauses: StructuredClause[] | null;
          lease_start: string | null;
          lease_end: string | null;
          monthly_rent: number | null;
          security_deposit: number | null;
          status:
            | 'active'
            | 'expired'
            | 'terminated'
            | 'pending'
            | 'awaiting_signature'
            | 'scheduled'
            | 'parse_failed';
          pairing_code: string | null;
          pairing_expires_at: string | null;
          co_tenants: Json | null;
          renewed_from: string | null;
          renewal_changes: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          tenant_id?: string | null;
          landlord_id: string;
          original_file_url?: string | null;
          file_type?: 'image' | 'pdf' | null;
          raw_text_th?: string | null;
          translated_text_en?: string | null;
          structured_clauses?: StructuredClause[] | null;
          lease_start?: string | null;
          lease_end?: string | null;
          monthly_rent?: number | null;
          security_deposit?: number | null;
          status?:
            | 'active'
            | 'expired'
            | 'terminated'
            | 'pending'
            | 'awaiting_signature'
            | 'scheduled'
            | 'parse_failed';
          pairing_code?: string | null;
          pairing_expires_at?: string | null;
          co_tenants?: Json | null;
          renewed_from?: string | null;
          renewal_changes?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          tenant_id?: string | null;
          landlord_id?: string;
          original_file_url?: string | null;
          file_type?: 'image' | 'pdf' | null;
          raw_text_th?: string | null;
          translated_text_en?: string | null;
          structured_clauses?: StructuredClause[] | null;
          lease_start?: string | null;
          lease_end?: string | null;
          monthly_rent?: number | null;
          security_deposit?: number | null;
          status?:
            | 'active'
            | 'expired'
            | 'terminated'
            | 'pending'
            | 'awaiting_signature'
            | 'scheduled'
            | 'parse_failed';
          pairing_code?: string | null;
          pairing_expires_at?: string | null;
          co_tenants?: Json | null;
          renewed_from?: string | null;
          renewal_changes?: Json | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contracts_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contracts_tenant_id_fkey';
            columns: ['tenant_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'contracts_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      penalties: {
        Row: {
          id: string;
          contract_id: string;
          clause_id: string;
          raised_by: string;
          description_th: string | null;
          description_en: string | null;
          calculated_amount: number | null;
          confirmed_amount: number | null;
          status:
            | 'pending_landlord_review'
            | 'confirmed'
            | 'pending_tenant_appeal'
            | 'appeal_under_review'
            | 'resolved'
            | 'waived';
          tenant_appeal_note: string | null;
          landlord_resolution_note: string | null;
          created_at: string;
          resolved_at: string | null;
        };
        Insert: {
          id?: string;
          contract_id: string;
          clause_id: string;
          raised_by: string;
          description_th?: string | null;
          description_en?: string | null;
          calculated_amount?: number | null;
          confirmed_amount?: number | null;
          status?:
            | 'pending_landlord_review'
            | 'confirmed'
            | 'pending_tenant_appeal'
            | 'appeal_under_review'
            | 'resolved'
            | 'waived';
          tenant_appeal_note?: string | null;
          landlord_resolution_note?: string | null;
          created_at?: string;
          resolved_at?: string | null;
        };
        Update: {
          id?: string;
          contract_id?: string;
          clause_id?: string;
          raised_by?: string;
          description_th?: string | null;
          description_en?: string | null;
          calculated_amount?: number | null;
          confirmed_amount?: number | null;
          status?:
            | 'pending_landlord_review'
            | 'confirmed'
            | 'pending_tenant_appeal'
            | 'appeal_under_review'
            | 'resolved'
            | 'waived';
          tenant_appeal_note?: string | null;
          landlord_resolution_note?: string | null;
          created_at?: string;
          resolved_at?: string | null;
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
      payments: {
        Row: {
          id: string;
          contract_id: string;
          amount: number;
          due_date: string;
          paid_date: string | null;
          payment_type: 'rent' | 'utility' | 'deposit' | 'penalty';
          status: 'pending' | 'paid' | 'overdue';
          promptpay_ref: string | null;
          notes: string | null;
          confirmation_date: string | null;
          confirmed_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          amount: number;
          due_date: string;
          paid_date?: string | null;
          payment_type: 'rent' | 'utility' | 'deposit' | 'penalty';
          status?: 'pending' | 'paid' | 'overdue';
          promptpay_ref?: string | null;
          notes?: string | null;
          confirmation_date?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          amount?: number;
          due_date?: string;
          paid_date?: string | null;
          payment_type?: 'rent' | 'utility' | 'deposit' | 'penalty';
          status?: 'pending' | 'paid' | 'overdue';
          promptpay_ref?: string | null;
          notes?: string | null;
          confirmation_date?: string | null;
          confirmed_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_contract_id_fkey';
            columns: ['contract_id'];
            isOneToOne: false;
            referencedRelation: 'contracts';
            referencedColumns: ['id'];
          },
        ];
      };
      documents: {
        Row: {
          id: string;
          property_id: string | null;
          contract_id: string | null;
          landlord_id: string;
          category: 'contract' | 'tenant_id' | 'inspection' | 'receipt' | 'other';
          storage_path: string;
          public_url: string | null;
          file_name: string;
          file_size: number | null;
          mime_type: string | null;
          version: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id?: string | null;
          contract_id?: string | null;
          landlord_id: string;
          category: 'contract' | 'tenant_id' | 'inspection' | 'receipt' | 'other';
          storage_path: string;
          public_url?: string | null;
          file_name: string;
          file_size?: number | null;
          mime_type?: string | null;
          version?: number;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string | null;
          contract_id?: string | null;
          landlord_id?: string;
          category?: 'contract' | 'tenant_id' | 'inspection' | 'receipt' | 'other';
          storage_path?: string;
          public_url?: string | null;
          file_name?: string;
          file_size?: number | null;
          mime_type?: string | null;
          version?: number;
          notes?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'documents_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
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
        ];
      };
      maintenance_requests: {
        Row: {
          id: string;
          contract_id: string;
          raised_by: string;
          title: string;
          description: string | null;
          photo_urls: string[];
          status: 'open' | 'in_progress' | 'resolved';
          assigned_to: string | null;
          estimated_cost: number | null;
          actual_cost: number | null;
          sla_deadline: string | null;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          raised_by: string;
          title: string;
          description?: string | null;
          photo_urls?: string[];
          status?: 'open' | 'in_progress' | 'resolved';
          assigned_to?: string | null;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          sla_deadline?: string | null;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          raised_by?: string;
          title?: string;
          description?: string | null;
          photo_urls?: string[];
          status?: 'open' | 'in_progress' | 'resolved';
          assigned_to?: string | null;
          estimated_cost?: number | null;
          actual_cost?: number | null;
          sla_deadline?: string | null;
          completed_at?: string | null;
          created_at?: string;
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
      notifications: {
        Row: {
          id: string;
          recipient_id: string;
          type:
            | 'payment_due'
            | 'payment_overdue'
            | 'lease_expiry'
            | 'penalty_raised'
            | 'penalty_appeal'
            | 'penalty_resolved'
            | 'maintenance_raised'
            | 'maintenance_updated';
          title: string | null;
          body: string | null;
          sent_at: string;
          read_at: string | null;
        };
        Insert: {
          id?: string;
          recipient_id: string;
          type:
            | 'payment_due'
            | 'payment_overdue'
            | 'lease_expiry'
            | 'penalty_raised'
            | 'penalty_appeal'
            | 'penalty_resolved'
            | 'maintenance_raised'
            | 'maintenance_updated';
          title?: string | null;
          body?: string | null;
          sent_at?: string;
          read_at?: string | null;
        };
        Update: {
          id?: string;
          recipient_id?: string;
          type?:
            | 'payment_due'
            | 'payment_overdue'
            | 'lease_expiry'
            | 'penalty_raised'
            | 'penalty_appeal'
            | 'penalty_resolved'
            | 'maintenance_raised'
            | 'maintenance_updated';
          title?: string | null;
          body?: string | null;
          sent_at?: string;
          read_at?: string | null;
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
      property_images: {
        Row: {
          id: string;
          property_id: string;
          landlord_id: string;
          category: 'move_in' | 'move_out';
          storage_path: string;
          public_url: string;
          file_name: string | null;
          file_size: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          property_id: string;
          landlord_id: string;
          category: 'move_in' | 'move_out';
          storage_path: string;
          public_url: string;
          file_name?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          property_id?: string;
          landlord_id?: string;
          category?: 'move_in' | 'move_out';
          storage_path?: string;
          public_url?: string;
          file_name?: string | null;
          file_size?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'property_images_property_id_fkey';
            columns: ['property_id'];
            isOneToOne: false;
            referencedRelation: 'properties';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'property_images_landlord_id_fkey';
            columns: ['landlord_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      notification_rules: {
        Row: {
          id: string;
          landlord_id: string;
          name: string;
          trigger_type: 'payment_due' | 'payment_overdue' | 'lease_expiry' | 'custom';
          days_offset: number;
          message_template: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          landlord_id: string;
          name?: string;
          trigger_type: 'payment_due' | 'payment_overdue' | 'lease_expiry' | 'custom';
          days_offset: number;
          message_template?: string;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          trigger_type?: 'payment_due' | 'payment_overdue' | 'lease_expiry' | 'custom';
          days_offset?: number;
          message_template?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      penalty_rules: {
        Row: {
          id: string;
          contract_id: string;
          landlord_id: string;
          clause_id: string | null;
          trigger_type: string;
          trigger_days: number;
          penalty_amount: number;
          penalty_description: string | null;
          auto_apply: boolean;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          landlord_id: string;
          clause_id?: string | null;
          trigger_type: string;
          trigger_days: number;
          penalty_amount: number;
          penalty_description?: string | null;
          auto_apply?: boolean;
          is_active?: boolean;
        };
        Update: {
          clause_id?: string | null;
          trigger_type?: string;
          trigger_days?: number;
          penalty_amount?: number;
          penalty_description?: string | null;
          auto_apply?: boolean;
          is_active?: boolean;
        };
        Relationships: [];
      };
      contract_templates: {
        Row: {
          id: string;
          name_en: string;
          name_th: string;
          description_en: string | null;
          description_th: string | null;
          template_text: string;
          category: 'residential' | 'condo' | 'furnished' | 'short_term' | 'commercial';
          is_system: boolean;
          landlord_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name_en: string;
          name_th: string;
          description_en?: string | null;
          description_th?: string | null;
          template_text: string;
          category: 'residential' | 'condo' | 'furnished' | 'short_term' | 'commercial';
          is_system?: boolean;
          landlord_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name_en?: string;
          name_th?: string;
          description_en?: string | null;
          description_th?: string | null;
          template_text?: string;
          category?: 'residential' | 'condo' | 'furnished' | 'short_term' | 'commercial';
          is_system?: boolean;
          landlord_id?: string | null;
          created_at?: string;
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
      contract_analyses: {
        Row: {
          id: string;
          contract_id: string;
          risks: Json;
          missing_clauses: Json;
          summary_en: string | null;
          summary_th: string | null;
          clause_ratings: Json;
          analyzed_at: string;
        };
        Insert: {
          id?: string;
          contract_id: string;
          risks?: Json;
          missing_clauses?: Json;
          summary_en?: string | null;
          summary_th?: string | null;
          clause_ratings?: Json;
          analyzed_at?: string;
        };
        Update: {
          id?: string;
          contract_id?: string;
          risks?: Json;
          missing_clauses?: Json;
          summary_en?: string | null;
          summary_th?: string | null;
          clause_ratings?: Json;
          analyzed_at?: string;
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
      ai_rate_limits: {
        Row: {
          user_id: string;
          endpoint: string;
          window_start: string;
          count: number;
        };
        Insert: {
          user_id: string;
          endpoint: string;
          window_start: string;
          count?: number;
        };
        Update: {
          user_id?: string;
          endpoint?: string;
          window_start?: string;
          count?: number;
        };
        Relationships: [];
      };
      ai_spend_log: {
        Row: {
          id: string;
          user_id: string;
          endpoint: string;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          called_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          endpoint: string;
          input_tokens: number;
          output_tokens: number;
          cost_usd: number;
          called_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          endpoint?: string;
          input_tokens?: number;
          output_tokens?: number;
          cost_usd?: number;
          called_at?: string;
        };
        Relationships: [];
      };
      slot_purchases: {
        Row: {
          id: string;
          user_id: string;
          slots_added: number;
          amount_thb: number;
          omise_charge_id: string | null;
          status: 'pending' | 'paid' | 'failed' | 'refunded';
          created_at: string;
          paid_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          slots_added: number;
          amount_thb: number;
          omise_charge_id?: string | null;
          status?: 'pending' | 'paid' | 'failed' | 'refunded';
          created_at?: string;
          paid_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          slots_added?: number;
          amount_thb?: number;
          omise_charge_id?: string | null;
          status?: 'pending' | 'paid' | 'failed' | 'refunded';
          created_at?: string;
          paid_at?: string | null;
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
      translation_reports: {
        Row: {
          id: string;
          locale: 'th' | 'en' | 'zh';
          key: string;
          current_value: string;
          suggestion: string | null;
          user_id: string;
          status: 'pending' | 'accepted' | 'rejected' | 'applied';
          reviewed_by: string | null;
          reviewed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          locale: 'th' | 'en' | 'zh';
          key: string;
          current_value: string;
          suggestion?: string | null;
          user_id: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'applied';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          locale?: 'th' | 'en' | 'zh';
          key?: string;
          current_value?: string;
          suggestion?: string | null;
          user_id?: string;
          status?: 'pending' | 'accepted' | 'rejected' | 'applied';
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'translation_reports_user_id_fkey';
            columns: ['user_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      increment_rate_limit: {
        Args: {
          p_user_id: string;
          p_endpoint: string;
          p_window_start: string;
        };
        Returns: number;
      };
    };
    Enums: Record<string, never>;
  };
}
