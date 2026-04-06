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
          language: 'th' | 'en';
          fcm_token: string | null;
          tier: 'free' | 'pro';
          created_at: string;
        };
        Insert: {
          id: string;
          role: 'landlord' | 'tenant';
          full_name?: string | null;
          phone?: string | null;
          language?: 'th' | 'en';
          fcm_token?: string | null;
          tier?: 'free' | 'pro';
          created_at?: string;
        };
        Update: {
          id?: string;
          role?: 'landlord' | 'tenant';
          full_name?: string | null;
          phone?: string | null;
          language?: 'th' | 'en';
          fcm_token?: string | null;
          tier?: 'free' | 'pro';
          created_at?: string;
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
          status: 'active' | 'expired' | 'terminated';
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
          status?: 'active' | 'expired' | 'terminated';
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
          status?: 'active' | 'expired' | 'terminated';
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
      maintenance_requests: {
        Row: {
          id: string;
          contract_id: string;
          raised_by: string;
          title: string;
          description: string | null;
          photo_urls: string[];
          status: 'open' | 'in_progress' | 'resolved';
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
}
