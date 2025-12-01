"use client";

import { useEffect, useState } from "react";
import styles from "./ParticleBackground.module.css";

const colors = [
  "rgba(154,105,245,0.9)",  // purple
  "rgba(180,130,255,0.9)",  // lavender
  "rgba(120,180,255,0.9)",  // icy blue
  "rgba(255,140,255,0.9)",  // pink-magenta
  "rgba(190,110,255,0.9)",  // neon violet
];

export default function ParticleBackground() {
  const [mounted, setMounted] = useState(false);
  const [particles, setParticles] = useState<Array<{
    color: string;
    left: string;
    top: string;
    delay: string;
    duration: string;
    opacity: number;
    scale: number;
    xMove: string;
    yMove: string;
  }>>([]);

  useEffect(() => {
    const generatedParticles = [...Array(40)].map(() => ({
      color: colors[Math.floor(Math.random() * colors.length)],
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      delay: `${Math.random() * 10}s`,
      duration: `${10 + Math.random() * 10}s`,
      opacity: Math.random() * 0.5 + 0.3,
      scale: Math.random() * 1.4 + 0.6,
      xMove: (Math.random() * 200 - 100) + "px",
      yMove: (Math.random() * -200 - 100) + "px",
    }));
    setParticles(generatedParticles);
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <div className={styles.particles}>
      {particles.map((particle, i) => (
        <div
          key={i}
          className={styles.particle}
          style={{
            background: particle.color,
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            animationDuration: particle.duration,
            opacity: particle.opacity,
            transform: `scale(${particle.scale})`,
            "--x-move": particle.xMove,
            "--y-move": particle.yMove,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
