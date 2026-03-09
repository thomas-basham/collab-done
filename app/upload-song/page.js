'use client';

import { useState } from "react";
import { Container } from "react-bootstrap";
import { useRouter } from "next/navigation";
import useResource from "../../hooks/useResource";
import { useAuth } from "../../contexts/auth";

export default function UploadSongPage() {
  const router = useRouter();
  const { session, username, absoluteAvatar_urlAuth } = useAuth();

  const {
    uploadSong,
    uploading,
    songUrl,
    fileName,
    createSongPost,
    absoluteSongUrl,
    loading,
  } = useResource();

  const [genre, setGenre] = useState("");
  const [description, setDescription] = useState("");
  const [needs, setNeeds] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  async function handleSubmit() {
    if (!session?.user?.id) {
      setSubmitError("You must be signed in to upload a song.");
      return;
    }

    if (!genre.trim() || !description.trim() || !needs.trim()) {
      setSubmitError("Genre, description, and needs are required.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    const values = {
      artist: username,
      artist_id: session.user.id,
      genre: genre.trim(),
      description: description.trim(),
      needs: needs.trim(),
      song_url: songUrl,
      absolute_song_url: absoluteSongUrl,
      absolute_avatar_url: absoluteAvatar_urlAuth,
    };

    const created = await createSongPost(values);
    setIsSubmitting(false);

    if (created) {
      router.push("/");
    } else {
      setSubmitError("Could not publish the song right now. Please try again.");
    }
  }
  const size = 150;

  const ButtonText = () => {
    if (!fileName) {
      return <div> UPLOAD A SONG TO START COLLABING </div>;
    }
    if (uploading) {
      return "Uploading file...";
    }
    return isSubmitting ? "Publishing..." : "Start Collabing";
  };

  return (
    <Container fluid="md">
      <div className="description"> Upload a song here</div>
      <div className="row flex-center flex">
        <div className="col-6 form-widget">
          <div>
            <label htmlFor="artist">Artist</label>
            <input id="artist" type="text" value={username} disabled />
          </div>
          <p>
            {fileName ? (
              fileName
            ) : (
              <small style={{ color: "grey" }}>no file uploaded</small>
            )}
          </p>
          <div style={{ width: size }}>
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
              accept="audio/*"
              onChange={uploadSong}
              disabled={uploading}
            />
          </div>

          <div>
            <label htmlFor="genre">Genre</label>
            <input
              required
              id="genre"
              type="text"
              value={genre || ""}
              onChange={(e) => setGenre(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="website">Description</label>
            <input
              id="description"
              required
              type="text"
              value={description || ""}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="needs">Needs</label>
            <input
              required
              id="needs"
              type="text"
              value={needs || ""}
              onChange={(e) => setNeeds(e.target.value)}
            />
          </div>

          <div>
            <br />
            {submitError && (
              <small style={{ color: "red" }}>{submitError}</small>
            )}
            <button
              className="button primary block"
              onClick={() => handleSubmit()}
              disabled={loading || isSubmitting || uploading || !fileName}
            >
              <ButtonText />
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
}
