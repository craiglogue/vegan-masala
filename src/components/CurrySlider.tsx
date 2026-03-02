"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

type Slide = { src: string; alt: string };

type Props = {
  images: Slide[];
  intervalMs?: number;
};

export default function CurrySlider({ images, intervalMs = 3500 }: Props) {
  const total = images.length;

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [dragging, setDragging] = useState(false);

  const startXRef = useRef<number | null>(null);
  const deltaXRef = useRef(0);

  const prevIndex = useMemo(() => (index - 1 + total) % total, [index, total]);
  const nextIndex = useMemo(() => (index + 1) % total, [index, total]);

  useEffect(() => {
    if (!total || paused || dragging) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % total);
    }, intervalMs);
    return () => clearInterval(id);
  }, [total, intervalMs, paused, dragging]);

  const goPrev = () => setIndex((i) => (i - 1 + total) % total);
  const goNext = () => setIndex((i) => (i + 1) % total);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setDragging(true);
    startXRef.current = e.clientX;
    deltaXRef.current = 0;
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || startXRef.current == null) return;
    deltaXRef.current = e.clientX - startXRef.current;
  };

  const onPointerUp = () => {
    setDragging(false);
    const dx = deltaXRef.current;
    startXRef.current = null;
    deltaXRef.current = 0;

    if (dx > 60) goPrev();
    else if (dx < -60) goNext();
  };

  const CARD_W = 340;  // wider
  const CARD_H = 300;

  const SIDE_SCALE = 0.85;
  const SIDE_OFFSET = 260;

  return (
    <div
      className="mx-auto w-full max-w-[700px] select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="relative h-[340px] w-full overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      >
        {/* LEFT */}
        <div
          className="absolute left-1/2 top-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all duration-700 ease-in-out"
          style={{
            width: CARD_W,
            height: CARD_H,
            transform: `translate(-50%, -50%) translateX(-${SIDE_OFFSET}px) scale(${SIDE_SCALE})`,
            opacity: 0.6,
            filter: "blur(4px)",
          }}
        >
          <Image src={images[prevIndex].src} alt={images[prevIndex].alt} fill className="object-cover" />
        </div>

        {/* CENTER */}
        <div
          className="absolute left-1/2 top-1/2 z-30 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all duration-700 ease-in-out"
          style={{
            width: CARD_W,
            height: CARD_H,
            transform: "translate(-50%, -50%) scale(1)",
            boxShadow:
              "0 15px 40px rgba(0,0,0,0.2), 0 0 30px color-mix(in srgb, var(--brand-green) 50%, transparent)",
          }}
        >
          <Image src={images[index].src} alt={images[index].alt} fill className="object-cover" />
        </div>

        {/* RIGHT */}
        <div
          className="absolute left-1/2 top-1/2 rounded-xl border border-[var(--border)] bg-[var(--surface)] overflow-hidden transition-all duration-700 ease-in-out"
          style={{
            width: CARD_W,
            height: CARD_H,
            transform: `translate(-50%, -50%) translateX(${SIDE_OFFSET}px) scale(${SIDE_SCALE})`,
            opacity: 0.6,
            filter: "blur(4px)",
          }}
        >
          <Image src={images[nextIndex].src} alt={images[nextIndex].alt} fill className="object-cover" />
        </div>
      </div>
    </div>
  );
}