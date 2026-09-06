from flask import Flask, jsonify
from flask_cors import CORS
from state import state
from poller import start_poller

app = Flask(__name__)
CORS(app)

@app.route("/")
def home():
    return jsonify({"status": "Backend läuft", "endpoints": ["/api/state"]})

@app.route("/api/state")
def get_state():
    return jsonify(state.get_all())

if __name__ == "__main__":
    start_poller()  
    app.run(debug=True, port=5001, use_reloader=False)  