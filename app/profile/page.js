'use client';

import { useState, useEffect, useRef } from "react";
import { Container } from "react-bootstrap";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Avatar from "../../components/Avatar";
import { useAuth } from "../../contexts/auth";
import useResource from "../../hooks/useResource";
import Modal from "react-bootstrap/Modal";
import SongFeed from "../../components/SongFeed";

export default function ProfilePage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [songPostData, SetSongPostData] = useState(null);
  const [genre, setGenre] = useState(null);
  const [description, setDescription] = useState(null);
  const [needs, setNeeds] = useState(null);
  const [show, setShow] = useState(false);
  const [testMode, setTestMode] = useState(false);
  const usernameRef = useRef(null);

  const {
    audio,
    playSong,
    loading,
    updateSongPost,
    uploading,
    fileName,
    uploadSong,
    absoluteSongUrl,
  } = useResource();
  const {
    session,
    signOut,
    username,
    setUsername,
    bio,
    setBio,
    website,
    setWebsite,
    avatar_url,
    instagram_url,
    setInstagram_url,
    twitter_url,
    setTwitter_url,
    spotify_url,
    setSpotify_url,
    soundcloud_url,
    setSoundcloud_url,
    isLoading,
    updateProfile,
    absoluteAvatar_urlAuth,
  } = useAuth();

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }
    if (session?.user.email === process.env.NEXT_PUBLIC_TEST_EMAIL) {
      setTestMode(true);
    }
    if (searchParams?.get("error") === "no-username") {
      usernameRef.current?.focus();
      if (usernameRef.current) {
        usernameRef.current.className = "border border-danger";
        usernameRef.current.placeholder =
          "enter a unique username to send a message";
      }
    }
  }, [session, router, searchParams]);

  if (playSong === true) {
    audio.play();
  }
  if (playSong === false) {
    audio.pause();
  }

  const size = "150px";

  function handleSubmit() {
    const values = {
      artist: username,
      artist_id: session.user.id,
      song_url: fileName,
      absolute_song_url: absoluteSongUrl,
      genre,
      description,
      needs,
    };
    updateSongPost(values, songPostData.id);
    setShow(false);
  }

  return (
    <Container fluid="md">
      <div className="row">
        <div className="col">
          <Avatar
            url={avatar_url}
            size={size}
            profilePage={true}
            testMode={testMode}
          />
        </div>
        <div className="col float-right text-right">
          <Link href="/password-reset">Reset Password</Link>
        </div>
      </div>

      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="text" value={session?.user.email} disabled />
      </div>
      <div>
        <label htmlFor="username">Artist Name</label>
        <input
          ref={usernameRef}
          id="username"
          type="text"
          value={username || ""}
          onChange={(e) => setUsername(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="bio">BIO</label>
        <textarea
          cols="40"
          rows="5"
          id="bio"
          type="text"
          value={bio || ""}
          onChange={(e) => setBio(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="website">Website</label>
        <input
          id="website"
          type="text"
          value={website || ""}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="instagram">Instagram username</label>
        <input
          id="instagram"
          type="text"
          value={instagram_url || ""}
          onChange={(e) => setInstagram_url(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="twitter">Twitter username</label>
        <input
          id="twitter"
          type="text"
          value={twitter_url || ""}
          onChange={(e) => setTwitter_url(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="soundcloud">Soundcloud username</label>
        <input
          id="soundcloud"
          type="website"
          value={soundcloud_url || ""}
          onChange={(e) => setSoundcloud_url(e.target.value)}
        />
      </div>
      <div>
        <label htmlFor="Spotify">Spotify artist id</label>
        <input
          id="Spotify"
          type="website"
          value={spotify_url || ""}
          onChange={(e) => setSpotify_url(e.target.value)}
        />
      </div>

      <div>
        <button
          className="button primary block"
          onClick={() =>
            updateProfile({
              username,
              bio,
              website,
              avatar_url,
              absolute_avatar_url: absoluteAvatar_urlAuth,
              instagram_url,
              twitter_url,
              spotify_url,
              soundcloud_url,
            })
          }
          disabled={isLoading || testMode === true}
        >
          {isLoading ? "Loading ..." : "Update"}
        </button>
      </div>

      <div>
        <button className="button block" onClick={signOut()}>
          Sign Out
        </button>
      </div>

      <SongFeed profilePage={true} />

      <Modal
        show={show}
        onHide={() => setShow(false)}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Click Submit To Update This Post</Modal.Title>
        </Modal.Header>
        <div className="row flex-center flex">
          <div className="col-6 form-widget">
            <div>
              <label htmlFor="artist">Artist</label>
              <input id="artist" type="text" value={username} disabled />
            </div>
            <div>
              <p>
                {fileName ? (
                  fileName
                ) : (
                  <small style={{ color: "grey" }}>no file uploaded</small>
                )}
              </p>
              <div style={{ width: size }}>
                <label className="button primary block" htmlFor="audio-file">
                  {uploading ? "Uploading ..." : "Upload"}
                </label>
                <input
                  style={{
                    visibility: "hidden",
                    position: "absolute",
                  }}
                  type="file"
                  id="audio-file"
                  accept="audio/*"
                  onChange={uploadSong}
                  disabled={uploading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="genre">Genre</label>
              <input
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
                type="text"
                value={description || ""}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="needs">Needs</label>
              <input
                id="needs"
                type="text"
                value={needs || ""}
                onChange={(e) => setNeeds(e.target.value)}
              />
            </div>

            <div>
              <button
                className="button primary block"
                onClick={() => handleSubmit()}
                disabled={loading}
              >
                {loading ? "Loading ..." : "Submit"}
              </button>
            </div>
          </div>
        </div>
      </Modal>
    </Container>
  );
}
