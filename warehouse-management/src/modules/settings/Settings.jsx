import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useSettings } from '../../context/SettingsContext';
import { Plus, X, Tag, Ruler, Building2, Pencil, Check, Ban, Loader } from 'lucide-react';

// Single editable row
const ListItem = ({ row, onEdit, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(row.value);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!val.trim() || val.trim() === row.value) { setEditing(false); setVal(row.value); return; }
    setSaving(true);
    await onEdit(row.id, val.trim());
    setSaving(false);
    setEditing(false);
  };

  const handleCancel = () => { setEditing(false); setVal(row.value); };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg group transition-colors">
      {editing ? (
        <input
          autoFocus
          value={val}
          onChange={e => setVal(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') handleSave(); if (e.key === 'Escape') handleCancel(); }}
          className="flex-1 text-sm px-2 py-0.5 border border-blue-400 rounded focus:outline-none mr-2"
        />
      ) : (
        <span className="text-sm text-gray-700 flex-1">{row.value}</span>
      )}

      <div className="flex gap-1 items-center">
        {saving ? (
          <Loader size={13} className="text-gray-400 animate-spin" />
        ) : editing ? (
          <>
            <button onClick={handleSave} title="Save" className="p-1 hover:bg-green-100 rounded transition-colors">
              <Check size={13} className="text-green-600" />
            </button>
            <button onClick={handleCancel} title="Cancel" className="p-1 hover:bg-gray-200 rounded transition-colors">
              <Ban size={13} className="text-gray-500" />
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setEditing(true)}
              title="Edit"
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded transition-all"
            >
              <Pencil size={13} className="text-blue-500" />
            </button>
            <button
              onClick={() => onRemove(row.id)}
              title="Remove"
              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
            >
              <X size={13} className="text-red-500" />
            </button>
          </>
        )}
      </div>
    </div>
  );
};

// List manager panel
const ListManager = ({ title, icon: Icon, color, rows, onAdd, onEdit, onRemove, placeholder, loading }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) { setError('Please enter a value.'); return; }
    if (rows.map(r => r.value.toLowerCase()).includes(trimmed.toLowerCase())) {
      setError('This item already exists.'); return;
    }
    setAdding(true);
    await onAdd(trimmed);
    setInputValue('');
    setError('');
    setAdding(false);
  };

  const handleKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); handleAdd(); } };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {rows.length} items
        </span>
      </div>

      <div className="flex gap-2 mb-3">
        <input
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setError(''); }}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          disabled={adding}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {adding ? <Loader size={14} className="animate-spin" /> : <Plus size={14} />}
          Add
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mb-3">{error}</p>}

      <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex justify-center py-6">
            <Loader size={20} className="animate-spin text-gray-400" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No items yet. Add one above.</p>
        ) : (
          rows.map(row => (
            <ListItem key={row.id} row={row} onEdit={onEdit} onRemove={onRemove} />
          ))
        )}
      </div>
    </Card>
  );
};

const Settings = () => {
  const {
    categoryRows, unitRows, deptRows, loading,
    addCategory, editCategory, removeCategory,
    addUnit, editUnit, removeUnit,
    addDepartment, editDepartment, removeDepartment,
  } = useSettings();

  return (
    <div className="space-y-6">

      {/* List Configuration */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-1">List Configuration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Manage dropdown options used across PR and Inventory modules. All changes are saved to the database and sync immediately.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <ListManager
            title="Item Categories"
            icon={Tag}
            color="bg-blue-600"
            rows={categoryRows}
            onAdd={addCategory}
            onEdit={editCategory}
            onRemove={removeCategory}
            placeholder="e.g., Electronics, Furniture..."
            loading={loading}
          />
          <ListManager
            title="Units of Measure"
            icon={Ruler}
            color="bg-purple-600"
            rows={unitRows}
            onAdd={addUnit}
            onEdit={editUnit}
            onRemove={removeUnit}
            placeholder="e.g., pcs, box, kg..."
            loading={loading}
          />
          <ListManager
            title="Departments"
            icon={Building2}
            color="bg-green-600"
            rows={deptRows}
            onAdd={addDepartment}
            onEdit={editDepartment}
            onRemove={removeDepartment}
            placeholder="e.g., IT, Finance, HR..."
            loading={loading}
          />
        </div>
      </div>

      <hr className="border-gray-200" />

      {/* System Settings */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-3">System Settings</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card title="General Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Company Name</label>
                <input type="text" placeholder="Global Officium Limited Inc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">System Email</label>
                <input type="email" placeholder="system@goli.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Time Zone</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>UTC+8 (Manila)</option>
                  <option>UTC+0 (London)</option>
                  <option>UTC-5 (New York)</option>
                </select>
              </div>
              <Button variant="primary">Save Changes</Button>
            </div>
          </Card>

          <Card title="Notification Settings">
            <div className="space-y-4">
              {[
                { label: 'Email Notifications', desc: 'Receive email updates for important events', checked: false },
                { label: 'PR Approvals', desc: 'Notify when PRs need approval', checked: true },
                { label: 'Inventory Alerts', desc: 'Alert for low stock levels', checked: true },
              ].map(({ label, desc, checked }) => (
                <div key={label} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" defaultChecked={checked} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          </Card>

          <Card title="Security Settings">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Session Timeout (minutes)</label>
                <input type="number" placeholder="30"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Password Policy</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Strong (12+ characters, mixed case, numbers, symbols)</option>
                  <option>Medium (8+ characters, mixed case, numbers)</option>
                  <option>Basic (6+ characters)</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700">Two-Factor Authentication</p>
                  <p className="text-xs text-gray-500">Require 2FA for all users</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              <Button variant="primary">Save Security Settings</Button>
            </div>
          </Card>

          <Card title="Backup & Maintenance">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Auto Backup Frequency</label>
                <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option>Daily</option><option>Weekly</option><option>Monthly</option>
                </select>
              </div>
              <div>
                <p className="text-sm text-gray-500 mb-2">Last Backup: Never</p>
                <Button variant="outline" className="w-full justify-center">Backup Now</Button>
              </div>
              <div className="pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Database Maintenance</p>
                <Button variant="outline" className="w-full justify-center">Optimize Database</Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Settings;