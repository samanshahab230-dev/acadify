import { useEffect, useState } from 'react';
import api from '../../../services/api';

export default function AttendanceTab({ onMessage }) {
  const [depts, setDepts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);

  const [dept, setDept] = useState('');
  const [cls, setCls] = useState('');
  const [courseId, setCourseId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [attendance, setAttendance] = useState({}); // {student_id: 'present'|'absent'}
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Load departments
  useEffect(() => {
    api.get('/teacher/my-departments').then(r => setDepts(r.data.departments || [])).catch(() => {});
  }, []);

  // Load classes when dept changes
  useEffect(() => {
    setCls(''); setClasses([]); setStudents([]); setCourses([]); setCourseId('');
    if (!dept) return;
    api.get(`/teacher/my-classes?department=${encodeURIComponent(dept)}`)
      .then(r => setClasses(r.data.classes || [])).catch(() => {});
  }, [dept]);

  // Load students + courses when class changes
  useEffect(() => {
    setStudents([]); setCourses([]); setCourseId(''); setAttendance({});
    if (!dept || !cls) return;
    api.get(`/teacher/class-students?department=${encodeURIComponent(dept)}&class_name=${encodeURIComponent(cls)}`)
      .then(r => {
        const list = r.data.students || [];
        setStudents(list);
        // Collect unique courses from all students
        const courseMap = {};
        list.forEach(s => s.courses?.forEach(c => { courseMap[c.course_id] = c.subject; }));
        setCourses(Object.entries(courseMap).map(([id, subject]) => ({ course_id: id, subject })));
        // Default all present
        const init = {};
        list.forEach(s => { init[s._id] = 'present'; });
        setAttendance(init);
      }).catch(() => {});
  }, [cls]);

  const toggle = (sid) => setAttendance(a => ({ ...a, [sid]: a[sid] === 'present' ? 'absent' : 'present' }));
  const markAll = (status) => setAttendance(a => Object.fromEntries(Object.keys(a).map(k => [k, status])));

  const handleSubmit = async () => {
    if (!courseId) { onMessage('Please select a course.', 'error'); return; }
    if (!students.length) { onMessage('No students in this class.', 'error'); return; }
    setSaving(true);
    try {
      const records = students.map(s => ({ student_id: s._id, status: attendance[s._id] || 'present' }));
      const { data } = await api.post('/teacher/course-attendance', { course_id: courseId, date, records });
      onMessage(data.message || 'Attendance saved.');
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } catch (err) {
      onMessage(err.response?.data?.message || 'Failed to save.', 'error');
    } finally { setSaving(false); }
  };

  const presentCount = Object.values(attendance).filter(v => v === 'present').length;
  const absentCount = Object.values(attendance).filter(v => v === 'absent').length;

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Mark Attendance</h3>

      {/* Step 1 — Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <select value={courseId} onChange={e => setCourseId(e.target.value)} className="field-input" disabled={!cls}>
            <option value="">Select Course</option>
            {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.subject}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Date</label>
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="field-input" />
        </div>
      </div>

      {/* Step 2 — Student List */}
      {students.length > 0 && courseId && (
        <div className="space-y-3">
          {/* Summary + bulk actions */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-4 text-sm">
              <span className="text-emerald-600 font-semibold">Present: {presentCount}</span>
              <span className="text-red-600 font-semibold">Absent: {absentCount}</span>
              <span className="text-gray-500">Total: {students.length}</span>
            </div>
            <div className="flex gap-2">
              <button onClick={() => markAll('present')} className="px-3 py-1.5 text-xs rounded-lg bg-emerald-100 text-emerald-700 font-medium hover:bg-emerald-200 transition-colors">All Present</button>
              <button onClick={() => markAll('absent')} className="px-3 py-1.5 text-xs rounded-lg bg-red-100 text-red-700 font-medium hover:bg-red-200 transition-colors">All Absent</button>
            </div>
          </div>

          {/* Student rows */}
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            {students.map((s, i) => {
              const isPresent = attendance[s._id] === 'present';
              return (
                <div
                  key={s._id}
                  onClick={() => toggle(s._id)}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${i !== students.length - 1 ? 'border-b border-gray-100' : ''} ${isPresent ? 'bg-emerald-50 hover:bg-emerald-100' : 'bg-red-50 hover:bg-red-100'}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-2.5 h-2.5 rounded-full ${isPresent ? 'bg-emerald-500' : 'bg-red-500'}`} />
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.roll_no}</p>
                    </div>
                  </div>
                  <span className={`text-xs font-bold px-3 py-1 rounded-full ${isPresent ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {isPresent ? 'Present' : 'Absent'}
                  </span>
                </div>
              );
            })}
          </div>

          <button
            onClick={handleSubmit}
            disabled={saving || submitted}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-all"
          >
            {saving ? 'Saving...' : submitted ? '✓ Saved' : 'Save Attendance'}
          </button>
        </div>
      )}

      {cls && courses.length === 0 && (
        <p className="text-sm text-gray-400">No courses found for this class.</p>
      )}
      {cls && students.length === 0 && courses.length > 0 && (
        <p className="text-sm text-gray-400">No students found in this class.</p>
      )}
    </div>
  );
}

// Shared helpers for other tabs
export function Field({ label, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{label}</label>
      {children}
    </div>
  );
}
export function SectionTitle({ children }) {
  return <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">{children}</h3>;
}
export function SaveButton({ saving, children }) {
  return (
    <button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-all">
      {saving ? 'Saving...' : children}
    </button>
  );
}
