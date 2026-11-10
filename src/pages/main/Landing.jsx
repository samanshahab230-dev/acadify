import { Link } from 'react-router-dom';
import { ArrowRight, Brain, CheckCircle2, Cpu, Database, Gauge, Lock, ScanFace, Shield, Sparkles } from 'lucide-react';
import Navbar from '../../components/Navbar';

const metrics = [
  { value: '99.3%', label: 'Face recognition accuracy' },
  { value: '1.2s', label: 'Attendance verification' },
  { value: '24/7', label: 'Institutional monitoring' },
  { value: '10k+', label: 'Risk predictions analyzed' },
];

const featureCards = [
  { icon: Brain, title: 'Predictive Academic Intelligence', description: 'Real-time GPA forecasting, early warning logic, and intervention scoring powered by historical learning patterns.', color: 'from-emerald-400 to-green-500' },
  { icon: ScanFace, title: 'Biometric Attendance', description: 'Instant identity verification with facial recognition designed for classrooms, labs, and campus-wide access flows.', color: 'from-green-400 to-teal-500' },
  { icon: Shield, title: 'Secure Institutional Layer', description: 'Encrypted student records, policy enforcement, and low-friction reporting across every academic workflow.', color: 'from-teal-400 to-emerald-600' },
];

const pillars = [
  { icon: Cpu, title: 'AI-driven insight engine', text: 'Continuous model learning for academic outcomes, attendance behavior, and student engagement.' },
  { icon: Gauge, title: 'Operational clarity', text: 'Live dashboards with precise risk signals, attendance health, and intervention recommendations.' },
  { icon: Database, title: 'Connected campus data', text: 'One intelligent layer across departments, students, teachers, and academic performance records.' },
];

const trustPillars = [
  'Biometric attendance verification',
  'Adaptive GPA and risk modeling',
  'Secure counseling workflows',
  'Live analytics for educators',
];

const Logo = () => (
  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-green-600 shadow-[0_4px_14px_rgba(22,163,74,0.35)]">
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" />
      <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-gray-900 selection:bg-green-200">
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-6rem] top-[-4rem] h-[32rem] w-[32rem] rounded-full bg-emerald-100/70 blur-[100px]" />
        <div className="absolute right-[-4rem] top-[10rem] h-[28rem] w-[28rem] rounded-full bg-green-100/60 blur-[100px]" />
        <div className="absolute bottom-[-6rem] left-1/3 h-[24rem] w-[24rem] rounded-full bg-teal-100/50 blur-[100px]" />
      </div>

      <Navbar />

      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden border-b border-green-100 pt-32 pb-24 md:pt-40 md:pb-32">
          <div className="absolute inset-0 -z-10">
            <img src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?q=80&w=1920&auto=format&fit=crop" alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-b from-white/40 via-white/30 to-white" />
          </div>
          <div className="mx-auto max-w-6xl px-6 md:px-8">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-[11px] font-semibold uppercase tracking-widest text-green-700">
              <span className="h-2 w-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
              Acadify Intelligence Engine v2.0
            </div>
            <h1 className="max-w-4xl text-5xl font-black tracking-[-0.04em] text-gray-900 md:text-7xl">
              Build the future of
              <span className="block bg-gradient-to-r from-emerald-500 via-green-500 to-teal-500 bg-clip-text text-transparent mt-1">intelligent education.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-gray-700">
              A unified ecosystem featuring biometric facial attendance, predictive GPA modeling, and automated student risk analysis for modern institutions.
            </p>
            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-7 py-4 text-sm font-semibold text-white shadow-[0_4px_20px_rgba(22,163,74,0.35)] hover:shadow-[0_4px_28px_rgba(22,163,74,0.5)] hover:-translate-y-0.5 transition-all duration-200">
                Access Portal <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#features" className="inline-flex items-center justify-center rounded-full border border-green-200 bg-white px-7 py-4 text-sm font-medium text-gray-600 hover:border-green-300 hover:text-green-700 transition-colors">
                Explore Features
              </a>
            </div>
            <div className="mt-14 grid max-w-3xl gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {metrics.map(m => (
                <div key={m.label} className="rounded-2xl border border-green-100 bg-white p-5 shadow-[0_2px_12px_rgba(20,83,45,0.06)]">
                  <div className="text-2xl font-black text-green-600">{m.value}</div>
                  <div className="mt-1.5 text-xs uppercase tracking-widest text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Trust bar */}
        <section className="border-b border-green-200 bg-gradient-to-r from-emerald-600 to-green-700">
          <div className="mx-auto max-w-6xl px-6 py-8 md:px-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="text-xs font-semibold uppercase tracking-widest text-green-200">Trusted by forward-thinking institutions</div>
            <div className="flex flex-wrap gap-x-8 gap-y-2 text-sm font-medium text-white/80">
              <span>Northbridge Academy</span><span>BluePeak College</span><span>Summit Learning</span><span>Nova Campus</span>
            </div>
          </div>
        </section>

        {/* Features */}
        <section id="features" className="bg-gradient-to-b from-white to-emerald-50/60 px-6 py-24 md:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mx-auto max-w-2xl text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-4">Why Acadify</p>
              <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">Intelligence designed for every campus decision.</h2>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {featureCards.map(({ icon: Icon, title, description, color }) => (
                <article key={title} className="group rounded-3xl border border-green-100 bg-white p-8 shadow-[0_4px_24px_rgba(20,83,45,0.06)] hover:shadow-[0_8px_32px_rgba(20,83,45,0.12)] hover:-translate-y-1 transition-all duration-300">
                  <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${color} shadow-[0_4px_12px_rgba(22,163,74,0.25)]`}>
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">{title}</h3>
                  <p className="text-sm leading-7 text-gray-500">{description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* AI Models */}
        <section id="ai-models" className="bg-gradient-to-br from-emerald-900 via-green-900 to-teal-900 py-24 border-y border-green-800">
          <div className="mx-auto grid max-w-6xl gap-12 px-6 md:px-8 lg:grid-cols-2 lg:items-center">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4">AI Model Stack</p>
              <h2 className="text-4xl font-bold tracking-tight text-white mb-5">Built to understand behavior before it becomes a problem.</h2>
              <p className="text-green-200/80 mb-8">Acadify blends deep learning, attendance analytics, and institutional risk scoring into a single intelligent operating system.</p>
              <div className="space-y-4">
                {pillars.map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex gap-4 rounded-2xl border border-green-700/50 bg-white/10 p-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 border border-emerald-500/30">
                      <Icon className="h-5 w-5 text-emerald-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{title}</h3>
                      <p className="mt-1 text-sm text-green-200/70">{text}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-3xl border border-green-100 bg-white p-6 shadow-[0_8px_40px_rgba(20,83,45,0.10)]">
              <div className="mb-4 flex items-center gap-2 border-b border-gray-100 pb-4 text-sm text-gray-400">
                <span className="h-3 w-3 rounded-full bg-red-400" /><span className="h-3 w-3 rounded-full bg-yellow-400" /><span className="h-3 w-3 rounded-full bg-green-400" />
                <span className="ml-2 text-xs uppercase tracking-widest text-gray-400">analysis engine</span>
              </div>
              <div className="rounded-2xl bg-gray-950 p-5 font-mono text-sm">
                <div className="text-gray-500">def analyze_student_risk(student):</div>
                <div className="mt-2 text-gray-200">features = extract_signals(student)</div>
                <div className="mt-1 text-gray-200">risk_index = model.predict(features)</div>
                <div className="mt-4 text-emerald-400">return {'{'}</div>
                <div className="ml-4 text-gray-300">'risk_level': classify(risk_index),</div>
                <div className="ml-4 text-gray-300">'confidence': round(confidence * 100, 2),</div>
                <div className="text-emerald-400">{'}'}</div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                  <div className="text-xs uppercase tracking-widest text-gray-400">Model health</div>
                  <div className="mt-2 text-2xl font-black text-green-600">96.7%</div>
                </div>
                <div className="rounded-2xl border border-green-100 bg-green-50 p-4">
                  <div className="text-xs uppercase tracking-widest text-gray-400">Intervention score</div>
                  <div className="mt-2 text-2xl font-black text-green-600">+41%</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* About */}
        <section id="about" className="py-24 bg-gradient-to-b from-white via-green-50/40 to-white">
          <div className="mx-auto max-w-6xl px-6 md:px-8">
            <div className="mx-auto max-w-3xl text-center mb-14">
              <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-4">About Acadify</p>
              <h2 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">The missing layer between student data and institutional action.</h2>
            </div>
            <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4 mb-16">
              {metrics.map(m => (
                <div key={m.label} className="rounded-3xl border border-green-100 bg-white p-6 shadow-sm text-center">
                  <div className="text-4xl font-black text-green-600">{m.value}</div>
                  <div className="mt-3 text-xs uppercase tracking-widest text-gray-400">{m.label}</div>
                </div>
              ))}
            </div>
            <div className="grid gap-6 lg:grid-cols-2 lg:items-center">
              <div className="overflow-hidden rounded-3xl border border-green-100 shadow-sm h-72 lg:h-auto">
                <img src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?q=80&w=1200&auto=format&fit=crop" alt="Students collaborating" className="h-full w-full object-cover" />
              </div>
              <div className="rounded-3xl border border-green-100 bg-white p-8 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-4">Institutional Impact</p>
                <h3 className="text-2xl font-bold text-gray-900 mb-6">From attendance to intervention, in one intelligent flow.</h3>
                <ul className="space-y-4">
                  {trustPillars.map(item => (
                    <li key={item} className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      </span>
                      <span className="text-gray-600">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Security */}
        <section id="security" className="border-t border-green-200 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 py-24">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 md:px-8 lg:grid-cols-3">
            <div className="rounded-3xl border border-white/20 bg-white/15 backdrop-blur-sm p-8 shadow-sm lg:col-span-2">
              <div className="flex items-center gap-2 text-emerald-200 mb-5">
                <Sparkles className="h-5 w-5" />
                <span className="text-xs font-semibold uppercase tracking-widest">Security Overview</span>
              </div>
              <h2 className="text-3xl font-bold text-white mb-4">Enterprise-grade protection for sensitive student intelligence.</h2>
              <p className="text-green-100/80">Every record, risk signal, and biometric model runs through a privacy-first governance layer built for educational institutions.</p>
            </div>
            <div className="rounded-3xl border border-white/20 bg-white/20 backdrop-blur-sm p-8">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 border border-white/30">
                <Lock className="h-5 w-5 text-white" />
              </div>
              <div className="text-xs uppercase tracking-widest text-green-200 mb-3">Protected</div>
              <div className="text-2xl font-bold text-white">Zero-trust campus model</div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="mx-auto max-w-6xl px-6 py-24 md:px-8">
          <div className="rounded-3xl border border-green-200 bg-gradient-to-br from-green-50 via-white to-emerald-50 p-10 shadow-[0_8px_40px_rgba(20,83,45,0.10)] md:p-14">
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <p className="text-xs font-semibold uppercase tracking-widest text-green-600 mb-4">Ready to Deploy</p>
                <h2 className="text-3xl font-bold text-gray-900 md:text-4xl">Turn attendance, prediction, and alerts into a competitive advantage.</h2>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row shrink-0">
                <Link to="/login" className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 px-7 py-3.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(22,163,74,0.3)] hover:-translate-y-0.5 transition-all">
                  Sign In to Portal <ArrowRight className="h-4 w-4" />
                </Link>
                <a href="#features" className="inline-flex items-center justify-center rounded-full border border-green-200 bg-white px-7 py-3.5 text-sm font-medium text-gray-600 hover:border-green-300 transition-colors">
                  Learn More
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-green-800 bg-gradient-to-r from-emerald-900 via-green-900 to-teal-900">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-6 py-10 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="flex items-center gap-2.5"><Logo /><span className="text-base font-bold text-white">Acadify</span></div>
          <div className="flex flex-wrap gap-6 text-sm">
            <Link to="/" className="text-green-300 hover:text-white transition-colors">Privacy Policy</Link>
            <Link to="/" className="text-green-300 hover:text-white transition-colors">Terms of Service</Link>
            <Link to="/" className="text-green-300 hover:text-white transition-colors">Support</Link>
          </div>
          <div className="text-sm text-green-400/70">© 2026 Acadify. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
