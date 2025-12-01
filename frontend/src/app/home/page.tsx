"use client";

import { useState } from "react";
import { Container } from "@mantine/core";
import LoadingScreen from "@/components/all/LoadingScreen";
import TranscendenceSword from "@/components/home/TranscendenceSword";

import styles from "./page.module.css";
import CircleBackground from "./comp";
import Navbar from "@/components/all/Navbar";

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(true);

  const handleSwordLoaded = () => {
    setIsLoading(false);
  };

  return (
    <div className={styles.wrapper}>
      {/* LOADING OVERLAY */}
      {isLoading && <LoadingScreen message="SYSTEM INITIALIZING..." />}

      {/* NAVBAR */}
      <Navbar />

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
