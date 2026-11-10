import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Lock, Mail, ArrowRight } from 'lucide-react';
import api from '../../services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const response = await api.post('/login', { email, password });
      const user = response.data?.user;
      const roleRoutes = {
        admin: '/admin/dashboard',
        teacher: '/teacher/dashboard',
        parent: '/parent/dashboard',
        student: '/student/dashboard',
      };
      localStorage.setItem('edu_user', JSON.stringify(user));
      // Prefetch dashboard data in background so first tab loads instantly
      const prefetchMap = {
        student: ['/student/dashboard', '/student/academics', '/student/attendance'],
        teacher: ['/teacher/dashboard', '/teacher/at-risk'],
        admin: ['/admin/dashboard', '/api/ai/status', '/admin/students', '/admin/predictions', '/admin/counseling', '/admin/interventions'],
        parent: ['/parent/dashboard'],
      };
      (prefetchMap[user?.role] || []).forEach(url => api.get(url).catch(() => {}));
      window.location.href = roleRoutes[user?.role] || '/student/dashboard';
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">

      {/* Left — Image Panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">

        {/* Top image */}
        <img
          src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1200&auto=format&fit=crop"
          alt="Campus"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-emerald-950/95 via-emerald-950/50 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-[0_4px_14px_rgba(22,163,74,0.4)]">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" />
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-xl font-bold text-white">Acadify</span>
          </Link>

          <div>
            <h2 className="text-4xl font-black text-white leading-tight mb-4">
              Empowering institutions with intelligent education.
            </h2>
            <p className="text-green-200/80 text-sm leading-relaxed mb-8">
              Biometric attendance, predictive analytics, and student risk monitoring — all in one platform.
            </p>
            <div className="grid grid-cols-2 gap-3">
              {[['99.3%', 'Recognition accuracy'], ['1.2s', 'Verification speed'], ['24/7', 'Monitoring'], ['10k+', 'Risk predictions']].map(([v, l]) => (
                <div key={l} className="rounded-2xl bg-white/10 border border-white/20 p-4 backdrop-blur-sm">
                  <div className="text-2xl font-black text-emerald-300">{v}</div>
                  <div className="text-xs text-green-200/70 mt-1">{l}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-green-300/50 text-xs">© 2026 Acadify. All rights reserved.</p>
        </div>
      </div>

      {/* Right — Form Panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <Link to="/" className="flex lg:hidden items-center gap-2.5 mb-8 justify-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" />
                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <span className="text-lg font-bold text-gray-900">Acadify</span>
          </Link>

          <div className="mb-8">
            <h1 className="text-3xl font-black text-gray-900 mb-2">Welcome back</h1>
            <p className="text-gray-400 text-sm">Sign in to your institutional portal</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-xl mb-6 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-600">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="you@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-600">Password</label>
                <Link to="/forgot-password" className="text-xs text-emerald-600 hover:text-emerald-700 transition-colors">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 pl-11 text-sm text-gray-900 placeholder-gray-400 focus:border-emerald-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 py-3.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(22,163,74,0.35)] hover:shadow-[0_4px_22px_rgba(22,163,74,0.5)] hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
            >
              {loading ? 'Signing in...' : <><span>Sign In</span><ArrowRight className="w-4 h-4" /></>}
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-gray-400">
            Access is managed by your institution administrator.
          </p>
        </div>
      </div>
    </div>
  );
}
