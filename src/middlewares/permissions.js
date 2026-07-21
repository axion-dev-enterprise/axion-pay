import { getPermissionsByTag } from '../models/permissionStore.js';
import { logger } from '../utils/logger.js';

export function requirePermission(requiredPermission) {
  return (req, res, next) => {
    const tag = req.headers['pay-tag'];
    logger.info({ tag }, 'Verificando permissões para a tag');

    if (!tag) {
      if (!requiredPermission) {
        return next();
      }
    }

    const userPermissions = getPermissionsByTag(tag || '');
    logger.info({ userPermissions }, 'Permissões encontradas para a tag');

    if (!userPermissions.includes(requiredPermission)) {
      logger.warn({ requiredPermission, userPermissions }, 'Tentativa de acesso não autorizado');
      return res.status(403).json({
        ok: false,
        error: 'A pay-tag fornecida não tem permissão para executar esta ação.',
        code: 'forbidden'
      });
    }

    req.permissions = userPermissions;
    next();
  };
}
