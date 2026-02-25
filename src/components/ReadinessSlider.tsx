"use client";

import { useState, useRef, useEffect, useCallback } from "react";

/**
 * Readiness Slider — Inspired by jh3yy's coffee/milk ratio slider.
 * A stylish range input that shows a split-fill visual with
 * animated track fills and a tooltip showing the career readiness score.
 */

interface ReadinessSliderProps {
  label?: string;
  leftLabel?: string;
  rightLabel?: string;
  defaultValue?: number;
  onChange?: (value: number) => void;
}

export default function ReadinessSlider({
  label = "Career Readiness",
  leftLabel = "SKILLS",
  rightLabel = "GAPS",
  defaultValue = 72,
  onChange,
}: ReadinessSliderProps) {
  const [value, setValue] = useState(defaultValue);
  const [isActive, setIsActive] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const handleInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseInt(e.target.value, 10);
      setValue(v);
      onChange?.(v);
    },
    [onChange]
  );

  // Color interpolation based on value
  const accentHue = Math.round(264 + ((value / 100) * 80)); // indigo → emerald
  const fillColor = `hsl(${accentHue % 360}, 70%, 55%)`;
  const gapColor = `hsl(0, 0%, 100%, ${0.08 + (0.15 * ((100 - value) / 100))})`;

  return (
    <div
      className="readiness-slider relative w-full max-w-md mx-auto select-none"
      onMouseEnter={() => setIsActive(true)}
      onMouseLeave={() => setIsActive(false)}
      onFocus={() => setIsActive(true)}
      onBlur={() => setIsActive(false)}
    >
      {/* Tooltip */}
      <div className="flex justify-between items-end mb-3 px-1">
        <span className="text-[10px] uppercase tracking-widest font-black text-white/40">
          {label}
        </span>
        <span
          className="text-2xl font-black tabular-nums transition-all duration-300"
          style={{ color: fillColor }}
        >
          {value}
          <span className="text-sm text-white/40 font-bold ml-0.5">%</span>
        </span>
      </div>

      {/* Track container */}
      <div className="relative h-14 rounded-xl overflow-hidden bg-white/5 border border-white/10 backdrop-blur-sm">
        {/* Hidden input */}
        <input
          type="range"
          min="0"
          max="100"
          value={value}
          onChange={handleInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-grab active:cursor-grabbing z-10"
          aria-label={label}
        />

        {/* Visual track */}
        <div ref={trackRef} className="absolute inset-0 flex">
          {/* Left fill (skills) */}
          <div
            className="h-full transition-all duration-150 ease-out rounded-l-lg"
            style={{
              width: `calc(${value}% - 2px)`,
              background: `linear-gradient(90deg, ${fillColor}66 0%, ${fillColor} 100%)`,
            }}
          />

          {/* Indicator */}
          <div
            className="w-1 h-3/4 self-center rounded-full transition-all duration-150 ease-out"
            style={{
              background: `hsl(0 0% 100% / ${isActive ? 1 : 0.6})`,
              boxShadow: isActive ? `0 0 12px ${fillColor}` : "none",
            }}
          />

          {/* Right fill (gaps) */}
          <div
            className="flex-1 h-full transition-all duration-150 ease-out rounded-r-lg"
            style={{ background: gapColor }}
          />
        </div>

        {/* Labels inside track */}
        <div className="absolute inset-0 flex items-center justify-between px-4 pointer-events-none">
          <span
            className="text-[10px] uppercase tracking-widest font-bold transition-opacity duration-300"
            style={{
              color: `hsl(0 0% 100% / ${value > 15 ? 0.7 : 0.3})`,
            }}
          >
            {leftLabel} {value}%
          </span>
          <span
            className="text-[10px] uppercase tracking-widest font-bold transition-opacity duration-300"
            style={{
              color: `hsl(0 0% 100% / ${value < 85 ? 0.5 : 0.3})`,
            }}
          >
            {100 - value}% {rightLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
