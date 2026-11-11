import { useEffect, useState } from 'react';
import { Trash2, Pencil, ChevronDown, ChevronUp, Check, X } from 'lucide-react';
import api from '../../../services/api';

const PRI = { high: 'bg-red-100 text-red-700', medium: 'bg-amber-100 text-amber-700', low: 'bg-emerald-100 text-emerald-700' };

export default function AssignmentsTab({ onMessage }) {
  const [depts, setDepts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [dept, setDept] = useState('');
  const [cls, setCls] = useState('');
  const [form, setForm] = useState({ course_id: '', subject: '', title: '', due_date: '', priority: 'medium', description: '' });
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [expandedSubs, setExpandedSubs] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  useEffect(() => {
    api.get('/teacher/my-departments').then(r => setDepts(r.data.departments || [])).catch(() => {});
    loadAssignments();
  }, []);

  const loadAssignments = (noCache = false) => {
    api.get('/teacher/class-assignments', noCache ? { noCache: true } : {})
      .then(r => setAssignments(r.data.assignments || [])).catch(() => {});
  };

  useEffect(() => {
    setCls(''); setClasses([]); setCourses([]); setForm(f => ({ ...f, course_id: '', subject: '' }));
    if (!dept) return;
    api.get(`/teacher/my-classes?department=${encodeURIComponent(dept)}`)
      .then(r => setClasses(r.data.classes || [])).catch(() => {});
  }, [dept]);

  useEffect(() => {
    setCourses([]); setForm(f => ({ ...f, course_id: '', subject: '' }));
    if (!dept || !cls) return;
    api.get(`/teacher/class-students?department=${encodeURIComponent(dept)}&class_name=${encodeURIComponent(cls)}`)
      .then(r => {
        const courseMap = {};
        (r.data.students || []).forEach(s => s.courses?.forEach(c => { courseMap[c.course_id] = c.subject; }));
        setCourses(Object.entries(courseMap).map(([id, subject]) => ({ course_id: id, subject })));
      }).catch(() => {});
  }, [cls]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.course_id || !form.title || !form.due_date) { onMessage('Course, title and due date required.', 'error'); return; }
    setSaving(true);
    const fd = new FormData();
    Object.entries({ ...form, department: dept, class_name: cls }).forEach(([k, v]) => fd.append(k, v));
    if (file) fd.append('file', file);
    try {
      await api.post('/teacher/class-assignments', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      onMessage('Assignment published to class.');
      setForm(f => ({ ...f, title: '', due_date: '', description: '' }));
      setFile(null);
      loadAssignments(true);
    } catch (err) {
      onMessage(err.response?.data?.message || 'Failed to publish.', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this assignment and all its submissions?')) return;
    try {
      await api.post(`/teacher/class-assignments/${id}/delete`, {});
      setAssignments(a => a.filter(x => x._id !== id));
      onMessage('Assignment deleted.');
    } catch { onMessage('Failed to delete.', 'error'); }
  };

  const startEdit = (a) => {
    setEditingId(a._id);
    setEditForm({ title: a.title, description: a.description, due_date: a.due_date, priority: a.priority });
  };

  const saveEdit = async (id) => {
    try {
      await api.post(`/teacher/class-assignments/${id}/edit`, editForm);
      onMessage('Assignment updated.');
      setEditingId(null);
      loadAssignments(true);
    } catch { onMessage('Failed to update.', 'error'); }
  };

  return (
    <div className="space-y-7">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Publish Assignment</h3>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Department</label>
            <select value={dept} onChange={e => setDept(e.target.value)} className="field-input">
              <option value="">Select Department</option>
              {depts.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Class</label>
            <select value={cls} onChange={e => setCls(e.target.value)} className="field-input" disabled={!dept}>
              <option value="">Select Class</option>
              {classes.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Course / Subject</label>
            <select value={form.course_id} onChange={e => {
              const c = courses.find(x => x.course_id === e.target.value);
              setForm(f => ({ ...f, course_id: e.target.value, subject: c?.subject || '' }));
            }} className="field-input" disabled={!cls}>
              <option value="">Select Course</option>
              {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.subject}</option>)}
            </select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Title</label>
            <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className="field-input" placeholder="Assignment title" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Due Date</label>
            <input type="date" value={form.due_date} min={new Date().toISOString().slice(0, 10)} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} className="field-input" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Priority</label>
            <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))} className="field-input">
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Instructions (optional)</label>
            <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="field-input" placeholder="Brief instructions" />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Attach File (optional)</label>
            <input type="file" onChange={e => setFile(e.target.files[0])} className="field-input text-sm py-2" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.txt" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-all">
          {saving ? 'Publishing...' : 'Publish to Class'}
        </button>
      </form>

      {/* Published Assignments */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Published Assignments</h3>
        {assignments.length === 0 && <p className="text-sm text-gray-400">No assignments published yet.</p>}
        {assignments.map(a => (
          <div key={a._id} className="rounded-xl border border-gray-200 overflow-hidden">
            {/* Header row */}
            {editingId === a._id ? (
              <div className="p-4 space-y-3 bg-amber-50 border-b border-amber-200">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <input value={editForm.title} onChange={e => setEditForm(f => ({ ...f, title: e.target.value }))}
                    className="field-input sm:col-span-2" placeholder="Title" />
                  <input type="date" value={editForm.due_date} onChange={e => setEditForm(f => ({ ...f, due_date: e.target.value }))}
                    className="field-input" />
                  <select value={editForm.priority} onChange={e => setEditForm(f => ({ ...f, priority: e.target.value }))} className="field-input">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                  <input value={editForm.description} onChange={e => setEditForm(f => ({ ...f, description: e.target.value }))}
                    className="field-input sm:col-span-4" placeholder="Instructions" />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(a._id)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700">
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.subject} · {a.class_name} · Due {a.due_date}</p>
                  {a.description && <p className="text-xs text-gray-400 mt-0.5">{a.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize ${PRI[a.priority] || ''}`}>{a.priority}</span>
                  <button onClick={() => startEdit(a)} className="text-gray-400 hover:text-blue-500 transition-colors" title="Edit">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(a._id)} className="text-gray-400 hover:text-red-500 transition-colors" title="Delete">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* Submissions toggle */}
            <button
              onClick={() => setExpandedSubs(s => ({ ...s, [a._id]: !s[a._id] }))}
              className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
            >
              <span className="font-semibold">{a.submission_count} submission{a.submission_count !== 1 ? 's' : ''}</span>
              {expandedSubs[a._id] ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {expandedSubs[a._id] && (
              <div className="divide-y divide-gray-100">
                {a.submissions.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-gray-400 italic">No submissions yet.</p>
                ) : (
                  a.submissions.map((s, i) => (
                    <div key={i} className="px-4 py-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{s.student_name} <span className="text-gray-400 font-normal">({s.roll_no})</span></p>
                        <p className="text-xs text-gray-500 mt-0.5">Submitted: {s.submitted_at || '—'}</p>
                        {s.submission_note && <p className="text-xs text-gray-500 mt-0.5">Note: {s.submission_note}</p>}
                        {s.submission_file_name && <p className="text-xs text-blue-500 mt-0.5">📎 {s.submission_file_name}</p>}
                      </div>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-medium shrink-0">Submitted</span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
