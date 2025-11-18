'use client';

import { useState } from "react";
import { Container } from "react-bootstrap";
import useResource from "../../hooks/useResource";
import { useAuth } from "../../contexts/auth";

export default function UploadSongPage() {
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

  function handleSubmit() {
    if ((genre, description, needs)) {
      const values = {
        artist: username,
        artist_id: session.user.id,
        genre,
        description,
        needs,
        song_url: songUrl,
        absolute_song_url: absoluteSongUrl,
        absolute_avatar_url: absoluteAvatar_urlAuth,
      };
      createSongPost(values);
    }
  }
  const size = 150;

  const ButtonText = () => {
    if (!fileName) {
      return <div> UPLOAD A SONG TO START COLLABING </div>;
    }
    return loading ? "Loading ..." : "Start Collabing";
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
            <button
              className="button primary block"
              onClick={() => handleSubmit()}
              disabled={loading || !fileName}
            >
              <ButtonText />
            </button>
          </div>
        </div>
      </div>
    </Container>
  );
}
