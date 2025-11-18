import Link from "next/link";
import { Container, Modal } from "react-bootstrap";
import { useEffect, useMemo, useState } from "react";
import { useRealtime } from "../contexts/RealTime";

export default function NewChannelModal(props) {
  // the value of the search field
  const [name, setName] = useState("");
  // the search result. initially all users except logged in user
  const filteredProfiles = useMemo(() => {
    return props.allProfiles?.filter((user) => {
      return user?.id != props.user?.id;
    });
  }, [props.allProfiles, props.user?.id]);

  const [foundUsers, setFoundUsers] = useState(filteredProfiles || []);

  const {
    addChannel,
    deleteChannel,
    messages,
    newMessage,
    channels,
    channelId,
    setChannelId,
    addMessage,
  } = useRealtime();

  useEffect(() => {
    if (filteredProfiles) {
      setFoundUsers(filteredProfiles);
    }
  }, [filteredProfiles]);

  const newChannel = async (channelName, user_id) => {
    if (channelName) {
      let channel = await addChannel(
        channelName,
        props.user.id,
        user_id,
        props.username
      );

      props.setShowNewChannelModal(false);
      if (channel && channel[0]?.id) {
        setChannelId(channel[0]?.id);
      }
    }
  };

  function openNewChannelModal() {
    props.setShowNewChannelModal(true);
  }
  const size = 100;

  const filter = (e) => {
    const keyword = e.target.value;

    if (keyword) {
      const results = (filteredProfiles || []).filter((user) => {
        return (
          user.username != props.username &&
          user.username?.toLowerCase().startsWith(keyword.toLowerCase())
        );
        // Use the toLowerCase() method to make it case-insensitive
      });
      setFoundUsers(results);
    } else {
      setFoundUsers(filteredProfiles || []);
      // If the text field is empty, show all users
    }

    setName(keyword);
  };

  return (
    <>
      <Modal
        show={props.showNewChannelModal}
        onHide={() => props.setShowNewChannelModal(false)}
        size="lg"
        aria-labelledby="contained-modal-title-vcenter"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Search for a user here</Modal.Title>
        </Modal.Header>
        <br></br>
        <br></br>

        <input
          type="search"
          value={name}
          onChange={filter}
          className="input"
          placeholder="Filter"
        />
        <br></br>

        <div className="user-list">
          {foundUsers &&
            foundUsers.map((user) => (
              <div
                key={user.id}
                className="user"
                onClick={() => newChannel(user.username, user.id)}
                style={{ cursor: "pointer" }}
              >
                {user.absolute_avatar_url ? (
                  <img
                    src={user.absolute_avatar_url}
                    alt={user.username}
                    className="avatar image"
                    style={{ height: size, width: size }}
                  />
                ) : (
                  <>
                    <br></br>
                    <div
                      className="avatar no-image"
                      style={{ height: size, width: size }}
                    />
                  </>
                )}
                <span className="user-name">{user.username}</span>
                <span className="user-age">{user.age} </span>
                <br></br>
              </div>
            ))}
        </div>
      </Modal>
    </>
  );
}
