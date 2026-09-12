import React, { useEffect } from 'react';
// import { Agentation } from 'agentation'; // nhớ comment czí này lại
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import PublicRoute from './components/PublicRoute';
import Home from './modules/Home/Home';
import MovieDetail from './modules/MovieDetail/MovieDetail';
import SeatSelection from './modules/SeatSelection/SeatSelection';
import Payment from './modules/Payment/Payment';
import MyTickets from './modules/MyTickets/MyTickets';
import Login from './modules/Auth/Login';
import Register from './modules/Auth/Register';
import Profile from './modules/Auth/Profile';
import AdminPanel from './modules/Admin';
import './styles/theme.module.css';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    const mainEl = document.getElementById('main-content');
    if (mainEl) {
      mainEl.scrollTo(0, 0);
    }
  }, [pathname]);

  return null;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <div className="App flex flex-col h-screen overflow-hidden bg-[#121316]">
        <Navbar />
        <main id="main-content" className="flex-1 w-full overflow-y-auto relative">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Home />} />
            <Route path="/movies/:id" element={<MovieDetail />} />
            <Route path="/movies/:id/showtimes" element={<MovieDetail />} />
            <Route path="/movies/:id/seat-selection" element={<SeatSelection />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/my-tickets" element={<MyTickets />} />
            <Route
              path="/login"
              element={
                <PublicRoute>
                  <Login />
                </PublicRoute>
              }
            />
            <Route
              path="/register"
              element={
                <PublicRoute>
                  <Register />
                </PublicRoute>
              }
            />
            <Route path="/profile" element={<Profile />} />
            <Route 
              path="/admin/*" 
              element={
                <ProtectedRoute requiredRole="admin">
                  <AdminPanel />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </main>
        {/* <Agentation />   */}
        {/* nhớ comment cái  Agengtation này lại , vì không sử dụng  */}
      </div>
    </Router>
  );
}

export default App;