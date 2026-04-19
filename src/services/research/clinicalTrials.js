import { env } from "../../config/env.js";
import { fetchJson } from "../../utils/http.js";

const ensureArray = (value) => {
  if (!value) {
    return [];
  }
  return Array.isArray(value) ? value : [value];
};

export const fetchClinicalTrials = async (context) => {
  const pageSize = Math.min(env.retrievalPoolSize, 100);
  const terms = [];

  if (context.disease) {
    terms.push(`query.cond=${encodeURIComponent(context.disease)}`);
  }

  if (context.searchQuery) {
    terms.push(`query.term=${encodeURIComponent(context.searchQuery)}`);
  }

  terms.push("format=json");
  terms.push(`pageSize=${pageSize}`);

  const url = `https://clinicaltrials.gov/api/v2/studies?${terms.join("&")}`;
  const payload = await fetchJson(url, {}, "ClinicalTrials.gov lookup failed");

  return (payload.studies ?? []).map((study, index) => {
    const protocol = study.protocolSection ?? {};
    const identification = protocol.identificationModule ?? {};
    const status = protocol.statusModule ?? {};
    const contacts = protocol.contactsLocationsModule ?? {};
    const eligibility = protocol.eligibilityModule ?? {};
    const overallOfficials = ensureArray(contacts.overallOfficials);
    const locations = ensureArray(contacts.locations);
    const firstLocation = locations[0];

    return {
      id: `trial:${study.protocolSection?.identificationModule?.nctId ?? index}`,
      source: "ClinicalTrials.gov",
      title: identification.briefTitle ?? identification.officialTitle ?? "Untitled clinical trial",
      recruitingStatus: status.overallStatus ?? "UNKNOWN",
      eligibilityCriteria: eligibility.eligibilityCriteria ?? "Not provided",
      location: firstLocation
        ? [firstLocation.city, firstLocation.state, firstLocation.country].filter(Boolean).join(", ")
        : "",
      contactInformation: overallOfficials[0]
        ? [overallOfficials[0].name, overallOfficials[0].role, overallOfficials[0].affiliation]
            .filter(Boolean)
            .join(" | ")
        : "See trial record",
      url: identification.nctId
        ? `https://clinicaltrials.gov/study/${identification.nctId}`
        : "https://clinicaltrials.gov/",
      conditions: protocol.conditionsModule?.conditions ?? [],
      sourcePriority: 0.9,
      supportingSnippet: eligibility.healthyVolunteers
        ? `Healthy volunteers: ${eligibility.healthyVolunteers}`
        : eligibility.eligibilityCriteria?.slice(0, 220) ?? "",
      raw: study,
    };
  });
};
