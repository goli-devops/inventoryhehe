import supabase from '../config/supabase';

const InventoryService = {
  // Generate unique item code
  generateItemCode(category) {
    const timestamp = Date.now();
    const categoryCode = category.substring(0, 3).toUpperCase();
    return `${categoryCode}-${timestamp.toString().slice(-6)}`;
  },

  // Create new Inventory Item
  async create(itemData) {
    try {
      // item_code must be unique — use first asset tag if available,
      // otherwise generate a unique code (never use 'N/A' which would collide)
      const firstTag = (itemData.assetTags || [])[0]?.trim();
      const providedCode = itemData.itemCode?.trim();
      const itemCode = firstTag || providedCode || this.generateItemCode(itemData.category);
      const quantity = itemData.quantity || 0;
      
      const newItem = {
        item_code: itemCode,
        description: itemData.description,
        category: itemData.category,
        quantity: quantity,
        unit: itemData.unit,
        location: itemData.location || '',
        min_stock_level: itemData.minStockLevel || 0,
        max_stock_level: itemData.maxStockLevel || 0,
        unit_price: itemData.unitPrice || 0,
        supplier: itemData.supplier || '',
        status: quantity === 0
          ? 'Out of Stock'
          : quantity <= (itemData.minStockLevel || 0)
            ? 'Low Stock'
            : 'In Stock',
        asset_tags: itemData.assetTags || [],
        serial_numbers: itemData.serialNumbers || [],
        created_by: itemData.createdBy,
        history: [
          {
            action: 'Created',
            date: new Date().toISOString(),
            user: itemData.createdBy,
            quantity: quantity
          }
        ]
      };

      const { data, error } = await supabase
        .from('inventory')
        .insert([newItem])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating inventory item:', error);
      return null;
    }
  },

  // Get all Inventory Items
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all inventory items:', error);
      return null;
    }
  },

  // Get single Inventory Item by ID
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting inventory item:', error);
      return null;
    }
  },

  // Update Inventory Item
  async update(id, updates) {
    try {
      const existingItem = await this.getById(id);
      if (!existingItem) return null;

      // ── Build new payload first so we can diff against existing ──
      const newQty      = updates.quantity      ?? existingItem.quantity;
      const newMinStock = updates.minStockLevel  ?? updates.min_stock_level  ?? existingItem.min_stock_level;

      let derivedStatus = 'In Stock';
      if (newQty === 0)               derivedStatus = 'Out of Stock';
      else if (newQty <= newMinStock) derivedStatus = 'Low Stock';

      const newData = {
        description:     updates.description    ?? existingItem.description,
        category:        updates.category       ?? existingItem.category,
        quantity:        newQty,
        unit:            updates.unit           ?? existingItem.unit,
        location:        updates.location       ?? existingItem.location,
        supplier:        updates.supplier       ?? existingItem.supplier,
        min_stock_level: newMinStock,
        max_stock_level: updates.maxStockLevel  ?? updates.max_stock_level  ?? existingItem.max_stock_level,
        unit_price:      updates.unitPrice      ?? updates.unit_price       ?? existingItem.unit_price,
        asset_tags:      updates.assetTags      ?? updates.asset_tags       ?? existingItem.asset_tags ?? [],
        serial_numbers:  updates.serialNumbers  ?? updates.serial_numbers   ?? existingItem.serial_numbers ?? [],
        status:          updates.status         ?? derivedStatus,
      };

      // ── Field-level diff ──
      const FIELD_LABELS = {
        description:     'Description',
        category:        'Category',
        quantity:        'Quantity',
        unit:            'Unit',
        location:        'Location',
        supplier:        'Supplier',
        min_stock_level: 'Min Stock Level',
        max_stock_level: 'Max Stock Level',
        unit_price:      'Unit Price',
        status:          'Status',
      };

      const now = new Date().toISOString();
      const updatedBy = updates.updatedBy || 'System';
      const diffEntries = [];

      Object.keys(FIELD_LABELS).forEach(field => {
        const oldRaw = existingItem[field];
        const newRaw = newData[field];
        // Normalize for comparison
        const normalize = (v) => (v == null ? '' : String(v).trim());
        const oldVal = normalize(oldRaw);
        const newVal = normalize(newRaw);
        if (oldVal !== newVal) {
          const label = FIELD_LABELS[field];
          // Format currency fields
          const fmt = (v, f) =>
            (f === 'unit_price') ? `₱${parseFloat(v || 0).toFixed(2)}` : String(v || '(empty)');
          diffEntries.push({
            action:  'Updated',
            date:    now,
            user:    updatedBy,
            field:   label,
            from:    oldVal || '(empty)',
            to:      newVal || '(empty)',
            details: `${label} changed from "${fmt(oldVal, field)}" to "${fmt(newVal, field)}"`,
          });
        }
      });

      const newEntries = diffEntries.length > 0
        ? diffEntries
        : [{ action: 'Updated', date: now, user: updatedBy, details: 'No changes detected' }];

      const updatedHistory = [...(existingItem.history || []), ...newEntries];

      const { data, error } = await supabase
        .from('inventory')
        .update({ ...newData, history: updatedHistory })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating inventory item:', error);
      return null;
    }
  },

  // Adjust Quantity (Receive/Issue/Transfer)
  async adjustQuantity(id, adjustment, type, user, deployedTags = [], returnedSerials = []) {
    try {
      const item = await this.getById(id);
      if (!item) return null;

      const newQuantity = item.quantity + adjustment;

      let status = 'In Stock';
      if (newQuantity === 0) status = 'Out of Stock';
      else if (newQuantity <= item.min_stock_level) status = 'Low Stock';

      // Remove deployed asset tags AND their corresponding serial numbers from inventory
      let existingTags = [];
      if (Array.isArray(item.asset_tags)) existingTags = item.asset_tags;
      else if (typeof item.asset_tags === 'string') {
        try { existingTags = JSON.parse(item.asset_tags) || []; } catch { existingTags = []; }
      } else if (item.asset_tags && typeof item.asset_tags === 'object') {
        existingTags = Object.values(item.asset_tags);
      }
      
      let existingSerials = [];
      if (Array.isArray(item.serial_numbers)) existingSerials = item.serial_numbers;
      else if (typeof item.serial_numbers === 'string') {
        try { existingSerials = JSON.parse(item.serial_numbers) || []; } catch { existingSerials = []; }
      } else if (item.serial_numbers && typeof item.serial_numbers === 'object') {
        existingSerials = Object.values(item.serial_numbers);
      }

      // For deployments (negative adjustment): remove the specific deployed tags AND their serials
      let updatedTags = [...existingTags];
      let updatedSerials = [...existingSerials];
      
      if (adjustment < 0 && deployedTags.length > 0) {
        deployedTags.forEach(tag => {
          const idx = updatedTags.indexOf(tag);
          if (idx !== -1) {
            updatedTags.splice(idx, 1);
            // Remove the serial number at the same index
            if (idx < updatedSerials.length) {
              updatedSerials.splice(idx, 1);
            }
          }
        });
      }
      // For returns (positive adjustment): add the tag AND serial back
      if (adjustment > 0 && deployedTags.length > 0) {
        deployedTags.forEach((tag, idx) => {
          if (tag && !updatedTags.includes(tag)) {
            updatedTags.push(tag);
            // Add the corresponding serial number back if provided
            const serial = returnedSerials[idx] || '';
            if (serial) {
              updatedSerials.push(serial);
            } else {
              // If no serial provided, add empty string to maintain alignment
              updatedSerials.push('');
            }
          }
        });
      }

      const historyEntry = {
        action: type,
        date: new Date().toISOString(),
        user: user,
        adjustment: adjustment,
        previousQuantity: item.quantity,
        newQuantity: newQuantity,
      };
      // Record which asset tags were deployed/returned
      if (deployedTags.length > 0) {
        historyEntry.assetTags = deployedTags;
        historyEntry.details = adjustment < 0
          ? `Deployed: ${deployedTags.join(', ')}`
          : `Returned: ${deployedTags.join(', ')}`;
      }

      const updatedHistory = [...(item.history || []), historyEntry];

      const { data, error } = await supabase
        .from('inventory')
        .update({
          quantity: newQuantity,
          status: status,
          asset_tags: updatedTags,
          serial_numbers: updatedSerials,
          history: updatedHistory,
        })
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adjusting quantity:', error);
      return null;
    }
  },

  // Delete Inventory Item
  async delete(id) {
    try {
      const snapshot = await this.getById(id);
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return { success: true, snapshot };
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      return { success: false, snapshot: null };
    }
  },

  // Get items by category
  async getByCategory(category) {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('category', category)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting items by category:', error);
      return [];
    }
  },

  // Get low stock items
  async getLowStockItems() {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'Low Stock')
        .order('quantity', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting low stock items:', error);
      return [];
    }
  },

  // Get out of stock items
  async getOutOfStockItems() {
    try {
      const { data, error } = await supabase
        .from('inventory')
        .select('*')
        .eq('status', 'Out of Stock')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting out of stock items:', error);
      return [];
    }
  }
};

export default InventoryService;