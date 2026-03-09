'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/auth";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { requestPasswordReset } = useAuth();

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setError("");
      setMessage("");
      await requestPasswordReset(email);
      setMessage("We sent a reset code to your email.");
      router.push(`/password-reset?email=${encodeURIComponent(email)}`);
    } catch (err) {
      setError(err?.message || "Unable to start password reset");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="col-6 form-widget">
      <h1 className="header">
        We&apos;ll send you a code to reset your password.
      </h1>
      <br />
      <p className="description">Reset Password</p>
      {message && <p className="text-success">{message}</p>}
      {error && <p className="text-danger">{error}</p>}
      <form onSubmit={handleSubmit}>
        <input
          className="inputField"
          type="email"
          value={email}
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <button className="col-12" type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Submitting..." : "Submit"}
        </button>
      </form>
    </div>
  );
}
