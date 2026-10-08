import os
from flask import Flask
from flask_cors import CORS
from flask_login import LoginManager
from config import Config
from models.db import mongo
from models.user import User
import react_api

# Apply React API patches so we return JSON instead of HTML for API requests
react_api.apply_patches()

def create_app():
    app = Flask(__name__)
    allowed_origins = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "https://acadify-nu-dusky.vercel.app",
        os.environ.get('FRONTEND_URL', ''),
    ]
    CORS(app, supports_credentials=True, origins=[o for o in allowed_origins if o])
    app.config.from_object(Config)

    # Initialize PyMongo
    mongo.init_app(app)

    # Initialize Flask-Login
    login_manager = LoginManager()
    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'warning'
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return User.get_by_id(user_id)

    # Register Blueprints
    from blueprints.main import main_bp
    from blueprints.auth import auth_bp
    from blueprints.student import student_bp
    from blueprints.admin import admin_bp
    from blueprints.api import api_bp
    from blueprints.face import face_bp
    from blueprints.teacher import teacher_bp
    from blueprints.parent import parent_bp

    app.register_blueprint(main_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(student_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(api_bp)
    app.register_blueprint(face_bp)
    app.register_blueprint(teacher_bp)
    app.register_blueprint(parent_bp)

    return app

app = create_app()

if __name__ == '__main__':
    app.run(host='127.0.0.1', port=5000, debug=True)
