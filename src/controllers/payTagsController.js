import { AppError } from "../utils/errors.js";
import {
  createPayTag,
  listPayTagsByUser,
  togglePayTagStatus,
  deletePayTag,
  findPayTagByNormalizedName
} from "../models/payTagsStore.js";

export async function createPayTagHandler(req, res, next) {
  try {
    const user = req.user;
    const { name, description, webhookUrl } = req.body;

    if (!name || name.trim().length === 0) {
      throw new AppError("Nome da Pay-Tag e obrigatorio.", 400, "invalid_request");
    }

    const normalized = name.trim().toLowerCase();
    const existing = findPayTagByNormalizedName(normalized);
    if (existing) {
      throw new AppError("Pay-Tag ja em uso.", 409, "tag_exists");
    }

    const payTag = createPayTag({
      userId: user.id,
      name: name.trim(),
      description: description?.trim() || null,
      webhookUrl: webhookUrl?.trim() || null
    });

    return res.status(201).json({
      ok: true,
      pay_tag: payTag
    });
  } catch (err) {
    return next(err);
  }
}

export async function listPayTagsHandler(req, res, next) {
  try {
    const user = req.user;
    const payTags = listPayTagsByUser(user.id);

    return res.json({
      ok: true,
      pay_tags: payTags
    });
  } catch (err) {
    return next(err);
  }
}

export async function togglePayTagHandler(req, res, next) {
  try {
    const user = req.user;
    const { id } = req.params;

    const updatedTag = togglePayTagStatus({
      userId: user.id,
      payTagId: id
    });

    if (!updatedTag) {
      throw new AppError("Pay-Tag nao encontrada.", 404, "not_found");
    }

    return res.json({
      ok: true,
      pay_tag: updatedTag
    });
  } catch (err) {
    return next(err);
  }
}

export async function deletePayTagHandler(req, res, next) {
  try {
    const user = req.user;
    const { id } = req.params;

    const deleted = deletePayTag({
      userId: user.id,
      payTagId: id
    });

    if (!deleted) {
      throw new AppError("Pay-Tag nao encontrada.", 404, "not_found");
    }

    return res.json({
      ok: true,
      message:
        "Pay-Tag excluida. Relatorios associados foram apagados, mas o valor recebido permanece registrado no historico."
    });
  } catch (err) {
    return next(err);
  }
}

