import { useEffect, useState } from 'react';
import { BookOpen, TrendingUp, CheckSquare, Award } from 'lucide-react';
import api from '../../services/api';
import { SkeletonCard } from '../../components/Skeleton';

const GRADE_COLOR = { 'A+': 'text-emerald-400', A: 'text-emerald-400', 'A-': 'text-emerald-400', 'B+': 'text-blue-400', B: 'text-blue-400', 'B-': 'text-blue-400', 'C+': 'text-yellow-400', C: 'text-yellow-400', 'C-': 'text-yellow-400', D: 'text-orange-400', F: 'text-red-400' };

export default function Academics() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/academics').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-6"><SkeletonCard lines={2} /><SkeletonCard lines={4} /></div>;
  if (!data) return <div className="text-red-400 p-8">Error loading academics.</div>;

  const { student, courses } = data;
  const marked = courses.filter(c => c.percentage != null);
  const avgPct = marked.length ? Math.round(marked.reduce((s, c) => s + c.percentage, 0) / marked.length) : null;
  const attAvg = courses.length ? Math.round(courses.reduce((s, c) => s + c.attendance_pct, 0) / courses.length) : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="glass-card p-6 border-l-4 border-l-indigo-500">
        <h2 className="text-2xl font-bold">Academics</h2>
        <p className="text-secondary mt-1">{student.department}{student.class_name ? ` · ${student.class_name}` : ''}</p>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <SummaryBox label="Courses" value={courses.length} color="text-white" />
        <SummaryBox label="Avg Marks" value={avgPct != null ? `${avgPct}%` : '—'} color={avgPct != null && avgPct < 50 ? 'text-red-400' : 'text-emerald-400'} />
        <SummaryBox label="Avg Attendance" value={attAvg != null ? `${attAvg}%` : '—'} color={attAvg != null && attAvg < 75 ? 'text-red-400' : 'text-emerald-400'} />
        <SummaryBox label="Risk" value={student.risk_level || 'LOW'} color={student.risk_level === 'HIGH' ? 'text-red-400' : student.risk_level === 'MEDIUM' ? 'text-yellow-400' : 'text-emerald-400'} />
      </div>

      {/* Course Cards */}
      {courses.length ? (
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-widest text-secondary px-1">Course-wise Performance</h3>
          {courses.map((c, i) => (
            <div key={i} className="glass-card p-5">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    <h4 className="font-semibold text-lg">{c.subject}</h4>
                    {c.grade && <span className={`text-sm font-bold px-2 py-0.5 bg-white/10 rounded ${GRADE_COLOR[c.grade] || 'text-white'}`}>{c.grade}</span>}
                  </div>
                  <p className="text-xs text-secondary mt-1">{c.class_name}{c.teacher_name ? ` · ${c.teacher_name}` : ''}</p>
                </div>
                {c.percentage != null && (
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${c.percentage >= 75 ? 'text-emerald-400' : c.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{c.percentage}%</p>
                    <p className="text-xs text-secondary">Overall</p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <MarkBox label="Mid Marks" value={c.mid_marks ?? '—'} />
                <MarkBox label="Final Marks" value={c.final_marks ?? '—'} />
                <MarkBox label="Obtained" value={c.obtained_marks ?? '—'} />
                <MarkBox label="Total" value={c.total_marks ?? '—'} />
              </div>

              {/* Attendance bar */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="flex items-center gap-1 text-secondary"><CheckSquare className="w-3 h-3" /> Attendance</span>
                  <span className={c.attendance_pct < 75 ? 'text-red-400 font-semibold' : 'text-emerald-400'}>
                    {c.present}/{c.total_classes} classes · {c.attendance_pct}%
                  </span>
                </div>
                <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${c.attendance_pct < 75 ? 'bg-red-400' : 'bg-emerald-400'}`}
                    style={{ width: `${c.attendance_pct}%` }} />
                </div>
                {c.attendance_pct < 75 && (
                  <p className="text-xs text-red-400 mt-1">⚠ Below 75% — attendance shortage</p>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-10 text-center text-secondary border border-dashed border-white/10">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No courses enrolled yet. Admin will enroll you in courses.</p>
        </div>
      )}
    </div>
  );
}

function SummaryBox({ label, value, color }) {
  return (
    <div className="glass-card p-4 text-center">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-xs text-secondary mt-1">{label}</div>
    </div>
  );
}

function MarkBox({ label, value }) {
  return (
    <div className="bg-white/5 rounded-xl p-3 text-center border border-white/5">
      <div className="text-lg font-semibold">{value}</div>
      <div className="text-xs text-secondary mt-0.5">{label}</div>
    </div>
  );
}
