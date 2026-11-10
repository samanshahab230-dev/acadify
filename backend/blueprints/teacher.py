import datetime
import os, uuid
from bson import ObjectId
from flask import Blueprint, jsonify, request, send_from_directory
from flask_login import current_user, login_required
from werkzeug.utils import secure_filename

from decorators import role_required
from models.assignment import AssignmentModel
from models.attendance import AttendanceModel
from models.marks import MarksModel
from models.alert import AlertModel
from models.timetable import TimetableModel, DAYS
from models.exam import ExamModel
from models.db import get_db

teacher_bp = Blueprint('teacher', __name__, url_prefix='/teacher')

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'uploads', 'assignments')
ALLOWED = {'pdf', 'doc', 'docx', 'png', 'jpg', 'jpeg', 'zip', 'txt'}

def _save_file(file):
    os.makedirs(UPLOAD_FOLDER, exist_ok=True)
    ext = file.filename.rsplit('.', 1)[-1].lower()
    if ext not in ALLOWED:
        return None, None
    fname = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(UPLOAD_FOLDER, fname))
    return fname, secure_filename(file.filename)


def _assigned_student(student_id):
    try:
        student = get_db().students.find_one({
            '_id': ObjectId(student_id),
            'teacher_ids': current_user._id,
        })
    except Exception:
        return None
    if student:
        user = get_db().users.find_one({'_id': student.get('user_id')})
        student['name'] = user.get('name', 'Student') if user else 'Student'
        subjects = AttendanceModel.get_subjects(student['_id'])
        if not subjects:
            AttendanceModel.seed_subjects(
                student['_id'], student.get('department', ''), student.get('semester', 1)
            )
            subjects = AttendanceModel.get_subjects(student['_id'])
        student['subjects'] = subjects
    return student


@teacher_bp.route('/dashboard')
@login_required
@role_required('teacher')
def dashboard():
    db = get_db()
    try:
        uid = ObjectId(current_user.id)
    except Exception:
        uid = current_user._id
    students = list(db.students.find({'teacher_ids': uid}))
    result = []
    for student in students:
        user = db.users.find_one({'_id': student.get('user_id')})
        subjects = AttendanceModel.get_subjects(student['_id'])
        assignments = AssignmentModel.get_by_student(student['_id'])[:5]
        attendance_records = AttendanceModel.get_records(student['_id'], limit=5)
        result.append({
            '_id': str(student['_id']),
            'name': user.get('name', 'Student') if user else 'Student',
            'roll_no': student.get('roll_no', ''),
            'department': student.get('department', ''),
            'class_name': student.get('class_name', ''),
            'attendance_pct': round(float(student.get('attendance_pct', 0)), 2),
            'risk_level': student.get('risk_level', 'LOW'),
            'subjects': [{'subject': s['subject'], 'attended': s.get('attended', 0), 'total_classes': s.get('total_classes', 0)} for s in subjects],
            'assignments': [{'_id': str(a['_id']), 'title': a.get('title', ''), 'subject': a.get('subject', ''), 'due_date': str(a.get('due_date', ''))} for a in assignments],
            'attendance_records': [{'subject': r.get('subject', ''), 'status': r.get('status', ''), 'date': str(r.get('date', r.get('created_at', '')))[:10]} for r in attendance_records],
        })
    result.sort(key=lambda x: x['name'])
    return jsonify({'success': True, 'students': result})


@teacher_bp.route('/attendance', methods=['POST'])
@login_required
@role_required('teacher')
def mark_attendance():
    data = request.get_json(silent=True) or request.form
    student = _assigned_student(data.get('student_id', ''))
    if not student:
        return jsonify({'success': False, 'message': 'Student is not assigned to this teacher.'}), 403

    subject = (data.get('subject') or '').strip()
    status = data.get('status', 'present')
    date = data.get('date') or datetime.date.today().isoformat()
    if subject not in {item['subject'] for item in student['subjects']} or status not in {'present', 'absent'}:
        return jsonify({'success': False, 'message': 'Choose an assigned subject and a valid attendance status.'}), 400

    ok, message = AttendanceModel.mark_attendance(student['_id'], subject, status, date)
    return jsonify({'success': ok, 'message': message}), (200 if ok else 409)


@teacher_bp.route('/assignments', methods=['POST'])
@login_required
@role_required('teacher')
def create_assignment():
    student = _assigned_student(request.form.get('student_id', '') or (request.get_json(silent=True) or {}).get('student_id', ''))
    if not student:
        return jsonify({'success': False, 'message': 'Student is not assigned to this teacher.'}), 403

    data = request.form
    title = (data.get('title') or '').strip()
    subject = (data.get('subject') or '').strip()
    due_date = data.get('due_date', '')
    if not title or subject not in {item['subject'] for item in student['subjects']} or not due_date:
        return jsonify({'success': False, 'message': 'Enter a title, assigned subject, and due date.'}), 400

    file_path, file_name = None, None
    f = request.files.get('file')
    if f and f.filename:
        file_path, file_name = _save_file(f)
        if not file_path:
            return jsonify({'success': False, 'message': 'Invalid file type.'}), 400

    AssignmentModel.create(
        student['_id'], title, subject, due_date,
        data.get('priority', 'medium'), (data.get('description') or '').strip(),
        teacher_id=str(current_user._id), file_path=file_path, file_name=file_name
    )
    return jsonify({'success': True, 'message': 'Assignment created.'}), 201


@teacher_bp.route('/assignments/file/<path:fname>')
@login_required
def download_assignment_file(fname):
    return send_from_directory(UPLOAD_FOLDER, fname, as_attachment=True)


@teacher_bp.route('/assignments/<student_id>')
@login_required
@role_required('teacher')
def get_student_assignments(student_id):
    student = _assigned_student(student_id)
    if not student:
        return jsonify({'success': False, 'message': 'Student not assigned.'}), 403
    assignments = AssignmentModel.get_by_student(student['_id'])
    return jsonify({'success': True, 'assignments': [{
        '_id': str(a['_id']), 'title': a.get('title', ''), 'subject': a.get('subject', ''),
        'due_date': str(a.get('due_date', ''))[:10], 'status': a.get('status', 'pending'),
        'priority': a.get('priority', 'medium'), 'description': a.get('description', ''),
        'submitted_at': str(a.get('submitted_at', '') or '')[:10],
        'submission_note': a.get('submission_note', '')
    } for a in assignments]})


@teacher_bp.route('/timetable', methods=['POST'])
@login_required
@role_required('teacher')
def add_timetable_slot():
    data = request.get_json(silent=True) or request.form
    student = _assigned_student(data.get('student_id', ''))
    if not student:
        return jsonify({'success': False, 'message': 'Student not assigned.'}), 403
    day = data.get('day', '').strip()
    time = data.get('time', '').strip()
    subject = (data.get('subject') or '').strip()
    room = (data.get('room') or '').strip()
    if not day or not time or not subject:
        return jsonify({'success': False, 'message': 'Day, time, and subject required.'}), 400
    TimetableModel.add_slot(student['_id'], day, time, subject, room, teacher_id=str(current_user._id))
    return jsonify({'success': True, 'message': 'Slot added.'})


@teacher_bp.route('/timetable/<slot_id>/delete', methods=['POST'])
@login_required
@role_required('teacher')
def delete_timetable_slot(slot_id):
    TimetableModel.delete_slot(slot_id)
    return jsonify({'success': True})


@teacher_bp.route('/exams', methods=['POST'])
@login_required
@role_required('teacher')
def create_exam():
    data = request.get_json(silent=True) or request.form
    student = _assigned_student(data.get('student_id', ''))
    if not student:
        return jsonify({'success': False, 'message': 'Student not assigned.'}), 403
    subject = (data.get('subject') or '').strip()
    exam_date = (data.get('exam_date') or '').strip()
    if not subject or not exam_date:
        return jsonify({'success': False, 'message': 'Subject and date required.'}), 400
    ExamModel.create(
        student['_id'], subject,
        data.get('exam_type', 'mid'),
        exam_date,
        (data.get('venue') or '').strip(),
        (data.get('notes') or '').strip(),
        teacher_id=str(current_user._id)
    )
    return jsonify({'success': True, 'message': 'Exam added.'}), 201


@teacher_bp.route('/exams/<exam_id>/delete', methods=['POST'])
@login_required
@role_required('teacher')
def delete_exam(exam_id):
    ExamModel.delete(exam_id)
    return jsonify({'success': True})


@teacher_bp.route('/exams/<student_id>')
@login_required
@role_required('teacher')
def get_student_exams(student_id):
    student = _assigned_student(student_id)
    if not student:
        return jsonify({'success': False, 'message': 'Student not assigned.'}), 403
    exams = ExamModel.get_by_student(student['_id'])
    return jsonify({'success': True, 'exams': [{
        '_id': str(e['_id']), 'subject': e.get('subject', ''),
        'exam_type': e.get('exam_type', ''), 'exam_date': e.get('exam_date', ''),
        'venue': e.get('venue', ''), 'notes': e.get('notes', '')
    } for e in exams]})


@teacher_bp.route('/marks', methods=['POST'])
@login_required
@role_required('teacher')
def enter_marks():
    data = request.get_json(silent=True) or request.form
    student = _assigned_student(data.get('student_id', ''))
    if not student:
        return jsonify({'success': False, 'message': 'Student is not assigned to this teacher.'}), 403

    subject = (data.get('subject') or '').strip()
    assessment_type = data.get('assessment_type', 'quiz')
    title = (data.get('title') or '').strip()
    score = data.get('score')
    max_score = data.get('max_score')

    if not subject or not title or score is None or max_score is None:
        return jsonify({'success': False, 'message': 'Subject, title, score, and max score are required.'}), 400

    try:
        score = float(score)
        max_score = float(max_score)
    except (ValueError, TypeError):
        return jsonify({'success': False, 'message': 'Score and max score must be numbers.'}), 400

    if score < 0 or max_score <= 0 or score > max_score:
        return jsonify({'success': False, 'message': 'Invalid score values.'}), 400

    mark = MarksModel.create(
        student_id=student['_id'],
        subject=subject,
        assessment_type=assessment_type,
        title=title,
        score=score,
        max_score=max_score,
        teacher_id=current_user._id,
        notes=(data.get('notes') or '').strip()
    )
    return jsonify({'success': True, 'mark': {
        '_id': str(mark['_id']),
        'subject': mark['subject'],
        'title': mark['title'],
        'score': mark['score'],
        'max_score': mark['max_score'],
        'percentage': mark['percentage']
    }}), 201


@teacher_bp.route('/marks/<student_id>')
@login_required
@role_required('teacher')
def student_marks(student_id):
    student = _assigned_student(student_id)
    if not student:
        return jsonify({'success': False, 'message': 'Student is not assigned to this teacher.'}), 403
    marks = MarksModel.get_by_student(student['_id'])
    analytics = MarksModel.get_analytics(student['_id'])
    return jsonify({'success': True, 'marks': [
        {**m, '_id': str(m['_id']), 'student_id': str(m['student_id']),
         'teacher_id': str(m.get('teacher_id') or ''),
         'created_at': m['created_at'].strftime('%Y-%m-%d') if m.get('created_at') else ''}
        for m in marks
    ], 'analytics': analytics})


@teacher_bp.route('/at-risk')
@login_required
@role_required('teacher')
def at_risk_students():
    db = get_db()
    try:
        uid = ObjectId(current_user.id)
    except Exception:
        uid = current_user._id
    students = list(db.students.find({
        'teacher_ids': uid,
        'attendance_pct': {'$lt': 75.0}
    }).sort('attendance_pct', 1))
    result = []
    for s in students:
        user = db.users.find_one({'_id': s.get('user_id')})
        result.append({
            '_id': str(s['_id']),
            'name': user.get('name', 'Unknown') if user else 'Unknown',
            'roll_no': s.get('roll_no', ''),
            'attendance_pct': round(s.get('attendance_pct', 0), 2),
            'risk_level': s.get('risk_level', 'LOW'),
            'severity': 'critical' if s.get('attendance_pct', 0) < 70 else 'warning'
        })
    return jsonify({'success': True, 'students': result})


@teacher_bp.route('/attendance/verify', methods=['POST'])
@login_required
@role_required('teacher')
def verify_attendance():
    """Teacher verifies/corrects a face-recognition attendance exception."""
    data = request.get_json(silent=True) or request.form
    student = _assigned_student(data.get('student_id', ''))
    if not student:
        return jsonify({'success': False, 'message': 'Student is not assigned to this teacher.'}), 403

    subject = (data.get('subject') or '').strip()
    status = data.get('status', 'present')
    date = data.get('date') or datetime.date.today().isoformat()
    correction_note = (data.get('note') or 'Teacher manual correction').strip()

    if not subject or status not in {'present', 'absent'}:
        return jsonify({'success': False, 'message': 'Subject and valid status required.'}), 400

    db = get_db()
    # Update or insert the attendance record with correction flag
    date_dt = datetime.datetime.strptime(date, '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc)
    existing = db.attendance_records.find_one({
        'student_id': student['_id'], 'subject': subject, 'date': date_dt
    })
    if existing:
        db.attendance_records.update_one(
            {'_id': existing['_id']},
            {'$set': {'status': status, 'corrected_by': str(current_user._id),
                      'correction_note': correction_note, 'corrected_at': datetime.datetime.now(datetime.timezone.utc)}}
        )
        # Recalculate overall attendance
        AttendanceModel._recalculate_overall(student['_id'])
        return jsonify({'success': True, 'message': 'Attendance corrected successfully.'})
    else:
        ok, msg = AttendanceModel.mark_attendance(student['_id'], subject, status, date)
        return jsonify({'success': ok, 'message': msg}), (200 if ok else 409)