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
      const itemCode = this.generateItemCode(itemData.category);
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
        status: quantity > 0 ? 'In Stock' : 'Out of Stock',
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
      return [];
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

      const updatedHistory = [
        ...existingItem.history,
        {
          action: 'Updated',
          date: new Date().toISOString(),
          user: updates.updatedBy || 'System',
          quantity: updates.quantity || existingItem.quantity
        }
      ];

      // Explicitly map camelCase → snake_case so Supabase never receives unknown columns
      const newQty        = updates.quantity        ?? existingItem.quantity;
      const newMinStock   = updates.minStockLevel   ?? updates.min_stock_level  ?? existingItem.min_stock_level;

      // Recalculate status so low/out-of-stock badges always stay in sync
      let derivedStatus = 'In Stock';
      if (newQty === 0)              derivedStatus = 'Out of Stock';
      else if (newQty <= newMinStock) derivedStatus = 'Low Stock';

      const payload = {
        description:    updates.description    ?? existingItem.description,
        category:       updates.category       ?? existingItem.category,
        quantity:       newQty,
        unit:           updates.unit           ?? existingItem.unit,
        location:       updates.location       ?? existingItem.location,
        supplier:       updates.supplier       ?? existingItem.supplier,
        status:         updates.status         ?? derivedStatus,
        min_stock_level: newMinStock,
        max_stock_level: updates.maxStockLevel  ?? updates.max_stock_level  ?? existingItem.max_stock_level,
        unit_price:      updates.unitPrice      ?? updates.unit_price       ?? existingItem.unit_price,
        history:         updatedHistory,
      };

      const { data, error } = await supabase
        .from('inventory')
        .update(payload)
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
  async adjustQuantity(id, adjustment, type, user) {
    try {
      const item = await this.getById(id);
      if (!item) return null;

      const newQuantity = item.quantity + adjustment;
      
      let status = 'In Stock';
      if (newQuantity === 0) status = 'Out of Stock';
      else if (newQuantity <= item.min_stock_level) status = 'Low Stock';

      const updatedHistory = [
        ...item.history,
        {
          action: type,
          date: new Date().toISOString(),
          user: user,
          adjustment: adjustment,
          previousQuantity: item.quantity,
          newQuantity: newQuantity
        }
      ];

      const { data, error } = await supabase
        .from('inventory')
        .update({
          quantity: newQuantity,
          status: status,
          history: updatedHistory
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
      const { error } = await supabase
        .from('inventory')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      return false;
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