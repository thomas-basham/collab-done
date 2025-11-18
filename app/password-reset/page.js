'use client';

import { useState, useEffect } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";
import { useAuth } from "../../contexts/auth";

export default function PasswordResetPage() {
  const router = useRouter();
  const { session } = useAuth();

  const [password, setPassword] = useState(null);
  const [passwordConfirmation, setPasswordConfirmation] = useState(null);
  const [passwordError, setPasswordError] = useState(null);

  useEffect(() => {
    if (password !== passwordConfirmation) {
      setPasswordError("Passwords must match");
    } else {
      setPasswordError(null);
    }
  }, [password, passwordConfirmation]);

  useEffect(() => {
    if (!session?.user) {
      router.push("/login");
    }
  }, [session, router]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        throw error;
      }
      router.push("/profile");
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="col-6 form-widget">
      <h1 className="header">PASSWORD RESET</h1>
      <p className="description">Change Password</p>
      <form onSubmit={(e) => handleSubmit(e)}>
        <input
          className="inputField"
          type="password"
          value={password}
          placeholder="Password"
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="inputField"
          type="password"
          value={passwordConfirmation}
          placeholder="Confirm Password"
          onChange={(e) => setPasswordConfirmation(e.target.value)}
        />
        <small>{passwordError}</small>
        <br />
        <button
          className="col-12"
          disabled={
            passwordError ||
            session?.user?.email == process.env.NEXT_PUBLIC_TEST_EMAIL
          }
          type="submit"
        >
          Submit
        </button>
      </form>
    </div>
  );
}
