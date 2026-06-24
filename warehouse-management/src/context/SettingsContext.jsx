import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import SettingsService from '../services/settingsService';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};

const DEFAULT_CATEGORIES = [
  'Electronics', 'Office Supplies', 'Furniture', 'Hardware',
  'Software', 'Consumables', 'Network Equipment', 'Other',
];
const DEFAULT_UNITS = [
  'pcs', 'box', 'set', 'pack', 'roll', 'ream', 'unit', 'kg', 'liter', 'meter',
];
const DEFAULT_DEPARTMENTS = [
  'Finance', 'HR', 'IT', 'Marketing', 'Operations', 'Sales',
];

export const SettingsProvider = ({ children }) => {
  // Each item: { id, type, value }
  const [categoryRows, setCategoryRows] = useState([]);
  const [unitRows, setUnitRows]         = useState([]);
  const [deptRows, setDeptRows]         = useState([]);
  const [loading, setLoading]           = useState(true);

  // Derived plain arrays consumed by forms
  const categories  = categoryRows.map(r => r.value);
  const units       = unitRows.map(r => r.value);
  const departments = deptRows.map(r => r.value);

  // Load all configs from Supabase once on mount
  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      // Seed defaults if tables are empty
      await Promise.all([
        SettingsService.seedDefaults('category',   DEFAULT_CATEGORIES),
        SettingsService.seedDefaults('unit',        DEFAULT_UNITS),
        SettingsService.seedDefaults('department',  DEFAULT_DEPARTMENTS),
      ]);

      const all = await SettingsService.getAll();
      setCategoryRows(all.filter(r => r.type === 'category'));
      setUnitRows(all.filter(r => r.type === 'unit'));
      setDeptRows(all.filter(r => r.type === 'department'));
    } catch (err) {
      console.error('Error loading settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  // ── Categories ─────────────────────────────────────────────────────────────
  const addCategory = async (value) => {
    if (categories.map(c => c.toLowerCase()).includes(value.trim().toLowerCase())) return;
    const row = await SettingsService.add('category', value);
    if (row) setCategoryRows(prev => [...prev, row].sort((a, b) => a.value.localeCompare(b.value)));
  };

  const editCategory = async (id, newValue) => {
    const row = await SettingsService.update(id, newValue);
    if (row) setCategoryRows(prev => prev.map(r => r.id === id ? row : r).sort((a, b) => a.value.localeCompare(b.value)));
  };

  const removeCategory = async (id) => {
    const ok = await SettingsService.remove(id);
    if (ok) setCategoryRows(prev => prev.filter(r => r.id !== id));
  };

  // ── Units ──────────────────────────────────────────────────────────────────
  const addUnit = async (value) => {
    if (units.map(u => u.toLowerCase()).includes(value.trim().toLowerCase())) return;
    const row = await SettingsService.add('unit', value);
    if (row) setUnitRows(prev => [...prev, row].sort((a, b) => a.value.localeCompare(b.value)));
  };

  const editUnit = async (id, newValue) => {
    const row = await SettingsService.update(id, newValue);
    if (row) setUnitRows(prev => prev.map(r => r.id === id ? row : r).sort((a, b) => a.value.localeCompare(b.value)));
  };

  const removeUnit = async (id) => {
    const ok = await SettingsService.remove(id);
    if (ok) setUnitRows(prev => prev.filter(r => r.id !== id));
  };

  // ── Departments ────────────────────────────────────────────────────────────
  const addDepartment = async (value) => {
    if (departments.map(d => d.toLowerCase()).includes(value.trim().toLowerCase())) return;
    const row = await SettingsService.add('department', value);
    if (row) setDeptRows(prev => [...prev, row].sort((a, b) => a.value.localeCompare(b.value)));
  };

  const editDepartment = async (id, newValue) => {
    const row = await SettingsService.update(id, newValue);
    if (row) setDeptRows(prev => prev.map(r => r.id === id ? row : r).sort((a, b) => a.value.localeCompare(b.value)));
  };

  const removeDepartment = async (id) => {
    const ok = await SettingsService.remove(id);
    if (ok) setDeptRows(prev => prev.filter(r => r.id !== id));
  };

  return (
    <SettingsContext.Provider value={{
      // Plain value arrays for dropdowns
      categories, units, departments,
      // Full rows (with id) for the Settings manager
      categoryRows, unitRows, deptRows,
      loading,
      // Actions
      addCategory, editCategory, removeCategory,
      addUnit, editUnit, removeUnit,
      addDepartment, editDepartment, removeDepartment,
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;
