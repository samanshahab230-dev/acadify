import { useEffect, useState } from 'react';
import { User, Phone, Save, ShieldCheck, BookOpen, Mail, Hash } from 'lucide-react';
import api from '../../services/api';

export default function Profile() {
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ phone: '', bio: '' });

  const fetchData = async () => {
    try {
      const { data } = await api.get('/student/profile');
      setStudent(data.student);
      setForm({ phone: data.student.phone || '', bio: data.student.bio || '' });
    } catch { } finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); setMsg('');
    try {
      await api.post('/student/profile', form);
      setMsg('Profile updated successfully.');
      fetchData();
    } catch { setMsg('Failed to update profile.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-secondary">Loading profile...</div>;
  if (!student) return <div className="p-8 text-red-400">Error loading profile.</div>;

  const riskColor = student.risk_level === 'HIGH' ? 'text-red-400 bg-red-500/10 border-red-500/20' : student.risk_level === 'MEDIUM' ? 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' : 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="glass-card p-6 border-l-4 border-l-cyan-500">
        <h2 className="text-2xl font-bold">My Profile</h2>
        <p className="text-secondary mt-1">Your academic information and account details.</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left: Info Card */}
        <div className="space-y-5">
          <div className="glass-card p-6 text-center">
            <div className="w-20 h-20 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-4 border border-cyan-500/30">
              <User className="w-9 h-9" />
            </div>
            <h3 className="font-bold text-xl">{student.user?.name || 'Student'}</h3>
            <p className="text-secondary text-sm mt-1">{student.roll_no}</p>
            <div className={`inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-xs font-semibold border ${riskColor}`}>
              <ShieldCheck className="w-3 h-3" /> {student.risk_level || 'LOW'} Risk
            </div>
          </div>

          {/* Info Rows */}
          <div className="glass-card p-5 space-y-3">
            <InfoRow icon={Mail} label="Email" value={student.user?.email || '—'} />
            <InfoRow icon={Hash} label="Roll No" value={student.roll_no || '—'} />
            <InfoRow icon={BookOpen} label="Department" value={student.department || '—'} />
            <InfoRow icon={BookOpen} label="Class" value={student.class_name || '—'} />
          </div>

          {/* Attendance */}
          <div className="glass-card p-5">
            <p className="text-xs text-secondary uppercase mb-3">Overall Attendance</p>
            <div className="flex justify-between text-sm mb-1.5">
              <span>Attendance</span>
              <span className={student.attendance_pct < 75 ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {student.attendance_pct?.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div className={`h-full rounded-full ${student.attendance_pct < 75 ? 'bg-red-400' : 'bg-emerald-400'}`}
                style={{ width: `${student.attendance_pct}%` }} />
            </div>
          </div>
        </div>

        {/* Right: Edit Form + Enrolled Courses */}
        <div className="md:col-span-2 space-y-5">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-lg mb-5 border-b border-white/10 pb-3">Edit Information</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <label className="block space-y-2 text-sm text-secondary">
                Phone Number
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3 top-3.5 text-secondary" />
                  <input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="glass-input pl-10" placeholder="e.g. 03001234567" />
                </div>
              </label>
              <label className="block space-y-2 text-sm text-secondary">
                Bio / About
                <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })}
                  className="glass-input min-h-24 resize-none" placeholder="Tell us about your academic interests..." />
              </label>
              {msg && <p className="text-sm text-emerald-400">{msg}</p>}
              <button type="submit" disabled={saving}
                className="glass-button bg-white text-black py-2.5 px-5 flex items-center gap-2 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Profile'}
              </button>
            </form>
          </div>

          {/* Enrolled Courses */}
          {student.enrolled_courses?.length > 0 && (
            <div className="glass-card p-6">
              <h3 className="font-semibold mb-4 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" /> Enrolled Courses ({student.enrolled_courses.length})
              </h3>
              <div className="grid sm:grid-cols-2 gap-3">
                {student.enrolled_courses.map((c, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-3">
                    <p className="font-medium text-sm">{c.subject}</p>
                    <p className="text-xs text-secondary mt-0.5">{c.class_name}{c.teacher_name ? ` · ${c.teacher_name}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <Icon className="w-4 h-4 text-secondary shrink-0" />
      <span className="text-secondary w-20 shrink-0">{label}</span>
      <span className="font-medium truncate">{value}</span>
    </div>
  );
}
