import os
import json
import base64
from flask import Flask, render_template, request, jsonify
from openai import OpenAI
from dotenv import load_dotenv

# Load local settings from .env so Windows users do not need to set variables every session.
load_dotenv()

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024

@app.route("/")
def home():
    return render_template("index.html")

@app.post("/api/analyze")
def analyze():
    """Uses a real OpenAI model. Set OPENAI_API_KEY in your environment first."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        return jsonify({"error": "AI is not configured yet. Create a file named .env in the tradarn folder, add OPENAI_API_KEY=your_api_key_here, save it, and restart the server. Get an API key from https://platform.openai.com/api-keys."}), 503

    instruction = (request.form.get("instruction") or "").strip()
    uploaded = request.files.get("file")
    if not instruction and not uploaded:
        return jsonify({"error": "Enter an instruction or upload an image/video."}), 400

    prompt = f"""
You are Tradarn's chart annotation assistant. The user wants chart drawings, not financial advice.
Convert their request into JSON only, matching this schema:
{{
  "summary": "short explanation of the requested drawing",
  "drawings": [
    {{"type":"horizontal_line","label":"Support","y":0.68,"color":"#f5b942"}},
    {{"type":"trend_line","label":"Trend line","x1":0.12,"y1":0.72,"x2":0.78,"y2":0.30,"color":"#39c6a5"}},
    {{"type":"rectangle","label":"Zone","x":0.25,"y":0.35,"width":0.22,"height":0.12,"color":"#8b7cff"}},
    {{"type":"text","label":"Note","x":0.42,"y":0.45,"text":"example","color":"#ffffff"}}
  ]
}}
Coordinates must be normalized from 0 to 1 relative to the chart area, with y=0 at the top.
Use only types horizontal_line, trend_line, rectangle, and text. ALWAYS return at least one drawing for a valid drawing request. For “draw a line”, choose horizontal_line unless a trend is specified. For “support” or “resistance”, use horizontal_line. For a zone/area, use rectangle. Coordinates must be plausible and within 0 to 1; widths and heights must be positive. Do not recommend buying, selling, longing, or shorting. If the user asks to locate a recent swing/high/low but no chart image is supplied, state in summary that placements are approximate visual locations mapped onto the currently visible candle range; do not claim the model identified exact market support or resistance from hidden chart data. Return valid JSON and no markdown.
User instruction: {instruction or "Analyze the uploaded visual and extract requested chart annotations."}
"""
    content = [{"type": "text", "text": prompt}]
    if uploaded and uploaded.filename:
        raw = uploaded.read()
        mime = uploaded.mimetype or "application/octet-stream"
        if mime.startswith("image/"):
            data_url = f"data:{mime};base64," + base64.b64encode(raw).decode("utf-8")
            content.append({"type": "image_url", "image_url": {"url": data_url}})
        elif mime.startswith("video/"):
            return jsonify({"error": "Video upload is not enabled in this starter. Export key frames as images, or add a video-frame extraction pipeline."}), 415
        else:
            return jsonify({"error": "Please upload an image file, or enter text instructions."}), 415

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=os.getenv("OPENAI_VISION_MODEL", "gpt-4o-mini"),
            messages=[{"role": "user", "content": content}],
            response_format={"type": "json_object"},
            temperature=0.2,
        )
        result = json.loads(response.choices[0].message.content or "{}")
        if not isinstance(result, dict) or not isinstance(result.get("drawings"), list):
            return jsonify({"error": "The AI response did not contain a valid drawings list. Please try a clearer instruction."}), 502
        allowed = {"horizontal_line", "trend_line", "rectangle", "text"}
        clean = []
        for drawing in result["drawings"]:
            if not isinstance(drawing, dict) or drawing.get("type") not in allowed:
                continue
            # Clamp normalized coordinates to the chart overlay bounds.
            for key in ("x", "y", "x1", "y1", "x2", "y2"):
                if key in drawing:
                    try:
                        drawing[key] = max(0.0, min(1.0, float(drawing[key])))
                    except (TypeError, ValueError):
                        drawing.pop(key, None)
            for key in ("width", "height"):
                if key in drawing:
                    try:
                        drawing[key] = max(0.01, min(1.0, float(drawing[key])))
                    except (TypeError, ValueError):
                        drawing.pop(key, None)
            clean.append(drawing)
        if not clean:
            return jsonify({"error": "The AI returned no usable drawing. Try: Draw a horizontal support line across the middle of the chart."}), 502
        result["drawings"] = clean
        result.setdefault("summary", f"Generated {len(clean)} chart annotation(s).")
        return jsonify(result)
    except Exception as exc:
        app.logger.exception("AI annotation failed")
        return jsonify({"error": f"AI analysis failed: {str(exc)}"}), 500

if __name__ == "__main__":
    app.run(debug=True)
