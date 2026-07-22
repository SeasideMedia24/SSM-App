// Database types for the Supabase schema (see supabase/migrations/).
//
// These are hand-written to match the migrations exactly. Once the schema is
// applied you can optionally regenerate them from the live database with:
//   npx supabase gen types typescript --project-id <ref> > types/database.types.ts
// Keep this file and the migrations in sync.

export type ProjectStatus =
  | 'idea_inquiry'
  | 'scripting_planning'
  | 'filming'
  | 'editing'
  | 'review_revision'
  | 'scheduled'
  | 'archived';
export type ParaCategory = 'project' | 'area' | 'resource' | 'archive';
export type TaskStatus = 'not_started' | 'in_progress' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined';
export type InvoiceStatus = 'draft' | 'sent' | 'paid';
export type ClientType = 'recurring' | 'one_time' | 'campaign';
export type ContractorType = 'internal' | 'external' | 'employee';
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'declined';
export type PricingRoleKind = 'standard' | 'photographer' | 'drone';
export type PricingPhase = 'pre' | 'post';

// Generic JSON column type (quotes.calculator_state).
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      boards: {
        Row: {
          id: string;
          kind: 'storyboard' | 'shotlist' | 'brainstorm' | 'storyline';
          title: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          kind: 'storyboard' | 'shotlist' | 'brainstorm' | 'storyline';
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          kind?: 'storyboard' | 'shotlist' | 'brainstorm' | 'storyline';
          title?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      board_items: {
        Row: {
          id: string;
          board_id: string;
          type: 'note' | 'image' | 'file' | 'link' | 'embed';
          x: number;
          y: number;
          w: number;
          h: number;
          z: number;
          rotation: number;
          content: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          board_id: string;
          type: 'note' | 'image' | 'file' | 'link' | 'embed';
          x?: number;
          y?: number;
          w?: number;
          h?: number;
          z?: number;
          rotation?: number;
          content?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          board_id?: string;
          type?: 'note' | 'image' | 'file' | 'link' | 'embed';
          x?: number;
          y?: number;
          w?: number;
          h?: number;
          z?: number;
          rotation?: number;
          content?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'board_items_board_id_fkey';
            columns: ['board_id'];
            referencedRelation: 'boards';
            referencedColumns: ['id'];
          },
        ];
      };
      paepae_conversations: {
        Row: {
          id: string;
          title: string;
          messages: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          title?: string;
          messages?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          role: string | null;
          avatar_url: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          role?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          role?: string | null;
          avatar_url?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      clients: {
        Row: {
          id: string;
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          notes: string | null;
          client_type: ClientType;
          onboard_token: string | null;
          onboarded_at: string | null;
          created_at: string;
          qbo_customer_id: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          client_type?: ClientType;
          onboard_token?: string | null;
          onboarded_at?: string | null;
          created_at?: string;
          qbo_customer_id?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          client_type?: ClientType;
          onboard_token?: string | null;
          onboarded_at?: string | null;
          created_at?: string;
          qbo_customer_id?: string | null;
        };
        Relationships: [];
      };
      projects: {
        Row: {
          id: string;
          client_id: string;
          title: string;
          description: string | null;
          status: ProjectStatus;
          para_category: ParaCategory;
          priority: TaskPriority;
          project_type: string | null;
          tags: string[];
          start_date: string | null;
          due_date: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          client_id: string;
          title: string;
          description?: string | null;
          status?: ProjectStatus;
          para_category?: ParaCategory;
          priority?: TaskPriority;
          project_type?: string | null;
          tags?: string[];
          start_date?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          client_id?: string;
          title?: string;
          description?: string | null;
          status?: ProjectStatus;
          para_category?: ParaCategory;
          priority?: TaskPriority;
          project_type?: string | null;
          tags?: string[];
          start_date?: string | null;
          due_date?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'projects_client_id_fkey';
            columns: ['client_id'];
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
        ];
      };
      tasks: {
        Row: {
          id: string;
          project_id: string | null;
          client_id: string | null;
          title: string;
          description: string | null;
          status: TaskStatus;
          assignee_id: string | null;
          priority: TaskPriority;
          due_date: string | null;
          worker_note: string | null;
          archived_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id?: string | null;
          client_id?: string | null;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          assignee_id?: string | null;
          priority?: TaskPriority;
          due_date?: string | null;
          worker_note?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string | null;
          client_id?: string | null;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          assignee_id?: string | null;
          priority?: TaskPriority;
          due_date?: string | null;
          worker_note?: string | null;
          archived_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_client_id_fkey';
            columns: ['client_id'];
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      quotes: {
        Row: {
          id: string;
          client_id: string;
          project_id: string | null;
          title: string;
          status: QuoteStatus;
          subtotal: number;
          total: number;
          notes: string | null;
          calculator_state: Json | null;
          share_token: string | null;
          created_at: string;
          dashboard_archived_at: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_id?: string | null;
          title: string;
          status?: QuoteStatus;
          subtotal?: number;
          total?: number;
          notes?: string | null;
          calculator_state?: Json | null;
          share_token?: string | null;
          created_at?: string;
          dashboard_archived_at?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          project_id?: string | null;
          title?: string;
          status?: QuoteStatus;
          subtotal?: number;
          total?: number;
          notes?: string | null;
          calculator_state?: Json | null;
          share_token?: string | null;
          created_at?: string;
          dashboard_archived_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'quotes_client_id_fkey';
            columns: ['client_id'];
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'quotes_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      quote_line_items: {
        Row: {
          id: string;
          quote_id: string;
          label: string;
          quantity: number;
          unit: string | null;
          rate: number;
          amount: number;
          position: number;
        };
        Insert: {
          id?: string;
          quote_id: string;
          label: string;
          quantity?: number;
          unit?: string | null;
          rate?: number;
          amount?: number;
          position?: number;
        };
        Update: {
          id?: string;
          quote_id?: string;
          label?: string;
          quantity?: number;
          unit?: string | null;
          rate?: number;
          amount?: number;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'quote_line_items_quote_id_fkey';
            columns: ['quote_id'];
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
        ];
      };
      invoices: {
        Row: {
          id: string;
          client_id: string;
          project_id: string | null;
          quote_id: string | null;
          invoice_number: string | null;
          title: string;
          status: InvoiceStatus;
          notes: string | null;
          subtotal: number;
          total: number;
          issue_date: string | null;
          due_date: string | null;
          sent_at: string | null;
          paid_at: string | null;
          share_token: string | null;
          created_at: string;
          qbo_invoice_id: string | null;
          qbo_doc_number: string | null;
          qbo_synced_at: string | null;
          qbo_sync_error: string | null;
          qbo_estimate_id: string | null;
          qbo_estimate_number: string | null;
          qbo_estimate_sent_at: string | null;
          qbo_payment_link: string | null;
        };
        Insert: {
          id?: string;
          client_id: string;
          project_id?: string | null;
          quote_id?: string | null;
          invoice_number?: string | null;
          title: string;
          status?: InvoiceStatus;
          notes?: string | null;
          subtotal?: number;
          total?: number;
          issue_date?: string | null;
          due_date?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          share_token?: string | null;
          created_at?: string;
          qbo_invoice_id?: string | null;
          qbo_doc_number?: string | null;
          qbo_synced_at?: string | null;
          qbo_sync_error?: string | null;
          qbo_estimate_id?: string | null;
          qbo_estimate_number?: string | null;
          qbo_estimate_sent_at?: string | null;
          qbo_payment_link?: string | null;
        };
        Update: {
          id?: string;
          client_id?: string;
          project_id?: string | null;
          quote_id?: string | null;
          invoice_number?: string | null;
          title?: string;
          status?: InvoiceStatus;
          notes?: string | null;
          subtotal?: number;
          total?: number;
          issue_date?: string | null;
          due_date?: string | null;
          sent_at?: string | null;
          paid_at?: string | null;
          share_token?: string | null;
          created_at?: string;
          qbo_invoice_id?: string | null;
          qbo_doc_number?: string | null;
          qbo_synced_at?: string | null;
          qbo_sync_error?: string | null;
          qbo_estimate_id?: string | null;
          qbo_estimate_number?: string | null;
          qbo_estimate_sent_at?: string | null;
          qbo_payment_link?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'invoices_client_id_fkey';
            columns: ['client_id'];
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'invoices_quote_id_fkey';
            columns: ['quote_id'];
            referencedRelation: 'quotes';
            referencedColumns: ['id'];
          },
        ];
      };
      invoice_line_items: {
        Row: {
          id: string;
          invoice_id: string;
          label: string;
          quantity: number;
          unit: string | null;
          rate: number;
          amount: number;
          position: number;
        };
        Insert: {
          id?: string;
          invoice_id: string;
          label: string;
          quantity?: number;
          unit?: string | null;
          rate?: number;
          amount?: number;
          position?: number;
        };
        Update: {
          id?: string;
          invoice_id?: string;
          label?: string;
          quantity?: number;
          unit?: string | null;
          rate?: number;
          amount?: number;
          position?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'invoice_line_items_invoice_id_fkey';
            columns: ['invoice_id'];
            referencedRelation: 'invoices';
            referencedColumns: ['id'];
          },
        ];
      };
      contractors: {
        Row: {
          id: string;
          name: string;
          email: string | null;
          phone: string | null;
          type: ContractorType;
          role: string | null;
          rate_full: number | null;
          rate_half: number | null;
          rate_hourly: number | null;
          notes: string | null;
          onboard_token: string | null;
          onboarded_at: string | null;
          user_id: string | null;
          clearance: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          email?: string | null;
          phone?: string | null;
          type?: ContractorType;
          role?: string | null;
          rate_full?: number | null;
          rate_half?: number | null;
          rate_hourly?: number | null;
          notes?: string | null;
          onboard_token?: string | null;
          onboarded_at?: string | null;
          user_id?: string | null;
          clearance?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          email?: string | null;
          phone?: string | null;
          type?: ContractorType;
          role?: string | null;
          rate_full?: number | null;
          rate_half?: number | null;
          rate_hourly?: number | null;
          notes?: string | null;
          onboard_token?: string | null;
          onboarded_at?: string | null;
          user_id?: string | null;
          clearance?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'contractors_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      project_contractors: {
        Row: {
          id: string;
          project_id: string;
          contractor_id: string;
          role: string | null;
          rate: number | null;
          rate_unit: string | null;
          clearance: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          contractor_id: string;
          role?: string | null;
          rate?: number | null;
          rate_unit?: string | null;
          clearance?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          contractor_id?: string;
          role?: string | null;
          rate?: number | null;
          rate_unit?: string | null;
          clearance?: number | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'project_contractors_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'project_contractors_contractor_id_fkey';
            columns: ['contractor_id'];
            referencedRelation: 'contractors';
            referencedColumns: ['id'];
          },
        ];
      };
      threads: {
        Row: {
          id: string;
          kind: 'project' | 'dm';
          project_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          kind: 'project' | 'dm';
          project_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          kind?: 'project' | 'dm';
          project_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'threads_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      thread_participants: {
        Row: {
          thread_id: string;
          user_id: string;
          last_read_at: string | null;
          notified_at: string | null;
        };
        Insert: {
          thread_id: string;
          user_id: string;
          last_read_at?: string | null;
          notified_at?: string | null;
        };
        Update: {
          thread_id?: string;
          user_id?: string;
          last_read_at?: string | null;
          notified_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'thread_participants_thread_id_fkey';
            columns: ['thread_id'];
            referencedRelation: 'threads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'thread_participants_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      messages: {
        Row: {
          id: string;
          thread_id: string;
          sender_id: string;
          body: string;
          ref_type: string | null;
          ref_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          thread_id: string;
          sender_id: string;
          body: string;
          ref_type?: string | null;
          ref_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          thread_id?: string;
          sender_id?: string;
          body?: string;
          ref_type?: string | null;
          ref_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'messages_thread_id_fkey';
            columns: ['thread_id'];
            referencedRelation: 'threads';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'messages_sender_id_fkey';
            columns: ['sender_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      paepae_actions: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          summary: string[];
          result: string | null;
          created_at: string;
          archived_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          summary?: string[];
          result?: string | null;
          created_at?: string;
          archived_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          summary?: string[];
          result?: string | null;
          created_at?: string;
          archived_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'paepae_actions_user_id_fkey';
            columns: ['user_id'];
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
        ];
      };
      rate_presets: {
        Row: {
          id: string;
          label: string;
          unit: string;
          default_rate: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          label: string;
          unit: string;
          default_rate?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          label?: string;
          unit?: string;
          default_rate?: number;
          created_at?: string;
        };
        Relationships: [];
      };
      pricing_roles: {
        Row: {
          id: string;
          name: string;
          kind: PricingRoleKind;
          day_rate: number;
          half_rate: number;
          hour_rate: number;
          has_quantity: boolean;
          sort: number;
        };
        Insert: {
          id?: string;
          name: string;
          kind?: PricingRoleKind;
          day_rate?: number;
          half_rate?: number;
          hour_rate?: number;
          has_quantity?: boolean;
          sort?: number;
        };
        Update: {
          id?: string;
          name?: string;
          kind?: PricingRoleKind;
          day_rate?: number;
          half_rate?: number;
          hour_rate?: number;
          has_quantity?: boolean;
          sort?: number;
        };
        Relationships: [];
      };
      pricing_page_services: {
        Row: {
          id: string;
          name: string;
          phase: PricingPhase;
          page_rate: number;
          sort: number;
        };
        Insert: {
          id?: string;
          name: string;
          phase: PricingPhase;
          page_rate?: number;
          sort?: number;
        };
        Update: {
          id?: string;
          name?: string;
          phase?: PricingPhase;
          page_rate?: number;
          sort?: number;
        };
        Relationships: [];
      };
      pricing_config: {
        Row: {
          key: string;
          value: number;
        };
        Insert: {
          key: string;
          value?: number;
        };
        Update: {
          key?: string;
          value?: number;
        };
        Relationships: [];
      };
      deliverables: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          description: string | null;
          status: TaskStatus;
          due_date: string | null;
          position: number;
          created_at: string;
          assignee_id: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          description?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
          position?: number;
          created_at?: string;
          assignee_id?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          description?: string | null;
          status?: TaskStatus;
          due_date?: string | null;
          position?: number;
          created_at?: string;
          assignee_id?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'deliverables_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      contracts: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          status: ContractStatus;
          amount: number | null;
          signed_date: string | null;
          file_url: string | null;
          notes: string | null;
          position: number;
          created_at: string;
          share_token: string | null;
          quote_id: string | null;
          effective_date: string | null;
          deposit_amount: number | null;
          production_amount: number | null;
          delivery_amount: number | null;
          revision_rounds: number;
          revision_pct: number;
          body_md: string | null;
          deliverables_snapshot: Json | null;
          signer_name: string | null;
          signer_title: string | null;
          signed_at: string | null;
          signer_ip: string | null;
          deposit_invoice_id: string | null;
          production_date: string | null;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          status?: ContractStatus;
          amount?: number | null;
          signed_date?: string | null;
          file_url?: string | null;
          notes?: string | null;
          position?: number;
          created_at?: string;
          share_token?: string | null;
          quote_id?: string | null;
          effective_date?: string | null;
          deposit_amount?: number | null;
          production_amount?: number | null;
          delivery_amount?: number | null;
          revision_rounds?: number;
          revision_pct?: number;
          body_md?: string | null;
          deliverables_snapshot?: Json | null;
          signer_name?: string | null;
          signer_title?: string | null;
          signed_at?: string | null;
          signer_ip?: string | null;
          deposit_invoice_id?: string | null;
          production_date?: string | null;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          status?: ContractStatus;
          amount?: number | null;
          signed_date?: string | null;
          file_url?: string | null;
          notes?: string | null;
          position?: number;
          created_at?: string;
          share_token?: string | null;
          quote_id?: string | null;
          effective_date?: string | null;
          deposit_amount?: number | null;
          production_amount?: number | null;
          delivery_amount?: number | null;
          revision_rounds?: number;
          revision_pct?: number;
          body_md?: string | null;
          deliverables_snapshot?: Json | null;
          signer_name?: string | null;
          signer_title?: string | null;
          signed_at?: string | null;
          signer_ip?: string | null;
          deposit_invoice_id?: string | null;
          production_date?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'contracts_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      expenses: {
        Row: {
          id: string;
          project_id: string;
          label: string;
          category: string | null;
          amount: number;
          spent_on: string | null;
          notes: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          label: string;
          category?: string | null;
          amount?: number;
          spent_on?: string | null;
          notes?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          label?: string;
          category?: string | null;
          amount?: number;
          spent_on?: string | null;
          notes?: string | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'expenses_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      budget_lines: {
        Row: {
          id: string;
          project_id: string;
          label: string;
          planned_amount: number;
          actual_amount: number;
          notes: string | null;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          label: string;
          planned_amount?: number;
          actual_amount?: number;
          notes?: string | null;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          label?: string;
          planned_amount?: number;
          actual_amount?: number;
          notes?: string | null;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'budget_lines_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      milestones: {
        Row: {
          id: string;
          project_id: string;
          title: string;
          date: string | null;
          status: TaskStatus;
          position: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          title: string;
          date?: string | null;
          status?: TaskStatus;
          position?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          title?: string;
          date?: string | null;
          status?: TaskStatus;
          position?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'milestones_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      onboarding_submissions: {
        Row: {
          id: string;
          name: string;
          company: string | null;
          email: string | null;
          phone: string | null;
          project_type: string | null;
          project_description: string | null;
          budget_range: string | null;
          desired_timeline: string | null;
          heard_from: string | null;
          status: string;
          client_id: string | null;
          project_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          project_type?: string | null;
          project_description?: string | null;
          budget_range?: string | null;
          desired_timeline?: string | null;
          heard_from?: string | null;
          status?: string;
          client_id?: string | null;
          project_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          project_type?: string | null;
          project_description?: string | null;
          budget_range?: string | null;
          desired_timeline?: string | null;
          heard_from?: string | null;
          status?: string;
          client_id?: string | null;
          project_id?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'onboarding_submissions_client_id_fkey';
            columns: ['client_id'];
            referencedRelation: 'clients';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'onboarding_submissions_project_id_fkey';
            columns: ['project_id'];
            referencedRelation: 'projects';
            referencedColumns: ['id'];
          },
        ];
      };
      client_portal: {
        Row: {
          project_id: string;
          portal_token: string | null;
          brand: Json | null;
          tech: Json | null;
          links: Json | null;
          kickoff_at: string | null;
          kickoff_link: string | null;
          submitted_at: string | null;
          review_link: string | null;
          created_at: string;
        };
        Insert: {
          project_id: string;
          portal_token?: string | null;
          brand?: Json | null;
          tech?: Json | null;
          links?: Json | null;
          kickoff_at?: string | null;
          kickoff_link?: string | null;
          submitted_at?: string | null;
          review_link?: string | null;
          created_at?: string;
        };
        Update: {
          project_id?: string;
          portal_token?: string | null;
          brand?: Json | null;
          tech?: Json | null;
          links?: Json | null;
          kickoff_at?: string | null;
          kickoff_link?: string | null;
          submitted_at?: string | null;
          review_link?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      portal_assets: {
        Row: {
          id: string;
          project_id: string;
          storage_path: string;
          filename: string;
          size: number | null;
          content_type: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          project_id: string;
          storage_path: string;
          filename: string;
          size?: number | null;
          content_type?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          project_id?: string;
          storage_path?: string;
          filename?: string;
          size?: number | null;
          content_type?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      qbo_accounts: {
        Row: {
          user_id: string;
          realm_id: string;
          refresh_token: string;
          access_token: string | null;
          access_token_expires_at: string | null;
          default_item_id: string | null;
          company_name: string | null;
          connected_at: string;
        };
        Insert: {
          user_id: string;
          realm_id: string;
          refresh_token: string;
          access_token?: string | null;
          access_token_expires_at?: string | null;
          default_item_id?: string | null;
          company_name?: string | null;
          connected_at?: string;
        };
        Update: {
          user_id?: string;
          realm_id?: string;
          refresh_token?: string;
          access_token?: string | null;
          access_token_expires_at?: string | null;
          default_item_id?: string | null;
          company_name?: string | null;
          connected_at?: string;
        };
        Relationships: [];
      };
      google_accounts: {
        Row: {
          user_id: string;
          email: string | null;
          refresh_token: string;
          access_token: string | null;
          access_token_expires_at: string | null;
          connected_at: string;
        };
        Insert: {
          user_id: string;
          email?: string | null;
          refresh_token: string;
          access_token?: string | null;
          access_token_expires_at?: string | null;
          connected_at?: string;
        };
        Update: {
          user_id?: string;
          email?: string | null;
          refresh_token?: string;
          access_token?: string | null;
          access_token_expires_at?: string | null;
          connected_at?: string;
        };
        Relationships: [];
      };
      google_calendars: {
        Row: {
          user_id: string;
          id: string;
          summary: string;
          color: string | null;
          is_primary: boolean;
          included: boolean;
          merge_ssm: boolean;
        };
        Insert: {
          user_id: string;
          id: string;
          summary?: string;
          color?: string | null;
          is_primary?: boolean;
          included?: boolean;
          merge_ssm?: boolean;
        };
        Update: {
          user_id?: string;
          id?: string;
          summary?: string;
          color?: string | null;
          is_primary?: boolean;
          included?: boolean;
          merge_ssm?: boolean;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      unread_message_count: {
        Args: Record<string, never>;
        Returns: number;
      };
      my_clearance: {
        Args: { pid: string };
        Returns: number;
      };
    };
    Enums: {
      project_status: ProjectStatus;
      para_category: ParaCategory;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      quote_status: QuoteStatus;
      client_type: ClientType;
      contract_status: ContractStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
