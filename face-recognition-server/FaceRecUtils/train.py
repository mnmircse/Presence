from pathlib import Path
import os
import cv2
import pickle
import numpy as np
from uniface import create_detector, create_recognizer

def train() -> str:
    detector = create_detector("RetinaFace")
    recognizer = create_recognizer("AdaFace")

    BASE_DIR = Path(__file__).resolve().parent

    DATA_DIR = BASE_DIR / "dataset"
    DB_FILE = BASE_DIR / "trained_output" / "face_db.pkl"

    os.makedirs(BASE_DIR / "trained_output", exist_ok=True)

    face_db = {}

    for person in os.listdir(DATA_DIR):
        person_dir = DATA_DIR / person
        if not person_dir.is_dir():
            continue

        embeddings = []
        print(f"Processing: {person}")

        for img_name in os.listdir(person_dir):
            img_path = person_dir / img_name
            img = cv2.imread(str(img_path))  # cv2 needs str

            if img is None:
                print("  Skipped (cannot read):", img_name)
                continue

            faces = detector.detect(img)

            if len(faces) == 0:
                print("  No face detected:", img_name)
                continue

            face = faces[0]
            emb = recognizer(img, face.landmarks)
            embeddings.append(emb.flatten())

            print("  Added:", img_name)

        if len(embeddings) == 0:
            print("  ❌ No valid faces for", person)
            continue

        face_db[person] = np.mean(embeddings, axis=0)
        print(f"  ✅ Saved {len(embeddings)} embeddings for {person}\n")

    with open(DB_FILE, "wb") as f:
        pickle.dump(face_db, f)

    print("===================================")
    print("🎉 Face database created successfully")
    print("People enrolled:", list(face_db.keys()))
    print("Saved to:", DB_FILE)

    return f"People enrolled {list(face_db.keys())}"

if __name__ == "__main__":
    train()
