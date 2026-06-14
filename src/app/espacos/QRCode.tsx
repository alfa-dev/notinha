"use client";

import { useEffect, useRef } from "react";
import QRCodeLib from "qrcode";

export default function QRCode({ value }: { value: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, value, {
      width: 180,
      color: { dark: "#191c24", light: "#faf7ef" },
    });
  }, [value]);

  return <canvas ref={canvasRef} className="rounded-md" />;
}
