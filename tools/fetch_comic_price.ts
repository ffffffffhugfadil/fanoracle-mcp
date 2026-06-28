const EBAY_CLIENT_ID = process.env.EBAY_CLIENT_ID ?? "";
const EBAY_CLIENT_SECRET = process.env.EBAY_CLIENT_SECRET ?? "";
const IS_SANDBOX = process.env.EBAY_ENVIRONMENT === "SANDBOX";

const EBAY_AUTH_URL = IS_SANDBOX
  ? "https://api.sandbox.ebay.com/identity/v1/oauth2/token"
  : "https://api.ebay.com/identity/v1/oauth2/token";

const EBAY_API_URL = IS_SANDBOX
  ? "https://api.sandbox.ebay.com/buy/browse/v1/item_summary/search"
  : "https://api.ebay.com/buy/browse/v1/item_summary/search";

interface ComicPriceResult {
  title: string;
  issue_number: string;
  grade?: string;
  sales_found: number;
  price_min: number;
  price_max: number;
  price_avg: number;
  currency: string;
  environment: string;
  sample_listings: { title: string; price: number }[];
}

async function getEbayToken(): Promise<string> {
  const credentials = Buffer.from(`${EBAY_CLIENT_ID}:${EBAY_CLIENT_SECRET}`).toString("base64");
  const res = await fetch(EBAY_AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials&scope=https%3A%2F%2Fapi.ebay.com%2Foauth%2Fapi_scope",
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`eBay auth failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

export async function fetchComicPrice(params: {
  title: string;
  issue_number: string;
  grade?: string;
}): Promise<ComicPriceResult> {
  const { title, issue_number, grade } = params;
  const gradeStr = grade ? ` CGC ${grade}` : "";
  const query = encodeURIComponent(`${title} #${issue_number}${gradeStr} comic`);

  const token = await getEbayToken();

  const res = await fetch(`${EBAY_API_URL}?q=${query}&limit=20`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-EBAY-C-MARKETPLACE-ID": "EBAY_US",
    },
  });

  if (!res.ok) {
    throw new Error(`eBay Browse API error: ${res.status} ${await res.text()}`);
  }

  const data = (await res.json()) as {
    itemSummaries?: { title: string; price: { value: string; currency: string } }[];
  };

  const items = data.itemSummaries ?? [];
  if (items.length === 0) {
    return {
      title, issue_number, grade,
      sales_found: 0,
      price_min: 0, price_max: 0, price_avg: 0,
      currency: "USD",
      environment: IS_SANDBOX ? "sandbox" : "production",
      sample_listings: [],
    };
  }

  const prices = items.map((i) => parseFloat(i.price.value));
  return {
    title, issue_number, grade,
    sales_found: items.length,
    price_min: Math.min(...prices),
    price_max: Math.max(...prices),
    price_avg: parseFloat((prices.reduce((a, b) => a + b, 0) / prices.length).toFixed(2)),
    currency: items[0].price.currency,
    environment: IS_SANDBOX ? "sandbox" : "production",
    sample_listings: items.slice(0, 5).map((i) => ({
      title: i.title,
      price: parseFloat(i.price.value),
    })),
  };
}
