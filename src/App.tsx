import { Canvas } from "./Canvas";
import { CandyCrushGame } from "./CandyCrushGame";
import AdventCalendar from "./AdventCalendar";
import "./App.css";
import { useEffect, useRef, useState } from "react";

function App() {
  const gameRef = useRef<CandyCrushGame | null>(null);
  const lastTimeRef = useRef<number>(0);
  const [, forceUpdate] = useState({});
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (selectedImage) {
      // Initialize game with selected background image
      gameRef.current = new CandyCrushGame(8, 8, selectedImage);
      forceUpdate({});
    }
  }, [selectedImage]);

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

    const canvas = event.currentTarget.querySelector("canvas");
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    gameRef.current.handleClick(x, y);
  };

  const handleDaySelect = (day: number, imagePath: string) => {
    setSelectedDay(day);
    setSelectedImage(imagePath);
  };

  const handleBackToCalendar = () => {
    setSelectedDay(null);
    setSelectedImage(null);
    gameRef.current = null;
  };

  // Show advent calendar if no day is selected
  if (selectedDay === null) {
    return <AdventCalendar onDaySelect={handleDaySelect} />;
  }

  // Show game for selected day
  return (
    <div className="app-container">
      <div className="back-button-container">
        <button className="back-button" onClick={handleBackToCalendar}>
          ← Back to Calendar
        </button>
      </div>
      <div className="game-container" onClick={handleCanvasClick}>
        <Canvas draw={handleDraw} />
      </div>
    </div>
  );
}

export default App;
