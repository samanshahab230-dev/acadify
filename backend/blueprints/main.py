import datetime
from flask import Blueprint, render_template, request, flash, redirect, url_for, jsonify
from flask_login import current_user

main_bp = Blueprint('main', __name__)


@main_bp.route('/api/session')
def session_info():
    if not current_user.is_authenticated:
        return jsonify({'user': None}), 401
    return jsonify({'user': {
        'id': str(current_user.id),
        'name': current_user.name,
        'email': current_user.email,
        'role': current_user.role,
    }})

@main_bp.route('/debug/db')
def debug_db():
    try:
        from models.db import get_db
        db = get_db()
        count = db.users.count_documents({})
        return jsonify({'status': 'ok', 'users': count})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

@main_bp.route('/')
def index():
    return jsonify({'status': 'Acadify API is running'})

@main_bp.route('/about')
def about():
    return jsonify({'status': 'ok'})

@main_bp.route('/contact', methods=['GET', 'POST'])
def contact():
    return jsonify({'status': 'ok'})

@main_bp.route('/research')
def research():
    return jsonify({'status': 'ok'})

