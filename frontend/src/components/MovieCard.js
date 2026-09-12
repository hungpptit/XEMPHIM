import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaPlay, FaStar, FaClock, FaCalendar } from 'react-icons/fa';
import styles from './MovieCard.module.css';

const MovieCard = ({ movie }) => {
  const navigate = useNavigate();

  const handleBookTicket = (e) => {
    e.stopPropagation();
    navigate(`/movies/${movie.id}/showtimes`);
  };

  const handleViewDetail = (e) => {
    e.stopPropagation();
    navigate(`/movies/${movie.id}`);
  };

  const handleCardClick = () => {
    navigate(`/movies/${movie.id}`);
  };

  const handleTrailerPlay = (e) => {
    e.stopPropagation();
    // Navigate to movie detail and request scrolling to trailer
    navigate(`/movies/${movie.id}`, { state: { scrollToTrailer: true } });
  };

  return (
    <div 
      className={`group relative flex flex-col bg-[#12161F] rounded-xl overflow-hidden border border-[rgba(212,175,55,0.2)] hover:border-[#D4AF37] transition-all duration-500 shadow-xl hover:shadow-[0_15px_35px_rgba(212,175,55,0.25)] cursor-pointer ${
        !movie.isAvailable ? 'opacity-85' : ''
      }`}
      onClick={handleCardClick}
    >
      {/* Poster Container */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#0d0e11]">
        <img 
          src={movie.poster || '/api/placeholder/300/400'} 
          alt={movie.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
        
        {/* Dark Scrim Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#12161F] via-transparent to-black/40"></div>

        {/* Top Badges */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 bg-[#08090C]/85 backdrop-blur-md px-2.5 py-1 rounded-full border border-[rgba(212,175,55,0.3)] shadow-md">
          <span className="text-xs text-[#F3C644]">👑</span>
          <span className="font-mono text-[10px] font-bold text-[#F3C644] tracking-wider uppercase">
            {movie.isAvailable ? 'VIP PREMIÈRE' : 'SẮP CHIẾU'}
          </span>
        </div>

        {/* Rating Badge */}
        <div className="absolute top-3 right-3 flex items-center gap-1 bg-[#08090C]/85 backdrop-blur-md px-2 py-0.5 rounded-full border border-[rgba(212,175,55,0.3)]">
          <span className="material-symbols-outlined text-[#f2ca50] text-[14px]">star</span>
          <span className="text-xs font-bold text-[#f2ca50]">{movie.rating || '8.9'}</span>
        </div>

        {/* Play Trailer Icon Overlay on Hover */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
            className="w-12 h-12 rounded-full bg-[#D4AF37] text-[#08090C] flex items-center justify-center shadow-[0_0_20px_rgba(212,175,55,0.7)] hover:scale-110 transition-transform"
            onClick={handleTrailerPlay}
            title="Xem Trailer"
          >
            <span className="material-symbols-outlined text-[24px]">play_arrow</span>
          </button>
        </div>

        {/* Genre Pill at bottom of image */}
        <div className="absolute bottom-2 left-3">
          <span className="text-[11px] font-semibold text-[#d5c78e] uppercase tracking-wider bg-[#1b1b1f]/80 px-2 py-0.5 rounded backdrop-blur-sm">
            {movie.genre || 'Hành Động'}
          </span>
        </div>
      </div>

      {/* Content Section */}
      <div className="p-4 flex flex-col flex-grow justify-between gap-3">
        <div>
          <h3 className="font-['Playfair_Display'] text-lg font-bold text-white group-hover:text-[#f2ca50] transition-colors line-clamp-1">
            {movie.title}
          </h3>
          
          <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mt-1">
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#D4AF37]">schedule</span>
              {movie.duration || '120'} phút
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px] text-[#D4AF37]">calendar_today</span>
              {movie.releaseYear || '2026'}
            </span>
          </div>

          <p className="text-xs text-[#9CA3AF] line-clamp-2 mt-2 leading-relaxed">
            {movie.description || 'Trải nghiệm siêu phẩm điện ảnh với chất lượng hình ảnh IMAX và âm thanh vòm đỉnh cao.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[rgba(212,175,55,0.15)] flex items-center gap-2">
          {movie.isAvailable ? (
            <>
              <button 
                className="flex-1 py-2 px-3 rounded-lg bg-gradient-to-r from-[#D4AF37] via-[#F5E6AB] to-[#B8860B] text-[#08090C] text-xs font-bold uppercase tracking-wider hover:brightness-110 shadow-[0_2px_10px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-1.5"
                onClick={handleBookTicket}
              >
                <span className="material-symbols-outlined text-[14px]">confirmation_number</span>
                Đặt Vé
              </button>
              <button 
                className="py-2 px-3 rounded-lg bg-[#1b1b1f] hover:bg-[#252830] text-[#e3e2e6] hover:text-[#f2ca50] border border-[rgba(212,175,55,0.2)] text-xs font-semibold transition-colors"
                onClick={handleViewDetail}
              >
                Chi Tiết
              </button>
            </>
          ) : (
            <button 
              className="w-full py-2 px-3 rounded-lg bg-[#1b1b1f] hover:bg-[#252830] text-[#e3e2e6] hover:text-[#f2ca50] border border-[rgba(212,175,55,0.2)] text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
              onClick={handleViewDetail}
            >
              <span className="material-symbols-outlined text-[14px]">info</span>
              Xem Chi Tiết
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MovieCard;