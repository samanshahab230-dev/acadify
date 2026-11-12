import datetime
from bson.objectid import ObjectId
from models.db import get_db

class PredictionModel:
    @staticmethod
    def create(student_id, risk_score, confidence, performance_forecast, recommendations,
               model_version="NEXUS-ML-v1.0", risk_level=None, risk_probabilities=None,
               model_accuracy=None, regressor_r2=None):
        db = get_db()
        sid = ObjectId(student_id) if isinstance(student_id, str) else student_id

        if not risk_level:
            risk_level = "HIGH" if float(risk_score) >= 45 else ("MEDIUM" if float(risk_score) >= 25 else "LOW")

        doc = {
            'student_id': sid,
            'predicted_at': datetime.datetime.now(datetime.timezone.utc),
            'risk_score': float(risk_score),
            'risk_level': risk_level,
            'confidence': float(confidence),
            'risk_probabilities': risk_probabilities or {},
            'performance_forecast': performance_forecast,
            'recommendations': recommendations,
            'model_version': model_version,
            'model_accuracy': model_accuracy,
            'regressor_r2': regressor_r2,
        }
        res = db.predictions.insert_one(doc)
        doc['_id'] = res.inserted_id

        db.students.update_one(
            {'_id': sid},
            {'$set': {
                'risk_score': float(risk_score),
                'risk_level': risk_level,
                'last_prediction': doc
            }}
        )
        return doc

    @staticmethod
    def get_by_student(student_id, limit=10):
        db = get_db()
        sid = ObjectId(student_id) if isinstance(student_id, str) else student_id
        cursor = db.predictions.find({'student_id': sid}).sort('predicted_at', -1).limit(limit)
        return list(cursor)

    @staticmethod
    def get_latest_by_student(student_id):
        db = get_db()
        sid = ObjectId(student_id) if isinstance(student_id, str) else student_id
        return db.predictions.find_one({'student_id': sid}, sort=[('predicted_at', -1)])

    @staticmethod
    def delete(prediction_id):
        db = get_db()
        pid = ObjectId(prediction_id) if isinstance(prediction_id, str) else prediction_id
        prediction = db.predictions.find_one({'_id': pid}, {'student_id': 1})
        if not prediction:
            return False
        result = db.predictions.delete_one({'_id': pid})
        if not result.deleted_count:
            return False

        student_id = prediction.get('student_id')
        latest = db.predictions.find_one({'student_id': student_id}, sort=[('predicted_at', -1)])
        if latest:
            db.students.update_one(
                {'_id': student_id},
                {'$set': {
                    'risk_score': latest.get('risk_score', 0),
                    'risk_level': latest.get('risk_level', 'LOW'),
                    'last_prediction': latest,
                }}
            )
        else:
            db.students.update_one(
                {'_id': student_id},
                {'$unset': {'risk_score': '', 'risk_level': '', 'last_prediction': ''}}
            )
        return True

    @staticmethod
    def get_all(risk_level=None, limit=50):
        db = get_db()
        query = {}
        if risk_level:
            if risk_level == "HIGH":
                query['risk_score'] = {'$gte': 45}
            elif risk_level == "MEDIUM":
                query['risk_score'] = {'$gte': 25, '$lt': 45}
            elif risk_level == "LOW":
                query['risk_score'] = {'$lt': 25}
                
        cursor = db.predictions.find(query).sort('predicted_at', -1).limit(limit)
        results = []
        for p in cursor:
            student = db.students.find_one({'_id': p.get('student_id')})
            if student:
                user = db.users.find_one({'_id': student.get('user_id')})
                p['student_name'] = user.get('name') if user else 'Unknown'
                p['roll_no'] = student.get('roll_no')
                p['department'] = student.get('department')
            results.append(p)
        return results
