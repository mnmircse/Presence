from flask import Flask, request, jsonify
import os
import uuid
from FaceRecUtils import recognize, train

app = Flask(__name__)

# Temporary folder to store uploaded images
UPLOAD_FOLDER = "temp"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

@app.route("/recognize", methods=["POST"])
def recognize_face():
    # Check if the request has the file part
    if "image" not in request.files:
        return jsonify({"error": "No image provided"}), 400

    file = request.files["image"]

    # Save file temporarily
    filename = f"{uuid.uuid4().hex}.jpg"
    filepath = os.path.join(UPLOAD_FOLDER, filename)
    file.save(filepath)

    # Run recognition
    person, confidence = recognize(filepath)

    # Remove temporary file
    os.remove(filepath)

    # Return result
    return jsonify({
        "person": person,
        "confidence": confidence
    })

@app.route("/train")
def train_all():
    result = train()
    return result

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
