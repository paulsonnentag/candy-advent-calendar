import { useEffect, useRef } from "react";

interface CanvasProps {
  draw: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, time: number) => void;
}

export function Canvas({ draw }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let needsResize = true;
    const dpr = window.devicePixelRatio || 1;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();

      // Set display size (CSS pixels)
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      // Set actual size in memory (scaled to device pixel ratio)
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;

      needsResize = false;
    };

    // Initial resize
    resizeCanvas();

    const render = (time: number) => {
      if (needsResize) {
        resizeCanvas();
      }

      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Save the current state
      ctx.save();

      // Scale all drawing operations
      ctx.scale(dpr, dpr);

      // Clear canvas
      const rect = container.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);

      // Call the draw function
      draw(canvas, ctx, time);

      // Restore the state
      ctx.restore();

      // Request next frame
      animationFrameRef.current = requestAnimationFrame(render);
    };

    // Start the animation loop
    animationFrameRef.current = requestAnimationFrame(render);

    // Set up resize observer for responsive behavior
    const resizeObserver = new ResizeObserver(() => {
      needsResize = true;
    });
    resizeObserver.observe(container);

    // Also listen to window resize for device pixel ratio changes
    const handleResize = () => {
      needsResize = true;
    };
    window.addEventListener("resize", handleResize);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      resizeObserver.disconnect();
      window.removeEventListener("resize", handleResize);
    };
  }, [draw]);

  return (
    <div ref={containerRef} className="canvas-container">
      <canvas ref={canvasRef} />
    </div>
  );
}
