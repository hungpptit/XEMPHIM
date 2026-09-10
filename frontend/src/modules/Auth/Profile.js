import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import authService from '../../services/authService';

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [ticketCount, setTicketCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const u = await authService.getCurrentUser();
        if (mounted) setUser(u);

        // Fetch real ticket count from booking-service
        if (u) {
          const userId = u.id || u.user_id;
          try {
            const { bookingAPI } = await import('../../services/api');
            const res = await bookingAPI.getMyBookings(userId);
            const list = res.data || res || [];
            if (mounted && Array.isArray(list)) {
              setTicketCount(list.length);
            }
          } catch (err) {
            console.warn('Could not fetch ticket count:', err);
          }
        }
      } catch (err) {
        console.error('Failed to get user profile:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const logout = async () => {
    await authService.logout();
    navigate('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center gap-4 text-white">
        <div className="w-12 h-12 border-4 border-[#D4AF37]/30 border-t-[#D4AF37] rounded-full animate-spin"></div>
        <p className="font-['Playfair_Display'] tracking-widest text-[#f2ca50] uppercase text-sm">
          Đang tải thông tin hồ sơ...
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#121316] flex flex-col items-center justify-center text-white px-4">
        <div className="p-8 max-w-md w-full bg-[#12161F] border border-[rgba(212,175,55,0.25)] rounded-2xl text-center flex flex-col items-center gap-4 shadow-2xl">
          <span className="material-symbols-outlined text-5xl text-[#D4AF37]">lock</span>
          <h2 className="font-['Playfair_Display'] text-2xl font-bold text-white">Bạn chưa đăng nhập</h2>
          <p className="text-sm text-[#9CA3AF]">Vui lòng đăng nhập để xem thông tin hồ sơ của bạn.</p>
          <button 
            onClick={() => navigate('/login')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E6AB] to-[#B8860B] text-[#08090C] font-bold text-sm uppercase tracking-wider shadow-lg hover:brightness-110 transition-all cursor-pointer"
          >
            Đăng Nhập Ngay
          </button>
        </div>
      </div>
    );
  }

  const fullName = user.full_name || user.fullName || 'Người Dùng';
  const initial = fullName.charAt(0).toUpperCase();

  return (
    <div className="w-full bg-[#121316] min-h-screen text-[#e3e2e6] pt-28 pb-24">
      <div className="max-w-[1100px] mx-auto px-4 md:px-8 flex flex-col gap-6">
        
        {/* Navigation Breadcrumbs & Back Button */}
        <div className="flex items-center justify-between pb-4 border-b border-[rgba(212,175,55,0.15)]">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#1b1b1f] hover:bg-[#252830] border border-[rgba(212,175,55,0.25)] hover:border-[#D4AF37] text-xs uppercase font-bold tracking-wider text-[#9CA3AF] hover:text-[#f2ca50] transition-all cursor-pointer shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">arrow_back</span>
            <span>Quay Lại</span>
          </button>

          <span className="text-xs text-[#9CA3AF]">
            Tài khoản: <strong className="text-white">{user.email}</strong>
          </span>
        </div>

        {/* Page Title */}
        <div className="flex flex-col gap-1 mb-2">
          <h1 className="font-['Playfair_Display'] text-3xl sm:text-4xl text-white font-bold tracking-wide">
            HỒ SƠ CÁ NHÂN
          </h1>
          <p className="text-xs sm:text-sm text-[#9CA3AF]">
            Quản lý thông tin tài khoản và danh sách vé đã đặt tại XEMPHIM.
          </p>
        </div>

        {/* Main Grid: Left User Card (4 cols) & Right Stats + Form (8 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT COLUMN: User Card (4 cols) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            <div className="bg-[#12161F] rounded-2xl p-6 sm:p-7 border border-[rgba(212,175,55,0.25)] shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
              
              {/* Background ambient glow */}
              <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#f2ca50]/10 rounded-full blur-3xl pointer-events-none"></div>

              {/* Avatar */}
              <div className="relative my-3">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#D4AF37] via-[#F5E6AB] to-[#B8860B] flex items-center justify-center text-[#08090C] text-4xl font-extrabold shadow-[0_0_25px_rgba(212,175,55,0.5)] border-2 border-[#12161F]">
                  {initial}
                </div>
              </div>

              {/* Name & Email */}
              <h2 className="font-['Playfair_Display'] text-xl font-bold text-white mt-2">
                {fullName}
              </h2>
              <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF] mt-1">
                <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
                <span>{user.email}</span>
              </div>

              {/* Role Badge */}
              <div className="mt-4 px-3.5 py-1.5 rounded-full bg-[#1b1b1f] border border-[rgba(212,175,55,0.3)] text-[#f2ca50] text-xs font-bold tracking-wider">
                {user.role === 'admin' ? '🛡️ Quản Trị Viên' : '👤 Khách Hàng'}
              </div>

              {/* Divider */}
              <div className="w-full border-t border-gray-800 my-6"></div>

              {/* Quick Summary */}
              <div className="w-full flex flex-col gap-3 text-xs text-left">
                <div className="flex items-center justify-between">
                  <span className="text-[#9CA3AF]">Số vé đã mua:</span>
                  <span className="font-bold text-[#f2ca50] text-sm">{ticketCount} vé</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9CA3AF]">Trạng thái:</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Đang hoạt động
                  </span>
                </div>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                className="mt-6 w-full py-2.5 px-4 rounded-xl border border-rose-500/30 hover:border-rose-500 bg-rose-950/20 hover:bg-rose-950/50 text-rose-400 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">logout</span>
                <span>Đăng Xuất Tài Khoản</span>
              </button>
            </div>
          </div>

          {/* RIGHT COLUMN: Real Data & Details (8 cols) */}
          <div className="lg:col-span-8 flex flex-col gap-6">
            
            {/* Quick Navigation Cards based on real data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Card 1: Vé đã đặt */}
              <Link
                to="/my-tickets"
                className="p-5 rounded-2xl bg-[#12161F] border border-[rgba(212,175,55,0.2)] hover:border-[#D4AF37] shadow-xl flex flex-col justify-between gap-3 transition-all hover:bg-[#161a25] group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">Vé Của Tôi</span>
                  <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#f2ca50]">
                    <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-['Playfair_Display'] text-3xl font-bold text-white group-hover:text-[#f2ca50] transition-colors">
                    {ticketCount}
                  </span>
                  <span className="text-xs text-[#9CA3AF]">vé đã mua</span>
                </div>
                <span className="text-xs text-[#d5c78e] flex items-center gap-1 font-medium">
                  <span>Xem lịch sử và mã QR vào rạp</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </Link>

              {/* Card 2: Khám phá phim */}
              <Link
                to="/#now-section"
                className="p-5 rounded-2xl bg-[#12161F] border border-[rgba(212,175,55,0.2)] hover:border-[#D4AF37] shadow-xl flex flex-col justify-between gap-3 transition-all hover:bg-[#161a25] group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs text-[#9CA3AF] uppercase tracking-wider font-semibold">Lịch Chiếu Phim</span>
                  <div className="w-9 h-9 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#f2ca50]">
                    <span className="material-symbols-outlined text-[20px]">movie</span>
                  </div>
                </div>
                <div>
                  <span className="font-['Playfair_Display'] text-xl font-bold text-white group-hover:text-[#f2ca50] transition-colors">
                    Phim Đang Chiếu
                  </span>
                  <p className="text-xs text-[#9CA3AF] mt-0.5">Đặt vé xem phim trực tuyến nhanh chóng</p>
                </div>
                <span className="text-xs text-[#d5c78e] flex items-center gap-1 font-medium">
                  <span>Chọn phim & đặt vé ngay</span>
                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                </span>
              </Link>
            </div>

            {/* Detailed Information Card */}
            <div className="bg-[#12161F] rounded-2xl p-6 sm:p-8 border border-[rgba(212,175,55,0.25)] shadow-2xl flex flex-col gap-6">
              
              <div className="flex items-center justify-between pb-4 border-b border-gray-800">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-6 bg-[#D4AF37] rounded-full"></span>
                  <h3 className="font-['Playfair_Display'] text-xl font-bold text-white uppercase tracking-wide">
                    Thông Tin Tài Khoản
                  </h3>
                </div>
                <span className="text-xs text-[#9CA3AF]">Dữ liệu cá nhân</span>
              </div>

              {/* Form Fields: Only Real Fields from DB */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                
                {/* Field 1: Họ và tên */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#D4AF37]">person</span>
                    Họ Và Tên
                  </label>
                  <div className="px-4 py-3 bg-[#0d0e11] border border-[rgba(212,175,55,0.2)] rounded-xl text-sm font-medium text-white shadow-inner">
                    {fullName}
                  </div>
                </div>

                {/* Field 2: Email */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#D4AF37]">mail</span>
                    Địa Chỉ Email
                  </label>
                  <div className="px-4 py-3 bg-[#0d0e11] border border-[rgba(212,175,55,0.2)] rounded-xl text-sm font-medium text-white shadow-inner flex items-center justify-between">
                    <span className="truncate">{user.email}</span>
                    <span className="text-[10px] font-bold uppercase text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30 shrink-0 ml-2">
                      Đã xác thực
                    </span>
                  </div>
                </div>

                {/* Field 3: Số điện thoại */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#D4AF37]">phone</span>
                    Số Điện Thoại
                  </label>
                  <div className="px-4 py-3 bg-[#0d0e11] border border-[rgba(212,175,55,0.2)] rounded-xl text-sm font-medium text-white shadow-inner">
                    {user.phone_number || user.phoneNumber || user.phone || 'Chưa cập nhật số điện thoại'}
                  </div>
                </div>

                {/* Field 4: Vai trò tài khoản */}
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-semibold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-[#D4AF37]">shield</span>
                    Phân Quyền
                  </label>
                  <div className="px-4 py-3 bg-[#0d0e11] border border-[rgba(212,175,55,0.2)] rounded-xl text-sm font-medium text-[#f2ca50] shadow-inner font-semibold">
                    {user.role === 'admin' ? 'Quản Trị Viên (Administrator)' : 'Khách Hàng (Customer)'}
                  </div>
                </div>
              </div>

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center gap-4 pt-4 border-t border-gray-800/80 mt-2">
                <Link
                  to="/my-tickets"
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-[#D4AF37] via-[#F5E6AB] to-[#B8860B] text-[#08090C] font-bold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(212,175,55,0.35)] hover:brightness-110 transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px]">confirmation_number</span>
                  <span>Xem Danh Sách Vé Đã Đặt</span>
                </Link>

                <Link
                  to="/#now-section"
                  className="px-6 py-3 rounded-xl bg-[#1b1b1f] hover:bg-[#252830] text-white border border-[rgba(212,175,55,0.3)] hover:border-[#D4AF37] font-semibold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-[18px] text-[#f2ca50]">movie</span>
                  <span>Khám Phá Phim Chiếu Rạp</span>
                </Link>

                {user.role === 'admin' && (
                  <Link
                    to="/admin"
                    className="px-6 py-3 rounded-xl bg-[#292a2d] hover:bg-[#343538] text-[#f2ca50] border border-[rgba(212,175,55,0.4)] font-semibold text-xs uppercase tracking-wider transition-all flex items-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">admin_panel_settings</span>
                    <span>Vào Trang Quản Trị</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={async () => {
                    await authService.logout();
                    navigate('/');
                  }}
                  className="px-6 py-3 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/30 font-semibold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[18px]">logout</span>
                  <span>Đăng Xuất</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
