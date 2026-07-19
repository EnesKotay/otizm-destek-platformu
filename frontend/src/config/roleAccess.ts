import type { User } from '@/types';

export type UserRole = User['role'];

export const ROLE_HOME_PATH: Record<UserRole, string> = {
  PARENT: '/anasayfa',
  EXPERT: '/danisanlarim',
  TEACHER: '/anasayfa',
  ADMIN: '/anasayfa',
};

export const ROLE_LABELS: Record<UserRole, string> = {
  PARENT: 'Aile',
  EXPERT: 'Uzman',
  TEACHER: 'Öğretmen',
  ADMIN: 'Yönetici',
};

export const ALL_ROLES: UserRole[] = ['PARENT', 'EXPERT', 'TEACHER', 'ADMIN'];
export const PARENT_ONLY: UserRole[] = ['PARENT'];
export const EXPERT_ONLY: UserRole[] = ['EXPERT'];
export const TEACHER_ONLY: UserRole[] = ['TEACHER'];
export const ADMIN_ONLY: UserRole[] = ['ADMIN'];
export const PARENT_EXPERT: UserRole[] = ['PARENT', 'EXPERT'];
export const EXPERT_ADMIN: UserRole[] = ['EXPERT', 'ADMIN'];
export const COMMUNITY_ROLES: UserRole[] = ['PARENT', 'EXPERT', 'TEACHER', 'ADMIN'];

export function canAccessRole(role: UserRole | undefined, allowedRoles: readonly UserRole[]) {
  return Boolean(role && allowedRoles.includes(role));
}

export type FeaturePermissionKey =
  | 'dashboard'
  | 'child_profile'
  | 'daily_tracking'
  | 'appointments'
  | 'messages'
  | 'tasks'
  | 'clinical_notes'
  | 'bep_reports'
  | 'knowledge'
  | 'community'
  | 'user_management'
  | 'moderation'
  | 'system_settings';

export type FeaturePermission = {
  key: FeaturePermissionKey;
  title: string;
  category: string;
  description: string;
  allowedRoles: UserRole[];
  accessByRole: Partial<Record<UserRole, string>>;
};

export const FEATURE_PERMISSIONS: FeaturePermission[] = [
  {
    key: 'dashboard',
    title: 'Ana sayfa ve özetler',
    category: 'Genel',
    description: 'Kullanıcının rolüne göre günlük akış, bildirim ve hızlı erişim özetleri.',
    allowedRoles: ALL_ROLES,
    accessByRole: {
      PARENT: 'Kendi aile ve çocuk özetini görür.',
      EXPERT: 'Danışan, randevu ve bekleyen iş özetini görür.',
      ADMIN: 'Platform geneli yönetim özetini görür.',
    },
  },
  {
    key: 'child_profile',
    title: 'Çocuk profili',
    category: 'Aile',
    description: 'Çocuk temel bilgileri, gelişim kayıtları ve profil detayları.',
    allowedRoles: PARENT_EXPERT,
    accessByRole: {
      PARENT: 'Kendi çocuk profillerini oluşturur ve düzenler.',
      EXPERT: 'Sadece yetkili veya danışanı olan çocukları görüntüler.',
    },
  },
  {
    key: 'daily_tracking',
    title: 'Günlük takip',
    category: 'Aile',
    description: 'Uyku, ruh hali, ilaç ve kısa gözlem kayıtları.',
    allowedRoles: PARENT_ONLY,
    accessByRole: {
      PARENT: 'Kendi çocuğu için günlük kayıt girer ve geçmişi inceler.',
    },
  },
  {
    key: 'appointments',
    title: 'Randevular',
    category: 'Klinik',
    description: 'Randevu talebi, müsaitlik ve seans planlama akışları.',
    allowedRoles: PARENT_EXPERT,
    accessByRole: {
      PARENT: 'Uzmandan randevu talep eder ve kendi randevularını izler.',
      EXPERT: 'Müsaitliklerini, talepleri ve seans takvimini yönetir.',
    },
  },
  {
    key: 'messages',
    title: 'Mesajlaşma',
    category: 'İletişim',
    description: 'Aile, uzman ve platform içi güvenli yazışmalar.',
    allowedRoles: ALL_ROLES,
    accessByRole: {
      PARENT: 'Uzmanlar ve topluluk bağlantılarıyla yazışır.',
      EXPERT: 'Danışan aileleriyle ve uzman gruplarıyla yazışır.',
      ADMIN: 'Destek ve denetim amaçlı mesajlaşma alanına erişir.',
    },
  },
  {
    key: 'tasks',
    title: 'Görev ve ödevler',
    category: 'Klinik',
    description: 'Uzmanın verdiği ev çalışmaları ve tamamlanma kayıtları.',
    allowedRoles: PARENT_EXPERT,
    accessByRole: {
      PARENT: 'Verilen görevleri görür, tamamlar ve kanıt/not ekler.',
      EXPERT: 'Danışana görev verir, takip eder ve değerlendirir.',
    },
  },
  {
    key: 'clinical_notes',
    title: 'Klinik not ve paylaşım',
    category: 'Gizlilik',
    description: 'Notlar, paylaşılmış ilerleme bilgileri ve uzman erişimi.',
    allowedRoles: PARENT_EXPERT,
    accessByRole: {
      PARENT: 'Kendi notlarını tutar ve uzmanla paylaşım iznini yönetir.',
      EXPERT: 'Yalnızca izin verilen danışan verilerini görür ve not ekler.',
    },
  },
  {
    key: 'bep_reports',
    title: 'BEP raporu',
    category: 'Klinik',
    description: 'Uzman tarafından hazırlanan yapılandırılmış rapor üretimi.',
    allowedRoles: EXPERT_ONLY,
    accessByRole: {
      EXPERT: 'Doğrulanmış uzman hesabıyla BEP raporu hazırlar.',
    },
  },
  {
    key: 'knowledge',
    title: 'Bilgi bankası',
    category: 'İçerik',
    description: 'Makale, rehber ve kaynak içeriklerini okuma veya yönetme.',
    allowedRoles: ALL_ROLES,
    accessByRole: {
      PARENT: 'Yayınlanmış kaynakları okur.',
      EXPERT: 'Kaynak içerik oluşturur ve kendi içeriklerini yönetir.',
      ADMIN: 'İçeriklerin yayın ve moderasyon sürecini yönetir.',
    },
  },
  {
    key: 'community',
    title: 'Topluluk alanları',
    category: 'Topluluk',
    description: 'Forum, gruplar, benzer aileler ve yerel buluşmalar.',
    allowedRoles: COMMUNITY_ROLES,
    accessByRole: {
      PARENT: 'Forum, aile topluluğu ve buluşma alanlarını kullanır.',
      EXPERT: 'Forum ve uzman gruplarında katkı verir.',
      ADMIN: 'Topluluk düzenini izler ve gerekli aksiyonları alır.',
    },
  },
  {
    key: 'user_management',
    title: 'Kullanıcı yönetimi',
    category: 'Yönetim',
    description: 'Kullanıcı hesapları, aktiflik durumları ve rol denetimi.',
    allowedRoles: ADMIN_ONLY,
    accessByRole: {
      ADMIN: 'Kullanıcıları listeler, durumlarını yönetir ve dışa aktarır.',
    },
  },
  {
    key: 'moderation',
    title: 'Moderasyon',
    category: 'Yönetim',
    description: 'Şikayet, rapor ve incelenmesi gereken içerik akışları.',
    allowedRoles: ADMIN_ONLY,
    accessByRole: {
      ADMIN: 'Raporları inceler, içerik ve kullanıcı aksiyonlarını yönetir.',
    },
  },
  {
    key: 'system_settings',
    title: 'Sistem ayarları',
    category: 'Yönetim',
    description: 'Platform genel davranışı, bakım modu ve yapılandırmalar.',
    allowedRoles: ADMIN_ONLY,
    accessByRole: {
      ADMIN: 'Sistem yapılandırmalarını ve bakım ayarlarını yönetir.',
    },
  },
];

export function canUseFeature(role: UserRole | undefined, featureKey: FeaturePermissionKey) {
  const feature = FEATURE_PERMISSIONS.find((item) => item.key === featureKey);
  return Boolean(feature && role && feature.allowedRoles.includes(role));
}

export function getFeaturePermissionsForRole(role: UserRole) {
  return FEATURE_PERMISSIONS.filter((feature) => feature.allowedRoles.includes(role));
}
