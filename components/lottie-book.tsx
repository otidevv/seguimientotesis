"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

export function LottieBook({ className }: { className?: string }) {
  return (
    <DotLottieReact
      src="https://lottie.host/43a12aed-b08a-46ec-ab32-ff4ea10f2c69/5Kon0IQU8A.lottie"
      loop
      autoplay
      className={className}
    />
  );
}

export function LottieCta({ className }: { className?: string }) {
  return (
    <DotLottieReact
      src="https://lottie.host/72a1f016-7c2f-4e71-a1d8-c7264d2f0300/OPvp3E6ypQ.lottie"
      loop
      autoplay
      className={className}
    />
  );
}
