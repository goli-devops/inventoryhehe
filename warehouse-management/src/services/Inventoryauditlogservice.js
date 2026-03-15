import supabase from '../config/supabase';

const InventoryAuditLogService = {

  async log({ action, itemCode, itemId, performedBy, snapshot, reason = '' }) {
    try {
      const { data, error } = await supabase
        .from('inventory_audit_log')
        .insert([{
          action,
          item_code:    itemCode,
          item_id:      itemId,
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
      console.error('[InventoryAuditLog] Failed to write entry:', err);
      return null;
    }
  },

  async getAll({ page = 1, pageSize = 15 } = {}) {
    try {
      const from = (page - 1) * pageSize;
      const to   = from + pageSize - 1;

      const { data, error, count } = await supabase
        .from('inventory_audit_log')
        .select('*', { count: 'exact' })
        .order('performed_at', { ascending: false })
        .range(from, to);

      if (error) throw error;
      return { data: data || [], count: count || 0 };
    } catch (err) {
      console.error('[InventoryAuditLog] Failed to fetch:', err);
      return { data: [], count: 0 };
    }
  },
};

export default InventoryAuditLogService;