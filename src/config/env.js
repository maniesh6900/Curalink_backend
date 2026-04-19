import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({
  path: path.resolve(__dirname, "../../.env"),
});

export const env = {
  port: Number(process.env.PORT ?? 4000),
  clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
  aiUrl: process.env.AI_URL,
  aiBaseUrl: process.env.AI_BASE_URL,
  aiModel:   process.env.AI_MODEL,
  aiKey: process.env.AI_KEY,
  retrievalPoolSize: Number(process.env.RETRIEVAL_POOL_SIZE ?? 80),
  publicationResultLimit: Number(process.env.PUBLICATION_RESULT_LIMIT ?? 8),
  trialResultLimit: Number(process.env.TRIAL_RESULT_LIMIT ?? 4),
};
