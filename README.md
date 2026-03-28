Titan Trader — Autonomous AI Trading Agent
A fully autonomous trading system combining statistically validated strategies with AI-powered sentiment analysis via Ollama. Includes equity and options trading (Wheel Strategy, Iron Condors), multi-layered risk management, and security-hardened architecture.
Architecture Overview
```
┌─────────────────────────────────────────────────────────────────┐
│                     ORCHESTRATOR (core loop)                     │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │  Market   │  │  Strategy  │  │  Ollama  │  │    Risk      │  │
│  │  Data     │→ │  Ensemble  │→ │Sentiment │→ │  Management  │  │
│  │  Pipeline │  │  Engine    │  │ Analysis │  │  Engine      │  │
│  └──────────┘  └────────────┘  └──────────┘  └──────┬───────┘  │
│                                                      │          │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────▼───────┐  │
│  │ Options  │  │   Iron     │  │  Wheel   │  │  Execution   │  │
│  │ Greeks   │← │  Condor    │← │ Strategy │← │  Engine      │  │
│  │ Engine   │  │  Strategy  │  │          │  │  (Alpaca)    │  │
│  └──────────┘  └────────────┘  └──────────┘  └──────────────┘  │
│                                                                  │
│  ┌──────────┐  ┌────────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Database │  │  Monitoring│  │  Audit   │  │  Encryption  │  │
│  │ (SQLite) │  │  (Prom)   │  │  Logger  │  │  \& Secrets   │  │
│  └──────────┘  └────────────┘  └──────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```
Strategies (Empirically Validated)
Equity Strategies (Ensemble Voting)
All strategies run in parallel and vote. Trades only execute when 60%+ strategies agree.
Strategy	Basis	Sharpe Ratio	Description
Bollinger Mean Reversion	CWMR research (NYU)	1.74	Buy oversold (RSI<30 + below lower BB), sell overbought
Z-Score Mean Reversion	PAMR principles	1.63	Multi-timeframe statistical mean reversion
EMA Crossover	FTRL principles	1.04	Dual EMA crossover with ADX trend filter
MACD Momentum	Classic momentum	~0.8	MACD crossovers with histogram divergence
The system uses the Hurst exponent to detect market regime (trending vs. mean-reverting) and weights strategies accordingly.
Options Strategies
Strategy	Annual Return	Win Rate	Description
Wheel (CSP + CC)	12-25%	60-75%	Sell puts on quality stocks, sell calls if assigned
Iron Condor	8-15%	86-98%	Market-neutral premium collection, close at 50% profit
Risk Management (Multi-Layer)
```
Layer 1: Per-Trade Risk       → Max 2% of portfolio per trade
Layer 2: Position Sizing      → Max 10% in any single position
Layer 3: Portfolio Exposure    → Max 60% total exposure
Layer 4: Options Allocation    → Max 40% in options
Layer 5: Daily Loss Breaker   → Halt trading at 3% daily loss
Layer 6: Weekly Loss Breaker  → Suspend trading at 7% weekly loss
Layer 7: Max Drawdown Kill    → Full shutdown at 15% drawdown
Layer 8: Emergency Kill Switch → Manual override, liquidates everything
```
Security Features
Secrets Management: All credentials via environment variables, never hardcoded
Encryption at Rest: Fernet encryption for local data via `SecureKeyManager`
Audit Trail: HMAC-signed immutable audit log for all trading actions
Log Sanitization: Automatic redaction of API keys, tokens, passwords in logs
Rate Limiting: Token-bucket rate limiter prevents API abuse
Docker Hardening: Non-root user, dropped capabilities, read-only filesystem, resource limits
Network Isolation: Internal Docker network, only monitoring port exposed
Input Validation: Pydantic models with hard safety limits (e.g., risk can't exceed 5%)
Quick Start
1. Prerequisites
Python 3.12+
Ollama running locally with a model loaded
Alpaca account (free, paper trading)
2. Setup
```bash
# Clone and enter directory
cd titan-trader

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Linux/Mac
# or: venv\\Scripts\\activate  # Windows

# Install dependencies
pip install -r requirements.txt

# Configure
cp .env.example .env
# Edit .env with your Alpaca API keys
```
3. Get Alpaca API Keys
Sign up at https://alpaca.markets
Go to Paper Trading dashboard
Generate API keys
Add to your `.env` file
4. Setup Ollama
```bash
# Pull a model (if not already done)
ollama pull llama3.1:8b

# Verify it's running
curl http://localhost:11434/api/tags
```
5. Run
```bash
# Health check first
python main.py --health

# Run a single cycle to test
python main.py --cycle

# Start autonomous trading (paper mode)
python main.py

# Check status
python main.py --status
```
Docker Deployment
```bash
# Start everything (trading agent + Ollama)
docker-compose up -d

# Check health
curl http://localhost:9090/health

# View logs
docker-compose logs -f titan-trader

# Stop
docker-compose down
```
CLI Commands
Command	Description
`python main.py`	Start autonomous trading loop
`python main.py --health`	Check system health (broker, Ollama, DB)
`python main.py --status`	Full system status with portfolio details
`python main.py --cycle`	Run one analysis cycle and exit
`python main.py --kill-switch`	EMERGENCY: Halt all trading, cancel orders
`python main.py --deactivate-kill`	Resume trading after kill switch
`python main.py --live`	Enable live trading (requires confirmation)
`python main.py --log-level DEBUG`	Verbose logging
Monitoring
The system exposes HTTP endpoints on port 9090:
Endpoint	Description
`GET /health`	System health check (200 = healthy, 503 = degraded)
`GET /metrics`	Prometheus-compatible metrics
`GET /status`	Full JSON system status
Key Metrics
`titan\_trades\_executed` — Total trades executed
`titan\_portfolio\_equity` — Current portfolio value
`titan\_portfolio\_drawdown` — Current drawdown from peak
`titan\_kill\_switch\_active` — 1 if kill switch is engaged
`titan\_cycle\_duration\_seconds` — Time per analysis cycle
Project Structure
```
titan-trader/
├── main.py                    # Entry point \& CLI
├── config/
│   └── settings.py            # Pydantic settings with validation
├── core/
│   ├── orchestrator.py        # Main trading loop
│   └── database.py            # SQLite trade history \& state
├── data/
│   ├── market\_data.py         # Alpaca data pipeline with caching
│   └── indicators.py          # Technical indicators (RSI, MACD, BB, etc.)
├── strategies/
│   ├── base.py                # Strategy interface \& signal types
│   ├── mean\_reversion.py      # Bollinger \& Z-Score mean reversion
│   ├── trend\_following.py     # EMA crossover \& MACD momentum
│   └── ensemble.py            # Weighted voting ensemble
├── options/
│   ├── greeks.py              # Black-Scholes Greeks calculator
│   ├── wheel.py               # Wheel strategy (CSP + CC)
│   └── iron\_condor.py         # Iron condor strategy
├── ollama/
│   ├── sentiment.py           # Ollama sentiment analysis
│   └── news\_fetcher.py        # Financial news from SEC, Alpaca, etc.
├── execution/
│   └── broker.py              # Alpaca order execution engine
├── risk/
│   └── manager.py             # Multi-layer risk management
├── monitoring/
│   └── health.py              # Prometheus metrics \& health checks
├── utils/
│   ├── security.py            # Encryption, audit, rate limiting
│   └── logging\_config.py      # Structured logging
├── docker/
│   └── Dockerfile             # Multi-stage secure Docker build
├── docker-compose.yml         # Full stack deployment
├── requirements.txt           # Python dependencies
├── .env.example               # Configuration template
└── .gitignore                 # Security-aware gitignore
```
How the Ensemble Works
```
Market Data → \[Indicators] → \[Strategy 1: Bollinger MR] → STRONG\_BUY (0.85)
                             → \[Strategy 2: Z-Score MR]  → BUY (0.72)
                             → \[Strategy 3: EMA Cross]   → HOLD (0.30)
                             → \[Strategy 4: MACD Mom]    → BUY (0.65)
                             ↓
                      \[Weighted Voting]
                      Score: +0.58 → BUY
                      Agreement: 75% (3/4 bullish)
                      Confidence: 0.72
                             ↓
                      \[Ollama Sentiment] → NEUTRAL (no veto)
                             ↓
                      \[Risk Manager] → APPROVED (risk score: 0.35)
                             ↓
                      \[Position Sizing] → 45 shares ($4,500)
                             ↓
                      \[Alpaca Execution] → Limit order submitted
```
Safety Notes
ALWAYS start with paper trading. Run for weeks before considering live.
The kill switch (`--kill-switch`) is your emergency brake. It cancels all orders and halts trading.
Live mode requires typing "CONFIRM LIVE TRADING" — this is intentional friction.
Risk limits have hard caps in the code (e.g., max risk per trade cannot exceed 5% even if configured higher).
The system logs every trade decision and risk check to an HMAC-signed audit trail.
Monitor the system via the health endpoint — set up alerts for non-200 responses.
Disclaimer
This software is for educational and research purposes. Trading involves substantial risk of loss. Past performance of any strategy does not guarantee future results. Always paper trade first and never risk money you cannot afford to lose.
