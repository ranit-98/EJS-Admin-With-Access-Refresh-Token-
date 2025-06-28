const permissions = {
  admin: ['create', 'read', 'update', 'delete'],
  manager: ['read', 'update'],
  employee: ['read']
};

const hasPermission = (role, permission) => {
  return permissions[role]?.includes(permission);
};

module.exports = { hasPermission };