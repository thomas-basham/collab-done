'use client';

import Auth from "../../components/Login";
import { Container } from "react-bootstrap";
import Link from "next/link";

export default function LoginPage() {
  return (
    <>
      <Container fluid>
        <Auth />
      </Container>
      <Link href="/signup" className="note" style={{ cursor: "pointer" }}>
        If you don't have an account, register here
      </Link>
      <Link
        href="/forgot-password"
        className="note"
        style={{ cursor: "pointer" }}
      >
        Forgot your password? Reset here.
      </Link>
    </>
  );
}
