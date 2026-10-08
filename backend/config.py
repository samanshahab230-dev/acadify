import os
from dotenv import load_dotenv

load_dotenv()

IS_PROD = os.environ.get('FLASK_ENV') == 'production'

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'nexus-super-secret-key-change-in-production')
    MONGO_URI = os.environ.get('MONGO_URI', 'mongodb://127.0.0.1:27017/nexus_db')
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
