"""
backend_example.py — ตัวอย่าง Flask endpoint สำหรับ Dynamic Gesture
─────────────────────────────────────────────────────────────────────
ติดตั้ง: pip install flask numpy tensorflow  (หรือ torch)
รัน   : python backend_example.py

endpoint: POST /predict_sequence
body   : { "sequence": [[63 floats] x 30] }
response: { "prediction": "Hello", "confidence": 0.92 }
"""

from flask import Flask, request, jsonify
import numpy as np

app = Flask(__name__)

# ── โหลดโมเดล (ปรับตามโมเดลจริงของคุณ) ────────────────────────
# import tensorflow as tf
# model = tf.keras.models.load_model('asl_lstm_model.h5')
# LABELS = ['Hello', 'ThankYou', 'ILoveYou', ...]   # ← ตรงกับ training

# stub สำหรับทดสอบ
model  = None
LABELS = ['Hello', 'ThankYou', 'ILoveYou']

@app.route('/health', methods=['GET'])
def health():
    """[8] Warm-up endpoint — called by frontend on app load to wake Render server"""
    return jsonify({'status': 'ok', 'model_loaded': model is not None})


@app.route('/predict_sequence', methods=['POST'])
def predict_sequence():
    data = request.get_json(force=True)

    # ── Validate ────────────────────────────────────────────────
    sequence = data.get('sequence')
    if not sequence or len(sequence) != 30:
        return jsonify({'error': 'sequence must have exactly 30 frames'}), 400
    for frame in sequence:
        if len(frame) != 63:
            return jsonify({'error': 'each frame must have 63 values'}), 400

    # ── Inference ───────────────────────────────────────────────
    arr = np.array(sequence, dtype=np.float32)   # shape (30, 63)
    arr = arr[np.newaxis, ...]                    # shape (1, 30, 63)

    if model is not None:
        probs      = model.predict(arr)[0]        # shape (num_classes,)
        idx        = int(np.argmax(probs))
        confidence = float(probs[idx])
        prediction = LABELS[idx]
    else:
        # STUB RESPONSE — แทนด้วยโมเดลจริง
        prediction = 'Hello'
        confidence = 0.95

    return jsonify({'prediction': prediction, 'confidence': confidence})


if __name__ == '__main__':
    # CORS สำหรับ dev (ลบออกใน production หรือใช้ flask-cors)
    from flask import after_this_request
    @app.after_request
    def add_cors(resp):
        resp.headers['Access-Control-Allow-Origin']  = '*'
        resp.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        resp.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return resp

    app.run(debug=True, port=5000)
