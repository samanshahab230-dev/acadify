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
        # course-wise attendance
        enrollments = list(db.course_enrollments.find({'student_id': student['_id']}))
        courses_att = []
        for enr in enrollments:
            course = db.courses.find_one({'_id': enr['course_id']})
            if not course:
                continue
            att_records = list(db.course_attendance.find({'course_id': enr['course_id'], 'student_id': student['_id']}))
            total = len(att_records)
            present = sum(1 for r in att_records if r.get('status') == 'present')
            pct = round(present / total * 100, 1) if total else 0
            courses_att.append({'course_id': str(enr['course_id']), 'subject': course.get('subject', ''), 'present': present, 'total': total, 'percentage': pct})
        result.append({
            '_id': str(student['_id']),
            'name': user.get('name', 'Student') if user else 'Student',
            'roll_no': student.get('roll_no', ''),
            'department': student.get('department', ''),
            'class_name': student.get('class_name', ''),
            'attendance_pct': round(float(student.get('attendance_pct', 0)), 2),
            'risk_level': student.get('risk_level', 'LOW'),
            'courses_attendance': courses_att,
        })
    result.sort(key=lambda x: x['name'])
    return jsonify({'success': True, 'students': result})


@teacher_bp.route('/my-departments')
@login_required
@role_required('teacher')
def my_departments():
    """Return distinct departments of classes assigned to this teacher."""
    db = get_db()
    try:
        uid = ObjectId(current_user.id)
    except Exception:
        uid = current_user._id
    students = list(db.students.find({'teacher_ids': uid}, {'department': 1}))
    depts = sorted({s.get('department', '') for s in students if s.get('department')})
    return jsonify({'departments': depts})


@teacher_bp.route('/my-classes')
@login_required
@role_required('teacher')
def my_classes():
    """Return distinct class names for a given department assigned to this teacher."""
    db = get_db()
    dept = request.args.get('department', '').strip()
    try:
        uid = ObjectId(current_user.id)
    except Exception:
        uid = current_user._id
    query = {'teacher_ids': uid}
    if dept:
        query['department'] = dept
    students = list(db.students.find(query, {'class_name': 1}))
    classes = sorted({s.get('class_name', '') for s in students if s.get('class_name')})
    return jsonify({'classes': classes})


@teacher_bp.route('/class-students')
@login_required
@role_required('teacher')
def class_students():
    """Return students + their enrolled courses for a dept+class assigned to this teacher."""
    db = get_db()
    dept = request.args.get('department', '').strip()
    class_name = request.args.get('class_name', '').strip()
    try:
        uid = ObjectId(current_user.id)
    except Exception:
        uid = current_user._id
    query = {'teacher_ids': uid}
    if dept:
        query['department'] = dept
    if class_name:
        query['class_name'] = class_name
    students = list(db.students.find(query))
    result = []
    for s in students:
        user = db.users.find_one({'_id': s.get('user_id')})
        enrollments = list(db.course_enrollments.find({'student_id': s['_id']}))
        courses = []
        for enr in enrollments:
            course = db.courses.find_one({'_id': enr['course_id']})
            if course:
                courses.append({'course_id': str(enr['course_id']), 'subject': course.get('subject', '')})
        result.append({
            '_id': str(s['_id']),
            'name': user.get('name', '') if user else '',
            'roll_no': s.get('roll_no', ''),
            'courses': courses,
        })
    result.sort(key=lambda x: x['name'])
    return jsonify({'students': result})


@teacher_bp.route('/course-attendance', methods=['POST'])
@login_required
@role_required('teacher')
def mark_course_attendance():
    """Mark attendance for multiple students in a course on a date."""
    db = get_db()
    data = request.get_json(silent=True) or {}
    course_id = (data.get('course_id') or '').strip()
    date_str = (data.get('date') or datetime.date.today().isoformat()).strip()
    records = data.get('records', [])  # [{student_id, status}]
    if not course_id or not records:
        return jsonify({'success': False, 'message': 'course_id and records required.'}), 400
    try:
        cid = ObjectId(course_id)
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid course ID.'}), 400
    course = db.courses.find_one({'_id': cid})
    if not course:
        return jsonify({'success': False, 'message': 'Course not found.'}), 404
    date_dt = datetime.datetime.strptime(date_str, '%Y-%m-%d').replace(tzinfo=datetime.timezone.utc)
    saved = 0
    for rec in records:
        try:
            sid = ObjectId(rec['student_id'])
        except Exception:
            continue
        status = rec.get('status', 'present')
        if status not in ('present', 'absent'):
            continue
        db.course_attendance.update_one(
            {'course_id': cid, 'student_id': sid, 'date': date_dt},
            {'$set': {'status': status, 'marked_by': str(current_user.id), 'updated_at': datetime.datetime.now(datetime.timezone.utc)}},
            upsert=True
        )
        saved += 1
    # Recalculate overall attendance_pct for each student
    student_ids = []
    for rec in records:
        try:
            student_ids.append(ObjectId(rec['student_id']))
        except Exception:
            pass
    for sid in student_ids:
        all_enrollments = list(db.course_enrollments.find({'student_id': sid}))
        total_all = present_all = 0
        for enr in all_enrollments:
            recs = list(db.course_attendance.find({'course_id': enr['course_id'], 'student_id': sid}))
            total_all += len(recs)
            present_all += sum(1 for r in recs if r.get('status') == 'present')
        pct = round(present_all / total_all * 100, 2) if total_all else 0
        db.students.update_one({'_id': sid}, {'$set': {'attendance_pct': pct}})
    return jsonify({'success': True, 'message': f'{saved} records saved.'})


@teacher_bp.route('/course-marks', methods=['POST'])
@login_required
@role_required('teacher')
def save_course_marks():
    """Save mid/final/obtained/total marks for a student in a course."""
    db = get_db()
    data = request.get_json(silent=True) or {}
    course_id = (data.get('course_id') or '').strip()
    student_id = (data.get('student_id') or '').strip()
    if not course_id or not student_id:
        return jsonify({'success': False, 'message': 'course_id and student_id required.'}), 400
    try:
        cid = ObjectId(course_id)
        sid = ObjectId(student_id)
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid IDs.'}), 400
    mid = float(data.get('mid_marks', 0) or 0)
    final = float(data.get('final_marks', 0) or 0)
    total = float(data.get('total_marks', 100) or 100)
    obtained = float(data.get('obtained_marks', 0) or 0)
    db.course_marks.update_one(
        {'course_id': cid, 'student_id': sid},
        {'$set': {'mid_marks': mid, 'final_marks': final, 'total_marks': total,
                  'obtained_marks': obtained, 'updated_at': datetime.datetime.now(datetime.timezone.utc),
                  'teacher_id': ObjectId(current_user.id) if current_user.id else None}},
        upsert=True
    )
    return jsonify({'success': True, 'message': 'Marks saved.'})


@teacher_bp.route('/course-marks/<course_id>')
@login_required
@role_required('teacher')
def get_course_marks(course_id):
    """Get all students' marks for a course."""
    db = get_db()
    try:
        cid = ObjectId(course_id)
    except Exception:
        return jsonify({'success': False}), 400
    marks = list(db.course_marks.find({'course_id': cid}))
    result = []
    for m in marks:
        student = db.students.find_one({'_id': m['student_id']})
        user = db.users.find_one({'_id': student['user_id']}) if student else None
        result.append({
            'student_id': str(m['student_id']),
            'name': user.get('name', '') if user else '',
            'roll_no': student.get('roll_no', '') if student else '',
            'mid_marks': m.get('mid_marks', 0),
            'final_marks': m.get('final_marks', 0),
            'total_marks': m.get('total_marks', 100),
            'obtained_marks': m.get('obtained_marks', 0),
        })
    return jsonify({'marks': result})


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


@teacher_bp.route('/class-assignments', methods=['GET', 'POST'])
@login_required
@role_required('teacher')
def class_assignments():
    """GET: all assignments by this teacher. POST: publish class-level assignment."""
    db = get_db()
    try:
        uid = ObjectId(current_user.id)
    except Exception:
        uid = current_user._id
    if request.method == 'GET':
        assignments = list(db.class_assignments.find({'teacher_id': uid}).sort('due_date', 1))
        return jsonify({'assignments': [{
            '_id': str(a['_id']), 'title': a.get('title', ''), 'subject': a.get('subject', ''),
            'class_name': a.get('class_name', ''), 'department': a.get('department', ''),
            'due_date': str(a.get('due_date', ''))[:10], 'priority': a.get('priority', 'medium'),
            'description': a.get('description', ''), 'file_name': a.get('file_name', '')
        } for a in assignments]})
    data = request.form
    title = (data.get('title') or '').strip()
    subject = (data.get('subject') or '').strip()
    due_date = (data.get('due_date') or '').strip()
    if not title or not subject or not due_date:
        return jsonify({'success': False, 'message': 'Title, subject, and due date required.'}), 400
    file_path, file_name = None, None
    f = request.files.get('file')
    if f and f.filename:
        file_path, file_name = _save_file(f)
        if not file_path:
            return jsonify({'success': False, 'message': 'Invalid file type.'}), 400
    db.class_assignments.insert_one({
        'teacher_id': uid,
        'course_id': ObjectId(data['course_id']) if data.get('course_id') else None,
        'subject': subject, 'title': title,
        'department': (data.get('department') or '').strip(),
        'class_name': (data.get('class_name') or '').strip(),
        'due_date': due_date, 'priority': data.get('priority', 'medium'),
        'description': (data.get('description') or '').strip(),
        'file_path': file_path, 'file_name': file_name,
        'created_at': datetime.datetime.now(datetime.timezone.utc)
    })
    return jsonify({'success': True, 'message': 'Assignment published.'}), 201


@teacher_bp.route('/timetable', methods=['GET', 'POST'])
@login_required
@role_required('teacher')
def teacher_timetable():
    """GET: teacher's own timetable. POST: add a slot."""
    db = get_db()
    try:
        uid = ObjectId(current_user.id)
    except Exception:
        uid = current_user._id
    if request.method == 'GET':
        slots = list(db.teacher_timetable.find({'teacher_id': uid}))
        return jsonify({'slots': [{
            '_id': str(s['_id']), 'day': s.get('day', ''), 'time': s.get('time', ''),
            'subject': s.get('subject', ''), 'class_name': s.get('class_name', ''), 'room': s.get('room', '')
        } for s in slots]})
    data = request.get_json(silent=True) or request.form
    day = (data.get('day') or '').strip()
    time = (data.get('time') or '').strip()
    subject = (data.get('subject') or '').strip()
    if not day or not time or not subject:
        return jsonify({'success': False, 'message': 'Day, time, and subject required.'}), 400
    db.teacher_timetable.insert_one({
        'teacher_id': uid, 'day': day, 'time': time, 'subject': subject,
        'class_name': (data.get('class_name') or '').strip(),
        'room': (data.get('room') or '').strip(),
        'created_at': datetime.datetime.now(datetime.timezone.utc)
    })
    return jsonify({'success': True, 'message': 'Slot added.'})


@teacher_bp.route('/timetable/<slot_id>/delete', methods=['POST'])
@login_required
@role_required('teacher')
def delete_timetable_slot(slot_id):
    db = get_db()
    try:
        db.teacher_timetable.delete_one({'_id': ObjectId(slot_id)})
    except Exception:
        pass
    return jsonify({'success': True})


@teacher_bp.route('/class-exams', methods=['GET', 'POST'])
@login_required
@role_required('teacher')
def class_exams():
    """GET: all exams by this teacher. POST: schedule a class-level exam."""
    db = get_db()
    try:
        uid = ObjectId(current_user.id)
    except Exception:
        uid = current_user._id
    if request.method == 'GET':
        exams = list(db.class_exams.find({'teacher_id': uid}).sort('exam_date', 1))
        return jsonify({'exams': [{
            '_id': str(e['_id']), 'subject': e.get('subject', ''),
            'class_name': e.get('class_name', ''), 'department': e.get('department', ''),
            'exam_type': e.get('exam_type', ''), 'exam_date': e.get('exam_date', ''),
            'venue': e.get('venue', ''), 'notes': e.get('notes', '')
        } for e in exams]})
    data = request.get_json(silent=True) or request.form
    subject = (data.get('subject') or '').strip()
    exam_date = (data.get('exam_date') or '').strip()
    if not subject or not exam_date:
        return jsonify({'success': False, 'message': 'Subject and date required.'}), 400
    db.class_exams.insert_one({
        'teacher_id': uid,
        'course_id': ObjectId(data['course_id']) if data.get('course_id') else None,
        'subject': subject,
        'department': (data.get('department') or '').strip(),
        'class_name': (data.get('class_name') or '').strip(),
        'exam_type': data.get('exam_type', 'mid'),
        'exam_date': exam_date,
        'venue': (data.get('venue') or '').strip(),
        'notes': (data.get('notes') or '').strip(),
        'created_at': datetime.datetime.now(datetime.timezone.utc)
    })
    return jsonify({'success': True, 'message': 'Exam scheduled.'}), 201


@teacher_bp.route('/class-exams/<exam_id>/delete', methods=['POST'])
@login_required
@role_required('teacher')
def delete_class_exam(exam_id):
    db = get_db()
    try:
        db.class_exams.delete_one({'_id': ObjectId(exam_id)})
    except Exception:
        pass
    return jsonify({'success': True})


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