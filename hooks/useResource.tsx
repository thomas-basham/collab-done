import { useState } from "react";
import { apiRequest } from "../utils/apiClient";
import { useAuth } from "../contexts/auth";

interface Song {
  id: string;
  genre?: string;
  description?: string;
  needs?: string;
  artist_id?: string;
  artist?: string;
  song_url?: string;
  absolute_song_url?: string;
  absolute_avatar_url?: string;
  created_at?: string;
}

interface Comment {
  id: string;
  user: string;
  comment: string;
  song_id: string;
  commentPosition: number;
  avatarURl?: string;
}

interface Profile {
  id: string;
  username: string;
  bio: string;
  website: string;
  avatar_url: string;
  absolute_avatar_url: string;
  instagram_url: string;
  twitter_url: string;
  spotify_url: string;
  soundcloud_url: string;
}

interface PotentialCollaborator {
  id: string;
  song_id: string;
  user: string;
  username: string;
  absolute_avatar_url: string;
}

async function uploadWithSignedUrl(
  kind: "songs" | "avatars",
  file: File
): Promise<{ key: string; publicUrl: string }> {
  const signed = await apiRequest("/media/upload-url", {
    method: "POST",
    body: {
      kind,
      fileName: file.name,
      contentType: file.type || "application/octet-stream",
    },
  });

  const putResult = await fetch(signed.uploadUrl, {
    method: "PUT",
    headers: {
      "Content-Type": file.type || "application/octet-stream",
    },
    body: file,
  });

  if (!putResult.ok) {
    throw new Error("Failed to upload file to S3");
  }

  return {
    key: signed.key,
    publicUrl: signed.publicUrl,
  };
}

export default function useResource() {
  const { session } = useAuth();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [musicPosts, setMusicPosts] = useState<Song[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  const [songUrl, setSongUrl] = useState<string | null>(null);
  const [playSong] = useState<boolean>(false);
  const [audio] = useState<HTMLAudioElement | null>(new Audio());
  const [currentKey] = useState<number | null>(null);
  const [socials, setSocials] = useState<any>(null);
  const [allAvatars] = useState<[] | null>(null);
  const [selectedPostKey, setSelectedPostKey] = useState<number>();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [audioUrl] = useState<string | null>(null);
  const [absoluteSongUrl, setAbsoluteSongUrl] = useState<string | null>(null);
  const [absoluteAvatar_url, setAbsoluteAvatar_Url] = useState<string | null>(
    null
  );
  const [potentialCollaborators, setPotentialCollaborators] = useState<
    PotentialCollaborator[] | null
  >(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [fileName, setFileName] = useState<string>("");
  const [allProfiles, setAllProfiles] = useState<Profile[] | null>(null);

  const generalErrorMessage =
    "Our servers are currently down. Please try again soon.";

  async function getAllProfiles() {
    try {
      setLoading(true);
      const data = await apiRequest("/profiles");
      setAllProfiles(data || []);
      return data;
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function getMusicPosts() {
    try {
      setLoading(true);
      const data = await apiRequest("/songs");
      setMusicPosts(data || []);
      return data;
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function uploadSong(event: React.ChangeEvent<HTMLInputElement>) {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error("You must select an audio file to upload.");
      }

      const file = event.target.files[0];
      const uploaded = await uploadWithSignedUrl("songs", file);

      setFileName(uploaded.key);
      setSongUrl(uploaded.key);
      setAbsoluteSongUrl(uploaded.publicUrl);
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
    } finally {
      setUploading(false);
    }
  }

  async function createSongPost(song: Song) {
    try {
      setLoading(true);
      const created = await apiRequest("/songs", {
        method: "POST",
        body: song,
      });
      if (created) {
        setMusicPosts((prev) => [created, ...prev]);
      }
      return created;
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function getComments() {
    try {
      setLoading(true);
      const data = await apiRequest("/comments");
      setComments(data || []);
      return data;
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function createComment(comment: Comment) {
    try {
      setLoading(true);
      await apiRequest(`/songs/${comment.song_id}/comments`, {
        method: "POST",
        body: comment,
      });
      await getComments();
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function deleteComment(id: string) {
    try {
      setLoading(true);
      const comment = comments.find((entry) => entry.id === id);
      if (!comment) {
        await getComments();
        return;
      }
      await apiRequest(`/songs/${comment.song_id}/comments/${id}`, {
        method: "DELETE",
      });
      await getComments();
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function deleteSongPost(songOrId: Song | string) {
    try {
      setLoading(true);
      const songId = typeof songOrId === "string" ? songOrId : songOrId?.id;
      if (!songId) return;
      await apiRequest(`/songs/${songId}`, {
        method: "DELETE",
      });
      await getMusicPosts();
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function updateSongPost(
    songOrValues: Song,
    songIdFromArgs?: string
  ): Promise<void> {
    try {
      setLoading(true);
      const songId = songIdFromArgs || songOrValues?.id;
      if (!songId) {
        throw new Error("Song id is required");
      }
      await apiRequest(`/songs/${songId}`, {
        method: "PUT",
        body: songOrValues,
      });
      await getMusicPosts();
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function addCollaborator(songId: string, _collaboratorId?: string) {
    try {
      setLoading(true);
      await apiRequest(`/songs/${songId}/collaborators`, {
        method: "POST",
        body: {},
      });
      await getPotentialCollaborators(songId);
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function removeCollaborator(songId: string, collaboratorId?: string) {
    try {
      setLoading(true);
      const targetCollaboratorId = collaboratorId || session?.user?.id;
      if (!targetCollaboratorId) {
        return;
      }
      await apiRequest(
        `/songs/${songId}/collaborators/${encodeURIComponent(
          targetCollaboratorId
        )}`,
        {
          method: "DELETE",
        }
      );
      await getPotentialCollaborators(songId);
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function getPotentialCollaborators(songId: string) {
    try {
      setLoading(true);
      const data = await apiRequest(`/songs/${songId}/collaborators`);
      setPotentialCollaborators(data || []);
      return data;
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
      return [];
    } finally {
      setLoading(false);
    }
  }

  async function getCollaborators(songId: string) {
    return getPotentialCollaborators(songId);
  }

  async function updateProfile(profile: Profile) {
    try {
      setLoading(true);
      await apiRequest("/profiles", {
        method: "PUT",
        body: profile,
      });
      await getProfile();
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function getProfile() {
    try {
      setLoading(true);
      if (!session?.user?.id) {
        return null;
      }
      const data = await apiRequest(`/profiles/${session.user.id}`);
      setSocials(data || null);
      return data;
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function getProfileByID(id: string) {
    try {
      setLoading(true);
      const data = await apiRequest(`/profiles/${id}`);
      return data;
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }

  async function downloadImage(path: string) {
    if (!path) {
      return;
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
      setAvatarUrl(path);
      return;
    }

    const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
    if (mediaBaseUrl) {
      setAvatarUrl(`${mediaBaseUrl.replace(/\/$/, "")}/${path}`);
      return;
    }

    setAvatarUrl(path);
  }

  function getAbsoluteAvatarUrl(path: string) {
    if (!path) {
      return "";
    }

    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }

    const mediaBaseUrl = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
    if (mediaBaseUrl) {
      return `${mediaBaseUrl.replace(/\/$/, "")}/${path}`;
    }

    return path;
  }

  async function uploadAvatarFile(file: File) {
    const uploaded = await uploadWithSignedUrl("avatars", file);
    setAvatarUrl(uploaded.publicUrl);
    setAbsoluteAvatar_Url(uploaded.publicUrl);
    return uploaded;
  }

  async function getSocials(id: string, key: number) {
    try {
      setLoading(true);
      const data = await apiRequest(`/profiles/${id}`);
      setSocials(data || null);
      setSelectedPostKey(key);
      setAvatarUrl(data?.avatar_url || data?.absolute_avatar_url || null);
      return data;
    } catch (error: any) {
      setErrorMessage(error?.message || generalErrorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return {
    errorMessage,
    setErrorMessage,
    loading,
    musicPosts,
    comments,
    setComments,
    songUrl,
    playSong,
    audio,
    currentKey,
    socials,
    allAvatars,
    selectedPostKey,
    avatarUrl,
    audioUrl,
    absoluteSongUrl,
    setAbsoluteSongUrl,
    absoluteAvatar_url,
    setAbsoluteAvatar_Url,
    potentialCollaborators,
    uploading,
    fileName,
    setFileName,
    allProfiles,
    getAllProfiles,
    getMusicPosts,
    uploadSong,
    createSongPost,
    getComments,
    createComment,
    deleteComment,
    deleteSongPost,
    updateSongPost,
    addCollaborator,
    removeCollaborator,
    getPotentialCollaborators,
    getCollaborators,
    updateProfile,
    getProfile,
    getProfileByID,
    downloadImage,
    getSocials,
    getAbsoluteAvatarUrl,
    uploadAvatarFile,
  };
}
