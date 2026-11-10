import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, BookOpen, Calendar, CheckSquare, ChevronRight, Clock, TrendingUp } from 'lucide-react';
import api from '../../services/api';
import { SkeletonCard, SkeletonStat } from '../../components/Skeleton';

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/dashboard').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <SkeletonCard lines={1} />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">{Array.from({ length: 4 }).map((_, i) => <SkeletonStat key={i} />)}</div>
      <div className="grid lg:grid-cols-3 gap-6"><div className="lg:col-span-2"><SkeletonCard lines={4} /></div><SkeletonCard lines={3} /></div>
    </div>
  );

  if (!data?.student) return <div className="text-red-400 p-8">Error loading dashboard.</div>;

  const { student, prediction, today_classes, upcoming_assignments, courses_attendance, courses_marks } = data;
  const riskColor = student.risk_level === 'HIGH' ? 'text-red-400' : student.risk_level === 'MEDIUM' ? 'text-yellow-400' : 'text-emerald-400';
  const riskBg = student.risk_level === 'HIGH' ? 'bg-red-500/10 border-red-500/20' : student.risk_level === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500/20' : 'bg-emerald-500/10 border-emerald-500/20';

  const overallAtt = courses_attendance?.length
    ? Math.round(courses_attendance.reduce((s, c) => s + c.percentage, 0) / courses_attendance.length)
    : Math.round(student.attendance_pct || 0);

  const overallMarks = courses_marks?.length
    ? Math.round(courses_marks.reduce((s, c) => s + (c.percentage || 0), 0) / courses_marks.length)
    : null;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/5 to-transparent pointer-events-none" />
        <h2 className="text-2xl font-bold">Welcome back, {student.user?.name || 'Student'} 👋</h2>
        <p className="text-secondary mt-1">{student.department}{student.class_name ? ` · ${student.class_name}` : ''} · Roll No: {student.roll_no}</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Overall Attendance" value={`${overallAtt}%`} icon={CheckSquare}
          valueClass={overallAtt < 75 ? 'text-red-400' : 'text-emerald-400'} />
        <StatCard title="Overall Marks" value={overallMarks !== null ? `${overallMarks}%` : '—'} icon={TrendingUp}
          valueClass={overallMarks !== null && overallMarks < 50 ? 'text-red-400' : 'text-blue-400'} />
        <StatCard title="Courses Enrolled" value={courses_attendance?.length || 0} icon={BookOpen} />
        <div className={`glass-card p-5 flex flex-col justify-between border ${riskBg}`}>
          <div className="flex justify-between items-start mb-3">
            <span className="text-sm font-medium text-secondary">Risk Status</span>
            <AlertTriangle className={`w-4 h-4 ${riskColor}`} />
          </div>
          <div className={`text-2xl font-bold ${riskColor}`}>{student.risk_level || 'LOW'}</div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Attendance + Marks */}
        <div className="lg:col-span-2 space-y-5">

          {/* Course-wise Attendance */}
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Course Attendance</h3>
              <Link to="/student/attendance" className="text-sm text-secondary hover:text-white flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {courses_attendance?.length ? (
              <div className="space-y-3">
                {courses_attendance.map((c, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{c.subject}</span>
                      <span className={c.percentage < 75 ? 'text-red-400 font-semibold' : 'text-emerald-400'}>
                        {c.present}/{c.total} · {c.percentage}%
                      </span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${c.percentage < 75 ? 'bg-red-400' : 'bg-emerald-400'}`}
                        style={{ width: `${c.percentage}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary text-sm text-center py-4">No attendance records yet.</p>
            )}
          </div>

          {/* Course-wise Marks */}
          <div className="glass-card p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg">Course Marks</h3>
              <Link to="/student/marks" className="text-sm text-secondary hover:text-white flex items-center gap-1">
                View all <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            {courses_marks?.length ? (
              <div className="space-y-3">
                {courses_marks.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-white/5 rounded-xl border border-white/5">
                    <div>
                      <p className="font-medium text-sm">{c.subject}</p>
                      <p className="text-xs text-secondary mt-0.5">Mid: {c.mid ?? '—'} · Final: {c.final ?? '—'}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-lg font-bold ${c.percentage >= 75 ? 'text-emerald-400' : c.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {c.percentage != null ? `${c.percentage}%` : '—'}
                      </p>
                      {c.grade && <p className="text-xs text-secondary">{c.grade}</p>}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-secondary text-sm text-center py-4">No marks entered yet.</p>
            )}
          </div>
        </div>

        {/* Right: Today's Schedule + Upcoming + AI */}
        <div className="space-y-5">
          {/* Today's Schedule */}
          <div className="glass-card p-5">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-purple-400" /> Today's Classes</h3>
            {today_classes?.length ? (
              <div className="space-y-2">
                {today_classes.map((cls, i) => (
                  <div key={i} className="flex justify-between items-center p-2.5 bg-white/5 rounded-lg text-sm">
                    <span className="font-medium">{cls.subject}</span>
                    <span className="text-secondary flex items-center gap-1"><Clock className="w-3 h-3" />{cls.time}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-secondary text-center py-3">No classes today.</p>}
          </div>

          {/* Upcoming Assignments */}
          {upcoming_assignments?.length > 0 && (
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><BookOpen className="w-4 h-4 text-cyan-400" /> Due Soon</h3>
              <div className="space-y-2">
                {upcoming_assignments.slice(0, 3).map(a => (
                  <div key={a._id} className="text-sm border-b border-white/5 pb-2">
                    <p className="font-medium">{a.title}</p>
                    <p className="text-xs text-secondary">{a.subject} · Due {a.due_date}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AI Risk */}
          {prediction && (
            <div className="glass-card p-5">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-indigo-400" /> AI Forecast</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="text-3xl font-bold">{Number(prediction.risk_score || 0).toFixed(0)}</div>
                <div>
                  <p className="text-xs text-secondary">Risk Score</p>
                  <p className={`text-sm font-semibold ${riskColor}`}>{prediction.risk_level}</p>
                </div>
              </div>
              <Link to="/student/predictions" className="text-xs text-indigo-400 hover:underline flex items-center gap-1">
                View full forecast <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, valueClass = 'text-white' }) {
  return (
    <div className="glass-card p-5 flex flex-col justify-between">
      <div className="flex justify-between items-start mb-3">
        <span className="text-sm font-medium text-secondary">{title}</span>
        <div className="p-1.5 bg-white/5 rounded-lg"><Icon className="w-4 h-4 text-secondary" /></div>
      </div>
      <div className={`text-2xl font-bold ${valueClass}`}>{value}</div>
    </div>
  );
}
