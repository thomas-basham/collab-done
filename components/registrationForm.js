"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { confirmSignUp, resendSignUpCode } from "aws-amplify/auth";
import { useAuth } from "../contexts/auth";
import { FaGithub, FaGoogle } from "react-icons/fa";

const initialFormState = {
  email: "",
  emailConfirmation: "",
  password: "",
  passwordConfirmation: "",
};

export default function Form() {
  const { registerUser, errorMessageAuth, signInOauth, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [formState, setFormState] = useState(initialFormState);
  const [awaitingVerification, setAwaitingVerification] = useState(false);
  const [pendingEmail, setPendingEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationMessage, setVerificationMessage] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [formErrors, setFormErrors] = useState({
    email: null,
    password: null,
  });

  useEffect(() => {
    setFormErrors({
      email:
        formState.email &&
        formState.emailConfirmation &&
        formState.email !== formState.emailConfirmation
          ? "Emails must match"
          : null,
      password:
        formState.password &&
        formState.passwordConfirmation &&
        formState.password !== formState.passwordConfirmation
          ? "Passwords must match"
          : null,
    });
  }, [formState]);

  useEffect(() => {
    const verifyParam = searchParams.get("verify");
    const emailParam = searchParams.get("email");

    if (verifyParam === "1" && emailParam) {
      setPendingEmail(emailParam);
      setAwaitingVerification(true);
      setVerificationMessage(
        "Your account needs verification. Enter the code from your email."
      );
    }
  }, [searchParams]);

  const handleChange = (field) => (event) => {
    const value = event.target.value;
    setFormState((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleRegister = async (event) => {
    event?.preventDefault();

    if (formErrors.email || formErrors.password) {
      return;
    }

    const result = await registerUser(formState.email, formState.password);

    if (result?.success) {
      setPendingEmail(formState.email);
      setAwaitingVerification(true);
      setVerificationMessage(
        "Account created. Enter the verification code from your email."
      );
      router.replace(`/signup?verify=1&email=${encodeURIComponent(formState.email)}`);
      setFormState(initialFormState);
    }
  };

  const handleVerifyCode = async (event) => {
    event?.preventDefault();
    if (!pendingEmail) {
      setVerificationMessage("Enter the email address for the account you created.");
      return;
    }
    try {
      setIsConfirming(true);
      setVerificationMessage("");

      await confirmSignUp({
        username: pendingEmail,
        confirmationCode: verificationCode,
      });

      setVerificationMessage("Email verified. You can sign in now.");
      router.push("/login");
    } catch (error) {
      setVerificationMessage(error?.message || "Unable to verify code.");
    } finally {
      setIsConfirming(false);
    }
  };

  const handleResendCode = async () => {
    try {
      await resendSignUpCode({
        username: pendingEmail,
      });
      setVerificationMessage("A new verification code was sent.");
    } catch (error) {
      setVerificationMessage(error?.message || "Unable to resend code.");
    }
  };

  const disableSubmit =
    isLoading ||
    !!formErrors.email ||
    !!formErrors.password ||
    !formState.email ||
    !formState.password;

  return (
    <div className="col-10 col-md-8 col-lg-6 form-widget modern-card">
      <h1 className="header mb-1">Create your account</h1>
      <p className="description mb-4">
        {awaitingVerification
          ? "Enter the email verification code to finish setup."
          : "You’ll receive a verification code by email to finish setup."}
      </p>

      {errorMessageAuth !=
      "There is already an account associated with this email address. Forgot your password? Click here" ? (
        <p className="text-danger text-center">{errorMessageAuth}</p>
      ) : (
        <Link href="/forgot-password">{errorMessageAuth}</Link>
      )}

      {!awaitingVerification && (
        <form className="modern-form">
          <label>Email</label>
          <input
            className="inputField"
            type="email"
            placeholder="Email"
            autoComplete="off"
            value={formState.email}
            onChange={handleChange("email")}
          />
          <input
            className="inputField"
            type="email"
            placeholder="Confirm Email"
            autoComplete="off"
            value={formState.emailConfirmation}
            onChange={handleChange("emailConfirmation")}
          />
          <small>{formErrors.email}</small>

          <label className="mt-3">Password</label>
          <input
            className="inputField"
            type="password"
            value={formState.password}
            placeholder="Password"
            autoComplete="off"
            onChange={handleChange("password")}
          />
          <input
            className="inputField"
            type="password"
            value={formState.passwordConfirmation}
            autoComplete="off"
            placeholder="Confirm Password"
            onChange={handleChange("passwordConfirmation")}
          />
          <small>{formErrors.password}</small>

          <button
            type="button"
            className="button block mt-4"
            disabled={disableSubmit}
            onClick={handleRegister}
          >
            <span>{isLoading ? "Registering..." : "Create account"}</span>
          </button>

          <button
            type="button"
            className="button block mt-2"
            onClick={() => {
              setAwaitingVerification(true);
              setVerificationMessage("Enter your email and verification code.");
            }}
          >
            Already have a verification code?
          </button>
        </form>
      )}

      {awaitingVerification && (
        <form className="modern-form" onSubmit={handleVerifyCode}>
          <label>Email</label>
          <input
            className="inputField"
            type="email"
            value={pendingEmail}
            onChange={(event) => setPendingEmail(event.target.value)}
          />

          <label className="mt-3">Verification Code</label>
          <input
            className="inputField"
            type="text"
            placeholder="123456"
            autoComplete="off"
            autoFocus
            value={verificationCode}
            onChange={(event) => setVerificationCode(event.target.value)}
          />

          {verificationMessage && (
            <p className="text-center mt-2">{verificationMessage}</p>
          )}

          <button
            type="submit"
            className="button block mt-4"
            disabled={isConfirming || !verificationCode || !pendingEmail}
          >
            <span>{isConfirming ? "Verifying..." : "Verify email"}</span>
          </button>

          <button
            type="button"
            className="button block mt-2"
            onClick={handleResendCode}
          >
            Resend code
          </button>

          <button
            type="button"
            className="button block mt-2"
            onClick={() => {
              setAwaitingVerification(false);
              setVerificationCode("");
              setVerificationMessage("");
              router.replace("/signup");
            }}
          >
            Back to create account
          </button>
        </form>
      )}

      {!awaitingVerification && (
        <div className="mt-5">
          <h2 className="header">Or continue with</h2>
          <div className="d-flex justify-content-center gap-3 mt-3">
            <button
              className="button icon-button"
              onClick={() => signInOauth("github")}
            >
              <FaGithub />
            </button>
            <button
              className="button icon-button"
              onClick={() => signInOauth("google")}
            >
              <FaGoogle />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
