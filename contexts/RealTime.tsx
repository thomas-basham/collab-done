import {
  useState,
  useEffect,
  useContext,
  createContext,
  ReactNode,
} from "react";
import { supabase } from "../utils/supabaseClient";
import { useAuth } from "./auth";
import {
  RealtimePostgresChangesPayload,
  RealtimeChannel,
} from "@supabase/realtime-js";
interface Message {
  id: number;
  channel_id: number;
  message: string;
  user_id: number;
  username: string;
  absolute_avatar_url: string;
}

interface Channel {
  id: number;
  slug: string;
  created_by: number;
  message_to: string;
  created_by_username: string;
}

interface User {
  id: number;
  // Add properties for the user object
}

interface MessageContextValue {
  messages: Message[];
  setMessages: (messages: Message[]) => void;
  channels: Channel[];
  users: Map<number, User>;
  channelId: number | null;
  addChannel: (
    slug: string,
    user_id: number,
    message_to: string,
    created_by_username: string
  ) => Promise<any>;
  setChannelId: (channelId: number | null) => void;
  fetchUserRoles: (setState?: any) => Promise<any>;
  fetchMessages: (channel_id: number | null, setState?: any) => Promise<any>;
  deleteChannel: (channel_id: number) => Promise<any>;
  addMessage: (
    message: string,
    channel_id: number,
    user_id: number,
    username: string,
    absolute_avatar_url: string
  ) => Promise<any>;
  newMessage: Message | null;
  deleteMessage: (message_id: number) => Promise<any>;
}

const MessageContext = createContext<MessageContextValue>({
  messages: [],
  setMessages: () => {},
  channels: [],
  users: new Map<number, User>(),
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
  // @ts-ignore
  const { session } = useAuth();

  const [channels, setChannels] = useState<Channel[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [users] = useState<Map<number, User>>(new Map());
  const [newMessage, handleNewMessage] = useState<Message | null>(null);
  const [newChannel, handleNewChannel] = useState<Channel | null>(null);
  const [newOrUpdatedUser, handleNewOrUpdatedUser] = useState<User | null>(
    null
  );
  const [deletedChannel, handleDeletedChannel] = useState<Channel | null>(null);
  const [deletedMessage, handleDeletedMessage] = useState<Message | null>(null);
  const [channelId, setChannelId] = useState<number | null>(null);
  const [incomingChannelId, setIncomingChannelId] = useState<number | null>(
    null
  );

  // Load initial data and set up listeners
  useEffect(() => {
    // Get Channels
    fetchChannels(setChannels);
    // Listen for new and deleted messages
    const messageListener: RealtimeChannel = supabase
      .channel("public:messages")
      .on<RealtimePostgresChangesPayload<{ channel_id: string }>>(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          // @ts-ignore
          setIncomingChannelId(payload.new.channel_id);
          handleNewMessage(payload.new as unknown as Message);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages" },
        (payload) => {
          console.log(payload);
          handleDeletedMessage(payload.old as Message);
        }
      )
      .subscribe();

    // Listen for changes to our users
    const userListener = supabase
      .channel("public:profiles")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        (payload) => {
          console.log("PROFILES!", payload);

          handleNewOrUpdatedUser(payload.new as User);
        }
      )
      .subscribe();
    // Listen for new and deleted channels
    const channelListener = supabase
      .channel("public:channels")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "channels" },
        (payload) => {
          console.log(payload);

          handleNewChannel(payload.new as Channel);
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "channels" },
        (payload) => {
          console.log(payload);

          handleDeletedChannel(payload.old as Channel);
        }
      )
      .subscribe();
    // Cleanup on unmount
    return () => {
      supabase.removeChannel(messageListener);
      supabase.removeChannel(userListener);
      supabase.removeChannel(channelListener);
    };
  }, []);

  // Update when the route changes
  useEffect(() => {
    if (channelId !== null) {
      const handleAsync = async () => {
        await fetchMessages(channelId, setMessages);
      };
      handleAsync();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]);

  // New message received from Postgres
  useEffect(() => {
    if (
      newMessage &&
      incomingChannelId !== null &&
      incomingChannelId === channelId
    ) {
      fetchMessages(incomingChannelId);

      setMessages(messages.concat(newMessage));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newMessage]);

  // Deleted message received from postgres
  useEffect(() => {
    if (deletedMessage)
      setMessages(
        messages.filter((message) => message.id !== deletedMessage.id)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedMessage]);

  // New channel received from Postgres
  useEffect(() => {
    if (newChannel) setChannels(channels.concat(newChannel));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newChannel]);

  // Deleted channel received from postgres
  useEffect(() => {
    if (deletedChannel)
      setChannels(
        channels.filter((channel) => channel.id !== deletedChannel.id)
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deletedChannel]);

  // New or updated user received from Postgres
  useEffect(() => {
    if (newOrUpdatedUser) users.set(newOrUpdatedUser.id, newOrUpdatedUser);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newOrUpdatedUser]);

  /**
   * Fetch all channels
   * @param {function} setState Optionally pass in a hook or callback to set the state
   */
  const fetchChannels = async (setState?: any) => {
    try {
      let { data } = await supabase.from("channels").select("*");
      if (setState) setState(data);
      return data;
    } catch (error) {
      console.log("error", error);
    }
  };

  /**
   * Fetch a single user
   * @param {number} userId
   * @param {function} setState Optionally pass in a hook or callback to set the state
   */
  const fetchUser = async (userId: number, setState?: any) => {
    try {
      let { data } = await supabase
        .from("profiles")
        .select(`*`)
        .eq("id", userId);
      if (data) {
        let user = data[0];
        if (setState) setState(user);
        return user;
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  /**
   * Fetch all roles for the current user
   * @param {function} setState Optionally pass in a hook or callback to set the state
   */
  const fetchUserRoles = async (setState?: any) => {
    try {
      let { data } = await supabase.from("user_roles").select(`*`);
      if (setState) setState(data);
      return data;
    } catch (error) {
      console.log("error", error);
    }
  };

  /**
   * Fetch all messages for given channel
   * @param {number} channel_id
   * @param {function} setState Optionally pass in a hook or callback to set the state
   */
  async function fetchMessages(channel_id: number, setState?: any) {
    try {
      let { data, error, status } = await supabase
        .from("messages")
        .select(`*`)
        .eq("channel_id", channel_id)
        .order("inserted_at"); // , true

      if (error && status !== 406) {
        throw error;
      }

      if (data) {
        setState(data);
        console.log(data, "FETCH MESSAGES DATA");
        // return data;
      }
    } catch (error) {
      console.log("error", error);
    }
  }

  /**
   * Insert a new channel into the DB with creator and receiver's id
   * @param {string} slug The receiver's username
   * @param {number} user_id The channel creator's id
   * @param {string} message_to The receiver's id
   * @param {string} created_by_username The channel creator's username
   */
  const addChannel = async (
    slug: string,
    user_id: number,
    message_to: string,
    created_by_username: string
  ) => {
    let filteredChannels = channels.filter(
      (channel) =>
        channel.message_to === session?.user?.id ||
        // @ts-ignore
        channel.created_by === session?.user?.id
    );
    let existingChannel = filteredChannels.filter(
      (channel) =>
        channel.message_to === message_to && channel.created_by === user_id
    );
    if (existingChannel.length < 1) {
      try {
        let { data } = await supabase
          .from("channels")
          .insert([
            { slug, created_by: user_id, message_to, created_by_username },
          ])
          .select();
        return data;
      } catch (error) {
        console.log("error", error);
      }
    } else {
      console.log({ existingChannel });
      setChannelId(existingChannel[0]?.id);
    }
  };

  /**
   * Insert a new message into the DB
   * @param {string} message The message text
   * @param {number} channel_id
   * @param {number} user_id The author's id
   * @param {string} username The author's username
   * @param {string} absolute_avatar_url src of author's avatar
   */
  const addMessage = async (
    message: string,
    channel_id: number,
    user_id: number,
    username: string,
    absolute_avatar_url: string
  ) => {
    try {
      let { data } = await supabase
        .from("messages")
        .insert([
          {
            message,
            channel_id,
            user_id,
            username,
            absolute_avatar_url,
          },
        ])
        .select();
      return data;
    } catch (error) {
      console.log("error", error);
    }
  };

  /**
   * Delete a channel by id
   * @param {number} channel_id
   */
  const deleteChannel = async (channel_id: number) => {
    try {
      let { data } = await supabase
        .from("channels")
        .delete()
        .eq("id", channel_id);
      return data;
    } catch (error) {
      console.log("error", error);
    }
  };

  /**
   * Delete a message by id
   * @param {number} message_id
   */
  const deleteMessage = async (message_id: number) => {
    try {
      let { data } = await supabase
        .from("messages")
        .delete()
        .eq("id", message_id);
      return data;
    } catch (error) {
      console.log("error", error);
    }
  };

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
