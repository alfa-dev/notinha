"use client";

import { useEffect } from "react";
import "leaflet/dist/leaflet.css";
import type { Expense } from "@/lib/types";
import { formatBRL } from "@/lib/categories";

type Props = {
  expenses: Expense[];
};

export default function MapView({ expenses }: Props) {
  const withLocation = expenses.filter(
    (e) => e.latitude != null && e.longitude != null
  );

  useEffect(() => {
    if (typeof window === "undefined" || withLocation.length === 0) return;

    let map: import("leaflet").Map | null = null;

    (async () => {
      const L = (await import("leaflet")).default;

      // Fix default icon
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        iconUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        shadowUrl:
          "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const container = document.getElementById("map-container");
      if (!container || (container as HTMLElement & { _leaflet_id?: number })._leaflet_id) return;

      map = L.map("map-container");

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution:
          '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const bounds: [number, number][] = [];

      withLocation.forEach((e) => {
        const lat = e.latitude!;
        const lng = e.longitude!;
        bounds.push([lat, lng]);

        const popup = `
          <div style="font-family:sans-serif;min-width:160px">
            <b>${e.description}</b><br/>
            ${formatBRL(e.amount_cents)}<br/>
            <small style="color:#666">${e.date}${e.address ? `<br/>${e.address}` : ""}</small>
          </div>
        `;

        L.marker([lat, lng]).addTo(map!).bindPopup(popup);
      });

      if (bounds.length === 1) {
        map.setView(bounds[0], 15);
      } else if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [40, 40] });
      }
    })();

    return () => {
      map?.remove();
    };
  }, [withLocation]);

  if (withLocation.length === 0) {
    return (
      <div className="mt-6 rounded-xl bg-ink-soft px-5 py-12 text-center text-paper/60">
        <p className="text-lg">📍</p>
        <p className="mt-2 text-sm">
          Nenhum gasto com localização ainda.
          <br />
          Use a câmera ao registrar gastos para capturar o local.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <p className="mb-2 text-sm text-paper/60">
        {withLocation.length} {withLocation.length === 1 ? "gasto" : "gastos"} com localização
      </p>
      <div
        id="map-container"
        className="h-96 w-full rounded-xl overflow-hidden"
        style={{ background: "#1a1d24" }}
      />
    </div>
  );
}
