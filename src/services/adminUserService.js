import { config } from "../config/env.js";
import { createUser, getUserByEmail, updateUserStatus } from "../models/userStore.js";
import { hashPassword } from "../utils/password.js";

export function ensureAdminUser() {
  try {
    const adminEmail = config.admin.email;
    const adminPassword = config.admin.userPassword;
    const existing = getUserByEmail(adminEmail);
    if (existing) {
      return existing;
    }
    const passwordHash = hashPassword(adminPassword);
    const user = createUser({
      name: "Admin AxionPAY",
      email: adminEmail,
      whatsapp: "+5511933331462",
      passwordHash,
      cpf: "00000000000",
      company: "AxionPAY",
      cnpj: "00000000000000",
      volume: null,
      emailVerified: true,
      role: "admin"
    });
    updateUserStatus(user.id, "approved");
    return user;
  } catch (err) {
    console.error("Falha ao garantir usuário admin:", err);
    return null;
  }
}
