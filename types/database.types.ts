// Database types for the Supabase schema (see supabase/migrations/).
//
// These are hand-written to match the migrations exactly. Once the schema is
// applied you can optionally regenerate them from the live database with:
//   npx supabase gen types typescript --project-id <ref> > types/database.types.ts
// Keep this file and the migrations in sync.

export type ProjectStatus = 'backlog' | 'active' | 'in_review' | 'done' | 'archived';
export type ParaCategory = 'project' | 'area' | 'resource' | 'archive';
export type TaskStatus = 'todo' | 'in_progress' | 'blocked' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high';
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined';

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
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          company?: string | null;
          email?: string | null;
          phone?: string | null;
          notes?: string | null;
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
          project_id: string;
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
          project_id: string;
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
          project_id?: string;
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
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      project_status: ProjectStatus;
      para_category: ParaCategory;
      task_status: TaskStatus;
      task_priority: TaskPriority;
      quote_status: QuoteStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};
