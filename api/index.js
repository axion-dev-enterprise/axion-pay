export default async function handler(req, res) {
  try {
    const { app } = await import("../src/app.js");
    const { ensureAdminUser } = await import("../src/services/adminUserService.js");
    try {
      ensureAdminUser();
    } catch (e) {}
    return app(req, res);
  } catch (err) {
    res.status(500).json({
      error: "INVOCATION_ERROR",
      message: err.message,
      stack: err.stack,
      name: err.name
    });
  }
}
