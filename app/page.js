'use client';

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SongFeed from "../components/SongFeed";
import { Container, Row, Col, Alert } from "react-bootstrap";

export default function HomePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const verifyEmailParam = searchParams.get("verifyEmail");
  const [showVerifyBanner, setShowVerifyBanner] = useState(false);

  useEffect(() => {
    if (verifyEmailParam === "1") {
      setShowVerifyBanner(true);
      router.replace("/", { scroll: false });
    }
  }, [verifyEmailParam, router]);

  return (
    <Container fluid="md">
      {showVerifyBanner && (
        <Alert
          variant="success"
          className="mt-4"
          onClose={() => setShowVerifyBanner(false)}
          dismissible
        >
          <Alert.Heading>Check your inbox</Alert.Heading>
          <p>
            We sent a verification code to your email. Enter that code on the
            signup screen to finish activating your account.
          </p>
        </Alert>
      )}
      <Row>
        <Col>
          <SongFeed profilePage={false} />
        </Col>
      </Row>
    </Container>
  );
}
