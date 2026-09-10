import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import styles from './Popup.module.css';

const Popup = ({ message, onConfirm }) => {
  return (
    <>
      <div className={styles.popupOverlay}></div>
      <div className={styles.popup} style={{ maxWidth: '440px', padding: '28px 24px', borderRadius: '20px' }}>
        <div className={styles.iconContainer}>
          <FaCheckCircle className={styles.successIcon} />
        </div>
        
        {/* Live Demo Mode Badge */}
        <div style={{
          display: 'inline-block',
          padding: '4px 12px',
          background: 'rgba(212, 175, 55, 0.15)',
          border: '1px solid rgba(212, 175, 55, 0.35)',
          borderRadius: '9999px',
          color: '#f2ca50',
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: '10px'
        }}>
          ✨ Chế Độ Live Demo Giả Lập
        </div>

        <h2 className={styles.popupTitle} style={{ fontSize: '20px', marginBottom: '8px' }}>
          Thanh Toán Thành Công!
        </h2>
        
        <p className={styles.popupMessage} style={{ fontSize: '13px', lineHeight: '1.6', color: '#CBD5E1', marginBottom: '20px' }}>
          {message}
        </p>

        <button 
          onClick={onConfirm} 
          className={styles.confirmButton}
          style={{
            padding: '12px 28px',
            fontSize: '13px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            borderRadius: '12px'
          }}
        >
          XEM VÉ NGAY
        </button>
      </div>
    </>
  );
};

export default Popup;