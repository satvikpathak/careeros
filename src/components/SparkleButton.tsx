"use client";

import React from "react";

/**
 * SparkleButton — Animated button with sparkle SVG and letter-by-letter shimmer.
 * Adapted from Uiverse.io by dexter-st.
 * 
 * Props:
 *   text       — Default display text (e.g. "Generate")
 *   activeText — Text shown on focus/active (e.g. "Generating")
 *   onClick    — Click handler
 *   href       — Optional link (renders <a> instead of <button>)
 *   disabled   — Disable state
 *   loading    — Show activeText immediately
 *   className  — Extra classes on wrapper
 */

interface SparkleButtonProps {
  text: string;
  activeText?: string;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  type?: "button" | "submit";
}

const SparkleIcon = () => (
  <svg className="sparkle-btn-svg" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"
    />
  </svg>
);

const LetterSpan = ({ children, index }: { children: string; index: number }) => (
  <span
    className="sparkle-btn-letter"
    style={{ animationDelay: `${index * 0.08}s` }}
  >
    {children}
  </span>
);

export default function SparkleButton({
  text,
  activeText,
  onClick,
  href,
  disabled = false,
  loading = false,
  className = "",
  type = "button",
}: SparkleButtonProps) {
  const primary = text.split("");
  const secondary = (activeText || text).split("");

  const inner = (
    <>
      <SparkleIcon />
      <div className="sparkle-txt-wrapper">
        <div className={`sparkle-txt-1 ${loading ? "sparkle-txt-hidden" : ""}`}>
          {primary.map((char, i) => (
            <LetterSpan key={`p-${i}`} index={i}>
              {char}
            </LetterSpan>
          ))}
        </div>
        <div className={`sparkle-txt-2 ${loading ? "sparkle-txt-visible" : ""}`}>
          {secondary.map((char, i) => (
            <LetterSpan key={`s-${i}`} index={i}>
              {char}
            </LetterSpan>
          ))}
        </div>
      </div>
    </>
  );

  if (href && !disabled) {
    return (
      <div className={`sparkle-btn-wrapper ${className}`}>
        <a href={href} className="sparkle-btn">
          {inner}
        </a>
      </div>
    );
  }

  return (
    <div className={`sparkle-btn-wrapper ${className}`}>
      <button
        type={type}
        className="sparkle-btn"
        onClick={onClick}
        disabled={disabled}
      >
        {inner}
      </button>
    </div>
  );
}
