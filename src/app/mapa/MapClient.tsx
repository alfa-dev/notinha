"use client";

import dynamic from "next/dynamic";
import type { Expense } from "@/lib/types";

const MapView = dynamic(() => import("@/components/MapView"), { ssr: false });

export default function MapClient({ expenses }: { expenses: Expense[] }) {
  return <MapView expenses={expenses} />;
}
