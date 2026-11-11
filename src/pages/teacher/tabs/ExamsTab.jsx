import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import api from '../../../services/api';

const TYPE_STYLE = {
  mid:   'bg-amber-100 text-amber-700',
  final: 'bg-red-100 text-red-700',
  quiz:  'bg-cyan-100 text-cyan-700',
};

export default function ExamsTab({ onMessage }) {
  const [depts, setDepts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [courses, setCourses] = useState([]);
  const [exams, setExams] = useState([]);

  const [dept, setDept] = useState('');
  const [cls, setCls] = useState('');
  const [form, setForm] = useState({ course_id: '', subject: '', exam_type: 'mid', exam_date: '', venue: '', notes: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/teacher/my-departments').then(r => setDepts(r.data.departments || [])).catch(() => {});
    loadExams();
  }, []);

  const loadExams = (noCache = false) => {
    api.get('/teacher/class-exams', noCache ? { noCache: true } : {})
      .then(r => setExams(r.data.exams || [])).catch(() => {});
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

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!form.course_id || !form.exam_date) { onMessage('Course and date required.', 'error'); return; }
    setSaving(true);
    try {
      await api.post('/teacher/class-exams', { ...form, department: dept, class_name: cls });
      onMessage('Exam scheduled.');
      setForm(f => ({ ...f, exam_date: '', venue: '', notes: '' }));
      loadExams(true);
    } catch (err) {
      onMessage(err.response?.data?.message || 'Failed.', 'error');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await api.post(`/teacher/class-exams/${id}/delete`, {});
      setExams(e => e.filter(x => x._id !== id));
    } catch { onMessage('Failed to delete.', 'error'); }
  };

  return (
    <div className="space-y-7">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Schedule Exam</h3>

      {/* Filters + Form */}
      <form onSubmit={handleAdd} className="space-y-4">
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
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Exam Type</label>
            <select value={form.exam_type} onChange={e => setForm(f => ({ ...f, exam_type: e.target.value }))} className="field-input">
              <option value="mid">Midterm</option>
              <option value="final">Final</option>
              <option value="quiz">Quiz</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</label>
            <input type="date" value={form.exam_date} onChange={e => setForm(f => ({ ...f, exam_date: e.target.value }))} className="field-input" required />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Venue (optional)</label>
            <input value={form.venue} onChange={e => setForm(f => ({ ...f, venue: e.target.value }))} className="field-input" placeholder="e.g. Room 101" />
          </div>
          <div className="space-y-1.5 sm:col-span-3">
            <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Notes (optional)</label>
            <input value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} className="field-input" placeholder="Any instructions for students" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-all">
          {saving ? 'Scheduling...' : 'Schedule Exam'}
        </button>
      </form>

      {/* Exams List */}
      <div className="space-y-2">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Scheduled Exams</h3>
        {exams.length === 0 && <p className="text-sm text-gray-400">No exams scheduled yet.</p>}
        {exams.length > 0 && (
          <div className="rounded-xl overflow-hidden border border-gray-200">
            {exams.map((e, i) => (
              <div key={e._id} className={`flex items-center justify-between gap-4 px-4 py-3.5 ${i !== exams.length - 1 ? 'border-b border-gray-100' : ''}`}>
                <div className="flex items-center gap-3">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${TYPE_STYLE[e.exam_type] || 'bg-gray-100 text-gray-600'}`}>{e.exam_type}</span>
                  <div>
                    <p className="text-sm font-semibold text-gray-800">{e.subject}</p>
                    <p className="text-xs text-gray-500">{e.class_name} · {e.exam_date}{e.venue && ` · ${e.venue}`}</p>
                  </div>
                </div>
                <button onClick={() => handleDelete(e._id)} className="text-gray-300 hover:text-red-500 transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
