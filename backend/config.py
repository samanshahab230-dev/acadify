import os

# Remove any .env override — use Railway env vars directly
_MONGO = os.environ.get('MONGO_URI') or 'mongodb+srv://Acadify_Project:acadify2026!@cluster0.9bga8h0.mongodb.net/nexus_db?retryWrites=true&w=majority'

IS_PROD = os.environ.get('FLASK_ENV', 'production') == 'production'

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'nexus-super-secret-key-2026')
    MONGO_URI = _MONGO
    DB_NAME = os.environ.get('DB_NAME', 'nexus_db')
    DEBUG = not IS_PROD
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    SESSION_COOKIE_SAMESITE = 'None' if IS_PROD else 'Lax'
    SESSION_COOKIE_SECURE = IS_PROD
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_DOMAIN = None  # Let Flask set automatically
    REMEMBER_COOKIE_SAMESITE = 'None' if IS_PROD else 'Lax'
    REMEMBER_COOKIE_SECURE = IS_PROD
    REMEMBER_COOKIE_DOMAIN = None
