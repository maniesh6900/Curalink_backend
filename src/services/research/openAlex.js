import { env } from "../../config/env.js";
import { fetchJson } from "../../utils/http.js";

const normalizeAuthors = (authorships = []) =>
  authorships
    .map((authorship) => authorship?.author?.display_name)
    .filter(Boolean)
    .slice(0, 6);

export const fetchOpenAlexPublications = async (context) => {
  const perPage = Math.min(env.retrievalPoolSize, 100);
  const queries = [
    `https://api.openalex.org/works?search=${encodeURIComponent(context.searchQuery)}&per-page=${perPage}&page=1&sort=relevance_score:desc`,
    `https://api.openalex.org/works?search=${encodeURIComponent(context.searchQuery)}&per-page=${perPage}&page=1&sort=publication_date:desc`,
  ];

  const responses = await Promise.all(
    queries.map((url) => fetchJson(url, {}, "OpenAlex lookup failed"))
  );

  return responses.flatMap((payload) =>
    (payload.results ?? []).map((work) => ({
      id: `openalex:${work.id}`,
      source: "OpenAlex",
      title: work.title ?? "Untitled publication",
      abstract:
        work.abstract_inverted_index
          ? Object.entries(work.abstract_inverted_index)
              .flatMap(([word, positions]) => positions.map((position) => [position, word]))
              .sort((a, b) => a[0] - b[0])
              .map((entry) => entry[1])
              .join(" ")
          : "",
      authors: normalizeAuthors(work.authorships),
      year: work.publication_year ?? null,
      url: work.primary_location?.landing_page_url ?? work.id,
      sourcePriority: 0.8,
      citedByCount: work.cited_by_count ?? 0,
      supportingSnippet:
        work.abstract_inverted_index
          ? Object.keys(work.abstract_inverted_index).slice(0, 36).join(" ")
          : "",
      raw: work,
    }))
  );
};
