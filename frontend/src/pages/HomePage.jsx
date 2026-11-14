import { useState } from 'react';
import StyleCard from '../components/StyleCard';

export default function HomePage({ onStyle, onHistory }) {
  return (
    <section id="home">
      <h1 className="wl">WELCOME TO RECEIPT PRO</h1>
      <section className="card">
        <h2>Choose a receipt style to preview</h2>
        <div className="opts big">
          <StyleCard
            id="o1"
            label="BUSINESS RECEIPT"
            imageSrc="/images/sample-business-receipt/sample-business-receipt.jpg"
            onClick={() => onStyle(1)}
          />
          <StyleCard
            id="o2"
            label="INVOICE RECEIPT"
            imageSrc="/images/sample-invoice-receipt/sample-invoice-receipt.jpg"
            onClick={() => onStyle(2)}
          />
        </div>
      </section>
      <section className="card">
        <button type="button" className="btn hbtn" id="hbtn" style={{ width: '100%', textAlign: 'center' }} onClick={onHistory}>
          VIEW HISTORY
        </button>
      </section>
    </section>
  );
}