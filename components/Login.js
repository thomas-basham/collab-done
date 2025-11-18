import { useState } from "react";
import { useAuth } from "../contexts/auth";
import { FaGithub, FaGoogle, FaSpotify } from "react-icons/fa";
export default function Login() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { handleLogin, errorMessageAuth, signOut, session, signInOauth } = useAuth();

  return (
    <div className="row flex-center flex ">
      <div className="col-6 form-widget">
        <p className="description">Sign in</p>
        <div>
          <input
            className="inputField"
            id="email"
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            />
          <input
            className="inputField"
            id="password"
            type="password"
            value={password}
            placeholder="Password"
            onChange={(e) => setPassword(e.target.value)}
            />
        </div>
            {errorMessageAuth && <p className="text-danger text-center">{errorMessageAuth}</p>}
        <div>
          <button
            onClick={(e) => {
              e.preventDefault();
              handleLogin(email, password);
            }}
            className="button block"
            disabled={loading}
          >
            <span>{loading ? "Loading" : "sign in"}</span>
          </button>
        </div>
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
    </div>
  );
}
