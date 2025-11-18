'use client';

import SongFeed from "../components/SongFeed";
import { Container, Row, Col } from "react-bootstrap";

export default function HomePage() {
  return (
    <Container fluid="md">
      <Row>
        <Col>
          <SongFeed profilePage={false} />
        </Col>
      </Row>
    </Container>
  );
}
