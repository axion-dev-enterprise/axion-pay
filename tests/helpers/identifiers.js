export function computeCheckDigit(digits, weightStart) {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    sum += digits[i] * (weightStart - i);
  }
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

export function generateCpf() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (digits.every((digit) => digit === digits[0])) {
    digits[0] = (digits[0] + 1) % 10;
  }
  const first = computeCheckDigit(digits, 10);
  const second = computeCheckDigit([...digits, first], 11);
  return digits.concat([first, second]).join("");
}

export function randomWhatsapp() {
  const suffix = Math.floor(100000000 + Math.random() * 900000000);
  return `55${suffix}`;
}
