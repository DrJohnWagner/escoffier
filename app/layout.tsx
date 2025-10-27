import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Inter } from "next/font/google";
import Header from "@/components/Header";
import "./globals.css";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Escoffier's Digital Guide",
	description: "A modern web implementation of a classic culinary text.",
};

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body
				className={`${inter.className} ${geistSans.variable} ${geistMono.variable}  mx-12 bg-gray-50 text-gray-800`}
			>
				<Header />
				{children}
			</body>
		</html>
	);
}

