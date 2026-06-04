import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/components/ui/Providers";
import { Navbar } from "@/components/Navbar";
import { AppFooter } from "@/components/AppFooter";
import { Box, ColorModeScript } from "@chakra-ui/react";
import { Toaster } from "sonner";

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
    "talentapp:project_verification": "6dca250bb1c37db4bb30b5e2a4017077aed242fa1bf47d24950b0a3cb29b38dd9a7da05b2b3bd939a845cd1731c59e3461db40fe603055635702acf4ec540594",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ColorModeScript initialColorMode="system" />
        <a className="skip-to-main" href="#main-content">
          Skip to main content
        </a>
        <Providers>
          <Box minH="100vh" bg="bg.canvas" display="flex" flexDirection="column">
            <Navbar />
            <Box
              as="main"
              id="main-content"
              tabIndex={-1}
              pt={0}
              pb={{ base: 6, md: 10 }}
              flex="1"
              aria-label="Main content"
            >
              {children}
            </Box>
            <AppFooter />
          </Box>
        </Providers>
        <Toaster
          richColors
          closeButton
          position="top-right"
          toastOptions={{
            style: {
              borderRadius: "14px",
              border: "1px solid rgba(15,23,43,0.08)",
              fontFamily: "var(--font-inter), 'Inter', sans-serif",
              fontSize: "14px",
            },
          }}
        />
      </body>
    </html>
  );
}
