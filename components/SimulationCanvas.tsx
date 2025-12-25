import React, { useRef, useEffect, useState } from 'react';
import { SimState, Vec2, Body } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PIXELS_PER_METER, COLORS, TIMESTEP } from '../constants';
import { vLen, vDist, createBody } from '../services/physics';

interface Props {
  state: SimState;
  setSimState: React.Dispatch<React.SetStateAction<SimState>>;
  spawnMode: 'dynamic' | 'static';
}

// Helper to parse Hex to RGB for gradient interpolation
const hexToRgb = (hex: string) => {
  const cleanHex = hex.replace('#', '');
  const bigint = parseInt(cleanHex, 16);
  return { r: (bigint >> 16) & 255, g: (bigint >> 8) & 255, b: bigint & 255 };
};

// Linear interpolation between two values
const lerp = (start: number, end: number, t: number) => start * (1 - t) + end * t;

const SimulationCanvas: React.FC<Props> = ({ state, setSimState, spawnMode }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dragInfo, setDragInfo] = useState<{ id: number, startMousePos: Vec2, bodyStartPos: Vec2 } | null>(null);
  const [lastMousePos, setLastMousePos] = useState<Vec2>({ x: 0, y: 0 });

  // --- Interaction Handlers ---

  const getMousePos = (e: React.MouseEvent): Vec2 => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / PIXELS_PER_METER,
      y: (e.clientY - rect.top) / PIXELS_PER_METER,
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    setLastMousePos(mousePos);

    // Check for click on existing body
    const clickedBody = state.bodies.find(b => vDist(b.pos, mousePos) < b.radius);

    if (clickedBody) {
      // Start Drag
      setDragInfo({
        id: clickedBody.id,
        startMousePos: mousePos,
        bodyStartPos: { ...clickedBody.pos },
      });
    } else {
      // Spawn New Body
      const newId = state.bodies.length > 0 ? Math.max(...state.bodies.map(b => b.id)) + 1 : 0;
      const newBody = createBody(mousePos.x, mousePos.y, newId, spawnMode === 'static');
      
      setSimState(prev => ({
        ...prev,
        bodies: [...prev.bodies, newBody]
      }));
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const mousePos = getMousePos(e);
    
    if (dragInfo) {
      // Calculate velocity based on mouse delta to allow "throwing"
      const mouseVel = {
        x: (mousePos.x - lastMousePos.x) / TIMESTEP,
        y: (mousePos.y - lastMousePos.y) / TIMESTEP,
      };

      setSimState(prev => ({
        ...prev,
        bodies: prev.bodies.map(b => {
          if (b.id !== dragInfo.id) return b;
          return {
            ...b,
            pos: mousePos, // Snap to mouse
            vel: mouseVel, // Update velocity for momentum when released
            trail: [] // Reset trail when dragging for cleaner look
          };
        })
      }));
    }
    
    setLastMousePos(mousePos);
  };

  const handleMouseUp = () => {
    setDragInfo(null);
  };

  const handleMouseLeave = () => {
    setDragInfo(null);
  };

  // --- Rendering ---

  const drawTrail = (ctx: CanvasRenderingContext2D, body: Body, baseColorHex: string) => {
    if (body.trail.length < 2) return;

    const speed = vLen(body.vel);
    // 0 to 1 ratio where 20 m/s is considered "max speed" for visualization
    const speedRatio = Math.min(speed / 20, 1.0);
    const isFast = speedRatio > 0.3;

    // Convert base color to RGB
    const baseRgb = hexToRgb(baseColorHex);
    
    // Target "Hot" Color (High velocity) -> Cyan or White depending on theme
    // Let's go with a bright Cyan/White mix for that Cyberpunk overload feel
    const hotRgb = { r: 200, g: 255, b: 255 }; 

    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // -- Glitch/Spark Effect for high speed --
    if (isFast) {
        const px = body.pos.x * PIXELS_PER_METER;
        const py = body.pos.y * PIXELS_PER_METER;
        const sparkCount = Math.floor(speedRatio * 2); 
        
        ctx.fillStyle = '#fcee0a'; // Cyberpunk Yellow Sparks
        for (let j = 0; j < sparkCount; j++) {
            if (Math.random() > 0.5) {
                const angle = Math.random() * Math.PI * 2;
                const dist = (body.radius * PIXELS_PER_METER) * (1.0 + Math.random());
                const sx = px + Math.cos(angle) * dist;
                const sy = py + Math.sin(angle) * dist;
                const size = 1 + Math.random() * 2;
                ctx.globalAlpha = 0.8;
                ctx.fillRect(sx, sy, size, size);
            }
        }
    }

    // -- Gradient Trail Rendering --
    // We draw segment by segment to interpolate color and alpha correctly along the curve
    
    const trailLen = body.trail.length;
    const bodyRadiusPx = body.radius * PIXELS_PER_METER;

    for (let i = 0; i < trailLen - 1; i++) {
        const p1 = body.trail[i];
        const p2 = body.trail[i+1];
        
        // Normalized position in trail (0 = tail/oldest, 1 = head/newest)
        const t = i / (trailLen - 1);
        
        // 1. Width Modulation
        // Trail gets thinner towards the tail
        // At high speeds, the trail becomes "sharper" (thinner core)
        const taper = Math.pow(t, 2); 
        const dynamicWidth = bodyRadiusPx * taper * (0.8 - (speedRatio * 0.4));
        ctx.lineWidth = Math.max(0.5, dynamicWidth);

        // 2. Color Interpolation (Velocity Based)
        // Mix Base Color with Hot Color based on Speed AND Position in trail
        // The "Head" of the trail reflects current speed. The "Tail" cools down.
        const mixFactor = speedRatio * t; // Only the head gets really hot
        
        const r = Math.floor(lerp(baseRgb.r, hotRgb.r, mixFactor));
        const g = Math.floor(lerp(baseRgb.g, hotRgb.g, mixFactor));
        const b = Math.floor(lerp(baseRgb.b, hotRgb.b, mixFactor));

        // 3. Alpha Modulation
        // Fade out tail. 
        const alpha = Math.max(0, t * (0.4 + speedRatio * 0.6));

        // 4. Glitch Jitter
        // Occasional offset for cyberpunk feel on the tail
        let jx = 0, jy = 0;
        if (t < 0.5 && Math.random() < 0.1) {
             jx = (Math.random() - 0.5) * 4;
             jy = (Math.random() - 0.5) * 4;
        }

        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        
        // 5. Dynamic Glow
        // Only apply heavy glow to the newest segments to save performance and look cool
        if (i > trailLen - 5) {
            ctx.shadowBlur = (speedRatio * 20) + (t * 5);
            ctx.shadowColor = `rgba(${r},${g},${b},1)`;
        } else {
            ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo((p1.x * PIXELS_PER_METER) + jx, (p1.y * PIXELS_PER_METER) + jy);
        ctx.lineTo((p2.x * PIXELS_PER_METER) + jx, (p2.y * PIXELS_PER_METER) + jy);
        ctx.stroke();
    }

    // Reset Context
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1.0;
  };

  const drawBody = (ctx: CanvasRenderingContext2D, b: Body, index: number) => {
    const color = b.isStatic ? '#888888' : COLORS[index % COLORS.length];
    
    // Static Bodies have a different visual style (hashed or solid block)
    if (!b.isStatic) {
        drawTrail(ctx, b, color);
    }

    ctx.beginPath();
    const px = b.pos.x * PIXELS_PER_METER;
    const py = b.pos.y * PIXELS_PER_METER;
    const r = b.radius * PIXELS_PER_METER;
    
    ctx.arc(px, py, r, 0, Math.PI * 2);
    
    if (b.isStatic) {
        // Static Body Look: Darker, stripped
        ctx.fillStyle = '#1a1a1a';
        ctx.fill();
        ctx.strokeStyle = '#555';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        
        // Inner X
        ctx.beginPath();
        ctx.moveTo(px - r/2, py - r/2); ctx.lineTo(px + r/2, py + r/2);
        ctx.moveTo(px + r/2, py - r/2); ctx.lineTo(px - r/2, py + r/2);
        ctx.strokeStyle = '#333';
        ctx.stroke();
    } else {
        // Dynamic Body Look
        ctx.fillStyle = color;
        ctx.fill();
        
        // Neon Glow
        const speed = vLen(b.vel);
        const glowIntensity = Math.min(speed / 5, 1) * 20 + 10;
        
        ctx.shadowBlur = glowIntensity;
        ctx.shadowColor = color;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.shadowBlur = 0;
    }
  };

  const drawContact = (ctx: CanvasRenderingContext2D, c: import('../types').Contact) => {
    const px = c.bodyA.pos.x * PIXELS_PER_METER;
    const py = c.bodyA.pos.y * PIXELS_PER_METER;
    
    const scale = Math.min(c.impulseAcc * 2, 20);
    if (scale > 0.1) {
      ctx.beginPath();
      ctx.arc(px + c.normal.x * c.bodyA.radius * PIXELS_PER_METER, py + c.normal.y * c.bodyA.radius * PIXELS_PER_METER, scale, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 0, 60, ${Math.min(1, scale/10)})`;
      ctx.fill();
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Grid
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 1;
    for (let x = 0; x < CANVAS_WIDTH; x += PIXELS_PER_METER) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_HEIGHT); ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += PIXELS_PER_METER) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.stroke();
    }
    
    // Center Cross
    ctx.strokeStyle = '#00f0ff';
    ctx.globalAlpha = 0.2;
    ctx.beginPath(); ctx.moveTo(CANVAS_WIDTH/2, 0); ctx.lineTo(CANVAS_WIDTH/2, CANVAS_HEIGHT); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, CANVAS_HEIGHT/2); ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT/2); ctx.stroke();
    ctx.globalAlpha = 1.0;

    state.bodies.forEach((b, i) => drawBody(ctx, b, i));
    state.contacts.forEach(c => drawContact(ctx, c));

    // Scanlines
    ctx.fillStyle = "rgba(0, 240, 255, 0.02)";
    for (let i = 0; i < CANVAS_HEIGHT; i += 4) {
        ctx.fillRect(0, i, CANVAS_WIDTH, 1);
    }

  }, [state]);

  return (
    <div className="cp-border w-full h-full bg-black relative">
        <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className={`block w-full h-full object-contain ${dragInfo ? 'cursor-grabbing' : 'cursor-crosshair'}`}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
        />
        <div className="absolute top-2 left-2 text-xs text-[var(--cp-yellow)] font-bold pointer-events-none">
            VIEWPORT // INTERACTIVE // MODE: {spawnMode.toUpperCase()}
        </div>
        <div className="absolute bottom-2 right-2 text-[10px] text-gray-500 font-mono pointer-events-none">
            [LMB] SPAWN/DRAG | DRAG TO THROW
        </div>
    </div>
  );
};

export default SimulationCanvas;