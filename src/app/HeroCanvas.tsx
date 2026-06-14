"use client";

import dynamic from "next/dynamic";

const ReceiptCanvas = dynamic(() => import("@/components/ReceiptCanvas"), {
  ssr: false,
  loading: () => <div className="h-full w-full" />,
});

export default function HeroCanvas() {
  return <ReceiptCanvas />;
}
