import "./globals.css";
import { Inter } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { EsbuildProvider } from "@/components/esbuild-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Chat With Canvas",
  description: "Chat interface with live React component canvas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <EsbuildProvider>
            {children}
          </EsbuildProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}