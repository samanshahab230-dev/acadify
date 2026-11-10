import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { User, Lock, Mail, Hash, BookOpen, GraduationCap, ArrowRight } from 'lucide-react';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

export default function Register() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirm_password: '',
    roll_no: '',
    department: '',
    semester: '1'
  });
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/register', formData);
      if (response.data.redirect) {
        navigate(response.data.redirect);
      } else {
        navigate('/student/dashboard');
      }
    } catch (err) {
      // Handle HTML flashes parsed in json or axios errors
      if (err.response?.data?._flashes) {
        const msgs = err.response.data._flashes;
        if (msgs.length > 0) {
           setError(msgs[0][1]);
        }
      } else {
        setError(err.response?.data?.message || 'Registration failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden py-24">
      <Navbar />
      <div className="absolute top-[20%] right-[20%] w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] left-[20%] w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none" />

      <div 
       }
       }
       }
        className="w-full max-w-xl"
      >
        <div className="glass-card p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight mb-2">EDU</h1>
            <p className="text-secondary">Create your student account</p>
          </div>

          {error && (
            <div 
             }
             }
              className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg mb-6 text-sm"
            >
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary ml-1">Full Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                  <input type="text" name="name" value={formData.name} onChange={handleChange} className="glass-input pl-12" placeholder="John Doe" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                  <input type="email" name="email" value={formData.email} onChange={handleChange} className="glass-input pl-12" placeholder="john@example.com" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary ml-1">Roll Number</label>
                <div className="relative">
                  <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                  <input type="text" name="roll_no" value={formData.roll_no} onChange={handleChange} className="glass-input pl-12 uppercase" placeholder="CS-24-001" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary ml-1">Department</label>
                <div className="relative">
                  <BookOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                  <select name="department" value={formData.department} onChange={handleChange} className="glass-input pl-12 appearance-none bg-black text-white" required>
                    <option value="" disabled>Select Dept</option>
                    <option value="Computer Science">Computer Science</option>
                    <option value="Information Technology">Information Technology</option>
                    <option value="Electronics">Electronics</option>
                    <option value="Mechanical">Mechanical</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary ml-1">Semester</label>
                <div className="relative">
                  <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                  <select name="semester" value={formData.semester} onChange={handleChange} className="glass-input pl-12 appearance-none bg-black text-white" required>
                    {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                  <input type="password" name="password" value={formData.password} onChange={handleChange} className="glass-input pl-12" placeholder="••••••••" minLength="6" required />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-secondary ml-1">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                  <input type="password" name="confirm_password" value={formData.confirm_password} onChange={handleChange} className="glass-input pl-12" placeholder="••••••••" minLength="6" required />
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} className="w-full glass-button bg-white text-black hover:bg-white/90 py-3 flex items-center justify-center gap-2 mt-6">
              {loading ? 'Creating Account...' : <><User className="w-4 h-4" /> Register</>}
            </button>
          </form>

          <div className="mt-8 text-center text-sm text-secondary">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:underline transition-all">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
