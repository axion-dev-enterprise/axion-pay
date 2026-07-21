import {
  getUserIntegrations,
  saveUserIntegrations,
  getUserCheckoutProConfig,
  saveUserCheckoutProConfig
} from "../models/dashboardSettingsStore.js";

export function getIntegrationsHandler(req, res) {
  const integrations = getUserIntegrations(req.user.id);
  return res.json({ ok: true, integrations });
}

export function saveIntegrationsHandler(req, res) {
  const integrations = saveUserIntegrations(req.user.id, req.body || {});
  return res.status(200).json({ ok: true, integrations });
}

export function getCheckoutProConfigHandler(req, res) {
  const config = getUserCheckoutProConfig(req.user.id);
  return res.json({ ok: true, config });
}

export function saveCheckoutProConfigHandler(req, res) {
  const config = saveUserCheckoutProConfig(req.user.id, req.body || {});
  return res.status(200).json({ ok: true, config });
}
