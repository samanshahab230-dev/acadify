import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Activity, Bell, Building2, ClipboardList, Database, FileText, HandHeart, MessageSquare, Plus, RefreshCw, Search, ShieldAlert, Users, BookOpen, ChevronDown, ChevronRight, Trash2, Eye, EyeOff } from 'lucide-react';
import api from '../../services/api';
import { Skeleton, SkeletonCard } from '../../components/Skeleton';

const headings = {
  '/admin/students': ['Student Directory', 'Search, review, and manage student records.'],
  '/admin/predictions': ['Risk Predictions', 'Review and run AI risk forecasts for students.'],
  '/admin/attendance': ['Attendance Control', 'Review and manage student attendance.'],
  '/admin/counseling': ['Counseling Requests', 'Review requests and send replies to students.'],
  '/admin/interventions': ['Interventions', 'Track support actions for students.'],
  '/admin/departments': ['Departments', 'Review department-level academic statistics.'],
  '/admin/analytics': ['Analytics', 'Compare academic and attendance metrics by department.'],
  '/admin/data-upload': ['CSV Data Import', 'Import student records from a CSV file.'],
  '/admin/notifications': ['Bulk Notifications', 'Send an announcement to a targeted group.'],
  '/admin/users': ['User Accounts', 'Review accounts registered in the system.'],
  '/admin/audit-logs': ['Audit Stream', 'Review administrative actions and system events.'],
  '/admin/settings': ['System Settings', 'Review deployment and platform configuration.'],
  '/admin/schedule': ['Exam & Timetable', 'Manage exams and timetable for students.'],
};

function useData(path) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reloadFlag, setReloadFlag] = useState(false);

  useEffect(() => {
    let active = true;
    setError('');
    // Show cached data instantly if available (no loading flash)
    const cached = sessionStorage.getItem(`admin_cache:${path}`);
    if (cached && !reloadFlag) {
      try { setData(JSON.parse(cached)); setLoading(false); } catch {}
    } else {
      setLoading(true);
    }
    api.get(path, reloadFlag ? { noCache: true } : {})
      .then(({ data: result }) => {
        if (active) {
          setData(result);
          setLoading(false);
          try { sessionStorage.setItem(`admin_cache:${path}`, JSON.stringify(result)); } catch {}
        }
      })
      .catch((err) => { if (active) { setError(err.response?.data?.message || 'Unable to load administrative data.'); setLoading(false); } });
    return () => { active = false; };
  }, [path, reloadFlag]);

  return { data, loading, error, reload: () => setReloadFlag(f => !f) };
}

function Input({ label, ...props }) {
  return <label className="block space-y-2 text-sm font-medium text-gray-700">{label}<input className="glass-input" {...props} /></label>;
}

function Select({ label, children, ...props }) {
  return <label className="block space-y-2 text-sm font-medium text-gray-700">{label}<select className="glass-input" {...props}>{children}</select></label>;
}

function StudentConnections({ student, teachers, parents, onSave }) {
  const [teacherIds, setTeacherIds] = useState(student.teacher_ids || []);
  const [parentIds, setParentIds] = useState(student.parent_ids || []);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const save = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await onSave({ teacher_ids: teacherIds, parent_ids: parentIds });
      setMessage('Connections saved.');
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not save account links.');
    } finally {
      setSaving(false);
    }
  };

  const toggle = (current, setter, id) => setter(current.includes(id) ? current.filter((value) => value !== id) : [...current, id]);
  const accountList = (title, accounts, selected, setter) => <fieldset className="space-y-2">
    <legend className="mb-2 text-sm font-semibold">{title}</legend>
    {accounts.length ? accounts.map((account) => <label key={account.id} className="flex items-center gap-3 py-1 text-sm text-secondary"><input type="checkbox" checked={selected.includes(account.id)} onChange={() => toggle(selected, setter, account.id)} />{account.name} · {account.email}</label>) : <p className="text-sm text-secondary">No {title.toLowerCase()} accounts yet.</p>}
  </fieldset>;

  return <form onSubmit={save} className="space-y-5 border-y border-white/10 py-5">
    <div><h3 className="font-semibold">Family & teacher connections</h3><p className="mt-1 text-sm text-secondary">Linked teachers can manage this student’s attendance and assignments. Linked parents can view progress.</p></div>
    <div className="grid gap-5 md:grid-cols-2">{accountList('Teachers', teachers, teacherIds, setTeacherIds)}{accountList('Parents', parents, parentIds, setParentIds)}</div>
    <div className="flex items-center gap-3"><button disabled={saving} className="glass-button bg-white px-4 py-2 text-black disabled:opacity-50">{saving ? 'Saving...' : 'Save connections'}</button>{message ? <span role="status" className="text-sm text-cyan-300">{message}</span> : null}</div>
  </form>;
}

function CreateRoleAccount({ onCreated }) {
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'teacher' });
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  const create = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const { data } = await api.post('/admin/users', form);
      setMessage(data.message || 'Account created.');
      setForm({ name: '', email: '', password: '', role: form.role });
      onCreated();
    } catch (error) {
      setMessage(error.response?.data?.message || 'Could not create account.');
    } finally {
      setSaving(false);
    }
  };

  return <form onSubmit={create} className="grid gap-3 border-y border-gray-200 py-5 md:grid-cols-[1fr_1.2fr_1fr_150px_auto] md:items-end">
    <Input label="Name" required value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
    <Input label="Email" type="email" required value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
    <Input label="Initial password" type="password" minLength="6" required value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} />
    <Select label="Role" value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}><option value="teacher">Teacher</option><option value="parent">Parent</option></Select>
    <button disabled={saving} className="glass-button bg-white px-4 py-3 text-black disabled:opacity-50">{saving ? 'Creating...' : 'Create account'}</button>
    {message ? <p role="status" className="text-sm text-emerald-600 font-medium md:col-span-full">{message}</p> : null}
  </form>;
}

function Header({ path, icon: Icon }) {
  const [title, description] = headings[path] || ['Student Record', 'View and update this student record.'];
  return <header className="flex items-start gap-3 border-b border-gray-200 pb-5"><Icon className="mt-1 h-6 w-6 text-indigo-500" /><div><h1 className="text-2xl font-bold text-gray-900">{title}</h1><p className="mt-1 text-gray-500">{description}</p></div></header>;
}

export default function AdminPortal() {
  const { pathname, search: locationSearch } = useLocation();
  const navigate = useNavigate();
  const isEdit = /^\/admin\/students\/[^/]+\/edit$/.test(pathname);
  const isAdd = pathname === '/admin/students/add';
  const isStudentDetail = /^\/admin\/students\/[^/]+$/.test(pathname);
  const isAttendanceDetail = /^\/admin\/attendance\/[^/]+$/.test(pathname);
  const isReportCard = /^\/admin\/report-card\/[^/]+$/.test(pathname);
  const endpoint = `${pathname}${locationSearch}`;
  const { data, loading, error, reload } = useData(endpoint);
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState('');
  const [file, setFile] = useState(null);

  const submit = async (url, payload, successMessage = 'Changes saved.') => {
    setNotice('');
    try {
      const { data: response } = await api.post(url, payload);
      if (response?.redirect) {
        const targetPath = new URL(response.redirect, window.location.origin).pathname;
        if (targetPath === pathname) reload();
        else navigate(response.redirect);
      }
      else { setNotice(response?.message || successMessage); reload(); }
    } catch (err) {
      setNotice(err.response?.data?.message || err.response?.data?.error || 'The requested action could not be completed.');
    }
  };

  const deleteStudent = async (id) => {
    if (!window.confirm('Delete this student account and record?')) return;
    await submit(`/admin/students/${id}/delete`, {}, 'Student deleted.');
  };

  const renderStudentForm = () => <StudentForm data={data} isEdit={isEdit} pathname={pathname} submit={submit} />;

  const renderStudents = () => <div className="space-y-5"><form className="flex flex-wrap gap-3" onSubmit={(event) => { event.preventDefault(); navigate(`/admin/students?q=${encodeURIComponent(search)}`); }}><div className="relative min-w-56 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" /><input className="glass-input pl-10" placeholder="Search name, roll no or department" value={search} onChange={(event) => setSearch(event.target.value)} /></div><button className="glass-button px-4">Search</button><Link to="/admin/students/add" className="glass-button inline-flex items-center gap-2 bg-white px-4 py-3 text-black"><Plus className="h-4 w-4" />Add student</Link><a href={`${api.defaults.baseURL}/admin/export/csv`} className="glass-button inline-flex items-center px-4 py-3">Export CSV</a></form><Table headers={['Student', 'Roll No', 'Department', 'Class', 'Course', 'Attendance', 'Risk', 'Actions']} rows={(data?.students || []).map((student) => [<Link key={`name-${student._id}`} className="font-medium text-indigo-600 hover:text-indigo-800" to={`/admin/students/${student._id}`}>{student.name || 'Student'}</Link>, student.roll_no, student.department, student.class_name || <span className="text-gray-400 text-xs">—</span>, student.course_subject || <span className="text-gray-400 text-xs">—</span>, `${Number(student.attendance_pct || 0).toFixed(1)}%`, student.risk_level, <span key={`actions-${student._id}`} className="flex gap-3"><Link to={`/admin/students/${student._id}/edit`} className="text-indigo-600 font-medium hover:underline">Edit</Link><button onClick={() => deleteStudent(student._id)} className="text-red-600 font-medium hover:underline">Delete</button></span>])} />{(data?.students || []).length === 0 ? <Empty>No student records found.</Empty> : null}</div>;

  const renderPredictions = () => <PredictionsPanel data={data} submit={submit} navigate={navigate} />;

  const renderPredict = () => null; // merged into predictions page

  const renderAttendance = () => isAttendanceDetail ? <div className="space-y-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-semibold text-gray-900">{data?.student?.name} · {data?.student?.roll_no}</h2><p className="text-sm text-gray-500">Current streak: {data?.streak || 0} days</p></div><button onClick={() => submit(`${pathname}/seed`, {}, 'Default subjects added.')} className="glass-button px-4 py-2">Seed subjects</button></div><Table headers={['Subject', 'Attended', 'Classes', 'Attendance']} rows={(data?.subjects || []).map((subject) => [subject.subject, subject.attended, subject.total_classes, `${Number(subject.attendance_pct || 0).toFixed(1)}%`])} /><form className="grid gap-3 border-t border-gray-200 pt-5 sm:grid-cols-4" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); submit(`${pathname}/mark`, Object.fromEntries(form)); }}><Input label="Subject" name="subject" required /><Select label="Status" name="status"><option value="present">Present</option><option value="absent">Absent</option></Select><Input label="Date" name="date" type="date" defaultValue={new Date().toISOString().slice(0, 10)} required /><button className="glass-button self-end bg-white px-4 py-3 text-black">Mark attendance</button></form></div> : <><Table headers={['Student', 'Roll number', 'Department', 'Attendance', 'Subjects']} rows={(data?.students || []).map((student) => [<Link key={`attendance-${student._id}`} className="text-indigo-600 font-medium hover:underline" to={`/admin/attendance/${student._id}`}>{student.name}</Link>, student.roll_no, student.department, `${Number(student.attendance_pct || 0).toFixed(1)}%`, student.subject_count])} />{!data?.students?.length ? <Empty>No students found.</Empty> : null}</>;

  const renderCounseling = () => <div className="space-y-4">{(data?.requests || []).map((item) => <article key={item._id} className="border-b border-gray-200 py-4"><div className="flex flex-wrap justify-between gap-3"><div><h2 className="font-semibold text-gray-900">{item.subject}</h2><p className="mt-1 text-sm text-gray-500">{item.student_name || item.student?.name || 'Student'} · {item.urgency} · {item.created_at}</p></div><Select label="Status" value={item.status} onChange={(event) => submit(`/admin/counseling/${item._id}/status`, { status: event.target.value }, 'Request status updated.')}><option value="open">Open</option><option value="in_review">In review</option><option value="resolved">Resolved</option><option value="closed">Closed</option></Select></div><p className="mt-3 whitespace-pre-wrap text-sm text-gray-600">{item.message}</p>{item.evidence_filename || item.self_check_report ? <div className="mt-3 flex flex-wrap gap-4 text-sm">{item.evidence_filename && <a className="text-indigo-600 font-medium hover:underline" href={`${api.defaults.baseURL}/face/support-evidence/${item._id}`}>Download evidence</a>}{item.self_check_report && <a className="text-indigo-600 font-medium hover:underline" href={`${api.defaults.baseURL}/face/self-check-report/${item._id}`}>Download self-check report</a>}</div> : null}{item.reply ? <p className="mt-3 border-l-2 border-indigo-400 pl-3 text-sm text-gray-700">Reply: {item.reply}</p> : null}<form className="mt-4 flex flex-wrap gap-2" onSubmit={(event) => { event.preventDefault(); const reply = new FormData(event.currentTarget).get('reply'); submit(`/admin/counseling/${item._id}/reply`, { reply }, 'Reply sent.'); }}><input name="reply" className="glass-input min-w-60 flex-1" placeholder="Write a reply" required /><button className="glass-button px-4">Send reply</button></form></article>)}{!data?.requests?.length ? <Empty>No counseling requests.</Empty> : null}</div>;

  const renderInterventions = () => <div className="space-y-5"><form className="grid gap-3 sm:grid-cols-4" onSubmit={(event) => { event.preventDefault(); submit('/admin/interventions/add', Object.fromEntries(new FormData(event.currentTarget)), 'Intervention logged.'); event.currentTarget.reset(); }}><Select label="High-risk student" name="student_id" required><option value="">Choose student</option>{(data?.students || []).map((student) => <option key={student._id} value={student._id}>{student.name} · {student.roll_no}</option>)}</Select><Select label="Type" name="intervention_type"><option value="counseling">Counseling</option><option value="academic">Academic support</option><option value="attendance">Attendance</option><option value="other">Other</option></Select><Input label="Notes" name="notes" required /><button className="glass-button self-end bg-white px-4 py-3 text-black">Log intervention</button></form><Table headers={['Student', 'Type', 'Notes', 'Status', 'Update']} rows={(data?.interventions || []).map((item) => [item.student_name || 'Student', item.intervention_type, item.notes, item.status, <Select key={`status-${item._id}`} label="" value={item.status} onChange={(event) => submit(`/admin/interventions/${item._id}/status`, { status: event.target.value }, 'Intervention updated.')}><option value="active">Active</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></Select>])} /></div>;

  const renderDepartments = () => <DepartmentsPanel data={data} submit={submit} />;

  const renderUpload = () => <form className="max-w-2xl space-y-4" onSubmit={async (event) => { event.preventDefault(); if (!file) return; const payload = new FormData(); payload.append('csv_file', file); try { const { data: result } = await api.post('/admin/data-upload', payload, { headers: { 'Content-Type': 'multipart/form-data' } }); setNotice(result?._flashes?.map((flash) => flash[1]).join(' ') || 'Import finished.'); } catch (err) { setNotice(err.response?.data?.message || 'CSV import failed.'); } }}><p className="text-sm text-gray-600">Required columns: name, email, roll_no, department, semester, gpa, attendance_pct.</p><input type="file" accept=".csv,text/csv" onChange={(event) => setFile(event.target.files?.[0] || null)} className="block w-full text-sm text-gray-600 file:mr-4 file:border-0 file:bg-white file:px-4 file:py-2 file:text-black" /><button className="glass-button bg-white px-5 py-3 text-black">Import CSV</button>{notice ? <p role="status" className="text-sm text-emerald-600 font-medium">{notice}</p> : null}</form>;

  const renderNotifications = () => <form className="max-w-2xl space-y-4" onSubmit={(event) => { event.preventDefault(); submit('/admin/notifications', Object.fromEntries(new FormData(event.currentTarget)), 'Notification sent.'); }}><Select label="Recipients" name="target"><option value="all">All students</option><option value="department">Department</option><option value="high_risk">High risk students</option><option value="low_attendance">Attendance below 75%</option></Select><Select label="Department" name="department"><option value="">Select department if applicable</option>{(data?.departments || []).map((item) => <option key={item._id || item.name} value={item.name}>{item.name}</option>)}</Select><Select label="Type" name="notif_type"><option value="info">Information</option><option value="success">Success</option><option value="warning">Warning</option><option value="danger">Urgent</option></Select><label className="block space-y-2 text-sm font-medium text-gray-700">Message<textarea className="glass-input min-h-32" name="message" required /></label><button className="glass-button bg-white px-5 py-3 text-black">Send notification</button></form>;

  const renderBody = () => {
    if (isAdd || isEdit) return renderStudentForm();
    if (isReportCard) return <article className="max-w-3xl space-y-5 border border-gray-200 p-8 print:border-black print:text-black"><div className="flex justify-between gap-4"><div><p className="text-xs uppercase text-indigo-600 font-semibold print:text-black">EDU · Academic Report</p><h2 className="mt-4 text-2xl font-bold text-gray-900">{data?.student?.name || data?.student?.roll_no}</h2><p className="mt-1 text-gray-500 print:text-black">{data?.student?.roll_no} · {data?.student?.department} · Semester {data?.student?.semester}</p></div><button onClick={() => window.print()} className="glass-button h-fit px-4 py-2 print:hidden">Print report</button></div><Table headers={['Measure', 'Current result']} rows={[['Cumulative GPA', Number(data?.student?.gpa || 0).toFixed(2)], ['Attendance', `${Number(data?.student?.attendance_pct || 0).toFixed(1)}%`], ['Risk level', data?.student?.risk_level], ['Risk score', Number(data?.prediction?.risk_score || 0).toFixed(1)], ['Model confidence', `${Number(data?.prediction?.confidence || 0).toFixed(1)}%`]]} />{data?.prediction?.recommendations?.length ? <div><h3 className="font-semibold text-gray-900">Recommendations</h3><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-700">{data.prediction.recommendations.map((item, index) => <li key={index}>{item}</li>)}</ul></div> : null}</article>;
    if (pathname.startsWith('/admin/students')) return isStudentDetail ? <><h2 className="text-xl font-semibold text-gray-900">{data?.student?.name}</h2><p className="text-gray-500">{data?.student?.roll_no} · {data?.student?.department}</p><div className="flex gap-3"><Link className="text-indigo-600 font-medium hover:underline" to={`/admin/students/${data?.student?._id}/edit`}>Edit record</Link><Link className="text-indigo-600 font-medium hover:underline" to={`/admin/report-card/${data?.student?._id}`}>Report card</Link></div><StudentConnections key={data?.student?._id} student={data?.student || {}} teachers={data?.teacher_options || []} parents={data?.parent_options || []} onSave={(payload) => api.post(`${pathname}/connections`, payload).then(({ data: response }) => { setNotice(response.message); reload(); })} /><Table headers={['Prediction', 'Score', 'Risk']} rows={(data?.predictions || []).map((item) => [item.predicted_at || item.created_at || 'Forecast', item.risk_score, item.risk_level])} /></> : renderStudents();
    if (pathname.startsWith('/admin/attendance')) return renderAttendance();
    if (pathname === '/admin/predictions') return renderPredictions();
    if (pathname === '/admin/predict') return renderPredictions();
    if (pathname === '/admin/counseling') return renderCounseling();
    if (pathname === '/admin/interventions') return renderInterventions();
    if (pathname === '/admin/departments') return renderDepartments();
    if (pathname === '/admin/analytics') return <div className="space-y-5"><Table headers={['Department', 'Students', 'Average GPA', 'Average attendance']} rows={(data?.departments || []).map((item) => [item.name, item.total_students, Number(item.avg_gpa || 0).toFixed(2), `${Number(item.avg_attendance || 0).toFixed(1)}%`])} /><a className="text-sm text-indigo-600 font-medium hover:underline" href="/api/dashboard-stats">View detailed dashboard statistics JSON</a></div>;
    if (pathname === '/admin/data-upload') return renderUpload();
    if (pathname === '/admin/notifications') return renderNotifications();
    if (pathname === '/admin/users') return <UsersPanel data={data} reload={reload} submit={submit} />;
    if (pathname === '/admin/schedule') return <SchedulePanel />;
    if (pathname === '/admin/audit-logs') return <div className="space-y-5"><form className="grid gap-3 sm:grid-cols-[180px_1fr_auto]" onSubmit={(event) => { event.preventDefault(); submit('/admin/audit-logs/add', Object.fromEntries(new FormData(event.currentTarget)), 'Audit event recorded.'); event.currentTarget.reset(); }}><Input label="Event type" name="action_type" defaultValue="MANUAL_AUDIT" /><Input label="Description" name="description" required /><button className="glass-button self-end px-4 py-3">Add entry</button></form><Table headers={['Time', 'Actor', 'Action', 'Description']} rows={(data?.logs || []).map((item) => [item.timestamp, item.admin_name || item.actor, item.action, item.description])} /></div>;
    if (pathname === '/admin/settings') return <SettingsPanel />;
    return <Empty>This administration view is not available.</Empty>;
  };

  const basePath = pathname.startsWith('/admin/students') ? '/admin/students' : pathname.startsWith('/admin/attendance') ? '/admin/attendance' : isReportCard ? '/admin/students' : pathname;
  const icon = basePath.includes('student') ? Users : basePath.includes('attendance') ? ClipboardList : basePath.includes('prediction') || basePath.includes('predict') ? Activity : basePath.includes('counseling') ? MessageSquare : basePath.includes('intervention') ? HandHeart : basePath.includes('department') ? Building2 : basePath.includes('data-upload') ? Database : basePath.includes('notification') ? Bell : basePath.includes('audit') ? FileText : ShieldAlert;
  return <section className="mx-auto max-w-6xl space-y-6"><Header path={basePath} icon={icon} />{loading && !data ? <div className="space-y-3"><SkeletonCard lines={2} /><div className="grid grid-cols-1 sm:grid-cols-3 gap-4">{Array.from({length:3}).map((_,i)=><Skeleton key={i} className="h-20" />)}</div><SkeletonCard lines={4} /></div> : null}{error ? <p role="alert" className="text-red-600 font-medium">{error}</p> : null}{!error && data ? renderBody() : null}{notice && pathname !== '/admin/data-upload' ? <p role="status" className="text-sm text-emerald-600 font-medium">{notice}</p> : null}</section>;
}

function Table({ headers, rows }) {
  return <div className="overflow-x-auto border-y border-gray-200"><table className="w-full min-w-155 text-left text-sm"><thead className="border-b border-gray-200 bg-gray-50 text-xs uppercase text-gray-500"><tr>{headers.map((header) => <th key={header} className="py-3 pr-4 font-semibold">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">{row.map((cell, column) => <td key={column} className="py-3 pr-4 align-top text-gray-800">{cell}</td>)}</tr>)}</tbody></table></div>;
}

function UsersPanel({ data, reload, submit }) {
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [assignTeacher, setAssignTeacher] = useState(null);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [teacherSubjects, setTeacherSubjects] = useState([]);
  const [allSubjects, setAllSubjects] = useState([]);
  const [deptFilter, setDeptFilter] = useState('');
  const [msg, setMsg] = useState('');
  const [saving, setSaving] = useState(false);

  const openEdit = (user) => { setEditUser(user); setEditForm({ name: user.name, email: user.email, password: '' }); setMsg(''); };
  const closeEdit = () => { setEditUser(null); setMsg(''); };

  const saveEdit = async (e) => {
    e.preventDefault(); setSaving(true); setMsg('');
    try {
      const { data: res } = await api.post(`/admin/users/${editUser.id}`, editForm);
      setMsg(res.message); reload(); setTimeout(closeEdit, 1000);
    } catch (err) { setMsg(err.response?.data?.message || 'Could not update.'); }
    finally { setSaving(false); }
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.role} account: ${user.name}?`)) return;
    try {
      const { data: res } = await api.post(`/admin/users/${user.id}/delete`, {});
      setMsg(res.message); reload();
    } catch (err) { setMsg(err.response?.data?.message || 'Could not delete.'); }
  };

  const openAssign = async (teacher) => {
    setAssignTeacher(teacher);
    setDeptFilter('');
    setMsg('');
    try {
      const { data: res } = await api.get(`/admin/users/${teacher.id}/detail`);
      setSelectedStudents(res.assigned_student_ids || []);
      setTeacherSubjects(res.teacher_subjects || []);
      setAllSubjects(res.all_subjects || []);
    } catch {
      const assigned = (data?.students || []).filter(s => s.teacher_ids?.includes(teacher.id)).map(s => s._id);
      setSelectedStudents(assigned);
      setTeacherSubjects([]);
      setAllSubjects([]);
    }
  };

  const saveAssign = async () => {
    setSaving(true); setMsg('');
    try {
      const { data: res } = await api.post(`/admin/users/${assignTeacher.id}/assign-students`, { student_ids: selectedStudents });
      setMsg(res.message); reload();
      // Refresh subjects after save
      const { data: detail } = await api.get(`/admin/users/${assignTeacher.id}/detail`);
      setTeacherSubjects(detail.teacher_subjects || []);
      setAssignTeacher(prev => ({ ...prev, student_count: selectedStudents.length }));
    } catch (err) { setMsg(err.response?.data?.message || 'Could not assign.'); }
    finally { setSaving(false); }
  };

  const toggleStudent = (id) => setSelectedStudents(prev => prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]);

  const allDepts = [...new Set((data?.students || []).map(s => s.department).filter(Boolean))].sort();
  const filteredStudents = deptFilter ? (data?.students || []).filter(s => s.department === deptFilter) : (data?.students || []);

  const teachers = (data?.users || []).filter(u => u.role === 'teacher');
  const parents = (data?.users || []).filter(u => u.role === 'parent');
  const admins = (data?.users || []).filter(u => u.role === 'admin');

  return (
    <div className="space-y-6">
      {msg && <p className="text-sm text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg">{msg}</p>}

      <CreateRoleAccount onCreated={reload} />

      {/* Teachers */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Teachers ({teachers.length})</h3>
        <Table
          headers={['Name', 'Email', 'Students Assigned', 'Actions']}
          rows={teachers.map(u => [
            u.name, u.email,
            <span key={u.id} className="text-indigo-600 font-medium">{u.student_count ?? 0} students</span>,
            <span key={u.id + 'a'} className="flex gap-3">
              <button onClick={() => openAssign(u)} className="text-indigo-600 font-medium hover:underline">Assign Students</button>
              <button onClick={() => openEdit(u)} className="text-amber-600 font-medium hover:underline">Edit</button>
              <button onClick={() => deleteUser(u)} className="text-red-600 font-medium hover:underline">Delete</button>
            </span>
          ])}
        />
      </div>

      {/* Parents */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Parents ({parents.length})</h3>
        <Table
          headers={['Name', 'Email', 'Actions']}
          rows={parents.map(u => [
            u.name, u.email,
            <span key={u.id} className="flex gap-3">
              <button onClick={() => openEdit(u)} className="text-amber-600 font-medium hover:underline">Edit</button>
              <button onClick={() => deleteUser(u)} className="text-red-600 font-medium hover:underline">Delete</button>
            </span>
          ])}
        />
      </div>

      {/* Admins */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900">Admins ({admins.length})</h3>
        <Table headers={['Name', 'Email']} rows={admins.map(u => [u.name, u.email])} />
      </div>

      {/* Edit Modal */}
      {editUser && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-md space-y-4">
            <h3 className="font-semibold text-lg">Edit — {editUser.name}</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              <Input label="Name" value={editForm.name} onChange={e => setEditForm({...editForm, name: e.target.value})} required />
              <Input label="Email" type="email" value={editForm.email} onChange={e => setEditForm({...editForm, email: e.target.value})} required />
              <Input label="New password (leave blank to keep)" type="password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} />
              {msg && <p className="text-sm text-cyan-300">{msg}</p>}
              <div className="flex gap-3">
                <button disabled={saving} className="glass-button bg-white px-4 py-2 text-black disabled:opacity-50">{saving ? 'Saving...' : 'Save'}</button>
                <button type="button" onClick={closeEdit} className="glass-button px-4 py-2">Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Students Modal */}
      {assignTeacher && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-card p-6 w-full max-w-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-lg">Assign Students — {assignTeacher.name}</h3>
                <p className="text-sm text-secondary mt-1">{selectedStudents.length} selected · Subjects auto-seeded on save</p>
              </div>
              <button onClick={() => setAssignTeacher(null)} className="text-secondary hover:text-white text-xl leading-none">✕</button>
            </div>

            {/* Current Subjects */}
            {teacherSubjects.length > 0 && (
              <div className="bg-white/5 rounded-lg px-4 py-3">
                <p className="text-xs text-secondary uppercase mb-2">Current subjects ({teacherSubjects.length})</p>
                <div className="flex flex-wrap gap-2">
                  {teacherSubjects.map(s => <span key={s} className="text-xs bg-cyan-500/20 text-cyan-300 px-2 py-1 rounded">{s}</span>)}
                </div>
              </div>
            )}

            {/* Department Filter */}
            <div className="flex gap-3 items-center">
              <select value={deptFilter} onChange={e => setDeptFilter(e.target.value)} className="glass-input text-sm flex-1">
                <option value="">All departments</option>
                {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
              <button onClick={() => setSelectedStudents(filteredStudents.map(s => s._id))} className="glass-button px-3 py-2 text-sm">Select all</button>
              <button onClick={() => setSelectedStudents([])} className="glass-button px-3 py-2 text-sm">Clear</button>
            </div>

            {/* Students List */}
            <div className="overflow-y-auto flex-1 space-y-1 border border-white/10 rounded-lg p-3">
              {filteredStudents.map(s => (
                <label key={s._id} className="flex items-center gap-3 py-1.5 text-sm hover:bg-white/5 px-2 rounded cursor-pointer">
                  <input type="checkbox" checked={selectedStudents.includes(s._id)} onChange={() => toggleStudent(s._id)} />
                  <span>{s.name} <span className="text-secondary">· {s.roll_no} · {s.department}</span></span>
                </label>
              ))}
            </div>

            {msg && <p className="text-sm text-cyan-300">{msg}</p>}
            <div className="flex gap-3">
              <button disabled={saving} onClick={saveAssign} className="glass-button bg-white px-4 py-2 text-black disabled:opacity-50">{saving ? 'Saving...' : 'Save assignments'}</button>
              <button onClick={() => setAssignTeacher(null)} className="glass-button px-4 py-2">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SchedulePanel() {
  const [students, setStudents] = useState([]);
  const [selStudent, setSelStudent] = useState('');
  const [tab, setTab] = useState('timetable');
  const [timetable, setTimetable] = useState({});
  const [exams, setExams] = useState([]);
  const [msg, setMsg] = useState('');
  const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const [ttForm, setTtForm] = useState({ day: 'Monday', time: '', subject: '', room: '' });
  const [exForm, setExForm] = useState({ subject: '', exam_type: 'mid', exam_date: '', venue: '', notes: '' });

  useEffect(() => {
    api.get('/admin/api/students').then(({ data }) => setStudents(data.students || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selStudent) return;
    api.get(`/admin/api/timetable/${selStudent}`).then(({ data }) => setTimetable(data.timetable || {})).catch(() => {});
    api.get(`/admin/api/exams/${selStudent}`).then(({ data }) => setExams(data.exams || [])).catch(() => {});
  }, [selStudent]);

  const addSlot = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/api/timetable', { student_id: selStudent, ...ttForm });
      setMsg('Slot added.');
      const { data } = await api.get(`/admin/api/timetable/${selStudent}`);
      setTimetable(data.timetable || {});
      setTtForm({ ...ttForm, time: '', subject: '', room: '' });
    } catch (err) { setMsg(err.response?.data?.message || 'Failed.'); }
  };

  const deleteSlot = async (id) => {
    await api.post(`/admin/api/timetable/${id}/delete`);
    const { data } = await api.get(`/admin/api/timetable/${selStudent}`);
    setTimetable(data.timetable || {});
  };

  const addExam = async (e) => {
    e.preventDefault();
    try {
      await api.post('/admin/api/exams', { student_id: selStudent, ...exForm });
      setMsg('Exam added.');
      const { data } = await api.get(`/admin/api/exams/${selStudent}`);
      setExams(data.exams || []);
      setExForm({ subject: '', exam_type: 'mid', exam_date: '', venue: '', notes: '' });
    } catch (err) { setMsg(err.response?.data?.message || 'Failed.'); }
  };

  const deleteExam = async (id) => {
    await api.post(`/admin/api/exams/${id}/delete`);
    setExams(exams.filter(e => e._id !== id));
  };

  const allSlots = Object.values(timetable).flat();

  return (
    <div className="space-y-5">
      {msg && <p className="text-sm text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-4 py-2 rounded-lg">{msg}</p>}
      <Select label="Select Student" value={selStudent} onChange={e => setSelStudent(e.target.value)}>
        <option value="">Choose a student</option>
        {students.map(s => <option key={s._id} value={s._id}>{s.name} · {s.roll_no} · {s.department}</option>)}
      </Select>

      {selStudent && (
        <>
          <div className="flex gap-2 border-b border-white/10">
            {['timetable', 'exams'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg capitalize transition-colors ${
                  tab === t ? 'bg-white/10 text-white' : 'text-secondary hover:text-white'
                }`}>{t}</button>
            ))}
          </div>

          {tab === 'timetable' && (
            <div className="space-y-4">
              <form onSubmit={addSlot} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <select value={ttForm.day} onChange={e => setTtForm({ ...ttForm, day: e.target.value })} className="glass-input">
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
                <input type="time" value={ttForm.time} onChange={e => setTtForm({ ...ttForm, time: e.target.value })} className="glass-input" required />
                <input value={ttForm.subject} onChange={e => setTtForm({ ...ttForm, subject: e.target.value })} className="glass-input" placeholder="Subject" required />
                <input value={ttForm.room} onChange={e => setTtForm({ ...ttForm, room: e.target.value })} className="glass-input" placeholder="Room" />
                <button className="glass-button bg-white text-black px-4 py-2 text-sm col-span-2 sm:col-span-4">Add Slot</button>
              </form>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {allSlots.length ? allSlots.map(s => (
                  <div key={s._id} className="flex justify-between items-center text-sm border-b border-white/5 py-1">
                    <span>{s.day} · {s.time} · <strong>{s.subject}</strong>{s.room && ` · ${s.room}`}</span>
                    <button onClick={() => deleteSlot(s._id)} className="text-red-400 text-xs hover:underline">Remove</button>
                  </div>
                )) : <p className="text-sm text-secondary">No timetable slots yet.</p>}
              </div>
            </div>
          )}

          {tab === 'exams' && (
            <div className="space-y-4">
              <form onSubmit={addExam} className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input value={exForm.subject} onChange={e => setExForm({ ...exForm, subject: e.target.value })} className="glass-input" placeholder="Subject" required />
                <select value={exForm.exam_type} onChange={e => setExForm({ ...exForm, exam_type: e.target.value })} className="glass-input">
                  <option value="mid">Midterm</option>
                  <option value="final">Final</option>
                  <option value="quiz">Quiz</option>
                </select>
                <input type="date" value={exForm.exam_date} onChange={e => setExForm({ ...exForm, exam_date: e.target.value })} className="glass-input" required />
                <input value={exForm.venue} onChange={e => setExForm({ ...exForm, venue: e.target.value })} className="glass-input" placeholder="Venue (optional)" />
                <input value={exForm.notes} onChange={e => setExForm({ ...exForm, notes: e.target.value })} className="glass-input" placeholder="Notes (optional)" />
                <button className="glass-button bg-white text-black px-4 py-2 text-sm">Add Exam</button>
              </form>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {exams.length ? exams.map(e => (
                  <div key={e._id} className="flex justify-between items-center text-sm border-b border-white/5 py-1">
                    <span><span className="uppercase text-xs bg-white/10 px-1 rounded mr-2">{e.exam_type}</span>{e.subject} · {e.exam_date}{e.venue && ` · ${e.venue}`}</span>
                    <button onClick={() => deleteExam(e._id)} className="text-red-400 text-xs hover:underline">Remove</button>
                  </div>
                )) : <p className="text-sm text-secondary">No exams scheduled yet.</p>}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function SettingsPanel() {
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    appName: 'Acadify',
    version: '2.0.0',
    environment: 'production',
    minGpa: '2.0',
    minAttendance: '75',
    riskScoreCutoff: '60',
    emailHighRisk: true,
    emailLowAttendance: true,
    emailCounseling: false,
    sessionTimeout: '30',
    maxLoginAttempts: '5',
  });

  const set = (key, value) => setSettings(prev => ({ ...prev, [key]: value }));

  const save = (e) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={save} className="max-w-2xl space-y-8">

      {/* Platform Info */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Platform Info</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="App Name" value={settings.appName} onChange={e => set('appName', e.target.value)} />
          <Input label="Version" value={settings.version} onChange={e => set('version', e.target.value)} />
          <Select label="Environment" value={settings.environment} onChange={e => set('environment', e.target.value)}>
            <option value="production">Production</option>
            <option value="staging">Staging</option>
            <option value="development">Development</option>
          </Select>
        </div>
      </div>

      {/* Academic Thresholds */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Academic Thresholds</h3>
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Minimum GPA" type="number" min="0" max="4" step="0.1" value={settings.minGpa} onChange={e => set('minGpa', e.target.value)} />
          <Input label="Min Attendance (%)" type="number" min="0" max="100" value={settings.minAttendance} onChange={e => set('minAttendance', e.target.value)} />
          <Input label="Risk Score Cutoff" type="number" min="0" max="100" value={settings.riskScoreCutoff} onChange={e => set('riskScoreCutoff', e.target.value)} />
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Notification Preferences</h3>
        <div className="space-y-3">
          {[
            ['emailHighRisk', 'Email alert for high-risk students'],
            ['emailLowAttendance', 'Email alert for low attendance'],
            ['emailCounseling', 'Email alert for new counseling requests'],
          ].map(([key, label]) => (
            <label key={key} className="flex items-center gap-3 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={settings[key]} onChange={e => set(key, e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500" />
              {label}
            </label>
          ))}
        </div>
      </div>

      {/* Security */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-gray-400">Security</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Session Timeout (minutes)" type="number" min="5" max="480" value={settings.sessionTimeout} onChange={e => set('sessionTimeout', e.target.value)} />
          <Input label="Max Login Attempts" type="number" min="1" max="20" value={settings.maxLoginAttempts} onChange={e => set('maxLoginAttempts', e.target.value)} />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <button className="glass-button bg-white px-6 py-3 text-black">Save Settings</button>
        {saved && <span className="text-sm font-medium text-emerald-600">Settings saved successfully.</span>}
      </div>
    </form>
  );
}

function StudentForm({ data, isEdit, pathname, submit }) {
  const [selDept, setSelDept] = useState(data?.student?.department || '');
  const [selClass, setSelClass] = useState(data?.student?.class_name || '');
  const [showPwd, setShowPwd] = useState(false);
  const [allDepts, setAllDepts] = useState([]);
  const [classes, setClasses] = useState([]);

  useEffect(() => {
    api.get('/admin/api/departments').then(r => setAllDepts(r.data.departments || [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selDept) { setClasses([]); setSelClass(''); return; }
    api.get(`/admin/api/departments/classes?department=${encodeURIComponent(selDept)}`)
      .then(r => setClasses(r.data.classes || []))
      .catch(() => setClasses([]));
  }, [selDept]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = Object.fromEntries(new FormData(e.currentTarget));
    if (selClass) payload.class_name = selClass;
    submit(isEdit ? pathname : '/admin/students/add', payload, isEdit ? 'Student updated.' : 'Student created.');
  };

  return (
    <form className="grid gap-4 md:grid-cols-2" onSubmit={handleSubmit}>
      <Input label="Full name" name="name" required defaultValue={data?.user?.name || data?.student?.name || ''} />
      {!isEdit && <Input label="Email address" name="email" type="email" required />}
      {!isEdit && <Input label="Roll number" name="roll_no" required />}

      {/* Department — proper dropdown */}
      <label className="block space-y-2 text-sm font-medium text-gray-700">
        Department
        <select className="glass-input" name="department" required value={selDept}
          onChange={e => { setSelDept(e.target.value); setSelClass(''); setSelCourse(''); }}>
          <option value="">Select department</option>
          {allDepts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
      </label>

      {/* Class — dropdown from existing classes in this dept */}
      <label className="block space-y-2 text-sm font-medium text-gray-700">
        Class
        <select className="glass-input" value={selClass}
          onChange={e => { setSelClass(e.target.value); setSelCourse(''); }}
          disabled={!selDept}>
          <option value="">{!selDept ? 'Select department first' : classes.length ? 'Select class' : 'No classes yet'}</option>
          {classes.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </label>

      {/* Course / Subject — removed, auto-enroll in all class courses */}

      {/* Attendance */}
      <Input label="Attendance (%)" name="attendance_pct" type="number" min="0" max="100" step="0.1" defaultValue={data?.student?.attendance_pct ?? 80} />

      {/* Password with show/hide */}
      {!isEdit && (
        <label className="block space-y-2 text-sm font-medium text-gray-700">
          Password
          <div className="relative">
            <input className="glass-input pr-10" name="password" type={showPwd ? 'text' : 'password'} defaultValue="Student123!" minLength={6} required />
            <button type="button" onClick={() => setShowPwd(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </label>
      )}

      <div className="flex items-end gap-3 md:col-span-2">
        <button className="glass-button bg-white px-5 py-3 text-black">{isEdit ? 'Save changes' : 'Create student'}</button>
        <Link to="/admin/students" className="px-3 py-3 text-sm text-gray-500 hover:text-gray-800">Cancel</Link>
      </div>
    </form>
  );
}

function DepartmentsPanel({ data, submit }) {
  const [expandedDept, setExpandedDept] = useState(null);
  const [courses, setCourses] = useState([]);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [activeCourse, setActiveCourse] = useState(null);
  const [courseTab, setCourseTab] = useState('students');
  const [courseStudents, setCourseStudents] = useState([]);
  const [courseMarks, setCourseMarks] = useState([]);
  const [courseAttendance, setCourseAttendance] = useState([]);
  const [allStudents, setAllStudents] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [msg, setMsg] = useState('');
  const [depts, setDepts] = useState(data?.departments || []);
  const [courseForm, setCourseForm] = useState({ class_name: '', subject: '', teacher_id: '' });
  const [marksForm, setMarksForm] = useState({ student_id: '', mid_marks: '', final_marks: '', total_marks: '100', obtained_marks: '' });
  const [attForm, setAttForm] = useState({ student_id: '', date: new Date().toISOString().slice(0, 10), status: 'present' });

  // sync depts when data changes
  useEffect(() => { setDepts(data?.departments || []); }, [data]);

  const deleteDept = async (name) => {
    if (!window.confirm(`Delete department "${name}"? This will NOT delete students.`)) return;
    try {
      await api.post(`/admin/departments/${encodeURIComponent(name)}/delete`);
      setDepts(prev => prev.filter(d => d.name !== name));
      if (expandedDept === name) { setExpandedDept(null); setActiveCourse(null); }
      setMsg(`Department "${name}" deleted.`);
    } catch (err) { setMsg(err.response?.data?.message || 'Could not delete.'); }
  };

  const loadCourses = async (dept) => {
    setLoadingCourses(true);
    try {
      const { data: res } = await api.get(`/admin/api/courses?department=${encodeURIComponent(dept)}`);
      setCourses(res.courses || []);
    } catch { setCourses([]); }
    setLoadingCourses(false);
  };

  const loadCourseDetail = async (course) => {
    setActiveCourse(course);
    setCourseTab('students');
    const [s, m, a] = await Promise.all([
      api.get(`/admin/api/courses/${course._id}/students`).then(r => r.data.students || []).catch(() => []),
      api.get(`/admin/api/courses/${course._id}/marks`).then(r => r.data.marks || []).catch(() => []),
      api.get(`/admin/api/courses/${course._id}/attendance`).then(r => r.data.attendance || []).catch(() => []),
    ]);
    setCourseStudents(s);
    setCourseMarks(m);
    setCourseAttendance(a);
  };

  const toggleDept = async (dept) => {
    if (expandedDept === dept) { setExpandedDept(null); setActiveCourse(null); return; }
    setExpandedDept(dept);
    setActiveCourse(null);
    // load teachers & all students once
    if (!teachers.length) {
      const { data: ud } = await api.get('/admin/users').catch(() => ({ data: { users: [] } }));
      setTeachers((ud.users || []).filter(u => u.role === 'teacher'));
      setAllStudents(ud.students || []);
    }
    await loadCourses(dept);
  };

  const createCourse = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.post('/admin/api/courses', { ...courseForm, department: expandedDept });
      setMsg('Course created.');
      setCourseForm({ class_name: '', subject: '', teacher_id: '' });
      await loadCourses(expandedDept);
    } catch (err) { setMsg(err.response?.data?.message || 'Failed.'); }
  };

  const deleteCourse = async (courseId) => {
    if (!window.confirm('Delete this course and all its data?')) return;
    await api.post(`/admin/api/courses/${courseId}`);
    setActiveCourse(null);
    await loadCourses(expandedDept);
  };

  const enrollStudents = async (studentId, action) => {
    await api.post(`/admin/api/courses/${activeCourse._id}/enroll`, { student_ids: [studentId], action });
    const { data: res } = await api.get(`/admin/api/courses/${activeCourse._id}/students`);
    setCourseStudents(res.students || []);
    setMsg(action === 'enroll' ? 'Student enrolled.' : 'Student removed.');
  };

  const saveMarks = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.post(`/admin/api/courses/${activeCourse._id}/marks`, marksForm);
      setMsg('Marks saved.');
      const { data: res } = await api.get(`/admin/api/courses/${activeCourse._id}/marks`);
      setCourseMarks(res.marks || []);
      setMarksForm({ student_id: '', mid_marks: '', final_marks: '', total_marks: '100', obtained_marks: '' });
    } catch (err) { setMsg(err.response?.data?.message || 'Failed.'); }
  };

  const markAttendance = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      await api.post(`/admin/api/courses/${activeCourse._id}/attendance`, attForm);
      setMsg('Attendance marked.');
      const { data: res } = await api.get(`/admin/api/courses/${activeCourse._id}/attendance`);
      setCourseAttendance(res.attendance || []);
    } catch (err) { setMsg(err.response?.data?.message || 'Failed.'); }
  };

  const deptStudents = allStudents.filter(s => s.department === expandedDept);
  const enrolledIds = new Set(courseStudents.map(s => s._id));

  return (
    <div className="space-y-5">
      {/* Add Department */}
      <form className="flex max-w-xl gap-3" onSubmit={(e) => { e.preventDefault(); submit('/admin/departments/add', Object.fromEntries(new FormData(e.currentTarget)), 'Department created.'); e.currentTarget.reset(); }}>
        <input className="glass-input" name="name" placeholder="Department name" required />
        <button className="glass-button inline-flex items-center gap-2 bg-white px-4 text-black"><Plus className="h-4 w-4" />Add Dept</button>
      </form>

      {/* Departments List */}
      {depts.map(dept => (
        <div key={dept.name} className="border border-white/10 rounded-xl overflow-hidden">
          {/* Dept Header */}
          <div className="w-full flex items-center justify-between px-5 py-4 bg-white/5">
            <button onClick={() => toggleDept(dept.name)} className="flex items-center gap-3 flex-1 text-left hover:opacity-80 transition-opacity">
              <Building2 className="h-5 w-5 text-indigo-400" />
              <div>
                <span className="font-semibold text-gray-900">{dept.name}</span>
                <span className="ml-3 text-sm text-gray-500">{dept.total_students} students · GPA {Number(dept.avg_gpa || 0).toFixed(2)} · Att {Number(dept.avg_attendance || 0).toFixed(1)}%</span>
              </div>
            </button>
            <div className="flex items-center gap-2">
              {expandedDept === dept.name ? <ChevronDown className="h-4 w-4 text-gray-400" /> : <ChevronRight className="h-4 w-4 text-gray-400" />}
              <button onClick={() => deleteDept(dept.name)} className="ml-2 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50/10 rounded transition-colors" title="Delete department">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {expandedDept === dept.name && (
            <div className="p-5 space-y-5 border-t border-white/10">
              {msg && <p className="text-sm text-emerald-600 font-medium">{msg}</p>}

              {/* Add Course Form */}
              <form onSubmit={createCourse} className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <input className="glass-input" placeholder="Class (e.g. Class 9)" value={courseForm.class_name}
                  onChange={e => setCourseForm({ ...courseForm, class_name: e.target.value })} required />
                <input className="glass-input" placeholder="Subject (e.g. Mathematics)" value={courseForm.subject}
                  onChange={e => setCourseForm({ ...courseForm, subject: e.target.value })} required />
                <select className="glass-input" value={courseForm.teacher_id}
                  onChange={e => setCourseForm({ ...courseForm, teacher_id: e.target.value })}>
                  <option value="">Assign Teacher (optional)</option>
                  {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
                <button className="glass-button bg-white text-black px-4 py-2 text-sm inline-flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />Add Course
                </button>
              </form>

              {/* Courses Grid */}
              {loadingCourses ? <p className="text-sm text-gray-400">Loading courses...</p> : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {courses.length === 0 && <p className="text-sm text-gray-400 col-span-full">No courses yet. Add one above.</p>}
                  {courses.map(course => (
                    <div key={course._id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all ${
                        activeCourse?._id === course._id ? 'border-indigo-400 bg-indigo-50/10' : 'border-white/10 hover:border-white/30'
                      }`}
                      onClick={() => loadCourseDetail(course)}>
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold text-sm">{course.class_name}</p>
                          <p className="text-indigo-400 text-sm">{course.subject}</p>
                          <p className="text-xs text-gray-400 mt-1">{course.teacher_name || 'No teacher'} · {course.enrolled_count} students</p>
                        </div>
                        <button onClick={e => { e.stopPropagation(); deleteCourse(course._id); }}
                          className="text-red-400 hover:text-red-600 p-1">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Course Detail Panel */}
              {activeCourse && (
                <div className="border border-white/20 rounded-xl p-5 space-y-4 bg-white/5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{activeCourse.class_name} — {activeCourse.subject}</h3>
                    <div className="flex gap-2">
                      {['students', 'marks', 'attendance'].map(t => (
                        <button key={t} onClick={() => setCourseTab(t)}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize transition-colors ${
                            courseTab === t ? 'bg-indigo-500 text-white' : 'bg-white/10 text-gray-300 hover:bg-white/20'
                          }`}>{t}</button>
                      ))}
                    </div>
                  </div>

                  {/* Students Tab */}
                  {courseTab === 'students' && (
                    <div className="space-y-3">
                      <p className="text-xs text-gray-400 uppercase">Enrolled Students ({courseStudents.length})</p>
                      <Table
                        headers={['Name', 'Roll No', 'Action']}
                        rows={courseStudents.map(s => [
                          s.name, s.roll_no,
                          <button key={s._id} onClick={() => enrollStudents(s._id, 'unenroll')}
                            className="text-red-400 text-xs hover:underline">Remove</button>
                        ])}
                      />
                      <details className="mt-2">
                        <summary className="text-sm text-indigo-400 cursor-pointer">+ Enroll more students from {dept.name}</summary>
                        <div className="mt-2 space-y-1 max-h-48 overflow-y-auto border border-white/10 rounded-lg p-3">
                          {deptStudents.filter(s => !enrolledIds.has(s._id)).map(s => (
                            <div key={s._id} className="flex justify-between items-center text-sm py-1">
                              <span>{s.name} · {s.roll_no}</span>
                              <button onClick={() => enrollStudents(s._id, 'enroll')}
                                className="text-indigo-400 text-xs hover:underline">Enroll</button>
                            </div>
                          ))}
                          {deptStudents.filter(s => !enrolledIds.has(s._id)).length === 0 &&
                            <p className="text-xs text-gray-400">All department students enrolled.</p>}
                        </div>
                      </details>
                    </div>
                  )}

                  {/* Marks Tab */}
                  {courseTab === 'marks' && (
                    <div className="space-y-4">
                      <form onSubmit={saveMarks} className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <select className="glass-input col-span-2 sm:col-span-1" value={marksForm.student_id}
                          onChange={e => setMarksForm({ ...marksForm, student_id: e.target.value })} required>
                          <option value="">Select Student</option>
                          {courseStudents.map(s => <option key={s._id} value={s._id}>{s.name} · {s.roll_no}</option>)}
                        </select>
                        <input className="glass-input" type="number" placeholder="Mid Marks" value={marksForm.mid_marks}
                          onChange={e => setMarksForm({ ...marksForm, mid_marks: e.target.value })} required />
                        <input className="glass-input" type="number" placeholder="Final Marks" value={marksForm.final_marks}
                          onChange={e => setMarksForm({ ...marksForm, final_marks: e.target.value })} required />
                        <input className="glass-input" type="number" placeholder="Total Marks" value={marksForm.total_marks}
                          onChange={e => setMarksForm({ ...marksForm, total_marks: e.target.value })} required />
                        <input className="glass-input" type="number" placeholder="Obtained Marks" value={marksForm.obtained_marks}
                          onChange={e => setMarksForm({ ...marksForm, obtained_marks: e.target.value })} required />
                        <button className="glass-button bg-white text-black px-4 py-2 text-sm">Save Marks</button>
                      </form>
                      <Table
                        headers={['Student', 'Roll No', 'Mid', 'Final', 'Obtained', 'Total', '%', 'Grade']}
                        rows={courseMarks.map(m => [
                          m.student_name, m.roll_no,
                          m.mid_marks, m.final_marks,
                          m.obtained_marks, m.total_marks,
                          `${m.percentage}%`,
                          <span key={m._id} className={`font-bold ${
                            m.grade?.startsWith('A') ? 'text-emerald-500' :
                            m.grade?.startsWith('B') ? 'text-blue-400' :
                            m.grade?.startsWith('C') ? 'text-yellow-400' :
                            m.grade === 'F' ? 'text-red-500' : 'text-gray-300'
                          }`}>{m.grade}</span>
                        ])}
                      />
                      {courseMarks.length === 0 && <p className="text-sm text-gray-400">No marks entered yet.</p>}
                    </div>
                  )}

                  {/* Attendance Tab */}
                  {courseTab === 'attendance' && (
                    <div className="space-y-4">
                      <form onSubmit={markAttendance} className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <select className="glass-input" value={attForm.student_id}
                          onChange={e => setAttForm({ ...attForm, student_id: e.target.value })} required>
                          <option value="">Select Student</option>
                          {courseStudents.map(s => <option key={s._id} value={s._id}>{s.name} · {s.roll_no}</option>)}
                        </select>
                        <input type="date" className="glass-input" value={attForm.date}
                          onChange={e => setAttForm({ ...attForm, date: e.target.value })} required />
                        <select className="glass-input" value={attForm.status}
                          onChange={e => setAttForm({ ...attForm, status: e.target.value })}>
                          <option value="present">Present</option>
                          <option value="absent">Absent</option>
                        </select>
                        <button className="glass-button bg-white text-black px-4 py-2 text-sm">Mark</button>
                      </form>
                      <Table
                        headers={['Student', 'Roll No', 'Present', 'Absent', 'Total', 'Attendance %']}
                        rows={courseAttendance.map(a => [
                          a.student_name, a.roll_no,
                          <span key={`p-${a.student_id}`} className="text-emerald-400">{a.present}</span>,
                          <span key={`ab-${a.student_id}`} className="text-red-400">{a.absent}</span>,
                          a.total,
                          <span key={`pct-${a.student_id}`} className={a.percentage < 75 ? 'text-red-400 font-semibold' : 'text-emerald-400'}>
                            {a.percentage}%
                          </span>
                        ])}
                      />
                      {courseAttendance.length === 0 && <p className="text-sm text-gray-400">No attendance records yet.</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function PredictionsPanel({ data, submit, navigate }) {
  const [selStudent, setSelStudent] = useState('');
  const [running, setRunning] = useState(false);
  const riskFilter = new URLSearchParams(window.location.search).get('risk_level') || '';
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end gap-3 border-b border-gray-200 pb-5">
        <div className="flex-1 min-w-48">
          <label className="block text-sm font-medium text-gray-700 mb-1">Run AI Prediction for student</label>
          <select className="glass-input" value={selStudent} onChange={e => setSelStudent(e.target.value)}>
            <option value="">Choose a student</option>
            {(data?.students || []).map(s => <option key={s._id} value={s._id}>{s.name} · {s.roll_no}</option>)}
          </select>
        </div>
        <button disabled={!selStudent || running}
          onClick={async () => { setRunning(true); await submit(`/api/predict/${selStudent}`, {}, 'Prediction saved.'); setRunning(false); }}
          className="glass-button inline-flex items-center gap-2 bg-white px-5 py-3 text-black disabled:opacity-40">
          <RefreshCw className={`h-4 w-4 ${running ? 'animate-spin' : ''}`} />Run prediction
        </button>
      </div>
      <Select label="Filter by risk" value={riskFilter} onChange={e => navigate(`/admin/predictions${e.target.value ? `?risk_level=${e.target.value}` : ''}`)}>
        <option value="">All risk levels</option><option>HIGH</option><option>MEDIUM</option><option>LOW</option>
      </Select>
      <Table
        headers={['Student', 'Risk level', 'Score', 'Confidence', 'Forecast', 'Date', 'Actions']}
        rows={(data?.predictions || []).map(item => [
          item.student_name || item.student?.name || 'Student',
          item.risk_level,
          Number(item.risk_score || 0).toFixed(1),
          `${Number(item.confidence || 0).toFixed(1)}%`,
          item.performance_forecast?.grade_tier || '—',
          item.predicted_at || item.created_at || '—',
          <button key={`del-${item._id}`} onClick={() => submit(`/admin/predictions/${item._id}/delete`, {}, 'Prediction deleted.')} className="text-red-600 font-medium hover:underline">Delete</button>
        ])}
      />
      {!data?.predictions?.length && <Empty>No prediction records found.</Empty>}
    </div>
  );
}

function Empty({ children }) {
  return <p className="border-y border-gray-200 py-10 text-center text-gray-400">{children}</p>;
}
