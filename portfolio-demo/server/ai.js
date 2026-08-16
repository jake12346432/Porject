const SECTORS_PLACEHOLDER = "__SECTORS__";
const REGIONS_PLACEHOLDER = "__REGIONS__";

const SYSTEM_PROMPT_TEMPLATE = `You convert a natural-language portfolio request into a JSON configuration for a stock screener. Respond with ONLY a raw JSON object — no markdown fences, no prose before or after.

Available sectors (use exact strings): ${SECTORS_PLACEHOLDER}
Available regions (use exact strings): ${REGIONS_PLACEHOLDER}

Return exactly this shape:
{
  "regions": [subset of regions, or [] to mean all],
  "sectors": [subset of sectors, or [] to mean all],
  "qvgm": {"Q":number,"V":number,"G":number,"M":number} (should sum to ~100, reflects emphasis on Quality/Value/Growth/Momentum; use 25/25/25/25 if unspecified),
  "sectorWeights": {} OR an object covering EVERY sector listed above with numbers summing to ~100 (only include this key at all if the user expressed any sector emphasis, tilt, or allocation; omit or leave {} otherwise),
  "locWeights": {} OR an object covering EVERY region listed above with numbers summing to ~100 (only include if the user expressed any geographic emphasis, tilt, or allocation; omit or leave {} otherwise),
  "dividend": {"enabled":bool,"min":number},
  "esg": {"enabled":bool,"min":number}
}

CRITICAL — do not confuse these two, they do very different things:
- "regions"/"sectors" are a HARD ELIGIBILITY FILTER: anything left out is 100% excluded from the entire portfolio. Only put something here for absolute exclusion language: "only Europe", "exclude energy", "no exposure to Africa", "US stocks exclusively", "avoid healthcare entirely". Otherwise leave these as [] (meaning nothing is excluded).
- "sectorWeights"/"locWeights" are TARGET ALLOCATION SHARES — roughly what % of the final portfolio's dollar value should land in each sector/region. Use this field for ANY percentage, majority, half, emphasis, lean, focus, or "mostly/mainly" language, e.g. "50% allocation to Asia", "half in tech", "mostly US with some Europe", "lean toward healthcare", "prioritize Japan". Every region/sector must appear as a key (not just the ones mentioned) and the numbers must sum to ~100 — split the remainder EQUALLY across every region/sector not explicitly mentioned. Do NOT also add the mentioned region/sector to the "regions"/"sectors" exclusion list — an allocation target does not mean everything else is excluded, just smaller.

Worked example (imagine only regions A, B, C, D exist): user says "put 50% into region A". Correct: "regions": [], "locWeights": {"A": 50, "B": 16.7, "C": 16.7, "D": 16.6}. WRONG: "regions": ["A"] (that would give 100% A, not 50%) and WRONG to leave locWeights empty (that would give A no more than an equal 25% share, not 50%).

Infer sensible values. Leave things at neutral defaults if not mentioned (equal QVGM, no sector/location tilt, all regions/sectors included, thresholds disabled). The portfolio always shows the top 10 highest-scoring stocks — there is no holding-count setting.`;

// Cheap + fast is plenty for this — it's structured extraction, not open-ended
// reasoning. Swap to a bigger model here if quality ever falls short.
const MODEL = "claude-haiku-4-5-20251001";

/**
 * Turns a natural-language portfolio request into the same JSON config shape
 * the frontend's filter panel produces, via a single Claude API call made
 * server-side (never expose the API key to the browser).
 */
export async function promptToPortfolioConfig(prompt, { sectors, regions }) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    const err = new Error(
      "AI portfolio description isn't set up yet — no ANTHROPIC_API_KEY configured on the server. " +
      "See server/.env.example."
    );
    err.status = 501;
    throw err;
  }

  const systemPrompt = SYSTEM_PROMPT_TEMPLATE
    .replace(SECTORS_PLACEHOLDER, JSON.stringify(sectors))
    .replace(REGIONS_PLACEHOLDER, JSON.stringify(regions));

  const resp = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!resp.ok) {
    const body = await resp.text().catch(() => "");
    const err = new Error(`Anthropic API request failed (${resp.status}): ${body.slice(0, 300)}`);
    err.status = 502;
    throw err;
  }

  const data = await resp.json();
  const textBlocks = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("\n");
  const clean = textBlocks.replace(/```json|```/g, "").trim();

  try {
    return JSON.parse(clean);
  } catch {
    const err = new Error("Model response wasn't valid JSON — try rephrasing the request.");
    err.status = 502;
    throw err;
  }
}
