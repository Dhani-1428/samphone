import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";
import pinoHttp from "pino-http";
import router from "./routes";
import { validateServerEnv } from "./lib/env-validation";
import { logger } from "./lib/logger";
import { getApiHelmetOptions } from "./lib/security-headers";

const app: Express = express();

validateServerEnv();

const corsOrigins = process.env.CORS_ORIGINS?.split(",").map((o) => o.trim()).filter(Boolean);

app.set("trust proxy", 1);

app.use(helmet(getApiHelmetOptions()));
app.use(
  cors({
    origin: corsOrigins?.length ? corsOrigins : true,
    credentials: true,
  }),
);
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

app.use("/api", router);

export default app;
