import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../../../services/api';

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableTab({ onMessage }) {
  const [slots, setSlots] = useState([]);
  const [classes, setClasses] = useState([]);
  const [form, setForm] = useState({ day: 'Monday', time: '', subject: '', room: '', class_name: '' });
  const [saving, setSaving] = useState(false);

  const load = (noCache = false) => {
    api.get('/teacher/timetable', noCache ? { noCache: true } : {})
      .then(r => setSlots(r.data.slots || []))
      .catch(() => {});
  };

  useEffect(() => {
    load();
    // Load teacher's assigned classes for dropdown
    api.get('/teacher/my-courses')
      .then(r => {
        const unique = [...new Set((r.data.courses || []).map(c => c.class_name).filter(Boolean))];
        setClasses(unique);
        if (unique.length) setForm(f => ({ ...f, class_name: unique[0] }));
      })
      .catch(() => {});
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.time || !form.subject) { onMessage('Time and subject required.', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/teacher/timetable', form);
      onMessage('Slot added.');
      setForm(f => ({ ...f, time: '', subject: '', room: '', class_name: '' }));
      load(true);
    } catch (err) {
      onMessage(err.response?.data?.message || 'Failed to add slot.', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.post(`/teacher/timetable/${id}/delete`, {});
      setSlots(s => s.filter(x => x._id !== id));
    } catch { onMessage('Failed to delete.', 'error'); }
  };

  const grouped = DAYS.reduce((acc, d) => ({ ...acc, [d]: slots.filter(s => s.day === d) }), {});

  return (
    <div className="space-y-7">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">My Timetable</h3>

      {/* Add Slot Form */}
      <form onSubmit={handleAdd} className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Day</label>
            <select value={form.day} onChange={e => setForm(f => ({ ...f, day: e.target.value }))} className="field-input">
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Time</label>
            <input type="time" value={form.time} onChange={e => setForm(f => ({ ...f, time: e.target.value }))} className="field-input" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Subject</label>
            <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} className="field-input" placeholder="e.g. Math" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Class *</label>
            {classes.length > 0 ? (
              <select value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} className="field-input" required>
                <option value="">Select class</option>
                {classes.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            ) : (
              <input value={form.class_name} onChange={e => setForm(f => ({ ...f, class_name: e.target.value }))} className="field-input" placeholder="e.g. Class 9A" required />
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Room</label>
            <input value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} className="field-input" placeholder="Optional" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-all">
          {saving ? 'Adding...' : 'Add Slot'}
        </button>
      </form>

      {/* Weekly View */}
      <div className="space-y-4">
        {DAYS.map(day => grouped[day]?.length > 0 && (
          <div key={day}>
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-widest mb-2">{day}</p>
            <div className="rounded-xl overflow-hidden border border-gray-200">
              {grouped[day].map((s, i) => (
                <div key={s._id} className={`flex items-center justify-between px-4 py-3 text-sm ${i !== grouped[day].length - 1 ? 'border-b border-gray-100' : ''}`}>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-xs text-gray-500 w-14">{s.time}</span>
                    <span className="font-semibold text-gray-800">{s.subject}</span>
                    {s.class_name && <span className="text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg">{s.class_name}</span>}
                    {s.room && <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-lg">{s.room}</span>}
                  </div>
                  <button onClick={() => handleDelete(s._id)} className="text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        ))}
        {slots.length === 0 && <p className="text-sm text-gray-400">No timetable slots added yet.</p>}
      </div>
    </div>
  );
}
