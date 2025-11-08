import { Canvas } from "./Canvas";
import "./App.css";

function App() {
  const handleDraw = (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, time: number) => {
    // Get canvas dimensions (in CSS pixels)
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    // Calculate center position
    const centerX = width / 2;
    const centerY = height / 2;

    // Square size
    const size = 100;

    // Calculate rotation based on time (rotate once per 2 seconds)
    const rotation = (time / 2000) * Math.PI * 2;

    // Save context state
    ctx.save();

    // Move to center
    ctx.translate(centerX, centerY);

    // Rotate
    ctx.rotate(rotation);

    // Draw square centered at origin
    ctx.fillStyle = "red";
    ctx.fillRect(-size / 2, -size / 2, size, size);

    // Restore context state
    ctx.restore();
  };

  return (
    <div className="app-container">
      <Canvas draw={handleDraw} />
    </div>
  );
}

export default App;
