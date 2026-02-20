import supabase from '../config/supabase';

const PurchaseRequestService = {
  // Generate unique PR number
  generatePRNumber() {
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    return `PR-${year}-${timestamp.toString().slice(-6)}`;
  },

  // Create new Purchase Request
  async create(prData) {
    try {
      const prNumber = this.generatePRNumber();
      const newPR = {
        pr_number: prNumber,
        department: prData.department,
        requester:prData.requester,
        created_by: prData.requestedBy,
        items: prData.items || [],
        status: 'Submitted',
        notes: prData.notes || '',
        history: [
          {
            action: 'Created',
            date: new Date().toISOString(),
            user: prData.requestedBy,
            status: 'Submitted'
          }
        ]
      };

      const { data, error } = await supabase
        .from('purchase_requests')
        .insert([newPR])
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating PR:', error);
      return null;
    }
  },

  // Get all Purchase Requests
  async getAll() {
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting all PRs:', error);
      return [];
    }
  },

  // Get single Purchase Request by ID
  async getById(id) {
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting PR:', error);
      return null;
    }
  },

  // Update Purchase Request
  async update(id, updates) {
    try {
      const existingPR = await this.getById(id);
      if (!existingPR) return null;

      const updatedHistory = [
        ...existingPR.history,
        {
          action: 'Updated',
          date: new Date().toISOString(),
          user: updates.created_by || 'System',
          status: updates.status || existingPR.status,
          notes: updates.notes || ''
        }
      ];

      const { data, error } = await supabase
        .from('purchase_requests')
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
      console.error('Error updating PR:', error);
      return null;
    }
  },

  // Update PR Status
  async updateStatus(id, newStatus, user) {
    try {
      return await this.update(id, {
        status: newStatus,
        created_by: user
      });
    } catch (error) {
      console.error('Error updating PR status:', error);
      return null;
    }
  },

  // Delete Purchase Request
  async delete(id) {
    try {
      const { error } = await supabase
        .from('purchase_requests')
        .delete()
        .eq('id', id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error('Error deleting PR:', error);
      return false;
    }
  },

  // Get PRs by status
  async getByStatus(status) {
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting PRs by status:', error);
      return [];
    }
  },

  // Get PRs by department
  async getByDepartment(department) {
    try {
      const { data, error } = await supabase
        .from('purchase_requests')
        .select('*')
        .eq('department', department)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting PRs by department:', error);
      return [];
    }
  }
};

export default PurchaseRequestService;