import React from 'react';
import { SimulationParams } from '../types';
import { Play, Pause, RefreshCw, Box, Zap } from 'lucide-react';

interface Props {
  params: SimulationParams;
  setParams: React.Dispatch<React.SetStateAction<SimulationParams>>;
  onReset: () => void;
  spawnMode: 'dynamic' | 'static';
  setSpawnMode: React.Dispatch<React.SetStateAction<'dynamic' | 'static'>>;
}

const ControlPanel: React.FC<Props> = ({ params, setParams, onReset, spawnMode, setSpawnMode }) => {
  const handleChange = (key: keyof SimulationParams, value: number | boolean) => {
    setParams(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="cp-border bg-[var(--cp-panel)] p-3 text-[var(--cp-cyan)] flex flex-col gap-3 relative">
      <div className="absolute top-0 right-0 bg-[var(--cp-yellow)] text-black text-[10px] px-2 py-0.5 font-bold">
        SYS.CONFIG
      </div>
      
      <h2 className="text-lg font-bold border-b border-[var(--cp-red)] pb-1 cp-text-shadow">
        SOLVER_CONTROLS
      </h2>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={() => handleChange('paused', !params.paused)}
          className={`group flex items-center justify-center gap-2 p-2 border font-bold transition-all uppercase tracking-wider text-xs
            ${params.paused 
                ? 'border-[var(--cp-yellow)] text-[var(--cp-yellow)] hover:bg-[var(--cp-yellow)] hover:text-black' 
                : 'border-[var(--cp-red)] text-[var(--cp-red)] hover:bg-[var(--cp-red)] hover:text-black'
            }`}
        >
          {params.paused ? <Play size={14} /> : <Pause size={14} />}
          {params.paused ? "RESUME" : "HALT"}
        </button>
        <button
          onClick={onReset}
          className="flex items-center justify-center gap-2 p-2 border border-[var(--cp-cyan)] text-[var(--cp-cyan)] hover:bg-[var(--cp-cyan)] hover:text-black font-bold transition-all uppercase tracking-wider text-xs"
        >
          <RefreshCw size={14} />
          RESET
        </button>
      </div>

      {/* Spawn Mode Toggle */}
      <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-400">ENTITY_FABRICATION_MODE</label>
          <div className="flex border border-gray-700">
              <button 
                onClick={() => setSpawnMode('dynamic')}
                className={`flex-1 p-1.5 flex items-center justify-center gap-2 text-[10px] font-bold transition-colors ${spawnMode === 'dynamic' ? 'bg-[var(--cp-cyan)] text-black' : 'text-gray-500 hover:text-[var(--cp-cyan)]'}`}
              >
                  <Zap size={12} /> DYNAMIC
              </button>
              <button 
                onClick={() => setSpawnMode('static')}
                className={`flex-1 p-1.5 flex items-center justify-center gap-2 text-[10px] font-bold transition-colors ${spawnMode === 'static' ? 'bg-[var(--cp-cyan)] text-black' : 'text-gray-500 hover:text-[var(--cp-cyan)]'}`}
              >
                  <Box size={12} /> STATIC
              </button>
          </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="flex justify-between mb-0.5">
            <label className="text-[10px] font-bold">ITERATIONS</label>
            <span className="text-[10px] font-mono text-[var(--cp-yellow)]">[{params.iterations.toString().padStart(2, '0')}]</span>
          </div>
          <input
            type="range"
            min="1"
            max="50"
            value={params.iterations}
            onChange={(e) => handleChange('iterations', parseInt(e.target.value))}
            className="w-full h-1 bg-gray-800 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[var(--cp-cyan)] [&::-webkit-slider-thumb]:border-none"
          />
        </div>

        <div>
          <div className="flex justify-between mb-0.5">
            <label className="text-[10px] font-bold">GRAVITY</label>
            <span className="text-[10px] font-mono text-[var(--cp-yellow)]">{params.gravity.toFixed(1)} m/s²</span>
          </div>
          <input
            type="range"
            min="0"
            max="20"
            step="0.1"
            value={params.gravity}
            onChange={(e) => handleChange('gravity', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-800 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[var(--cp-cyan)]"
          />
        </div>

        <div>
          <div className="flex justify-between mb-0.5">
            <label className="text-[10px] font-bold">RESTITUTION</label>
            <span className="text-[10px] font-mono text-[var(--cp-yellow)]">{(params.restitution * 100).toFixed(0)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1.2"
            step="0.05"
            value={params.restitution}
            onChange={(e) => handleChange('restitution', parseFloat(e.target.value))}
            className="w-full h-1 bg-gray-800 appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-[var(--cp-cyan)]"
          />
        </div>

         <div className="flex items-center justify-between border border-gray-800 p-1.5">
            <label className="text-[10px] font-bold">WARM_START</label>
            <button 
              className={`w-3 h-3 border ${params.warmStarting ? 'bg-[var(--cp-yellow)] border-[var(--cp-yellow)]' : 'border-gray-600'}`}
              onClick={() => handleChange('warmStarting', !params.warmStarting)}
            />
        </div>

      </div>
      
      <div className="mt-auto text-[8px] text-gray-600 font-mono">
        PGS_SOLVER_V.1.0
      </div>
    </div>
  );
};

export default ControlPanel;