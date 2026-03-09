import { Amplify } from "aws-amplify";

const userPoolId = process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID;
const userPoolClientId = process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID;
const cognitoDomain = (process.env.NEXT_PUBLIC_COGNITO_DOMAIN || "")
  .replace(/^https?:\/\//, "")
  .replace(/\/$/, "");
const redirectSignIn =
  process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_IN ||
  (typeof window !== "undefined" ? window.location.origin : "");
const redirectSignOut =
  process.env.NEXT_PUBLIC_COGNITO_REDIRECT_SIGN_OUT ||
  (typeof window !== "undefined" ? window.location.origin : "");

let configured = false;

export function configureAmplify() {
  if (configured) {
    return;
  }

  if (!userPoolId || !userPoolClientId) {
    return;
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        signUpVerificationMethod: "code",
        loginWith: {
          email: true,
          oauth: cognitoDomain
            ? {
                domain: cognitoDomain,
                scopes: ["openid", "email", "profile"],
                redirectSignIn: [redirectSignIn],
                redirectSignOut: [redirectSignOut],
                responseType: "code",
              }
            : undefined,
        },
      },
    },
  });

  configured = true;
}

configureAmplify();
