import React, { useState, useEffect, useRef } from 'react';
import { SimState, SimulationParams } from './types';
import { createInitialState, stepPhysics } from './services/physics';
import { DEFAULT_GRAVITY, DEFAULT_ITERATIONS, DEFAULT_RESTITUTION, TIMESTEP, MAX_BODIES } from './constants';
import SimulationCanvas from './components/SimulationCanvas';
import ControlPanel from './components/ControlPanel';
import ConvergenceChart from './components/ConvergenceChart';
import AITutor from './components/AITutor';

const App: React.FC = () => {
  // --- State ---
  const [params, setParams] = useState<SimulationParams>({
    gravity: DEFAULT_GRAVITY,
    iterations: DEFAULT_ITERATIONS,
    restitution: DEFAULT_RESTITUTION,
    paused: false,
    timeScale: 1.0,
    warmStarting: true,
  });

  const [spawnMode, setSpawnMode] = useState<'dynamic' | 'static'>('dynamic');
  const [simState, setSimState] = useState<SimState>(() => createInitialState(MAX_BODIES));
  const requestRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);

  // --- Main Loop ---
  const animate = (time: number) => {
    if (lastTimeRef.current === 0) lastTimeRef.current = time;
    const deltaTime = time - lastTimeRef.current;
    
    // Fixed timestep logic
    if (!params.paused && deltaTime > TIMESTEP * 1000) {
      setSimState((prev) => stepPhysics(prev, params));
      lastTimeRef.current = time;
    } else if (params.paused) {
      lastTimeRef.current = time;
    }

    requestRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current!);
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]); 

  const handleReset = () => {
    setSimState(createInitialState(MAX_BODIES));
  };

  return (
    <div className="h-screen w-screen p-2 flex flex-col gap-2 overflow-hidden bg-[var(--cp-bg)]">
      
      {/* Header */}
      <header className="flex justify-between items-end border-b-2 border-[var(--cp-cyan)] pb-1 shrink-0">
        <div>
          <h1 className="text-3xl font-bold italic tracking-tighter text-[var(--cp-yellow)] cp-text-shadow glitch-text cursor-default leading-none">
            PGS_VISUALIZER // CP77
          </h1>
          <p className="text-[var(--cp-red)] text-[10px] tracking-[0.3em] font-bold mt-1">
            PROJECTED_GAUSS_SEIDEL_SOLVER
          </p>
        </div>
        <div className="text-right">
             <div className="flex gap-4 text-[10px] font-bold text-[var(--cp-cyan)]">
                <span>BODIES: {simState.bodies.length}</span>
                <span>CONTACTS: {simState.contacts.length}</span>
                <span className="text-[var(--cp-yellow)]">FPS: 60</span>
             </div>
        </div>
      </header>

      {/* Dashboard Layout */}
      <main className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-4 gap-2">
        
        {/* Left Column: Canvas & Chart */}
        <div className="lg:col-span-3 flex flex-col gap-2 h-full min-h-0">
          <div className="flex-1 relative min-h-0">
            <SimulationCanvas 
                state={simState} 
                setSimState={setSimState} 
                spawnMode={spawnMode}
            />
            {params.paused && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20 pointer-events-none">
                    <div className="border-2 border-[var(--cp-red)] bg-black px-8 py-4 text-[var(--cp-red)] font-bold text-2xl tracking-widest animate-pulse">
                        SIMULATION_HALTED
                    </div>
                </div>
            )}
          </div>
          {/* Chart Container - Fixed height relative to viewport is safer, but flexible is best */}
          <div className="h-32 shrink-0">
             <ConvergenceChart errors={simState.solverErrors} />
          </div>
        </div>

        {/* Right Column: Controls & AI */}
        <div className="flex flex-col gap-2 h-full min-h-0">
          <div className="shrink-0">
             <ControlPanel 
                params={params} 
                setParams={setParams} 
                onReset={handleReset} 
                spawnMode={spawnMode}
                setSpawnMode={setSpawnMode}
              />
          </div>
          <div className="flex-1 min-h-0">
             <AITutor />
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;