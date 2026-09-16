import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import styles from './Popup.module.css';

const Popup = ({ message, onConfirm }) => {
  return (
    <>
      <div className={styles.popupOverlay}></div>
      <div className={styles.popup} style={{ maxWidth: '420px', padding: '28px 24px', borderRadius: '20px' }}>
        <div className={styles.iconContainer}>
          <FaCheckCircle className={styles.successIcon} />
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
          XÁC NHẬN
        </button>
      </div>
    </>
  );
};

export default Popup;