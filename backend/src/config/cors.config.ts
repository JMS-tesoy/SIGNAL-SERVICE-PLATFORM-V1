import { CorsOptions } from "cors";
import { env } from "./env.js";

export const allowedOrigins = [
  env.FRONTEND_URL,
  "http://localhost:3000",
  "https://signal-service-frontend-production.up.railway.app",
  ...env.CORS_ORIGINS,
].filter(Boolean);

export const corsConfig: CorsOptions = {
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
};
