# Tradarn — website starter

A polished Flask website starter with three workspaces:
1. White-label trading infrastructure overview
2. AI vision indicator studio (real OpenAI API call; text/image to drawing instructions)
3. Multi-market terminal UI with TradingView widgets and 10 symbols per market

## Run it on Windows using Notepad

1. Install Python 3.11+ from https://www.python.org/downloads/ and enable **Add Python to PATH**.
2. Extract the ZIP to a folder such as `C:\tradarn`.
3. Open Command Prompt in that folder.
4. Run:
   ```bat
   py -m venv .venv
   .venv\Scripts\activate
   pip install -r requirements.txt
   ```
5. Configure your AI key in Command Prompt (replace the example value):
   ```bat
   set OPENAI_API_KEY=your_real_api_key
   ```
   Optional model override:
   ```bat
   set OPENAI_VISION_MODEL=gpt-4o-mini
   ```
6. Start the site:
   ```bat
   py app.py
   ```
7. Open http://127.0.0.1:5000 in your browser.

You can edit `templates/index.html`, `static/style.css`, and `static/app.js` with Notepad. Keep the folder structure intact.

## Important implementation boundaries

- **TradingView:** the chart widgets load real market charts from TradingView when online and when the selected symbol/data is supported. Data availability, delays and exchange entitlements depend on TradingView and its providers. The public embed widget does not expose a supported API for placing native drawings programmatically.
- **AI annotations:** `/api/analyze` calls the configured OpenAI model for text or image input. The generated drawings are shown as an SVG overlay over the TradingView widget. This is a visual overlay and is not anchored to actual price/time coordinates. For production-grade chart drawings, use TradingView Advanced Charts with the appropriate license and its drawing API.
- **Video:** the starter explicitly rejects video uploads. To support video, add server-side frame extraction (e.g. FFmpeg), select relevant frames, and send those frames to a vision model.
- **Brokerage:** account balance and metrics are illustrative only. Orders are disabled. Real trading needs a licensed broker/execution API, live account/portfolio services, market-data entitlements, KYC/AML, security controls, audit logs, risk checks, legal review and applicable financial licenses.
- **Multi-asset wallet:** one screen can unify balances, but a genuinely unified balance across stocks, forex, crypto and futures requires custody/clearing/prime-broker integrations and asset-specific collateral/risk rules.
- **Sharia compliance:** do not assume leverage, short selling or futures are compliant by changing the UI. Compliance depends on contract structure and scholarly/legal review. Obtain qualified Sharia and regulatory advice before offering a product as compliant.
- **Competitors:** names in the infrastructure page are examples of companies/categories to research, not endorsements or a complete competitor analysis.


## Configure the Vision Indicator AI

The prompt-to-drawing feature requires an OpenAI API key; it does not work offline and will not draw anything until the key is configured.

1. In the same `tradarn` folder as `app.py`, create a new text file named `.env` (make sure it is not named `.env.txt`).
2. Put these lines in it, replacing the placeholder with your own API key:

   ```env
   OPENAI_API_KEY=your_api_key_here
   OPENAI_VISION_MODEL=gpt-4o-mini
   ```

3. Save the file and restart the server (`Ctrl+C`, then `python app.py`).
4. In Vision Indicator Studio, type an instruction such as `Draw a horizontal support line across the lower third of the chart` and click **Generate chart drawings**.

Create/manage an API key at https://platform.openai.com/api-keys. API usage may cost money. Never share or publish the key.

**Chart placement limitation:** This starter draws SVG annotations over the embedded TradingView widget. Text prompts are converted to approximate overlay coordinates; the public widget does not expose its underlying candles/prices to this API, so instructions like “draw at the latest swing high” cannot be price/time accurate unless you upload a screenshot or integrate a licensed chart library with market data. Video uploads are not supported in this starter.
