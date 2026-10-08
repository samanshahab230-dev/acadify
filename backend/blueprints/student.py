from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, send_from_directory
from flask_login import login_required, current_user
from decorators import role_required
from models.student import StudentModel
from models.prediction import PredictionModel
from models.notification import NotificationModel
from models.attendance import AttendanceModel
from models.timetable import TimetableModel, DAYS
from models.assignment import AssignmentModel
from models.counseling import CounselingModel
from models.activity import ActivityModel
from models.exam import ExamModel
from models.notes import NotesModel
from models.marks import MarksModel
from models.alert import AlertModel
from models.report import ReportModel
from ml.predictor import predict_student_risk
from werkzeug.security import generate_password_hash
from werkzeug.utils import secure_filename
import os
import uuid
import datetime

student_bp = Blueprint('student', __name__, url_prefix='/student')
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads', 'assignments')
ALLOWED = {'pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'zip', 'txt'}


def _get_student_or_abort():
    student = StudentModel.get_by_user_id(current_user.id)
    if not student:
        flash('Student profile not found. Please contact administration.', 'danger')
        return None
    return student


@student_bp.route('/dashboard')
@login_required
@role_required('student')
def dashboard():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student profile not found.'}), 404

    from models.db import get_db
    db = get_db()
    user = db.users.find_one({'_id': student.get('user_id')})

    latest_pred = PredictionModel.get_latest_by_student(student['_id'])
    today_classes = TimetableModel.get_today_classes(student['_id'])
    upcoming_assignments = AssignmentModel.get_upcoming(student['_id'], days=7)
    current_gpa = float(student.get('gpa', 0.0))

    return jsonify({
        'student': {
            '_id': str(student['_id']),
            'roll_no': student.get('roll_no', ''),
            'department': student.get('department', ''),
            'semester': student.get('semester', 1),
            'gpa': current_gpa,
            'attendance_pct': round(float(student.get('attendance_pct', 0)), 2),
            'risk_level': student.get('risk_level', 'LOW'),
            'assignments_submitted_pct': student.get('assignments_submitted_pct', 0),
            'user': {'name': user.get('name', 'Student') if user else 'Student'},
        },
        'prediction': {
            'risk_score': latest_pred.get('risk_score'),
            'confidence': latest_pred.get('confidence'),
            'performance_forecast': latest_pred.get('performance_forecast'),
            'recommendations': latest_pred.get('recommendations', []),
        } if latest_pred else None,
        'today_classes': [{
            'subject': c.get('subject', ''), 'time': c.get('time', ''), 'type': c.get('type', '')
        } for c in (today_classes or [])],
        'upcoming_assignments': [{
            '_id': str(a['_id']), 'title': a.get('title', ''),
            'subject': a.get('subject', ''), 'due_date': str(a.get('due_date', ''))
        } for a in (upcoming_assignments or [])],
        'current_gpa': current_gpa,
    })


@student_bp.route('/profile', methods=['GET', 'POST'])
@login_required
@role_required('student')
def profile():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        department = (data.get('department') or request.form.get('department', '')).strip()
        semester = data.get('semester') or request.form.get('semester')
        phone = (data.get('phone') or request.form.get('phone', '')).strip()
        bio = (data.get('bio') or request.form.get('bio', '')).strip()
        if department and semester:
            StudentModel.update(student['_id'], {
                'department': department,
                'semester': int(semester),
                'phone': phone,
                'bio': bio
            })
            return jsonify({'success': True, 'message': 'Profile updated successfully.'})
        return jsonify({'success': False, 'message': 'Department and semester are required.'}), 400
    from models.db import get_db
    db = get_db()
    user = db.users.find_one({'_id': student.get('user_id')})
    return jsonify({
        'student': {
            '_id': str(student['_id']),
            'roll_no': student.get('roll_no', ''),
            'department': student.get('department', ''),
            'semester': student.get('semester', 1),
            'gpa': float(student.get('gpa', 0.0)),
            'attendance_pct': float(student.get('attendance_pct', 0.0)),
            'risk_level': student.get('risk_level', 'LOW'),
            'phone': student.get('phone', ''),
            'bio': student.get('bio', ''),
            'user': {'name': user.get('name', '') if user else '', 'email': user.get('email', '') if user else ''},
        }
    })


@student_bp.route('/academics')
@login_required
@role_required('student')
def academics():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    latest_pred = PredictionModel.get_latest_by_student(student['_id'])
    subjects = AttendanceModel.get_subjects(student['_id'])
    return jsonify({
        'student': {
            '_id': str(student['_id']),
            'gpa': float(student.get('gpa', 0.0)),
            'attendance_pct': float(student.get('attendance_pct', 0.0)),
            'risk_level': student.get('risk_level', 'LOW'),
            'semester': student.get('semester', 1),
            'department': student.get('department', ''),
        },
        'prediction': {
            'risk_score': latest_pred.get('risk_score'),
            'confidence': latest_pred.get('confidence'),
            'risk_level': latest_pred.get('risk_level'),
            'recommendations': latest_pred.get('recommendations', []),
        } if latest_pred else None,
        'subjects': [{'subject': s['subject'], 'attended': s.get('attended', 0), 'total_classes': s.get('total_classes', 0)} for s in subjects],
    })


# ─── ATTENDANCE ────────────────────────────────────────────────────────────────

@student_bp.route('/attendance')
@login_required
@role_required('student')
def attendance():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    subjects = AttendanceModel.get_subjects(student['_id'])
    records = AttendanceModel.get_records(student['_id'], limit=60)
    streak = AttendanceModel.get_streak(student['_id'])
    student = StudentModel.get_by_user_id(current_user.id)
    return jsonify({
        'student': {'attendance_pct': round(float(student.get('attendance_pct', 0)), 2)},
        'subjects': [{'subject': s['subject'], 'attended': s.get('attended', 0), 'total_classes': s.get('total_classes', 0)} for s in subjects],
        'records': [{'subject': r.get('subject', ''), 'status': r.get('status', ''), 'date': str(r.get('date', r.get('created_at', '')))[:10]} for r in records],
        'streak': streak,
    })


# ─── TIMETABLE ─────────────────────────────────────────────────────────────────

@student_bp.route('/timetable')
@login_required
@role_required('student')
def timetable():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    grouped = TimetableModel.get_timetable(student['_id'])
    serialized = {}
    for day, slots in grouped.items():
        serialized[day] = [{
            '_id': str(s['_id']), 'subject': s.get('subject', ''),
            'time': s.get('time', ''), 'room': s.get('room', '')
        } for s in slots]
    return jsonify({'timetable': serialized, 'days': DAYS})


# ─── ASSIGNMENTS ───────────────────────────────────────────────────────────────

@student_bp.route('/assignments', methods=['GET', 'POST'])
@login_required
@role_required('student')
def assignments():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    if request.method == 'POST':
        action = request.form.get('action') or (request.get_json(silent=True) or {}).get('action')
        assignment_id = request.form.get('assignment_id') or (request.get_json(silent=True) or {}).get('assignment_id')
        if action == 'submit':
            note = (request.form.get('submission_note') or '').strip()
            sub_file_path, sub_file_name = None, None
            f = request.files.get('file')
            if f and f.filename:
                ext = f.filename.rsplit('.', 1)[-1].lower()
                if ext in ALLOWED:
                    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
                    fname = f"{uuid.uuid4().hex}.{ext}"
                    f.save(os.path.join(UPLOAD_FOLDER, fname))
                    sub_file_path, sub_file_name = fname, secure_filename(f.filename)
            AssignmentModel.submit(assignment_id, note, sub_file_path, sub_file_name)
            return jsonify({'success': True, 'message': 'Assignment submitted.'})
        return jsonify({'success': False, 'message': 'Unknown action.'}), 400

    all_assignments = AssignmentModel.get_by_student(student['_id'])
    today = datetime.date.today().isoformat()
    return jsonify({
        'assignments': [{
            '_id': str(a['_id']), 'title': a.get('title', ''), 'subject': a.get('subject', ''),
            'due_date': str(a.get('due_date', ''))[:10], 'status': a.get('status', 'pending'),
            'priority': a.get('priority', 'medium'), 'description': a.get('description', ''),
            'file_name': a.get('file_name'), 'file_path': a.get('file_path'),
            'submitted_at': str(a.get('submitted_at', '') or '')[:10],
            'submission_note': a.get('submission_note', ''),
            'submission_file_name': a.get('submission_file_name'),
        } for a in all_assignments],
        'today': today,
    })


@student_bp.route('/assignments/file/<path:fname>')
@login_required
def download_assignment_file(fname):
    return send_from_directory(UPLOAD_FOLDER, fname, as_attachment=True)


# ─── LEADERBOARD ───────────────────────────────────────────────────────────────

@student_bp.route('/leaderboard')
@login_required
@role_required('student')
def leaderboard():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    from models.db import get_db
    db = get_db()
    all_students = list(db.students.find({'department': student['department']}).sort('gpa', -1))
    board = []
    my_rank = None
    for i, s in enumerate(all_students, 1):
        user = db.users.find_one({'_id': s.get('user_id')})
        is_me = str(s['_id']) == str(student['_id'])
        if is_me:
            my_rank = i
        board.append({
            'rank': i,
            'name': user.get('name', 'Student') if user else 'Student',
            'roll_no': s.get('roll_no', ''),
            'gpa': s.get('gpa', 0.0),
            'attendance_pct': s.get('attendance_pct', 0.0),
            'risk_level': s.get('risk_level', 'LOW'),
            'is_me': is_me
        })

    return jsonify({'board': board, 'my_rank': my_rank})


# ─── GPA SIMULATOR ─────────────────────────────────────────────────────────────

@student_bp.route('/gpa-simulator', methods=['GET', 'POST'])
@login_required
@role_required('student')
def gpa_simulator():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    subjects = AttendanceModel.get_subjects(student['_id'])
    if not subjects:
        AttendanceModel.seed_subjects(
            student['_id'], student.get('department', ''), student.get('semester', 1)
        )
        subjects = AttendanceModel.get_subjects(student['_id'])

    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        grades = []
        credits = []
        for s in subjects:
            g = data.get(f"grade_{s['subject']}", '')
            c = data.get(f"credit_{s['subject']}", '3')
            if g:
                try:
                    grades.append(float(g))
                    credits.append(float(c))
                except ValueError:
                    pass
        result = None
        if grades and credits:
            total_points = sum(g * c for g, c in zip(grades, credits))
            total_credits = sum(credits)
            simulated_gpa = round(total_points / total_credits, 2) if total_credits > 0 else 0.0
            result = {
                'simulated_gpa': simulated_gpa,
                'total_credits': total_credits,
                'improvement': round(simulated_gpa - float(student.get('gpa', 0.0)), 2)
            }
        return jsonify({'result': result})

    return jsonify({
        'subjects': [{'subject': s['subject']} for s in subjects],
        'current_gpa': float(student.get('gpa', 0.0)),
    })


# ─── STUDY RESOURCES ───────────────────────────────────────────────────────────

@student_bp.route('/resources')
@login_required
@role_required('student')
def resources():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    subjects = AttendanceModel.get_subjects(student['_id'])
    return jsonify({'subjects': [{'subject': s['subject']} for s in subjects]})


# ─── EXISTING ROUTES ───────────────────────────────────────────────────────────

@student_bp.route('/predict', methods=['GET'])
@login_required
@role_required('student')
def predict_form():
    student = _get_student_or_abort()
    if not student:
        return redirect(url_for('main.index'))
    return render_template('student/predict_form.html', student=student)


@student_bp.route('/predictions')
@login_required
@role_required('student')
def predictions():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    pred_history = PredictionModel.get_by_student(student['_id'], limit=20)
    return jsonify({
        'predictions': [{
            '_id': str(p['_id']),
            'risk_level': p.get('risk_level', ''),
            'risk_score': p.get('risk_score', 0),
            'confidence': p.get('confidence', 0),
            'performance_forecast': p.get('performance_forecast'),
            'recommendations': p.get('recommendations', []),
            'predicted_at': str(p.get('predicted_at', p.get('created_at', ''))),
        } for p in pred_history]
    })


@student_bp.route('/predictions/<id>/delete', methods=['POST'])
@login_required
@role_required('student')
def prediction_delete(id):
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    from models.db import get_db
    from bson.objectid import ObjectId
    db = get_db()
    pred = db.predictions.find_one({'_id': ObjectId(id), 'student_id': student['_id']})
    if not pred:
        return jsonify({'error': 'Prediction not found or access denied.'}), 404
    PredictionModel.delete(id)
    return jsonify({'success': True, 'message': 'Prediction deleted.'})


@student_bp.route('/notifications')
@login_required
@role_required('student')
def notifications():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    notifs = NotificationModel.get_by_student(student['_id'], limit=50)
    for n in notifs:
        if not n.get('read'):
            NotificationModel.mark_as_read(n['_id'])
    return jsonify({
        'notifications': [{
            '_id': str(n['_id']),
            'message': n.get('message', ''),
            'notif_type': n.get('notif_type', 'info'),
            'read': n.get('read', False),
            'created_at': str(n.get('created_at', '')),
        } for n in notifs]
    })


@student_bp.route('/settings', methods=['GET', 'POST'])
@login_required
@role_required('student')
def settings():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        action = data.get('action') or request.form.get('action')
        if action == 'password':
            current_pwd = data.get('current_password') or request.form.get('current_password')
            new_pwd = data.get('new_password') or request.form.get('new_password')
            if not current_user.check_password(current_pwd):
                return jsonify({'success': False, '_flashes': [['danger', 'Current password is incorrect.']]}), 400
            if not new_pwd or len(new_pwd) < 6:
                return jsonify({'success': False, '_flashes': [['danger', 'New password must be at least 6 characters long.']]}), 400
            from models.db import get_db
            from bson.objectid import ObjectId
            db = get_db()
            db.users.update_one(
                {'_id': ObjectId(current_user.id)},
                {'$set': {'password_hash': generate_password_hash(new_pwd)}}
            )
            return jsonify({'success': True, '_flashes': [['success', 'Password updated successfully.']]})
        return jsonify({'success': False, 'message': 'Unknown action.'}), 400
    return jsonify({'success': True})


@student_bp.route('/pass', methods=['GET', 'POST'])
@login_required
@role_required('student')
def campus_pass():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        action = data.get('action') or request.form.get('action')
        if action == 'apply':
            from models.db import get_db
            from bson.objectid import ObjectId
            db = get_db()
            db.students.update_one(
                {'_id': student['_id']},
                {'$set': {'campus_pass_status': 'APPROVED', 'pass_issued_at': '2026-2027'}}
            )
            student = StudentModel.get_by_user_id(current_user.id)
    from models.db import get_db
    db = get_db()
    user = db.users.find_one({'_id': student.get('user_id')})
    return jsonify({
        'student': {
            '_id': str(student['_id']),
            'name': user.get('name', 'Student') if user else 'Student',
            'roll_no': student.get('roll_no', ''),
            'department': student.get('department', ''),
            'semester': student.get('semester', 1),
            'campus_pass_status': student.get('campus_pass_status', ''),
            'pass_issued_at': student.get('pass_issued_at', ''),
        }
    })


# ─── EXAM COUNTDOWN ───────────────────────────────────────────────────────────

@student_bp.route('/exams')
@login_required
@role_required('student')
def exams():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    all_exams = ExamModel.get_by_student(student['_id'])
    today = datetime.date.today().isoformat()
    return jsonify({
        'exams': [{
            '_id': str(e['_id']), 'subject': e.get('subject', ''),
            'exam_type': e.get('exam_type', ''), 'exam_date': e.get('exam_date', ''),
            'venue': e.get('venue', ''), 'notes': e.get('notes', '')
        } for e in all_exams],
        'today': today,
    })


# ─── QUICK NOTES ───────────────────────────────────────────────────────────────

@student_bp.route('/notes', methods=['GET', 'POST'])
@login_required
@role_required('student')
def notes():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    subjects = [s['subject'] for s in AttendanceModel.get_subjects(student['_id'])]

    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        action = data.get('action') or request.form.get('action')
        subject = (data.get('subject') or request.form.get('subject', '')).strip()
        if action == 'save':
            content = (data.get('content') or request.form.get('content', '')).strip()
            if subject:
                NotesModel.save(student['_id'], subject, content)
            return jsonify({'success': True, 'message': 'Note saved.'})
        elif action == 'delete':
            NotesModel.delete(student['_id'], subject)
            return jsonify({'success': True, 'message': 'Note deleted.'})
        return jsonify({'success': False, 'message': 'Unknown action.'}), 400

    all_notes = NotesModel.get_by_student(student['_id'])
    active_subject = request.args.get('subject', subjects[0] if subjects else '')
    active_note = NotesModel.get_by_subject(student['_id'], active_subject) if active_subject else None
    return jsonify({
        'subjects': subjects,
        'active_subject': active_subject,
        'active_note': {'subject': active_note.get('subject', ''), 'content': active_note.get('content', '')} if active_note else None,
        'all_notes': [{'subject': n.get('subject', ''), 'content': n.get('content', '')} for n in all_notes],
    })


# ─── COUNSELING / HELP REQUESTS ────────────────────────────────────────────────

# ─── MARKS ────────────────────────────────────────────────────────────────────

@student_bp.route('/marks')
@login_required
@role_required('student')
def marks():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    all_marks = MarksModel.get_by_student(student['_id'])
    analytics = MarksModel.get_analytics(student['_id'])
    return jsonify({
        'marks': [{
            '_id': str(m['_id']),
            'subject': m.get('subject', ''),
            'marks_obtained': m.get('marks_obtained', 0),
            'total_marks': m.get('total_marks', 100),
            'exam_type': m.get('exam_type', ''),
            'created_at': m['created_at'].strftime('%Y-%m-%d') if m.get('created_at') else '',
        } for m in all_marks],
        'analytics': analytics
    })


@student_bp.route('/api/marks')
@login_required
@role_required('student')
def api_marks():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    marks = MarksModel.get_by_student(student['_id'])
    analytics = MarksModel.get_analytics(student['_id'])
    return jsonify({
        'marks': [{
            **m,
            '_id': str(m['_id']),
            'student_id': str(m['student_id']),
            'teacher_id': str(m.get('teacher_id') or ''),
            'created_at': m['created_at'].strftime('%Y-%m-%d') if m.get('created_at') else ''
        } for m in marks],
        'analytics': analytics
    })


# ─── ALERTS ───────────────────────────────────────────────────────────────────

@student_bp.route('/api/alerts')
@login_required
@role_required('student')
def api_alerts():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    alerts = AlertModel.get_by_student(student['_id'])
    AlertModel.mark_read(student['_id'])
    return jsonify({'alerts': alerts})


# ─── REPORT ───────────────────────────────────────────────────────────────────

@student_bp.route('/api/report')
@login_required
@role_required('student')
def api_report():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404
    report = ReportModel.get_student_report(student['_id'])
    return jsonify({'report': report})


@student_bp.route('/counseling', methods=['GET', 'POST'])
@login_required
@role_required('student')
def counseling():
    student = _get_student_or_abort()
    if not student:
        return jsonify({'error': 'Student not found'}), 404

    if request.method == 'POST':
        data = request.get_json(silent=True) or {}
        subject = (data.get('subject') or request.form.get('subject', '')).strip()
        message = (data.get('message') or request.form.get('message', '')).strip()
        urgency = data.get('urgency') or request.form.get('urgency', 'normal')
        evidence = request.files.get('evidence')
        metadata = {}
        if evidence and evidence.filename:
            extension = os.path.splitext(evidence.filename)[1].lower()
            if extension not in {'.pdf', '.jpg', '.jpeg', '.png'}:
                return jsonify({'success': False, 'message': 'Evidence must be a PDF or image file.'}), 400
            filename = f"wellness_{uuid.uuid4().hex}{extension}"
            upload_folder = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads')
            os.makedirs(upload_folder, exist_ok=True)
            evidence.save(os.path.join(upload_folder, secure_filename(filename)))
            metadata = {'evidence_filename': filename, 'evidence_original_name': secure_filename(evidence.filename)}
        expression = request.form.get('expression_observation', '').strip()
        self_check_report = request.form.get('self_check_report', '').strip()
        if self_check_report:
            metadata['self_check_report'] = self_check_report[:12000]
        if not subject or not message:
            return jsonify({'success': False, 'message': 'Please fill in all fields.'}), 400
        if expression:
            message = f"{message}\n\nSelf-check observation (not medical evidence): {expression}"
        CounselingModel.create(student['_id'], subject, message, urgency, metadata)
        ActivityModel.log('counseling', 'Help Request Submitted',
                          f"{current_user.name} submitted: {subject}",
                          student_id=student['_id'])
        NotificationModel.create(student['_id'],
                                 f'Your counseling request "{subject}" has been submitted. Admin will respond shortly.',
                                 'info')
        return jsonify({'success': True, 'message': 'Your request has been submitted. Admin will respond shortly.'})

    my_requests = CounselingModel.get_by_student(student['_id'])
    return jsonify({
        'requests': [{
            '_id': str(r['_id']),
            'subject': r.get('subject', ''),
            'message': r.get('message', ''),
            'urgency': r.get('urgency', 'normal'),
            'status': r.get('status', 'open'),
            'reply': r.get('reply', ''),
            'created_at': str(r.get('created_at', '')),
        } for r in my_requests]
    })
