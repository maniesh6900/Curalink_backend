import { XMLParser } from "fast-xml-parser";
import { env } from "../../config/env.js";
import { fetchJson, fetchText } from "../../utils/http.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  trimValues: true,
});

const ensureArray = (value) => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

const pickAbstract = (article) => {
  const abstractText = article?.MedlineCitation?.Article?.Abstract?.AbstractText;
  if (!abstractText) {
    return "";
  }

  return ensureArray(abstractText)
    .map((part) => {
      if (typeof part === "string") {
        return part;
      }
      return part["#text"] ?? "";
    })
    .join(" ");
};

const pickAuthors = (article) =>
  ensureArray(article?.MedlineCitation?.Article?.AuthorList?.Author)
    .map((author) => {
      const foreName = author.ForeName ?? "";
      const lastName = author.LastName ?? "";
      return `${foreName} ${lastName}`.trim();
    })
    .filter(Boolean)
    .slice(0, 6);

export const fetchPubMedPublications = async (context) => {
  const retmax = Math.min(env.retrievalPoolSize, 100);
  const term = encodeURIComponent(context.searchQuery);
  const searchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=${term}&retmax=${retmax}&sort=pub+date&retmode=json`;
  const searchPayload = await fetchJson(searchUrl, {}, "PubMed search failed");
  const ids = searchPayload?.esearchresult?.idlist ?? [];

  if (!ids.length) {
    return [];
  }

  const fetchUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi?db=pubmed&id=${ids.join(",")}&retmode=xml`;
  const xml = await fetchText(fetchUrl, {}, "PubMed fetch failed");
  const parsed = xmlParser.parse(xml);
  const articles = ensureArray(parsed?.PubmedArticleSet?.PubmedArticle);

  return articles.map((article) => {
    const citation = article?.MedlineCitation;
    const pmid = citation?.PMID?.["#text"] ?? citation?.PMID ?? "";
    const title = citation?.Article?.ArticleTitle ?? "Untitled publication";
    const year =
      citation?.Article?.Journal?.JournalIssue?.PubDate?.Year ??
      citation?.DateCompleted?.Year ??
      null;

    return {
      id: `pubmed:${pmid}`,
      source: "PubMed",
      title: typeof title === "string" ? title : title?.["#text"] ?? "Untitled publication",
      abstract: pickAbstract(article),
      authors: pickAuthors(article),
      year: year ? Number(year) : null,
      url: pmid ? `https://pubmed.ncbi.nlm.nih.gov/${pmid}/` : "",
      sourcePriority: 1,
      citedByCount: 0,
      supportingSnippet: pickAbstract(article).slice(0, 360),
      raw: article,
    };
  });
};
