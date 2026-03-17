import supabase from '../config/supabase';

const AssetAuditLogService = {

  async log({ action, assetId, assetCode, performedBy, snapshot, reason = '' }) {
    try {
      const { data, error } = await supabase
        .from('asset_audit_log')
        .insert([{
          action,
          asset_id:     assetCode,   // the human-readable ID e.g. COM-123
          asset_uuid:   assetId,     // the DB uuid
          performed_by: performedBy,
          reason:       reason || '',
          snapshot:     snapshot || null,
          performed_at: new Date().toISOString(),
        }])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (err) {
      console.error('[AssetAuditLog] Failed to write entry:', err);
      return null;
    }
  },

  async getAll({ page = 1, pageSize = 15 } = {}) {
    try {
      const from = (page - 1) * pageSize;
      const to   = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('asset_audit_log')
        .select('*', { count: 'exact' })
        .order('performed_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (err) {
      console.error('[AssetAuditLog] Failed to fetch:', err);
      return { data: [], count: 0 };
    }
  },
};

export default AssetAuditLogService;