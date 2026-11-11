import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Loader from './components/Loader';

const Landing        = lazy(() => import('./pages/main/Landing'));
const Login          = lazy(() => import('./pages/auth/Login'));
const ForgotPassword = lazy(() => import('./pages/auth/ForgotPassword'));
const AppLayout      = lazy(() => import('./layouts/AppLayout'));

// Student
const StudentDashboard  = lazy(() => import('./pages/student/Dashboard'));
const Timetable         = lazy(() => import('./pages/student/Timetable'));
const Assignments       = lazy(() => import('./pages/student/Assignments'));
const StudentAttendance = lazy(() => import('./pages/student/StudentAttendance'));
const Academics         = lazy(() => import('./pages/student/Academics'));
const Exams             = lazy(() => import('./pages/student/Exams'));
const Counseling        = lazy(() => import('./pages/student/Counseling'));
const Profile           = lazy(() => import('./pages/student/Profile'));
const StudentMarks      = lazy(() => import('./pages/student/Marks'));
const PortalFeatures    = lazy(() => import('./pages/student/PortalFeatures'));

// Teacher
const TeacherDashboard = lazy(() => import('./pages/teacher/Dashboard'));
const TeacherPages     = lazy(() => import('./pages/teacher/TeacherPages'));

// Admin
const AdminDashboard = lazy(() => import('./pages/admin/Dashboard'));
const AdminPortal    = lazy(() => import('./pages/admin/AdminPortal'));
const AdminReports   = lazy(() => import('./pages/admin/Reports'));

// Parent
const ParentDashboard = lazy(() => import('./pages/parent/Dashboard'));

// Face
const FaceAttendance = lazy(() => import('./pages/face/FaceAttendance'));
const FaceRegister   = lazy(() => import('./pages/face/FaceRegister'));
const FaceHistory    = lazy(() => import('./pages/face/FaceHistory'));
const FaceWellness   = lazy(() => import('./pages/face/FaceWellness'));

// Lazy-loaded named exports from PortalFeatures & TeacherPages
const lazyNamed = (importFn, name) =>
  lazy(() => importFn().then(m => ({ default: m[name] })));

const Predictions     = lazyNamed(() => import('./pages/student/PortalFeatures'), 'Predictions');
const Notifications   = lazyNamed(() => import('./pages/student/PortalFeatures'), 'Notifications');
const Resources       = lazyNamed(() => import('./pages/student/PortalFeatures'), 'Resources');
const StudentSettings = lazyNamed(() => import('./pages/student/PortalFeatures'), 'StudentSettings');
const StudentNotes    = lazyNamed(() => import('./pages/student/PortalFeatures'), 'StudentNotes');

const TeacherAttendancePage  = lazyNamed(() => import('./pages/teacher/TeacherPages'), 'TeacherAttendancePage');
const TeacherMarksPage       = lazyNamed(() => import('./pages/teacher/TeacherPages'), 'TeacherMarksPage');
const TeacherVerifyPage      = lazyNamed(() => import('./pages/teacher/TeacherPages'), 'TeacherVerifyPage');

function App() {
  return (
    <Router>
      <Suspense fallback={<Loader onDone={() => {}} />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />

          <Route element={<AppLayout />}>
            {/* Student */}
            <Route path="/student/dashboard"    element={<StudentDashboard />} />
            <Route path="/student/timetable"    element={<Timetable />} />
            <Route path="/student/assignments"  element={<Assignments />} />
            <Route path="/student/attendance"   element={<StudentAttendance />} />
            <Route path="/student/academics"    element={<Academics />} />
            <Route path="/student/exams"        element={<Exams />} />
            <Route path="/student/counseling"   element={<Counseling />} />
            <Route path="/student/profile"      element={<Profile />} />
            <Route path="/student/marks"        element={<StudentMarks />} />
            <Route path="/student/predictions"  element={<Predictions />} />
            <Route path="/student/notifications" element={<Notifications />} />
            <Route path="/student/resources"    element={<Resources />} />
            <Route path="/student/notes"        element={<StudentNotes />} />
            <Route path="/student/settings"     element={<StudentSettings />} />

            {/* Teacher */}
            <Route path="/teacher/dashboard"   element={<TeacherDashboard />} />
            <Route path="/teacher/attendance"  element={<TeacherAttendancePage />} />
            <Route path="/teacher/marks"       element={<TeacherMarksPage />} />
            <Route path="/teacher/verify"      element={<TeacherVerifyPage />} />

            {/* Parent */}
            <Route path="/parent/dashboard" element={<ParentDashboard />} />

            {/* Admin */}
            <Route path="/admin/dashboard"        element={<AdminDashboard />} />
            <Route path="/admin/reports"          element={<AdminReports />} />
            <Route path="/admin/students/*"       element={<AdminPortal />} />
            <Route path="/admin/predictions"      element={<AdminPortal />} />
            <Route path="/admin/counseling"       element={<AdminPortal />} />
            <Route path="/admin/interventions"    element={<AdminPortal />} />
            <Route path="/admin/departments"      element={<AdminPortal />} />
            <Route path="/admin/notifications"    element={<AdminPortal />} />
            <Route path="/admin/users"            element={<AdminPortal />} />
            <Route path="/admin/report-card/:id"  element={<AdminPortal />} />
            <Route path="/admin/settings"         element={<AdminPortal />} />
            <Route path="/admin/schedule"         element={<AdminPortal />} />

            {/* Face */}
            <Route path="/face/attendance" element={<FaceAttendance />} />
            <Route path="/face/register"   element={<FaceRegister />} />
            <Route path="/face/history"    element={<FaceHistory />} />
            <Route path="/face/wellness"   element={<FaceWellness />} />
          </Route>
        </Routes>
      </Suspense>
    </Router>
  );
}

export default App;
