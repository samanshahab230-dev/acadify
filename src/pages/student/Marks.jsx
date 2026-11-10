import { useEffect, useState } from 'react';
import { TrendingUp, BookOpen, Award } from 'lucide-react';
import api from '../../services/api';
import { SkeletonCard } from '../../components/Skeleton';

const GRADE_COLOR = { 'A+': 'text-emerald-400', A: 'text-emerald-400', 'A-': 'text-emerald-400', 'B+': 'text-blue-400', B: 'text-blue-400', 'B-': 'text-blue-400', 'C+': 'text-yellow-400', C: 'text-yellow-400', 'C-': 'text-yellow-400', D: 'text-orange-400', F: 'text-red-500' };
const GRADE_BG = { 'A+': 'bg-emerald-500/10', A: 'bg-emerald-500/10', 'A-': 'bg-emerald-500/10', 'B+': 'bg-blue-500/10', B: 'bg-blue-500/10', 'B-': 'bg-blue-500/10', 'C+': 'bg-yellow-500/10', C: 'bg-yellow-500/10', 'C-': 'bg-yellow-500/10', D: 'bg-orange-500/10', F: 'bg-red-500/10' };

export default function StudentMarks() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/student/marks').then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="space-y-6"><SkeletonCard lines={2} /><SkeletonCard lines={5} /></div>;
  if (!data) return <div className="text-red-400 p-8">Error loading marks.</div>;

  const { courses_marks, avg_percentage, total_courses, marked_courses } = data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="glass-card p-6 border-l-4 border-l-blue-500">
        <h2 className="text-2xl font-bold">Marks & Performance</h2>
        <p className="text-secondary mt-1">Course-wise marks entered by your teachers.</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold">{total_courses}</div>
          <div className="text-xs text-secondary mt-1">Total Courses</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className="text-2xl font-bold text-cyan-400">{marked_courses}</div>
          <div className="text-xs text-secondary mt-1">Marks Entered</div>
        </div>
        <div className="glass-card p-4 text-center">
          <div className={`text-2xl font-bold ${avg_percentage != null ? (avg_percentage >= 75 ? 'text-emerald-400' : avg_percentage >= 50 ? 'text-yellow-400' : 'text-red-400') : 'text-secondary'}`}>
            {avg_percentage != null ? `${avg_percentage}%` : '—'}
          </div>
          <div className="text-xs text-secondary mt-1">Average</div>
        </div>
      </div>

      {/* Course Cards */}
      {courses_marks?.length ? (
        <div className="space-y-4">
          {courses_marks.map((c, i) => (
            <div key={i} className="glass-card p-5">
              <div className="flex flex-wrap justify-between items-start gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-indigo-400 shrink-0" />
                  <div>
                    <h4 className="font-semibold">{c.subject}</h4>
                    <p className="text-xs text-secondary">{c.class_name}{c.teacher_name ? ` · ${c.teacher_name}` : ''}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {c.grade && (
                    <span className={`text-lg font-bold px-3 py-1 rounded-lg ${GRADE_COLOR[c.grade] || 'text-white'} ${GRADE_BG[c.grade] || 'bg-white/10'}`}>
                      {c.grade}
                    </span>
                  )}
                  {c.percentage != null && (
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${c.percentage >= 75 ? 'text-emerald-400' : c.percentage >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                        {c.percentage}%
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {c.mid_marks != null ? (
                <>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
                    <MarkCell label="Mid Marks" value={c.mid_marks} />
                    <MarkCell label="Final Marks" value={c.final_marks} />
                    <MarkCell label="Obtained" value={c.obtained_marks} highlight />
                    <MarkCell label="Total" value={c.total_marks} />
                  </div>
                  {c.percentage != null && (
                    <div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full transition-all ${c.percentage >= 75 ? 'bg-emerald-400' : c.percentage >= 50 ? 'bg-yellow-400' : 'bg-red-400'}`}
                          style={{ width: `${Math.min(100, c.percentage)}%` }} />
                      </div>
                      {c.percentage < 50 && <p className="text-xs text-red-400 mt-1">⚠ Below passing marks</p>}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-secondary italic">Marks not entered yet by teacher.</p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="glass-card p-10 text-center text-secondary border border-dashed border-white/10">
          <Award className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p>No marks recorded yet. Your teacher will enter marks after assessments.</p>
        </div>
      )}
    </div>
  );
}

function MarkCell({ label, value, highlight }) {
  return (
    <div className={`rounded-xl p-3 text-center border ${highlight ? 'bg-indigo-500/10 border-indigo-500/20' : 'bg-white/5 border-white/5'}`}>
      <div className={`text-xl font-bold ${highlight ? 'text-indigo-300' : ''}`}>{value ?? '—'}</div>
      <div className="text-xs text-secondary mt-0.5">{label}</div>
    </div>
  );
}
