// User types
export interface User {
  _id: string;
  name: string;
  email: string;
  phone: string;
  role: 'user' | 'admin' | 'collector';
  isActive: boolean;
  isVerified: boolean;
  fcmToken?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  data: {
    user: User;
    accessToken: string;
    refreshToken: string;
  };
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone: string;
  role?: 'user' | 'admin' | 'collector';
}

// Report types
export interface Location {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Report {
  _id: string;
  user: string | User;
  photo: string;
  photoUrl?: string;
  location: Location;
  address?: string;
  wasteType: WasteType;
  predictedType?: string;
  confidence?: number;
  description: string;
  urgency: UrgencyLevel;
  status: ReportStatus;
  assignedTo?: string | User;
  assignedAt?: string;
  collectedAt?: string;
  resolvedAt?: string;
  estimatedQuantity?: string;
  actualQuantity?: string;
  collectorNotes?: string;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

export type WasteType = 
  | 'organic' 
  | 'plastic' 
  | 'paper' 
  | 'metal' 
  | 'glass' 
  | 'electronic' 
  | 'hazardous' 
  | 'mixed' 
  | 'other';

export type UrgencyLevel = 'low' | 'medium' | 'high' | 'critical';

export type ReportStatus = 
  | 'pending' 
  | 'assigned' 
  | 'in_progress' 
  | 'collected' 
  | 'resolved' 
  | 'cancelled';

export interface CreateReportData {
  photo: File;
  lat: number;
  lng: number;
  description: string;
  wasteType?: WasteType;
  urgency?: UrgencyLevel;
  address?: string;
  estimatedQuantity?: string;
}

export interface UpdateReportStatusData {
  status: ReportStatus;
  collectorNotes?: string;
  adminNotes?: string;
  actualQuantity?: string;
  wasteTypeConfirmed?: WasteType;
}

// Collector types
export interface Collector extends User {
  role: 'collector';
  statistics?: CollectorStatistics;
}

export interface CollectorStatistics {
  totalReports: number;
  pendingReports: number;
  inProgressReports: number;
  completedToday: number;
  estimatedTimeRemaining: number;
}

export interface RoutePoint {
  report: Report;
  distance: number;
  estimatedTime: number;
}

export interface OptimizedRoute {
  reports: RoutePoint[];
  totalDistance: number;
  totalTime: number;
  startLocation?: {
    lat: number;
    lng: number;
  };
}

export interface PickupLog {
  _id: string;
  report: string | Report;
  collector: string | User;
  startTime: string;
  endTime?: string;
  actualQuantity?: string;
  wasteTypeConfirmed?: WasteType;
  notes?: string;
  photos?: string[];
  status: 'started' | 'completed' | 'failed';
  failureReason?: string;
  duration?: number;
  createdAt: string;
  updatedAt: string;
}

// ML types
export interface MLPrediction {
  predictedType: WasteType;
  confidence: number;
  alternatives?: Array<{
    type: WasteType;
    confidence: number;
  }>;
}

export interface MLValidation {
  isReliable: boolean;
  recommendManualReview: boolean;
  confidenceLevel: 'high' | 'medium' | 'low' | 'very_low';
}

// API types
export interface ApiResponse<T = any> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  totalReports: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> extends ApiResponse<{
  reports: T[];
  pagination: PaginationMeta;
}> {}

// Query types
export interface ReportFilters {
  status?: ReportStatus;
  wasteType?: WasteType;
  urgency?: UrgencyLevel;
  area?: string;
  lat?: number;
  lng?: number;
  radius?: number;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Statistics types
export interface ReportStatistics {
  overview: {
    totalReports: number;
    pendingReports: number;
    assignedReports: number;
    inProgressReports: number;
    collectedReports: number;
    resolvedReports: number;
    criticalReports: number;
    highUrgencyReports: number;
  };
  wasteTypeDistribution: Array<{
    _id: WasteType;
    count: number;
  }>;
}

// Map types
export interface MapLocation {
  lat: number;
  lng: number;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

// Notification types
export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: string;
  read: boolean;
  actionUrl?: string;
}

// Form types
export interface FormField {
  name: string;
  label: string;
  type: 'text' | 'email' | 'password' | 'tel' | 'textarea' | 'select' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: Array<{ value: string; label: string }>;
  validation?: {
    pattern?: RegExp;
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
  };
}

// Theme types
export interface Theme {
  mode: 'light' | 'dark';
  primaryColor: string;
  accentColor: string;
}

// App state types
export interface AppState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  theme: Theme;
  notifications: Notification[];
}

// Error types
export interface ApiError {
  message: string;
  status: number;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

// Component prop types
export interface BaseComponentProps {
  className?: string;
  children?: React.ReactNode;
}

export interface LoadingProps extends BaseComponentProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export interface ModalProps extends BaseComponentProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export interface TableColumn<T> {
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T> {
  data: T[];
  columns: TableColumn<T>[];
  loading?: boolean;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onSort?: (column: string, direction: 'asc' | 'desc') => void;
  className?: string;
}
