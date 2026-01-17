"use client";

import Script from "next/script";

export default function Analytics() {
  if (typeof window !== "undefined") {
    const consent = localStorage.getItem("cookie_consent");
    if (consent !== "accepted") return null;
  }

  return (
    <>
      <Script
        src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXX"
        strategy="afterInteractive"
      />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', 'G-XXXXXXX');
        `}
      </Script>
    </>
  );
}
