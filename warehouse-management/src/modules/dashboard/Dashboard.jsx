import React, { useEffect, useState, useMemo } from 'react';
import {
  Package, Clock, FileText, Scan, ChevronLeft, ChevronRight,
  Plus, Trash2, Check, X, Calendar, AlertTriangle, Tag, CheckCircle
} from 'lucide-react';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import { useWMS } from '../../context/WMSContext';
import { useCalendar } from '../../context/CalendarContext';

import PRForm from '../purchase-requests/PRForm';
import InventoryForm from '../inventory/InventoryForm';
import AssetForm from '../assets/AssetForm';

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, bg, iconBg, iconColor }) => (
  <Card padding="p-6">
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-gray-500 mb-1">{label}</p>
        <p className={`text-3xl font-bold ${iconColor}`}>{value}</p>
      </div>
      <div className={`w-12 h-12 ${iconBg} rounded-lg flex items-center justify-center`}>
        <Package className={iconColor} size={24} />
      </div>
    </div>
  </Card>
);

// ─── Event type config ────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { value: 'task',     label: 'Task',     color: 'bg-blue-500',   dot: 'bg-blue-500'   },
  { value: 'reminder', label: 'Reminder', color: 'bg-orange-500', dot: 'bg-orange-500' },
  { value: 'deadline', label: 'Deadline', color: 'bg-red-500',    dot: 'bg-red-500'    },
  { value: 'meeting',  label: 'Meeting',  color: 'bg-purple-500', dot: 'bg-purple-500' },
  { value: 'other',    label: 'Other',    color: 'bg-gray-400',   dot: 'bg-gray-400'   },
];
const typeConfig = (type) => EVENT_TYPES.find(t => t.value === type) || EVENT_TYPES[4];

// ─── Mini Calendar ────────────────────────────────────────────────────────────
const MiniCalendar = ({ events, onDayClick, selectedDate }) => {
  const [viewDate, setViewDate] = useState(new Date());
  const year  = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDay  = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split('T')[0];

  const eventDates = useMemo(() => {
    const map = {};
    events.forEach(e => {
      const d = e.event_date?.split('T')[0];
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(e);
      }
    });
    return map;
  }, [events]);

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const pad = (n) => String(n).padStart(2, '0');
  const fmtDate = (d) => `${year}-${pad(month + 1)}-${pad(d)}`;

  return (
    <div>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronLeft size={16} /></button>
        <span className="text-sm font-semibold text-gray-800">
          {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
        </span>
        <button onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className="p-1 hover:bg-gray-100 rounded-lg transition-colors"><ChevronRight size={16} /></button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d => (
          <div key={d} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;
          const dateStr = fmtDate(day);
          const isToday    = dateStr === today;
          const isSelected = dateStr === selectedDate;
          const dayEvents  = eventDates[dateStr] || [];

          return (
            <button key={dateStr} onClick={() => onDayClick(dateStr)}
              className={`relative flex flex-col items-center py-1 rounded-lg text-xs transition-colors ${
                isSelected ? 'bg-blue-900 text-white' :
                isToday    ? 'bg-blue-100 text-blue-700 font-bold' :
                'hover:bg-gray-100 text-gray-700'
              }`}>
              <span>{day}</span>
              {dayEvents.length > 0 && (
                <div className="flex gap-0.5 mt-0.5 flex-wrap justify-center">
                  {dayEvents.slice(0, 3).map((e, j) => (
                    <span key={j} className={`w-1.5 h-1.5 rounded-full ${typeConfig(e.event_type).dot} ${isSelected ? 'opacity-80' : ''}`} />
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

// ─── Add/Edit Event Form ──────────────────────────────────────────────────────
const EventForm = ({ initial, onSave, onCancel }) => {
  const [form, setForm] = useState({
    title:      initial?.title      || '',
    event_date: initial?.event_date?.split('T')[0] || new Date().toISOString().split('T')[0],
    event_time: initial?.event_time || '',
    event_type: initial?.event_type || 'task',
    notes:      initial?.notes      || '',
  });

  const inp = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const lbl = 'block text-xs font-medium text-gray-600 mb-1';

  return (
    <div className="space-y-4">
      <div>
        <label className={lbl}>Title <span className="text-red-500">*</span></label>
        <input type="text" value={form.title} onChange={e => setForm(p => ({...p, title: e.target.value}))}
          placeholder="Event title" className={inp} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={lbl}>Date <span className="text-red-500">*</span></label>
          <input type="date" value={form.event_date} onChange={e => setForm(p => ({...p, event_date: e.target.value}))} className={inp} />
        </div>
        <div>
          <label className={lbl}>Time</label>
          <input type="time" value={form.event_time} onChange={e => setForm(p => ({...p, event_time: e.target.value}))} className={inp} />
        </div>
      </div>
      <div>
        <label className={lbl}>Type</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPES.map(t => (
            <button key={t.value} type="button"
              onClick={() => setForm(p => ({...p, event_type: t.value}))}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                form.event_type === t.value
                  ? `${t.color} text-white border-transparent`
                  : 'border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}>
              {t.label}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className={lbl}>Notes</label>
        <textarea value={form.notes} onChange={e => setForm(p => ({...p, notes: e.target.value}))}
          rows={2} placeholder="Optional notes…"
          className={`${inp} resize-none`} />
      </div>
      <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
        <button onClick={onCancel} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={() => { if (!form.title.trim() || !form.event_date) return; onSave(form); }}
          className="px-3 py-1.5 text-sm text-white bg-blue-900 rounded-lg hover:bg-blue-800">
          {initial ? 'Update' : 'Add Event'}
        </button>
      </div>
    </div>
  );
};

// ─── Dashboard ────────────────────────────────────────────────────────────────
const Dashboard = () => {
  const { getStats, refreshData, purchaseRequests, assets } = useWMS();
  const { events, addEvent, updateEvent, deleteEvent } = useCalendar();
  const stats = getStats();

  const [isPRModalOpen,      setIsPRModalOpen]      = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isAssetModalOpen,   setIsAssetModalOpen]   = useState(false);
  const [selectedDate,       setSelectedDate]        = useState(new Date().toISOString().split('T')[0]);
  const [showEventForm,      setShowEventForm]       = useState(false);
  const [editingEvent,       setEditingEvent]        = useState(null);

  useEffect(() => { refreshData(); }, []); // eslint-disable-line

  const selectedEvents = useMemo(() =>
    events.filter(e => e.event_date?.split('T')[0] === selectedDate)
      .sort((a, b) => (a.event_time || '').localeCompare(b.event_time || '')),
    [events, selectedDate]
  );

  const todayStr = new Date().toISOString().split('T')[0];

  // Upcoming 5 events (today onwards, not completed)
  const upcoming = useMemo(() =>
    events
      .filter(e => e.event_date?.split('T')[0] >= todayStr && !e.completed)
      .slice(0, 5),
    [events, todayStr]
  );

  const handleDayClick = (dateStr) => {
    setSelectedDate(dateStr);
    setShowEventForm(false);
    setEditingEvent(null);
  };

  const handleSaveEvent = async (form) => {
    if (editingEvent) {
      await updateEvent(editingEvent.id, form);
      setEditingEvent(null);
    } else {
      await addEvent(form);
    }
    setShowEventForm(false);
  };

  const handleToggleComplete = async (event) => {
    await updateEvent(event.id, { completed: !event.completed });
  };

  const fmtDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-PH', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-6">

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard label="Total Inventory Items" value={stats.totalInventoryItems} iconBg="bg-blue-100"   iconColor="text-blue-600" />
        <StatCard label="Pending PR"           value={stats.pendingPRs}          iconBg="bg-yellow-100" iconColor="text-yellow-600" />
        <StatCard label="Pending Deployments"            value={stats.pendingPO}           iconBg="bg-purple-100" iconColor="text-purple-600" />
        <StatCard label="Low Stock Items"       value={stats.lowStockItems}       iconBg="bg-orange-100" iconColor="text-orange-600" />
      </div>

      {/* Main grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Pending Panel */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-semibold text-gray-800">Pending PR/PO</h3>
              <p className="text-xs text-gray-400">Purchase Requests and Assets requiring attention</p>
            </div>
          </div>
          {(() => {
            const pendingPRs = (purchaseRequests || []).filter(pr =>
              ['Submitted', 'For Canvass', 'Pending'].includes(pr.status)
            );
            const pendingAssets = (assets || []).filter(a =>
              ['In Progress', 'For Delivery', 'On Hold'].includes(a.status)
            );
            const total = pendingPRs.length + pendingAssets.length;

            if (total === 0) return (
              <div className="text-center py-10 text-gray-400">
                <CheckCircle size={40} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm font-medium">All caught up!</p>
                <p className="text-xs mt-1">No pending PRs or assets at the moment</p>
              </div>
            );

            return (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {/* Pending PRs */}
                {pendingPRs.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <FileText size={11} /> Purchase Requests ({pendingPRs.length})
                    </p>
                    <div className="space-y-1.5">
                      {pendingPRs.map(pr => (
                        <div key={pr.id} className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-100 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{pr.pr_number || pr.prNumber || '—'}</p>
                            <p className="text-xs text-gray-500 truncate">{pr.requested_by || pr.requestedBy || '—'}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-medium border border-yellow-200">
                              {pr.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              {pr.created_at ? new Date(pr.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }) : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Pending Assets */}
                {pendingAssets.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                      <Tag size={11} /> Assets ({pendingAssets.length})
                    </p>
                    <div className="space-y-1.5">
                      {pendingAssets.map(asset => (
                        <div key={asset.id} className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-800 truncate">{asset.description || '—'}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {asset.inventory_asset_tag?.trim() || 'N/A'} · {asset.assigned_to || 'Unassigned'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium border ${
                              asset.status === 'In Progress'  ? 'bg-blue-100 text-blue-700 border-blue-200' :
                              asset.status === 'For Delivery' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                              'bg-gray-100 text-gray-600 border-gray-200'
                            }`}>
                              {asset.status}
                            </span>
                            <span className="text-xs text-gray-400">
                              {asset.po_number ? `PO# ${asset.po_number}` : ''}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </Card>

        {/* Quick Actions */}
        <Card title="Quick Actions">
          <div className="space-y-3">
            <Button variant="primary"  className="w-full justify-center" onClick={() => setIsPRModalOpen(true)}>
              <FileText size={16} className="mr-2" /> Create Purchase Request
            </Button>
            <Button variant="success"  className="w-full justify-center" onClick={() => setIsReceiveModalOpen(true)}>
              <Package size={16} className="mr-2" /> Add Inventory Item
            </Button>
            <Button variant="purple"   className="w-full justify-center" onClick={() => setIsAssetModalOpen(true)}>
              <Scan size={16} className="mr-2" /> Create Deployment
            </Button>
            <Button variant="secondary" className="w-full justify-center"
              onClick={() => alert('Export Report feature coming soon!')}>
              Export Report
            </Button>
          </div>
        </Card>
      </div>

      {/* Calendar + Upcoming Events */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Calendar */}
        <Card padding="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Calendar size={16} className="text-blue-600" />
              <h3 className="text-sm font-semibold text-gray-800">Calendar</h3>
            </div>
          </div>

          <MiniCalendar events={events} onDayClick={handleDayClick} selectedDate={selectedDate} />

          {/* Event type legend */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 pt-3 border-t border-gray-100">
            {EVENT_TYPES.map(t => (
              <div key={t.value} className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${t.dot}`} />
                <span className="text-xs text-gray-500">{t.label}</span>
              </div>
            ))}
          </div>
        </Card>

        {/* Selected Day Events */}
        <Card padding="p-4" className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-800">
                {selectedDate === todayStr ? 'Today' : fmtDate(selectedDate)}
              </h3>
              <p className="text-xs text-gray-400">{selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}</p>
            </div>
            <button onClick={() => { setShowEventForm(true); setEditingEvent(null); }}
              className="flex items-center gap-1 text-xs bg-blue-900 text-white px-2.5 py-1.5 rounded-lg hover:bg-blue-800 transition-colors">
              <Plus size={12} /> New
            </button>
          </div>

          {/* Add/Edit form */}
          {showEventForm && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-xl">
              <EventForm
                initial={editingEvent ? { ...editingEvent, event_date: selectedDate } : { event_date: selectedDate }}
                onSave={handleSaveEvent}
                onCancel={() => { setShowEventForm(false); setEditingEvent(null); }}
              />
            </div>
          )}

          {/* Events list */}
          {selectedEvents.length === 0 && !showEventForm ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No events for this day</p>
              <button onClick={() => setShowEventForm(true)}
                className="mt-2 text-xs text-blue-600 hover:underline">Add one</button>
            </div>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {selectedEvents.map(event => {
                const tc = typeConfig(event.event_type);
                return (
                  <div key={event.id}
                    className={`flex items-start gap-3 p-3 rounded-xl border transition-colors ${
                      event.completed ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-200'
                    }`}>
                    {/* Complete toggle */}
                    <button onClick={() => handleToggleComplete(event)}
                      className={`mt-0.5 w-5 h-5 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-colors ${
                        event.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-400'
                      }`}>
                      {event.completed && <Check size={11} className="text-white" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tc.dot}`} />
                        <p className={`text-sm font-medium truncate ${event.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {event.title}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-xs px-1.5 py-0.5 rounded-full text-white ${tc.color}`}>{tc.label}</span>
                        {event.event_time && <span className="text-xs text-gray-400">{event.event_time}</span>}
                      </div>
                      {event.notes && <p className="text-xs text-gray-500 mt-1 truncate">{event.notes}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => { setEditingEvent(event); setShowEventForm(true); }}
                        className="p-1 text-gray-400 hover:text-blue-600 rounded transition-colors" title="Edit">
                        <Tag size={13} />
                      </button>
                      <button onClick={() => deleteEvent(event.id)}
                        className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors" title="Delete">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Upcoming events strip */}
          {upcoming.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Upcoming</p>
              <div className="space-y-1">
                {upcoming.map(e => {
                  const tc = typeConfig(e.event_type);
                  const isToday = e.event_date?.split('T')[0] === todayStr;
                  return (
                    <div key={e.id} className="flex items-center gap-2 text-xs">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tc.dot}`} />
                      <span className="text-gray-700 flex-1 truncate">{e.title}</span>
                      <span className={`flex-shrink-0 ${isToday ? 'text-orange-500 font-semibold' : 'text-gray-400'}`}>
                        {isToday ? 'Today' : fmtDate(e.event_date)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Modals */}
      <Modal isOpen={isPRModalOpen} onClose={() => setIsPRModalOpen(false)} title="New Purchase Request" size="lg">
        <PRForm onClose={() => setIsPRModalOpen(false)} onSuccess={() => setIsPRModalOpen(false)} />
      </Modal>
      <Modal isOpen={isReceiveModalOpen} onClose={() => setIsReceiveModalOpen(false)} title="Add Inventory Item" size="lg">
        <InventoryForm onClose={() => setIsReceiveModalOpen(false)} onSuccess={() => setIsReceiveModalOpen(false)} />
      </Modal>
      <Modal isOpen={isAssetModalOpen} onClose={() => setIsAssetModalOpen(false)} title="Create Deployment" size="lg">
        <AssetForm onClose={() => setIsAssetModalOpen(false)} onSuccess={() => setIsAssetModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default Dashboard;