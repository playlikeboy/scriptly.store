"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ProductScreenshotsProps {
  screenshots: string[];
  productTitle: string;
}

export default function ProductScreenshots({ screenshots, productTitle }: ProductScreenshotsProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const count = screenshots.length;

  const closeModal = useCallback(() => {
    setActiveIndex(null);
    triggerRef.current?.focus();
  }, []);

  const nextImage = useCallback(() => {
    setActiveIndex((i) => (i === null ? i : (i + 1) % count));
  }, [count]);

  const prevImage = useCallback(() => {
    setActiveIndex((i) => (i === null ? i : (i - 1 + count) % count));
  }, [count]);

  const isOpen = activeIndex !== null;

  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeModal();
      if (e.key === "ArrowRight") nextImage();
      if (e.key === "ArrowLeft") prevImage();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, closeModal, nextImage, prevImage]);

  if (count === 0) return null;

  return (
    <>
      <ul className="grid grid-cols-3 gap-2 sm:gap-3" aria-label={`${productTitle} screenshots`}>
        {screenshots.map((src, i) => (
          <li key={src}>
            <button
              type="button"
              onClick={(e) => {
                triggerRef.current = e.currentTarget;
                setActiveIndex(i);
              }}
              className="group relative block aspect-video w-full cursor-zoom-in overflow-hidden rounded-lg bg-secondary"
              aria-label={`Enlarge screenshot ${i + 1} of ${count}`}
            >
              <Image
                src={src}
                alt=""
                fill
                sizes="(max-width: 640px) 33vw, (max-width: 1024px) 30vw, 220px"
                loading="lazy"
                className="object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03]"
              />
            </button>
          </li>
        ))}
      </ul>

      {activeIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${productTitle} screenshot ${activeIndex + 1} of ${count}`}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/95 p-4 animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <button
            ref={closeRef}
            type="button"
            className="absolute right-4 top-4 flex size-10 items-center justify-center rounded-[10px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              closeModal();
            }}
            aria-label="Close preview"
          >
            <X className="size-5" strokeWidth={1.75} />
          </button>

          <img
            src={screenshots[activeIndex]}
            alt={`${productTitle} screenshot ${activeIndex + 1}`}
            className="max-h-[80vh] max-w-full rounded-xl object-contain shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.25)] sm:max-w-[85vw]"
            decoding="async"
            onClick={(e) => e.stopPropagation()}
          />

          {count > 1 && (
            <div className="mt-4 flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-secondary"
                onClick={prevImage}
                aria-label="Previous screenshot"
              >
                <ChevronLeft className="size-5" strokeWidth={1.75} />
              </button>
              <span className="tabular min-w-12 text-center text-sm text-muted-foreground" aria-live="polite">
                {activeIndex + 1} / {count}
              </span>
              <button
                type="button"
                className="flex size-10 items-center justify-center rounded-[10px] border border-border bg-card text-foreground transition-colors hover:bg-secondary"
                onClick={nextImage}
                aria-label="Next screenshot"
              >
                <ChevronRight className="size-5" strokeWidth={1.75} />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
