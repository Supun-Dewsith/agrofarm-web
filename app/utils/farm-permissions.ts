export function farmPermissions(role?: string) {
  const normalized = role?.toUpperCase();

  const isAdmin = normalized === "ADMIN";
  const isSupervisor = normalized === "SUPERVISOR";

  return {
    canManageFarms: isAdmin,
    canCreateFields: isAdmin || isSupervisor,
    canManageFields: isAdmin || isSupervisor,
  };
}