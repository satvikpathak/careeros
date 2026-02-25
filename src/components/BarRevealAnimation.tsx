"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

/**
 * GSAP Bar Reveal Animation
 * Horizontal bars slide across on scroll, revealing text underneath.
 * Adapted from jh3yy's scroll-triggered box animation.
 */

interface BarRevealProps {
  leftText?: string;
  rightText?: string;
  barCount?: number;
}

export default function BarRevealAnimation({
  leftText = "Build\nYour",
  rightText = "Career\nNow",
  barCount = 100,
}: BarRevealProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement[]>([]);

  useEffect(() => {
    if (!sectionRef.current || barsRef.current.length === 0) return;

    const ctx = gsap.context(() => {
      gsap
        .timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            scrub: 0.5,
            pin: true,
            start: "top top",
            end: "+=150%",
          },
        })
        .to(barsRef.current, {
          force3D: true,
          duration: 1,
          xPercent: 100,
          ease: "power1.inOut",
          stagger: { amount: 1 },
        })
        .to(barsRef.current, { ease: "power1.out", duration: 1, rotation: "45deg" }, 0)
        .to(barsRef.current, { ease: "power1.in", duration: 1, rotation: "0deg" }, 1);
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={sectionRef} className="bar-reveal-section">
      <span
        className="bar-text bar-text-left"
        style={{ whiteSpace: "pre-line" }}
      >
        {leftText}
      </span>
      <span
        className="bar-text bar-text-right"
        style={{ whiteSpace: "pre-line" }}
      >
        {rightText}
      </span>
      {Array.from({ length: barCount }).map((_, i) => (
        <div
          key={i}
          ref={(el) => {
            if (el) barsRef.current[i] = el;
          }}
          className="bar"
        />
      ))}
    </section>
  );
}
