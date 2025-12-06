from flask import Flask, jsonify, request
from supabase_client import supabase  # your existing file

app = Flask(__name__)

# Route to fetch players from Supabase
@app.route("/players", methods=["GET"])
def get_players():
    response = supabase.table("players").select("*").execute()
    return jsonify(response.data)

# Route to add a player
@app.route("/players", methods=["POST"])
def add_player():
    data = request.json
    response = supabase.table("players").insert(data).execute()
    return jsonify({"status": "ok", "result": response.data})

if __name__ == "__main__":
    app.run(port=5000, debug=True)

# supabase_client.py
from supabase import create_client, Client
from dotenv import load_dotenv
import os

load_dotenv()  # loads .env if present

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")  # secret key, backend only

if not SUPABASE_URL or not SUPABASE_KEY:
    raise RuntimeError("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in environment")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# server.py
from flask import Flask, request, jsonify
from supabase_client import supabase
from dotenv import load_dotenv
import os

load_dotenv()

app = Flask(__name__)

# GET all inntekter (sorted by id ascending)
@app.route("/inntekter", methods=["GET"])
def get_inntekter():
    resp = supabase.table("inntekter").select("*").order("id", ascending=True).execute()
    if resp.error:
        return jsonify({"error": str(resp.error)}), 500
    return jsonify(resp.data), 200

# POST one inntekt
# expected JSON: { "amount": 1000.0, "date": "2025-12-01", "description": "Lønn" }
@app.route("/inntekter", methods=["POST"])
def add_inntekt():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Missing JSON body"}), 400

    payload = {
        "amount": data.get("amount"),
        "date": data.get("date"),
        "description": data.get("description")
    }

    resp = supabase.table("inntekter").insert(payload).execute()
    if resp.error:
        return jsonify({"error": str(resp.error)}), 500
    return jsonify(resp.data), 201

# POST bulk inntekter (array of objects) - useful for syncing local existing entries
# expected JSON: [{ "amount": ..., "date": "...", "description": "..." }, ...]
@app.route("/inntekter/bulk", methods=["POST"])
def add_inntekter_bulk():
    data = request.get_json()
    if not data or not isinstance(data, list):
        return jsonify({"error": "Expected JSON array"}), 400

    resp = supabase.table("inntekter").insert(data).execute()
    if resp.error:
        return jsonify({"error": str(resp.error)}), 500
    return jsonify(resp.data), 201

# DELETE by id
@app.route("/inntekter/<int:inn_id>", methods=["DELETE"])
def delete_inntekt(inn_id):
    resp = supabase.table("inntekter").delete().eq("id", inn_id).execute()
    if resp.error:
        return jsonify({"error": str(resp.error)}), 500
    return jsonify({"deleted": resp.data}), 200


if __name__ == "__main__":
    # For development only. In production use gunicorn or similar.
    app.run(host="127.0.0.1", port=5000, debug=True)
