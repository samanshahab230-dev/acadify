import { useEffect, useState } from 'react';
import api from '../../../services/api';

export default function MarksTab({ onMessage }) {
  const [depts, setDepts] = useState([]);
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [existingMarks, setExistingMarks] = useState({}); // {student_id: markObj}

  const [dept, setDept] = useState('');
  const [cls, setCls] = useState('');
  const [courseId, setCourseId] = useState('');
  const [marks, setMarks] = useState({}); // {student_id: {mid, final, total, obtained}}
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    api.get('/teacher/my-departments').then(r => setDepts(r.data.departments || [])).catch(() => {});
  }, []);

  useEffect(() => {
    setCls(''); setClasses([]); setStudents([]); setCourses([]); setCourseId(''); setMarks({});
    if (!dept) return;
    api.get(`/teacher/my-classes?department=${encodeURIComponent(dept)}`)
      .then(r => setClasses(r.data.classes || [])).catch(() => {});
  }, [dept]);

  useEffect(() => {
    setStudents([]); setCourses([]); setCourseId(''); setMarks({});
    if (!dept || !cls) return;
    api.get(`/teacher/class-students?department=${encodeURIComponent(dept)}&class_name=${encodeURIComponent(cls)}`)
      .then(r => {
        const list = r.data.students || [];
        setStudents(list);
        const courseMap = {};
        list.forEach(s => s.courses?.forEach(c => { courseMap[c.course_id] = c.subject; }));
        setCourses(Object.entries(courseMap).map(([id, subject]) => ({ course_id: id, subject })));
      }).catch(() => {});
  }, [cls]);

  // Load existing marks when course selected
  useEffect(() => {
    setMarks({}); setExistingMarks({});
    if (!courseId) return;
    api.get(`/teacher/course-marks/${courseId}`)
      .then(r => {
        const existing = {};
        (r.data.marks || []).forEach(m => { existing[m.student_id] = m; });
        setExistingMarks(existing);
        // Pre-fill marks form
        const init = {};
        students.forEach(s => {
          const ex = existing[s._id];
          init[s._id] = {
            mid: ex?.mid_marks ?? '',
            final: ex?.final_marks ?? '',
            total: ex?.total_marks ?? 100,
            obtained: ex?.obtained_marks ?? '',
          };
        });
        setMarks(init);
      }).catch(() => {});
  }, [courseId]);

  const updateMark = (sid, field, val) => {
    setMarks(m => ({ ...m, [sid]: { ...m[sid], [field]: val } }));
  };

  const handleSave = async () => {
    if (!courseId) { onMessage('Select a course first.', 'error'); return; }
    setSaving(true);
    try {
      await Promise.all(
        students.map(s => {
          const m = marks[s._id] || {};
          return api.post('/teacher/course-marks', {
            course_id: courseId,
            student_id: s._id,
            mid_marks: parseFloat(m.mid) || 0,
            final_marks: parseFloat(m.final) || 0,
            total_marks: parseFloat(m.total) || 100,
            obtained_marks: parseFloat(m.obtained) || 0,
          });
        })
      );
      onMessage('Marks saved for all students.');
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      onMessage(err.response?.data?.message || 'Failed to save marks.', 'error');
    } finally { setSaving(false); }
  };

  const getPct = (sid) => {
    const m = marks[sid];
    if (!m) return null;
    const total = parseFloat(m.total);
    const obtained = parseFloat(m.obtained);
    if (!total || isNaN(obtained)) return null;
    return Math.round((obtained / total) * 100);
  };

  const pctColor = p => p >= 75 ? 'text-emerald-600' : p >= 50 ? 'text-amber-600' : 'text-red-600';
  const pctBg = p => p >= 75 ? 'bg-emerald-100 text-emerald-700' : p >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';

  return (
    <div className="space-y-6">
      <h3 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Enter Marks</h3>

      {/* Filters */}
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
          <select value={courseId} onChange={e => setCourseId(e.target.value)} className="field-input" disabled={!cls}>
            <option value="">Select Course</option>
            {courses.map(c => <option key={c.course_id} value={c.course_id}>{c.subject}</option>)}
          </select>
        </div>
      </div>

      {/* Marks Table */}
      {students.length > 0 && courseId && (
        <div className="space-y-4">
          <div className="overflow-x-auto rounded-xl border border-gray-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Student</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Mid</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Final</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Obtained</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Total</th>
                  <th className="text-center px-3 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">%</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {students.map(s => {
                  const m = marks[s._id] || {};
                  const pct = getPct(s._id);
                  return (
                    <tr key={s._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.roll_no}</p>
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number" min="0" step="0.5"
                          value={m.mid ?? ''}
                          onChange={e => updateMark(s._id, 'mid', e.target.value)}
                          className="field-input text-center w-20"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number" min="0" step="0.5"
                          value={m.final ?? ''}
                          onChange={e => updateMark(s._id, 'final', e.target.value)}
                          className="field-input text-center w-20"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number" min="0" step="0.5"
                          value={m.obtained ?? ''}
                          onChange={e => updateMark(s._id, 'obtained', e.target.value)}
                          className="field-input text-center w-20"
                          placeholder="0"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <input
                          type="number" min="1" step="1"
                          value={m.total ?? 100}
                          onChange={e => updateMark(s._id, 'total', e.target.value)}
                          className="field-input text-center w-20"
                          placeholder="100"
                        />
                      </td>
                      <td className="px-3 py-3 text-center">
                        {pct !== null
                          ? <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${pctBg(pct)}`}>{pct}%</span>
                          : <span className="text-gray-400 text-xs">—</span>
                        }
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSave}
            disabled={saving || saved}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-40 transition-all"
          >
            {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save All Marks'}
          </button>
        </div>
      )}

      {cls && courses.length === 0 && <p className="text-sm text-gray-400">No courses found for this class.</p>}
      {cls && students.length === 0 && courses.length > 0 && <p className="text-sm text-gray-400">No students found.</p>}
    </div>
  );
}
