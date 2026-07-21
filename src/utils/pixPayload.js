function tlv(id, value) {
  const stringValue = String(value ?? "");
  const length = String(stringValue.length).padStart(2, "0");
  return `${id}${length}${stringValue}`;
}

function stripDiacritics(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeText(value, maxLen) {
  const cleaned = stripDiacritics(value).toUpperCase().replace(/[^A-Z0-9 ]/g, "");
  return cleaned.trim().substring(0, maxLen);
}

function normalizeTxid(value) {
  const raw = String(value || "").trim();
  if (raw === "***") return "***";
  const cleaned = stripDiacritics(raw).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!cleaned) return "***";
  return cleaned.substring(0, 25);
}

// CRC16-CCITT (0xFFFF, poly 0x1021) for BR Code PIX payload.
function crc16(payload) {
  let crc = 0xffff;
  const polynomial = 0x1021;

  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = (crc << 1) ^ polynomial;
      } else {
        crc <<= 1;
      }
      crc &= 0xffff;
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, "0");
}

function buildPayload({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  txid,
  description
}) {
  const payloadFormat = tlv("00", "01");
  const method = tlv("01", "11");
  const gui = tlv("00", "br.gov.bcb.pix");
  const key = tlv("01", String(pixKey).trim());
  const desc = description ? tlv("02", description) : "";
  const merchantAccountInfo = tlv("26", gui + key + desc);
  const mcc = tlv("52", "0000");
  const currency = tlv("53", "986");
  const amountField = amount ? tlv("54", String(amount)) : "";
  const countryCode = tlv("58", "BR");
  const merchantNameField = tlv("59", merchantName);
  const merchantCityField = tlv("60", merchantCity);
  const txidField = tlv("05", txid);
  const additionalDataField = tlv("62", txidField);

  const partialPayload =
    payloadFormat +
    method +
    merchantAccountInfo +
    mcc +
    currency +
    amountField +
    countryCode +
    merchantNameField +
    merchantCityField +
    additionalDataField;

  const toCrc = partialPayload + "6304";
  const crc = crc16(toCrc);

  return partialPayload + tlv("63", crc);
}

export function buildPixPayloadData({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  txid = "***",
  description
}) {
  if (!pixKey) throw new Error("pixKey is required");
  if (!merchantName) throw new Error("merchantName is required");
  if (!merchantCity) throw new Error("merchantCity is required");

  const safeMerchantName = normalizeText(merchantName, 25);
  const safeMerchantCity = normalizeText(merchantCity, 15);
  const safeDescription = description ? normalizeText(description, 25) : "";
  const safeTxid = normalizeTxid(txid);

  return {
    payload: buildPayload({
      pixKey,
      merchantName: safeMerchantName,
      merchantCity: safeMerchantCity,
      amount,
      txid: safeTxid,
      description: safeDescription || ""
    }),
    merchantName: safeMerchantName,
    merchantCity: safeMerchantCity,
    txid: safeTxid,
    description: safeDescription
  };
}

/**
 * Generates a BACEN BR Code payload for PIX.
 */
export function generatePixPayload({
  pixKey,
  merchantName,
  merchantCity,
  amount,
  txid = "***",
  description
}) {
  return buildPixPayloadData({
    pixKey,
    merchantName,
    merchantCity,
    amount,
    txid,
    description
  }).payload;
}
