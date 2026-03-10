import React, { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext();

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
};

const DEFAULT_CATEGORIES = [
  'Electronics',
  'Office Supplies',
  'Furniture',
  'Hardware',
  'Software',
  'Consumables',
  'Network Equipment',
  'Other',
];

const DEFAULT_UNITS = [
  'pcs',
  'box',
  'set',
  'pack',
  'roll',
  'ream',
  'unit',
  'kg',
  'liter',
  'meter',
];

const load = (key, fallback) => {
  try {
    const saved = localStorage.getItem(key);
    return saved ? JSON.parse(saved) : fallback;
  } catch {
    return fallback;
  }
};

export const SettingsProvider = ({ children }) => {
  const [categories, setCategories] = useState(() => load('wms_categories', DEFAULT_CATEGORIES));
  const [units, setUnits] = useState(() => load('wms_units', DEFAULT_UNITS));

  useEffect(() => { localStorage.setItem('wms_categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem('wms_units', JSON.stringify(units)); }, [units]);

  const addCategory = (name) => {
    const trimmed = name.trim();
    if (trimmed && !categories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) {
      setCategories(prev => [...prev, trimmed].sort());
    }
  };

  const editCategory = (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.toLowerCase() === oldName.toLowerCase()) return;
    if (categories.map(c => c.toLowerCase()).includes(trimmed.toLowerCase())) return;
    setCategories(prev => prev.map(c => c === oldName ? trimmed : c).sort());
  };

  const removeCategory = (name) => {
    setCategories(prev => prev.filter(c => c !== name));
  };

  const addUnit = (name) => {
    const trimmed = name.trim();
    if (trimmed && !units.map(u => u.toLowerCase()).includes(trimmed.toLowerCase())) {
      setUnits(prev => [...prev, trimmed].sort());
    }
  };

  const editUnit = (oldName, newName) => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed.toLowerCase() === oldName.toLowerCase()) return;
    if (units.map(u => u.toLowerCase()).includes(trimmed.toLowerCase())) return;
    setUnits(prev => prev.map(u => u === oldName ? trimmed : u).sort());
  };

  const removeUnit = (name) => {
    setUnits(prev => prev.filter(u => u !== name));
  };

  return (
    <SettingsContext.Provider value={{
      categories, units,
      addCategory, editCategory, removeCategory,
      addUnit, editUnit, removeUnit
    }}>
      {children}
    </SettingsContext.Provider>
  );
};

export default SettingsContext;