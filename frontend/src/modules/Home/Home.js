import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlay, FaTicketAlt, FaShieldAlt, FaMobile } from 'react-icons/fa';
import MovieCard from '../../components/MovieCard';
import styles from './Home.module.css';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  // Mock data for movies
  const mockMovies = [
    {
      id: 1,
      title: "Spider-Man: No Way Home",
      description: "Peter Parker phải đối mặt với những thách thức lớn nhất khi danh tính Spider-Man bị tiết lộ.",
      poster: "https://images.unsplash.com/photo-1635805737707-575885ab0820?ixlib=rb-4.0.3&w=400",
      rating: 8.9,
      duration: 148,
      releaseYear: 2024,
      genre: "Hành động",
      isAvailable: true
    },
    {
      id: 2,
      title: "Avatar: The Way of Water",
      description: "Jake Sully và gia đình phải đối mặt với những thách thức mới trên hành tinh Pandora.",
      poster: "https://images.unsplash.com/photo-1440404653325-ab127d49abc1?ixlib=rb-4.0.3&w=400",
      rating: 9.2,
      duration: 192,
      releaseYear: 2024,
      genre: "Sci-Fi",
      isAvailable: true
    },
    {
      id: 3,
      title: "Top Gun: Maverick",
      description: "Pete 'Maverick' Mitchell trở lại với vai trò phi công huấn luyện cho thế hệ mới.",
      poster: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?ixlib=rb-4.0.3&w=400",
      rating: 8.7,
      duration: 130,
      releaseYear: 2024,
      genre: "Hành động",
      isAvailable: true
    },
    {
      id: 4,
      title: "Black Panther: Wakanda Forever",
      description: "Wakanda phải bảo vệ quốc gia của mình trước những thế lực thù địch mới.",
      poster: "https://images.unsplash.com/photo-1578662996442-48f60103fc96?ixlib=rb-4.0.3&w=400",
      rating: 8.5,
      duration: 161,
      releaseYear: 2024,
      genre: "Hành động",
      isAvailable: false
    },
    {
      id: 5,
      title: "Doctor Strange 2",
      description: "Stephen Strange khám phá những thực tại khác nhau trong đa vũ trụ.",
      poster: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?ixlib=rb-4.0.3&w=400",
      rating: 8.3,
      duration: 126,
      releaseYear: 2024,
      genre: "Fantasy",
      isAvailable: true
    },
    {
      id: 6,
      title: "The Batman",
      description: "Bruce Wayne trong những năm đầu làm Batman đối mặt với tội phạm tại Gotham.",
      poster: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?ixlib=rb-4.0.3&w=400",
      rating: 8.8,
      duration: 176,
      releaseYear: 2024,
      genre: "Hành động",
      isAvailable: false
    }
  ];

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setMovies(mockMovies);
      setLoading(false);
    }, 1000);
  }, []);

  const nowShowingMovies = movies.filter(movie => movie.isAvailable);
  const comingSoonMovies = movies.filter(movie => !movie.isAvailable);

  if (loading) {
    return (
      <div className={styles.home}>
        <div className="container">
          <div style={{ 
            display: 'flex', 
            justifyContent: 'center', 
            alignItems: 'center', 
            height: '50vh',
            flexDirection: 'column',
            gap: '20px'
          }}>
            <div className="loading"></div>
            <p>Đang tải phim...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.home}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>CinemaX</h1>
          <p className={styles.heroSubtitle}>
            Trải nghiệm điện ảnh đỉnh cao với công nghệ hiện đại nhất. 
            Đặt vé nhanh chóng, chọn ghế thoải mái, thanh toán an toàn.
          </p>
          <div className={styles.heroButtons}>
            <Link to="/movies" className={`${styles.heroBtn} ${styles.heroBtnPrimary}`}>
              <FaPlay />
              Xem phim ngay
            </Link>
            <Link to="/my-tickets" className={`${styles.heroBtn} ${styles.heroBtnSecondary}`}>
              <FaTicketAlt />
              Vé của tôi
            </Link>
          </div>
        </div>
      </section>

      <div className="container">
        {/* Now Showing Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Phim Đang Chiếu</h2>
          <div className={styles.moviesGrid}>
            {nowShowingMovies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
          <Link to="/movies" className={styles.viewAllBtn}>
            Xem tất cả phim
          </Link>
        </section>

        {/* Coming Soon Section */}
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Phim Sắp Chiếu</h2>
          <div className={styles.moviesGrid}>
            {comingSoonMovies.map(movie => (
              <MovieCard key={movie.id} movie={movie} />
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className={styles.features}>
          <div className="container">
            <h2 className={styles.sectionTitle}>Tại Sao Chọn CinemaX?</h2>
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <FaTicketAlt className={styles.featureIcon} />
                <h3 className={styles.featureTitle}>Đặt Vé Dễ Dàng</h3>
                <p className={styles.featureDesc}>
                  Giao diện thân thiện, đặt vé chỉ trong vài cú click. 
                  Chọn suất chiếu và ghế ngồi theo sở thích.
                </p>
              </div>
              
              <div className={styles.featureCard}>
                <FaShieldAlt className={styles.featureIcon} />
                <h3 className={styles.featureTitle}>Thanh Toán An Toàn</h3>
                <p className={styles.featureDesc}>
                  Hỗ trợ nhiều phương thức thanh toán: Momo, VNPay, 
                  Visa với bảo mật cao nhất.
                </p>
              </div>
              
              <div className={styles.featureCard}>
                <FaMobile className={styles.featureIcon} />
                <h3 className={styles.featureTitle}>Trải Nghiệm Mobile</h3>
                <p className={styles.featureDesc}>
                  Giao diện responsive hoàn hảo trên mọi thiết bị. 
                  Đặt vé mọi lúc mọi nơi.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Home;