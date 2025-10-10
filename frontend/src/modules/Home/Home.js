import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaPlay, FaTicketAlt, FaShieldAlt, FaMobile } from 'react-icons/fa';
import MovieCard from '../../components/MovieCard';
import axios from 'axios';
import { listMovies } from '../../services/movieService';
import styles from './Home.module.css';

const Home = () => {
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const data = await listMovies();
        if (!mounted) return;
        setMovies(data);
      } catch (err) {
        console.error('Failed to load movies', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
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