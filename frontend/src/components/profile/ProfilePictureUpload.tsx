"use client";
import React, { useRef, useState, useEffect } from "react";
import { Avatar, FileButton, Loader, Notification } from "@mantine/core";
import { useUploadProfilePicture } from "@/lib/api/queries/profile";
import styles from "./Profile.module.css";

interface ProfilePictureUploadProps {
  currentPictureUrl?: string;
  username: string;
  userId: number;
  isOwnProfile?: boolean;
}

export default function ProfilePictureUpload({
  currentPictureUrl,
  username,
  userId,
  isOwnProfile = false,
}: ProfilePictureUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const uploadMutation = useUploadProfilePicture(userId);
  const resetRef = useRef<() => void>(null);

  // Clear success message after 3 seconds
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  const handleFileSelect = async (file: File | null) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("Please select a valid image file (JPG, PNG, or WebP)");
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError("File size must be less than 5MB");
      return;
    }

    setError(null);
    setSuccess(null);
    
    try {
      await uploadMutation.mutateAsync(file);
      setSuccess("Profile picture updated successfully!");
      resetRef.current?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload image");
    }
  };

  // Debug logging
  console.log('ProfilePictureUpload - currentPictureUrl:', currentPictureUrl);

  const avatarContent = (
    <Avatar
      size={40}
      radius="xl"
      src={currentPictureUrl || undefined}
      className={`${styles.headerAvatar} ${
        isOwnProfile ? styles.uploadableAvatar : ""
      }`}
    >
      {username.charAt(0).toUpperCase()}
    </Avatar>
  );

  if (!isOwnProfile) {
    return avatarContent;
  }

  return (
    <div className={styles.profilePictureContainer}>
      <FileButton
        resetRef={resetRef}
        onChange={handleFileSelect}
        accept="image/png,image/jpeg,image/jpg,image/webp"
        disabled={uploadMutation.isPending}
      >
        {(props) => (
          <div {...props} className={styles.uploadButton}>
            {uploadMutation.isPending ? (
              <div className={styles.loadingAvatar}>
                <Loader size="sm" color="rgba(189, 155, 255, 0.8)" />
              </div>
            ) : (
              avatarContent
            )}
          </div>
        )}
      </FileButton>

      {error && (
        <Notification
          color="red"
          onClose={() => setError(null)}
          className={styles.errorNotification}
        >
          {error}
        </Notification>
      )}

      {success && (
        <Notification
          color="green"
          onClose={() => setSuccess(null)}
          className={styles.successNotification}
        >
          {success}
        </Notification>
      )}
    </div>
  );
}