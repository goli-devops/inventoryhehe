import supabase from '../config/supabase';

const AuditLogService = {

  async log({ action, prNumber, prId, performedBy, snapshot, reason = '' }) {
    try {
      const { data, error } = await supabase
        .from('pr_audit_log')
        .insert([{
          action,
          pr_number:    prNumber,
          pr_id:        prId,
          performed_by: performedBy,
          reason:       reason || '',
          snapshot:     snapshot || null,   // full PR data at time of action
          performed_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      // Non-fatal — log to console but don't block the main operation
      console.error('[AuditLog] Failed to write audit entry:', err);
      return null;
    }
  },

  async getAll({ page = 1, pageSize = 20 } = {}) {
    try {
      const from = (page - 1) * pageSize;
      const to   = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('pr_audit_log')
        .select('*', { count: 'exact' })
        .order('performed_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (err) {
      console.error('[AuditLog] Failed to fetch audit log:', err);
      return { data: [], count: 0 };
    }
  },

  async getByPRNumber(prNumber) {
    try {
      const { data, error } = await supabase
        .from('pr_audit_log')
        .select('*')
        .eq('pr_number', prNumber)
        .order('performed_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('[AuditLog] Failed to fetch by PR number:', err);
      return [];
    }
  },
};

export default AuditLogService;