// src/app/components/Modal.tsx
'use client';

import React from 'react';

type ModalProps = {
  open: boolean;
  onClose?: () => void;
  title?: string;
  children: React.ReactNode;
  className?: string;
};

export default function Modal({ open, onClose, title, children, className }: ModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* card */}
      <div
        className={`relative w-full max-w-2xl rounded-2xl border border-white/10 bg-[var(--surface)] p-6 shadow-[0_0_40px_rgba(0,0,0,.65)] ${className || ''}`}
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        {/* close */}
        <button
          aria-label="Close"
          className="absolute right-4 top-4 rounded-full border border-white/15 bg-black/40 px-3 py-1.5 text-sm text-white/80 hover:border-white/40"
          onClick={onClose}
          type="button"
        >
          ✕
        </button>

        {title && (
          <h2 className="mb-5 text-center text-2xl font-semibold text-white [text-shadow:_0_0_16px_var(--neon-soft)]">
            {title}
          </h2>
        )}

        {children}
      </div>
    </div>
  );
}
