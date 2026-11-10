import { useEffect, useState } from 'react';
import { ShieldAlert, Clock, Send } from 'lucide-react';
import api from '../../services/api';

export default function Counseling() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const [form, setForm] = useState({
    subject: '',
    message: '',
    urgency: 'normal'
  });

  const fetchData = async () => {
    try {
      const response = await api.get('/student/counseling');
      setData(response.data);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      // If we had a file to upload, we'd use FormData. Here we just use JSON for simplicity since our backend handles it.
      await api.post('/student/counseling', form);
      setForm({ subject: '', message: '', urgency: 'normal' });
      fetchData();
    } catch {
      alert('Failed to submit request');
    }
  };

  if (loading) return <div className="p-8 text-secondary">Loading support requests...</div>;

  const { requests } = data;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="glass-card p-6 border-l-4 border-l-orange-500 flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Support & Counseling</h2>
          <p className="text-secondary mt-1">Request academic or personal support confidentially.</p>
        </div>
        <ShieldAlert className="w-10 h-10 text-orange-400 opacity-50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-card p-6">
          <h3 className="font-semibold mb-4 text-lg">New Support Request</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-sm text-secondary">Subject / Topic</label>
              <input type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} className="glass-input" placeholder="e.g. Struggling with Calculus" required />
            </div>
            <div className="space-y-1">
              <label className="text-sm text-secondary">Urgency Level</label>
              <select value={form.urgency} onChange={e => setForm({...form, urgency: e.target.value})} className="glass-input">
                <option value="normal">Normal / General Inquiry</option>
                <option value="high">High / Need immediate help</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-sm text-secondary">Message</label>
              <textarea 
                value={form.message} 
                onChange={e => setForm({...form, message: e.target.value})} 
                className="glass-input min-h-30 resize-y"
                placeholder="Describe what you need help with..." 
                required 
              />
            </div>
            <button type="submit" className="glass-button w-full bg-white text-black py-3 flex items-center justify-center gap-2">
              <Send className="w-4 h-4"/> Submit Request
            </button>
          </form>
        </div>
        
        <div className="space-y-4">
          <h3 className="font-semibold px-2">Previous Requests</h3>
          {requests?.length > 0 ? requests.map(req => (
            <div key={req._id} className="glass-card p-5">
              <div className="flex justify-between items-start mb-3">
                <h4 className="font-semibold">{req.subject}</h4>
                <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${req.status === 'resolved' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                  {req.status}
                </span>
              </div>
              <p className="text-sm text-white/70 mb-4">{req.message}</p>
              {(req.evidence_filename || req.self_check_report) && <div className="mb-4 flex flex-wrap gap-4 text-sm">
                {req.evidence_filename && <a className="text-cyan-300 hover:text-white" href={`${api.defaults.baseURL}/face/support-evidence/${req._id}`}>Download attached evidence</a>}
                {req.self_check_report && <a className="text-cyan-300 hover:text-white" href={`${api.defaults.baseURL}/face/self-check-report/${req._id}`}>Download self-check report</a>}
              </div>}
              <div className="flex justify-between items-center text-xs text-secondary border-t border-white/10 pt-3">
                <span className="flex items-center gap-1"><Clock className="w-4 h-4"/> {req.created_at}</span>
                <span className="uppercase">{req.urgency} Priority</span>
              </div>
            </div>
          )) : (
            <div className="glass-card p-8 text-center text-secondary border-dashed border-white/10">No support requests history.</div>
          )}
        </div>
      </div>
    </div>
  );
}
