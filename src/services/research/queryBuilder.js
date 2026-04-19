const stopWords = new Set([
  "the",
  "and",
  "for",
  "with",
  "about",
  "latest",
  "recent",
  "study",
  "studies",
  "treatment",
  "clinical",
  "research",
  "can",
  "take",
  "what",
  "tell",
  "me",
]);

const tokenize = (value) =>
  String(value ?? "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 2 && !stopWords.has(token));

export const buildResearchContext = ({ message, disease, intent, location, conversation }) => {
  const previousContext = conversation?.context ?? {};
  const resolvedDisease = disease ?? previousContext.disease ?? "";
  const resolvedIntent = intent ?? previousContext.intent ?? "";
  const resolvedLocation = location ?? previousContext.location ?? "";

  const naturalQuery = [message, resolvedIntent].filter(Boolean).join(" ");
  const expandedParts = [resolvedDisease, naturalQuery, resolvedLocation].filter(Boolean);
  const expandedQuery = expandedParts.join(" ").replace(/\s+/g, " ").trim();

  const keywords = Array.from(
    new Set([
      ...tokenize(message),
      ...tokenize(resolvedDisease),
      ...tokenize(resolvedIntent),
      ...tokenize(resolvedLocation),
      ...tokenize(previousContext.lastExpandedQuery),
    ])
  );

  return {
    disease: resolvedDisease,
    intent: resolvedIntent,
    location: resolvedLocation,
    message,
    keywords,
    expandedQuery,
    searchQuery: expandedQuery || message,
  };
};
