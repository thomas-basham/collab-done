import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "../contexts/auth";
import { FaGithub, FaGoogle, FaSpotify } from "react-icons/fa";

export default function Form() {
  const { registerUser, errorMessageAuth, signInOauth } = useAuth();

  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [emailConfirmation, setEmailConfirmation] = useState("");
  const [emailError, setEmailError] = useState("");

  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [passwordError, setPasswordError] = useState("");

  useEffect(() => {
    if (email != emailConfirmation) {
      setEmailError("Emails must match");
    } else setEmailError(null);
    if (password != passwordConfirmation) {
      setPasswordError("Passwords must match");
    } else setPasswordError(null);
  });

  return (
    <div className="col-6 form-widget">
      <h1 className="header">
        Register here, then check your email for the login link.
      </h1>
      <p className="description">Register</p>

      <div>
        <input
          className="inputField"
          type="email"
          placeholder="Email"
          autoComplete="off"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="inputField"
          type="email"
          placeholder="Confirm Email"
          autoComplete="off"
          value={emailConfirmation}
          onChange={(e) => setEmailConfirmation(e.target.value)}
        />
        <small>{emailError}</small>
        <br></br>
        <br></br>
        <input
          className="inputField"
          type="password"
          value={password}
          placeholder="Password"
          autoComplete="off"
          onChange={(e) => setPassword(e.target.value)}
        />
        <input
          className="inputField"
          type="password"
          value={passwordConfirmation}
          autoComplete="off"
          placeholder="Confirm Password"
          onChange={(e) => setPasswordConfirmation(e.target.value)}
        />
        <small>{passwordError}</small>
      </div>
      {errorMessageAuth !=
      "There is already an account associated with this email address. Forgot your password? Click here" ? (
        <p className="text-danger text-center">{errorMessageAuth}</p>
      ) : (
        <Link href="/forgot-password">{errorMessageAuth}</Link>
      )}

      <div>
        <button
          onClick={(e) => {
            e.preventDefault();
            registerUser(email, password);
          }}
          className="button block"
          disabled={loading || emailError || passwordError}
        >
          <span>{loading ? "Loading" : "Register"}</span>
        </button>
      </div>
      <br></br>
      <br></br>
      <h1 className="header">Or you can register with socials, here</h1>
      <br></br>
      <br></br>
      <button className="col-2 " onClick={() => signInOauth("spotify")}>
        <FaSpotify />
      </button>
      <button className="col-2 " onClick={() => signInOauth("github")}>
        <FaGithub />
      </button>
      <button className="col-2 " onClick={() => signInOauth("google")}>
        <FaGoogle />
      </button>
    </div>
  );
}
