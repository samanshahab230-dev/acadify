import os
from bson import ObjectId
from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify
from flask_login import login_required, current_user
from decorators import role_required
from models.student import StudentModel
from models.user import User
from models.prediction import PredictionModel
from models.department import DepartmentModel
from models.notification import NotificationModel
from models.audit_log import AuditLogModel
from models.counseling import CounselingModel
from models.activity import ActivityModel
from models.intervention import InterventionModel
from models.marks import MarksModel
from models.alert import AlertModel
from models.report import ReportModel
from models.db import get_db
import pandas as pd
import datetime

admin_bp = Blueprint('admin', __name__, url_prefix='/admin')

@admin_bp.route('/dashboard')
@login_required
@role_required('admin')
def dashboard():
    db = get_db()
    total_students = db.students.count_documents({})
    high_risk_count = db.students.count_documents({'risk_level': 'HIGH'})
    medium_risk_count = db.students.count_documents({'risk_level': 'MEDIUM'})
    low_risk_count = db.students.count_documents({'risk_level': 'LOW'})

    pipeline_avg = [{'$group': {'_id': None, 'avg_gpa': {'$avg': '$gpa'}, 'avg_attendance': {'$avg': '$attendance_pct'}}}]
    avg_stats = list(db.students.aggregate(pipeline_avg))
    avg_gpa = round(avg_stats[0]['avg_gpa'], 2) if avg_stats else 0.0
    avg_attendance = round(avg_stats[0]['avg_attendance'], 1) if avg_stats else 0.0

    recent_students = StudentModel.get_all(limit=6)
    departments = DepartmentModel.get_all()
    open_counseling = CounselingModel.count_open()
    recent_activity = ActivityModel.get_recent(limit=8)
    active_interventions = InterventionModel.count_active()

    # GPA distribution buckets from DB
    gpa_buckets = [
        {'label': '3.5-4.0 Honors', 'count': db.students.count_documents({'gpa': {'$gte': 3.5}})},
        {'label': '3.0-3.49 Good',  'count': db.students.count_documents({'gpa': {'$gte': 3.0, '$lt': 3.5}})},
        {'label': '2.5-2.99 Avg',   'count': db.students.count_documents({'gpa': {'$gte': 2.5, '$lt': 3.0}})},
        {'label': 'Below 2.5',      'count': db.students.count_documents({'gpa': {'$lt': 2.5}})},
    ]

    # Attendance distribution
    att_buckets = [
        {'label': '90-100%',  'count': db.students.count_documents({'attendance_pct': {'$gte': 90}})},
        {'label': '75-89%',   'count': db.students.count_documents({'attendance_pct': {'$gte': 75, '$lt': 90}})},
        {'label': '60-74%',   'count': db.students.count_documents({'attendance_pct': {'$gte': 60, '$lt': 75}})},
        {'label': 'Below 60%','count': db.students.count_documents({'attendance_pct': {'$lt': 60}})},
    ]

    # Semester-wise GPA heatmap data
    heatmap_data = []
    for dept in departments:
        row = {'dept': dept['name'], 'semesters': []}
        for sem in range(1, 9):
            res = list(db.students.aggregate([
                {'$match': {'department': dept['name'], 'semester': sem}},
                {'$group': {'_id': None, 'avg': {'$avg': '$gpa'}, 'count': {'$sum': 1}}}
            ]))
            avg = round(res[0]['avg'], 2) if res else None
            count = res[0]['count'] if res else 0
            row['semesters'].append({'sem': sem, 'avg': avg, 'count': count})
        heatmap_data.append(row)

    # 7-day activity trend
    activity_trend = ActivityModel.get_stats_last_7_days()

    return render_template('admin/dashboard.html',
                           total_students=total_students,
                           high_risk_count=high_risk_count,
                           medium_risk_count=medium_risk_count,
                           low_risk_count=low_risk_count,
                           avg_gpa=avg_gpa,
                           avg_attendance=avg_attendance,
                           recent_students=recent_students,
                           departments=departments,
                           open_counseling=open_counseling,
                           recent_activity=recent_activity,
                           active_interventions=active_interventions,
                           gpa_buckets=gpa_buckets,
                           att_buckets=att_buckets,
                           heatmap_data=heatmap_data,
                           activity_trend=activity_trend)

@admin_bp.route('/students')
@login_required
@role_required('admin')
def students():
    query_str = request.args.get('q', '').strip()
    dept_filter = request.args.get('dept', '')
    risk_filter = request.args.get('risk', '')
    
    mongo_query = {}
    if dept_filter:
        mongo_query['department'] = dept_filter
    if risk_filter:
        mongo_query['risk_level'] = risk_filter
    if query_str:
        mongo_query['$or'] = [
            {'roll_no': {'$regex': query_str, '$options': 'i'}},
            {'department': {'$regex': query_str, '$options': 'i'}}
        ]

    student_list = StudentModel.get_all(query=mongo_query, limit=100)
    departments = DepartmentModel.get_all()
    
    return render_template('admin/students.html', 
                           students=student_list, 
                           departments=departments,
                           query_str=query_str,
                           dept_filter=dept_filter,
                           risk_filter=risk_filter)

@admin_bp.route('/students/add', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def student_add():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip()
        roll_no = request.form.get('roll_no', '').strip().upper()
        department = request.form.get('department', '').strip()
        semester = request.form.get('semester', 1)
        gpa = float(request.form.get('gpa', 3.0))
        attendance_pct = float(request.form.get('attendance_pct', 80.0))
        password = request.form.get('password', 'Student123!')

        if StudentModel.get_by_roll_no(roll_no):
            flash(f'Roll Number "{roll_no}" already exists.', 'danger')
            return render_template('admin/student_add.html', departments=DepartmentModel.get_all())

        user, err = User.create(name, email, password, role='student')
        if err:
            flash(err, 'danger')
            return render_template('admin/student_add.html', departments=DepartmentModel.get_all())

        student_data = {
            'gpa': gpa,
            'attendance_pct': attendance_pct,
            'semester': int(semester),
            'department': department
        }
        from ml.predictor import predict_student_risk
        pred = predict_student_risk(student_data)

        student = StudentModel.create(
            user_id=user._id,
            roll_no=roll_no,
            department=department,
            semester=int(semester),
            gpa=gpa,
            attendance_pct=attendance_pct,
            risk_level=pred['risk_level'],
            risk_score=pred['risk_score'],
            last_prediction=pred
        )

        PredictionModel.create(
            student_id=student['_id'],
            risk_score=pred['risk_score'],
            confidence=pred['confidence'],
            performance_forecast=pred['performance_forecast'],
            recommendations=pred['recommendations'],
            model_version=pred['model_version'],
            risk_level=pred['risk_level'],
            risk_probabilities=pred.get('risk_probabilities', {}),
            model_accuracy=pred.get('model_accuracy'),
            regressor_r2=pred.get('regressor_r2'),
        )

        DepartmentModel.recalculate_stats()
        flash(f'Student {name} ({roll_no}) created successfully.', 'success')
        return redirect(url_for('admin.students'))

    return render_template('admin/student_add.html', departments=DepartmentModel.get_all())

@admin_bp.route('/students/<id>/edit', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def student_edit(id):
    student = StudentModel.get_by_id(id)
    if not student:
        flash('Student record not found.', 'danger')
        return redirect(url_for('admin.students'))

    user = User.get_by_id(student.get('user_id'))

    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        department = request.form.get('department', '').strip()
        semester = int(request.form.get('semester', student.get('semester')))
        gpa = float(request.form.get('gpa', student.get('gpa')))
        attendance_pct = float(request.form.get('attendance_pct', student.get('attendance_pct')))

        # Recalculate ML Risk Prediction
        student_data = {
            'gpa': gpa,
            'attendance_pct': attendance_pct,
            'semester': semester,
            'department': department
        }
        from ml.predictor import predict_student_risk
        pred = predict_student_risk(student_data)

        # Update Student Record
        StudentModel.update(id, {
            'department': department,
            'semester': semester,
            'gpa': gpa,
            'attendance_pct': attendance_pct,
            'risk_level': pred['risk_level'],
            'risk_score': pred['risk_score'],
            'last_prediction': pred
        })

        # Update User Record if name changed
        if user and name:
            db = get_db()
            db.users.update_one({'_id': user._id}, {'$set': {'name': name}})

        # Record new prediction log
        PredictionModel.create(
            student_id=student['_id'],
            risk_score=pred['risk_score'],
            confidence=pred['confidence'],
            performance_forecast=pred['performance_forecast'],
            recommendations=pred['recommendations'],
            model_version=pred['model_version'],
            risk_level=pred['risk_level'],
            risk_probabilities=pred.get('risk_probabilities', {}),
            model_accuracy=pred.get('model_accuracy'),
            regressor_r2=pred.get('regressor_r2'),
        )

        # Send alert notification if High Risk detected
        if pred['risk_level'] == 'HIGH':
            NotificationModel.create(
                student_id=student['_id'],
                message="High Academic Risk Alert: Your current metrics have triggered an automated counseling recommendation.",
                notif_type="warning"
            )

        DepartmentModel.recalculate_stats()
        flash(f'Student record for {student["roll_no"]} updated and re-evaluated by NEXUS AI.', 'success')
        return redirect(url_for('admin.students'))

    return render_template('admin/student_edit.html', student=student, user=user, departments=DepartmentModel.get_all())

@admin_bp.route('/students/<id>/delete', methods=['POST'])
@login_required
@role_required('admin')
def student_delete(id):
    if StudentModel.delete(id):
        DepartmentModel.recalculate_stats()
        flash('Student record and user account removed successfully.', 'success')
    else:
        flash('Failed to delete student record.', 'danger')
    return redirect(url_for('admin.students'))

@admin_bp.route('/students/<id>')
@login_required
@role_required('admin')
def student_detail(id):
    student = StudentModel.get_by_id(id)
    if not student:
        flash('Student record not found.', 'danger')
        return redirect(url_for('admin.students'))
    
    user = User.get_by_id(student.get('user_id'))
    predictions = PredictionModel.get_by_student(id, limit=10)
    notifications = NotificationModel.get_by_student(id, limit=10)
    teacher_ids = {str(user_id) for user_id in student.get('teacher_ids', [])}
    parent_ids = {str(user_id) for user_id in student.get('parent_ids', [])}
    teacher_options = User.get_all('teacher')
    parent_options = User.get_all('parent')
    teachers = [teacher for teacher in teacher_options if teacher.id in teacher_ids]
    parents = [parent for parent in parent_options if parent.id in parent_ids]
    
    return render_template('admin/student_profile.html', 
                           student=student, 
                           user=user, 
                           predictions=predictions, 
                           notifications=notifications,
                           teachers=teachers,
                           parents=parents,
                           teacher_options=teacher_options,
                           parent_options=parent_options)


@admin_bp.route('/students/<id>/connections', methods=['POST'])
@login_required
@role_required('admin')
def student_connections(id):
    student = StudentModel.get_by_id(id)
    if not student:
        return jsonify({'success': False, 'message': 'Student record not found.'}), 404

    data = request.get_json(silent=True) or {}
    links = {}
    for role in ('teacher', 'parent'):
        user_ids = data.get(f'{role}_ids', [])
        if not isinstance(user_ids, list):
            return jsonify({'success': False, 'message': f'{role.title()} links must be a list.'}), 400
        valid_ids = []
        for user_id in user_ids:
            user = User.get_by_id(user_id)
            if not user or user.role != role:
                return jsonify({'success': False, 'message': f'One selected {role} account is invalid.'}), 400
            valid_ids.append(user._id)
        links[f'{role}_ids'] = list({str(user_id): user_id for user_id in valid_ids}.values())

    StudentModel.update(id, links)
    return jsonify({'success': True, 'message': 'Teacher and parent links saved.'})

@admin_bp.route('/departments')
@login_required
@role_required('admin')
def departments():
    DepartmentModel.recalculate_stats()
    depts = DepartmentModel.get_all()
    return render_template('admin/departments.html', departments=depts)

@admin_bp.route('/departments/add', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def department_add():
    if request.method == 'POST':
        name = request.form.get('name', '').strip()
        if not name:
            flash('Department name is required.', 'danger')
        elif DepartmentModel.get_by_name(name):
            flash('Department name already exists.', 'danger')
        else:
            DepartmentModel.create(name)
            flash(f'Department "{name}" created successfully.', 'success')
            return redirect(url_for('admin.departments'))
    return render_template('admin/department_add.html')

@admin_bp.route('/predict', methods=['GET'])
@login_required
@role_required('admin')
def predict_form():
    students = StudentModel.get_all(limit=200)
    return render_template('admin/predict_form.html', students=students)

@admin_bp.route('/predictions/<id>/delete', methods=['POST'])
@login_required
@role_required('admin')
def prediction_delete(id):
    if PredictionModel.delete(id):
        flash('Prediction record deleted.', 'success')
    else:
        flash('Failed to delete prediction.', 'danger')
    return redirect(request.referrer or url_for('admin.predictions'))

@admin_bp.route('/predictions')
@login_required
@role_required('admin')
def predictions():
    risk_filter = request.args.get('risk_level')
    pred_list = PredictionModel.get_all(risk_level=risk_filter, limit=50)
    return render_template('admin/predictions.html', predictions=pred_list, current_risk=risk_filter)

@admin_bp.route('/analytics')
@login_required
@role_required('admin')
def analytics():
    DepartmentModel.recalculate_stats()
    depts = DepartmentModel.get_all()
    return render_template('admin/analytics.html', departments=depts)

@admin_bp.route('/data-upload', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def data_upload():
    if request.method == 'POST':
        if 'csv_file' not in request.files:
            flash('No file selected.', 'danger')
            return redirect(url_for('admin.data_upload'))
            
        file = request.files['csv_file']
        if file.filename == '':
            flash('No file selected.', 'danger')
            return redirect(url_for('admin.data_upload'))

        if not file.filename.endswith('.csv'):
            flash('Invalid file format. Please upload a .csv file.', 'danger')
            return redirect(url_for('admin.data_upload'))

        try:
            df = pd.read_csv(file)
            required_cols = {'name', 'email', 'roll_no', 'department', 'semester', 'gpa', 'attendance_pct'}
            if not required_cols.issubset(df.columns):
                missing = required_cols - set(df.columns)
                flash(f'Missing required CSV columns: {", ".join(missing)}', 'danger')
                return redirect(url_for('admin.data_upload'))

            success_count = 0
            skip_count = 0

            for _, row in df.iterrows():
                roll_no = str(row['roll_no']).strip().upper()
                if StudentModel.get_by_roll_no(roll_no):
                    skip_count += 1
                    continue

                email = str(row['email']).strip().lower()
                name = str(row['name']).strip()
                department = str(row['department']).strip()
                semester = int(row['semester'])
                gpa = float(row['gpa'])
                attendance_pct = float(row['attendance_pct'])

                # Create user
                user, err = User.create(name, email, "Student123!", role='student')
                if not user:
                    skip_count += 1
                    continue

                student_data = {'gpa': gpa, 'attendance_pct': attendance_pct, 'semester': semester, 'department': department}
                from ml.predictor import predict_student_risk
                pred = predict_student_risk(student_data)

                student = StudentModel.create(
                    user_id=user._id,
                    roll_no=roll_no,
                    department=department,
                    semester=semester,
                    gpa=gpa,
                    attendance_pct=attendance_pct,
                    risk_level=pred['risk_level'],
                    risk_score=pred['risk_score'],
                    last_prediction=pred
                )

                PredictionModel.create(
                    student_id=student['_id'],
                    risk_score=pred['risk_score'],
                    confidence=pred['confidence'],
                    performance_forecast=pred['performance_forecast'],
                    recommendations=pred['recommendations'],
                    model_version=pred['model_version'],
                    risk_level=pred['risk_level'],
                    risk_probabilities=pred.get('risk_probabilities', {}),
                    model_accuracy=pred.get('model_accuracy'),
                    regressor_r2=pred.get('regressor_r2'),
                )

                success_count += 1

            DepartmentModel.recalculate_stats()
            flash(f'Batch processing completed. Imported {success_count} students. ({skip_count} skipped/duplicates).', 'success')
            return redirect(url_for('admin.students'))

        except Exception as e:
            flash(f'Error processing CSV file: {str(e)}', 'danger')
            return redirect(url_for('admin.data_upload'))

    return render_template('admin/data_upload.html')

@admin_bp.route('/users', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def users():
    if request.method == 'POST':
        data = request.get_json(silent=True) or request.form
        role = data.get('role', '')
        name = (data.get('name') or '').strip()
        email = (data.get('email') or '').strip()
        password = data.get('password') or ''
        if role not in {'teacher', 'parent'}:
            return jsonify({'success': False, 'message': 'Only teacher or parent accounts can be created here.'}), 400
        if not name or not email or len(password) < 6:
            return jsonify({'success': False, 'message': 'Name, email, and a password of at least six characters are required.'}), 400
        user, error = User.create(name, email, password, role=role)
        if error:
            return jsonify({'success': False, 'message': error}), 409
        AuditLogModel.log_action(current_user.name, 'ROLE_ACCOUNT_CREATED', f'Created {role} account for {email}')
        return jsonify({'success': True, 'message': f'{role.title()} account created.', 'user': {
            'id': user.id, 'name': user.name, 'email': user.email, 'role': user.role,
        }}), 201

    db = get_db()
    user_list = User.get_all()
    # Attach assigned student count for teachers
    result = []
    for u in user_list:
        ud = {'id': u.id, 'name': u.name, 'email': u.email, 'role': u.role,
              'created_at': str(getattr(u, 'created_at', ''))}
        if u.role == 'teacher':
            ud['student_count'] = db.students.count_documents({'teacher_ids': u._id})
        result.append(ud)
    return jsonify({'users': result, 'students': [{
        '_id': str(s['_id']), 'name': s.get('name', ''), 'roll_no': s.get('roll_no', ''),
        'department': s.get('department', ''),
        'teacher_ids': [str(t) for t in s.get('teacher_ids', [])]
    } for s in db.students.find({}, {'name': 1, 'roll_no': 1, 'department': 1, 'teacher_ids': 1})]})


@admin_bp.route('/users/<user_id>', methods=['POST'])
@login_required
@role_required('admin')
def user_update(user_id):
    data = request.get_json(silent=True) or request.form
    db = get_db()
    try:
        uid = ObjectId(user_id)
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid user ID.'}), 400
    user = User.get_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404
    if user.role == 'admin':
        return jsonify({'success': False, 'message': 'Cannot modify admin accounts.'}), 403
    updates = {}
    if data.get('name'): updates['name'] = data['name'].strip()
    if data.get('email'): updates['email'] = data['email'].strip()
    if data.get('password') and len(data['password']) >= 6:
        import bcrypt
        updates['password'] = bcrypt.hashpw(data['password'].encode(), bcrypt.gensalt()).decode()
    if updates:
        db.users.update_one({'_id': uid}, {'$set': updates})
    AuditLogModel.log_action(current_user.name, 'USER_UPDATED', f'Updated {user.role} account {user.email}')
    return jsonify({'success': True, 'message': 'Account updated successfully.'})


@admin_bp.route('/users/<user_id>/delete', methods=['POST'])
@login_required
@role_required('admin')
def user_delete(user_id):
    db = get_db()
    user = User.get_by_id(user_id)
    if not user:
        return jsonify({'success': False, 'message': 'User not found.'}), 404
    if user.role == 'admin':
        return jsonify({'success': False, 'message': 'Cannot delete admin accounts.'}), 403
    try:
        uid = ObjectId(user_id)
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid user ID.'}), 400
    # Remove teacher from all students
    if user.role == 'teacher':
        db.students.update_many({}, {'$pull': {'teacher_ids': uid}})
    if user.role == 'parent':
        db.students.update_many({}, {'$pull': {'parent_ids': uid}})
    db.users.delete_one({'_id': uid})
    AuditLogModel.log_action(current_user.name, 'USER_DELETED', f'Deleted {user.role} account {user.email}')
    return jsonify({'success': True, 'message': f'{user.role.title()} account deleted.'})


@admin_bp.route('/users/<user_id>/assign-students', methods=['POST'])
@login_required
@role_required('admin')
def user_assign_students(user_id):
    """Assign/unassign students to a teacher."""
    db = get_db()
    user = User.get_by_id(user_id)
    if not user or user.role != 'teacher':
        return jsonify({'success': False, 'message': 'Teacher not found.'}), 404
    try:
        uid = ObjectId(user_id)
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid user ID.'}), 400
    data = request.get_json(silent=True) or {}
    student_ids = data.get('student_ids', [])
    try:
        sid_objects = [ObjectId(s) for s in student_ids]
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid student ID.'}), 400
    # Remove teacher from all, then add to selected
    db.students.update_many({}, {'$pull': {'teacher_ids': uid}})
    if sid_objects:
        db.students.update_many({'_id': {'$in': sid_objects}}, {'$addToSet': {'teacher_ids': uid}})
        # Seed subjects for newly assigned students
        from models.attendance import AttendanceModel
        for s in db.students.find({'_id': {'$in': sid_objects}}):
            if not AttendanceModel.get_subjects(s['_id']):
                AttendanceModel.seed_subjects(s['_id'], s.get('department', ''), s.get('semester', 1))
    count = db.students.count_documents({'teacher_ids': uid})
    AuditLogModel.log_action(current_user.name, 'TEACHER_STUDENTS_ASSIGNED',
                             f'Assigned {count} students to {user.email}')
    return jsonify({'success': True, 'message': f'{count} students assigned to {user.name}.'})


@admin_bp.route('/users/<user_id>/detail')
@login_required
@role_required('admin')
def user_detail(user_id):
    db = get_db()
    user = User.get_by_id(user_id)
    if not user or user.role != 'teacher':
        return jsonify({'success': False, 'message': 'Teacher not found.'}), 404
    try:
        uid = ObjectId(user_id)
    except Exception:
        return jsonify({'success': False, 'message': 'Invalid ID.'}), 400
    assigned = list(db.students.find({'teacher_ids': uid}))
    assigned_ids = [str(s['_id']) for s in assigned]
    all_subjects = sorted(db.attendance_subjects.distinct('subject'))
    teacher_subjects = sorted(db.attendance_subjects.distinct(
        'subject', {'student_id': {'$in': [s['_id'] for s in assigned]}}
    )) if assigned else []
    return jsonify({
        'success': True,
        'teacher': {'id': user.id, 'name': user.name, 'email': user.email},
        'assigned_student_ids': assigned_ids,
        'teacher_subjects': teacher_subjects,
        'all_subjects': all_subjects,
    })


@admin_bp.route('/settings', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def settings():
    return render_template('admin/settings.html')

@admin_bp.route('/export/csv')
@login_required
@role_required('admin')
def export_csv():
    """Generates and streams dynamic CSV export of student directory with risk metrics."""
    from flask import Response
    import io, csv

    students = StudentModel.get_all(limit=1000)
    output = io.StringIO()
    writer = csv.writer(output)

    writer.writerow(['Roll No', 'Name', 'Email', 'Department', 'Semester', 'GPA', 'Attendance (%)', 'Risk Level', 'Risk Score'])
    for s in students:
        writer.writerow([
            s.get('roll_no', ''),
            s.get('name', ''),
            s.get('email', ''),
            s.get('department', ''),
            s.get('semester', ''),
            s.get('gpa', 0.0),
            s.get('attendance_pct', 0.0),
            s.get('risk_level', 'LOW'),
            s.get('risk_score', 0.0)
        ])

    AuditLogModel.log_action(current_user.name, 'CSV_EXPORTED', f'Exported {len(students)} student records to CSV.')
    
    return Response(
        output.getvalue(),
        mimetype='text/csv',
        headers={"Content-disposition": "attachment; filename=nexus_students_export.csv"}
    )

@admin_bp.route('/report-card/<id>')
@login_required
def report_card(id):
    """Print-optimized institutional transcript & risk evaluation report card for university deans."""
    student = StudentModel.get_by_id(id)
    if not student:
        flash('Student record not found.', 'danger')
        return redirect(url_for('admin.students'))

    latest_pred = PredictionModel.get_latest_by_student(student['_id'])
    return render_template('admin/report_card.html', student=student, prediction=latest_pred)

@admin_bp.route('/audit-logs')
@login_required
@role_required('admin')
def audit_logs():
    """Displays administrative activity stream and system audit event history."""
    logs = AuditLogModel.get_recent(limit=50)
    return render_template('admin/audit_logs.html', logs=logs)

@admin_bp.route('/audit-logs/add', methods=['POST'])
@login_required
@role_required('admin')
def audit_log_add():
    """Manual audit log entry dispatch by administrator."""
    action_type = request.form.get('action_type', 'MANUAL_AUDIT').strip().upper()
    description = request.form.get('description', '').strip()

    if description:
        AuditLogModel.log_action(current_user.name, action_type, description)
        flash('Audit log entry created successfully.', 'success')
    else:
        flash('Description is required for audit entries.', 'danger')

    return redirect(url_for('admin.audit_logs'))


# ─── BULK NOTIFICATIONS ────────────────────────────────────────────────────────

@admin_bp.route('/notifications', methods=['GET', 'POST'])
@login_required
@role_required('admin')
def send_notifications():
    departments = DepartmentModel.get_all()
    if request.method == 'POST':
        message = request.form.get('message', '').strip()
        notif_type = request.form.get('notif_type', 'info')
        target = request.form.get('target', 'all')
        dept_name = request.form.get('department', '')
        if not message:
            flash('Message is required.', 'danger')
            return redirect(url_for('admin.send_notifications'))
        query = {}
        if target == 'department' and dept_name:
            query['department'] = dept_name
        elif target == 'high_risk':
            query['risk_level'] = 'HIGH'
        elif target == 'low_attendance':
            query['attendance_pct'] = {'$lt': 75}
        students = StudentModel.get_all(query=query, limit=500)
        count = 0
        for s in students:
            NotificationModel.create(s['_id'], message, notif_type)
            count += 1
        AuditLogModel.log_action(current_user.name, 'BULK_NOTIFICATION', f'Sent to {count} students: {message[:60]}')
        ActivityModel.log('notification', 'Bulk Notification Sent', f'Admin sent to {count} students: {message[:60]}')
        flash(f'Notification sent to {count} students successfully.', 'success')
        return redirect(url_for('admin.send_notifications'))
    return render_template('admin/notifications.html', departments=departments)


# ─── COUNSELING MANAGEMENT ─────────────────────────────────────────────────────

@admin_bp.route('/counseling')
@login_required
@role_required('admin')
def counseling_list():
    status_filter = request.args.get('status', '')
    requests = CounselingModel.get_all(status=status_filter or None, limit=100)
    open_count = CounselingModel.count_open()
    return render_template('admin/counseling.html',
                           requests=requests,
                           status_filter=status_filter,
                           open_count=open_count)


@admin_bp.route('/counseling/<request_id>/reply', methods=['POST'])
@login_required
@role_required('admin')
def counseling_reply(request_id):
    reply = request.form.get('reply', '').strip()
    if reply:
        CounselingModel.reply(request_id, reply, current_user.name)
        # Notify student
        db = get_db()
        from bson.objectid import ObjectId
        req = db.counseling.find_one({'_id': ObjectId(request_id)})
        if req:
            NotificationModel.create(req['student_id'],
                                     f'Admin replied to your request: "{reply[:100]}"', 'success')
        flash('Reply sent successfully.', 'success')
    else:
        flash('Reply cannot be empty.', 'danger')
    return redirect(url_for('admin.counseling_list'))


@admin_bp.route('/counseling/<request_id>/status', methods=['POST'])
@login_required
@role_required('admin')
def counseling_status(request_id):
    status = request.form.get('status', 'in_review')
    CounselingModel.update_status(request_id, status)
    flash('Status updated.', 'success')
    return redirect(url_for('admin.counseling_list'))


# ─── LIVE ACTIVITY FEED API ────────────────────────────────────────────────────

@admin_bp.route('/api/activity-feed')
@login_required
@role_required('admin')
def api_activity_feed():
    events = ActivityModel.get_recent(limit=15)
    return jsonify({'status': 'success', 'events': events})


@admin_bp.route('/api/dashboard-live')
@login_required
@role_required('admin')
def api_dashboard_live():
    db = get_db()
    return jsonify({
        'total_students': db.students.count_documents({}),
        'high_risk': db.students.count_documents({'risk_level': 'HIGH'}),
        'medium_risk': db.students.count_documents({'risk_level': 'MEDIUM'}),
        'low_risk': db.students.count_documents({'risk_level': 'LOW'}),
        'open_counseling': CounselingModel.count_open(),
        'avg_gpa': round(list(db.students.aggregate([{'$group': {'_id': None, 'v': {'$avg': '$gpa'}}}]))[0]['v'], 2)
                   if db.students.count_documents({}) > 0 else 0.0,
    })


# ─── ADMIN ATTENDANCE MANAGEMENT ──────────────────────────────────────────────

@admin_bp.route('/attendance')
@login_required
@role_required('admin')
def attendance_overview():
    """Admin view of all students' attendance with filtering."""
    from models.attendance import AttendanceModel
    dept_filter = request.args.get('dept', '')
    query = {}
    if dept_filter:
        query['department'] = dept_filter
    students = StudentModel.get_all(query=query, limit=200)
    departments = DepartmentModel.get_all()

    # Attach subject breakdown per student
    for s in students:
        subjects = AttendanceModel.get_subjects(s['_id'])
        s['subject_count'] = len(subjects)
        s['total_classes'] = sum(sub.get('total_classes', 0) for sub in subjects)
        s['total_attended'] = sum(sub.get('attended', 0) for sub in subjects)

    return render_template('admin/attendance_overview.html',
                           students=students,
                           departments=departments,
                           dept_filter=dept_filter)


@admin_bp.route('/attendance/<student_id>')
@login_required
@role_required('admin')
def attendance_detail(student_id):
    """Admin detailed attendance view for a specific student."""
    from models.attendance import AttendanceModel
    student = StudentModel.get_by_id(student_id)
    if not student:
        flash('Student not found.', 'danger')
        return redirect(url_for('admin.attendance_overview'))
    user = User.get_by_id(student.get('user_id'))
    student['name'] = user.name if user else 'Unknown'
    subjects = AttendanceModel.get_subjects(student['_id'])
    records = AttendanceModel.get_records(student['_id'], limit=100)
    calendar_data = AttendanceModel.get_calendar_data(student['_id'])
    streak = AttendanceModel.get_streak(student['_id'])
    return render_template('admin/attendance_detail.html',
                           student=student,
                           subjects=subjects,
                           records=records,
                           calendar_data=calendar_data,
                           streak=streak)


@admin_bp.route('/attendance/<student_id>/mark', methods=['POST'])
@login_required
@role_required('admin')
def attendance_mark(student_id):
    """Admin manually marks attendance for a student."""
    from models.attendance import AttendanceModel
    import datetime
    subject = request.form.get('subject', '').strip()
    status = request.form.get('status', 'present')
    date_str = request.form.get('date', datetime.date.today().strftime('%Y-%m-%d'))
    if subject and status in ('present', 'absent'):
        ok, msg = AttendanceModel.mark_attendance(student_id, subject, status, date_str)
        flash(msg, 'success' if ok else 'warning')
    else:
        flash('Invalid subject or status.', 'danger')
    return redirect(url_for('admin.attendance_detail', student_id=student_id))


@admin_bp.route('/attendance/<student_id>/seed', methods=['POST'])
@login_required
@role_required('admin')
def attendance_seed(student_id):
    """Admin seeds default subjects for a student."""
    from models.attendance import AttendanceModel
    student = StudentModel.get_by_id(student_id)
    if student:
        AttendanceModel.seed_subjects(student['_id'], student.get('department', ''), student.get('semester', 1))
        flash('Subjects seeded successfully.', 'success')
    return redirect(url_for('admin.attendance_detail', student_id=student_id))


# ─── RISK INTERVENTION TRACKER ────────────────────────────────────────────────

@admin_bp.route('/interventions')
@login_required
@role_required('admin')
def interventions():
    all_interventions = InterventionModel.get_all(limit=100)
    active_count = InterventionModel.count_active()
    students = StudentModel.get_all(query={'risk_level': 'HIGH'}, limit=200)
    return render_template('admin/interventions.html',
                           interventions=all_interventions,
                           active_count=active_count,
                           students=students)


# ─── REPORTS ────────────────────────────────────────────────────────────────────

@admin_bp.route('/reports')
@login_required
@role_required('admin')
def reports():
    return render_template('admin/reports.html')


@admin_bp.route('/api/reports/daily')
@login_required
@role_required('admin')
def api_report_daily():
    date_str = request.args.get('date')
    report = ReportModel.generate_daily(date_str)
    return jsonify({'report': report})


@admin_bp.route('/api/reports/weekly')
@login_required
@role_required('admin')
def api_report_weekly():
    report = ReportModel.generate_weekly()
    return jsonify({'report': report})


@admin_bp.route('/api/reports/monthly')
@login_required
@role_required('admin')
def api_report_monthly():
    try:
        year = int(request.args.get('year', datetime.datetime.now().year))
        month = int(request.args.get('month', datetime.datetime.now().month))
    except ValueError:
        year = datetime.datetime.now().year
        month = datetime.datetime.now().month
    report = ReportModel.generate_monthly(year=year, month=month)
    return jsonify({'report': report})


@admin_bp.route('/api/reports/at-risk')
@login_required
@role_required('admin')
def api_at_risk():
    students = AlertModel.get_at_risk_students(limit=100)
    return jsonify({'students': students})


# ─── ADMIN EXAM & TIMETABLE MANAGEMENT ───────────────────────────────────────

@admin_bp.route('/api/students')
@login_required
@role_required('admin')
def api_students_list():
    db = get_db()
    students = list(db.students.find({}, {'roll_no': 1, 'department': 1, 'semester': 1, 'user_id': 1}))
    result = []
    for s in students:
        user = db.users.find_one({'_id': s.get('user_id')})
        result.append({'_id': str(s['_id']), 'name': user.get('name', '') if user else '', 'roll_no': s.get('roll_no', ''), 'department': s.get('department', '')})
    return jsonify({'students': result})


@admin_bp.route('/api/exams', methods=['POST'])
@login_required
@role_required('admin')
def api_exam_create():
    from models.exam import ExamModel
    data = request.get_json(silent=True) or request.form
    student_id = (data.get('student_id') or '').strip()
    subject = (data.get('subject') or '').strip()
    exam_date = (data.get('exam_date') or '').strip()
    if not student_id or not subject or not exam_date:
        return jsonify({'success': False, 'message': 'Student, subject, and date required.'}), 400
    ExamModel.create(student_id, subject, data.get('exam_type', 'mid'), exam_date,
                     (data.get('venue') or '').strip(), (data.get('notes') or '').strip())
    return jsonify({'success': True, 'message': 'Exam added.'}), 201


@admin_bp.route('/api/exams/<student_id>')
@login_required
@role_required('admin')
def api_exam_list(student_id):
    from models.exam import ExamModel
    from bson import ObjectId
    try:
        sid = ObjectId(student_id)
    except Exception:
        return jsonify({'success': False}), 400
    exams = ExamModel.get_by_student(sid)
    return jsonify({'exams': [{'_id': str(e['_id']), 'subject': e.get('subject', ''), 'exam_type': e.get('exam_type', ''), 'exam_date': e.get('exam_date', ''), 'venue': e.get('venue', ''), 'notes': e.get('notes', '')} for e in exams]})


@admin_bp.route('/api/exams/<exam_id>/delete', methods=['POST'])
@login_required
@role_required('admin')
def api_exam_delete(exam_id):
    from models.exam import ExamModel
    ExamModel.delete(exam_id)
    return jsonify({'success': True})


@admin_bp.route('/api/timetable', methods=['POST'])
@login_required
@role_required('admin')
def api_timetable_add():
    from models.timetable import TimetableModel
    data = request.get_json(silent=True) or request.form
    student_id = (data.get('student_id') or '').strip()
    day = (data.get('day') or '').strip()
    time = (data.get('time') or '').strip()
    subject = (data.get('subject') or '').strip()
    if not student_id or not day or not time or not subject:
        return jsonify({'success': False, 'message': 'Student, day, time, subject required.'}), 400
    TimetableModel.add_slot(student_id, day, time, subject, (data.get('room') or '').strip())
    return jsonify({'success': True, 'message': 'Slot added.'})


@admin_bp.route('/api/timetable/<student_id>')
@login_required
@role_required('admin')
def api_timetable_list(student_id):
    from models.timetable import TimetableModel, DAYS
    from bson import ObjectId
    try:
        sid = ObjectId(student_id)
    except Exception:
        return jsonify({'success': False}), 400
    grouped = TimetableModel.get_timetable(sid)
    serialized = {day: [{'_id': str(s['_id']), 'subject': s.get('subject', ''), 'time': s.get('time', ''), 'room': s.get('room', '')} for s in slots] for day, slots in grouped.items()}
    return jsonify({'timetable': serialized, 'days': DAYS})


@admin_bp.route('/api/timetable/<slot_id>/delete', methods=['POST'])
@login_required
@role_required('admin')
def api_timetable_delete(slot_id):
    from models.timetable import TimetableModel
    TimetableModel.delete_slot(slot_id)
    return jsonify({'success': True})


# ─── MARKS MANAGEMENT ────────────────────────────────────────────────────────────────────

@admin_bp.route('/marks/<student_id>')
@login_required
@role_required('admin')
def student_marks(student_id):
    student = StudentModel.get_by_id(student_id)
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


@admin_bp.route('/interventions/add', methods=['POST'])
@login_required
@role_required('admin')
def intervention_add():
    student_id = request.form.get('student_id', '').strip()
    intervention_type = request.form.get('intervention_type', 'counseling')
    notes = request.form.get('notes', '').strip()
    if student_id and notes:
        InterventionModel.create(student_id, current_user.name, intervention_type, notes)
        ActivityModel.log('intervention', 'Intervention Logged',
                          f'Admin {current_user.name} logged {intervention_type} intervention')
        AuditLogModel.log_action(current_user.name, 'INTERVENTION_ADDED',
                                 f'{intervention_type} for student {student_id}')
        flash('Intervention logged successfully.', 'success')
    else:
        flash('Student and notes are required.', 'danger')
    return redirect(url_for('admin.interventions'))


@admin_bp.route('/interventions/<intervention_id>/status', methods=['POST'])
@login_required
@role_required('admin')
def intervention_status(intervention_id):
    status = request.form.get('status', 'active')
    InterventionModel.update_status(intervention_id, status)
    flash('Intervention status updated.', 'success')
    return redirect(url_for('admin.interventions'))
