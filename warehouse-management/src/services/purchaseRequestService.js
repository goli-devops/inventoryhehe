import supabase from '../config/supabase';

// Human-readable field labels for history entries
const FIELD_LABELS = {
  pr_number:      'PR Number',
  jor_number:     'JOR Number',
  department:     'Department',
  requested_by:   'Requested By',
  supplier:       'Supplier',
  company_name:   'Company Name',
  contact_person: 'Contact Person',
  contact_number: 'Contact Number',
  terms:          'Payment Terms',
  status:         'Status',
  notes:          'Notes',
};

// Fields to diff and record in history
const TRACKED_FIELDS = Object.keys(FIELD_LABELS);

const PurchaseRequestService = {
  generatePRNumber() {
    const year = new Date().getFullYear();
    const timestamp = Date.now();
    return `PR-${year}-${timestamp.toString().slice(-6)}`;
  },

  async create(prData) {
    try {
      const prNumber = prData.prNumber?.trim()
        ? prData.prNumber.trim()
        : this.generatePRNumber();

      const newPR = {
        pr_number:      prNumber,
        jor_number:     prData.jorNumber?.trim()    || '',
        department:     prData.department            || '',
        requested_by:   prData.requestedBy           || '',
        created_by:     prData.createdBy             || prData.requestedBy || '',
        supplier:       prData.supplier              || '',
        company_name:   prData.companyName           || '',
        contact_person: prData.contactPerson         || '',
        contact_number: prData.contactNumber         || '',
        terms:          prData.terms                 || '',
        items:          prData.items                 || [],
        status:         'Submitted',
        notes:          prData.notes                 || '',
        history: [
          {
            action: 'Created',
            date: new Date().toISOString(),
            user: prData.requestedBy || 'System',
            details: `Purchase Request ${prNumber} created with status Submitted`,
          }
        ],
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

  // Build diff-based history entries
  buildHistoryEntries(oldPR, newData, updatedBy) {
    const entries = [];
    const now = new Date().toISOString();

    TRACKED_FIELDS.forEach(field => {
      const oldVal = (oldPR[field] ?? '').toString().trim();
      const newVal = (newData[field] ?? '').toString().trim();
      if (oldVal !== newVal) {
        entries.push({
          action: 'Updated',
          date: now,
          user: updatedBy,
          field: FIELD_LABELS[field],
          from: oldVal || '(empty)',
          to: newVal || '(empty)',
          details: `${FIELD_LABELS[field]} changed from "${oldVal || '(empty)'}" to "${newVal || '(empty)'}"`,
        });
      }
    });

    // Items change — just record that items were updated (not a line-by-line diff)
    const oldItems = JSON.stringify(oldPR.items || []);
    const newItems = JSON.stringify(newData.items || []);
    if (oldItems !== newItems) {
      entries.push({
        action: 'Updated',
        date: now,
        user: updatedBy,
        field: 'Items',
        details: 'Items list was modified',
      });
    }

    return entries;
  },

  async update(id, updates, oldPR, updatedBy = 'System') {
    try {
      const existing = oldPR || await this.getById(id);
      if (!existing) return null;

      // Map camelCase form fields → snake_case DB columns
      const newData = {
        pr_number:      updates.prNumber      ?? existing.pr_number,
        jor_number:     updates.jorNumber     ?? existing.jor_number,
        department:     updates.department    ?? existing.department,
        requested_by:   updates.requestedBy   ?? existing.requested_by,
        supplier:       updates.supplier      ?? existing.supplier,
        company_name:   updates.companyName   ?? existing.company_name,
        contact_person: updates.contactPerson ?? existing.contact_person,
        contact_number: updates.contactNumber ?? existing.contact_number,
        terms:          updates.terms         ?? existing.terms,
        status:         updates.status        ?? existing.status,
        notes:          updates.notes         ?? existing.notes,
        items:          updates.items         ?? existing.items,
      };

      // Build history diff entries
      const newEntries = this.buildHistoryEntries(existing, newData, updatedBy);

      // If nothing changed at all, still save but with a generic entry
      const historyToAppend = newEntries.length > 0
        ? newEntries
        : [{
            action: 'Updated',
            date: new Date().toISOString(),
            user: updatedBy,
            details: 'No changes detected',
          }];

      const updatedHistory = [...(existing.history || []), ...historyToAppend];

      const { data, error } = await supabase
        .from('purchase_requests')
        .update({ ...newData, updated_by: updatedBy, history: updatedHistory })
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

  async updateStatus(id, newStatus, user) {
    try {
      return await this.update(id, { status: newStatus }, null, user);
    } catch (error) {
      console.error('Error updating PR status:', error);
      return null;
    }
  },

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
  },
};

export default PurchaseRequestService;