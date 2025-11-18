import "../styles/globals.css";
import Providers from "./providers";

export const metadata = {
  title: "Collab Done",
  description: "Connecting musicians, finishing collabs",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    title: "Collab Done",
    description: "Connecting musicians, finishing collabs",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.2.0-beta1/dist/css/bootstrap.min.css"
          integrity="sha384-0evHe/X+R7YkIZDRvuzKMRqM+OrBnVFBL6DOitfPri4tjfHxaWutUpFmBp4vmVor"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
