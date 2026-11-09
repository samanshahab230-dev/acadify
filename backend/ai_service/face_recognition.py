"""
FaceRecognizer — face detection, embedding generation, and identity matching.
Uses:
  - MTCNN (TensorFlow-based) for face detection — no Haar Cascade / cv2 dependency
  - Custom FaceNet Keras model (best_facenet_model.keras) for embeddings
  - Cosine similarity for identity matching
"""
import os
import threading
import numpy as np

# Lower = stricter match. Cosine distance range: 0 (identical) -> 1 (opposite)
FACE_MATCH_THRESHOLD = float(os.environ.get('FACE_MATCH_THRESHOLD', '0.40'))

_MODELS_DIR   = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'face_attendance_models')
_FACENET_PATH = os.path.join(_MODELS_DIR, 'best_facenet_model.keras')
_MODEL_INPUT_SIZE = (160, 160)

_model = None
_detector = None
_model_lock = threading.Lock()
_detector_lock = threading.Lock()
_inference_lock = threading.RLock()


def _build_model_without_lambda():
    """
    Load the FaceNet .keras model, strip the Lambda (L2-norm) layer,
    and return a model that outputs the 128-dim embedding from embedding_batchnorm_2.
    L2 normalisation is applied manually in _embed().
    Saves a fixed model to disk on first run.
    """
    import zipfile, json, shutil, tempfile
    import tensorflow as tf

    fixed_path = _FACENET_PATH.replace('.keras', '_fixed.keras')

    if os.path.exists(fixed_path):
        return tf.keras.models.load_model(fixed_path, compile=False)

    with zipfile.ZipFile(_FACENET_PATH, 'r') as z:
        cfg = json.loads(z.read('config.json'))
        weights_data = z.read('model.weights.h5')
        metadata = z.read('metadata.json')

    layers = cfg['config']['layers']
    lambda_idx = next((i for i, l in enumerate(layers) if l.get('class_name') == 'Lambda'), None)
    if lambda_idx is None:
        raise ValueError('No Lambda layer found in model config')

    # Layer before Lambda is the 128-dim embedding output (embedding_batchnorm_2)
    pre_lambda_name = layers[lambda_idx - 1]['config']['name']

    # Remove Lambda and all layers after it; set output to pre_lambda layer
    cfg['config']['layers'] = layers[:lambda_idx]
    cfg['config']['output_layers'] = [pre_lambda_name, 0, 0]

    tmp_dir = tempfile.mkdtemp()
    try:
        paths = {
            'config.json':      (os.path.join(tmp_dir, 'config.json'),    json.dumps(cfg).encode()),
            'model.weights.h5': (os.path.join(tmp_dir, 'model.weights.h5'), weights_data),
            'metadata.json':    (os.path.join(tmp_dir, 'metadata.json'),   metadata),
        }
        for arc_name, (fpath, data) in paths.items():
            with open(fpath, 'wb') as f:
                f.write(data if isinstance(data, bytes) else data.encode())

        with zipfile.ZipFile(fixed_path, 'w', zipfile.ZIP_DEFLATED) as zout:
            for arc_name, (fpath, _) in paths.items():
                zout.write(fpath, arc_name)
    finally:
        shutil.rmtree(tmp_dir, ignore_errors=True)

    model = tf.keras.models.load_model(fixed_path, compile=False)
    print(f"[FaceRecognizer] Fixed model saved -> {fixed_path}")
    return model


def _get_model():
    """Return the shared FaceNet model, loading it only once per process."""
    global _model
    if _model is None:
        with _model_lock:
            if _model is None:
                _model = _build_model_without_lambda()
    return _model


def _get_detector():
    """Return the shared MTCNN detector, loading it only once per process."""
    global _detector
    if _detector is None:
        with _detector_lock:
            if _detector is None:
                from mtcnn import MTCNN
                _detector = MTCNN()
    return _detector


class FaceRecognizer:
    def __init__(self):
        self._detector_ready = False
        self._model_ready = False
        self._load()

    def _load(self):
        # ── MTCNN detector (TensorFlow-based) ────────────────────────────────
        try:
            _get_detector()
            self._detector_ready = True
            print("[FaceRecognizer] MTCNN detector loaded.")
        except Exception as e:
            print(f"[FaceRecognizer] WARNING: could not load MTCNN detector: {e}")

        # ── FaceNet model — warm-up load on main thread ───────────────────────
        if os.path.exists(_FACENET_PATH):
            try:
                model = _get_model()
                dummy = np.zeros((1, *_MODEL_INPUT_SIZE, 3), dtype='float32')
                with _inference_lock:
                    model.predict(dummy, verbose=0)
                self._model_ready = True
                print("[FaceRecognizer] FaceNet model loaded and warmed up.")
            except Exception as e:
                print(f"[FaceRecognizer] WARNING: could not load FaceNet model: {e}")
        else:
            print(f"[FaceRecognizer] WARNING: model not found at {_FACENET_PATH}")

    @property
    def ready(self):
        return self._detector_ready and self._model_ready

    # ── Detection ─────────────────────────────────────────────────────────────

    def detect_faces(self, image_rgb):
        """
        Returns list of face locations [(top, right, bottom, left), ...].
        image_rgb: numpy array in RGB format.
        """
        if not self._detector_ready:
            return []
        try:
            detector = _get_detector()
            with _inference_lock:
                results = detector.detect_faces(image_rgb)
            locations = []
            for r in results:
                if r.get('confidence', 0) < 0.85:
                    continue
                x, y, w, h = r['box']
                x, y = max(0, x), max(0, y)
                locations.append((y, x + w, y + h, x))  # (top, right, bottom, left)
            return locations
        except Exception as e:
            print(f"[FaceRecognizer] Detection error: {e}")
            return []

    # ── Embedding ─────────────────────────────────────────────────────────────

    def _preprocess_face(self, image_rgb, face_location):
        """
        Crop face and prepare input for FaceNet:
        - Resize to 160×160
        - Standardize per-image (mean=0, std=1) — same as FaceNet training
        """
        import numpy as np
        import cv2
        top, right, bottom, left = face_location
        face = image_rgb[top:bottom, left:right]
        if face.size == 0:
            raise ValueError("Empty face crop")
        face = cv2.resize(face, _MODEL_INPUT_SIZE).astype('float32')
        # Per-image standardization (whitening) — critical for FaceNet accuracy
        mean, std = face.mean(), face.std()
        std = max(std, 1.0 / np.sqrt(face.size))
        face = (face - mean) / std
        return np.expand_dims(face, axis=0)

    def _embed(self, model_input):
        """Run inference and return L2-normalised embedding."""
        import numpy as np
        model = _get_model()
        with _inference_lock:
            emb = model.predict(model_input, verbose=0)[0]
        norm  = np.linalg.norm(emb)
        return emb / norm if norm > 1e-10 else emb

    def get_embedding(self, image_rgb, face_location=None):
        """Returns embedding as Python list, or None if no face found."""
        if not self.ready:
            return None
        try:
            locs = [face_location] if face_location else self.detect_faces(image_rgb)
            if not locs:
                return None
            return self._embed(self._preprocess_face(image_rgb, locs[0])).tolist()
        except Exception as e:
            print(f"[FaceRecognizer] Embedding error: {e}")
            return None

    # ── Registration ──────────────────────────────────────────────────────────

    def process_registration_image(self, image_rgb):
        """
        Validates image for registration (exactly one face required).
        Returns: {success, embedding, face_location} or {success: False, error}
        """
        if not self.ready:
            return {'success': False, 'error': 'Face recognition models not available.'}
        locs = self.detect_faces(image_rgb)
        if len(locs) == 0:
            return {'success': False, 'error': 'No face detected. Please use a clear frontal photo.'}
        if len(locs) > 1:
            return {'success': False, 'error': f'{len(locs)} faces detected. Please ensure only one person is in the frame.'}
        try:
            emb = self._embed(self._preprocess_face(image_rgb, locs[0]))
        except Exception as e:
            return {'success': False, 'error': f'Could not generate face embedding: {e}'}
        return {'success': True, 'embedding': emb.tolist(), 'face_location': locs[0]}

    # ── Recognition ───────────────────────────────────────────────────────────

    @staticmethod
    def _cosine_distance(a, b):
        """Cosine distance [0, 1]. Both vectors must be L2-normalised."""
        import numpy as np
        return 1.0 - float(np.clip(np.dot(a, b), -1.0, 1.0))

    def identify(self, image_rgb, known_students):
        """
        Identify a face in image_rgb against known_students.
        known_students: list of dicts — student_id, name, roll_no, face_embeddings (list of lists)

        Returns: {recognized, student_id, student_name, roll_no, distance, face_location}
              or {recognized: False, message}
        """
        if not self.ready:
            return {'recognized': False, 'message': 'Face recognition models not available.'}

        locs = self.detect_faces(image_rgb)
        if len(locs) == 0:
            return {'recognized': False, 'message': 'No face detected. Please move closer to the camera.'}
        if len(locs) > 1:
            return {'recognized': False, 'message': 'Multiple faces detected. Please ensure only one student is in frame.'}

        try:
            probe = self._embed(self._preprocess_face(image_rgb, locs[0]))
        except Exception as e:
            return {'recognized': False, 'message': f'Could not read face clearly: {e}'}

        best_dist    = float('inf')
        best_student = None

        for student in known_students:
            for emb in student.get('face_embeddings', []):
                try:
                    import numpy as np
                    ref  = np.array(emb, dtype='float32')
                    norm = np.linalg.norm(ref)
                    ref  = ref / norm if norm > 1e-10 else ref   # normalise stored embeddings too
                    dist = self._cosine_distance(probe, ref)
                    if dist < best_dist:
                        best_dist    = dist
                        best_student = student
                except Exception:
                    continue

        if best_student is None or best_dist > FACE_MATCH_THRESHOLD:
            return {'recognized': False, 'message': 'Unknown student. Face not registered in the system.'}

        return {
            'recognized':    True,
            'student_id':    str(best_student['student_id']),
            'student_name':  best_student.get('name', ''),
            'roll_no':       best_student.get('roll_no', ''),
            'distance':      round(best_dist, 4),
            'face_location': locs[0]
        }

    # ── Crop face region ──────────────────────────────────────────────────────

    def crop_face(self, image_bgr, face_location, padding=10):
        """Returns cropped face region (BGR) from face_location (top, right, bottom, left)."""
        top, right, bottom, left = face_location
        h, w = image_bgr.shape[:2]
        return image_bgr[max(0, top - padding):min(h, bottom + padding),
                         max(0, left - padding):min(w, right + padding)]
