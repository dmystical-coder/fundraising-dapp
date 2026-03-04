import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/ui/Providers";
import { Navbar } from "@/components/Navbar";
import { Box } from "@chakra-ui/react";

export const metadata: Metadata = {
  title: "FundStacks | Crowdfunding on Stacks",
  description:
    "Raise funds in STX and sBTC. A warm, approachable crowdfunding platform for the Stacks ecosystem.",
  keywords: ["fundraising", "crowdfunding", "stacks", "STX", "sBTC", "crypto", "blockchain"],
  openGraph: {
    title: "FundStacks | Crowdfunding on Stacks",
    description: "Raise funds in STX and sBTC on the Stacks blockchain.",
    type: "website",
  },
  other: {
    "talentapp:project_verification": "54b550be12306fc6f4bb8e77674b1920460549ab6eaa00401bf1f3b8958bf9a1fe4fb78a43f5c7f87ce2e1065ab970b23963fe7062770545d23eb7e90548eb4a",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <Box minH="100vh" bg="warm.bg">
            <Navbar />
            <Box as="main" py={{ base: 6, md: 10 }}>
              {children}
            </Box>
          </Box>
        </Providers>
      </body>
    </html>
  );
}
