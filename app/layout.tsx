import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";
import type { Metadata } from "next";
import Provider from './provider';
import { Inter } from "next/font/google";
import { cn } from "@/lib/utils";
import { Toaster } from '@/components/ui/toast';

const inter = Inter({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Whizboard",
  description: "AI whiteboard workspace",
};

const isClerkConfigured =
  !!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY &&
  !!process.env.CLERK_SECRET_KEY;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const wrappedChildren = (
    <Provider>
      {children}
    </Provider>
  );

  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", inter.variable)}>
      <body style={{ margin: 0, padding: 0 }}>
        {isClerkConfigured ? (
          <ClerkProvider>{wrappedChildren}</ClerkProvider>
        ) : (
          wrappedChildren
        )}
        <Toaster />
      </body>
    </html>
  );
}
