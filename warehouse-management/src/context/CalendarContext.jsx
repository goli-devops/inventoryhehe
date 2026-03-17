import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import supabase from '../config/supabase';
import { useAuth } from './AuthContext';

const CalendarContext = createContext();
export const useCalendar = () => useContext(CalendarContext);

export const CalendarProvider = ({ children }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .eq('user_id', user.id)
        .order('event_date', { ascending: true });
      if (!error) setEvents(data || []);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const addEvent = async (event) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('calendar_events')
      .insert([{ ...event, user_id: user.id }])
      .select().single();
    if (!error && data) { setEvents(prev => [...prev, data]); return data; }
    return null;
  };

  const updateEvent = async (id, updates) => {
    const { data, error } = await supabase
      .from('calendar_events')
      .update(updates).eq('id', id).select().single();
    if (!error && data) {
      setEvents(prev => prev.map(e => e.id === id ? data : e));
      return data;
    }
    return null;
  };

  const deleteEvent = async (id) => {
    const { error } = await supabase.from('calendar_events').delete().eq('id', id);
    if (!error) { setEvents(prev => prev.filter(e => e.id !== id)); return true; }
    return false;
  };

  // Events due today or overdue (for notifications)
  const today = new Date().toISOString().split('T')[0];
  const upcomingEvents = events.filter(e => {
    const d = e.event_date?.split('T')[0];
    return d === today || (d < today && !e.completed);
  });

  return (
    <CalendarContext.Provider value={{ events, loading, addEvent, updateEvent, deleteEvent, upcomingEvents, fetchEvents }}>
      {children}
    </CalendarContext.Provider>
  );
};

export default CalendarContext;