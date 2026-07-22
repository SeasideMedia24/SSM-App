// Assigning a specific task/deliverable to someone auto-adds them to the project
// (at their default clearance) so they can actually see and work the item, and
// makes sure the project's message thread exists. Owner-driven; RLS lets the
// owner write project_contractors. No-op when they're already a member.

import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type DB = SupabaseClient<Database>;

// Returns true if the user maps to a linked contractor (a valid assignee).
export async function ensureProjectMembership(supabase: DB, projectId: string, userId: string): Promise<boolean> {
  const { data: contractor } = await supabase.from('contractors').select('id').eq('user_id', userId).maybeSingle();
  if (!contractor) return false;

  const { data: existing } = await supabase
    .from('project_contractors')
    .select('id')
    .eq('project_id', projectId)
    .eq('contractor_id', contractor.id)
    .maybeSingle();
  if (!existing) {
    // clearance left null → uses the person's default (my_clearance resolves it).
    await supabase.from('project_contractors').insert({ project_id: projectId, contractor_id: contractor.id });
    // Make sure the project thread exists so they can be looped in.
    const { data: thread } = await supabase.from('threads').select('id').eq('kind', 'project').eq('project_id', projectId).maybeSingle();
    if (!thread) await supabase.from('threads').insert({ kind: 'project', project_id: projectId });
  }
  return true;
}
