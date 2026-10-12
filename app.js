const markets = {
  stocks: {title:"Stock markets", symbols:[
    ["NASDAQ:AAPL","AAPL","Apple Inc."],["NASDAQ:MSFT","MSFT","Microsoft"],["NASDAQ:NVDA","NVDA","NVIDIA"],["NASDAQ:AMZN","AMZN","Amazon"],["NASDAQ:GOOGL","GOOGL","Alphabet"],["NASDAQ:META","META","Meta Platforms"],["NYSE:TSLA","TSLA","Tesla"],["NYSE:JPM","JPM","JPMorgan Chase"],["NYSE:KO","KO","Coca-Cola"],["NYSE:DIS","DIS","Walt Disney"]]},
  crypto: {title:"Crypto markets", symbols:[
    ["BINANCE:BTCUSDT","BTCUSDT","Bitcoin / Tether"],["BINANCE:ETHUSDT","ETHUSDT","Ethereum / Tether"],["BINANCE:BNBUSDT","BNBUSDT","BNB / Tether"],["BINANCE:SOLUSDT","SOLUSDT","Solana / Tether"],["BINANCE:XRPUSDT","XRPUSDT","XRP / Tether"],["BINANCE:ADAUSDT","ADAUSDT","Cardano / Tether"],["BINANCE:DOGEUSDT","DOGEUSDT","Dogecoin / Tether"],["BINANCE:AVAXUSDT","AVAXUSDT","Avalanche / Tether"],["BINANCE:LINKUSDT","LINKUSDT","Chainlink / Tether"],["BINANCE:LTCUSDT","LTCUSDT","Litecoin / Tether"]]},
  forex: {title:"Forex markets", symbols:[
    ["OANDA:EURUSD","EURUSD","Euro / US Dollar"],["OANDA:GBPUSD","GBPUSD","British Pound / US Dollar"],["OANDA:USDJPY","USDJPY","US Dollar / Japanese Yen"],["OANDA:USDCHF","USDCHF","US Dollar / Swiss Franc"],["OANDA:AUDUSD","AUDUSD","Australian Dollar / US Dollar"],["OANDA:USDCAD","USDCAD","US Dollar / Canadian Dollar"],["OANDA:NZDUSD","NZDUSD","New Zealand Dollar / US Dollar"],["OANDA:EURGBP","EURGBP","Euro / British Pound"],["OANDA:EURJPY","EURJPY","Euro / Japanese Yen"],["OANDA:GBPJPY","GBPJPY","British Pound / Japanese Yen"]]},
  futures: {title:"Futures markets", symbols:[
    ["CME_MINI:ES1!","ES1!","E-mini S&P 500"],["CME_MINI:NQ1!","NQ1!","E-mini Nasdaq-100"],["CBOT_MINI:YM1!","YM1!","E-mini Dow"],["CME_MINI:RTY1!","RTY1!","E-mini Russell 2000"],["COMEX:GC1!","GC1!","Gold futures"],["NYMEX:CL1!","CL1!","Crude oil futures"],["NYMEX:NG1!","NG1!","Natural gas futures"],["CBOT:ZC1!","ZC1!","Corn futures"],["CBOT:ZS1!","ZS1!","Soybean futures"],["CME:6E1!","6E1!","Euro FX futures"]]}
};
let currentMarket = "stocks";
let currentSymbol = markets.stocks.symbols[0][0];
let tvInstances = {};
let visionTv = null;
let visionChart = null;
let visionCandleSeries = null;
let visionBars = [];
let visionDrawings = [];
let visionRefreshTimer = null;

function makeWidget(container, symbol, key) {
  const el = document.getElementById(container);
  if (!el) return;
  el.innerHTML = "";
  if (!window.TradingView) {
    el.innerHTML = '<div class="chart-empty">TradingView could not load. Check your internet connection.</div>';
    return;
  }
  new TradingView.widget({
    autosize: true, symbol, interval: "60", timezone: "Etc/UTC", theme: "dark",
    style: "1", locale: "en", enable_publishing: false, allow_symbol_change: true,
    hide_top_toolbar: false, hide_legend: false, save_image: false,
    container_id: container, backgroundColor: "#0e141b",
    gridColor: "rgba(132, 153, 174, 0.08)",
    studies: [], withdateranges: true, details: false, hotlist: false,
    calendar: false, support_host: "https://www.tradingview.com"
  });
}
function setView(name) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(v => v.classList.toggle("active", v.dataset.view === name));
  const view = document.getElementById("view-" + name);
  if (view) view.classList.add("active");
  const names = {home:"Overview", infrastructure:"White-label platform", vision:"Vision indicators", broker:"Trading terminal"};
  document.getElementById("crumb").textContent = names[name] || "Overview";
  if (name === "vision" && !visionTv) { initVisionChart(); visionTv = true; }
  if (name === "broker") setTimeout(() => window.dispatchEvent(new Event("resize")), 80);
}
document.querySelectorAll("[data-view]").forEach(el => el.addEventListener("click", () => setView(el.dataset.view)));
document.querySelectorAll(".example").forEach(btn => btn.addEventListener("click", () => document.getElementById("instruction").value = btn.dataset.prompt));

// Legacy market-list code removed: the broker now uses the dedicated terminal below.
document.getElementById("visionSymbol").addEventListener("change", () => loadVisionCandles());
document.getElementById("referenceFile").addEventListener("change", e => {
  const f = e.target.files[0];
  document.getElementById("fileName").textContent = f ? `${f.name} · ${(f.size/1024/1024).toFixed(2)} MB` : "No file selected";
});
const svgNS = "http://www.w3.org/2000/svg";
function svgEl(tag, attrs) {
  const e = document.createElementNS(svgNS, tag);
  Object.entries(attrs).forEach(([k,v]) => e.setAttribute(k,v));
  return e;
}
function initVisionChart() {
  const host = document.getElementById("visionTradingView");
  if (!host || !window.LightweightCharts) {
    host.innerHTML = '<div class="chart-empty">Chart library could not load. Check your internet connection.</div>';
    return;
  }
  visionChart = LightweightCharts.createChart(host, {
    width: host.clientWidth, height: host.clientHeight,
    layout: { background: { type: "solid", color: "#0e141b" }, textColor: "#aab7c7", fontFamily: "DM Sans, sans-serif" },
    grid: { vertLines: { color: "rgba(132,153,174,.08)" }, horzLines: { color: "rgba(132,153,174,.08)" } },
    rightPriceScale: { borderColor: "#26303e" }, timeScale: { borderColor: "#26303e", timeVisible: true, secondsVisible: false },
    crosshair: { mode: LightweightCharts.CrosshairMode.Normal }, handleScroll: true, handleScale: true
  });
  visionCandleSeries = visionChart.addSeries(LightweightCharts.CandlestickSeries, {
    upColor: "#26a69a", downColor: "#ef5350", borderVisible: false,
    wickUpColor: "#26a69a", wickDownColor: "#ef5350", priceLineVisible: true
  });
  const resize = new ResizeObserver(() => { if (visionChart) { visionChart.applyOptions({width:host.clientWidth,height:host.clientHeight}); renderAnchoredDrawings(); } });
  resize.observe(host);
  visionChart.timeScale().subscribeVisibleTimeRangeChange(renderAnchoredDrawings);
  loadVisionCandles();
  if (visionRefreshTimer) clearInterval(visionRefreshTimer);
  visionRefreshTimer = setInterval(loadVisionCandles, 15000);
}
async function loadVisionCandles() {
  if (!visionCandleSeries) return;
  const symbol = document.getElementById("visionSymbol").value;
  try {
    const res = await fetch(`https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(symbol)}&interval=15m&limit=240`);
    if (!res.ok) throw new Error("Public candle feed is temporarily unavailable.");
    const rows = await res.json();
    visionBars = rows.map(r => ({time:Math.floor(r[0]/1000),open:+r[1],high:+r[2],low:+r[3],close:+r[4]}));
    visionCandleSeries.setData(visionBars);
    if (!visionChart.timeScale().getVisibleRange()) visionChart.timeScale().fitContent();
    renderAnchoredDrawings();
  } catch (err) {
    document.getElementById("aiStatus").textContent = "Live chart feed unavailable right now. Check your connection and try again.";
  }
}
function svgNode(tag, attrs) { return svgEl(tag, attrs); }
function clearSvg() { const svg=document.getElementById("drawingOverlay"); svg.innerHTML=""; const w=svg.parentElement.clientWidth, h=svg.parentElement.clientHeight; svg.setAttribute("viewBox",`0 0 ${w} ${h}`); }
function renderAnchoredDrawings() {
  if (!visionChart || !visionCandleSeries) return;
  clearSvg(); const svg=document.getElementById("drawingOverlay");
  const ts=visionChart.timeScale(); const width=svg.parentElement.clientWidth-64;
  const colors={horizontal_line:"#f5b942",trend_line:"#39c6a5",rectangle:"#8b7cff",text:"#ffffff"};
  visionDrawings.forEach(d=>{
    const color=d.color||colors[d.type]||"#55d6b0";
    const px=t=> t==null ? null : ts.timeToCoordinate(t);
    const py=p=> p==null ? null : visionCandleSeries.priceToCoordinate(p);
    if(d.type==="horizontal_line") {
      const y=py(d.p1); if(y==null)return;
      svg.appendChild(svgNode("line",{x1:0,y1:y,x2:width,y2:y,stroke:color,"stroke-width":2,"stroke-dasharray":"8 5"}));
      const t=svgNode("text",{x:10,y:Math.max(14,y-7),fill:color,"font-size":13}); t.textContent=d.label||"Level"; svg.appendChild(t);
    } else if(d.type==="trend_line") {
      const x1=px(d.t1),x2=px(d.t2),y1=py(d.p1),y2=py(d.p2); if([x1,x2,y1,y2].some(v=>v==null))return;
      svg.appendChild(svgNode("line",{x1,y1,x2,y2,stroke:color,"stroke-width":2.5,"stroke-linecap":"round"}));
      const t=svgNode("text",{x:x1+7,y:y1-8,fill:color,"font-size":12}); t.textContent=d.label||"Trend line"; svg.appendChild(t);
    } else if(d.type==="rectangle") {
      const x1=px(d.t1),x2=px(d.t2),y1=py(d.p1),y2=py(d.p2); if([x1,x2,y1,y2].some(v=>v==null))return;
      svg.appendChild(svgNode("rect",{x:Math.min(x1,x2),y:Math.min(y1,y2),width:Math.max(1,Math.abs(x2-x1)),height:Math.max(1,Math.abs(y2-y1)),fill:color,"fill-opacity":".08",stroke:color,"stroke-width":2,rx:3}));
      const t=svgNode("text",{x:Math.min(x1,x2)+5,y:Math.min(y1,y2)+15,fill:color,"font-size":12}); t.textContent=d.label||"Zone"; svg.appendChild(t);
    } else if(d.type==="text") {
      const x=px(d.t1),y=py(d.p1); if(x==null||y==null)return;
      const t=svgNode("text",{x,y,fill:color,"font-size":14,"font-weight":"600"}); t.textContent=d.text||d.label||"Note"; svg.appendChild(t);
    }
  });
}
function chartAnchor(x,y) {
  const stage=document.querySelector(".chart-stage"), w=Math.max(1,stage.clientWidth-64), h=stage.clientHeight;
  const time=visionChart.timeScale().coordinateToTime(Math.max(0,Math.min(w,x*w)));
  const price=visionCandleSeries.coordinateToPrice(Math.max(0,Math.min(h,y*h)));
  return {time,price};
}
function drawAnnotations(data) {
  if (!visionChart || !visionCandleSeries) return;
  visionDrawings=[];
  const range=visionChart.timeScale().getVisibleRange();
  if (!range || !visionBars.length) return;
  (data.drawings||[]).forEach(d=>{
    const x=d.x??.2, y=d.y??.5;
    const a=chartAnchor(d.type==="trend_line"?d.x1??.1:x, d.type==="trend_line"?d.y1??.7:y);
    if(a.time==null||a.price==null)return;
    const item={type:d.type,label:d.label||d.type.replace("_"," "),color:d.color,text:d.text,t1:a.time,p1:a.price};
    if(d.type==="trend_line") { const b=chartAnchor(d.x2??.8,d.y2??.3); item.t2=b.time; item.p2=b.price; }
    if(d.type==="rectangle") { const b=chartAnchor(Math.min(1,x+(d.width??.2)),Math.min(1,y+(d.height??.15))); item.t2=b.time; item.p2=b.price; }
    visionDrawings.push(item);
  });
  renderAnchoredDrawings();
  document.getElementById("chartEmpty").style.display=visionDrawings.length?"none":"block";
  document.getElementById("drawingSummary").textContent=data.summary||`${visionDrawings.length} anchored drawing(s) generated`;
  const legend=document.getElementById("drawingLegend"); legend.innerHTML="";
  visionDrawings.forEach(d=>{const chip=document.createElement("span");chip.className="legend-item";chip.textContent=d.label;legend.appendChild(chip);});
}
document.getElementById("analyzeBtn").addEventListener("click", async () => {
  const instruction = document.getElementById("instruction").value.trim();
  const file = document.getElementById("referenceFile").files[0];
  const status = document.getElementById("aiStatus");
  if (!instruction && !file) { status.className="status-message error"; status.textContent="Enter an instruction or choose an image first."; return; }
  const form = new FormData(); form.append("instruction", instruction); if(file) form.append("file", file);
  const btn = document.getElementById("analyzeBtn"); btn.disabled=true; btn.textContent="Analyzing…";
  status.className="status-message"; status.textContent="Sending your request to the configured AI model…";
  try {
    const response = await fetch("/api/analyze", {method:"POST",body:form});
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "Analysis failed.");
    if (!Array.isArray(result.drawings) || result.drawings.length === 0) throw new Error(result.error || "The AI did not return any chart drawings. Try a more specific drawing instruction.");
    drawAnnotations(result);
    status.className="status-message";
    status.textContent=`${result.drawings.length} drawing(s) generated. Review the overlay on the chart.`;
  } catch (err) {
    status.className="status-message error"; status.textContent=err.message;
  } finally { btn.disabled=false; btn.innerHTML='Generate chart drawings <span>↗</span>'; }
});
document.getElementById("clearDrawings").addEventListener("click", () => { visionDrawings=[]; renderAnchoredDrawings(); document.getElementById("chartEmpty").style.display="block"; document.getElementById("drawingSummary").textContent="No generated drawings yet"; document.getElementById("drawingLegend").innerHTML=""; });


// Dedicated exchange-style terminal: market list on the left, TradingView chart in the center, order panel on the right.
let terminalMarket = "crypto";
let terminalSymbol = markets.crypto.symbols[0][0];
let terminalWidgetReady = false;
function openMarketTerminal(market) {
  if (!markets[market]) return;
  // Ensure the broker workspace itself is visible before opening the selected market.
  setView("broker");
  terminalMarket = market;
  terminalSymbol = markets[market].symbols[0][0];
  document.getElementById("brokerOverview").style.display = "none";
  document.getElementById("brokerTerminal").classList.add("show");
  document.getElementById("terminalMarketName").textContent = market.toUpperCase();
  document.getElementById("terminalPageTitle").textContent = ({stocks:"Stock terminal",crypto:"Crypto terminal",forex:"Forex terminal",futures:"Futures terminal"})[market];
  document.getElementById("marketSearch").value = "";
  renderExchangeSymbols();
  selectTerminalSymbol(terminalSymbol);
  setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
}
function renderExchangeSymbols() {
  const list = document.getElementById("exchangeSymbolList");
  const filter = (document.getElementById("marketSearch").value || "").toLowerCase();
  list.innerHTML = "";
  markets[terminalMarket].symbols.filter(s => s[1].toLowerCase().includes(filter) || s[2].toLowerCase().includes(filter)).forEach(s => {
    const row = document.createElement("button");
    row.className = "exchange-symbol" + (s[0] === terminalSymbol ? " active" : "");
    row.innerHTML = `<span class="exchange-coin">${s[1].replace("USDT","").slice(0,3)}</span><span class="exchange-symbol-meta"><b>${s[1]}</b><small>${s[2]}</small></span><span class="exchange-fav">☆</span>`;
    row.addEventListener("click", () => selectTerminalSymbol(s[0]));
    list.appendChild(row);
  });
}
function selectTerminalSymbol(symbol) {
  terminalSymbol = symbol;
  const item = markets[terminalMarket].symbols.find(s => s[0] === symbol);
  if (!item) return;
  document.getElementById("terminalInstrument").textContent = item[1];
  document.getElementById("terminalExchange").textContent = symbol.split(":")[0];
  document.getElementById("amountAsset").textContent = item[1].replace("USDT","");
  document.getElementById("terminalAssetBadge").textContent = terminalMarket === "crypto" ? "₿" : terminalMarket === "forex" ? "⇄" : terminalMarket === "futures" ? "⌁" : "▥";
  renderExchangeSymbols();
  const interval = document.getElementById("terminalInterval").value;
  const el = document.getElementById("terminalTradingView");
  el.innerHTML = "";
  if (window.TradingView) {
    new TradingView.widget({
      autosize:true, symbol:symbol, interval:interval, timezone:"Etc/UTC", theme:"dark",
      style:"1", locale:"en", enable_publishing:false, allow_symbol_change:true,
      hide_top_toolbar:false, hide_legend:false, save_image:false, container_id:"terminalTradingView",
      backgroundColor:"#050505", gridColor:"rgba(255,255,255,0.06)",
      withdateranges:true, details:false, hotlist:false, calendar:false,
      support_host:"https://www.tradingview.com"
    });
  } else {
    el.innerHTML = '<div class="chart-empty">TradingView unavailable. Check your internet connection.</div>';
  }
}
document.addEventListener("click", event => {
  const btn = event.target.closest("[data-open-market]");
  if (btn) {
    event.preventDefault();
    openMarketTerminal(btn.dataset.openMarket);
  }
});
document.getElementById("backToMarkets").addEventListener("click", () => {
  document.getElementById("brokerTerminal").classList.remove("show");
  document.getElementById("brokerOverview").style.display = "";
});
document.getElementById("marketSearch").addEventListener("input", renderExchangeSymbols);
document.getElementById("terminalInterval").addEventListener("change", () => selectTerminalSymbol(terminalSymbol));
