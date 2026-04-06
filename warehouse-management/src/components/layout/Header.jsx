import React, { useState, useRef, useEffect } from 'react';
import { Bell, Search, Menu, Calendar, Check, X, AlertTriangle } from 'lucide-react';
import { LayoutDashboard, FileText, Package, Scan, BarChart3, Settings } from 'lucide-react';
import { useCalendar } from '../../context/CalendarContext';

const modules = [
  { id: 'dashboard', name: 'Dashboard',           icon: LayoutDashboard },
  { id: 'pr',        name: 'Purchase Requests',   icon: FileText        },
  { id: 'inventory', name: 'Inventory',           icon: Package         },
  { id: 'assets',    name: 'Deployments',      icon: Scan            },
  { id: 'reports',   name: 'Reports & Analytics', icon: BarChart3       },
  { id: 'settings',  name: 'Settings',            icon: Settings        },
];

const TYPE_COLORS = {
  task:     'bg-blue-100 text-blue-700',
  reminder: 'bg-orange-100 text-orange-700',
  deadline: 'bg-red-100 text-red-700',
  meeting:  'bg-purple-100 text-purple-700',
  other:    'bg-gray-100 text-gray-600',
};

const Header = ({ activeModule, setSidebarOpen }) => {
  const { upcomingEvents, updateEvent } = useCalendar();
  const [notifOpen, setNotifOpen] = useState(false);
  const bellRef = useRef(null);
  const dropRef = useRef(null);

  const currentModule = modules.find(m => m.id === activeModule);
  const unread = upcomingEvents.filter(e => !e.completed).length;

  const today = new Date().toISOString().split('T')[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (bellRef.current?.contains(e.target) || dropRef.current?.contains(e.target)) return;
      setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const fmtDate = (dateStr) => {
    if (!dateStr) return '';
    const d = dateStr.split('T')[0];
    if (d === today) return 'Today';
    const diff = Math.ceil((new Date(d) - new Date(today)) / 86400000);
    if (diff === 1) return 'Tomorrow';
    if (diff < 0) return `${Math.abs(diff)}d overdue`;
    return new Date(d + 'T00:00:00').toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  };

  const isOverdue = (dateStr) => dateStr?.split('T')[0] < today;

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">

        {/* Left */}
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500" title="Open menu">
            <Menu size={20} />
          </button>
          <img src="/goli_logo.jpg" alt="GOLI ICT" className="h-9 w-auto object-contain"
            onError={e => { e.target.style.display = 'none'; }} />
          <div className="w-px h-8 bg-gray-200" />
          <div>
            <h2 className="text-2xl font-bold text-gray-800">{currentModule?.name || 'Dashboard'}</h2>
            <p className="text-sm text-gray-500">Warehouse Management System</p>
          </div>
        </div>

        {/* Right */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input type="text" placeholder="Search..."
              className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-56 text-sm" />
          </div>

          {/* Bell */}
          <div className="relative">
            <button ref={bellRef} onClick={() => setNotifOpen(v => !v)}
              className="relative p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <Bell size={20} className="text-gray-600" />
              {unread > 0 && (
                <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center px-0.5 font-bold">
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {/* Notification dropdown */}
            {notifOpen && (
              <div ref={dropRef}
                className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <Calendar size={15} className="text-blue-600" />
                    <span className="text-sm font-semibold text-gray-800">Notifications</span>
                    {unread > 0 && (
                      <span className="bg-red-100 text-red-600 text-xs font-semibold px-1.5 py-0.5 rounded-full">{unread}</span>
                    )}
                  </div>
                  <button onClick={() => setNotifOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
                </div>

                {/* List */}
                <div className="max-h-80 overflow-y-auto">
                  {upcomingEvents.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Bell size={28} className="mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No upcoming events</p>
                    </div>
                  ) : upcomingEvents.map(event => (
                    <div key={event.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors ${event.completed ? 'opacity-50' : ''}`}>

                      {/* Icon */}
                      <div className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        isOverdue(event.event_date) ? 'bg-red-100' : 'bg-blue-100'
                      }`}>
                        {isOverdue(event.event_date)
                          ? <AlertTriangle size={13} className="text-red-500" />
                          : <Calendar size={13} className="text-blue-600" />}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-medium truncate ${event.completed ? 'line-through text-gray-400' : 'text-gray-800'}`}>
                          {event.title}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${TYPE_COLORS[event.event_type] || TYPE_COLORS.other}`}>
                            {event.event_type}
                          </span>
                          <span className={`text-xs font-medium ${isOverdue(event.event_date) ? 'text-red-500' : 'text-gray-500'}`}>
                            {fmtDate(event.event_date)}
                            {event.event_time && ` · ${event.event_time}`}
                          </span>
                        </div>
                        {event.notes && <p className="text-xs text-gray-400 mt-0.5 truncate">{event.notes}</p>}
                      </div>

                      {/* Mark done */}
                      {!event.completed && (
                        <button onClick={() => updateEvent(event.id, { completed: true })}
                          className="flex-shrink-0 p-1 text-gray-300 hover:text-green-500 transition-colors" title="Mark done">
                          <Check size={15} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2 border-t border-gray-100 text-center">
                  <p className="text-xs text-gray-400">Shows today's and overdue events</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;