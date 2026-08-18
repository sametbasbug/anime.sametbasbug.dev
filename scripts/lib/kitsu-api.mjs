const API_BASE = "https://kitsu.io/api/edge";
const USER_AGENT = "equinox-rota-catalogue-refresh/1.0";
const MAX_ATTEMPTS = 3;

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function retryDelay(response, attempt) {
  const retryAfter = Number(response?.headers.get("retry-after"));
  if (Number.isFinite(retryAfter) && retryAfter > 0) return retryAfter * 1_000;
  return 500 * (2 ** attempt);
}

export async function kitsuRequest(path, parameters = {}) {
  const url = new URL(`${API_BASE}/${path.replace(/^\//, "")}`);
  for (const [key, value] of Object.entries(parameters)) {
    if (value === undefined || value === null || value === "") continue;
    url.searchParams.set(key, String(value));
  }

  let lastError;
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/vnd.api+json",
          "User-Agent": USER_AGENT,
        },
        signal: AbortSignal.timeout(20_000),
      });

      if (response.ok) return response.json();

      const body = await response.text();
      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS - 1) {
        throw new Error(`Kitsu request failed (${response.status}) ${url}: ${body.slice(0, 300)}`);
      }
      await wait(retryDelay(response, attempt));
    } catch (error) {
      lastError = error;
      if (attempt === MAX_ATTEMPTS - 1) throw error;
      await wait(500 * (2 ** attempt));
    }
  }

  throw lastError ?? new Error(`Kitsu request failed: ${url}`);
}

export async function fetchAnimeByIds(ids, { include = "genres,productions.company" } = {}) {
  const uniqueIds = [...new Set(ids.map(String))];
  const result = [];
  const included = [];

  for (let offset = 0; offset < uniqueIds.length; offset += 20) {
    const batch = uniqueIds.slice(offset, offset + 20);
    const response = await kitsuRequest("anime", {
      "filter[id]": batch.join(","),
      "page[limit]": 20,
      include,
    });
    result.push(...response.data);
    included.push(...(response.included ?? []));
  }

  return { data: result, included };
}

export async function searchAnime(title, { limit = 10, include = "genres,productions.company" } = {}) {
  return kitsuRequest("anime", {
    "filter[text]": title,
    "page[limit]": Math.min(20, limit),
    include,
  });
}

export function normalizeTitle(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("en-US")
    .replace(/&/g, " and ")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function kitsuTitles(resource) {
  const attributes = resource.attributes ?? {};
  return [...new Set([
    attributes.canonicalTitle,
    ...Object.values(attributes.titles ?? {}),
    ...(attributes.abbreviatedTitles ?? []),
  ].filter(Boolean))];
}

export function legacyKitsuId(anime) {
  for (const source of anime.sources ?? []) {
    const match = source.match(/^https?:\/\/(?:www\.)?kitsu\.app\/anime\/(\d+)(?:[/?#]|$)/i);
    if (match) return match[1];
  }
  return null;
}
