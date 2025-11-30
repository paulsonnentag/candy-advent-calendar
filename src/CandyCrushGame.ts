// Candy Crush Game Logic

export interface Candy {
  x: number; // grid position
  y: number; // grid position
  renderY: number; // actual render position with physics
  velocityY: number; // falling velocity
  type: number; // candy type/color (0-5)
  scale: number; // for animation
  markedForRemoval: boolean;
  opacity: number; // for fade-in effect
  isNew: boolean; // track if candy is newly spawned
}

export interface Snowflake {
  x: number;
  y: number;
  size: number;
  speed: number;
  drift: number;
  opacity: number;
}

export interface GameState {
  grid: (Candy | null)[][];
  gridWidth: number;
  gridHeight: number;
  cellSize: number;
  selectedCandy: { x: number; y: number } | null;
  isFalling: boolean;
  isRemoving: boolean;
  isPaused: boolean;
  pauseTimer: number;
  points: number;
  tries: number;
  candyColors: string[];
  revealedCells: boolean[][]; // Track which cells have been revealed
  isRevealing: boolean; // True when doing the final reveal animation
  revealProgress: number; // 0 to 1 for color fade-in
  candyFadeOut: number; // 0 to 1 for candy fade-out during reveal
  gridFadeOut: number; // 0 to 1 for grid fade-out during reveal
  snowflakes: Snowflake[]; // Snow particles for final animation
  isComplete: boolean; // True when reveal is fully complete
}

export class CandyCrushGame {
  // ============================================
  // CONFIGURATION PARAMETERS
  // ============================================

  // Grid configuration
  private readonly DEFAULT_GRID_WIDTH = 8;
  private readonly DEFAULT_GRID_HEIGHT = 8;
  private readonly DEFAULT_CELL_SIZE = 60;
  private readonly MAX_CELL_SIZE = 80;

  // Physics and animation speeds
  private readonly GRAVITY = 0.15; // Candy falling acceleration
  private readonly REMOVAL_SPEED = 0.02; // How fast candies scale down when removed
  private readonly FADE_SPEED = 0.03; // How fast new candies fade in
  private readonly PAUSE_DURATION = 0; // Frames to pause after removal

  // Background image reveal
  private readonly REVEAL_THRESHOLD = 0.01; // 30% of cells revealed triggers full reveal
  private readonly REVEAL_SPEED = 0.3; // Speed of final reveal animation
  private readonly CANDY_FADEOUT_SPEED = 0.02; // Speed of candy fade during reveal
  private readonly GRID_FADEOUT_SPEED = 0.02; // Speed of grid fade during reveal

  // Snow animation
  private readonly SNOW_COUNT = 100; // Maximum number of snowflakes
  private readonly SNOW_SPAWN_RATE = 3; // New snowflakes per frame
  private readonly SNOW_MIN_SIZE = 2;
  private readonly SNOW_MAX_SIZE = 6;
  private readonly SNOW_MIN_SPEED = 0.5;
  private readonly SNOW_MAX_SPEED = 2;
  private readonly SNOW_DRIFT_AMOUNT = 1; // Horizontal drift speed

  // Layout configuration
  private readonly HEADER_HEIGHT = 60; // Space for title and stats
  private readonly GRID_PADDING = 20; // Padding around the grid

  // Font sizes (calculated dynamically based on canvas width)
  private readonly TITLE_FONT_MIN = 16;
  private readonly TITLE_FONT_MAX = 24;
  private readonly TITLE_FONT_SCALE = 30; // width / scale = font size
  private readonly STATS_FONT_MIN = 12;
  private readonly STATS_FONT_MAX = 16;
  private readonly STATS_FONT_SCALE = 40;

  // Color scheme
  private readonly CANDY_COLORS = [
    "#2E7D32", // Rich Christmas green
    "#C62828", // Rich Christmas red
    "#F5F5DC", // Warm cream (instead of stark white)
    "#DAA520", // Rich goldenrod
    "#B0B0B0", // Warmer silver
  ];

  private readonly BACKGROUND_COLOR = "#1a2332"; // Dark navy background
  private readonly GRID_BACKGROUND_COLOR = "#2d3f54"; // Muted slate blue
  private readonly GRID_LINE_COLOR = "#1a2738"; // Subtle dark lines
  private readonly TEXT_COLOR = "#F5F5DC"; // Cream text
  private readonly SELECTION_COLOR = "#DAA520"; // Golden selection border
  private readonly SELECTION_LINE_WIDTH = 4;

  // ============================================
  // STATE AND INTERNAL PROPERTIES
  // ============================================

  private state: GameState;
  private offsetX = 0;
  private offsetY = 0;
  private backgroundImage: HTMLImageElement | null = null;
  private imageLoaded = false;

  constructor(gridWidth: number = 8, gridHeight: number = 8, backgroundImagePath?: string) {
    const width = gridWidth || this.DEFAULT_GRID_WIDTH;
    const height = gridHeight || this.DEFAULT_GRID_HEIGHT;

    this.state = {
      grid: [],
      gridWidth: width,
      gridHeight: height,
      cellSize: this.DEFAULT_CELL_SIZE,
      selectedCandy: null,
      isFalling: false,
      isRemoving: false,
      isPaused: false,
      pauseTimer: 0,
      points: 0,
      tries: 0,
      candyColors: this.CANDY_COLORS,
      revealedCells: Array(height)
        .fill(null)
        .map(() => Array(width).fill(false)),
      isRevealing: false,
      revealProgress: 0,
      candyFadeOut: 1,
      gridFadeOut: 1,
      snowflakes: [],
      isComplete: false,
    };

    this.initializeGrid();

    // Load background image if provided
    if (backgroundImagePath) {
      this.loadBackgroundImage(backgroundImagePath);
    }
  }

  private loadBackgroundImage(path: string) {
    this.backgroundImage = new Image();
    this.backgroundImage.onload = () => {
      this.imageLoaded = true;
    };
    this.backgroundImage.src = path;
  }

  private initializeGrid() {
    // Create empty grid
    this.state.grid = Array(this.state.gridHeight)
      .fill(null)
      .map(() => Array(this.state.gridWidth).fill(null));

    // Fill with random candies
    for (let y = 0; y < this.state.gridHeight; y++) {
      for (let x = 0; x < this.state.gridWidth; x++) {
        this.state.grid[y][x] = this.createCandy(x, y);
      }
    }

    // Remove initial matches
    this.removeInitialMatches();
  }

  private removeInitialMatches() {
    let hasMatches = true;
    while (hasMatches) {
      const matches = this.findMatches();
      if (matches.length === 0) {
        hasMatches = false;
      } else {
        // Replace matched candies with new random ones
        matches.forEach(({ x, y }) => {
          if (this.state.grid[y][x]) {
            this.state.grid[y][x] = this.createCandy(x, y);
          }
        });
      }
    }
  }

  private createCandy(x: number, y: number, startAbove: boolean = false): Candy {
    return {
      x,
      y,
      renderY: startAbove ? y - 10 : y,
      velocityY: 0,
      type: Math.floor(Math.random() * this.state.candyColors.length),
      scale: 1,
      markedForRemoval: false,
      opacity: startAbove ? 0 : 1, // New candies start transparent
      isNew: startAbove,
    };
  }

  update() {
    // Handle final reveal animation
    if (this.state.isRevealing) {
      this.updateRevealAnimation();
    }

    // Update snow if complete
    if (this.state.isComplete) {
      this.updateSnow();
      return; // Don't update game logic anymore
    }

    // Handle pause after removal
    if (this.state.isPaused) {
      this.state.pauseTimer--;
      if (this.state.pauseTimer <= 0) {
        this.state.isPaused = false;
      }
      return; // Don't update anything else during pause
    }

    // Update removal animation
    if (this.state.isRemoving) {
      this.updateRemovalAnimation();
      return;
    }

    // Update physics and fade-in effects
    this.updatePhysics();
    this.updateFadeIn();

    // If nothing is falling and nothing is being removed, check for matches
    if (!this.state.isFalling && !this.state.isRemoving) {
      const matches = this.findMatches();
      if (matches.length > 0) {
        this.markCandiesForRemoval(matches);
      }
    }
  }

  private updatePhysics() {
    let anyFalling = false;

    for (let y = this.state.gridHeight - 1; y >= 0; y--) {
      for (let x = 0; x < this.state.gridWidth; x++) {
        const candy = this.state.grid[y][x];
        if (!candy || candy.markedForRemoval) continue;

        // Check if there's space below
        const targetY = candy.y;
        if (candy.renderY < targetY - 0.01) {
          // Still falling
          candy.velocityY += this.GRAVITY;
          candy.renderY += candy.velocityY;

          // Check if reached target
          if (candy.renderY >= targetY) {
            candy.renderY = targetY;
            candy.velocityY = 0;
          } else {
            anyFalling = true;
          }
        } else {
          candy.velocityY = 0;
        }
      }
    }

    // Check if any candy needs to fall
    for (let x = 0; x < this.state.gridWidth; x++) {
      for (let y = this.state.gridHeight - 1; y >= 0; y--) {
        const candy = this.state.grid[y][x];
        if (!candy || candy.markedForRemoval) {
          // Find candy above to fall down
          for (let above = y - 1; above >= 0; above--) {
            const aboveCandy = this.state.grid[above][x];
            if (aboveCandy && !aboveCandy.markedForRemoval) {
              // Move candy down
              this.state.grid[y][x] = aboveCandy;
              this.state.grid[above][x] = null;
              aboveCandy.y = y;
              anyFalling = true;
              break;
            }
          }

          // If no candy found above, create new one at top
          if (!this.state.grid[y][x]) {
            this.state.grid[y][x] = this.createCandy(x, y, true);
            anyFalling = true;
          }
        }
      }
    }

    this.state.isFalling = anyFalling;
  }

  private findMatches(): { x: number; y: number }[] {
    const matches = new Set<string>();

    // Check horizontal matches
    for (let y = 0; y < this.state.gridHeight; y++) {
      for (let x = 0; x < this.state.gridWidth - 2; x++) {
        const candy = this.state.grid[y][x];
        if (!candy || candy.markedForRemoval) continue;

        let matchLength = 1;
        for (let dx = 1; x + dx < this.state.gridWidth; dx++) {
          const nextCandy = this.state.grid[y][x + dx];
          if (nextCandy && !nextCandy.markedForRemoval && nextCandy.type === candy.type) {
            matchLength++;
          } else {
            break;
          }
        }

        if (matchLength >= 3) {
          for (let dx = 0; dx < matchLength; dx++) {
            matches.add(`${x + dx},${y}`);
          }
        }
      }
    }

    // Check vertical matches
    for (let x = 0; x < this.state.gridWidth; x++) {
      for (let y = 0; y < this.state.gridHeight - 2; y++) {
        const candy = this.state.grid[y][x];
        if (!candy || candy.markedForRemoval) continue;

        let matchLength = 1;
        for (let dy = 1; y + dy < this.state.gridHeight; dy++) {
          const nextCandy = this.state.grid[y + dy][x];
          if (nextCandy && !nextCandy.markedForRemoval && nextCandy.type === candy.type) {
            matchLength++;
          } else {
            break;
          }
        }

        if (matchLength >= 3) {
          for (let dy = 0; dy < matchLength; dy++) {
            matches.add(`${x},${y + dy}`);
          }
        }
      }
    }

    return Array.from(matches).map((str) => {
      const [x, y] = str.split(",").map(Number);
      return { x, y };
    });
  }

  private markCandiesForRemoval(matches: { x: number; y: number }[]) {
    matches.forEach(({ x, y }) => {
      const candy = this.state.grid[y][x];
      if (candy) {
        candy.markedForRemoval = true;
      }
      // Mark cell as revealed
      this.state.revealedCells[y][x] = true;
    });
    this.state.isRemoving = true;
    this.state.points += matches.length * 10;

    // Check if we've reached the reveal threshold
    const revealPercentage = this.getRevealPercentage();
    if (revealPercentage >= this.REVEAL_THRESHOLD && !this.state.isRevealing) {
      this.startFullReveal();
    }
  }

  private updateFadeIn() {
    for (let y = 0; y < this.state.gridHeight; y++) {
      for (let x = 0; x < this.state.gridWidth; x++) {
        const candy = this.state.grid[y][x];
        if (candy && candy.isNew) {
          // Fade in the candy
          candy.opacity += this.FADE_SPEED;
          if (candy.opacity >= 1) {
            candy.opacity = 1;
            candy.isNew = false;
          }
        }
      }
    }
  }

  private updateRemovalAnimation() {
    let anyRemoving = false;

    for (let y = 0; y < this.state.gridHeight; y++) {
      for (let x = 0; x < this.state.gridWidth; x++) {
        const candy = this.state.grid[y][x];
        if (candy && candy.markedForRemoval) {
          candy.scale -= this.REMOVAL_SPEED;
          if (candy.scale <= 0) {
            this.state.grid[y][x] = null;
          } else {
            anyRemoving = true;
          }
        }
      }
    }

    this.state.isRemoving = anyRemoving;

    // When removal animation is done, trigger pause
    if (!anyRemoving) {
      this.state.isPaused = true;
      this.state.pauseTimer = this.PAUSE_DURATION;
    }
  }

  private getRevealPercentage(): number {
    let revealedCount = 0;
    const totalCells = this.state.gridWidth * this.state.gridHeight;

    for (let y = 0; y < this.state.gridHeight; y++) {
      for (let x = 0; x < this.state.gridWidth; x++) {
        if (this.state.revealedCells[y][x]) {
          revealedCount++;
        }
      }
    }

    return revealedCount / totalCells;
  }

  private startFullReveal() {
    this.state.isRevealing = true;
    this.state.revealProgress = 0;
    this.state.candyFadeOut = 1;
    this.state.gridFadeOut = 1;
  }

  private initializeSnow() {
    // Start with no snowflakes - they will spawn gradually from the top
    this.state.snowflakes = [];
  }

  private updateRevealAnimation() {
    // First fade out all candies and hidden cell overlays simultaneously
    if (this.state.candyFadeOut > 0) {
      this.state.candyFadeOut -= this.CANDY_FADEOUT_SPEED;
      if (this.state.candyFadeOut < 0) {
        this.state.candyFadeOut = 0;
      }
    }

    if (this.state.gridFadeOut > 0) {
      this.state.gridFadeOut -= this.GRID_FADEOUT_SPEED;
      if (this.state.gridFadeOut < 0) {
        this.state.gridFadeOut = 0;
      }
    }

    // Once candies and overlays are faded, fade to color
    if (this.state.candyFadeOut === 0 && this.state.gridFadeOut === 0) {
      // Fade from grayscale to color
      this.state.revealProgress += this.REVEAL_SPEED;
      if (this.state.revealProgress >= 1) {
        this.state.revealProgress = 1;
        // Mark all cells as revealed for final state
        for (let y = 0; y < this.state.gridHeight; y++) {
          for (let x = 0; x < this.state.gridWidth; x++) {
            this.state.revealedCells[y][x] = true;
          }
        }
        // Animation complete - start snow
        if (!this.state.isComplete) {
          this.state.isComplete = true;
          this.initializeSnow();
        }
      }
    }
  }

  private updateSnow() {
    // Spawn new snowflakes gradually from the top until we reach max count
    if (this.state.snowflakes.length < this.SNOW_COUNT) {
      for (let i = 0; i < this.SNOW_SPAWN_RATE; i++) {
        if (this.state.snowflakes.length < this.SNOW_COUNT) {
          this.state.snowflakes.push({
            x: Math.random() * 100, // Position as percentage
            y: -5, // Start from above the screen
            size: this.SNOW_MIN_SIZE + Math.random() * (this.SNOW_MAX_SIZE - this.SNOW_MIN_SIZE),
            speed: this.SNOW_MIN_SPEED + Math.random() * (this.SNOW_MAX_SPEED - this.SNOW_MIN_SPEED),
            drift: (Math.random() - 0.5) * this.SNOW_DRIFT_AMOUNT,
            opacity: 0.3 + Math.random() * 0.7,
          });
        }
      }
    }

    // Update existing snowflakes
    for (const snowflake of this.state.snowflakes) {
      // Move snowflake down and drift horizontally
      snowflake.y += snowflake.speed;
      snowflake.x += snowflake.drift;

      // Wrap around when snowflake goes off screen
      if (snowflake.y > 100) {
        snowflake.y = -5;
        snowflake.x = Math.random() * 100;
      }
      if (snowflake.x < -5) {
        snowflake.x = 105;
      } else if (snowflake.x > 105) {
        snowflake.x = -5;
      }
    }
  }

  handleClick(canvasX: number, canvasY: number) {
    const gridX = Math.floor((canvasX - this.offsetX) / this.state.cellSize);
    const gridY = Math.floor((canvasY - this.offsetY) / this.state.cellSize);

    if (gridX < 0 || gridX >= this.state.gridWidth || gridY < 0 || gridY >= this.state.gridHeight) {
      return;
    }

    if (this.state.isFalling || this.state.isRemoving || this.state.isPaused || this.state.isRevealing) {
      return; // Don't allow clicks during animation, pause, or reveal
    }

    if (!this.state.selectedCandy) {
      // Select first candy
      this.state.selectedCandy = { x: gridX, y: gridY };
    } else {
      // Try to swap with selected candy
      const selected = this.state.selectedCandy;
      const dx = Math.abs(selected.x - gridX);
      const dy = Math.abs(selected.y - gridY);

      // Check if adjacent
      if ((dx === 1 && dy === 0) || (dx === 0 && dy === 1)) {
        this.swapCandies(selected.x, selected.y, gridX, gridY);
        this.state.tries++;
      }

      this.state.selectedCandy = null;
    }
  }

  private swapCandies(x1: number, y1: number, x2: number, y2: number) {
    const candy1 = this.state.grid[y1][x1];
    const candy2 = this.state.grid[y2][x2];

    if (!candy1 || !candy2) return;

    // Swap in grid
    this.state.grid[y1][x1] = candy2;
    this.state.grid[y2][x2] = candy1;

    // Update positions
    const tempX = candy1.x;
    const tempY = candy1.y;
    candy1.x = candy2.x;
    candy1.y = candy2.y;
    candy1.renderY = candy2.renderY;
    candy2.x = tempX;
    candy2.y = tempY;
    candy2.renderY = tempY;
  }

  render(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    const width = canvas.width / window.devicePixelRatio;
    const height = canvas.height / window.devicePixelRatio;

    // Calculate cell size dynamically to fit the canvas
    const availableWidth = width - this.GRID_PADDING * 2;
    const availableHeight = height - this.HEADER_HEIGHT - this.GRID_PADDING * 2;

    // Calculate cell size based on available space
    const cellSizeByWidth = availableWidth / this.state.gridWidth;
    const cellSizeByHeight = availableHeight / this.state.gridHeight;
    this.state.cellSize = Math.min(cellSizeByWidth, cellSizeByHeight, this.MAX_CELL_SIZE);

    // Calculate offset to center the grid
    const gridPixelWidth = this.state.gridWidth * this.state.cellSize;
    const gridPixelHeight = this.state.gridHeight * this.state.cellSize;
    this.offsetX = (width - gridPixelWidth) / 2;
    this.offsetY = (height - gridPixelHeight) / 2 + this.HEADER_HEIGHT / 2;

    // Draw background with Christmas theme
    ctx.fillStyle = this.BACKGROUND_COLOR;
    ctx.fillRect(0, 0, width, height);

    // Draw title and stats (scale font with canvas size)
    const fontSize = Math.max(this.TITLE_FONT_MIN, Math.min(this.TITLE_FONT_MAX, width / this.TITLE_FONT_SCALE));

    ctx.fillStyle = this.TEXT_COLOR;
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.textAlign = "center";

    // Draw grid background
    ctx.fillStyle = this.GRID_BACKGROUND_COLOR;
    ctx.fillRect(this.offsetX, this.offsetY, gridPixelWidth, gridPixelHeight);

    // Draw background image if loaded
    if (this.imageLoaded && this.backgroundImage) {
      this.drawBackgroundImage(ctx, gridPixelWidth, gridPixelHeight);
    }

    // Draw grid lines with fade out
    ctx.save();
    ctx.globalAlpha = this.state.gridFadeOut;
    ctx.strokeStyle = this.GRID_LINE_COLOR;
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.state.gridWidth; x++) {
      ctx.beginPath();
      ctx.moveTo(this.offsetX + x * this.state.cellSize, this.offsetY);
      ctx.lineTo(this.offsetX + x * this.state.cellSize, this.offsetY + gridPixelHeight);
      ctx.stroke();
    }
    for (let y = 0; y <= this.state.gridHeight; y++) {
      ctx.beginPath();
      ctx.moveTo(this.offsetX, this.offsetY + y * this.state.cellSize);
      ctx.lineTo(this.offsetX + gridPixelWidth, this.offsetY + y * this.state.cellSize);
      ctx.stroke();
    }
    ctx.restore();

    // Draw candies
    for (let y = 0; y < this.state.gridHeight; y++) {
      for (let x = 0; x < this.state.gridWidth; x++) {
        const candy = this.state.grid[y][x];
        if (candy && candy.scale > 0) {
          this.drawCandy(ctx, candy);
        }
      }
    }

    // Draw overlay on hidden cells during reveal (fades out to show image)
    if (this.state.isRevealing && this.state.gridFadeOut > 0) {
      ctx.save();
      ctx.globalAlpha = this.state.gridFadeOut;
      ctx.fillStyle = this.GRID_BACKGROUND_COLOR;
      for (let y = 0; y < this.state.gridHeight; y++) {
        for (let x = 0; x < this.state.gridWidth; x++) {
          if (!this.state.revealedCells[y][x]) {
            ctx.fillRect(this.offsetX + x * this.state.cellSize, this.offsetY + y * this.state.cellSize, this.state.cellSize, this.state.cellSize);
          }
        }
      }
      ctx.restore();
    }

    // Draw selection
    if (this.state.selectedCandy) {
      const { x, y } = this.state.selectedCandy;
      ctx.strokeStyle = this.SELECTION_COLOR;
      ctx.lineWidth = this.SELECTION_LINE_WIDTH;
      const inset = this.SELECTION_LINE_WIDTH / 2;
      ctx.strokeRect(this.offsetX + x * this.state.cellSize + inset, this.offsetY + y * this.state.cellSize + inset, this.state.cellSize - this.SELECTION_LINE_WIDTH, this.state.cellSize - this.SELECTION_LINE_WIDTH);
    }

    // Draw snow if game is complete
    if (this.state.isComplete) {
      this.drawSnow(ctx, width, height);
    }
  }

  private drawCandy(ctx: CanvasRenderingContext2D, candy: Candy) {
    const centerX = this.offsetX + candy.x * this.state.cellSize + this.state.cellSize / 2;
    const centerY = this.offsetY + candy.renderY * this.state.cellSize + this.state.cellSize / 2;
    const radius = this.state.cellSize * 0.4 * candy.scale;

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(candy.scale, candy.scale);

    // Apply opacity (including fade out during reveal)
    ctx.globalAlpha = candy.opacity * this.state.candyFadeOut;

    // Draw candy as a circle with a highlight
    ctx.fillStyle = this.state.candyColors[candy.type];
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fill();

    // Add shine effect
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.beginPath();
    ctx.arc(-radius * 0.3, -radius * 0.3, radius * 0.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawBackgroundImage(ctx: CanvasRenderingContext2D, gridPixelWidth: number, gridPixelHeight: number) {
    if (!this.backgroundImage) return;

    ctx.save();

    // Calculate scaling to cover the grid area
    const scaleX = gridPixelWidth / this.backgroundImage.width;
    const scaleY = gridPixelHeight / this.backgroundImage.height;
    const scale = Math.max(scaleX, scaleY);

    const scaledWidth = this.backgroundImage.width * scale;
    const scaledHeight = this.backgroundImage.height * scale;

    // Center the image
    const imageX = this.offsetX + (gridPixelWidth - scaledWidth) / 2;
    const imageY = this.offsetY + (gridPixelHeight - scaledHeight) / 2;

    // During reveal animation, show entire image; otherwise only show revealed cells
    if (this.state.isRevealing) {
      // Show entire grid during reveal animation
      ctx.beginPath();
      ctx.rect(this.offsetX, this.offsetY, gridPixelWidth, gridPixelHeight);
      ctx.clip();
    } else {
      // Create clipping path for revealed cells only
      ctx.beginPath();
      for (let y = 0; y < this.state.gridHeight; y++) {
        for (let x = 0; x < this.state.gridWidth; x++) {
          if (this.state.revealedCells[y][x]) {
            ctx.rect(this.offsetX + x * this.state.cellSize, this.offsetY + y * this.state.cellSize, this.state.cellSize, this.state.cellSize);
          }
        }
      }
      ctx.clip();
    }

    // Apply grayscale effect using manual pixel manipulation
    const grayscaleAmount = 1 - this.state.revealProgress;
    if (grayscaleAmount > 0) {
      // Create a temporary canvas to process the image
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = scaledWidth;
      tempCanvas.height = scaledHeight;
      const tempCtx = tempCanvas.getContext("2d");

      if (tempCtx) {
        // Draw the original image to temp canvas
        tempCtx.drawImage(this.backgroundImage, 0, 0, scaledWidth, scaledHeight);

        // Get image data
        const imageData = tempCtx.getImageData(0, 0, scaledWidth, scaledHeight);
        const data = imageData.data;

        // Process each pixel
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];

          // Calculate grayscale using luminosity method
          const gray = 0.299 * r + 0.587 * g + 0.114 * b;

          // Interpolate between grayscale and original color
          data[i] = gray * grayscaleAmount + r * (1 - grayscaleAmount);
          data[i + 1] = gray * grayscaleAmount + g * (1 - grayscaleAmount);
          data[i + 2] = gray * grayscaleAmount + b * (1 - grayscaleAmount);
        }

        // Put the modified image data back
        tempCtx.putImageData(imageData, 0, 0);

        // Draw the processed image
        ctx.drawImage(tempCanvas, imageX, imageY);
      }
    } else {
      // Draw the image directly if no grayscale needed
      ctx.drawImage(this.backgroundImage, imageX, imageY, scaledWidth, scaledHeight);
    }

    ctx.restore();
  }

  private drawSnow(ctx: CanvasRenderingContext2D, width: number, height: number) {
    ctx.save();

    for (const snowflake of this.state.snowflakes) {
      // Convert percentage position to pixels
      const x = (snowflake.x / 100) * width;
      const y = (snowflake.y / 100) * height;

      ctx.globalAlpha = snowflake.opacity;
      ctx.fillStyle = "#FFFFFF";
      ctx.beginPath();
      ctx.arc(x, y, snowflake.size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  getState(): GameState {
    return this.state;
  }
}
