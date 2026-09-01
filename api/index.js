const PAY_API = "https://api.axionenterprise.cloud";

export default function handler(_req, res) {
  res.status(410).json({
    error: "A API legada do frontend foi desativada. Use a API AXION Pay autenticada.",
    api: PAY_API,
  });
}
