import { apiClient, getApiErrorMessage } from './api';
import type {
  VerificatorAvailability,
  SaveVerificatorAvailabilityRequest,
} from '../types/verificator-availability';
import axios from 'axios';

export const AVAILABILITY_ERROR_MESSAGES: Record<string, string> = {
  INVALID_AVAILABILITY_RANGE:
    'Khoảng thời gian tra cứu không hợp lệ (thời gian kết thúc phải lớn hơn thời gian bắt đầu và tối đa trong vòng 31 ngày).',
  INVALID_AVAILABILITY_INTERVAL:
    'Khoảng thời gian rảnh không hợp lệ. Khung giờ phải ở tương lai, kéo dài tối đa 31 ngày và kết thúc trong vòng 365 ngày tới.',
  AVAILABILITY_OVERLAP:
    'Khoảng thời gian này bị trùng lặp với lịch rảnh khác đã có trong danh sách của bạn.',
  AVAILABILITY_IN_USE:
    'Không thể sửa hoặc xóa lịch rảnh này vì khoảng thời gian đang phục vụ một cuộc họp xác minh đang giữ chỗ hoặc đã phân công.',
  AVAILABILITY_NOT_FOUND: 'Không tìm thấy khoảng thời gian rảnh yêu cầu.',
  AVAILABILITY_CONFLICT:
    'Dữ liệu lịch rảnh đã bị thay đổi đồng thời bởi thao tác khác. Vui lòng tải lại và thử lại.',
  FORBIDDEN:
    'Tài khoản không phải là Verificator đang hoạt động hoặc không có quyền thao tác.',
};

export const parseAvailabilityErrorMessage = (
  error: unknown,
  fallback = 'Đã có lỗi xảy ra khi thao tác với lịch trống. Vui lòng thử lại.'
): string => {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data;
    if (data && typeof data === 'object') {
      const code = (data as { code?: string }).code;
      if (code && AVAILABILITY_ERROR_MESSAGES[code]) {
        return AVAILABILITY_ERROR_MESSAGES[code];
      }
    }
  }
  return getApiErrorMessage(error, fallback);
};

export const verificatorAvailabilityService = {
  /**
   * Lấy danh sách lịch rảnh cá nhân theo khoảng thời gian (tối đa 31 ngày)
   */
  list: async (
    from: string,
    to: string,
    signal?: AbortSignal
  ): Promise<VerificatorAvailability[]> => {
    const response = await apiClient.get<VerificatorAvailability[]>(
      '/verificators/me/availability',
      {
        params: { from, to },
        signal,
      }
    );
    return response.data;
  },

  /**
   * Thêm mới một khung giờ rảnh
   */
  create: async (
    request: SaveVerificatorAvailabilityRequest
  ): Promise<VerificatorAvailability> => {
    const response = await apiClient.post<VerificatorAvailability>(
      '/verificators/me/availability',
      request
    );
    return response.data;
  },

  /**
   * Cập nhật một khung giờ rảnh theo ID
   */
  update: async (
    id: string,
    request: SaveVerificatorAvailabilityRequest
  ): Promise<VerificatorAvailability> => {
    const response = await apiClient.put<VerificatorAvailability>(
      `/verificators/me/availability/${encodeURIComponent(id)}`,
      request
    );
    return response.data;
  },

  /**
   * Xóa một khung giờ rảnh theo ID
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(
      `/verificators/me/availability/${encodeURIComponent(id)}`
    );
  },
};

