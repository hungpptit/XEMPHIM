import React from 'react';
import { FaCheckCircle } from 'react-icons/fa';
import styles from './Popup.module.css';

const Popup = ({ message, onConfirm }) => {
  return (
    <>
      <div className={styles.popupOverlay}></div>
      <div className={styles.popup}>
        <div className={styles.iconContainer}>
          <FaCheckCircle className={styles.successIcon} />
        </div>
        <h2 className={styles.popupTitle}>Thanh toán thành công!</h2>
        <p className={styles.popupMessage}>{message}</p>
        <button onClick={onConfirm} className={styles.confirmButton}>OK</button>
      </div>
    </>
  );
};

export default Popup;