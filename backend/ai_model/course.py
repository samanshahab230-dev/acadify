import datetime
from bson.objectid import ObjectId
from models.db import get_db


class CourseModel:

    @staticmethod
    def create(department, class_name, subject, teacher_id=None):
        db = get_db()
        doc = {
            'department': department.strip(),
            'class_name': class_name.strip(),   # e.g. "Class 9", "Class 10"
            'subject': subject.strip(),
            'teacher_id': ObjectId(teacher_id) if teacher_id else None,
            'created_at': datetime.datetime.now(datetime.timezone.utc)
        }
        res = db.courses.insert_one(doc)
        doc['_id'] = res.inserted_id
        return doc

    @staticmethod
    def get_all(department=None):
        db = get_db()
        query = {}
        if department:
            query['department'] = department
        courses = list(db.courses.find(query).sort([('class_name', 1), ('subject', 1)]))
        for c in courses:
            c['_id'] = str(c['_id'])
            if c.get('teacher_id'):
                teacher = db.users.find_one({'_id': c['teacher_id']})
                c['teacher_name'] = teacher.get('name', '') if teacher else ''
            else:
                c['teacher_name'] = ''
            # enrolled students count
            c['enrolled_count'] = db.course_enrollments.count_documents({'course_id': ObjectId(c['_id'])})
        return courses

    @staticmethod
    def get_by_id(course_id):
        db = get_db()
        try:
            c = db.courses.find_one({'_id': ObjectId(course_id)})
            if c:
                c['_id'] = str(c['_id'])
            return c
        except Exception:
            return None

    @staticmethod
    def delete(course_id):
        db = get_db()
        try:
            cid = ObjectId(course_id)
            db.courses.delete_one({'_id': cid})
            db.course_enrollments.delete_many({'course_id': cid})
            db.course_marks.delete_many({'course_id': cid})
            db.course_attendance.delete_many({'course_id': cid})
            return True
        except Exception:
            return False

    # ── Enrollments ──────────────────────────────────────────────────────────

    @staticmethod
    def enroll_student(course_id, student_id):
        db = get_db()
        cid = ObjectId(course_id)
        sid = ObjectId(student_id) if isinstance(student_id, str) else student_id
        if not db.course_enrollments.find_one({'course_id': cid, 'student_id': sid}):
            db.course_enrollments.insert_one({
                'course_id': cid,
                'student_id': sid,
                'enrolled_at': datetime.datetime.now(datetime.timezone.utc)
            })

    @staticmethod
    def unenroll_student(course_id, student_id):
        db = get_db()
        db.course_enrollments.delete_one({
            'course_id': ObjectId(course_id),
            'student_id': ObjectId(student_id) if isinstance(student_id, str) else student_id
        })

    @staticmethod
    def get_enrolled_students(course_id):
        db = get_db()
        cid = ObjectId(course_id)
        enrollments = list(db.course_enrollments.find({'course_id': cid}))
        result = []
        for e in enrollments:
            s = db.students.find_one({'_id': e['student_id']})
            if s:
                user = db.users.find_one({'_id': s.get('user_id')})
                result.append({
                    '_id': str(s['_id']),
                    'name': user.get('name', '') if user else '',
                    'roll_no': s.get('roll_no', ''),
                    'department': s.get('department', '')
                })
        return result

    # ── Marks ────────────────────────────────────────────────────────────────

    @staticmethod
    def save_marks(course_id, student_id, mid_marks, final_marks, total_marks, obtained_marks):
        db = get_db()
        cid = ObjectId(course_id)
        sid = ObjectId(student_id) if isinstance(student_id, str) else student_id
        mid = float(mid_marks)
        final = float(final_marks)
        total = float(total_marks) if total_marks else 100.0
        obtained = float(obtained_marks)
        percentage = round((obtained / total) * 100, 2) if total > 0 else 0.0
        grade = CourseModel._calc_grade(percentage)
        doc = {
            'course_id': cid,
            'student_id': sid,
            'mid_marks': mid,
            'final_marks': final,
            'total_marks': total,
            'obtained_marks': obtained,
            'percentage': percentage,
            'grade': grade,
            'updated_at': datetime.datetime.now(datetime.timezone.utc)
        }
        db.course_marks.update_one(
            {'course_id': cid, 'student_id': sid},
            {'$set': doc},
            upsert=True
        )
        return doc

    @staticmethod
    def get_marks(course_id, student_id=None):
        db = get_db()
        query = {'course_id': ObjectId(course_id)}
        if student_id:
            query['student_id'] = ObjectId(student_id) if isinstance(student_id, str) else student_id
        marks = list(db.course_marks.find(query))
        for m in marks:
            m['_id'] = str(m['_id'])
            m['course_id'] = str(m['course_id'])
            m['student_id'] = str(m['student_id'])
            s = db.students.find_one({'_id': ObjectId(m['student_id'])})
            if s:
                user = db.users.find_one({'_id': s.get('user_id')})
                m['student_name'] = user.get('name', '') if user else ''
                m['roll_no'] = s.get('roll_no', '')
            else:
                m['student_name'] = ''
                m['roll_no'] = ''
        return marks

    # ── Attendance ───────────────────────────────────────────────────────────

    @staticmethod
    def mark_attendance(course_id, student_id, date_str, status):
        db = get_db()
        cid = ObjectId(course_id)
        sid = ObjectId(student_id) if isinstance(student_id, str) else student_id
        db.course_attendance.update_one(
            {'course_id': cid, 'student_id': sid, 'date': date_str},
            {'$set': {'status': status, 'course_id': cid, 'student_id': sid, 'date': date_str}},
            upsert=True
        )

    @staticmethod
    def get_attendance(course_id, student_id=None):
        db = get_db()
        query = {'course_id': ObjectId(course_id)}
        if student_id:
            query['student_id'] = ObjectId(student_id) if isinstance(student_id, str) else student_id
        records = list(db.course_attendance.find(query).sort('date', -1))
        # Aggregate per student
        summary = {}
        for r in records:
            sid = str(r['student_id'])
            if sid not in summary:
                summary[sid] = {'present': 0, 'absent': 0}
            if r['status'] == 'present':
                summary[sid]['present'] += 1
            else:
                summary[sid]['absent'] += 1
        # Attach names
        result = []
        for sid, counts in summary.items():
            s = db.students.find_one({'_id': ObjectId(sid)})
            user = db.users.find_one({'_id': s.get('user_id')}) if s else None
            total = counts['present'] + counts['absent']
            result.append({
                'student_id': sid,
                'student_name': user.get('name', '') if user else '',
                'roll_no': s.get('roll_no', '') if s else '',
                'present': counts['present'],
                'absent': counts['absent'],
                'total': total,
                'percentage': round((counts['present'] / total) * 100, 1) if total > 0 else 0.0
            })
        return result

    @staticmethod
    def _calc_grade(percentage):
        if percentage >= 90: return 'A+'
        if percentage >= 85: return 'A'
        if percentage >= 80: return 'A-'
        if percentage >= 75: return 'B+'
        if percentage >= 70: return 'B'
        if percentage >= 65: return 'B-'
        if percentage >= 60: return 'C+'
        if percentage >= 55: return 'C'
        if percentage >= 50: return 'C-'
        if percentage >= 45: return 'D'
        return 'F'
