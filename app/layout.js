import { Albert_Sans } from "next/font/google";
import "./globals.css";

const albertSans = Albert_Sans({
  variable: "--font-albert-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "GAM Assurance",
  description: "GAM Assurance",
  
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${albertSans.variable} font-(family-name:--font-albert-sans) antialiased`}>
        {children}
      </body>
    </html>
  );
}