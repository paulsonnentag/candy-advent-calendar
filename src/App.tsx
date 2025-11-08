import { Canvas } from "./Canvas";
import { CandyCrushGame } from "./CandyCrushGame";
import "./App.css";
import { useEffect, useRef, useState } from "react";

function App() {
  const gameRef = useRef<CandyCrushGame | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [, forceUpdate] = useState({});

  useEffect(() => {
    // Initialize game
    gameRef.current = new CandyCrushGame(8, 8);
    forceUpdate({});
  }, []);

  const handleDraw = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, time: number) => {
    if (!gameRef.current) return;

    // Update time tracking
    lastTimeRef.current = time;

    // Update game logic
    gameRef.current.update();

    // Render game
    gameRef.current.render(canvas, ctx);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!gameRef.current) return;

    const canvas = event.currentTarget.querySelector('canvas');
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    gameRef.current.handleClick(x, y);
  };

  return (
    <div className="app-container" onClick={handleCanvasClick}>
      <Canvas draw={handleDraw} />
    </div>
  );
}

export default App;
