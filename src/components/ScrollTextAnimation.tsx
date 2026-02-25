"use client";

/**
 * Sticky Scroll Text Animation — Monochrome
 * Words scroll through with a white highlight on dark background.
 */

const WORDS = [
  "plan.",
  "analyze.",
  "execute.",
  "grow.",
  "build.",
  "land.",
  "succeed.",
];

export default function ScrollTextAnimation() {
  return (
    <section
      className="scroll-text-section relative bg-[#0a0a0a]"
      style={{ "--scroll-count": WORDS.length } as React.CSSProperties}
    >
      <header
        className="scroll-text-header fluid"
        style={
          {
            "--font-level": 4,
            "--font-size-min": 28,
            "--count": WORDS.length,
          } as React.CSSProperties
        }
      >
        <div className="scroll-text-inner">
          <h2>
            <span>CareerOS helps you&nbsp;</span>
          </h2>
          <ul aria-hidden="true">
            {WORDS.map((word, i) => (
              <li key={word} style={{ "--i": i } as React.CSSProperties}>
                {word}
              </li>
            ))}
          </ul>
        </div>
      </header>

      <div className="scroll-text-reveal">
        <div className="scroll-reveal-content text-center px-6">
          <p className="text-3xl sm:text-4xl lg:text-5xl font-extrabold leading-tight mb-6 text-white">
            and we&apos;ll show you how.
          </p>
          <p className="text-lg sm:text-xl text-white/40 font-medium font-mono">
            Powered by Gemini AI
          </p>
        </div>
      </div>
    </section>
  );
}
