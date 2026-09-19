"use client";

import Image from "next/image";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type HeroSlideshowProps = {
  /** Paths under /public. The first loads eagerly and is the LCP element. */
  images: string[];
  /** Seconds each photograph is held. */
  intervalSeconds?: number;
  sizes?: string;
  className?: string;
};

/**
 * The hero photographs, crossfading.
 *
 * **It stops entirely under `prefers-reduced-motion`, showing only the first
 * image.** A large, slow, endlessly repeating crossfade behind text is exactly
 * what WCAG 2.2.2 exists for, and unlike a scroll reveal there is no user
 * action that ends it. So the timer never starts, rather than being paused —
 * an animation that can restart is not the same promise.
 *
 * **Every image is stacked and only opacity changes.** The obvious
 * implementation — mount the current one over a fixed base — flashes the base
 * image on every transition after the first, because for a moment neither the
 * outgoing nor the incoming photograph is fully opaque. Stacking means the two
 * frames blend into each other and nothing else is ever visible between them.
 *
 * Seven seconds, not five: these are portraits of people rather than a room,
 * and a face that swaps while you are still reading the headline is
 * distracting in a way an empty interior is not.
 */
export function HeroSlideshow({
  images,
  intervalSeconds = 7,
  sizes = "100vw",
  className,
}: HeroSlideshowProps) {
  const reduceMotion = useReducedMotion();
  const [index, setIndex] = useState(0);
  /**
   * Whether the second photograph is allowed to mount yet.
   *
   * Every frame is absolutely positioned inside the viewport, so lazy loading
   * defers nothing — the browser counts all of them as visible and fetches the
   * lot before first paint. Mounting all three cost 0.7s of LCP, measured, for
   * two images nobody sees for another seven seconds.
   *
   * One boolean rather than a running count, because a count would have to
   * chase `index` from inside an effect, and setting state synchronously in an
   * effect triggers a cascading render — which is exactly what the lint rule
   * that caught the first attempt is there to prevent. How many frames are
   * mounted is a function of what is showing, so it is derived below rather
   * than stored.
   */
  const [primed, setPrimed] = useState(false);

  const shouldRotate = !reduceMotion && images.length > 1;

  /**
   * One frame until the page has painted, then one ahead of what is showing.
   * By the time a frame is displayed it has been in the DOM for seconds, so
   * the crossfade never waits on a network request.
   *
   * ## `primed` is checked first, and that ordering is load-bearing
   *
   * This read `shouldRotate ? ... : 1`, which made the very first render depend
   * on `useReducedMotion()` — and that hook does not agree with itself across
   * the server/client boundary. On the server there is no media query, so it
   * answers false and `shouldRotate` is true, and the server sends **two**
   * frames. On a reduced-motion machine the client answers true on its first
   * render and mounts **one**. React then hydrates a subtree whose child count
   * does not match what the server sent.
   *
   * Gating on `primed` fixes it by construction: `primed` is false on the
   * server and false on the client's first render, because only an effect
   * raises it and effects do not run during hydration. Both sides render
   * exactly one frame, and the reduced-motion branch applies from the next
   * render on, where the two are free to differ.
   *
   * It also sharpens the optimisation this field was added for: first paint is
   * now always a single image rather than two, whatever the motion preference.
   *
   * Under reduced motion `primed` stays false permanently — the effect that
   * raises it returns early — so the hero correctly stays one still photograph.
   */
  const mountedCount = primed && shouldRotate ? Math.min(images.length, Math.max(2, index + 2)) : 1;

  useEffect(() => {
    if (!shouldRotate) return;

    const timer = setInterval(
      () => setIndex((current) => (current + 1) % images.length),
      intervalSeconds * 1000,
    );

    return () => clearInterval(timer);
  }, [shouldRotate, images.length, intervalSeconds]);

  // Let the first paint finish before the second photograph is fetched.
  useEffect(() => {
    if (!shouldRotate) return;
    const idle = setTimeout(() => setPrimed(true), 1200);
    return () => clearTimeout(idle);
  }, [shouldRotate]);

  if (images.length === 0) return null;

  return (
    <div className={cn("relative overflow-hidden", className)}>
      {images.slice(0, mountedCount).map((src, i) => (
        <motion.div
          key={src}
          className="absolute inset-0"
          // The first frame is opaque from the start rather than animating in,
          // so the hero is a photograph on first paint instead of fading up
          // from black while somebody is trying to read the headline.
          initial={false}
          animate={{ opacity: i === index ? 1 : 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
        >
          <Image
            src={src}
            // Decorative: the headline over it carries the meaning, and a
            // description of each photograph read out in turn would be noise.
            alt=""
            fill
            priority={i === 0}
            sizes={sizes}
            className="object-cover"
          />
        </motion.div>
      ))}
    </div>
  );
}
