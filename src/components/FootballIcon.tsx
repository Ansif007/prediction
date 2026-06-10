import React from 'react';

export const FootballIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
  <svg 
    viewBox="0 0 128 128" 
    className={className}
  >
    <defs>
      <linearGradient id="ball-grad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stop-color="#FFFFFF" />
        <stop offset="1" stop-color="#F0F0F0" />
      </linearGradient>
    </defs>
    <circle cx="64" cy="64" r="60" fill="url(#ball-grad)" stroke="#333" strokeWidth="2" />
    <path d="M64,20c10,10,20,20,30,30c10,10,10,20,0,30s-20,10-30,0c-10-10-20-20-30-30c-10-10-10-20,0-30s20-10,30,0z" fill="#000" />
    <path d="M64,20c-10,10-20,20-30,30c-10,10-10,20,0,30s20,10,30,0c10-10,20-20,30-30c10-10,10-20,0-30s-20-10-30,0z" fill="none" stroke="#333" strokeWidth="2" />
    <circle cx="64" cy="64" r="5" fill="#000" />
    <circle cx="94" cy="50" r="4" fill="#000" />
    <circle cx="34" cy="50" r="4" fill="#000" />
    <circle cx="94" cy="78" r="4" fill="#000" />
    <circle cx="34" cy="78" r="4" fill="#000" />
    <circle cx="64" cy="94" r="4" fill="#000" />
    <circle cx="64" cy="34" r="4" fill="#000" />
    <path d="M64,20l30,30l0,30l-30,24l-30-24l0-30z" fill="none" stroke="#333" strokeWidth="2" />
    <path d="M34,50l0,30l30,24l0-30z" fill="none" stroke="#333" strokeWidth="2" />
    <path d="M94,50l0,30l-30,24l0-30z" fill="none" stroke="#333" strokeWidth="2" />
  </svg>
);
