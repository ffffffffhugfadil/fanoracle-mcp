# FanOracle: Comic Book Edition 🦸‍♂️⛓️

> AI-powered comic book authentication, grading, and valuation — secured on the Casper blockchain.

Built for the Casper Network Hackathon | MCP + Odra/Rust Smart Contract

---
Contract repo: https://github.com/ffffffffhugfadil/fanoracle-comic
## 🏆 What is FanOracle?

FanOracle is a Model Context Protocol (MCP) server that brings AI intelligence to comic book collecting. Upload a photo of any comic — raw or CGC-slabbed — and FanOracle will:

1. **Identify** the comic title, issue, publisher, and year from the cover or CGC label
2. **Grade** the condition using the CGC 0.5–10.0 scale
3. **Verify** CGC/CBCS slab authenticity (detect fakes)
4. **Check** if it's a key issue (first appearances, deaths, origins)
5. **Price** it using real eBay sold listings
6. **Store** it permanently on the Casper blockchain

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| Smart Contract | Rust + Odra Framework 2.7.0 |
| Blockchain | Casper Network Testnet |
| AI Vision | Groq Llama 4 Scout (Vision) |
| Market Data | eBay Browse API (Production) |
| Comic Database | Comic Vine API |
| Interface | MCP Server + Claude Desktop |

---

## 📦 Smart Contract

**Deployed on Casper Testnet:**

| Field | Value |
|---|---|
| Contract Hash | `contract-24ca090961cafb32c6cb39bd6034d175c8e47002e1e32c20e8cf54ca9abb8d40` |
| Package Hash | `contract-package-279e6175282d814b28c02157feacea538a6d3ba4c76bb1b21b4c110d57e92d8a` |
| Deploy Hash (v2) | `2d624cd2e18b98c321e5799c24b52e90695cd2cb6ec8c1fd6c6caead9ef677ca` |
| Network | `casper-test` |

**Entry Points:**
- `init` — Initialize contract
- `add_comic(title, issue, grade_x10, is_key, value_cents)` — Add comic to collection
- `get_count()` — Get total comics in collection
- `get_comic_title(id)` — Get comic title by ID
- `get_comic_grade(id)` — Get comic grade by ID
- `get_comic_value(id)` — Get comic estimated value by ID
- `get_comic_is_key(id)` — Check if comic is key issue

---

## 🔧 MCP Tools (5 Tools)

### 1. `grade_comic`
AI-powered comic grading from photo. Reads CGC/CBCS label automatically.

```
Input: image_url or image_base64
Output: grade (0.5-10.0), condition, defects, slab detection, creator credits
```

### 2. `verify_slab`
Fake CGC/CBCS slab detector using AI visual analysis.

```
Input: image_url + cert_number
Output: authenticity score (0-100), red flags, green flags, verdict, CGC lookup URL
```

### 3. `fetch_comic_price`
Real market prices from eBay sold listings.

```
Input: title, issue_number, grade (optional)
Output: min/max/avg price, sample listings, sales count
```

### 4. `detect_key_issue`
Key issue detection via Comic Vine database.

```
Input: title, issue_number, publisher
Output: is_key_issue, key_reasons, first_appearances, cover_date
```

### 5. `collection_value`
Casper blockchain collection tracker + value estimator.

```
Input: action (get_count | add_comic | value_estimate), comics[]
Output: on-chain count, deploy_hash, total value, breakdown
```

---

## 🎬 Demo Flow

```
1. 📸 Upload CGC slab photo
      ↓
2. 🤖 grade_comic → "Wolverine #76, CGC 8.5, White Pages, Authentic"
      ↓
3. 🔍 verify_slab → "AUTHENTIC — Score 98/100, Hologram ✅"
      ↓
4. 🔑 detect_key_issue → "Lady Deathstrike & Puck appearance"
      ↓
5. 💰 fetch_comic_price → "Avg $40 | 20 eBay sales"
      ↓
6. ⛓️ collection_value (add_comic) → "Stored on Casper blockchain ✅"
```

---

## 🚀 Setup

### Prerequisites
- Node.js 18+
- Claude Desktop
- API Keys: Groq, eBay (Production), Comic Vine

### Install

```bash
git clone https://github.com/your-repo/fanoracle-mcp
cd fanoracle-mcp
npm install
cp .env.example .env
# Fill in API keys in .env
npm run build
```

### Claude Desktop Config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "fanoracle": {
      "command": "node",
      "args": ["/path/to/fanoracle-mcp/dist/index.js"],
      "env": {
        "CASPER_RPC": "https://node.testnet.casper.network/rpc",
        "CASPER_CHAIN": "casper-test",
        "CONTRACT_HASH": "contract-24ca090961cafb32c6cb39bd6034d175c8e47002e1e32c20e8cf54ca9abb8d40",
        "GROQ_API_KEY": "your_groq_key",
        "EBAY_CLIENT_ID": "your_ebay_client_id",
        "EBAY_CLIENT_SECRET": "your_ebay_client_secret",
        "COMIC_VINE_API_KEY": "your_comic_vine_key"
      }
    }
  }
}
```

---

## 📊 Example Outputs

### grade_comic
```json
{
  "detected_title": "Amazing Spider-Man",
  "detected_issue_number": "300",
  "is_slabbed": true,
  "grading_company": "CGC",
  "certified_grade": 9.2,
  "grade_label": "Near Mint-",
  "confidence": "high",
  "hologram_detected": true,
  "slab_integrity": "intact",
  "notable_features": ["White Pages", "1st Full Venom Appearance"]
}
```

### verify_slab
```json
{
  "verdict": "AUTHENTIC",
  "authenticity_score": 98,
  "confidence": "high",
  "green_flags": ["Correct label font", "Hologram present", "Grade position correct"],
  "red_flags": [],
  "cgc_lookup_url": "https://www.cgccomics.com/certlookup/details/?certInput=3944834002"
}
```

### fetch_comic_price
```json
{
  "title": "Amazing Spider-Man",
  "issue_number": "300",
  "grade": "9.2",
  "sales_found": 20,
  "price_avg": 774.85,
  "price_min": 349.99,
  "price_max": 3300.00,
  "currency": "USD"
}
```

---

## 🔗 Links

- Casper Explorer: https://testnet.cspr.live/deploy/2d624cd2e18b98c321e5799c24b52e90695cd2cb6ec8c1fd6c6caead9ef677ca
- CGC Cert Lookup: https://www.cgccomics.com/certlookup/
- Comic Vine: https://comicvine.gamespot.com/api/

---

## 🌐 Live Demo

https://fanoracle.vercel.app

---

*Built with ❤️ for the Casper Network Hackathon**
