import cv2
import pickle
import numpy as np
from pathlib import Path
from uniface import create_detector, create_recognizer

# Initialize models
detector = create_detector("RetinaFace")
recognizer = create_recognizer("AdaFace")

BASE_DIR = Path(__file__).resolve().parent
db_path = BASE_DIR / "trained_output" / "face_db.pkl"

# Load face database
with open(db_path, "rb") as f:
    DB = pickle.load(f)

def cosine(a, b):
    a = a.flatten()
    b = b.flatten()
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

def recognize(image_path, threshold=0.6):
    img = cv2.imread(image_path)
    if img is None:
        return None, 0

    faces = detector.detect(img)
    if len(faces) == 0:
        return None, 0

    face = faces[0]  # first face
    test_emb = recognizer(img, face.landmarks)  # <-- CORRECT

    best_name = "unknown"
    best_score = 0.0

    for name, emb in DB.items():
        score = cosine(test_emb, emb)
        if score > best_score:
            best_score = score
            best_name = name

    if best_score < threshold:
        best_name = "unknown"

    return best_name, float(best_score)
