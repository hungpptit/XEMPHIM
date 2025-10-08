import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './modules/Home/Home';
import MovieDetail from './modules/MovieDetail/MovieDetail';
import SeatSelection from './modules/SeatSelection/SeatSelection';
import Payment from './modules/Payment/Payment';
import MyTickets from './modules/MyTickets/MyTickets';
import './styles/theme.module.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navbar />
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/movies" element={<Home />} />
            <Route path="/movies/:id" element={<MovieDetail />} />
            <Route path="/movies/:id/showtimes" element={<MovieDetail />} />
            <Route path="/movies/:id/seat-selection" element={<SeatSelection />} />
            <Route path="/payment" element={<Payment />} />
            <Route path="/my-tickets" element={<MyTickets />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;