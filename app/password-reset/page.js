'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../../contexts/auth";

export default function PasswordResetPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { confirmPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [requestError, setRequestError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) {
      setEmail(emailParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (password && passwordConfirmation && password !== passwordConfirmation) {
      setPasswordError("Passwords must match");
    } else {
      setPasswordError("");
    }
  }, [password, passwordConfirmation]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (passwordError) {
      return;
    }

    try {
      setIsSubmitting(true);
      setRequestError("");
      await confirmPasswordReset(email, confirmationCode, password);
      router.push("/login");
    } catch (err) {
      setRequestError(err?.message || "Unable to reset password");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="col-6 form-widget">
      <h1 className="header">PASSWORD RESET</h1>
      <p className="description">Enter your email, reset code, and new password</p>
      {requestError && <p className="text-danger">{requestError}</p>}
      <form onSubmit={handleSubmit}>
        <input
          className="inputField"
          type="email"
          value={email}
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          className="inputField"
          type="text"
          value={confirmationCode}
          placeholder="Confirmation Code"
          onChange={(e) => setConfirmationCode(e.target.value)}
          required
        />
        <input
          className="inputField"
          type="password"
          value={password}
          placeholder="New Password"
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <input
          className="inputField"
          type="password"
          value={passwordConfirmation}
          placeholder="Confirm New Password"
          onChange={(e) => setPasswordConfirmation(e.target.value)}
          required
        />
        <small>{passwordError}</small>
        <br />
        <button className="col-12" disabled={!!passwordError || isSubmitting} type="submit">
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
