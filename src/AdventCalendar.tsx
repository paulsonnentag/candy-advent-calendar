import { useState } from "react";
import "./AdventCalendar.css";

// Import all 24 images
import day1 from "./assets/fotos/1.webp";
import day2 from "./assets/fotos/2.webp";
import day3 from "./assets/fotos/3.webp";
import day4 from "./assets/fotos/4.webp";
import day5 from "./assets/fotos/5.webp";
import day6 from "./assets/fotos/6.webp";
import day7 from "./assets/fotos/7.webp";
import day8 from "./assets/fotos/8.webp";
import day9 from "./assets/fotos/9.webp";
import day10 from "./assets/fotos/10.webp";
import day11 from "./assets/fotos/11.webp";
import day12 from "./assets/fotos/12.webp";
import day13 from "./assets/fotos/13.webp";
import day14 from "./assets/fotos/14.webp";
import day15 from "./assets/fotos/15.webp";
import day16 from "./assets/fotos/16.webp";
import day17 from "./assets/fotos/17.webp";
import day18 from "./assets/fotos/18.webp";
import day19 from "./assets/fotos/19.webp";
import day20 from "./assets/fotos/20.webp";
import day21 from "./assets/fotos/21.webp";
import day22 from "./assets/fotos/22.webp";
import day23 from "./assets/fotos/23.webp";
import day24 from "./assets/fotos/24.webp";

const images = [day1, day2, day3, day4, day5, day6, day7, day8, day9, day10, day11, day12, day13, day14, day15, day16, day17, day18, day19, day20, day21, day22, day23, day24];

interface AdventCalendarProps {
  onDaySelect: (day: number, imagePath: string) => void;
}

function AdventCalendar({ onDaySelect }: AdventCalendarProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // Check if a day is unlocked (current date is on or after that day in December 2025)
  const isDayUnlocked = (day: number): boolean => {
    const now = new Date();
    const unlockDate = new Date(2025, 11, day); // Month is 0-indexed, so 11 = December
    return now >= unlockDate;
  };

  // Handle door click
  const handleDoorClick = (day: number) => {
    if (isDayUnlocked(day)) {
      onDaySelect(day, images[day - 1]);
    }
  };

  return (
    <div className="advent-calendar">
      <h1 className="advent-title">Advent Calendar 2025</h1>
      <div className="calendar-grid">
        {Array.from({ length: 24 }, (_, i) => i + 1).map((day) => {
          const isUnlocked = isDayUnlocked(day);
          return (
            <div key={day} className={`calendar-door ${isUnlocked ? "unlocked" : "locked"} ${hoveredDay === day ? "hovered" : ""}`} onClick={() => handleDoorClick(day)} onMouseEnter={() => setHoveredDay(day)} onMouseLeave={() => setHoveredDay(null)}>
              <div className="door-content">
                <div className="door-number">{day}</div>
                {!isUnlocked && <div className="lock-icon">🔒</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default AdventCalendar;
