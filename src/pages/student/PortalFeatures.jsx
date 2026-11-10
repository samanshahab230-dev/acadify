import { useEffect, useState } from 'react';
import { Activity, Bell, BookOpen, Check, Download, FileText, LockKeyhole, RefreshCw, Trash2 } from 'lucide-react';
import api from '../../services/api';

function usePageData(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let active = true;
    api.get(path)
      .then(({ data: response }) => { if (active) setData(response); })
      .catch((err) => { if (active) setError(err.response?.data?.message || 'Could not load this page.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path, refresh]);

  return { data, loading, error, reload: () => { setLoading(true); setError(''); setRefresh((value) => value + 1); } };
}

function PageHeader({ icon: Icon, title, description, action }) {
  return <header className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-5">
    <div className="flex items-start gap-3"><Icon className="mt-1 h-6 w-6 shrink-0 text-cyan-400" /><div><h1 className="text-2xl font-bold">{title}</h1><p className="mt-1 text-secondary">{description}</p></div></div>
    {action}
  </header>;
}

function PageState({ loading, error }) {
  if (loading) return <p className="py-5 text-secondary">Loading...</p>;
  if (error) return <p role="alert" className="py-5 text-red-400">{error}</p>;
  return null;
}

function Field({ label, ...props }) {
  return <label className="block space-y-2 text-sm text-secondary">{label}<input className="glass-input" {...props} /></label>;
}

export function Predictions() {
  const { data, loading, error, reload } = usePageData('/student/predictions');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');

  const runPrediction = async () => {
    setBusy(true);
    setNotice('');
    try {
      const { data: dashboard } = await api.get('/student/dashboard');
      const { data: result } = await api.post(`/api/predict/${dashboard.student._id}`);
      setNotice(`New forecast saved. Risk: ${result.prediction.risk_level}, score ${Number(result.prediction.risk_score).toFixed(1)}.`);
      reload();
    } catch (err) {
      setNotice(err.response?.data?.message || 'Could not run the prediction.');
    } finally {
      setBusy(false);
    }
  };

  const removePrediction = async (id) => {
    if (!window.confirm('Delete this prediction record?')) return;
    await api.post(`/student/predictions/${id}/delete`, {});
    reload();
  };

  return <section className="mx-auto max-w-6xl space-y-6">
    <PageHeader icon={Activity} title="AI Predictions" description="Review your forecast history and run an updated academic risk estimate." action={<button onClick={runPrediction} disabled={busy} className="glass-button inline-flex items-center gap-2 bg-white px-4 py-2 text-black"><RefreshCw className="h-4 w-4" />{busy ? 'Running...' : 'Run prediction'}</button>} />
    <PageState loading={loading} error={error} />
    {notice ? <p role="status" className="text-sm text-cyan-300">{notice}</p> : null}
    {(data?.predictions || []).map((prediction) => <article key={prediction._id} className="border-b border-white/10 py-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div><div className="flex items-center gap-3"><h2 className="text-lg font-semibold">{prediction.risk_level || 'Forecast'}</h2><span className="text-sm text-secondary">Risk score {Number(prediction.risk_score || 0).toFixed(1)}</span></div><p className="mt-1 text-sm text-secondary">{prediction.predicted_at || prediction.created_at || prediction.timestamp || 'Prediction record'}</p></div>
        <button title="Delete prediction" aria-label="Delete prediction" onClick={() => removePrediction(prediction._id)} className="p-2 text-secondary hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
      </div>
      {prediction.performance_forecast ? <p className="mt-3 text-sm">Forecast: {prediction.performance_forecast.grade_tier || prediction.performance_forecast}</p> : null}
      {prediction.recommendations?.length ? <ul className="mt-3 space-y-1 text-sm text-secondary">{prediction.recommendations.map((item, index) => <li key={index}>• {item}</li>)}</ul> : null}
    </article>)}
    {!loading && !(data?.predictions || []).length ? <p className="py-8 text-center text-secondary">No prediction history yet. Run a prediction to get started.</p> : null}
  </section>;
}

export function Notifications() {
  const { data, loading, error } = usePageData('/student/notifications');
  return <section className="mx-auto max-w-4xl space-y-6">
    <PageHeader icon={Bell} title="Alerts & Messages" description="Updates and messages related to your student account." />
    <PageState loading={loading} error={error} />
    {(data?.notifications || []).map((notification) => <article key={notification._id} className="flex gap-4 border-b border-white/10 py-5">
      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-cyan-400" />
      <div><p>{notification.message}</p><p className="mt-2 text-xs text-secondary">{notification.created_at || notification.timestamp || ''}</p></div>
    </article>)}
    {!loading && !(data?.notifications || []).length ? <p className="py-8 text-center text-secondary">You’re all caught up.</p> : null}
  </section>;
}

export function Leaderboard() {
  const { data, loading, error } = usePageData('/student/leaderboard');
  return <section className="mx-auto max-w-5xl space-y-6">
    <PageHeader icon={Medal} title="Department Leaderboard" description="Academic standing among students in your department." />
    <PageState loading={loading} error={error} />
    {data?.my_rank ? <p className="text-sm text-secondary">Your current position: <strong className="text-white">#{data.my_rank}</strong></p> : null}
    {(data?.board || []).length ? <div className="overflow-x-auto border-y border-white/10"><table className="w-full min-w-max text-left text-sm"><thead className="border-b border-white/10 text-xs uppercase text-secondary"><tr><th className="py-3">Rank</th><th>Name</th><th>Roll number</th><th>GPA</th><th>Attendance</th><th>Risk</th></tr></thead><tbody>{data.board.map((row) => <tr key={row.roll_no} className={`border-b border-white/5 ${row.is_me ? 'bg-cyan-400/5' : ''}`}><td className="py-3 font-semibold">#{row.rank}</td><td>{row.name}{row.is_me ? ' (you)' : ''}</td><td className="text-secondary">{row.roll_no}</td><td>{Number(row.gpa || 0).toFixed(2)}</td><td>{Number(row.attendance_pct || 0).toFixed(1)}%</td><td className="text-secondary">{row.risk_level}</td></tr>)}</tbody></table></div> : null}
  </section>;
}

export function GpaSimulator() {
  const { data, loading, error } = usePageData('/student/gpa-simulator');
  const [result, setResult] = useState(null);
  const [grades, setGrades] = useState({});
  const [credits, setCredits] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const subjects = data?.subjects || [];

  const simulate = async (event) => {
    event.preventDefault();
    const gradedSubjects = subjects.filter(({ subject }) => grades[subject] !== undefined && grades[subject] !== '');
    if (!gradedSubjects.length) {
      setSubmitError('Enter a grade for at least one subject to calculate an estimate.');
      setResult(null);
      return;
    }

    const payload = { action: 'simulate' };
    gradedSubjects.forEach(({ subject }) => {
      payload[`grade_${subject}`] = grades[subject];
      payload[`credit_${subject}`] = credits[subject] || '3';
    });
    setSubmitting(true);
    setSubmitError('');
    setResult(null);
    try {
      const { data: response } = await api.post('/student/gpa-simulator', payload);
      if (!response.result) throw new Error('The server did not return a GPA estimate. Check the entered grades and credits.');
      setResult(response.result);
    } catch (err) {
      setSubmitError(err.response?.data?.message || err.message || 'Could not calculate the GPA estimate.');
    } finally {
      setSubmitting(false);
    }
  };

  return <section className="mx-auto max-w-4xl space-y-6">
    <PageHeader icon={Calculator} title="GPA Simulator" description="Estimate a term GPA using hypothetical grades and course credits." />
    <PageState loading={loading} error={error} />
    {!loading && subjects.length ? <form onSubmit={simulate} className="space-y-3">{subjects.map(({ subject }) => <div key={subject} className="grid grid-cols-[1fr_110px_110px] items-end gap-3 border-b border-white/10 py-3"><label className="pb-3">{subject}</label><label className="text-xs text-secondary">Grade (0–4)<input type="number" min="0" max="4" step="0.01" className="glass-input mt-2" value={grades[subject] ?? ''} onChange={(event) => setGrades({ ...grades, [subject]: event.target.value })} /></label><label className="text-xs text-secondary">Credits<input type="number" min="1" max="10" step="1" className="glass-input mt-2" value={credits[subject] ?? '3'} onChange={(event) => setCredits({ ...credits, [subject]: event.target.value })} /></label></div>)}<button disabled={submitting} className="glass-button bg-white px-5 py-3 text-black disabled:opacity-50">{submitting ? 'Calculating...' : 'Calculate estimate'}</button></form> : null}
    {!loading && !subjects.length ? <p className="text-secondary">No subjects are available for this semester.</p> : null}
    {submitError ? <p role="alert" className="text-sm text-red-300">{submitError}</p> : null}
    {result ? <div aria-live="polite" className="border-l-2 border-cyan-400 py-3 pl-5"><p className="text-sm text-secondary">Simulated GPA</p><p className="text-4xl font-semibold">{Number(result.simulated_gpa).toFixed(2)}</p><p className="mt-2 text-sm text-secondary">{result.improvement >= 0 ? '+' : ''}{result.improvement} vs. current GPA across {result.total_credits} credits</p></div> : null}
  </section>;
}

export function Resources() {
  const { data, loading, error } = usePageData('/student/resources');
  const resourceItems = [
    ['Khan Academy', 'Free lessons and practice across mathematics, science, and computing.', 'https://www.khanacademy.org/'],
    ['MIT OpenCourseWare', 'Lecture notes, assignments, and course materials from MIT.', 'https://ocw.mit.edu/'],
    ['OpenStax', 'Peer-reviewed, openly licensed college textbooks.', 'https://openstax.org/'],
    ['Google Scholar', 'Search scholarly literature and academic publications.', 'https://scholar.google.com/'],
  ];
  return <section className="mx-auto max-w-5xl space-y-6">
    <PageHeader icon={BookOpen} title="Study Resources" description="Reference materials for your subjects and independent study." />
    <PageState loading={loading} error={error} />
    {data?.subjects?.length ? <p className="text-sm text-secondary">Current subjects: {data.subjects.map((item) => item.subject).join(' · ')}</p> : null}
    <div className="divide-y divide-white/10 border-y border-white/10">{resourceItems.map(([title, description, href]) => <a key={title} href={href} target="_blank" rel="noreferrer" className="flex items-center justify-between gap-4 py-5 hover:text-cyan-300"><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-secondary">{description}</p></div><Download className="h-4 w-4 shrink-0" /></a>)}</div>
  </section>;
}

function SubjectDropdown({ subjects, value, onChange }) {
  const [open, setOpen] = useState(false);
  const items = subjects.map(s => typeof s === 'string' ? s : s.subject);
  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <button type="button" onClick={() => setOpen(!open)}
        style={{ width: '100%', padding: '12px 16px', borderRadius: '16px', border: '1px solid rgba(20,83,45,0.15)', fontSize: '14px', color: '#111827', backgroundColor: '#ffffff', outline: 'none', textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ color: '#111827' }}>{value || 'Select subject'}</span>
        <span style={{ color: '#111827' }}>▾</span>
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#ffffff', border: '1px solid rgba(20,83,45,0.15)', borderRadius: '12px', zIndex: 50, marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          {items.map((item) => (
            <div key={item} onClick={() => { onChange(item); setOpen(false); }}
              style={{ padding: '10px 16px', fontSize: '14px', color: '#111827', backgroundColor: value === item ? '#f0fdf4' : '#ffffff', cursor: 'pointer' }}
              onMouseEnter={e => e.currentTarget.style.backgroundColor = '#f0fdf4'}
              onMouseLeave={e => e.currentTarget.style.backgroundColor = value === item ? '#f0fdf4' : '#ffffff'}>
              {item}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function StudentNotes() {
  const { data, loading, error, reload } = usePageData('/student/notes');
  const [activeSubject, setActiveSubject] = useState('');
  const [drafts, setDrafts] = useState({});
  const [notice, setNotice] = useState('');
  const subject = activeSubject || data?.active_subject || (typeof data?.subjects?.[0] === 'string' ? data?.subjects?.[0] : data?.subjects?.[0]?.subject) || '';
  const savedNote = data?.all_notes?.find((note) => note.subject === subject) || data?.active_note;
  const content = Object.hasOwn(drafts, subject) ? drafts[subject] : savedNote?.content || '';

  const save = async (event) => {
    event.preventDefault();
    await api.post('/student/notes', { action: 'save', subject, content });
    setDrafts({ ...drafts, [subject]: content });
    setNotice('Note saved.');
    reload();
  };

  const remove = async () => {
    await api.post('/student/notes', { action: 'delete', subject });
    setDrafts({ ...drafts, [subject]: '' });
    setNotice('Note deleted.');
    reload();
  };

  return <section className="mx-auto max-w-4xl space-y-6">
    <PageHeader icon={FileText} title="Quick Notes" description="Keep a separate working note for each subject." />
    <PageState loading={loading} error={error} />
    {!loading && data?.subjects?.length ? <form onSubmit={save} className="space-y-4"><label className="block space-y-2 text-sm text-secondary">Subject<SubjectDropdown subjects={data.subjects} value={subject} onChange={setActiveSubject} /></label><label className="block space-y-2 text-sm text-secondary">Notes<textarea className="glass-input min-h-64 resize-y" value={content} onChange={(event) => setDrafts({ ...drafts, [subject]: event.target.value })} placeholder="Write a reminder, concept, or question..." /></label><div className="flex flex-wrap items-center gap-3"><button className="glass-button inline-flex items-center gap-2 bg-white px-4 py-3 text-black"><Check className="h-4 w-4" />Save note</button><button type="button" onClick={remove} className="glass-button inline-flex items-center gap-2 px-4 py-3 text-red-300"><Trash2 className="h-4 w-4" />Delete note</button>{notice ? <span role="status" className="text-sm text-cyan-300">{notice}</span> : null}</div></form> : null}
    {!loading && !data?.subjects?.length ? <p className="text-secondary">No course subjects are available.</p> : null}
  </section>;
}

export function CampusPass() {
  const { data, loading, error, reload } = usePageData('/student/pass');
  const [busy, setBusy] = useState(false);
  const student = data?.student;
  const applied = student?.campus_pass_status === 'APPROVED';

  const apply = async () => {
    setBusy(true);
    try { await api.post('/student/pass', { action: 'apply' }); reload(); }
    finally { setBusy(false); }
  };

  return <section className="mx-auto max-w-4xl space-y-6">
    <PageHeader icon={Award} title="Campus Pass" description="Apply for and view your student campus pass." />
    <PageState loading={loading} error={error} />
    {student ? <div className="space-y-5">{applied ? <article id="campus-pass" className="border-2 border-cyan-400/40 bg-cyan-400/5 p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-cyan-300">EDU · Student Access</p><h2 className="mt-5 text-2xl font-bold">{student.name || student.user?.name}</h2><p className="mt-1 text-secondary">{student.roll_no} · {student.department}</p></div><Award className="h-8 w-8 text-cyan-300" /></div><div className="mt-8 grid grid-cols-2 gap-4 border-t border-white/10 pt-4 text-sm"><div><div className="text-secondary">Semester</div><div className="mt-1">{student.semester}</div></div><div><div className="text-secondary">Valid session</div><div className="mt-1">{student.pass_issued_at || 'Current academic year'}</div></div></div></article> : <div className="border-y border-white/10 py-8"><p className="text-secondary">Your campus pass has not been issued.</p><button onClick={apply} disabled={busy} className="glass-button mt-5 bg-white px-5 py-3 text-black">{busy ? 'Applying...' : 'Apply for campus pass'}</button></div>}{applied ? <button onClick={() => window.print()} className="glass-button inline-flex items-center gap-2 px-4 py-2"><Download className="h-4 w-4" />Print / save pass</button> : null}</div> : null}
  </section>;
}

export function StudentSettings() {
  const { loading, error } = usePageData('/student/settings');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const updatePassword = async (event) => {
    event.preventDefault();
    setBusy(true);
    setMessage('');
    try {
      const { data: response } = await api.post('/student/settings', { action: 'password', current_password: currentPassword, new_password: newPassword });
      const [category, flashMessage] = response._flashes?.[0] || [];
      setMessage(flashMessage || 'Password updated.');
      if (category === 'success') {
        setCurrentPassword('');
        setNewPassword('');
      }
    } catch (err) {
      setMessage(err.response?.data?.message || 'Password could not be updated.');
    } finally { setBusy(false); }
  };

  return <section className="mx-auto max-w-3xl space-y-6">
    <PageHeader icon={LockKeyhole} title="Account Settings" description="Manage your sign-in credentials." />
    <PageState loading={loading} error={error} />
    {!loading ? <form onSubmit={updatePassword} className="max-w-xl space-y-4"><Field label="Current password" type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} /><Field label="New password" type="password" autoComplete="new-password" minLength="6" required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /><button disabled={busy} className="glass-button bg-white px-5 py-3 text-black">{busy ? 'Updating...' : 'Update password'}</button>{message ? <p role="status" className="text-sm text-cyan-300">{message}</p> : null}</form> : null}
  </section>;
}