import { ZodError } from "zod";

export function validate(schema, source = "body") {
  return (req, res, next) => {
    try {
      const parsed = schema.parse(req[source]);
      req[source] = parsed;
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        return res.status(400).json({
          ok: false,
          error: "Requisicao invalida.",
          code: "invalid_request",
          details: err.errors.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message
          }))
        });
      }
      return next(err);
    }
  };
}
