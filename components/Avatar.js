import { useEffect, useState } from "react";
import Image from "next/image";
import useResource from "../hooks/useResource";
import { useAuth } from "../contexts/auth";

export default function Avatar({ url, size, profilePage, testMode }) {
  const [uploading, setUploading] = useState(false);
  const { downloadImage, avatarUrl, uploadAvatarFile } = useResource();
  const { setAvatarUrl, updateProfile } = useAuth();
  const parsedSize =
    typeof size === "number" ? size : Number.parseInt(String(size), 10);
  const avatarSize = Number.isFinite(parsedSize) && parsedSize > 0 ? parsedSize : 150;

  useEffect(() => {
    if (url) {
      downloadImage(url);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  const onUpload = (publicUrl) => {
    setAvatarUrl(publicUrl);
    updateProfile({
      avatar_url: publicUrl,
      absolute_avatar_url: publicUrl,
    });
  };

  async function uploadAvatar(event) {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an image to upload.");
      }

      const file = event.target.files[0];
      const uploaded = await uploadAvatarFile(file);
      onUpload(uploaded.publicUrl);
    } catch (error) {
      alert(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      {avatarUrl ? (
        <Image
          width={avatarSize}
          height={avatarSize}
          src={avatarUrl}
          alt="Avatar"
          className="avatar image"
          style={{ height: avatarSize, width: avatarSize, padding: 0 }}
        />
      ) : (
        <div
          className="avatar no-image"
          style={{ height: avatarSize, width: avatarSize }}
        />
      )}
      {profilePage && (
        <div style={{ width: avatarSize }}>
          <label className="button primary block" htmlFor="single">
            {uploading ? "Uploading ..." : "Upload"}
          </label>
          <input
            style={{
              visibility: "hidden",
              position: "relative",
            }}
            type="file"
            id="single"
            accept="image/*"
            onChange={uploadAvatar}
            disabled={uploading || testMode == true}
          />
        </div>
      )}
    </div>
  );
}
