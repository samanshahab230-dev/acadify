import { useEffect, useState } from 'react';
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
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Published Assignments</h3>
        {assignments.length === 0 && <p className="text-sm text-gray-400">No assignments published yet.</p>}
        {assignments.length > 0 && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            {assignments.map((a, i) => (
              <div key={a._id} className={`flex items-center justify-between gap-4 px-4 py-3.5 ${i !== assignments.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                  <p className="text-xs text-gray-500">{a.subject} · {a.class_name} · Due {a.due_date}</p>
                </div>
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium capitalize shrink-0 ${PRI[a.priority] || ''}`}>{a.priority}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
