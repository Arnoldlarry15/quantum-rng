import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Zap, Magnet, Activity, Orbit, RefreshCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import AcceleratorCanvas from './components/AcceleratorCanvas';

export default function App() {
  const [phase, setPhase] = useState<'idle' | 'accelerating' | 'colliding' | 'decaying' | 'result'>('idle');
  const [speed, setSpeed] = useState(50);
  const [magneticField, setMagneticField] = useState(50);
  const [resultNumber, setResultNumber] = useState<number | null>(null);

  const startSequence = () => {
    setPhase('accelerating');
    // Accelerate for 2 seconds
    setTimeout(() => {
      setPhase('colliding');
    }, 2000);
  };

  const handleCollisionComplete = useCallback(() => {
    // This removes the "colliding" phase immediately once beams reach center inside AcceleratorCanvas
    setPhase('decaying');
    
    // Generate the result
    const num = Math.floor(Math.random() * 10) + 1;
    setResultNumber(num);

    // Show result after decay particles start fading (~2.5s)
    setTimeout(() => {
      setPhase('result');
    }, 2500);
  }, []);

  const reset = () => {
    setPhase('idle');
    setResultNumber(null);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-cyan-900 flex flex-col md:flex-row">
      {/* Sidebar Controls */}
      <aside className="w-full md:w-80 border-b md:border-b-0 md:border-r border-slate-800 bg-[#0a0a0f] flex flex-col p-6 z-10 overflow-y-auto">
        <div className="flex items-center gap-3 mb-10 text-cyan-400">
          <Orbit className="w-8 h-8 animate-spin-slow" />
          <h1 className="text-xl font-bold tracking-widest uppercase">Quantum Collidor</h1>
        </div>

        <div className="space-y-8 flex-1">
          {/* Controls */}
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-2"><Zap size={16} /> Injection Speed</span>
              <span>{speed}%</span>
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              value={speed} 
              onChange={(e) => setSpeed(parseInt(e.target.value))}
              disabled={phase !== 'idle'}
              className="disabled:opacity-50"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm uppercase tracking-wider text-slate-400">
              <span className="flex items-center gap-2"><Magnet size={16} /> Magnetic Field (B)</span>
              <span>{magneticField}T</span>
            </div>
            <input 
              type="range" 
              min="-100" 
              max="100" 
              value={magneticField} 
              onChange={(e) => setMagneticField(parseInt(e.target.value))}
              disabled={phase !== 'idle'}
              className="disabled:opacity-50"
            />
          </div>

          {/* Telemetry Status */}
          <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-800 shadow-inner">
            <h3 className="text-xs uppercase tracking-widest text-slate-500 mb-4 flex items-center gap-2">
              <Activity size={14} /> Telemetry
            </h3>
            <div className="space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">STATUS:</span>
                <span className={`uppercase font-bold ${
                  phase === 'result' ? 'text-green-400' :
                  phase === 'decaying' ? 'text-purple-400' :
                  phase === 'colliding' ? 'text-pink-500 animate-pulse' :
                  phase === 'accelerating' ? 'text-cyan-400 animate-pulse' :
                  'text-slate-300'
                }`}>
                  {phase}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">BEAM ENERGY:</span>
                <span className="text-cyan-200">{(speed * 14.2).toFixed(1)} TeV</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">B-FIELD DEFLECTION:</span>
                <span className="text-pink-300">{(magneticField * 0.05).toFixed(2)} rad</span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8">
          {phase === 'idle' ? (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={startSequence}
              className="w-full bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 py-4 uppercase tracking-widest font-bold rounded shadow-[0_0_15px_rgba(34,211,238,0.2)] hover:shadow-[0_0_25px_rgba(34,211,238,0.4)] transition-all"
            >
              Initialize Collision
            </motion.button>
          ) : phase === 'result' ? (
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={reset}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 py-4 uppercase tracking-widest font-bold rounded flex items-center justify-center gap-2"
            >
              <RefreshCcw size={18} /> Reset Sequence
            </motion.button>
          ) : (
            <div className="w-full bg-slate-900 border border-slate-800 py-4 uppercase tracking-widest font-bold rounded text-center text-slate-500 relative overflow-hidden">
              <motion.div 
                className="absolute inset-0 bg-cyan-900/20"
                animate={{ x: ['-100%', '100%'] }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
              />
              System Active...
            </div>
          )}
        </div>
      </aside>

      {/* Main Viewport */}
      <main className="flex-1 relative bg-black flex items-center items-stretch p-4 md:p-8">
        <div className="relative w-full h-full flex items-center justify-center">
          {/* Hardware Frame UI around canvas */}
          <div className="absolute inset-0 border border-slate-800/50 rounded-lg pointer-events-none z-0">
             <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-slate-600"></div>
             <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-slate-600"></div>
             <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-600"></div>
             <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-slate-600"></div>
          </div>
          
          <AcceleratorCanvas 
            speed={speed} 
            magneticField={magneticField} 
            phase={phase} 
            onCollisionComplete={handleCollisionComplete}
          />
          
          {/* Result Number Overlay */}
          <AnimatePresence>
            {phase === 'result' && resultNumber !== null && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.5, filter: 'blur(20px)' }}
                animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                exit={{ opacity: 0, scale: 1.5, filter: 'blur(20px)' }}
                transition={{ duration: 0.8, type: 'spring' }}
                className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
              >
                <div className="text-[12rem] md:text-[20rem] font-black leading-none text-transparent bg-clip-text bg-gradient-to-br from-cyan-300 via-pink-400 to-yellow-300 filter drop-shadow-[0_0_40px_rgba(236,72,153,0.8)]">
                  {resultNumber}
                </div>
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  className="font-mono text-cyan-200 tracking-[0.5em] uppercase text-sm mt-4 bg-black/50 px-6 py-2 rounded-full border border-cyan-900/50"
                >
                  Subatomic State Determined
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
