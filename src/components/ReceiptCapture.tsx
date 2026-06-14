"use client";

import { useRef, useState } from "react";
import { useOCRQueue } from "./OCRQueue";

export default function ReceiptCapture() {
  const { enqueue } = useOCRQueue();
  const fileRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [queuing, setQueuing] = useState(false);
  const [queued, setQueued] = useState(false);

  async function getLocation(): Promise<
    { latitude: number; longitude: number; address?: string } | undefined
  > {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(undefined);
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const { latitude, longitude } = pos.coords;
          let address: string | undefined;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
            );
            const data = await res.json();
            address =
              data.display_name?.split(",").slice(0, 2).join(", ") ?? undefined;
          } catch {
            // ignora erro de geocoding
          }
          resolve({ latitude, longitude, address });
        },
        () => resolve(undefined),
        { timeout: 4000, maximumAge: 60000 }
      );
    });
  }

  async function handleCamera() {
    const location = await getLocation();
    // Salva a localização para usar após o usuário tirar a foto
    sessionStorage.setItem(
      "__notinha_location",
      location ? JSON.stringify(location) : ""
    );
    fileRef.current?.click();
  }

  async function handleFileSelected(file: File, fromCamera: boolean) {
    setQueuing(true);

    let location:
      | { latitude: number; longitude: number; address?: string }
      | undefined;

    if (fromCamera) {
      const stored = sessionStorage.getItem("__notinha_location");
      if (stored) {
        try {
          location = JSON.parse(stored);
        } catch {
          // ignora
        }
        sessionStorage.removeItem("__notinha_location");
      }
    } else {
      // Tenta ler EXIF da galeria
      try {
        const { default: exifr } = await import("exifr");
        const gps = await exifr.gps(file);
        if (gps?.latitude && gps?.longitude) {
          let address: string | undefined;
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${gps.latitude}&lon=${gps.longitude}&format=json`
            );
            const data = await res.json();
            address =
              data.display_name?.split(",").slice(0, 2).join(", ") ??
              undefined;
          } catch {
            // ignora
          }
          location = { latitude: gps.latitude, longitude: gps.longitude, address };
        }
      } catch {
        // exifr pode não funcionar com todos os formatos
      }
    }

    enqueue({ file, location });
    setQueuing(false);
    setQueued(true);
    setTimeout(() => {
      setQueued(false);
      setOpen(false);
    }, 1200);
  }

  function handleText() {
    if (!text.trim()) return;
    enqueue({ text: text.trim() });
    setText("");
    setQueued(true);
    setTimeout(() => {
      setQueued(false);
      setOpen(false);
    }, 1200);
  }

  return (
    <>
      <div className="fixed inset-x-0 bottom-16 z-20 mx-auto max-w-lg px-4 pb-2">
        <button
          onClick={() => setOpen(true)}
          className="w-full rounded-xl bg-stamp py-4 text-lg font-extrabold text-paper shadow-lg shadow-black/40 active:scale-[0.99]"
        >
          + Anotar gasto
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-t-2xl bg-ink-soft p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold">Novo gasto</h2>
              <button
                onClick={() => {
                  setOpen(false);
                  setText("");
                }}
                className="text-sm underline"
              >
                Fechar
              </button>
            </div>

            {queued ? (
              <div className="my-8 text-center">
                <p className="text-ok font-bold text-lg">
                  ✓ Adicionado à fila!
                </p>
                <p className="mt-1 text-sm text-paper/60">
                  Processando em background…
                </p>
              </div>
            ) : (
              <>
                <div className="mt-4 flex gap-2">
                  <button
                    onClick={handleCamera}
                    disabled={queuing}
                    className="flex-1 rounded-xl border-2 border-dashed border-paper/30 py-8 text-center font-bold disabled:opacity-50"
                  >
                    📷 Câmera
                  </button>
                  <button
                    onClick={() => galleryRef.current?.click()}
                    disabled={queuing}
                    className="flex-1 rounded-xl border-2 border-dashed border-paper/30 py-8 text-center font-bold disabled:opacity-50"
                  >
                    🖼️ Galeria
                  </button>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f, true);
                    e.target.value = "";
                  }}
                />
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelected(f, false);
                    e.target.value = "";
                  }}
                />

                <p className="my-3 text-center text-xs uppercase tracking-widest text-paper/50">
                  ou descreve aí
                </p>

                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={2}
                  placeholder="ex: almoço no Kilograma, pix, 38 reais"
                  className="w-full rounded-md bg-ink px-3 py-3 text-paper outline-none placeholder:text-paper/30"
                />
                <button
                  onClick={handleText}
                  disabled={queuing || !text.trim()}
                  className="mt-2 w-full rounded-md bg-paper py-3 font-bold text-print disabled:opacity-40"
                >
                  {queuing ? "Enviando…" : "Anotar"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
