const ensureText = (...parts) => parts.filter(Boolean).join(" ").toLowerCase();

const countKeywordHits = (text, keywords) =>
  keywords.reduce((count, keyword) => count + (text.includes(keyword.toLowerCase()) ? 1 : 0), 0);

const recencyScore = (year) => {
  if (!year) {
    return 0.15;
  }
  const delta = Math.max(0, new Date().getFullYear() - Number(year));
  return Math.max(0.1, 1 - delta * 0.08);
};

export const dedupeByTitle = (items) => {
  const seen = new Set();

  return items.filter((item) => {
    const key = String(item.title ?? "").toLowerCase().trim();
    if (!key || seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

export const rankPublications = (publications, context) => {
  const keywords = context.keywords
  return dedupeByTitle(publications)
    .map((item) => {
      const text = ensureText(item.title, item.abstract, item.authors?.join(" "));
      const keywordHits = countKeywordHits(text, keywords);
      const diseaseBoost = context.disease && text.includes(context.disease.toLowerCase()) ? 2 : 0;
      const intentBoost = context.intent && text.includes(context.intent.toLowerCase()) ? 1.5 : 0;
      const score =
        keywordHits * 12 +
        diseaseBoost * 15 +
        intentBoost * 10 +
        recencyScore(item.year) * 20 +
        (item.sourcePriority ?? 0.5) * 15 +
        Math.min(10, Math.log10((item.citedByCount ?? 0) + 1) * 5);

      return {
        ...item,
        rankScore: Math.round(score),
      };
    })
    .sort((left, right) => right.rankScore - left.rankScore);
};

export const rankClinicalTrials = (trials, context) => {
  const keywords = context.keywords;
  return dedupeByTitle(trials)
    .map((trial) => {
      const text = ensureText(
        trial.title,
        trial.eligibilityCriteria,
        trial.location,
        trial.conditions?.join(" ")
      );
      const keywordHits = countKeywordHits(text, keywords);
      const diseaseBoost = context.disease && text.includes(context.disease.toLowerCase()) ? 2 : 0;
      const intentBoost = context.intent && text.includes(context.intent.toLowerCase()) ? 1.25 : 0;
      const recruitingBoost = /recruiting|active/i.test(trial.recruitingStatus) ? 1.5 : 0.75;
      const locationBoost =
        context.location && text.includes(context.location.toLowerCase()) ? 1.25 : 0;

      return {
        ...trial,
        rankScore: Math.round(
          keywordHits * 10 +
            diseaseBoost * 15 +
            intentBoost * 10 +
            recruitingBoost * 12 +
            locationBoost * 8 +
            (trial.sourcePriority ?? 0.5) * 10
        ),
      };
    })
    .sort((left, right) => right.rankScore - left.rankScore);
};
