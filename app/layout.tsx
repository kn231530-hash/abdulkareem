import type { Metadata } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Nayef Food",description:"Fresh food and easy ordering"};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}