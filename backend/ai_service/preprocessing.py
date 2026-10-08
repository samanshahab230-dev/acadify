"""
preprocessing.py — shared image utilities for the face AI pipeline.
"""
import os
import base64
import numpy as np
import cv2

ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png', 'webp'}
MAX_DIMENSION = 720  # webcam-sized frames are sufficient and faster for inference


def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def decode_base64_image(data_url_or_b64):
    """
    Accepts a data URL (data:image/...;base64,...) or raw base64 string.
    Returns BGR numpy array or None.
    """
    try:
        if ',' in data_url_or_b64:
            data_url_or_b64 = data_url_or_b64.split(',', 1)[1]
        img_bytes = base64.b64decode(data_url_or_b64)
        arr = np.frombuffer(img_bytes, dtype=np.uint8)
        img = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"[preprocessing] base64 decode error: {e}")
        return None


def load_image_file(filepath):
    """Load image from disk, return BGR numpy array or None."""
    img = cv2.imread(filepath)
    return img


def bgr_to_rgb(img_bgr):
    """Convert BGR (OpenCV) to RGB (face_recognition)."""
    return cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)


def resize_if_large(img, max_dim=MAX_DIMENSION):
    """Downscale image if either dimension exceeds max_dim."""
    h, w = img.shape[:2]
    if max(h, w) <= max_dim:
        return img
    scale = max_dim / max(h, w)
    new_w, new_h = int(w * scale), int(h * scale)
    return cv2.resize(img, (new_w, new_h))


def validate_image_file(file_storage):
    """
    Validate a Flask FileStorage object.
    Returns (is_valid: bool, error_message: str)
    """
    if not file_storage or file_storage.filename == '':
        return False, 'No file selected.'
    if not allowed_file(file_storage.filename):
        return False, 'Invalid file type. Allowed: jpg, jpeg, png, webp.'
    return True, ''


def secure_temp_save(file_storage, upload_folder):
    """
    Save uploaded file to upload_folder with a secure random name.
    Returns filepath string.
    """
    import uuid
    from werkzeug.utils import secure_filename
    ext = file_storage.filename.rsplit('.', 1)[1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    filepath = os.path.join(upload_folder, filename)
    file_storage.save(filepath)
    return filepath
