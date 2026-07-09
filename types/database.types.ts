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
export type ContractStatus = 'draft' | 'sent' | 'signed' | 'declined';
export type PricingRoleKind = 'standard' | 'photographer' | 'drone';
export type PricingPhase = 'pre' | 'post';

// Generic JSON column type (quotes.calculator_state).
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
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
          created_at: string;
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
          created_at?: string;
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
          created_at?: string;
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
      paepae_actions: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          summary: string[];
          result: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          summary?: string[];
          result?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          action?: string;
          summary?: string[];
          result?: string | null;
          created_at?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
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
