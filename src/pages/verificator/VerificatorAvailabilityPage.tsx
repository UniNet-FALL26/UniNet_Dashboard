import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';
import {
  CalendarClock,
  Plus,
  RefreshCw,
  Trash2,
  Edit,
  Clock,
  CalendarDays,
  AlertCircle,
  CheckCircle2,
  Calendar,
  Info,
  X,
  LayoutGrid,
  Table as TableIcon,
} from 'lucide-react';
import {
  verificatorAvailabilityService,
  parseAvailabilityErrorMessage,
} from '../../services/verificator-availability.service';
import type {
  VerificatorAvailability,
  SaveVerificatorAvailabilityRequest,
} from '../../types/verificator-availability';
import { managementButton, managementInput } from '../../utils/management';

// Preset ca làm việc phổ biến
const TIME_PRESETS = [
  { label: 'Ca sáng (08:00 - 12:00)', start: '08:00', end: '12:00' },
  { label: 'Ca chiều (13:30 - 17:30)', start: '13:30', end: '17:30' },
  { label: 'Buổi tối (18:30 - 21:00)', start: '18:30', end: '21:00' },
  { label: 'Cả ngày (08:00 - 17:00)', start: '08:00', end: '17:00' },
];

// Helper định dạng ngày tháng tiếng Việt có thứ (ví dụ: Thứ 2, 02/11/2026)
const formatDateVietnamese = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
};

// Định dạng chỉ giờ phút (ví dụ: 13:45)
const formatTimeOnly = (date: Date): string => {
  return new Intl.DateTimeFormat('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(date);
};

// Định dạng input date YYYY-MM-DD
const toInputDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

// Định dạng thời lượng giữa 2 mốc thời gian (hỗ trợ hiển thị ngày, giờ, phút)
const formatDuration = (start: Date, end: Date): string => {
  const diffMs = end.getTime() - start.getTime();
  if (diffMs <= 0) return '0 phút';
  const totalMinutes = Math.floor(diffMs / (1000 * 60));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;

  if (days > 0) {
    if (remainingHours > 0 && minutes > 0) {
      return `${days} ngày ${remainingHours}h ${minutes}m (${hours} giờ)`;
    }
    if (remainingHours > 0) {
      return `${days} ngày ${remainingHours} giờ (${hours} giờ)`;
    }
    if (minutes > 0) {
      return `${days} ngày ${minutes} phút (${hours} giờ)`;
    }
    return `${days} ngày (${hours} giờ)`;
  }

  if (hours > 0 && minutes > 0) return `${hours} giờ ${minutes} phút`;
  if (hours > 0) return `${hours} giờ`;
  return `${minutes} phút`;
};

export const VerificatorAvailabilityPage: React.FC = () => {
  // Khoảng thời gian tra cứu (mặc định 30 ngày từ hôm nay)
  const [rangeMode, setRangeMode] = useState<'30days' | 'thisWeek' | 'nextWeek' | 'custom'>('30days');
  const [customFrom, setCustomFrom] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return toInputDate(d);
  });
  const [customTo, setCustomTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    d.setHours(23, 59, 59, 999);
    return toInputDate(d);
  });

  // State dữ liệu & tải trang
  const [items, setItems] = useState<VerificatorAvailability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Chế độ xem: thẻ theo ngày (timeline) hoặc bảng (table)
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  // Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<VerificatorAvailability | null>(null);
  const [formStartDate, setFormStartDate] = useState('');
  const [formStartTime, setFormStartTime] = useState('08:00');
  const [formEndDate, setFormEndDate] = useState('');
  const [formEndTime, setFormEndTime] = useState('12:00');
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Modal Xác nhận Xóa
  const [deletingItem, setDeletingItem] = useState<VerificatorAvailability | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ID trợ năng (Accessibility)
  const modalTitleId = useId();
  const deleteTitleId = useId();

  // Tính toán khoảng ngày thực tế để gọi API
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    let from = new Date(now);
    let to = new Date(now);

    if (rangeMode === '30days') {
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(to.getDate() + 30);
      to.setHours(23, 59, 59, 999);
    } else if (rangeMode === 'thisWeek') {
      // Thứ 2 tuần này đến Chủ Nhật
      const day = now.getDay();
      const diffToMonday = day === 0 ? -6 : 1 - day;
      from.setDate(now.getDate() + diffToMonday);
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(to.getDate() + 6);
      to.setHours(23, 59, 59, 999);
    } else if (rangeMode === 'nextWeek') {
      const day = now.getDay();
      const diffToMonday = day === 0 ? 1 : 8 - day;
      from.setDate(now.getDate() + diffToMonday);
      from.setHours(0, 0, 0, 0);
      to = new Date(from);
      to.setDate(to.getDate() + 6);
      to.setHours(23, 59, 59, 999);
    } else {
      // custom
      from = new Date(customFrom + 'T00:00:00');
      to = new Date(customTo + 'T23:59:59');
    }

    return { fromDate: from, toDate: to };
  }, [rangeMode, customFrom, customTo]);

  // Tải danh sách lịch rảnh từ Backend
  const loadAvailabilities = useCallback(async (signal?: AbortSignal) => {
    // Kiểm tra ràng buộc tối đa 31 ngày
    const diffDays = (toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays <= 0) {
      setError('Thời gian kết thúc phải lớn hơn thời gian bắt đầu.');
      return;
    }
    if (diffDays > 31.5) {
      setError('Khoảng thời gian tra cứu tối đa không được vượt quá 31 ngày (theo quy định hệ thống).');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const data = await verificatorAvailabilityService.list(
        fromDate.toISOString(),
        toDate.toISOString(),
        signal
      );
      setItems(data);
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'CanceledError') return;
      setError(parseAvailabilityErrorMessage(err, 'Không thể tải danh sách lịch rảnh.'));
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate]);

  useEffect(() => {
    const controller = new AbortController();
    loadAvailabilities(controller.signal);
    return () => controller.abort();
  }, [loadAvailabilities]);

  // Tự ẩn thông báo Toast sau 4 giây
  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 4000);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  // Thống kê nhanh
  const stats = useMemo(() => {
    const now = new Date();
    const count = items.length;
    let totalMinutes = 0;
    let nextUpcoming: VerificatorAvailability | null = null;
    let upcomingCount = 0;

    items.forEach((item) => {
      const s = new Date(item.startAt);
      const e = new Date(item.endAt);
      if (e > now) {
        upcomingCount++;
        if (!nextUpcoming && s > now) {
          nextUpcoming = item;
        }
      }
      totalMinutes += Math.max(0, Math.floor((e.getTime() - s.getTime()) / (1000 * 60)));
    });

    const hours = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;

    return {
      count,
      upcomingCount,
      totalDuration: `${hours}h ${mins > 0 ? `${mins}m` : ''}`,
      nextUpcoming,
    };
  }, [items]);

  // Gom nhóm danh sách theo Ngày bắt đầu để hiển thị dạng Timeline / Cards
  const groupedByDate = useMemo(() => {
    const groups: Record<string, { date: Date; items: VerificatorAvailability[] }> = {};

    items.forEach((item) => {
      const s = new Date(item.startAt);
      const dateKey = toInputDate(s);
      if (!groups[dateKey]) {
        groups[dateKey] = {
          date: s,
          items: [],
        };
      }
      groups[dateKey].items.push(item);
    });

    // Sắp xếp ngày tăng dần
    return Object.entries(groups)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, group]) => ({
        key,
        date: group.date,
        items: group.items.sort(
          (a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime()
        ),
      }));
  }, [items]);

  // Mở modal tạo mới
  const handleOpenCreateModal = (defaultDate?: Date) => {
    const targetDate = defaultDate || new Date();
    const dateStr = toInputDate(targetDate);
    setEditingItem(null);
    setFormStartDate(dateStr);
    setFormStartTime('08:00');
    setFormEndDate(dateStr);
    setFormEndTime('12:00');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (item: VerificatorAvailability) => {
    const start = new Date(item.startAt);
    const end = new Date(item.endAt);
    setEditingItem(item);
    setFormStartDate(toInputDate(start));
    setFormStartTime(formatTimeOnly(start));
    setFormEndDate(toInputDate(end));
    setFormEndTime(formatTimeOnly(end));
    setFormError(null);
    setIsModalOpen(true);
  };

  // Áp dụng Preset giờ
  const handleApplyPreset = (preset: typeof TIME_PRESETS[0]) => {
    setFormStartTime(preset.start);
    setFormEndTime(preset.end);
    setFormEndDate(formStartDate);
  };

  // Lưu lịch rảnh (Tạo mới hoặc Sửa)
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!formStartDate || !formStartTime || !formEndDate || !formEndTime) {
      setFormError('Vui lòng chọn đầy đủ ngày và giờ bắt đầu/kết thúc.');
      return;
    }

    const start = new Date(`${formStartDate}T${formStartTime}:00`);
    const end = new Date(`${formEndDate}T${formEndTime}:00`);
    const now = new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      setFormError('Thời gian không hợp lệ. Vui lòng kiểm tra lại.');
      return;
    }

    if (start <= now) {
      setFormError('Khung giờ rảnh mới phải ở trong tương lai (sau thời điểm hiện tại).');
      return;
    }

    if (end <= start) {
      setFormError('Thời gian kết thúc phải lớn hơn thời gian bắt đầu.');
      return;
    }

    const diffDays = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 31) {
      setFormError('Một khoảng thời gian rảnh kéo dài tối đa 31 ngày.');
      return;
    }

    const maxFuture = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    if (end > maxFuture) {
      setFormError('Thời gian kết thúc phải nằm trong vòng 365 ngày tới.');
      return;
    }

    setSubmitting(true);
    try {
      const payload: SaveVerificatorAvailabilityRequest = {
        startAt: start.toISOString(),
        endAt: end.toISOString(),
      };

      if (editingItem) {
        await verificatorAvailabilityService.update(editingItem.id, payload);
        setToastMessage({ type: 'success', text: 'Cập nhật khung giờ rảnh thành công!' });
      } else {
        await verificatorAvailabilityService.create(payload);
        setToastMessage({ type: 'success', text: 'Đã thêm khung giờ rảnh thành công!' });
      }

      setIsModalOpen(false);
      await loadAvailabilities();
    } catch (err) {
      setFormError(parseAvailabilityErrorMessage(err, 'Lưu khung giờ rảnh thất bại. Vui lòng kiểm tra lại.'));
    } finally {
      setSubmitting(false);
    }
  };

  // Xác nhận Xóa
  const handleDeleteConfirm = async () => {
    if (!deletingItem) return;
    setDeleting(true);
    try {
      await verificatorAvailabilityService.delete(deletingItem.id);
      setToastMessage({ type: 'success', text: 'Đã xóa khung giờ rảnh thành công.' });
      setDeletingItem(null);
      await loadAvailabilities();
    } catch (err) {
      setToastMessage({
        type: 'error',
        text: parseAvailabilityErrorMessage(err, 'Không thể xóa khung giờ rảnh.'),
      });
      setDeletingItem(null);
    } finally {
      setDeleting(false);
    }
  };

  // Xác định trạng thái khung giờ
  const getItemStatus = (item: VerificatorAvailability) => {
    const now = new Date();
    const start = new Date(item.startAt);
    const end = new Date(item.endAt);

    if (now > end) {
      return { label: 'Đã qua', bg: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    if (now >= start && now <= end) {
      return { label: 'Đang diễn ra', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
    }
    return { label: 'Sắp tới', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
  };

  return (
    <div className="space-y-6">
      {/* Toast thông báo */}
      {toastMessage && (
        <div
          role="status"
          className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl shadow-xl border text-sm font-medium transition-all duration-200 ${
            toastMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {toastMessage.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
          )}
          <span>{toastMessage.text}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-black/5"
            aria-label="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header trang */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-200">
              <CalendarClock className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Quản lý Lịch trống
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
                Khai báo lịch rảnh cá nhân để hệ thống sắp xếp các buổi họp xác minh dự án.
              </p>
            </div>
          </div>
        </div>

        {/* Nút hành động chính */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => loadAvailabilities()}
            disabled={loading}
            className={`${managementButton} min-h-10 px-3.5`}
            title="Làm mới danh sách"
            aria-label="Làm mới danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>
          <button
            type="button"
            onClick={() => handleOpenCreateModal()}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm lịch rảnh</span>
          </button>
        </div>
      </div>

      {/* Cards thống kê nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Khung giờ rảnh</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.count}</span>
            <span className="text-xs text-slate-400">khoảng đã đăng ký</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Tổng thời lượng rảnh</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-blue-600">{stats.totalDuration}</span>
            <span className="text-xs text-slate-400">khả dụng</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Khung giờ sắp tới</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{stats.upcomingCount}</span>
            <span className="text-xs text-slate-400">chưa diễn ra</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Khoảng thời gian tra cứu</p>
          <div className="mt-2">
            <p className="text-xs font-semibold text-slate-800 truncate">
              {formatDateVietnamese(fromDate)}
            </p>
            <p className="text-[11px] text-slate-400 truncate">
              đến {formatDateVietnamese(toDate)}
            </p>
          </div>
        </div>
      </div>

      {/* Hướng dẫn nghiệp vụ theo tài liệu */}
      <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 text-xs text-blue-900 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">
            Quy định về Lịch rảnh dành cho Verificator:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-blue-800">
            <li>Lịch rảnh phải ở tương lai, kéo dài tối đa 31 ngày và kết thúc trong vòng 365 ngày tới.</li>
            <li>Một buổi họp xác minh phải nằm gọn trong một khung rảnh liên tục. Nếu có giờ nghỉ trưa, vui lòng tách thành 2 khung giờ độc lập.</li>
            <li>Không thể chỉnh sửa hoặc xóa các khung giờ đang phục vụ cam kết giữ lịch hoặc đã được phân công cuộc họp.</li>
            <li>Khoảng thời gian tra cứu qua hệ thống nhận tối đa 31 ngày.</li>
          </ul>
        </div>
      </div>

      {/* Thanh bộ lọc thời gian & Chế độ xem */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Chọn khoảng thời gian nhanh */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5 mr-1">
            <Calendar className="w-3.5 h-3.5" /> Khoảng xem:
          </span>
          <button
            type="button"
            onClick={() => setRangeMode('30days')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              rangeMode === '30days'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            30 ngày tới
          </button>
          <button
            type="button"
            onClick={() => setRangeMode('thisWeek')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              rangeMode === 'thisWeek'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tuần này
          </button>
          <button
            type="button"
            onClick={() => setRangeMode('nextWeek')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              rangeMode === 'nextWeek'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tuần sau
          </button>
          <button
            type="button"
            onClick={() => setRangeMode('custom')}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
              rangeMode === 'custom'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Tự chọn ngày
          </button>
        </div>

        {/* Tùy chỉnh ngày nếu chọn custom & Chuyển chế độ xem */}
        <div className="flex flex-wrap items-center gap-3">
          {rangeMode === 'custom' && (
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span>đến</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="px-2.5 py-1.5 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}

          {/* Nút chuyển chế độ xem Card / Table */}
          <div className="flex items-center rounded-xl border border-slate-200 p-0.5 bg-slate-50">
            <button
              type="button"
              onClick={() => setViewMode('cards')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'cards'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng thẻ theo ngày"
              aria-label="Xem dạng thẻ theo ngày"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Theo ngày</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 ${
                viewMode === 'table'
                  ? 'bg-white text-blue-600 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Xem dạng bảng chi tiết"
              aria-label="Xem dạng bảng chi tiết"
            >
              <TableIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Bảng chi tiết</span>
            </button>
          </div>
        </div>
      </div>

      {/* Hiển thị lỗi nếu có */}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">Lỗi tải dữ liệu lịch rảnh</p>
            <p className="mt-0.5 text-xs text-red-600">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => loadAvailabilities()}
            className="text-xs font-semibold text-red-700 underline hover:no-underline"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="h-6 w-48 bg-slate-100 rounded-lg animate-pulse" />
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="h-24 bg-slate-100 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        </div>
      ) : items.length === 0 ? (
        /* Trạng thái trống */
        <div className="bg-white rounded-2xl border border-slate-200/80 p-12 text-center shadow-xs">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-4">
            <CalendarClock className="w-7 h-7" />
          </div>
          <h2 className="text-base font-bold text-slate-800">
            Chưa có lịch rảnh nào trong khoảng thời gian này
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Hãy khai báo các khung giờ bạn có thể nhận phân công hoặc tham gia họp xác minh để hệ thống khớp lịch với các dự án.
          </p>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => handleOpenCreateModal()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm khung giờ rảnh đầu tiên</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* DẠNG THẺ GOM THEO NGÀY (CARDS / TIMELINE VIEW) */
        <div className="space-y-4">
          {groupedByDate.map((group) => {
            const isToday = toInputDate(new Date()) === group.key;
            return (
              <div
                key={group.key}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs transition-shadow hover:shadow-sm"
              >
                {/* Tiêu đề ngày bắt đầu */}
                <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2 rounded-xl flex items-center justify-center ${
                        isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      <CalendarDays className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-sm font-bold text-slate-900">
                          {formatDateVietnamese(group.date)}
                        </h2>
                        {isToday && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-600 border border-blue-200">
                            Hôm nay
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {group.items.length} khung giờ rảnh đã đăng ký
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleOpenCreateModal(group.date)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 px-2.5 py-1.5 rounded-lg hover:bg-blue-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm khung giờ</span>
                  </button>
                </div>

                {/* Danh sách khung giờ trong ngày - Hiển thị rõ từ ngày nào đến ngày nào */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                  {group.items.map((item) => {
                    const start = new Date(item.startAt);
                    const end = new Date(item.endAt);
                    const status = getItemStatus(item);
                    const isMultiDay = toInputDate(start) !== toInputDate(end);

                    return (
                      <div
                        key={item.id}
                        className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-blue-200 hover:shadow-xs transition-all flex flex-col justify-between gap-3.5 group"
                      >
                        <div className="space-y-2.5">
                          {/* Header thẻ: Icon + Nhãn + Badge trạng thái */}
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                              <Clock className="w-4 h-4 text-blue-600 shrink-0" />
                              <span>Khung giờ khả dụng</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              {isMultiDay && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                  Nhiều ngày
                                </span>
                              )}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.bg}`}
                              >
                                {status.label}
                              </span>
                            </div>
                          </div>

                          {/* Khối hiển thị chi tiết: Rõ từ ngày nào đến ngày nào */}
                          <div className="bg-white rounded-xl p-3 border border-slate-200/90 shadow-2xs space-y-2">
                            <div className="flex items-start justify-between gap-2 text-xs">
                              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-bold text-[10px] shrink-0 mt-0.5">
                                TỪ
                              </span>
                              <div className="text-right">
                                <span className="font-bold font-mono text-slate-900 text-sm">
                                  {formatTimeOnly(start)}
                                </span>
                                <span className="text-slate-400 mx-1">·</span>
                                <span className="font-semibold text-slate-700">
                                  {formatDateVietnamese(start)}
                                </span>
                              </div>
                            </div>

                            <div className="flex items-start justify-between gap-2 text-xs border-t border-dashed border-slate-100 pt-2">
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold text-[10px] shrink-0 mt-0.5">
                                ĐẾN
                              </span>
                              <div className="text-right">
                                <span className="font-bold font-mono text-slate-900 text-sm">
                                  {formatTimeOnly(end)}
                                </span>
                                <span className="text-slate-400 mx-1">·</span>
                                <span className="font-semibold text-slate-700">
                                  {formatDateVietnamese(end)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Footer thẻ: Thời lượng + Thao tác */}
                        <div className="flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                          <span className="text-[11px] text-slate-600">
                            Thời lượng: <strong className="text-slate-800 font-semibold">{formatDuration(start, end)}</strong>
                          </span>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(item)}
                              className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title="Chỉnh sửa khung giờ"
                              aria-label="Chỉnh sửa khung giờ"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeletingItem(item)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="Xóa khung giờ"
                              aria-label="Xóa khung giờ"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* DẠNG BẢNG CHI TIẾT (TABLE VIEW) */
        <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="p-4">Thời gian bắt đầu (Từ)</th>
                  <th className="p-4">Thời gian kết thúc (Đến)</th>
                  <th className="p-4">Thời lượng</th>
                  <th className="p-4">Trạng thái</th>
                  <th className="p-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-600">
                {items.map((item) => {
                  const start = new Date(item.startAt);
                  const end = new Date(item.endAt);
                  const status = getItemStatus(item);
                  const isMultiDay = toInputDate(start) !== toInputDate(end);

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="p-4">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {formatTimeOnly(start)}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {formatDateVietnamese(start)}
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="font-mono font-bold text-slate-900 text-sm">
                          {formatTimeOnly(end)}
                        </div>
                        <div className="text-xs text-slate-500 font-medium mt-0.5">
                          {formatDateVietnamese(end)}
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="font-medium text-slate-800">{formatDuration(start, end)}</span>
                        {isMultiDay && (
                          <span className="ml-2 inline-block px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                            Nhiều ngày
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${status.bg}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeletingItem(item)}
                          className="px-2.5 py-1 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg text-xs font-semibold transition-colors"
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL THÊM / SỬA KHUNG GIỜ RẢNH */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={() => !submitting && setIsModalOpen(false)}
          aria-hidden="true"
        >
          <div
            className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby={modalTitleId}
          >
            {/* Header Modal */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                  <CalendarClock className="w-5 h-5" />
                </div>
                <div>
                  <h3 id={modalTitleId} className="font-bold text-slate-900 text-base">
                    {editingItem ? 'Chỉnh sửa khung giờ rảnh' : 'Thêm khung giờ rảnh mới'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Khai báo khung thời gian bạn sẵn sàng thẩm định dự án.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => !submitting && setIsModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
                aria-label="Đóng cửa sổ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form nội dung */}
            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {/* Lỗi Form nếu có */}
              {formError && (
                <div
                  role="alert"
                  className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2"
                >
                  <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Chọn Presets nhanh */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1.5">
                  Gợi ý ca làm việc nhanh:
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {TIME_PRESETS.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => handleApplyPreset(preset)}
                      className="px-2.5 py-1.5 text-left border border-slate-200 rounded-xl text-xs hover:border-blue-300 hover:bg-blue-50/50 transition-colors"
                    >
                      <span className="font-medium text-slate-800 block truncate">
                        {preset.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Ngày và Giờ bắt đầu */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formStartDate}
                    onChange={(e) => {
                      setFormStartDate(e.target.value);
                      if (!formEndDate || formEndDate < e.target.value) {
                        setFormEndDate(e.target.value);
                      }
                    }}
                    className={managementInput}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giờ bắt đầu <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className={managementInput}
                  />
                </div>
              </div>

              {/* Ngày và Giờ kết thúc */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Ngày kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    className={managementInput}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Giờ kết thúc <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="time"
                    required
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className={managementInput}
                  />
                </div>
              </div>

              {/* Ghi chú lưu ý */}
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl text-[11px] text-slate-500 space-y-1">
                <p>
                  <strong className="text-slate-700">Lưu ý:</strong> Khung giờ phải ở tương lai và kéo dài tối đa 31 ngày.
                </p>
                <p>
                  Một buổi họp xác minh phải nằm trọn trong 1 khoảng thời gian rảnh liên tục.
                </p>
              </div>

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                >
                  {submitting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{editingItem ? 'Cập nhật khung giờ' : 'Lưu khung giờ rảnh'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL XÁC NHẬN XÓA */}
      {deletingItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
          onClick={() => !deleting && setDeletingItem(null)}
          aria-hidden="true"
        >
          <div
            className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl p-5"
            onClick={(e) => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={deleteTitleId}
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-red-50 text-red-600 rounded-xl flex-shrink-0">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 id={deleteTitleId} className="font-bold text-slate-900 text-sm">
                  Xác nhận xóa khung giờ rảnh
                </h3>
                <p className="text-xs text-slate-500">
                  Bạn có chắc chắn muốn xóa khung giờ rảnh này không?
                </p>

                {/* Chi tiết khung giờ từ ngày đến ngày */}
                <div className="my-2.5 p-3 bg-slate-50 rounded-xl border border-slate-200/90 text-xs space-y-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded text-[10px]">TỪ:</span>
                    <span className="font-bold text-slate-900 font-mono">{formatTimeOnly(new Date(deletingItem.startAt))}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-700">{formatDateVietnamese(new Date(deletingItem.startAt))}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded text-[10px]">ĐẾN:</span>
                    <span className="font-bold text-slate-900 font-mono">{formatTimeOnly(new Date(deletingItem.endAt))}</span>
                    <span className="text-slate-400">·</span>
                    <span className="font-semibold text-slate-700">{formatDateVietnamese(new Date(deletingItem.endAt))}</span>
                  </div>
                  <div className="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200">
                    Thời lượng: <strong className="text-slate-800">{formatDuration(new Date(deletingItem.startAt), new Date(deletingItem.endAt))}</strong>
                  </div>
                </div>

                <p className="text-[11px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200 mt-2">
                  Lưu ý: Không thể xóa khung giờ nếu đang phục vụ một cuộc họp xác minh đang giữ chỗ hoặc đã phân công.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-5 pt-3 border-t border-slate-100">
              <button
                type="button"
                disabled={deleting}
                onClick={() => setDeletingItem(null)}
                className="px-3.5 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-semibold hover:bg-slate-100 disabled:opacity-50"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleting}
                onClick={handleDeleteConfirm}
                className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
              >
                {deleting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VerificatorAvailabilityPage;
