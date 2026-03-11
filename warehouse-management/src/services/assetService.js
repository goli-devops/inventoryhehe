import supabase from '../config/supabase';

const AssetService = {
  // Generate unique asset ID
  generateAssetID(category) {
    const timestamp = Date.now();
    const categoryCode = category.substring(0, 3).toUpperCase();
    return `${categoryCode}-${timestamp.toString().slice(-6)}`;
  },

  // Generate QR Code data
  generateQRCode(assetID) {
    return {
      qr_code: `QR-${assetID}`,
      qr_url: `https://wms.goli.com/assets/${assetID}`
    };
  },

  // Create new Asset
  async create(assetData) {
    try {
      const assetID = this.generateAssetID(assetData.category);
      const qrData = this.generateQRCode(assetID);
      
      const newAsset = {
        asset_id: assetID,
        description: assetData.description,
        category: assetData.category,
        serial_number: assetData.serialNumber || '',
        location: assetData.location || '',
        assigned_to: assetData.assignedTo || null,
        status: assetData.status || 'Available',
        purchase_date: assetData.purchaseDate || new Date().toISOString(),
        purchase_price: assetData.purchasePrice || 0,
        warranty: assetData.warranty || '',
        qr_code: qrData.qr_code,
        qr_url: qrData.qr_url,
        is_tagged: true,
        inventory_item_id: assetData.inventoryItemId || null,
        created_by: assetData.createdBy,
        history: [
          {
            action: 'Created',
            date: new Date().toISOString(),
            user: assetData.createdBy,
            status: assetData.status || 'Available'
          }
        ]
      };

      const { data, error } = await supabase
        .from('assets')
        .insert([newAsset])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating asset:', error);
      return null;
    }
  },

  // Get all Assets
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all assets:', error);
      return [];
    }
  },

  // Get single Asset by ID
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting asset:', error);
      return null;
    }
  },

  // Update Asset
  async update(id, updates) {
    try {
      const existingAsset = await this.getById(id);
      if (!existingAsset) return null;

      const updatedHistory = [
        ...existingAsset.history,
        {
          action: 'Updated',
          date: new Date().toISOString(),
          user: updates.updatedBy || 'System',
          status: updates.status || existingAsset.status
        }
      ];

      const { data, error } = await supabase
        .from('assets')
        .update({
          ...updates,
          history: updatedHistory
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating asset:', error);
      return null;
    }
  },

  // Assign Asset
  async assignAsset(id, assignedTo, user) {
    try {
      const asset = await this.getById(id);
      if (!asset) return null;

      const updatedHistory = [
        ...asset.history,
        {
          action: 'Assigned',
          date: new Date().toISOString(),
          user: user,
          assignedTo: assignedTo,
          status: 'In Use'
        }
      ];

      const { data, error } = await supabase
        .from('assets')
        .update({
          assigned_to: assignedTo,
          status: 'In Use',
          history: updatedHistory
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error assigning asset:', error);
      return null;
    }
  },

  // Return Asset
  async returnAsset(id, user) {
    try {
      const asset = await this.getById(id);
      if (!asset) return null;

      const updatedHistory = [
        ...asset.history,
        {
          action: 'Returned',
          date: new Date().toISOString(),
          user: user,
          previousAssignee: asset.assigned_to,
          status: 'Available'
        }
      ];

      const { data, error } = await supabase
        .from('assets')
        .update({
          assigned_to: null,
          status: 'Available',
          history: updatedHistory
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error returning asset:', error);
      return null;
    }
  },

  // Update Asset Status
  async updateStatus(id, newStatus, user) {
    try {
      return await this.update(id, {
        status: newStatus,
        updatedBy: user
      });
    } catch (error) {
      console.error('Error updating asset status:', error);
      return null;
    }
  },

  // Delete Asset
  async delete(id) {
    try {
      const { error } = await supabase
        .from('assets')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting asset:', error);
      return false;
    }
  },

  // Get assets by status
  async getByStatus(status) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting assets by status:', error);
      return [];
    }
  },

  // Get assets by category
  async getByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting assets by category:', error);
      return [];
    }
  },

  // Get assets assigned to user
  async getByAssignee(assignedTo) {
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .eq('assigned_to', assignedTo)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting assets by assignee:', error);
      return [];
    }
  }
};

export default AssetService;