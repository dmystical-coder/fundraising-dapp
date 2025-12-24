import type { Metadata } from "next";
import { Inter, JetBrains_Mono, DM_Sans } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/ui/Providers";
import { Navbar } from "@/components/Navbar";
import { Box } from "@chakra-ui/react";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dm-sans",
  weight: ["400", "500", "600", "700"],
});

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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} ${dmSans.variable}`}>
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
