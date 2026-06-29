export const PLATFORM_NAME = 'HausLink';

export const PLATFORM_FEE_PCT = 0.02;

export const TENANT_SUBSCRIPTION_RWF = 5000;

export const LANDLORD_REGISTRATION_RWF = 10000;

export const FEATURED_LISTING_MONTHLY_RWF = 25000;

export const FEATURED_LISTING_WEEKLY_RWF = 10000;

export const SESSION_TTL_SECONDS = 86400;

export const CACHE_TTL = {
  PROPERTY_LIST: 300,
  DASHBOARD_KPIS: 120,
  USER_PROFILE: 600,
  PLATFORM_CONFIG: 3600,
} as const;

export const ROUTES = {
  TENANT_HOME: '/tenant/dashboard',
  LANDLORD_HOME: '/landlord/dashboard',
  ADMIN_HOME: '/admin/dashboard',
  LOGIN: '/login',
  UNAUTHORIZED: '/unauthorized',
  ONBOARDING: '/onboarding',
} as const;

export const AUDIT_ACTIONS = {
  KYC_APPROVED: 'KYC_APPROVED',
  KYC_REJECTED: 'KYC_REJECTED',
  REGISTRATION_APPROVED: 'REGISTRATION_APPROVED',
  REGISTRATION_REJECTED: 'REGISTRATION_REJECTED',
  USER_BANNED: 'USER_BANNED',
  USER_UNBANNED: 'USER_UNBANNED',
  USER_STATUS_UPDATED: 'USER_STATUS_UPDATED',
  PROPERTY_APPROVED: 'PROPERTY_APPROVED',
  PROPERTY_REJECTED: 'PROPERTY_REJECTED',
  PROPERTY_FEATURED: 'PROPERTY_FEATURED',
  PROPERTY_DELETED: 'PROPERTY_DELETED',
  PROPERTY_UPDATED: 'PROPERTY_UPDATED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  REPORT_RESOLVED: 'REPORT_RESOLVED',
  REPORT_DISMISSED: 'REPORT_DISMISSED',
  PLATFORM_CONFIG_UPDATED: 'PLATFORM_CONFIG_UPDATED',
  ADMIN_CREATED: 'ADMIN_CREATED',
  TENANCY_TERMINATED: 'TENANCY_TERMINATED',
  APPLICATIONS_EXPORTED: 'APPLICATIONS_EXPORTED',
  TENANCIES_EXPORTED: 'TENANCIES_EXPORTED',
  MAINTENANCE_ASSIGNED: 'MAINTENANCE_ASSIGNED',
  MESSAGE_FLAGGED: 'MESSAGE_FLAGGED',
} as const;

export const CACHE_KEYS = {
  propertyList: (city?: string, page?: number) =>
    `properties:list:${city ?? 'all'}:${page ?? 1}`,
  propertyDetail: (id: string) => `properties:detail:${id}`,
  tenantDashboard: (userId: string) => `tenant:dashboard:${userId}`,
  landlordDashboard: (userId: string) => `landlord:dashboard:${userId}`,
  adminDashboardKpis: () => 'admin:dashboard:kpis',
  platformConfig: () => 'platform:config',
  userProfile: (userId: string) => `user:profile:${userId}`,
} as const;