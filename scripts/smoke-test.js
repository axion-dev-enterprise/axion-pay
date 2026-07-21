import path from "path";
import { promises as fs } from "fs";
import request from "supertest";
import { app } from "../src/app.js";

function computeCheckDigit(digits, weightStart) {
  let sum = 0;
  for (let i = 0; i < digits.length; i += 1) {
    sum += digits[i] * (weightStart - i);
  }
  const remainder = (sum * 10) % 11;
  return remainder === 10 ? 0 : remainder;
}

function generateCpf() {
  const digits = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  if (digits.every((digit) => digit === digits[0])) {
    digits[0] = (digits[0] + 1) % 10;
  }
  const first = computeCheckDigit(digits, 10);
  const second = computeCheckDigit([...digits, first], 11);
  return digits.concat([first, second]).join("");
}

function randomWhatsapp() {
  const suffix = Math.floor(10000000 + Math.random() * 90000000);
  return `55${suffix}`;
}

async function runSmokeTest() {
  const distEntry = path.join(process.cwd(), "public", "app", "index.html");
  await fs.access(distEntry);

  const api = request(app);

  await api
    .get("/health")
    .expect(200)
    .expect((res) => {
      if (!res.body.ok) {
        throw new Error("Health endpoint returned unexpected payload.");
      }
    });

  const homepage = await api.get("/").expect(200);
  if (!homepage.text.includes("AxionPAY")) {
    throw new Error("Homepage missing expected branding.");
  }

  const cpf = generateCpf();
  const whatsapp = randomWhatsapp();
  const password = "AxionPay123!";

  await api.post("/signup").send({ name: "Smoke Tester", cpf, whatsapp, password }).expect(201);

  const loginResponse = await api
    .post("/auth/login")
    .send({ identifier: whatsapp, password })
    .expect(200);

  const token = loginResponse.body.token;
  if (!token) {
    throw new Error("Login did not return token.");
  }

  await api
    .get("/account/pay-tags")
    .set("Authorization", `Bearer ${token}`)
    .expect(200)
    .expect((res) => {
      if (!res.body.ok) {
        throw new Error("Pay-tags endpoint did not return ok.");
      }
    });

  console.log("Smoke tests passed.");
}

runSmokeTest().catch((err) => {
  console.error("Smoke test failed:", err);
  process.exit(1);
});
