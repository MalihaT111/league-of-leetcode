"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useLogout } from "@/hooks/useLogout";
import styles from "./Navbar.module.css";

export default function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const { currentUserId } = useCurrentUser();
  const { logout } = useLogout();

  const handleProfileClick = (e: React.MouseEvent) => {
    e.preventDefault();
    if (currentUserId) {
      router.push(`/profile/${currentUserId}`);
    } else {
      router.push("/signin");
    }
  };

  const handleLogoutClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    await logout();
  };

  const isHome = pathname.includes("/home");
  const isLeaderboard = pathname.includes("/leaderboard");
  const isFriends = pathname.includes("/friends");
  const isSettings = pathname.includes("/settings");
  const isProfile = pathname.includes("/profile");
  const isMatch = pathname.includes("/match");

  return (
    <div className={styles.navbar}>

      {/* HOME (only show on pages that are NOT /home) */}
      {!isHome && (
        <Link href="/home" className={styles.navItem}>
          HOME
        </Link>
      )}

      {/* MATCH (hide on home and match pages) */}
      {!isHome && !isMatch && (
        <Link href="/match" className={styles.navItem}>
          MATCH
        </Link>
      )}

      {/* These show conditionally based on current page */}
      {!isLeaderboard && (
        <Link href="/leaderboard" className={styles.navItem}>LEADERBOARD</Link>
      )}
      {!isFriends && (
        <Link href="/friends" className={styles.navItem}>FRIENDS</Link>
      )}
      {!isSettings && (
        <Link href="/settings" className={styles.navItem}>SETTINGS</Link>
      )}

      {/* Profile logic - hide when on profile page */}
      {!isProfile && (
        <span className={styles.navItem} onClick={handleProfileClick}>
          PROFILE
        </span>
      )}

      {/* Logout logic */}
      <span className={styles.navItemLogout} onClick={handleLogoutClick}>
        LOGOUT
      </span>
    </div>
  );
}
