import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Lock, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import Navbar from '../../components/Navbar';

export default function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = email, 2 = reset
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/forgot-password', { email });
      if (data.token) {
        setToken(data.token);
        setStep(2);
      } else {
        setError('No account found with this email address.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await api.post('/reset-password', { token, password });
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden pt-20">
      <Navbar />
      <div className="absolute top-[20%] left-[20%] w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[20%] right-[20%] w-96 h-96 bg-white/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-md">
        <div className="glass-card p-8">

          {/* Success State */}
          {done ? (
            <div className="text-center space-y-4 py-4">
              <div className="w-14 h-14 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto">
                <CheckCircle className="w-7 h-7 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold">Password Reset!</h2>
              <p className="text-secondary text-sm">Your password has been updated successfully.</p>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 mt-2 px-6 py-2.5 rounded-full bg-white text-black text-sm font-semibold hover:bg-white/90 transition-colors"
              >
                Back to Sign In <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <Link to="/"><h1 className="text-3xl font-bold tracking-tight mb-3 hover:text-white/80 transition-colors flex items-center justify-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-blue-500 to-violet-500 shadow-[0_0_20px_rgba(34,211,238,0.4)]">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M12 2L2 7l10 5 10-5-10-5z" fill="#0a0a0a"/><path d="M2 17l10 5 10-5" stroke="#0a0a0a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/><path d="M2 12l10 5 10-5" stroke="#0a0a0a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </span>
                Acadify
              </h1></Link>
                <p className="text-secondary text-sm">
                  {step === 1 ? 'Enter your email to reset your password' : 'Set your new password'}
                </p>
              </div>

              {/* Step indicator */}
              <div className="flex items-center gap-2 mb-7">
                {[1, 2].map(s => (
                  <div key={s} className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? 'bg-white' : 'bg-white/15'}`} />
                ))}
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-xl mb-5 text-sm">
                  {error}
                </div>
              )}

              <>
                {step === 1 && (
                  <form
                    key="step1"
                    onSubmit={handleRequestReset}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-secondary ml-1">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                        <input
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          className="glass-input pl-12"
                          placeholder="you@example.com"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full glass-button bg-white text-black hover:bg-white/90 py-3 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Checking...' : <><span>Continue</span><ArrowRight className="w-4 h-4" /></>}
                    </button>
                  </form>
                )}

                {step === 2 && (
                  <form
                    key="step2"
                    onSubmit={handleResetPassword}
                    className="space-y-5"
                  >
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-secondary ml-1">New Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                        <input
                          type="password"
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          className="glass-input pl-12"
                          placeholder="Min. 6 characters"
                          minLength={6}
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-secondary ml-1">Confirm Password</label>
                      <div className="relative">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-secondary" />
                        <input
                          type="password"
                          value={confirm}
                          onChange={e => setConfirm(e.target.value)}
                          className="glass-input pl-12"
                          placeholder="••••••••"
                          required
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full glass-button bg-white text-black hover:bg-white/90 py-3 flex items-center justify-center gap-2"
                    >
                      {loading ? 'Resetting...' : <><span>Reset Password</span><ArrowRight className="w-4 h-4" /></>}
                    </button>
                    <button type="button" onClick={() => { setStep(1); setError(''); }} className="w-full flex items-center justify-center gap-1 text-sm text-secondary hover:text-white transition-colors">
                      <ArrowLeft className="w-3.5 h-3.5" /> Back
                    </button>
                  </form>
                )}
              </>

              <div className="mt-7 text-center text-sm text-secondary">
                Remember your password?{' '}
                <Link to="/login" className="text-white hover:underline transition-all">Sign in</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
