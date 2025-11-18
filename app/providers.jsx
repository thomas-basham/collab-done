'use client';

import Layout from "../components/layout";
import { AuthProvider } from "../contexts/auth";
import { RealTimeProvider } from "../contexts/RealTime";
import GithubCorner from "react-github-corner";
import ThemeProvider from "react-bootstrap/ThemeProvider";

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <RealTimeProvider>
        <ThemeProvider
          breakpoints={["xxxl", "xxl", "xl", "lg", "md", "sm", "xs", "xxs"]}
          minBreakpoint="s"
        >
          <Layout>{children}</Layout>
          <GithubCorner href="https://github.com/Thomas-Basham/collab-done" />
        </ThemeProvider>
      </RealTimeProvider>
    </AuthProvider>
  );
}
