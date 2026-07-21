export function normalizeCpf(value) {
  return String(value || "").replace(/\D/g, "");
}

export function isValidCpf(value) {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map((char) => Number(char));
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += digits[i] * (10 - i);
  }
  let firstCheck = (sum * 10) % 11;
  if (firstCheck === 10) firstCheck = 0;
  if (firstCheck !== digits[9]) return false;

  sum = 0;
  for (let i = 0; i < 10; i += 1) {
    sum += digits[i] * (11 - i);
  }
  let secondCheck = (sum * 10) % 11;
  if (secondCheck === 10) secondCheck = 0;
  return secondCheck === digits[10];
}
