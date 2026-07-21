import pino from "pino";
import { config } from "../config/env.js";

export const logger = pino({
  level: config.logging.level,
  transport: config.logging.pretty
    ? {
        target: "pino-pretty",
        options: {
          colorize: true
        }
      }
    : undefined
});
