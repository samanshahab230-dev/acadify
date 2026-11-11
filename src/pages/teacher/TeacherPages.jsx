import AttendanceTab from './tabs/AttendanceTab';
import MarksTab from './tabs/MarksTab';
import VerifyTab from './tabs/VerifyTab';
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import api from '../../services/api';

function useToast() {
  const [toast, setToast] = useState({ msg: '', type: 'success' });
  const show = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast({ msg: '', type: 'success' }), 3500);
  };
  return { toast, show, close: () => setToast({ msg: '' }) };
}

function Toast({ toast, onClose }) {
  if (!toast.msg) return null;
  return (
    <div className={`flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-sm border mb-4 ${
      toast.type === 'error' ? 'bg-red-50 border-red-200 text-red-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700'
    }`}>
      <span>{toast.msg}</span>
      <button onClick={onClose}><X className="w-4 h-4 opacity-60 hover:opacity-100" /></button>
    </div>
  );
}

export function TeacherAttendancePage() {
  const { toast, show, close } = useToast();
  return (
    <div className="max-w-5xl mx-auto space-y-2">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">Attendance</h1>
      <Toast toast={toast} onClose={close} />
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <AttendanceTab onMessage={show} />
      </div>
    </div>
  );
}

export function TeacherMarksPage() {
  const { toast, show, close } = useToast();
  return (
    <div className="max-w-5xl mx-auto space-y-2">
      <h1 className="text-2xl font-bold tracking-tight text-gray-900 mb-4">Marks</h1>
      <Toast toast={toast} onClose={close} />
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        <MarksTab onMessage={show} />
      </div>
    </div>
  );
}

export function TeacherVerifyPage() {
  const { toast, show, close } = useToast();
  const [students, setStudents] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [version, setVersion] = useState(0);

  useEffect(() => {
    api.get('/teacher/dashboard').then(r => {
      const list = r.data.students || [];
      setStudents(list);
      if (list.length && !selectedId) setSelectedId(list[0]._id);
    }).catch(() => {});
  }, [version]);

  const selected = students.find(s => s._id === selectedId);

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Verify Exceptions</h1>
        {students.length > 0 && (
          <select value={selectedId} onChange={e => setSelectedId(e.target.value)} className="field-input w-auto min-w-[220px]">
            {students.map(s => <option key={s._id} value={s._id}>{s.name} — {s.roll_no}</option>)}
          </select>
        )}
      </div>
      <Toast toast={toast} onClose={close} />
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
        {selected
          ? <VerifyTab student={selected} onMessage={show} onReload={() => setVersion(v => v + 1)} />
          : <p className="text-sm text-gray-400 text-center py-8">No students assigned yet.</p>
        }
      </div>
    </div>
  );
}
