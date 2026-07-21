import pino from "pino";
import { config } from "../config/env.js";

const usePretty = !process.env.VERCEL && config.logging.pretty;

export const logger = pino({
  level: config.logging.level,
  transport: usePretty
    ? {
        target: "pino-pretty",
        options: {
          colorize: true
        }
      }
    : undefined
});
