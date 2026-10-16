"use client";

import { useEffect, useRef } from "react";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

/**
 * A few soap bubbles drifting up the page, which pop when the pointer passes
 * through them.
 *
 * Fixed to the viewport rather than placed in a section, so they cross the
 * whole page as you scroll, and deliberately sparse — a dozen is a flourish,
 * fifty is weather.
 *
 * Canvas rather than DOM nodes: each bubble is several layered gradients, and
 * the pointer is tested against every one of them on every frame. One canvas is
 * one layer for the compositor; a dozen animated elements with backdrop effects
 * would not be.
 *
 * It is decoration, so it never gets in the way: `pointer-events: none` lets
 * clicks, selection and scrolling pass straight through, and the pointer is
 * tracked on `window` instead. It stops entirely when the tab is hidden and
 * when the visitor has asked for less motion.
 */

interface Bubble {
  /** Viewport coordinates, in CSS pixels. */
  x: number;
  y: number;
  r: number;
  /** Upward speed, px per second. */
  speed: number;
  /** Horizontal sway, so they wobble rather than rise like lift shafts. */
  swayAmplitude: number;
  swaySpeed: number;
  swayPhase: number;
  /** Films wobble; this squashes the circle a little, in and out. */
  wobblePhase: number;
  wobbleSpeed: number;
  opacity: number;
  /** Rotates the iridescent banding so no two look alike. */
  hueShift: number;
  /** 0 while whole; counts up to 1 once popped, then the bubble respawns. */
  popping: number;
}

interface Props {
  /** Roughly how many are on screen at once. Keep it small. */
  count?: number;
}

/** How close the pointer must come, on top of the bubble's own radius. */
const POP_MARGIN = 8;
/** Seconds a pop takes to expand and fade. */
const POP_DURATION = 0.45;

/**
 * The colours in a soap film. Real iridescence comes from thin-film
 * interference, which lands in these magenta–cyan–gold bands; a flat white rim
 * is the single biggest reason a drawn bubble reads as a circle instead.
 */
const FILM = [
  { stop: 0.0, color: "255, 190, 240" },
  { stop: 0.3, color: "170, 230, 255" },
  { stop: 0.55, color: "255, 245, 190" },
  { stop: 0.78, color: "190, 255, 220" },
  { stop: 1.0, color: "255, 190, 240" },
];

export function BubbleField({ count = 12 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    let width = 0;
    let height = 0;
    let bubbles: Bubble[] = [];
    let pointerX = Number.NEGATIVE_INFINITY;
    let pointerY = Number.NEGATIVE_INFINITY;

    const random = (min: number, max: number) => min + Math.random() * (max - min);

    const spawn = (y?: number): Bubble => {
      const r = random(14, 46);
      return {
        x: random(r, Math.max(r + 1, width - r)),
        y: y ?? height + r + random(0, height * 0.6),
        r,
        // Smaller bubbles rise faster: lighter, and it stops the field moving
        // as one sheet.
        speed: random(10, 22) * (26 / r),
        swayAmplitude: random(6, 22),
        swaySpeed: random(0.2, 0.5),
        swayPhase: random(0, Math.PI * 2),
        wobblePhase: random(0, Math.PI * 2),
        wobbleSpeed: random(0.8, 1.9),
        opacity: random(0.3, 0.6),
        hueShift: random(0, 1),
        popping: 0,
      };
    };

    const measure = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (bubbles.length === 0) bubbles = Array.from({ length: count }, () => spawn(random(0, height)));
    };

    /**
     * One bubble, built in four passes: the body it refracts through, the film
     * at its rim, a specular highlight, and the dimmer bounce opposite it.
     */
    const drawBubble = (bubble: Bubble) => {
      const popped = bubble.popping > 0;
      const burst = popped ? 1 + bubble.popping * 0.55 : 1;
      const alpha = popped ? bubble.opacity * (1 - bubble.popping) ** 1.5 : bubble.opacity;
      if (alpha <= 0.002) return;

      const x = bubble.x + Math.sin(bubble.swayPhase) * bubble.swayAmplitude;
      const y = bubble.y;
      const r = bubble.r * burst;
      // A film is never quite a circle — it breathes between slightly tall and
      // slightly wide, which is most of what sells it as a membrane.
      const squash = 1 + Math.sin(bubble.wobblePhase) * 0.055;

      context.save();
      context.translate(x, y);
      context.scale(1 / squash, squash);

      // 1. The body. Almost clear in the middle, gathering towards the edge,
      //    because you see through the centre and along the film at the rim.
      const body = context.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
      body.addColorStop(0, `rgba(255, 255, 255, ${alpha * 0.03})`);
      body.addColorStop(0.65, `rgba(255, 255, 255, ${alpha * 0.07})`);
      body.addColorStop(0.9, `rgba(214, 235, 255, ${alpha * 0.22})`);
      body.addColorStop(1, `rgba(255, 255, 255, ${alpha * 0.05})`);
      context.beginPath();
      context.arc(0, 0, r, 0, Math.PI * 2);
      context.fillStyle = body;
      context.fill();

      // 2. The film itself, as a ring of shifting colour. Drawn as arc segments
      //    because a canvas gradient runs along a line, not around a circle.
      context.lineWidth = Math.max(1, r * 0.075);
      const segments = 24;
      for (let i = 0; i < segments; i++) {
        const from = (i / segments) * Math.PI * 2;
        const to = ((i + 1.08) / segments) * Math.PI * 2;
        const t = (i / segments + bubble.hueShift) % 1;
        // Blend between the two film colours this angle falls between.
        let lower = FILM[0];
        let upper = FILM[FILM.length - 1];
        for (let n = 0; n < FILM.length - 1; n++) {
          if (t >= FILM[n].stop && t <= FILM[n + 1].stop) {
            lower = FILM[n];
            upper = FILM[n + 1];
            break;
          }
        }
        const span = upper.stop - lower.stop || 1;
        const mix = (t - lower.stop) / span;
        const colour = mix < 0.5 ? lower.color : upper.color;
        // The rim brightens towards the bottom, where it catches the page.
        const lean = 0.55 + 0.45 * Math.sin(from - Math.PI / 2);
        context.beginPath();
        context.arc(0, 0, r * 0.965, from, to);
        context.strokeStyle = `rgba(${colour}, ${alpha * 0.5 * lean})`;
        context.stroke();
      }

      // A crisper inner edge, so the film has a boundary rather than a glow.
      context.beginPath();
      context.arc(0, 0, r * 0.93, 0, Math.PI * 2);
      context.lineWidth = Math.max(0.6, r * 0.02);
      context.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
      context.stroke();

      // One darker contour on the outside. Everything above is brighter than
      // white, so on a pale section a bubble would otherwise disappear
      // completely — true of real soap, useless on a web page. This is faint
      // enough to pass for shading on the dark panels and is the only thing
      // holding the shape together on the light ones.
      context.beginPath();
      context.arc(0, 0, r * 1.005, 0, Math.PI * 2);
      context.lineWidth = Math.max(0.75, r * 0.028);
      context.strokeStyle = `rgba(74, 104, 150, ${alpha * 0.38})`;
      context.stroke();

      if (!popped) {
        // 3. The specular highlight — the light source, blurred by the film.
        const hx = -r * 0.36;
        const hy = -r * 0.38;
        const hr = r * 0.26;
        const spec = context.createRadialGradient(hx, hy, 0, hx, hy, hr);
        spec.addColorStop(0, `rgba(255, 255, 255, ${alpha * 1.15})`);
        spec.addColorStop(0.45, `rgba(255, 255, 255, ${alpha * 0.4})`);
        spec.addColorStop(1, "rgba(255, 255, 255, 0)");
        context.beginPath();
        context.ellipse(hx, hy, hr * 1.25, hr * 0.85, -0.5, 0, Math.PI * 2);
        context.fillStyle = spec;
        context.fill();

        // 4. The bounce: light that went through and came back off the far
        //    wall, always opposite the highlight and much weaker.
        const bx = r * 0.3;
        const by = r * 0.42;
        const br = r * 0.3;
        const bounce = context.createRadialGradient(bx, by, 0, bx, by, br);
        bounce.addColorStop(0, `rgba(230, 245, 255, ${alpha * 0.4})`);
        bounce.addColorStop(1, "rgba(230, 245, 255, 0)");
        context.beginPath();
        context.arc(bx, by, br, 0, Math.PI * 2);
        context.fillStyle = bounce;
        context.fill();
      }

      context.restore();
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      for (const bubble of bubbles) drawBubble(bubble);
    };

    measure();

    // Reduced motion: draw once and leave it. Still decorative, nothing moves,
    // no frame loop, no popping.
    if (reducedMotion) {
      draw();
      const observer = () => {
        measure();
        draw();
      };
      window.addEventListener("resize", observer);
      return () => window.removeEventListener("resize", observer);
    }

    let frame = 0;
    let last = performance.now();
    let running = false;

    const tick = (nowMs: number) => {
      // Clamped: a backgrounded tab resumes with a huge delta, which would
      // teleport every bubble off the top at once.
      const delta = Math.min((nowMs - last) / 1000, 0.05);
      last = nowMs;

      for (let i = 0; i < bubbles.length; i++) {
        const bubble = bubbles[i];

        if (bubble.popping > 0) {
          bubble.popping += delta / POP_DURATION;
          if (bubble.popping >= 1) bubbles[i] = spawn();
          continue;
        }

        bubble.y -= bubble.speed * delta;
        bubble.swayPhase += bubble.swaySpeed * delta;
        bubble.wobblePhase += bubble.wobbleSpeed * delta;
        if (bubble.y + bubble.r < 0) {
          bubbles[i] = spawn();
          continue;
        }

        const x = bubble.x + Math.sin(bubble.swayPhase) * bubble.swayAmplitude;
        const reach = bubble.r + POP_MARGIN;
        const dx = x - pointerX;
        const dy = bubble.y - pointerY;
        if (dx * dx + dy * dy <= reach * reach) bubble.popping = 0.001;
      }

      draw();
      frame = requestAnimationFrame(tick);
    };

    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(tick);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointerX = event.clientX;
      pointerY = event.clientY;
    };
    const onPointerLeave = () => {
      pointerX = Number.NEGATIVE_INFINITY;
      pointerY = Number.NEGATIVE_INFINITY;
    };
    const onVisibilityChange = () => (document.hidden ? stop() : start());
    const onResize = () => measure();

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("resize", onResize);
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", onVisibilityChange);
    start();

    return () => {
      stop();
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [count, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[5] size-full select-none"
    />
  );
}
