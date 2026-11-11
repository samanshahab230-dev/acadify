import { useEffect, useState, useCallback } from 'react';
import { Users, AlertTriangle, RefreshCw, X, TrendingUp, BookOpen, Clock, Calendar, BarChart3, CalendarCheck, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import AttendanceTab from './tabs/AttendanceTab';
import MarksTab from './tabs/MarksTab';
import TimetableTab from './tabs/TimetableTab';
import ExamsTab from './tabs/ExamsTab';
import AssignmentsTab from './tabs/AssignmentsTab';
import VerifyTab from './tabs/VerifyTab';

const TABS = [
  { id: 'attendance',  label: 'Attendance',       icon: CalendarCheck, color: 'text-cyan-400' },
  { id: 'marks',       label: 'Marks',             icon: BarChart3,     color: 'text-purple-400' },
  { id: 'timetable',  label: 'Timetable',         icon: Clock,         color: 'text-blue-400' },
  { id: 'exams',      label: 'Exams',             icon: Calendar,      color: 'text-amber-400' },
  { id: 'assignments',label: 'Assignments',       icon: BookOpen,      color: 'text-emerald-400' },
  { id: 'verify',     label: 'Verify Exceptions', icon: CheckCircle,   color: 'text-rose-400' },
];

export default function TeacherDashboard() {
  const [students, setStudents] = useState([]);
  const [atRisk, setAtRisk] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const [activeTab, setActiveTab] = useState('attendance');
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [version, setVersion] = useState(0);

  const reload = useCallback(() => setVersion(v => v + 1), []);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  }, []);

  useEffect(() => {
    let active = true;
    const cacheKey = 'teacher_dashboard';
    const cached = sessionStorage.getItem(cacheKey);
    if (cached && version === 0) {
      try {
        const { students: s, atRisk: r } = JSON.parse(cached);
        setStudents(s); setAtRisk(r);
        setSelectedStudent(prev => (!prev && s.length) ? s[0] : s.find(x => x._id === prev?._id) || prev);
        setLoading(false);
      } catch {}
    }
    Promise.all([
      api.get('/teacher/dashboard', version > 0 ? { noCache: true } : {}),
      api.get('/teacher/at-risk',   version > 0 ? { noCache: true } : {}),
    ])
      .then(([d, r]) => {
        if (!active) return;
        const list = d.data.students || [];
        const risk = r.data?.students || [];
        setStudents(list); setAtRisk(risk);
        setSelectedStudent(prev => (!prev && list.length) ? list[0] : list.find(s => s._id === prev?._id) || prev);
        setLoading(false);
        try { sessionStorage.setItem(cacheKey, JSON.stringify({ students: list, atRisk: risk })); } catch {}
      })
      .catch(e => { if (active) setError(e.response?.data?.message || 'Could not load dashboard.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [version]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="flex items-center gap-3 text-secondary">
        <div className="w-5 h-5 border-2 border-white/20 border-t-cyan-400 rounded-full animate-spin" />
        Loading teacher panel...
      </div>
    </div>
  );
  if (error) return <div className="text-red-400 p-6 glass-card">{error}</div>;

  const avgAtt = students.length
    ? (students.reduce((s, x) => s + Number(x.attendance_pct || 0), 0) / students.length).toFixed(1)
    : '0.0';

  return (
    <div className="max-w-7xl mx-auto space-y-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Teacher Panel</h1>
          <p className="text-gray-500 text-sm mt-1">Manage attendance, marks, timetable, exams and assignments.</p>
        </div>
        <button onClick={reload} className="flex items-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-sm text-gray-600 hover:text-gray-900 transition-all shadow-sm">
          <RefreshCw className="w-4 h-4" /> Refresh
        </button>
      </div>

      {/* ── Toast ── */}
      {toast.msg && (
        <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm border ${
          toast.type === 'error'
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-emerald-50 border-emerald-200 text-emerald-700'
        }`}>
          <span>{toast.msg}</span>
          <button onClick={() => setToast({ msg: '' })}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
        </div>
      )}

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Students', value: students.length, icon: Users, color: 'cyan' },
          { label: 'Avg Attendance', value: `${avgAtt}%`, icon: TrendingUp, color: 'emerald' },
          { label: 'At-Risk', value: atRisk.length, icon: AlertTriangle, color: 'red' },
          { label: 'Subjects', value: students[0]?.subjects?.length || 0, icon: BookOpen, color: 'purple' },
        ].map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── At-Risk Alert ── */}
      {atRisk.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700 text-sm font-semibold mb-3">
            <AlertTriangle className="w-4 h-4" />
            {atRisk.length} student{atRisk.length > 1 ? 's' : ''} below 75% attendance
          </div>
          <div className="flex flex-wrap gap-2">
            {atRisk.map(s => (
              <button
                key={s._id}
                onClick={() => setSelectedStudent(students.find(x => x._id === s._id))}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-red-100 border border-red-200 text-red-700 text-xs hover:bg-red-200 transition-colors"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {s.name} — {s.attendance_pct}%
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Main Layout ── */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5 items-start">

        {/* Student List */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
              Students <span className="ml-1 text-gray-400">({students.length})</span>
            </p>
          </div>
          <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-100">
            {students.length === 0 && (
              <p className="text-sm text-gray-400 px-4 py-6 text-center">No students assigned yet.</p>
            )}
            {students.map(s => {
              const att = Number(s.attendance_pct || 0);
              const isSelected = selectedStudent?._id === s._id;
              const attColor = att < 70 ? 'text-red-600' : att < 75 ? 'text-amber-600' : 'text-emerald-600';
              const dotColor = att < 70 ? 'bg-red-500' : att < 75 ? 'bg-amber-500' : 'bg-emerald-500';
              return (
                <button
                  key={s._id}
                  onClick={() => setSelectedStudent(s)}
                  className={`w-full text-left px-4 py-3.5 flex items-center gap-3 transition-colors ${
                    isSelected ? 'bg-emerald-50 border-l-2 border-l-emerald-500' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${isSelected ? 'text-emerald-700' : 'text-gray-800'}`}>{s.name}</p>
                    <p className="text-xs text-gray-500 truncate">{s.roll_no} · {s.department}</p>
                  </div>
                  <span className={`text-xs font-bold shrink-0 ${attColor}`}>{att.toFixed(0)}%</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right Panel */}
        {!selectedStudent ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center text-gray-400 shadow-sm">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p>Select a student from the list</p>
          </div>
        ) : (
          <div className="space-y-4 min-w-0">

            {/* Student Card */}
            <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedStudent.name}</h2>
                  <p className="text-gray-500 text-sm mt-0.5">
                    {selectedStudent.roll_no} &nbsp;·&nbsp; {selectedStudent.department} &nbsp;·&nbsp; Semester {selectedStudent.semester}
                  </p>
                </div>
                <div className="flex gap-3">
                  {[
                    { label: 'GPA', value: Number(selectedStudent.gpa || 0).toFixed(2), color: 'text-gray-900' },
                    {
                      label: 'Attendance',
                      value: `${Number(selectedStudent.attendance_pct || 0).toFixed(1)}%`,
                      color: Number(selectedStudent.attendance_pct) < 70 ? 'text-red-600' : Number(selectedStudent.attendance_pct) < 75 ? 'text-amber-600' : 'text-emerald-600'
                    },
                    { label: 'Subjects', value: selectedStudent.subjects?.length || 0, color: 'text-gray-900' },
                  ].map(m => (
                    <div key={m.label} className="text-center px-4 py-2 rounded-xl bg-gray-50 border border-gray-200">
                      <p className="text-[10px] text-gray-500 uppercase tracking-wide">{m.label}</p>
                      <p className={`text-lg font-bold mt-0.5 ${m.color}`}>{m.value}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tabs Container */}
            <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">

              {/* Tab Bar */}
              <div className="flex overflow-x-auto border-b border-gray-200 bg-gray-50" style={{ scrollbarWidth: 'none' }}>
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium whitespace-nowrap transition-all shrink-0 border-b-2 ${
                      activeTab === tab.id
                        ? 'border-emerald-500 text-emerald-700 bg-white'
                        : 'border-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100'
                    }`}
                  >
                    <tab.icon className={`w-4 h-4 ${activeTab === tab.id ? tab.color : 'text-gray-400'}`} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'attendance'  && <AttendanceTab  onMessage={showToast} />}
                {activeTab === 'marks'       && <MarksTab       onMessage={showToast} />}
                {activeTab === 'timetable'   && <TimetableTab   onMessage={showToast} />}
                {activeTab === 'exams'       && <ExamsTab       onMessage={showToast} />}
                {activeTab === 'assignments' && <AssignmentsTab onMessage={showToast} />}
                {activeTab === 'verify'      && <VerifyTab      student={selectedStudent} onMessage={showToast} onReload={reload} />}
              </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  const styles = {
    cyan:   { border: 'border-cyan-200',   bg: 'bg-cyan-50',   icon: 'text-cyan-600',   val: 'text-cyan-700' },
    emerald:{ border: 'border-emerald-200', bg: 'bg-emerald-50', icon: 'text-emerald-600', val: 'text-emerald-700' },
    red:    { border: 'border-red-200',     bg: 'bg-red-50',    icon: 'text-red-600',    val: 'text-red-700' },
    purple: { border: 'border-purple-200',  bg: 'bg-purple-50', icon: 'text-purple-600', val: 'text-purple-700' },
  };
  const s = styles[color];
  return (
    <div className={`rounded-2xl border ${s.border} ${s.bg} p-5 flex items-center gap-4`}>
      <div className="p-2.5 rounded-xl bg-white shadow-sm">
        <Icon className={`w-5 h-5 ${s.icon}`} />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className={`text-2xl font-bold mt-0.5 ${s.val}`}>{value}</p>
      </div>
    </div>
  );
}
