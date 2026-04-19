# Curalink Medical Research Assistant Prototype

MERN prototype for a research-first medical assistant that:

- accepts structured and natural user context
- expands disease-aware search queries
- retrieves publications from OpenAlex and PubMed
- retrieves clinical trials from ClinicalTrials.gov
- ranks large candidate pools before selecting final evidence
- reasons over that evidence with an open-source LLM through Ollama
- stores conversation context in MongoDB, with in-memory fallback if Mongo is unavailable

## Backend

API routes:

- `POST /api/chat`
- `GET /api/conversations/:conversationId`

Example request:

```json
{
  "patientName": "John Smith",
  "disease": "Parkinson's disease",
  "intent": "Deep Brain Stimulation",
  "location": "Toronto, Canada",
  "message": "What are the latest treatment options and active trials?"
}
```

## Environment

Copy `.env.example` to `.env` and set:

```env
OPENALEX_API_KEY=
AI_URL=
AI_KEY=
PORT=
CLIENT_ORIGIN=
AI_BASE_URL=
AI_MODEL=
RETRIEVAL_POOL_SIZE=
PUBLICATION_RESULT_LIMIT=
TRIAL_RESULT_LIMIT=
```

## Frontend

The React client lives in `client/` and calls the backend API configured through `VITE_API_BASE_URL`.

Create `client/.env` if needed:

```env
VITE_API_BASE_URL=http://localhost:4000
```

Run the app:

```bash
cd backend
npm install
npm run dev
```

In another terminal:

```bash
cd backend/client
npm install
npm run dev
```

## Retrieval and reasoning pipeline

1. Structured and natural user input is merged with prior conversation context.
2. Query expansion combines disease, intent, free-text question, and optional location.
3. OpenAlex, PubMed, and ClinicalTrials.gov are queried in parallel to create a broad candidate pool.
4. Results are deduplicated and ranked using keyword overlap, disease-intent matching, recency, and source credibility.
5. Top publications and trials are sent to Ollama for source-grounded synthesis.
6. The full answer and turn context are persisted to MongoDB.
