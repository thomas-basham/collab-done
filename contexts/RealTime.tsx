import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
  useRef,
} from "react";
import { useAuth } from "./auth";
import { apiRequest, getWsUrl } from "../utils/apiClient";

interface Message {
  id: string;
  channel_id: string;
  message: string;
  user_id: string;
  username: string;
  absolute_avatar_url: string;
  inserted_at?: string;
}

interface Channel {
  id: string;
  slug: string;
  created_by: string;
  message_to: string;
  created_by_username: string;
  inserted_at?: string;
}

interface User {
  id: string;
}

interface MessageContextValue {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  channels: Channel[];
  users: Map<string, User>;
  channelId: string | null;
  addChannel: (
    slug: string,
    user_id: string,
    message_to: string,
    created_by_username: string
  ) => Promise<any>;
  setChannelId: (channelId: string | null) => void;
  fetchUserRoles: (setState?: any) => Promise<any>;
  fetchMessages: (channel_id: string | null, setState?: any) => Promise<any>;
  deleteChannel: (channel_id: string) => Promise<any>;
  addMessage: (
    message: string,
    channel_id: string,
    user_id: string,
    username: string,
    absolute_avatar_url: string
  ) => Promise<any>;
  newMessage: Message | null;
  deleteMessage: (message_id: string) => Promise<any>;
}

const MessageContext = createContext<MessageContextValue>({
  messages: [],
  setMessages: () => {},
  channels: [],
  users: new Map<string, User>(),
  channelId: null,
  addChannel: async () => {},
  setChannelId: () => {},
  fetchUserRoles: async () => {},
  fetchMessages: async () => {},
  deleteChannel: async () => {},
  addMessage: async () => {},
  newMessage: null,
  deleteMessage: async () => {},
});

interface RealTimeProviderProps {
  children: ReactNode;
}

export function RealTimeProvider({ children }: RealTimeProviderProps) {
  const { session } = useAuth();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users] = useState<Map<string, User>>(new Map());
  const [newMessage, setNewMessage] = useState<Message | null>(null);
  const [channelId, setChannelId] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const fetchChannels = async (setState?: any) => {
    try {
      const data = await apiRequest("/channels");
      if (setState) setState(data || []);
      else setChannels(data || []);
      return data;
    } catch (error) {
      console.log("error", error);
      return [];
    }
  };

  const fetchUserRoles = async (setState?: any) => {
    try {
      const data = await apiRequest("/me/roles");
      if (setState) setState(data || []);
      return data || [];
    } catch (error) {
      console.log("error", error);
      return [];
    }
  };

  async function fetchMessages(channel_id: string | null, setState?: any) {
    if (!channel_id) {
      if (setState) setState([]);
      else setMessages([]);
      return [];
    }

    try {
      const data = await apiRequest(`/channels/${channel_id}/messages`);
      if (setState) setState(data || []);
      else setMessages(data || []);
      return data || [];
    } catch (error) {
      console.log("error", error);
      if (setState) setState([]);
      else setMessages([]);
      return [];
    }
  }

  const addChannel = async (
    slug: string,
    user_id: string,
    message_to: string,
    created_by_username: string
  ) => {
    try {
      const channel = await apiRequest("/channels", {
        method: "POST",
        body: { slug, user_id, message_to, created_by_username },
      });
      await fetchChannels(setChannels);

      if (channel?.id) {
        setChannelId(channel.id);
        return [channel];
      }

      return [];
    } catch (error) {
      console.log("error", error);
      return [];
    }
  };

  const addMessage = async (
    message: string,
    channel_id: string,
    _user_id: string,
    username: string,
    absolute_avatar_url: string
  ) => {
    try {
      const created = await apiRequest(`/channels/${channel_id}/messages`, {
        method: "POST",
        body: {
          message,
          username,
          absolute_avatar_url,
        },
      });

      setMessages((prev) => {
        if (prev.some((entry) => entry.id === created.id)) {
          return prev;
        }
        return prev.concat(created);
      });

      return [created];
    } catch (error) {
      console.log("error", error);
      return [];
    }
  };

  const deleteChannel = async (channel_id: string) => {
    try {
      await apiRequest(`/channels/${channel_id}`, {
        method: "DELETE",
      });

      if (channelId === channel_id) {
        setChannelId(null);
        setMessages([]);
      }

      await fetchChannels(setChannels);
      return true;
    } catch (error) {
      console.log("error", error);
      return false;
    }
  };

  const deleteMessage = async (message_id: string) => {
    if (!channelId) {
      return false;
    }

    try {
      await apiRequest(`/channels/${channelId}/messages/${message_id}`, {
        method: "DELETE",
      });

      setMessages((prev) => prev.filter((message) => message.id !== message_id));
      return true;
    } catch (error) {
      console.log("error", error);
      return false;
    }
  };

  useEffect(() => {
    if (!session?.user?.id) {
      setChannels([]);
      setMessages([]);
      setChannelId(null);
      return;
    }

    fetchChannels(setChannels);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    if (!session?.user?.id) {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const wsUrl = getWsUrl(session.user.id);
    if (!wsUrl) {
      return;
    }

    const socket = new WebSocket(wsUrl);
    wsRef.current = socket;

    socket.onopen = () => {
      if (channelId) {
        socket.send(
          JSON.stringify({
            action: "subscribe",
            channelId,
          })
        );
      }
    };

    socket.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);

        if (payload?.type === "message.created") {
          const incomingChannelId = payload.channelId;
          const incomingMessage = payload.message as Message;

          if (incomingChannelId === channelId) {
            setMessages((prev) => {
              if (prev.some((entry) => entry.id === incomingMessage.id)) {
                return prev;
              }
              return prev.concat(incomingMessage);
            });
          }

          setNewMessage(incomingMessage);
        }

        if (payload?.type === "message.deleted") {
          const deletedMessageId = payload.messageId as string;
          setMessages((prev) =>
            prev.filter((message) => message.id !== deletedMessageId)
          );
        }

        if (payload?.type === "channel.created") {
          fetchChannels(setChannels);
        }
      } catch (_err) {
        // Ignore malformed websocket payloads.
      }
    };

    return () => {
      socket.close();
      if (wsRef.current === socket) {
        wsRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  useEffect(() => {
    if (!channelId) {
      setMessages([]);
      return;
    }

    fetchMessages(channelId, setMessages);

    const socket = wsRef.current;
    if (socket?.readyState === WebSocket.OPEN) {
      socket.send(
        JSON.stringify({
          action: "subscribe",
          channelId,
        })
      );
    }

    return () => {
      const currentSocket = wsRef.current;
      if (currentSocket?.readyState === WebSocket.OPEN && channelId) {
        currentSocket.send(
          JSON.stringify({
            action: "unsubscribe",
            channelId,
          })
        );
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  const value = {
    messages,
    setMessages,
    channels,
    users,
    channelId,
    addChannel,
    setChannelId,
    fetchUserRoles,
    fetchMessages,
    deleteChannel,
    addMessage,
    newMessage,
    deleteMessage,
  };

  return (
    <MessageContext.Provider value={value}>{children}</MessageContext.Provider>
  );
}

export function useRealtime() {
  return useContext(MessageContext);
}
