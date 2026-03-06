import React, { useState } from 'react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import { useSettings } from '../../context/SettingsContext';
import { Plus, X, Tag, Ruler, Pencil, Check, Ban } from 'lucide-react';

// Individual editable item row
const ListItem = ({ item, onEdit, onRemove }) => {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item);
  const [error, setError] = useState('');

  const handleSave = () => {
    const trimmed = value.trim();
    if (!trimmed) { setError('Cannot be empty.'); return; }
    onEdit(item, trimmed);
    setEditing(false);
    setError('');
  };

  const handleCancel = () => {
    setValue(item);
    setEditing(false);
    setError('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg group transition-colors">
      {editing ? (
        <>
          <input
            autoFocus
            type="text"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(''); }}
            onKeyDown={handleKey}
            className="flex-1 px-2 py-0.5 text-sm border border-blue-400 rounded focus:outline-none focus:ring-2 focus:ring-blue-400 bg-white"
          />
          {error && <span className="text-xs text-red-500">{error}</span>}
          <button onClick={handleSave} title="Save" className="p-1 hover:bg-green-100 rounded transition-colors">
            <Check size={13} className="text-green-600" />
          </button>
          <button onClick={handleCancel} title="Cancel" className="p-1 hover:bg-gray-200 rounded transition-colors">
            <Ban size={13} className="text-gray-500" />
          </button>
        </>
      ) : (
        <>
          <span className="flex-1 text-sm text-gray-700">{item}</span>
          <button
            onClick={() => setEditing(true)}
            title="Edit"
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-blue-100 rounded transition-all"
          >
            <Pencil size={13} className="text-blue-500" />
          </button>
          <button
            onClick={() => onRemove(item)}
            title="Remove"
            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-100 rounded transition-all"
          >
            <X size={13} className="text-red-500" />
          </button>
        </>
      )}
    </div>
  );
};

// Reusable list manager panel
const ListManager = ({ title, icon: Icon, color, items, onAdd, onEdit, onRemove, placeholder }) => {
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');

  const handleAdd = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) { setError('Please enter a value.'); return; }
    if (items.map(i => i.toLowerCase()).includes(trimmed.toLowerCase())) {
      setError('This item already exists.');
      return;
    }
    onAdd(trimmed);
    setInputValue('');
    setError('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleAdd(); }
  };

  return (
    <Card>
      <div className="flex items-center gap-2 mb-4">
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={16} className="text-white" />
        </div>
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        <span className="ml-auto text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
          {items.length} items
        </span>
      </div>

      {/* Add input */}
      <div className="flex gap-2 mb-1">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setError(''); }}
          onKeyDown={handleKey}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleAdd}
          className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus size={14} /> Add
        </button>
      </div>
      {error && <p className="text-xs text-red-500 mb-2">{error}</p>}

      <p className="text-xs text-gray-400 mb-3">Hover an item to edit or remove it.</p>

      {/* Items list */}
      <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
        {items.length === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">No items yet. Add one above.</p>
        ) : (
          items.map((item) => (
            <ListItem
              key={item}
              item={item}
              onEdit={onEdit}
              onRemove={onRemove}
            />
          ))
        )}
      </div>
    </Card>
  );
};

const Settings = () => {
  const {
    categories, units,
    addCategory, editCategory, removeCategory,
    addUnit, editUnit, removeUnit
  } = useSettings();

  return (
    <div className="space-y-6">

      {/* List Configuration */}
      <div>
        <h2 className="text-base font-semibold text-gray-700 mb-1">List Configuration</h2>
        <p className="text-sm text-gray-500 mb-4">
          Manage the dropdown options used in Purchase Requests and Inventory forms. Changes apply immediately.
        </p>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <ListManager
            title="Item Categories"
            icon={Tag}
            color="bg-blue-600"
            items={categories}
            onAdd={addCategory}
            onEdit={editCategory}
            onRemove={removeCategory}
            placeholder="e.g., Electronics, Furniture..."
          />
          <ListManager
            title="Units of Measure"
            icon={Ruler}
            color="bg-purple-600"
            items={units}
            onAdd={addUnit}
            onEdit={editUnit}
            onRemove={removeUnit}
            placeholder="e.g., pcs, box, kg..."
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
                <input
                  type="text"
                  placeholder="Global Officium Limited Inc."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">System Email</label>
                <input
                  type="email"
                  placeholder="system@goli.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                <input
                  type="number"
                  placeholder="30"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
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
                  <option>Daily</option>
                  <option>Weekly</option>
                  <option>Monthly</option>
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