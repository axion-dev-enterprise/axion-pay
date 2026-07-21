import { findOne, filter, listAll } from "./jsonStore.js";

export function getPermissionsByTag(tagName) {
  if (!tagName) return [];
  const payTag = findOne("payTags", (entry) => entry.name === tagName);
  if (!payTag) return [];
  const rels = filter("payTagPermissions", (entry) => entry.tag_id === payTag.id);
  return rels
    .map((rel) => {
      const permission = findOne("permissions", (perm) => perm.id === rel.permission_id);
      return permission?.name;
    })
    .filter(Boolean);
}

export function listPermissions() {
  const rows = listAll("permissions");
  rows.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  return rows;
}

export function findPermissionByName(name) {
  return findOne("permissions", (perm) => perm.name === name);
}

export function findPermissionById(id) {
  return findOne("permissions", (perm) => perm.id === id);
}
