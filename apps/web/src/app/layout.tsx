import type { Metadata } from "next";
import "../styles/globals.scss";
import "calendar-mercury-lab/styles";
import { Providers } from "./providers";

const environmentLabel = process.env.NODE_ENV === "production" ? "PRD" : "DEV";

export const metadata: Metadata = {
  title: `[${environmentLabel}] Mercury Lab Household Budget Manager`,
  description: "우리 가계의 흐름을 한눈에",
  icons: { icon: "/household-budget-mercury-lab.png" },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
