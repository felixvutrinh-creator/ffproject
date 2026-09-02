from flask import Flask, jsonify
from datetime import datetime
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # ZUGRIFF vom Frontend halt über CORS amk

@app.route("/api/time")
def get_time():
    return jsonify({"time": datetime.now().strftime("%H:%M:%S")})

if __name__ == "__main__":
    app.run(debug=True, port=5001)