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
  generateAssetID(category, unitIndex = 0) {
    // Use high-resolution timestamp + random + unitIndex for guaranteed uniqueness
    const categoryCode = (category || 'UNK').substring(0, 3).toUpperCase();
    const ts   = Date.now().toString(36).toUpperCase().slice(-5); // base36 timestamp
    const rand = Math.floor(Math.random() * 46656).toString(36).toUpperCase().padStart(3, '0');
    const idx  = unitIndex.toString(36).toUpperCase().padStart(2, '0');
    return `${categoryCode}-${ts}-${rand}${idx}`; // e.g. PRI-K3X2A-Z4F01 — guaranteed unique
  },

  generateQRCode(assetID) {
    // Store short reference only — full QR payload is built client-side
    const shortID = String(assetID).substring(0, 50); // hard cap at 50 chars
    return {
      qr_code: shortID,
      qr_url:  `${shortID}` // keep qr_url same as qr_code for simplicity
    };
  },

  async create(assetData) {
    try {
      const tag = assetData.inventoryAssetTag?.trim()?.substring(0, 90);
      const hasTag = !!tag;

      // If inventory item has an asset tag → use it as asset_id and generate QR
      // If no tag → use a unique generated ID for DB uniqueness, but mark as NOT tagged
      const assetID = hasTag
        ? tag
        : this.generateAssetID(assetData.category, assetData.unitIndex ?? 0);
      const qrData = hasTag ? this.generateQRCode(assetID) : { qr_code: null, qr_url: null };

      const newAsset = {
        asset_id:           assetID,
        description:        assetData.description,
        category:           assetData.category,
        po_number:          assetData.poNumber          || '',
        pr_number:          assetData.prNumber          || '',
        jor_number:         assetData.jorNumber         || '',
        serial_number:      assetData.serialNumber      || '',
        accountability_seq: assetData.accountabilitySeq || '',
        transmittal_seq:    assetData.transmittalSeq    || '',
        rr_number:          assetData.rrNumber          || '',
        si_number:          assetData.siNumber          || '',
        inventory_asset_tag:hasTag ? tag : '',   // empty = no tag
        location:           assetData.location          || '',
        assigned_to:        assetData.assignedTo        || null,
        status:             assetData.status            || 'In Progress',
        purchase_date:      assetData.purchaseDate      || new Date().toISOString(),
        purchase_price:     assetData.purchasePrice     || 0,
        warranty:           assetData.warranty          || '',
        qr_code:            qrData.qr_code,   // null when no tag → no QR in UI
        qr_url:             qrData.qr_url,
        is_tagged:          hasTag,            // false when no inventory asset tag
        inventory_item_id:  assetData.inventoryItemId   || null,
        created_by:         assetData.createdBy,
        history: [{ action: 'Created', date: new Date().toISOString(), user: assetData.createdBy, status: assetData.status || 'In Progress' }],
      };
      const { data, error } = await supabase.from('assets').insert([newAsset]).select().single();
      if (error) throw error;
      return data;
    } catch (error) { console.error('Error creating asset:', error); return null; }
  },

  // Batch insert — creates all asset records in a single DB call
  async createBatch(assetsDataArray) {
    try {
      const rows = assetsDataArray.map((assetData, idx) => {
        const tag    = assetData.inventoryAssetTag?.trim()?.substring(0, 90);
        const hasTag = !!tag;
        const assetID = hasTag
          ? tag
          : this.generateAssetID(assetData.category, assetData.unitIndex ?? idx);
        const qrData = hasTag ? this.generateQRCode(assetID) : { qr_code: null, qr_url: null };
        return {
          asset_id:           assetID,
          description:        assetData.description,
          category:           assetData.category,
          po_number:          assetData.poNumber          || '',
          pr_number:          assetData.prNumber          || '',
          jor_number:         assetData.jorNumber         || '',
          serial_number:      assetData.serialNumber      || '',
          accountability_seq: assetData.accountabilitySeq || '',
          transmittal_seq:    assetData.transmittalSeq    || '',
        rr_number:          assetData.rrNumber          || '',
        si_number:          assetData.siNumber          || '',
          inventory_asset_tag:hasTag ? tag : '',
          location:           assetData.location          || '',
          assigned_to:        assetData.assignedTo        || null,
          status:             assetData.status            || 'In Progress',
          purchase_date:      assetData.purchaseDate      || new Date().toISOString(),
          purchase_price:     assetData.purchasePrice     || 0,
          warranty:           assetData.warranty          || '',
          qr_code:            qrData.qr_code,
          qr_url:             qrData.qr_url,
          is_tagged:          hasTag,
          inventory_item_id:  assetData.inventoryItemId   || null,
          created_by:         assetData.createdBy,
          history: [{ action: 'Created', date: new Date().toISOString(), user: assetData.createdBy, status: assetData.status || 'In Progress' }],
        };
      });

      const { data, error } = await supabase
        .from('assets')
        .insert(rows)
        .select();
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error batch creating assets:', error);
      return [];
    }
  },

  async cancelBatch(ids, reason, user) {
  try {
    // 1. Fetch all assets in one query
    const { data: assets, error: fetchErr } = await supabase
      .from('assets')
      .select('*')
      .in('id', ids);

    if (fetchErr) throw fetchErr;
    if (!assets || assets.length === 0) return [];

    const now = new Date().toISOString();

    // 2. Update each asset safely (NO UPSERT)
    const updatePromises = assets.map(asset => {
      const updatedHistory = [
        ...(asset.history || []),
        {
          action: 'Cancelled',
          date: now,
          user,
          reason,
          field: 'Status',
          from: asset.status,
          to: 'Cancelled',
          details: `Asset cancelled. Reason: ${reason}`,
        },
      ];

      return supabase
        .from('assets')
        .update({
          status: 'Cancelled',
          history: updatedHistory,
        })
        .eq('id', asset.id)
        .select()
        .single();
    });

    const results = await Promise.all(updatePromises);

    // 3. Handle errors per row (important for batch ops)
    const updatedAssets = [];
    results.forEach((res, index) => {
      if (res.error) {
        console.error('Failed to update asset:', assets[index].id, res.error);
      } else {
        updatedAssets.push(res.data);
      }
    });

    // 4. Return same structure you already use (for inventory rollback)
    return updatedAssets.map(updated => {
      const original = assets.find(a => a.id === updated.id);
      return {
        asset: updated,
        inventoryItemId: original?.inventory_item_id || null,
      };
    });

  } catch (error) {
    console.error('Error batch cancelling assets:', error);
    return [];
  }
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