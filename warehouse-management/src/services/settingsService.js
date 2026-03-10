import supabase from '../config/supabase';

// Table: configurations
// Columns: id (uuid), type (text), value (text), created_at (timestampz)
// Types: 'category' | 'unit' | 'department'

const SettingsService = {

  async getAll() {
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .order('value', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching configurations:', error);
      return [];
    }
  },

  async getByType(type) {
    try {
      const { data, error } = await supabase
        .from('configurations')
        .select('*')
        .eq('type', type)
        .order('value', { ascending: true });
      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error(`Error fetching ${type}:`, error);
      return [];
    }
  },

  async add(type, value) {
    try {
      const trimmed = value.trim();
      if (!trimmed) return null;
      const { data, error } = await supabase
        .from('configurations')
        .insert([{ type, value: trimmed }])
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error(`Error adding ${type}:`, error);
      return null;
    }
  },

  async update(id, newValue) {
    try {
      const trimmed = newValue.trim();
      if (!trimmed) return null;
      const { data, error } = await supabase
        .from('configurations')
        .update({ value: trimmed })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating configuration:', error);
      return null;
    }
  },

  async remove(id) {
    try {
      const { error } = await supabase
        .from('configurations')
        .delete()
        .eq('id', id);
      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error removing configuration:', error);
      return false;
    }
  },

  // Seed defaults if a type has no records yet
  async seedDefaults(type, defaults) {
    try {
      const existing = await this.getByType(type);
      if (existing.length > 0) return; // already seeded
      const rows = defaults.map(value => ({ type, value }));
      const { error } = await supabase.from('configurations').insert(rows);
      if (error) throw error;
    } catch (error) {
      console.error(`Error seeding ${type} defaults:`, error);
    }
  }
};

export default SettingsService;