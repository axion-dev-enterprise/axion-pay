import { AppError } from "../utils/errors.js";
import {
  createSupportChat,
  listSupportChatsByUser,
  listAllSupportChats,
  respondToSupportChat
} from "../models/supportChatStore.js";

export function listUserSupportChatsHandler(req, res) {
  const userId = req.user.id;
  const chats = listSupportChatsByUser(userId);
  return res.json({ ok: true, chats });
}

export function createSupportChatHandler(req, res, next) {
  try {
    const { message } = req.body || {};
    if (!message || String(message).trim().length < 5) {
      throw new AppError(
        "Digite uma mensagem com pelo menos 5 caracteres.",
        400,
        "invalid_message"
      );
    }
    const chat = createSupportChat({
      userId: req.user.id,
      userName: req.user.name,
      userEmail: req.user.email,
      message: String(message).trim()
    });
    return res.status(201).json({ ok: true, chat });
  } catch (err) {
    return next(err);
  }
}

export function listSupportChatsForAdminHandler(_req, res) {
  const chats = listAllSupportChats();
  return res.json({ ok: true, chats });
}

export function respondSupportChatHandler(req, res, next) {
  try {
    const { id } = req.params;
    const { response } = req.body || {};
    if (!response || String(response).trim().length < 3) {
      throw new AppError("Informe uma resposta valida.", 400, "invalid_response");
    }
    const updated = respondToSupportChat(id, String(response).trim());
    if (!updated) {
      return res
        .status(404)
        .json({ ok: false, error: "Chat nao encontrado.", code: "not_found" });
    }
    return res.json({ ok: true, chat: updated });
  } catch (err) {
    return next(err);
  }
}

