export type UserRole = 'TENANT' | 'LANDLORD' | 'ADMIN';

export type UserStatus = 'ACTIVE' | 'PENDING' | 'BANNED' | 'SUSPENDED';

export type KYCStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED';

export type PropertyStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'ACTIVE' | 'OCCUPIED' | 'INACTIVE';

export type PropertyType = 'APARTMENT' | 'HOUSE' | 'ROOM' | 'STUDIO' | 'VILLA' | 'OFFICE' | 'COMMERCIAL';

export type ApplicationStatus = 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';

export type TenancyStatus = 'ACTIVE' | 'ENDING_SOON' | 'EXPIRED' | 'TERMINATED';

export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED' | 'CANCELLED';

export type PaymentType = 'MONTHLY_RENT' | 'SECURITY_DEPOSIT' | 'SUBSCRIPTION' | 'REGISTRATION' | 'FEATURED_LISTING' | 'REFUND';

export type PaymentMethod = 'MTN_MOMO' | 'AIRTEL_MONEY' | 'STRIPE' | 'BANK_TRANSFER';

export type MaintenanceCategory = 'PLUMBING' | 'ELECTRICAL' | 'HVAC' | 'STRUCTURAL' | 'APPLIANCE' | 'CLEANING' | 'SECURITY' | 'OTHER';

export type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

export type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

export type DisbursementStatus = 'PENDING' | 'COMPLETED' | 'FAILED';

export type ReportType = 'FAKE_LISTING' | 'HARASSMENT' | 'PAYMENT_SCAM' | 'FRAUD' | 'DOCUMENTS' | 'INAPPROPRIATE' | 'DUPLICATE' | 'OVERCHARGING';

export type ReportStatus = 'PENDING' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

export type Language = 'EN' | 'RW';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  kyc_status: KYCStatus;
  registration_paid: boolean;
}

export interface ApiSuccess<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiError {
  success: false;
  error: string;
  code?: string;
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError;

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TenantDashboardKPIs {
  totalApplications: number;
  pendingApplications: number;
  activeMaintenance: number;
  pendingPayments: number;
  unreadMessages: number;
}

export interface LandlordDashboardKPIs {
  occupancyRate: number;
  totalRentThisMonth: number;
  activeTenants: number;
  maintenanceOpen: number;
  pendingApplications: number;
}

export interface AdminDashboardKPIs {
  totalUsers: number;
  totalProperties: number;
  platformRevenueRwf: number;
  pendingKYC: number;
  pendingApplications: number;
  failedPayments: number;
}