"use client";

import Image from "next/image";
import { useState } from "react";
import { Play, Image as ImageIcon, Film } from "lucide-react";
import TweetEmbed from "@/components/TweetEmbed";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { cn } from "@/lib/utils";

interface ProductMediaSwitcherProps {
  videoUrl: string | null;
  previewGif: string | null;
  thumbnail: string | null;
  title: string;
}

type MediaTab = "video" | "gif" | "poster";

function isMp4(url: string) {
  const lower = url.toLowerCase();
  return lower.split("?")[0].endsWith(".mp4") || lower.includes(".mp4");
}

export default function ProductMediaSwitcher({
  videoUrl,
  previewGif,
  thumbnail,
  title,
}: ProductMediaSwitcherProps) {
  const hasVideo = !!videoUrl;
  const hasGif = !!previewGif;
  const hasPoster = !!thumbnail;

  const defaultTab: MediaTab = hasVideo ? "video" : hasGif ? "gif" : "poster";
  const [activeTab, setActiveTab] = useState<MediaTab>(defaultTab);
  const [isPlaying, setIsPlaying] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<number>(3 / 2);

  const isTweet = videoUrl?.includes("twitter.com") || videoUrl?.includes("x.com");
  const tweetId = isTweet ? videoUrl?.match(/status\/(\d+)/)?.[1] : null;

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (hasVideo) {
      setAspectRatio(16 / 9);
      return;
    }

    const { naturalWidth, naturalHeight } = e.currentTarget;
    const ratio = naturalWidth / naturalHeight;

    if (ratio && Number.isFinite(ratio)) {
      setAspectRatio(Math.max(0.65, Math.min(ratio, 2)));
    }
  };

  const handleTabChange = (tab: MediaTab) => {
    setActiveTab(tab);
    if (tab !== "video") setIsPlaying(false);
  };

  const optimizedPoster = hasPoster ? (
    <Image
      src={thumbnail!}
      alt={title}
      fill
      sizes="(max-width: 1024px) 100vw, 58vw"
      priority
      fetchPriority="high"
      className="object-contain"
      onLoad={handleImageLoad}
    />
  ) : null;

  const tabs: { id: MediaTab; label: string; icon: typeof Play; show: boolean }[] = [
    { id: "video", label: "Video", icon: Play, show: hasVideo },
    { id: "gif", label: "Demo GIF", icon: Film, show: hasGif },
    { id: "poster", label: "Cover", icon: ImageIcon, show: hasPoster },
  ];
  const visibleTabs = tabs.filter((t) => t.show);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-2xl bg-secondary">
        {activeTab === "video" && videoUrl && (
          tweetId ? (
            <div className="flex min-h-[300px] items-center justify-center p-4 sm:p-6">
              <TweetEmbed id={tweetId} />
            </div>
          ) : !isPlaying ? (
            <AspectRatio ratio={16 / 9}>
              <button
                type="button"
                onClick={() => setIsPlaying(true)}
                className="group absolute inset-0 size-full overflow-hidden focus-visible:outline-offset-[-4px]"
                aria-label={`Play ${title} preview video`}
              >
                {optimizedPoster}
                <span className="absolute inset-0 z-10 bg-foreground/20 transition-colors duration-200 group-hover:bg-foreground/30" />
                <span className="absolute inset-0 z-20 flex items-center justify-center">
                  <span className="flex size-16 items-center justify-center rounded-full bg-background text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.04),0_8px_24px_-12px_rgb(0_0_0/0.3)] transition-transform duration-200 ease-out group-hover:scale-[1.05]">
                    <Play className="size-6 translate-x-0.5 fill-current" strokeWidth={1.75} aria-hidden="true" />
                  </span>
                </span>
              </button>
            </AspectRatio>
          ) : (
            <AspectRatio ratio={16 / 9}>
              {isMp4(videoUrl) ? (
                <video
                  src={videoUrl}
                  controls
                  autoPlay
                  className="absolute inset-0 size-full bg-foreground object-contain"
                  poster={thumbnail || undefined}
                  preload="metadata"
                />
              ) : (
                <iframe
                  src={videoUrl.replace("watch?v=", "embed/").split("&")[0] + "?autoplay=1"}
                  title={title}
                  className="absolute inset-0 size-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              )}
            </AspectRatio>
          )
        )}

        {activeTab === "gif" && previewGif && (
          <AspectRatio ratio={aspectRatio}>
            <div className="absolute inset-0 flex size-full items-center justify-center">
              <img
                src={previewGif}
                alt={`${title} preview`}
                onLoad={handleImageLoad}
                className="relative max-h-full max-w-full object-contain"
                loading="lazy"
                decoding="async"
              />
            </div>
          </AspectRatio>
        )}

        {activeTab === "poster" && thumbnail && (
          <AspectRatio ratio={aspectRatio}>
            <div className="absolute inset-0 size-full">{optimizedPoster}</div>
          </AspectRatio>
        )}

        {!videoUrl && !previewGif && !thumbnail && (
          <AspectRatio ratio={16 / 9}>
            <div className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
              No preview media for this product yet
            </div>
          </AspectRatio>
        )}
      </div>

      {visibleTabs.length > 1 && (
        <div role="group" aria-label="Preview media" className="inline-flex rounded-[10px] bg-secondary p-1">
          {visibleTabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={active}
                onClick={() => handleTabChange(tab.id)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium transition-colors duration-150",
                  active
                    ? "bg-card text-foreground shadow-[0_1px_2px_rgb(0_0_0/0.06)]"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                {tab.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
