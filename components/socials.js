import { FiTwitter, FiInstagram } from "react-icons/fi";
import { RiSpotifyLine } from "react-icons/ri";
import { GrSoundcloud } from "react-icons/gr";
import { useRealtime } from "../contexts/RealTime";
import { useRouter } from "next/navigation";

export default function Socials({ data, currentUser, username }) {
  const router = useRouter();
  const { addChannel, setChannelId } = useRealtime();
  const handleNewChannel = async () => {
    if (data) {
      let channel = await addChannel(
        data?.username,
        currentUser.id,
        data?.id,
        username
      );

      if (channel && channel[0]?.id) {
        setChannelId(channel[0].id);
        router.push("/messages");
      } else router.push("/messages");
    }
  };

  return (
    <div className="socials-container">
      {currentUser && (
        <button onClick={() => handleNewChannel(data?.username, data?.id)}>
          Send Message
        </button>
      )}
      {data && (
        <a
          href={`https://www.instagram.com/${data.instagram_url}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FiInstagram className="brand-hover" />
        </a>
      )}
      <br></br>

      {data && (
        <a
          href={`https://twitter.com/${data.twitter_url}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <FiTwitter className="brand-hover" />
        </a>
      )}

      <br></br>
      {data && (
        <a
          href={`https://open.spotify.com/artist/${data.spotify_url}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <RiSpotifyLine className="brand-hover" />
        </a>
      )}
      <br></br>

      {data && (
        <a
          target="_blank"
          href={`https://soundcloud.com/${data.soundcloud_url}`}
          rel="noopener noreferrer"
        >
          <GrSoundcloud className="brand-hover" />
        </a>
      )}
    </div>
  );
}
