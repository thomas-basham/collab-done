'use client';

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Message from "../../components/Message";
import MessageInput from "../../components/MessageInput";
import { useAuth } from "../../contexts/auth";
import { useRealtime } from "../../contexts/RealTime";
import useResource from "../../hooks/useResource";
import SideBar from "../../components/SideBar";
import NewChannelModal from "../../components/NewChannelModal";
import Link from "next/link";

export default function MessagesPage() {
  const router = useRouter();
  const { session, username, absoluteAvatar_urlAuth, setErrorMessageAuth } =
    useAuth();
  const {
    addChannel,
    messages,
    channelId,
    addMessage,
    deleteMessage,
    channels,
  } = useRealtime();
  const { allProfiles, getAllProfiles } = useResource();
  const user = session?.user;
  const [showNewChannelModal, setShowNewChannelModal] = useState(false);

  useEffect(() => {
    if (!session) {
      router.push("/login");
      return;
    }

    if (username == null) {
      router.push("/profile?error=no-username");
      setErrorMessageAuth("You must have a name before you can send a message");
    }
  });

  useEffect(() => {
    if (!allProfiles) {
      getAllProfiles();
    }
  });

  const messagesEndRef = useRef(null);
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({
        block: "start",
        behavior: "smooth",
      });
    }
  });

  function openNewChannelModal() {
    setShowNewChannelModal(true);
  }

  const currentChannel = channels.filter((chanel) => chanel.id == channelId);

  return (
    <main>
      <div className="container">
        <div className="row">
          <div className="col-sm-3">
            <SideBar openNewChannelModal={openNewChannelModal} />
          </div>

          <div className="col-sm-9">
            <div className="channel-container">
              <div className="sticky-top message-header ">
                <h3 id="message-from">
                  {currentChannel[0]?.message_to == user?.id ? (
                    <Link href={`/pr/${currentChannel[0]?.created_by}`}>
                      {currentChannel[0]?.created_by_username}
                    </Link>
                  ) : (
                    <Link href={`/pr/${currentChannel[0]?.message_to}`}>
                      {currentChannel[0]?.slug}
                    </Link>
                  )}
                </h3>
              </div>
              <div className="messages">
                <div>
                  {messages.map((x) => (
                    <Message
                      key={x.id}
                      message={x}
                      deleteMessage={deleteMessage}
                    />
                  ))}
                  <div ref={messagesEndRef} style={{ height: 0 }} />
                </div>
              </div>
            </div>
            <div className="position-relative bottom-0 col-md-12">
              <MessageInput
                onSubmit={async (text) =>
                  addMessage(
                    text,
                    channelId,
                    user.id,
                    username,
                    absoluteAvatar_urlAuth
                  )
                }
                channelId={channelId}
              />
            </div>
          </div>
        </div>
      </div>

      <NewChannelModal
        setShowNewChannelModal={setShowNewChannelModal}
        showNewChannelModal={showNewChannelModal}
        addChannel={addChannel}
        allProfiles={allProfiles}
        user={user}
        username={username}
      />
    </main>
  );
}
