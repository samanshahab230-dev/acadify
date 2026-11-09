import { useEffect, useRef, useState } from 'react';
import { Camera, CheckCircle, XCircle } from 'lucide-react';
import api from '../../services/api';

export default function FaceRegister() {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const [status, setStatus] = useState('initializing');
  const [message, setMessage] = useState('Preparing AI face models...');
  const [modelReady, setModelReady] = useState(false);
  const [stream, setStream] = useState(null);
  const [role, setRole] = useState('student');
  const [faceCount, setFaceCount] = useState(0);

  // cascade state
  const [allDepts, setAllDepts] = useState([]);
  const [selDept, setSelDept] = useState('');
  const [classes, setClasses] = useState([]);
  const [selClass, setSelClass] = useState('');
  const [students, setStudents] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');

  useEffect(() => {
    const init = async () => {
      try {
        const { data: session } = await api.get('/api/session');
        const userRole = session.user?.role || 'student';
        setRole(userRole);
        if (userRole === 'admin') {
          const { data } = await api.get('/admin/api/departments');
          setAllDepts(data.departments || []);
        } else {
          const { data: page } = await api.get('/face/register');
          setFaceCount(page.face_count || 0);
        }
      } catch (e) { console.error(e); }
    };
    init();
    api.get('/api/face/status')
      .then(() => {
        setModelReady(true);
        setStatus(s => s === 'initializing' ? 'ready' : s);
        setMessage(m => m === 'Preparing AI face models...' ? 'Select a student and capture face.' : m);
      })
      .catch(() => { setStatus('error'); setMessage('Face recognition models unavailable.'); });
    startCamera();
    return () => streamRef.current?.getTracks().forEach(t => t.stop());
  }, []);

  // dept → classes
  useEffect(() => {
    if (!selDept) { setClasses([]); setSelClass(''); setStudents([]); setSelectedStudent(''); return; }
    api.get(`/admin/api/departments/classes?department=${encodeURIComponent(selDept)}`)
      .then(r => setClasses(r.data.classes || []))
      .catch(() => setClasses([]));
  }, [selDept]);

  // class → students (enrolled in any course of this class)
  useEffect(() => {
    if (!selDept || !selClass) { setStudents([]); setSelectedStudent(''); return; }
    api.get(`/api/face/students?department=${encodeURIComponent(selDept)}&class_name=${encodeURIComponent(selClass)}`)
      .then(r => {
        const list = r.data.students || [];
        setStudents(list);
        setSelectedStudent(list[0]?.student_id || '');
      })
      .catch(() => setStudents([]));
  }, [selDept, selClass]);

  async function startCamera() {
    try {
      const ms = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' }
      });
      if (!videoRef.current) { ms.getTracks().forEach(t => t.stop()); return; }
      streamRef.current = ms;
      videoRef.current.srcObject = ms;
      setStream(ms);
    } catch {
      setStatus('error');
      setMessage('Camera access denied or unavailable.');
    }
  }

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setStream(null);
  };

  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    if (!videoRef.current.videoWidth) { setStatus('error'); setMessage('Camera still starting.'); return; }
    setStatus('scanning'); setMessage('Processing face embedding...');
    const canvas = canvasRef.current;
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext('2d').drawImage(videoRef.current, 0, 0);
    const base64Image = canvas.toDataURL('image/jpeg', 0.82);
    try {
      const { data } = await api.post('/api/face/register', {
        image_b64: base64Image,
        ...(role === 'admin' ? { student_id: selectedStudent } : {})
      });
      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Face registered successfully.');
        setFaceCount(data.embedding_count ?? faceCount + 1);
        setStudents(prev => prev.map(s =>
          s.student_id === selectedStudent
            ? { ...s, face_registered: true, embedding_count: (s.embedding_count || 0) + 1 }
            : s
        ));
        setTimeout(() => { setStatus('ready'); setMessage('Capture another angle for better accuracy.'); }, 2000);
      } else {
        setStatus('error'); setMessage(data.error || 'Failed to register face.');
        setTimeout(() => { setStatus('ready'); setMessage('Try again.'); }, 3000);
      }
    } catch (err) {
      setStatus('error'); setMessage(err.response?.data?.error || 'Server error.');
      setTimeout(() => setStatus('ready'), 3000);
    }
  };

  const selectedStudentData = students.find(s => s.student_id === selectedStudent);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-2">{role === 'admin' ? 'Student Face Registration' : 'Biometric Registration'}</h1>
        <p className="text-secondary">Register face for AI-powered attendance.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          {/* Admin cascade selectors */}
          {role === 'admin' && (
            <div className="space-y-3">
              {/* Department */}
              <label className="block space-y-1 text-sm text-secondary">
                Department
                <select value={selDept} onChange={e => setSelDept(e.target.value)} className="glass-input mt-1">
                  <option value="">Select department</option>
                  {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </label>

              {/* Class */}
              <label className="block space-y-1 text-sm text-secondary">
                Class
                <select value={selClass} onChange={e => setSelClass(e.target.value)} className="glass-input mt-1" disabled={!selDept}>
                  <option value="">{selDept ? 'Select class' : 'Select department first'}</option>
                  {classes.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              {/* Student */}
              <label className="block space-y-1 text-sm text-secondary">
                Student
                <select value={selectedStudent} onChange={e => setSelectedStudent(e.target.value)} className="glass-input mt-1" disabled={!selClass}>
                  <option value="">{selClass ? (students.length ? 'Select student' : 'No students in this class') : 'Select class first'}</option>
                  {students.map(s => (
                    <option key={s.student_id} value={s.student_id}>
                      {s.name} · {s.roll_no}{s.face_registered ? ' ✓' : ' (no face)'}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          )}

          {/* Camera */}
          <div className="glass-card overflow-hidden relative aspect-video bg-black/50 flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
            {stream && (
              <div className="absolute inset-0 border-2 border-white/20 pointer-events-none flex items-center justify-center">
                <div className="w-48 h-64 border-2 border-dashed border-cyan-500/50 rounded-full" />
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button onClick={stream ? stopCamera : startCamera} disabled={status === 'scanning'} className="glass-button flex-1 py-3">
              {stream ? 'Stop camera' : 'Start camera'}
            </button>
            <button
              onClick={handleCapture}
              disabled={!modelReady || status === 'scanning' || !stream || (role === 'admin' && !selectedStudent)}
              className="glass-button flex-1 bg-white py-3 text-black disabled:opacity-50"
            >
              {status === 'scanning' ? 'Processing...' : 'Capture face'}
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="glass-card p-6">
            <h3 className="font-semibold text-lg mb-4">Registration Status</h3>
            <div className="text-4xl font-bold mb-2">
              {role === 'admin' ? (selectedStudentData?.embedding_count || 0) : faceCount}
              <span className="text-lg text-secondary font-normal ml-2">Embeddings Saved</span>
            </div>
            {role === 'admin' && selectedStudentData && (
              <p className="text-sm text-secondary mt-1">
                {selectedStudentData.name} · {selectedStudentData.face_registered ? '✓ Face registered' : 'No face yet'}
              </p>
            )}
            <p className="text-sm text-secondary mt-3">Capture 3–5 angles for best accuracy.</p>
          </div>

          <div className={`glass-card p-6 transition-colors ${
            status === 'success' ? 'bg-green-500/10 border-green-500/30' :
            status === 'error' ? 'bg-red-500/10 border-red-500/30' : ''
          }`}>
            <div className="flex items-center gap-3">
              {status === 'success' && <CheckCircle className="w-6 h-6 text-green-400" />}
              {status === 'error' && <XCircle className="w-6 h-6 text-red-400" />}
              {status === 'scanning' && <Camera className="w-6 h-6 text-cyan-400 animate-pulse" />}
              <span className="font-medium">{message}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
