from flask import Flask, request, jsonify 
from flask_cors import CORS
from transformers import AutoTokenizer, AutoModelForSequenceClassification
import torch
import requests
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Load model & tokenizer once during app startup
MODEL_NAME = "mrm8488/bert-tiny-finetuned-fake-news-detection"
tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME)

FACT_CHECK_API_KEY = os.getenv("FACT_CHECK_API_KEY")
NEWS_API_KEY = os.getenv("NEWS_API_KEY")  # 🔑 Ensure this key is in your .env file

@app.route("/")
def home():
    return "Backend is working!"

@app.route("/check", methods=["POST"])
def check_news():
    data = request.get_json()
    text = data.get("text", "")

    if not text:
        return jsonify({"error": "No text provided"}), 400

    # Tokenize input
    inputs = tokenizer(text, return_tensors="pt", truncation=True, padding=True)
    outputs = model(**inputs)
    probs = torch.softmax(outputs.logits, dim=1)
    prediction = torch.argmax(probs, dim=1).item()

    # Interpret prediction
    label = "Real" if prediction == 1 else "Fake"
    confidence = float(probs[0][prediction]) * 100

    return jsonify({
        "verdict": label,
        "confidence": f"{confidence:.2f}%"
    })

@app.route("/fact-check", methods=["POST"])
def fact_check():
    data = request.get_json()
    query = data.get("query", "")

    if not query:
        return jsonify({"error": "No query provided"}), 400

    url = "https://factchecktools.googleapis.com/v1alpha1/claims:search"
    params = {
        "query": query,
        "key": FACT_CHECK_API_KEY,
        "languageCode": "en"
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        result = response.json()

        claims = result.get("claims", [])
        formatted_claims = []
        for claim in claims:
            formatted_claims.append({
                "text": claim.get("text"),
                "claimant": claim.get("claimant"),
                "claimDate": claim.get("claimDate"),
                "reviewer": claim.get("claimReview", [{}])[0].get("publisher", {}).get("name"),
                "rating": claim.get("claimReview", [{}])[0].get("text")
            })

        return jsonify({"claims": formatted_claims})

    except requests.exceptions.RequestException as e:
        return jsonify({"error": "Failed to fetch fact check data", "details": str(e)}), 500

# ✅ NEW: Related News Articles route
@app.route("/related-articles", methods=["POST"])
def related_articles():
    data = request.get_json()
    query = data.get("query", "news")
    api_key = os.getenv("NEWS_API_KEY")

    url = "https://newsapi.org/v2/everything"
    params = {
        "q": query,
        "language": "en",
        "sortBy": "publishedAt",
        "pageSize": 5,
        "apiKey": api_key
    }

    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        return jsonify(response.json())
    except requests.exceptions.RequestException as e:
        return jsonify({"error": "Failed to fetch related articles", "details": str(e)}), 500


if __name__ == "__main__":
    app.run(debug=True)
