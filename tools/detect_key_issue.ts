const COMIC_VINE_API_KEY = process.env.COMIC_VINE_API_KEY ?? "";
const BASE_URL = "https://comicvine.gamespot.com/api";

interface KeyIssueResult {
  is_key_issue: boolean;
  title: string;
  issue_number: string;
  publisher?: string;
  cover_date?: string;
  key_reasons: string[];
  description?: string;
  comic_vine_url?: string;
  first_appearances: string[];
  notable_deaths: string[];
}

export async function detectKeyIssue(params: {
  title: string;
  issue_number: string;
  publisher?: string;
}): Promise<KeyIssueResult> {
  const { title, issue_number, publisher } = params;

  if (!COMIC_VINE_API_KEY || COMIC_VINE_API_KEY === "your_comic_vine_api_key") {
    throw new Error("COMIC_VINE_API_KEY not configured in .env");
  }

  // Search for the issue
  const query = encodeURIComponent(`${title} ${issue_number}`);
  const searchUrl = `${BASE_URL}/search/?api_key=${COMIC_VINE_API_KEY}&format=json&query=${query}&resources=issue&field_list=id,name,issue_number,volume,cover_date,description,site_detail_url,character_credits,person_credits&limit=5`;

  const res = await fetch(searchUrl, {
    headers: { "User-Agent": "FanOracle-MCP/0.1.0" },
  });

  if (!res.ok) {
    throw new Error(`Comic Vine API error: ${res.status}`);
  }

  const data = (await res.json()) as {
    results?: {
      id: number;
      name: string;
      issue_number: string;
      volume?: { name: string; publisher?: { name: string } };
      cover_date?: string;
      description?: string;
      site_detail_url?: string;
      character_credits?: { name: string; api_detail_url: string }[];
    }[];
  };

  const results = data.results ?? [];

  // Find best match
  const match = results.find(
    (r) =>
      r.issue_number === issue_number &&
      r.volume?.name?.toLowerCase().includes(title.toLowerCase())
  ) ?? results[0];

  if (!match) {
    return {
      is_key_issue: false,
      title,
      issue_number,
      publisher,
      key_reasons: [],
      first_appearances: [],
      notable_deaths: [],
    };
  }

  // Parse description for key issue signals
  const desc = match.description ?? "";
  const descLower = desc.toLowerCase();

  const keySignals = [
    { pattern: /first appearance|1st appearance|debut/i, label: "First appearance" },
    { pattern: /origin/i, label: "Origin story" },
    { pattern: /death of|dies in|killed/i, label: "Notable death" },
    { pattern: /wedding|married/i, label: "Wedding/marriage" },
    { pattern: /first issue|debut issue/i, label: "Debut issue" },
    { pattern: /cameo/i, label: "Cameo appearance" },
    { pattern: /clone saga|major event|crossover/i, label: "Major event/crossover" },
    { pattern: /transformation|becomes/i, label: "Character transformation" },
  ];

  const key_reasons: string[] = [];
  for (const { pattern, label } of keySignals) {
    if (pattern.test(descLower)) {
      key_reasons.push(label);
    }
  }

  // Extract first appearances from description
  const firstAppearanceMatches = desc.match(
    /first appearance of ([A-Z][a-zA-Z\s-]+)/g
  ) ?? [];
  const first_appearances = firstAppearanceMatches.map((m) =>
    m.replace("first appearance of ", "").trim()
  );

  // Extract notable deaths
  const deathMatches = desc.match(/death of ([A-Z][a-zA-Z\s-]+)/g) ?? [];
  const notable_deaths = deathMatches.map((m) =>
    m.replace("death of ", "").trim()
  );

  return {
    is_key_issue: key_reasons.length > 0,
    title: match.volume?.name ?? title,
    issue_number: match.issue_number,
    publisher: match.volume?.publisher?.name ?? publisher,
    cover_date: match.cover_date,
    key_reasons,
    description: desc.replace(/<[^>]+>/g, "").slice(0, 500),
    comic_vine_url: match.site_detail_url,
    first_appearances,
    notable_deaths,
  };
}
