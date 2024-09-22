from flask import Flask, request, jsonify
from flask_cors import CORS
from prompt_agent import prompt_model
from backend import translate_ens_to_address

# Allow CORS for frontend to work
app = Flask(__name__)
CORS(app)

@app.route("/json", methods=["POST"])
def handle_json():
    # Get the JSON data from the request
    data = request.get_json()

    # Request data validations
    if not data or not isinstance(data, dict):
        return jsonify({"error": "Invalid JSON"}), 400
    if "user_request" not in data:
        return jsonify({"error": "Missing 'user_request' field"}), 400
    
    print(data)

    # Get the user request from the JSON data
    user_request = data["user_request"]
    user_wallet = data["user_wallet"]
    print("Raw request:", user_request)
    print("User wallet:", user_wallet)

    # Convert the ENS names to actual addresses
    user_request = translate_ens_to_address(user_request)
    print("Ens resolved:", user_request)

    # Match the users request with a specific or generic action
    response = prompt_model(user_request, user_wallet)

    # Return the modified data as JSON response
    return jsonify(response)

if __name__ == "__main__":
    app.run(debug=True)
