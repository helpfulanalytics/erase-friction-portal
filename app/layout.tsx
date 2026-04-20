import type { Metadata } from "next";
import { Bricolage_Grotesque, Outfit } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

// NOTE: Google Sans Flex is not yet in all next/font/google versions.
// Plus_Jakarta_Sans is the designed substitute with identical weights.
// When next/font adds Google_Sans_Flex, replace Plus_Jakarta_Sans here.

const headingFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-heading",
  display: "swap",
});

const bodyFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

const uiFont = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ui",
  display: "swap",
});

const headingAltFont = Outfit({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-heading-alt",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Erase Friction Client Portal",
  description: "Your projects, documents, and updates — all in one place.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${headingFont.variable} ${headingAltFont.variable} ${bodyFont.variable} ${uiFont.variable}`}
      >
        <TooltipProvider delay={300}>{children}</TooltipProvider>
      </body>
    </html>
  );
}
