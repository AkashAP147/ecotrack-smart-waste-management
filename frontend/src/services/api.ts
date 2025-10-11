import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';
import toast from 'react-hot-toast';
import { 
  ApiResponse, 
  AuthResponse, 
  LoginCredentials, 
  RegisterData,
  Report,
  CreateReportData,
  UpdateReportStatusData,
  ReportFilters,
  PaginatedResponse,
  ReportStatistics,
  Collector,
  OptimizedRoute,
  PickupLog,
  MLPrediction,
  User
} from '@/types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    console.log('API Service initialized with baseURL:', baseURL);
    
    this.api = axios.create({
      baseURL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor to add auth token
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('accessToken');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor to handle errors and token refresh
    this.api.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        // Handle 401 errors (unauthorized)
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              const { accessToken, refreshToken: newRefreshToken } = response.data;
              
              localStorage.setItem('accessToken', accessToken);
              localStorage.setItem('refreshToken', newRefreshToken);
              
              // Retry original request with new token
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            // Refresh failed, redirect to login
            this.logout();
            window.location.href = '/login';
          }
        }

        // Handle other errors
        this.handleApiError(error);
        return Promise.reject(error);
      }
    );
  }

  private handleApiError(error: AxiosError) {
    const response = error.response?.data as ApiResponse;
    const url = error.config?.url || '';
    
    // Don't show toast errors for profile requests (during auth initialization)
    if (url.includes('/api/auth/profile')) {
      console.warn('Profile request failed:', error.message);
      return;
    }
    
    if (response?.message) {
      toast.error(response.message);
    } else if (error.message) {
      toast.error(error.message);
    } else {
      toast.error('An unexpected error occurred');
    }
  }

  // Auth methods
  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/api/auth/login', credentials);
    return response.data;
  }

  async register(data: RegisterData): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>('/api/auth/register', data);
    return response.data;
  }

  async refreshToken(refreshToken: string): Promise<ApiResponse<{ accessToken: string; refreshToken: string }>> {
    const response = await this.api.post('/api/auth/refresh', { refreshToken });
    return response.data;
  }

  async logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await this.api.post('/api/auth/logout', { refreshToken });
      }
    } catch (error) {
      // Ignore logout errors
    } finally {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  async getProfile(): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.get('/api/auth/profile');
    return response.data;
  }

  async updateProfile(data: Partial<User>): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.put('/api/auth/profile', data);
    return response.data;
  }

  // Report methods
  async createReport(data: CreateReportData): Promise<ApiResponse<{ report: Report }>> {
    const formData = new FormData();
    formData.append('photo', data.photo);
    formData.append('lat', data.lat.toString());
    formData.append('lng', data.lng.toString());
    formData.append('description', data.description);
    
    if (data.wasteType) formData.append('wasteType', data.wasteType);
    if (data.urgency) formData.append('urgency', data.urgency);
    if (data.address) formData.append('address', data.address);
    if (data.estimatedQuantity) formData.append('estimatedQuantity', data.estimatedQuantity);

    const response = await this.api.post('/api/report', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async getReports(filters?: ReportFilters): Promise<PaginatedResponse<Report>> {
    const response = await this.api.get('/api/report', { params: filters });
    return response.data;
  }

  async getMyReports(page = 1, limit = 10, status?: string): Promise<PaginatedResponse<Report>> {
    const response = await this.api.get('/api/report/me', {
      params: { page, limit, status },
    });
    return response.data;
  }

  async getReportById(id: string): Promise<ApiResponse<{ report: Report }>> {
    const response = await this.api.get(`/api/report/${id}`);
    return response.data;
  }

  async assignCollector(reportId: string, collectorId: string): Promise<ApiResponse<{ report: Report }>> {
    const response = await this.api.put(`/api/report/${reportId}/assign`, { collectorId });
    return response.data;
  }

  async assignSelfToReport(reportId: string): Promise<ApiResponse<{ report: Report }>> {
    const response = await this.api.post(`/api/collector/assign-self/${reportId}`);
    return response.data;
  }

  async updateReportStatus(reportId: string, data: UpdateReportStatusData): Promise<ApiResponse<{ report: Report }>> {
    const response = await this.api.put(`/api/report/${reportId}/status`, data);
    return response.data;
  }

  async deleteReport(reportId: string): Promise<ApiResponse> {
    const response = await this.api.delete(`/api/report/${reportId}`);
    return response.data;
  }

  async getReportStatistics(): Promise<ApiResponse<ReportStatistics>> {
    const response = await this.api.get('/api/report/statistics');
    return response.data;
  }

  // Collector methods
  async getCollectors(page = 1, limit = 10, isActive?: boolean): Promise<PaginatedResponse<Collector>> {
    const response = await this.api.get('/api/collector', {
      params: { page, limit, isActive },
    });
    return response.data;
  }

  async getCollectorById(id: string): Promise<ApiResponse<{ collector: Collector; statistics: any; recentPickups: PickupLog[] }>> {
    const response = await this.api.get(`/api/collector/${id}`);
    return response.data;
  }

  async getCollectorRoute(id: string, startLat?: number, startLng?: number): Promise<ApiResponse<{ collector: Collector; route: OptimizedRoute; statistics: any }>> {
    const response = await this.api.get(`/api/collector/${id}/route`, {
      params: { startLat, startLng },
    });
    return response.data;
  }

  async updateCollectorStatus(id: string, isActive: boolean): Promise<ApiResponse<{ collector: Collector }>> {
    const response = await this.api.put(`/api/collector/${id}/status`, { isActive });
    return response.data;
  }

  async getCollectorPickupHistory(id: string, page = 1, limit = 10, status?: string, startDate?: string, endDate?: string): Promise<PaginatedResponse<PickupLog>> {
    const response = await this.api.get(`/api/collector/${id}/history`, {
      params: { page, limit, status, startDate, endDate },
    });
    return response.data;
  }

  async startPickup(reportId: string): Promise<ApiResponse<{ report: Report }>> {
    const response = await this.api.post(`/api/collector/pickup/${reportId}/start`);
    return response.data;
  }

  async completePickup(reportId: string, data: { actualQuantity?: string; wasteTypeConfirmed?: string; notes?: string }): Promise<ApiResponse<{ report: Report }>> {
    const response = await this.api.post(`/api/collector/pickup/${reportId}/complete`, data);
    return response.data;
  }

  async getCollectorDashboard(): Promise<ApiResponse<{ statistics: any; todayReports: Report[]; recentPickups: PickupLog[] }>> {
    const response = await this.api.get('/api/collector/dashboard');
    return response.data;
  }

  // ML methods
  async predictWasteType(image: File): Promise<ApiResponse<{ prediction: MLPrediction; validation: any; metadata: any }>> {
    const formData = new FormData();
    formData.append('image', image);

    const response = await this.api.post('/api/ml/predict', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async batchPredictWasteType(images: File[]): Promise<ApiResponse<{ results: any[]; summary: any }>> {
    const formData = new FormData();
    images.forEach(image => {
      formData.append('images', image);
    });

    const response = await this.api.post('/api/ml/predict/batch', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async predictFromUrl(imageUrl: string): Promise<ApiResponse<{ prediction: MLPrediction; validation: any; metadata: any }>> {
    const response = await this.api.post('/api/ml/predict/url', { imageUrl });
    return response.data;
  }

  async getMLModelInfo(): Promise<ApiResponse<{ model: any }>> {
    const response = await this.api.get('/api/ml/model');
    return response.data;
  }

  async getConfidenceThresholds(): Promise<ApiResponse<{ thresholds: any; description: any }>> {
    const response = await this.api.get('/api/ml/thresholds');
    return response.data;
  }

  async getSupportedWasteTypes(): Promise<ApiResponse<{ wasteTypes: any[]; totalTypes: number }>> {
    const response = await this.api.get('/api/ml/waste-types');
    return response.data;
  }

  // Admin methods
  async getAdminUsers(page = 1, limit = 10, role?: string, isActive?: boolean): Promise<PaginatedResponse<User>> {
    const response = await this.api.get('/api/admin/users', {
      params: { page, limit, role, isActive },
    });
    return response.data;
  }

  async updateUserStatus(userId: string, isActive: boolean): Promise<ApiResponse<{ user: User }>> {
    const response = await this.api.put(`/api/admin/users/${userId}/status`, { isActive });
    return response.data;
  }

  async assignCollectorToReport(reportId: string, collectorId: string): Promise<ApiResponse<{ report: Report }>> {
    const response = await this.api.post('/api/admin/assign-collector', { reportId, collectorId });
    return response.data;
  }

  async getAdminReports(page = 1, limit = 20, status?: string, urgency?: string): Promise<PaginatedResponse<Report>> {
    const response = await this.api.get('/api/report', {
      params: { page, limit, status, urgency },
    });
    return response.data;
  }

  async getSystemAnalytics(timeRange?: string): Promise<ApiResponse<any>> {
    const response = await this.api.get('/api/admin/analytics', {
      params: { timeRange },
    });
    return response.data;
  }

  // Utility methods
  async healthCheck(): Promise<ApiResponse> {
    const response = await this.api.get('/health');
    return response.data;
  }

  // File upload helper
  getFileUrl(filename: string): string {
    return `${this.api.defaults.baseURL}/uploads/${filename}`;
  }

  // Check if user is authenticated
  isAuthenticated(): boolean {
    return !!localStorage.getItem('accessToken');
  }

  // Get stored user data
  getStoredUser(): User | null {
    const userData = localStorage.getItem('userData');
    return userData ? JSON.parse(userData) : null;
  }

  // Store user data
  storeUser(user: User): void {
    localStorage.setItem('userData', JSON.stringify(user));
  }

  // Clear stored data
  clearStorage(): void {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('userData');
  }
}

// Create and export a singleton instance
export const apiService = new ApiService();
export default apiService;
