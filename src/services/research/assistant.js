import { env } from "../../config/env.js";
import { buildResearchContext } from "./queryBuilder.js";
import { fetchOpenAlexPublications } from "./openAlex.js";
import { fetchPubMedPublications } from "./pubmed.js";
import { fetchClinicalTrials } from "./clinicalTrials.js";
import { rankClinicalTrials, rankPublications } from "./ranker.js";
import { generateEvidenceSynthesis } from "./reasoner.js";

export const runMedicalResearchAssistant = async (message, patientName, disease, intent, location, conversation ) => {
  
  const context = buildResearchContext({
    message,
    disease,
    intent,
    location,
    conversation,
  });

  const [openAlexPublications, pubmedPublications, clinicalTrials] = await Promise.all([
    fetchOpenAlexPublications(context),
    fetchPubMedPublications(context),
    fetchClinicalTrials(context),
  ]);

  const publications = rankPublications(
    [...openAlexPublications, ...pubmedPublications].slice(0, env.retrievalPoolSize * 4),
    context
  );
  
  const trials = rankClinicalTrials(clinicalTrials, context);
  
  
  const topPublications = publications.slice(0, env.publicationResultLimit);
  const topTrials = trials.slice(0, env.trialResultLimit);
  const synthesis = await generateEvidenceSynthesis({
    context,
    conversation,
    publications: topPublications,
    trials: topTrials,
  });

  return {
    conversationSummary: {
      patientName: patientName ?? conversation?.patientName ?? "",
      disease: context.disease,
      intent: context.intent,
      location: context.location,
      expandedQuery: context.expandedQuery,
    },
    retrieval: {
      candidateCounts: {
        publications: openAlexPublications.length + pubmedPublications.length,
        clinicalTrials: clinicalTrials.length,
      },
      topPublicationCount: topPublications.length,
      topTrialCount: topTrials.length,
    },
    answer: {
      conditionOverview: synthesis.fullOverview ?? synthesis.overview,
      researchInsights: synthesis.researchInsights ?? [],
      clinicalTrials: synthesis.clinicalTrials ?? [],
      personalizedTakeaway: synthesis.personalizedTakeaway ?? "",
      safetyNotes: synthesis.safetyNotes ?? [],
      generator: synthesis.generator,
      warning: synthesis.warning,
    },
    publications: topPublications.map((publication) => ({
      id: publication.id,
      title: publication.title,
      abstract: publication.abstract,
      authors: publication.authors,
      year: publication.year,
      source: publication.source,
      url: publication.url,
      supportingSnippet: publication.supportingSnippet || publication.abstract?.slice(0, 240) || "",
      rankScore: publication.rankScore,
    })),
    trials: topTrials.map((trial) => ({
      id: trial.id,
      title: trial.title,
      recruitingStatus: trial.recruitingStatus,
      eligibilityCriteria: trial.eligibilityCriteria,
      location: trial.location,
      contactInformation: trial.contactInformation,
      source: trial.source,
      url: trial.url,
      supportingSnippet: trial.supportingSnippet,
      rankScore: trial.rankScore,
    })),
  };
};
