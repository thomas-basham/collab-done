import React, { useContext, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  fetchAuthSession,
  getCurrentUser,
  resetPassword,
  confirmResetPassword,
  resendSignUpCode,
  signIn,
  signInWithRedirect,
  signOut,
  signUp,
} from "aws-amplify/auth";
import { Hub } from "aws-amplify/utils";
import { apiRequest } from "../utils/apiClient";
import "../utils/amplifyConfig";

type AppSession = {
  user: {
    id: string;
    email?: string;
  };
};

type AuthContextType = {
  signUp: (data: { email: string; password: string }) => Promise<any>;
  signInOauth: (provider: string) => Promise<any>;
  signOut: () => Promise<void>;
  errorMessageAuth: string | null;
  setErrorMessageAuth: React.Dispatch<React.SetStateAction<string | null>>;
  registerUser: (
    email: string,
    password: string
  ) => Promise<{ success: boolean; message?: string }>;
  handleLogin: (email: string, password: string) => Promise<void>;
  session: AppSession | null;
  getProfile: () => Promise<void>;
  username: string;
  setUsername: React.Dispatch<React.SetStateAction<string>>;
  bio: string;
  setBio: React.Dispatch<React.SetStateAction<string>>;
  website: string;
  setWebsite: React.Dispatch<React.SetStateAction<string>>;
  avatar_url: string;
  setAvatarUrl: React.Dispatch<React.SetStateAction<string>>;
  updateProfile: (profile: {
    username?: string;
    bio?: string;
    website?: string;
    avatar_url?: string;
    absolute_avatar_url?: string;
    instagram_url?: string;
    twitter_url?: string;
    spotify_url?: string;
    soundcloud_url?: string;
  }) => Promise<void>;
  isLoading: boolean;
  setIsLoading: React.Dispatch<React.SetStateAction<boolean>>;
  instagram_url: string;
  setInstagram_url: React.Dispatch<React.SetStateAction<string>>;
  twitter_url: string;
  setTwitter_url: React.Dispatch<React.SetStateAction<string>>;
  spotify_url: string;
  setSpotify_url: React.Dispatch<React.SetStateAction<string>>;
  soundcloud_url: string;
  setSoundcloud_url: React.Dispatch<React.SetStateAction<string>>;
  absoluteAvatar_urlAuth: string;
  userRoles: string[];
  requestPasswordReset: (email: string) => Promise<void>;
  confirmPasswordReset: (
    email: string,
    confirmationCode: string,
    newPassword: string
  ) => Promise<void>;
};

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

function providerToCognito(provider: string): "Google" | { custom: string } {
  const normalized = (provider || "").toLowerCase();
  if (normalized === "google") {
    return "Google";
  }
  if (normalized === "github") {
    // Requires custom IdP wiring in Cognito (see infra warnings).
    return { custom: "GitHub" };
  }
  return "Google";
}

async function buildSession(): Promise<AppSession | null> {
  try {
    const [authUser, authSession] = await Promise.all([
      getCurrentUser(),
      fetchAuthSession(),
    ]);

    const email =
      (authSession?.tokens?.idToken?.payload?.email as string | undefined) ||
      authUser?.signInDetails?.loginId;

    return {
      user: {
        id: authUser.userId,
        email,
      },
    };
  } catch (_err) {
    return null;
  }
}

export function AuthProvider({ children }) {
  const router = useRouter();

  const [errorMessageAuth, setErrorMessageAuth] = useState<string | null>(null);
  const [session, setSession] = useState<AppSession | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [username, setUsername] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [website, setWebsite] = useState<string>("");
  const [avatar_url, setAvatarUrl] = useState<string>("");
  const [instagram_url, setInstagram_url] = useState<string>("");
  const [twitter_url, setTwitter_url] = useState<string>("");
  const [spotify_url, setSpotify_url] = useState<string>("");
  const [soundcloud_url, setSoundcloud_url] = useState<string>("");
  const [absoluteAvatar_urlAuth, setAbsoluteAvatar_UrlAuth] =
    useState<string>("");
  const [userRoles, setUserRoles] = useState<string[]>([]);

  const generalErrorMessage = "There seems to be an error with our servers";

  const applyProfileToState = (profile: any) => {
    setUsername(profile?.username || "");
    setWebsite(profile?.website || "");
    setAvatarUrl(profile?.avatar_url || "");
    setInstagram_url(profile?.instagram_url || "");
    setTwitter_url(profile?.twitter_url || "");
    setSpotify_url(profile?.spotify_url || "");
    setSoundcloud_url(profile?.soundcloud_url || "");
    setAbsoluteAvatar_UrlAuth(profile?.absolute_avatar_url || "");
    setBio(profile?.bio || "");
    setUserRoles(profile?.roles || ["user"]);
  };

  const fetchUserRoles = async () => {
    try {
      const roles = await apiRequest("/me/roles");
      setUserRoles((roles || []).map((entry) => entry.role));
    } catch (_err) {
      setUserRoles(["user"]);
    }
  };

  const getProfile = async () => {
    if (!session?.user?.id) {
      return;
    }

    try {
      setIsLoading(true);
      const data = await apiRequest(`/profiles/${session.user.id}`);
      if (!data) {
        const created = await apiRequest("/profiles", {
          method: "PUT",
          body: {},
        });
        applyProfileToState(created);
      } else {
        applyProfileToState(data);
      }
      await fetchUserRoles();
    } catch (error: any) {
      setErrorMessageAuth(error?.message || generalErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    const syncSession = async () => {
      const nextSession = await buildSession();
      if (!mounted) return;

      setSession(nextSession);
      if (nextSession?.user?.id) {
        await getProfile();
      } else {
        setIsLoading(false);
      }
      setIsInitialized(true);
    };

    syncSession();

    const unsubscribe = Hub.listen("auth", async ({ payload }) => {
      const event = payload?.event;
      if (
        event === "signedIn" ||
        event === "signedOut" ||
        event === "tokenRefresh" ||
        event === "signInWithRedirect"
      ) {
        await syncSession();
      }
    });

    return () => {
      mounted = false;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  const registerUser = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setErrorMessageAuth(null);

      await signUp({
        username: email,
        password,
        options: {
          userAttributes: {
            email,
          },
        },
      });

      return {
        success: true,
        message:
          "Registration successful! Please check your email for the confirmation code before logging in.",
      };
    } catch (error: any) {
      setErrorMessageAuth(error?.message || generalErrorMessage);
      return { success: false };
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      setErrorMessageAuth(null);
      await signIn({
        username: email,
        password,
      });
      router.push("/");
    } catch (error: any) {
      if (
        error?.name === "UserNotConfirmedException" ||
        error?.code === "UserNotConfirmedException"
      ) {
        try {
          await resendSignUpCode({ username: email });
        } catch (_resendError) {
          // Ignore resend errors and continue with verification routing.
        }

        setErrorMessageAuth(
          "Your account is not verified yet. Enter the verification code from your email."
        );
        router.push(`/signup?verify=1&email=${encodeURIComponent(email)}`);
        return;
      }

      setErrorMessageAuth(error?.message || generalErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const updateProfile = async (profile: {
    username?: string;
    bio?: string;
    website?: string;
    avatar_url?: string;
    absolute_avatar_url?: string;
    instagram_url?: string;
    twitter_url?: string;
    spotify_url?: string;
    soundcloud_url?: string;
  }) => {
    try {
      setIsLoading(true);
      setErrorMessageAuth(null);

      const data = await apiRequest("/profiles", {
        method: "PUT",
        body: profile,
      });

      applyProfileToState(data);
    } catch (error: any) {
      setErrorMessageAuth(error?.message || generalErrorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOauthSignIn = async (provider: string) => {
    setErrorMessageAuth(null);
    const cognitoProvider = providerToCognito(provider);
    return signInWithRedirect({ provider: cognitoProvider });
  };

  const handleSignOut = async () => {
    await signOut();
    setSession(null);
    setUsername("");
    setBio("");
    setWebsite("");
    setAvatarUrl("");
    setInstagram_url("");
    setTwitter_url("");
    setSpotify_url("");
    setSoundcloud_url("");
    setAbsoluteAvatar_UrlAuth("");
    setUserRoles([]);
    router.push("/");
  };

  const requestPasswordReset = async (email: string) => {
    await resetPassword({ username: email });
  };

  const confirmPasswordResetFlow = async (
    email: string,
    confirmationCode: string,
    newPassword: string
  ) => {
    await confirmResetPassword({
      username: email,
      confirmationCode,
      newPassword,
    });
  };

  const value: AuthContextType = useMemo(
    () => ({
      signUp: ({ email, password }) =>
        signUp({
          username: email,
          password,
          options: {
            userAttributes: { email },
          },
        }),
      signInOauth: handleOauthSignIn,
      signOut: handleSignOut,
      errorMessageAuth,
      setErrorMessageAuth,
      registerUser,
      handleLogin,
      session,
      getProfile,
      username,
      setUsername,
      bio,
      setBio,
      website,
      setWebsite,
      avatar_url,
      setAvatarUrl,
      updateProfile,
      isLoading,
      setIsLoading,
      instagram_url,
      setInstagram_url,
      twitter_url,
      setTwitter_url,
      spotify_url,
      setSpotify_url,
      soundcloud_url,
      setSoundcloud_url,
      absoluteAvatar_urlAuth,
      userRoles,
      requestPasswordReset,
      confirmPasswordReset: confirmPasswordResetFlow,
    }),
    [
      errorMessageAuth,
      session,
      username,
      bio,
      website,
      avatar_url,
      isLoading,
      instagram_url,
      twitter_url,
      spotify_url,
      soundcloud_url,
      absoluteAvatar_urlAuth,
      userRoles,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {isInitialized ? children : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
