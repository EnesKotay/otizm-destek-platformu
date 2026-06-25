import type { User } from '@/types';

export type UserRole = User['role'];

export const ROLE_HOME_PATH: Record<UserRole, string> = {
  PARENT: '/anasayfa',
  EXPERT: '/danisanlarim',
  ADMIN: '/anasayfa',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  PARENT: 'Aile',
  EXPERT: 'Uzman',
  ADMIN: 'Yönetici',
};

export const ALL_ROLES: UserRole[] = ['PARENT', 'EXPERT', 'ADMIN'];
export const PARENT_ONLY: UserRole[] = ['PARENT'];
export const EXPERT_ONLY: UserRole[] = ['EXPERT'];
export const ADMIN_ONLY: UserRole[] = ['ADMIN'];
export const PARENT_EXPERT: UserRole[] = ['PARENT', 'EXPERT'];
export const EXPERT_ADMIN: UserRole[] = ['EXPERT', 'ADMIN'];
export const COMMUNITY_ROLES: UserRole[] = ['PARENT', 'EXPERT', 'ADMIN'];

export function canAccessRole(role: UserRole | undefined, allowedRoles: readonly UserRole[]) {
  return Boolean(role && allowedRoles.includes(role));
}
