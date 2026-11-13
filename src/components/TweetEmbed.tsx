"use client";

import { Tweet } from "react-tweet";

export default function TweetEmbed({ id }: { id: string }) {
  return (
    <div className="w-full max-w-[550px] [&_.react-tweet-theme]:!bg-transparent [&_.react-tweet-theme]:[--tweet-bg-color:transparent]">
      <Tweet id={id} />
    </div>
  );
}
