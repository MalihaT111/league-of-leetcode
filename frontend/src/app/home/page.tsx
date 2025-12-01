"use client";

import { useEffect, useState } from "react";
import { Container } from "@mantine/core";
import LoadingScreen from "@/components/LoadingScreen";
import TranscendenceSword from "@/components/home/TranscendenceSword";

import styles from "./page.module.css";
import CircleBackground from "./comp";
import Navbar from "@/components/navbar";

const colors = [
  "rgba(154,105,245,0.9)",  // purple
  "rgba(180,130,255,0.9)",  // lavender
  "rgba(120,180,255,0.9)",  // icy blue
  "rgba(255,140,255,0.9)",  // pink-magenta
  "rgba(190,110,255,0.9)",  // neon violet
];

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);
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
    // Generate particles only on client side
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

  const handleSwordLoaded = () => {
    setIsLoading(false);
  };

  return (
    <div className={styles.wrapper}>
      {/* LOADING OVERLAY */}
      {isLoading && <LoadingScreen message="SYSTEM INITIALIZING..." />}

      {/* NAVBAR */}
      <Navbar />

      {/* PARTICLES */}
      {mounted && (
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
      )}

      {/* MAIN CONTENT */}
<Container size="lg" px={0} className={styles.techFrame}>

  {/* TOP STATUS BAR */}
  <div className={styles.statusRow}>
    <span className={styles.topLeftMark}>SYSTEM ONLINE</span>
    <span className={styles.version}>v1.00</span>
  </div>

  {/* CENTER CONTENT */}
  <div className={styles.centerColumn}>
    <h1 className={styles.title}>
      LEAGUE <br /> OF <br /> LEETCODE
    </h1>

    <div className={styles.centerShape}>
      <CircleBackground />
      <TranscendenceSword onLoaded={handleSwordLoaded} />
    </div>
  </div>

  {/* BOTTOM STATUS BAR */}
  <div className={styles.statusRow}>
    <span>NETWORK: STABLE</span>
    <span>PRESS SWORD TO START</span>
  </div>

</Container>

    </div>
  );
}
