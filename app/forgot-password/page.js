'use client';

import { useState } from "react";
import { supabase } from "../../utils/supabaseClient";
import { useRouter } from "next/navigation";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

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
      <h1 className="header">
        We'll send you an email with a link to update your password. Hang tight!
      </h1>
      <br />
      <br />
      <br />
      <p className="description">Reset Password</p>
      <form onSubmit={(e) => handleSubmit(e)}>
        <input
          className="inputField"
          type="email"
          value={email}
          placeholder="Email"
          onChange={(e) => setEmail(e.target.value)}
        />

        <button className="col-12" type="submit">
          Submit
        </button>
      </form>
    </div>
  );
}
