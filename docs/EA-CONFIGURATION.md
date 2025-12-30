# MT5 Expert Advisor Configuration Guide

This guide explains how to install and configure the SignalSender and SignalReceiver Expert Advisors for the Signal Service Platform.

## Prerequisites

- MetaTrader 5 terminal installed
- Active trading account (demo or live)
- Backend API running and accessible
- API key for your MT5 account (see "Getting Your API Key" below)

## Installation

### 1. Copy EA Files

Copy the EA files from the `EA's` folder to your MT5 data directory:

```
EA's/SignalSenderEA.mq5   → [MT5 Data Folder]/MQL5/Experts/
EA's/SignalReceiverEA.mq5 → [MT5 Data Folder]/MQL5/Experts/
```

To find your MT5 Data Folder:
1. Open MetaTrader 5
2. Go to **File → Open Data Folder**

### 2. Compile the EAs

1. Open **MetaEditor** (press F4 in MT5)
2. Navigate to **Experts** folder
3. Double-click each EA file
4. Press **Compile** (F7) or click the Compile button
5. Verify no errors in the output

### 3. Allow Web Requests

**Critical Step** - Without this, the EAs cannot communicate with the server:

1. Go to **Tools → Options → Expert Advisors**
2. Check **"Allow WebRequest for listed URL"**
3. Add your API URLs:
   - `https://your-backend-url.railway.app`
   - Or for local testing: `http://localhost:3001`
4. Click **OK**

### 4. Enable AutoTrading

Click the **AutoTrading** button in the toolbar (should be green)

---

## SignalSenderEA (MASTER Account)

The Sender EA monitors your trades and broadcasts them to the server.

### Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| **Server Configuration** |||
| InpServerURL | `https://api.yourdomain.com/signals` | Backend API signals endpoint |
| InpApiKey | (empty) | API key for authentication (never expires) |
| InpTimeout | 5000 | HTTP request timeout (ms) |
| InpMaxRetries | 3 | Retry attempts on failure |
| **Signal Filtering** |||
| InpMagicNumber | 0 | Only send signals from this magic (0 = all) |
| InpSymbolFilter | (empty) | Only send signals for this symbol (empty = all) |
| InpSendOpens | true | Broadcast position opens |
| InpSendCloses | true | Broadcast position closes |
| InpSendModifies | true | Broadcast SL/TP modifications |
| **Account Identification** |||
| InpAccountAlias | `MASTER_001` | Unique identifier (use MT5 account number) |
| InpEAName | `SignalSender` | EA identifier in logs |
| **Periodic Updates** |||
| InpSendHeartbeat | true | Send periodic heartbeat |
| InpHeartbeatSec | 60 | Heartbeat interval (seconds) |
| InpSendPositions | true | Send position snapshots |
| InpPositionSec | 30 | Position update interval (seconds) |

### Setup Steps

1. **Attach to Chart**
   - Open any chart (e.g., EURUSD)
   - Drag SignalSenderEA from Navigator to the chart
   - Or right-click → Attach to Chart

2. **Configure Parameters**
   ```
   InpServerURL    = https://your-backend.railway.app/api/signals
   InpApiKey       = mt5_abc123...  (your API key)
   InpAccountAlias = 12345678       (your MT5 account number)
   ```

3. **Enable EA**
   - Check "Allow Algo Trading" in Common tab
   - Check "Allow DLL imports" if needed
   - Click OK

4. **Verify Connection**
   - Check Experts tab for "Server connection verified"
   - If you see URL whitelist errors, check Step 3 above

### Getting Your API Key

API keys are tied to MT5 accounts and never expire. Generate one via the API:

**Step 1: Login to get access token**
```bash
curl -X POST https://your-backend.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}'
```

**Step 2: Add MT5 account (if not already added)**
```bash
curl -X POST https://your-backend.railway.app/api/user/mt5-accounts \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"accountId":"12345678","accountType":"MASTER"}'
```

**Step 3: Generate API key for the account**
```bash
curl -X POST https://your-backend.railway.app/api/user/mt5-accounts/ACCOUNT_UUID/api-key \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

The response contains your API key (starts with `mt5_`). **Store it securely** - it cannot be retrieved later.

The EA sends this key in the `X-API-Key` header automatically.

---

## SignalReceiverEA (SLAVE Account)

The Receiver EA polls for signals and executes trades on subscriber accounts.

### Configuration Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| **Server Configuration** |||
| InpServerURL | `https://api.yourdomain.com/signals/pending` | Pending signals endpoint |
| InpAckURL | `https://api.yourdomain.com/signals/ack` | Acknowledgment endpoint |
| InpApiKey | (empty) | API key for authentication (never expires) |
| InpTimeout | 5000 | HTTP request timeout (ms) |
| InpPollInterval | 1000 | Poll frequency (ms) |
| **Account Identification** |||
| InpAccountAlias | `SLAVE_001` | Unique identifier (use MT5 account number) |
| InpMagicNumber | 999001 | Magic number for trades |
| **Execution Settings** |||
| InpLotMultiplier | 1.0 | Multiply signal volume by this factor |
| InpMaxLotSize | 10.0 | Maximum lot size per trade |
| InpMaxSlippage | 30 | Maximum allowed slippage (points) |
| InpMaxSpread | 50 | Maximum allowed spread (points) |
| InpSignalExpirySec | 60 | Ignore signals older than this |
| **Risk Management** |||
| InpEnableTrading | true | Execute trades (false = simulation) |
| InpMinMarginLevel | 100.0 | Minimum margin level % |
| InpMaxPositions | 10 | Maximum concurrent positions |
| InpValidateSymbol | true | Verify symbol before trading |
| **Symbol Mapping** |||
| InpSymbolSuffix | (empty) | Add suffix to symbols (e.g., `.raw`) |
| InpSymbolPrefix | (empty) | Add prefix to symbols |

### Setup Steps

1. **Attach to Chart**
   - Open any chart (the symbol doesn't matter)
   - Drag SignalReceiverEA from Navigator to the chart

2. **Configure Parameters**
   ```
   InpServerURL      = https://your-backend.railway.app/api/signals/pending?account_id=99999999
   InpAckURL         = https://your-backend.railway.app/api/signals/ack
   InpApiKey         = mt5_abc123...  (your API key)
   InpAccountAlias   = 99999999       (your SLAVE MT5 account number)
   InpLotMultiplier  = 0.1            (copy at 10% size)
   InpEnableTrading  = true           (set to false for testing)
   ```

3. **Symbol Mapping** (if broker uses different symbols)
   ```
   # If master has EURUSD and broker uses EURUSDm
   InpSymbolSuffix = m

   # If broker uses #EURUSD
   InpSymbolPrefix = #
   ```

4. **Test Mode**
   - Set `InpEnableTrading = false` first
   - Check Experts tab for simulation logs
   - Once verified, set to `true`

---

## Troubleshooting

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `ERROR 4014` | URL not whitelisted | Add URL to Tools → Options → Expert Advisors |
| `ERROR 4015` | Connection failed | Check internet, firewall, or server status |
| `ERROR 4016` | Request timeout | Increase `InpTimeout` or check server |
| `401/403 HTTP` | Authentication error | Check API key is correct, regenerate if needed |
| `"AutoTrading disabled"` | EA cannot trade | Click AutoTrading button (green) |

### Logs Location

- **Experts Tab**: View → Toolbox → Experts
- **Journal Tab**: Shows system messages
- **Log Files**: `[MT5 Data Folder]/Logs/`

### Testing Connectivity

1. Open MT5 terminal
2. Go to **Tools → Options → Expert Advisors**
3. Verify URL is in allowed list
4. Attach EA with test parameters
5. Check Experts tab for connection status

---

## API Endpoints Reference

### SignalSenderEA Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signals` | POST | Send trade signal |
| `/api/signals/heartbeat` | POST | Update account status |
| `/api/signals/positions` | POST | Send position snapshot |

### SignalReceiverEA Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/signals/pending?account_id=XXX` | GET | Get pending signals |
| `/api/signals/ack` | POST | Acknowledge execution |

---

## Security Best Practices

1. **API Key Security**
   - Never share your API key
   - API keys never expire but can be revoked via the API
   - Each MT5 account has its own unique API key
   - Regenerate if compromised: `DELETE /api/user/mt5-accounts/:id/api-key`

2. **Risk Management**
   - Start with `InpEnableTrading = false`
   - Use small `InpLotMultiplier` initially
   - Set appropriate `InpMaxPositions` and `InpMaxLotSize`

3. **Network Security**
   - Always use HTTPS in production
   - Only whitelist trusted URLs in MT5

---

## Support

- Check the main [README.md](../README.md) for API documentation
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for server setup
