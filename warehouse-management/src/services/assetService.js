import supabase from '../config/supabase';

const FIELD_LABELS = {
  description:    'Description',
  category:       'Category',
  po_number:          'PO Number',
  pr_number:          'PR Number',
  jor_number:         'JOR Number',
  serial_number:      'Serial Number',
  accountability_seq: 'Accountability Seq. No.',
  transmittal_seq:    'Transmittal Seq. No.',
  inventory_asset_tag:'Inventory Asset Tag',
  location:       'Location',
  assigned_to:    'Assigned To',
  status:         'Status',
  purchase_date:  'Purchase Date',
  purchase_price: 'Purchase Price',
  warranty:       'Warranty',
};

const AssetService = {
  generateAssetID(category) {
    const categoryCode = category.substring(0, 3).toUpperCase();
    const timestamp    = Date.now().toString().slice(-8);
    const random       = Math.floor(Math.random() * 9000 + 1000);
    return `${categoryCode}-${timestamp}${random}`;
  },

  generateQRCode(assetID) {
    return {
      qr_code: `QR-${assetID}`,
      qr_url:  `https://wms.goli.com/assets/${assetID}`
    };
  },

  async create(assetData) {
    try {
      const assetID = this.generateAssetID(assetData.category);
      const qrData  = this.generateQRCode(assetID);
      const newAsset = {
        asset_id: assetID, description: assetData.description,
        category: assetData.category,
        po_number: assetData.poNumber || '',
        pr_number: assetData.prNumber || '',
        jor_number: assetData.jorNumber || '',
        serial_number: assetData.serialNumber || '',
        accountability_seq: assetData.accountabilitySeq || '',
        transmittal_seq: assetData.transmittalSeq || '',
        inventory_asset_tag: assetData.inventoryAssetTag || '',
        location: assetData.location || '', assigned_to: assetData.assignedTo || null,
        status: assetData.status || 'Available',
        purchase_date: assetData.purchaseDate || new Date().toISOString(),
        purchase_price: assetData.purchasePrice || 0, warranty: assetData.warranty || '',
        // Use inventory QR payload if provided, otherwise generate from asset ID
        qr_code: assetData.inventoryQrCode || qrData.qr_code,
        qr_url: qrData.qr_url, is_tagged: true,
        inventory_item_id: assetData.inventoryItemId || null, created_by: assetData.createdBy,
        history: [{ action: 'Created', date: new Date().toISOString(), user: assetData.createdBy, status: assetData.status || 'Available' }],
      };
      const { data, error } = await supabase.from('assets').insert([newAsset]).select().single();
      if (error) throw error;
      return data;
    } catch (error) { console.error('Error creating asset:', error); return null; }
  },

  async getAll() {
    try {
      const { data, error } = await supabase.from('assets').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) { console.error('Error getting all assets:', error); return null; }
  },

  async getById(id) {
    try {
      const { data, error } = await supabase.from('assets').select('*').eq('id', id).single();
      if (error) throw error;
      return data;
    } catch (error) { console.error('Error getting asset:', error); return null; }
  },

  async update(id, updates) {
    try {
      const existing = await this.getById(id);
      if (!existing) return null;
      const now = new Date().toISOString();
      const updatedBy = updates.updatedBy || 'System';
      const newData = {
        description:    updates.description    ?? existing.description,
        category:       updates.category       ?? existing.category,
        po_number:          updates.poNumber           ?? updates.po_number           ?? existing.po_number,
        pr_number:          updates.prNumber           ?? updates.pr_number           ?? existing.pr_number,
        jor_number:         updates.jorNumber          ?? updates.jor_number          ?? existing.jor_number,
        accountability_seq: updates.accountabilitySeq  ?? updates.accountability_seq  ?? existing.accountability_seq,
        transmittal_seq:    updates.transmittalSeq     ?? updates.transmittal_seq     ?? existing.transmittal_seq,
        inventory_asset_tag:updates.inventoryAssetTag  ?? updates.inventory_asset_tag ?? existing.inventory_asset_tag,
        serial_number:  updates.serialNumber   ?? updates.serial_number   ?? existing.serial_number,
        location:       updates.location       ?? existing.location,
        assigned_to:    updates.assignedTo     ?? updates.assigned_to     ?? existing.assigned_to,
        status:         updates.status         ?? existing.status,
        purchase_date:  updates.purchaseDate   ?? updates.purchase_date   ?? existing.purchase_date,
        purchase_price: updates.purchasePrice  ?? updates.purchase_price  ?? existing.purchase_price,
        warranty:       updates.warranty       ?? existing.warranty,
      };
      const diffEntries = [];
      Object.keys(FIELD_LABELS).forEach(field => {
        const oldVal = String(existing[field] ?? '').trim();
        const newVal = String(newData[field]  ?? '').trim();
        if (oldVal !== newVal) {
          diffEntries.push({ action: 'Updated', date: now, user: updatedBy, field: FIELD_LABELS[field],
            from: oldVal || '(empty)', to: newVal || '(empty)',
            details: `${FIELD_LABELS[field]} changed from "${oldVal || '(empty)'}" to "${newVal || '(empty)'}"` });
        }
      });
      const newEntries = diffEntries.length > 0 ? diffEntries
        : [{ action: 'Updated', date: now, user: updatedBy, details: 'No changes detected' }];
      const updatedHistory = [...(existing.history || []), ...newEntries];
      const { data, error } = await supabase.from('assets')
        .update({ ...newData, history: updatedHistory }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) { console.error('Error updating asset:', error); return null; }
  },

  async cancel(id, reason, user) {
    try {
      const asset = await this.getById(id);
      if (!asset) return null;
      const updatedHistory = [...(asset.history || []), {
        action: 'Cancelled', date: new Date().toISOString(), user, reason,
        field: 'Status', from: asset.status, to: 'Cancelled',
        details: `Asset cancelled. Reason: ${reason}`,
      }];
      const { data, error } = await supabase.from('assets')
        .update({ status: 'Cancelled', history: updatedHistory }).eq('id', id).select().single();
      if (error) throw error;
      return { asset: data, inventoryItemId: asset.inventory_item_id };
    } catch (error) { console.error('Error cancelling asset:', error); return null; }
  },

  async assignAsset(id, assignedTo, user) {
    try {
      const asset = await this.getById(id);
      if (!asset) return null;
      const updatedHistory = [...(asset.history || []), {
        action: 'Assigned', date: new Date().toISOString(), user,
        field: 'Assigned To', from: asset.assigned_to || '(none)', to: assignedTo,
      }];
      const { data, error } = await supabase.from('assets')
        .update({ assigned_to: assignedTo, status: 'In Use', history: updatedHistory }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) { console.error('Error assigning asset:', error); return null; }
  },

  async returnAsset(id, user) {
    try {
      const asset = await this.getById(id);
      if (!asset) return null;
      const updatedHistory = [...(asset.history || []), {
        action: 'Returned', date: new Date().toISOString(), user,
        field: 'Status', from: asset.status, to: 'Available',
      }];
      const { data, error } = await supabase.from('assets')
        .update({ assigned_to: null, status: 'Available', history: updatedHistory }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    } catch (error) { console.error('Error returning asset:', error); return null; }
  },

  async delete(id) {
    try {
      const snapshot = await this.getById(id);
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;
      return { success: true, snapshot };
    } catch (error) { console.error('Error deleting asset:', error); return { success: false, snapshot: null }; }
  },

  async updateStatus(id, newStatus, user) {
    try { return await this.update(id, { status: newStatus, updatedBy: user }); }
    catch (error) { console.error('Error updating asset status:', error); return null; }
  },

  async getByStatus(status) {
    try {
      const { data, error } = await supabase.from('assets').select('*').eq('status', status).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) { return []; }
  },

  async getByCategory(category) {
    try {
      const { data, error } = await supabase.from('assets').select('*').eq('category', category).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) { return []; }
  },

  async getByAssignee(assignedTo) {
    try {
      const { data, error } = await supabase.from('assets').select('*').eq('assigned_to', assignedTo).order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    } catch (error) { return []; }
  },
};

export default AssetService;