// Login.js
import React from "react";
import "./Login.css";
import { useAuth0 } from "@auth0/auth0-react";
import { motion } from "framer-motion";

const Login = () => {
  const { loginWithRedirect } = useAuth0();

  const handleGoogleLogin = () => {
    loginWithRedirect({
      authorizationParams: {
        connection: "google-oauth2",
        redirect_uri: `${window.location.origin}/callback`,
      },
    });
  };

  return (
    <motion.main
      className="login"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.5 }}
    >
      <section className="login__card">
        <header className="login__header">
          <span className="login__logo" aria-hidden="true"></span>
          <h1 className="login__title">KuduDash</h1>
        </header>

        <p className="login__tagline">Less waiting. More eating.</p>
        <p className="login__description">Skip the line. Eat well. Study better.</p>

        <button className="login__button" onClick={handleGoogleLogin}>
          <img
            src="https://cdn-icons-png.flaticon.com/512/2991/2991148.png"
            alt=""
            aria-hidden="true"
            className="login__button-icon"
          />
          Continue with Google
        </button>

        <footer className="login__footer">
          <p>New here or back again? We got you.</p>
        </footer>
      </section>
    </motion.main>
  );
};

export default Login;