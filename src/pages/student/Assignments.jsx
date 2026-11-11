import { useEffect, useState } from 'react';
import { Clock, Book, CheckCircle, Send, Download, Paperclip, RotateCcw } from 'lucide-react';
import api from '../../services/api';

const BASE = api.defaults.baseURL;

export default function Assignments() {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(null);
  const [notes, setNotes] = useState({});
  const [files, setFiles] = useState({});
  const [message, setMessage] = useState('');

  const fetchData = async () => {
    try {
      const { data } = await api.get('/student/assignments');
      setAssignments(data.assignments || []);
    } catch {
      setMessage('Failed to load assignments.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (id) => {
    setSubmitting(id);
    setMessage('');
    try {
      const form = new FormData();
      form.append('action', 'submit');
      form.append('assignment_id', id);
      form.append('submission_note', notes[id] || '');
      if (files[id]) form.append('file', files[id]);
      await api.post('/student/assignments', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setMessage('Assignment submitted successfully!');
      setFiles(f => { const n = { ...f }; delete n[id]; return n; });
      setNotes(n => { const x = { ...n }; delete x[id]; return x; });
      fetchData();
    } catch {
      setMessage('Failed to submit assignment.');
    } finally {
      setSubmitting(null);
    }
  };

  if (loading) return <div className="p-8 text-secondary">Loading assignments...</div>;

  // pending = not submitted OR resubmit allowed
  const pending = assignments.filter(a => a.status !== 'completed' || a.resubmit_allowed);
  const completed = assignments.filter(a => a.status === 'completed' && !a.resubmit_allowed);

  const SubmitForm = ({ a }) => (
    <div className="space-y-2 mt-3">
      {a.resubmit_allowed && (
        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-2 rounded-lg">
          <RotateCcw className="w-3 h-3 shrink-0" />
          Your teacher has allowed you to resubmit this assignment.
        </div>
      )}
      <input
        type="text"
        placeholder="Add a note (optional)..."
        value={notes[a._id] || ''}
        onChange={e => setNotes({ ...notes, [a._id]: e.target.value })}
        className="glass-input w-full text-sm py-2"
      />
      <div className="flex gap-3 items-center">
        <label className="flex items-center gap-2 text-xs text-secondary cursor-pointer flex-1">
          <Paperclip className="w-3 h-3" />
          <span>{files[a._id] ? files[a._id].name : 'Attach file (optional)'}</span>
          <input type="file" className="hidden" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.zip,.txt"
            onChange={e => setFiles({ ...files, [a._id]: e.target.files[0] })} />
        </label>
        <button
          onClick={() => handleSubmit(a._id)}
          disabled={submitting === a._id}
          className="glass-button bg-white text-black px-4 py-2 text-sm flex items-center gap-2 shrink-0"
        >
          <Send className="w-4 h-4" />
          {submitting === a._id ? 'Submitting...' : (a.resubmit_allowed ? 'Resubmit' : 'Submit')}
        </button>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="glass-card p-6 border-l-4 border-l-cyan-500 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Assignments</h2>
          <p className="text-secondary mt-1">Assignments given by your teacher.</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold text-cyan-400">{completed.length}<span className="text-secondary text-lg">/{assignments.length}</span></p>
          <p className="text-xs text-secondary">submitted</p>
        </div>
      </div>

      {message && <p className="text-sm text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-lg">{message}</p>}

      {!assignments.length ? (
        <div className="glass-card p-10 text-center text-secondary border border-dashed border-white/10">
          No assignments yet. Your teacher will assign work here.
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-secondary px-1">Pending ({pending.length})</h3>
              {pending.map(a => (
                <div key={a._id} className={`glass-card p-5 border-l-4 ${a.priority === 'high' ? 'border-l-red-500' : a.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'}`}>
                  <div className="flex flex-wrap justify-between gap-2 mb-1">
                    <div>
                      <h4 className="text-lg font-semibold">{a.title}</h4>
                      <div className="flex flex-wrap gap-4 text-sm text-secondary mt-1">
                        <span className="flex items-center gap-1"><Book className="w-3 h-3" />{a.subject}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />Due: {a.due_date}</span>
                        <span className="capitalize px-2 py-0.5 bg-white/10 rounded text-xs">{a.priority}</span>
                      </div>
                      {a.description && <p className="text-sm text-white/60 mt-2">{a.description}</p>}
                      {a.file_name && (
                        <a href={`${BASE}/teacher/assignments/file/${a.file_path}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-2 text-xs text-cyan-400 hover:underline">
                          <Download className="w-3 h-3" /> {a.file_name}
                        </a>
                      )}
                    </div>
                  </div>
                  <SubmitForm a={a} />
                </div>
              ))}
            </div>
          )}

          {completed.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-secondary px-1">Submitted ({completed.length})</h3>
              {completed.map(a => (
                <div key={a._id} className="glass-card p-4 border-l-4 border-l-emerald-500">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-white">{a.title}</h4>
                      <p className="text-xs text-secondary mt-1">{a.subject} · Submitted {a.submitted_at || '—'}</p>
                      {a.submission_note && <p className="text-xs text-white/50 mt-1">Your note: {a.submission_note}</p>}
                      {a.submission_file_name && (
                        <a href={`${BASE}/student/assignments/file/${a.submission_file_name}`} target="_blank" rel="noreferrer"
                          className="inline-flex items-center gap-1 mt-1 text-xs text-cyan-400 hover:underline">
                          <Paperclip className="w-3 h-3" /> {a.submission_file_name}
                        </a>
                      )}
                      {/* Marks & feedback from teacher */}
                      {a.marks != null && (
                        <div className="mt-2 flex flex-wrap gap-3">
                          <span className="text-xs px-2.5 py-1 rounded-lg bg-blue-500/20 text-blue-300 font-semibold">
                            Marks: {a.marks}
                          </span>
                          {a.feedback && (
                            <span className="text-xs px-2.5 py-1 rounded-lg bg-white/10 text-white/70">
                              Feedback: {a.feedback}
                            </span>
                          )}
                        </div>
                      )}
                      {a.marks == null && (
                        <p className="text-xs text-white/30 mt-1 italic">Marks not given yet.</p>
                      )}
                    </div>
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0 mt-1" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
