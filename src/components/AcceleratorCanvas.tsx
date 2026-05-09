import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  mass: number;
  charge: number;
  life: number;
  maxLife: number;
}

interface Point {
  x: number;
  y: number;
  angle: number;
}

interface AcceleratorCanvasProps {
  speed: number;
  magneticField: number;
  phase: 'idle' | 'accelerating' | 'colliding' | 'decaying' | 'result';
  onCollisionComplete: () => void;
}

export default function AcceleratorCanvas({ speed, magneticField, phase, onCollisionComplete }: AcceleratorCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const propsRef = useRef({ speed, magneticField, phase, onCollisionComplete });
  
  // Keep props updated for the render loop without tearing it down
  useEffect(() => {
    propsRef.current = { speed, magneticField, phase, onCollisionComplete };
  }, [speed, magneticField, phase, onCollisionComplete]);

  // Simulation State Refs
  const simState = useRef({
    particles: [] as Particle[],
    beams: [] as Point[], // For visualizer during idle/accel, multiple bunches of particles
    ringRadius: 0,
    time: 0,
    glowPhase: 0,
    collisionRadius: 0,
    decayTriggered: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let reqId: number;

    const resize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
        simState.current.ringRadius = Math.min(canvas.width, canvas.height) * 0.4;
        
        // Init beams
        if (simState.current.beams.length === 0) {
          simState.current.beams = [
            { x: 0, y: 0, angle: 0 },
            { x: 0, y: 0, angle: Math.PI } // Opposing beam
          ];
        }
      }
    };

    window.addEventListener('resize', resize);
    resize();

    // The animation loop
    const render = () => {
      const { speed, magneticField, phase, onCollisionComplete } = propsRef.current;

      const W = canvas.width;
      const H = canvas.height;
      const centerX = W / 2;
      const centerY = H / 2;
      const state = simState.current;
      const colorPalette = ['#22d3ee', '#ec4899', '#fbbf24', '#a855f7', '#10b981', '#fff'];

      // Dark fade instead of clear for trails. Less fade during decaying to show trails longer.
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = phase === 'decaying' || phase === 'result' ? 'rgba(5, 5, 8, 0.1)' : 'rgba(5, 5, 8, 0.15)';
      ctx.fillRect(0, 0, W, H);

      ctx.globalCompositeOperation = 'lighter';
      state.time += 0.01;

      // Draw the Accelerator Ring
      ctx.beginPath();
      ctx.arc(centerX, centerY, state.ringRadius, 0, Math.PI * 2);
      ctx.lineWidth = 2;
      ctx.strokeStyle = `rgba(0, 150, 255, ${0.1 + (speed / 100) * 0.2})`;
      ctx.stroke();

      // Reset state for new runs
      if (phase === 'idle') {
         state.decayTriggered = false;
         if (state.particles.length > 0) state.particles = [];
      }

      if (phase === 'idle' || phase === 'accelerating') {
        const angularSpeed = 0.02 + (speed / 100) * 0.15;
        
        state.beams.forEach((beam, i) => {
          // Adjust angle
          beam.angle += angularSpeed;
          
          beam.x = centerX + state.ringRadius * Math.cos(beam.angle);
          beam.y = centerY + state.ringRadius * Math.sin(beam.angle);

          // Draw the beam "bunch"
          const dist = 10 + (speed / 100) * 20; // beam spread
          const pColor = i === 0 ? 'rgba(34, 211, 238, 1)' : 'rgba(236, 72, 153, 1)'; // Cyan / Pink

          for (let j = 0; j < 5 + (speed / 100) * 10; j++) {
            const rx = beam.x + (Math.random() - 0.5) * dist;
            const ry = beam.y + (Math.random() - 0.5) * dist;
            
            ctx.beginPath();
            ctx.arc(rx, ry, Math.random() * 3 + 1, 0, Math.PI * 2);
            ctx.fillStyle = pColor;
            ctx.fill();
            
            // Add some erratic high-energy sparks and stray particles
            if (phase === 'accelerating') {
              if (Math.random() > 0.5) {
                 ctx.beginPath();
                 ctx.moveTo(rx, ry);
                 ctx.lineTo(rx + (Math.random()-0.5)*40, ry + (Math.random()-0.5)*40);
                 ctx.strokeStyle = pColor;
                 ctx.lineWidth = 1.5;
                 ctx.stroke();
              }
              
              // Spray stray charged particles off the beam occasionally
              if (Math.random() > 0.7) {
                  const maxLife = Math.random() * 40 + 20;
                  const v = Math.random() * 8 + (speed / 100) * 5;
                  const angle = beam.angle + (Math.random() - 0.5) * Math.PI;
                  state.particles.push({
                    x: rx, y: ry,
                    vx: Math.cos(angle) * v, vy: Math.sin(angle) * v,
                    radius: Math.random() * 2 + 1,
                    color: Math.random() > 0.5 ? pColor : colorPalette[Math.floor(Math.random() * colorPalette.length)],
                    mass: Math.random() * 2 + 0.5,
                    charge: Math.random() > 0.5 ? 1 : -1,
                    life: maxLife, maxLife: maxLife,
                  });
              }
            }
          }
        });
        state.collisionRadius = state.ringRadius;
      } 
      else if (phase === 'colliding') {
        const spiralSpeed = 5 + (speed / 100) * 10;
        state.collisionRadius -= spiralSpeed;

        if (state.collisionRadius <= 5) {
          if (!state.decayTriggered) {
            state.decayTriggered = true;
            onCollisionComplete(); 
            
            // Generate EXACT Decay Particles Burst! Much higher count now.
            const numParticles = 250 + speed * 4;
            for (let k=0; k<numParticles; k++) {
              const angle = Math.random() * Math.PI * 2;
              // Add variance in speed for shells
              const baseV = Math.random() > 0.8 ? 25 : 10; 
              const v = Math.random() * baseV + (speed / 100) * 20;
              const chargeOptions = [-1, -0.5, 0, 0.5, 1];
              const maxLife = Math.random() * 120 + 40;

              state.particles.push({
                x: centerX,
                y: centerY,
                vx: Math.cos(angle) * v,
                vy: Math.sin(angle) * v,
                radius: Math.random() * 3 + 1.5,
                color: colorPalette[Math.floor(Math.random() * colorPalette.length)],
                mass: Math.random() * 2 + 0.1,
                charge: chargeOptions[Math.floor(Math.random() * chargeOptions.length)],
                life: maxLife,
                maxLife: maxLife,
              });
            }

            // A huge initial spark from center
            ctx.shadowBlur = 150;
            ctx.shadowColor = '#fff';
            ctx.beginPath();
            ctx.arc(centerX, centerY, 80 + Math.random()*40, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            ctx.shadowBlur = 0;
          }
        } else {
           state.decayTriggered = false;
           const angularSpeed = 0.1 + (speed / 100) * 0.3;
           
           // Sparks off the colliding beams
           const dist = 5 + state.collisionRadius * 0.2;

           state.beams.forEach((beam, i) => {
            beam.angle += angularSpeed;
            beam.x = centerX + state.collisionRadius * Math.cos(beam.angle);
            beam.y = centerY + state.collisionRadius * Math.sin(beam.angle);
            
            const pColor = i === 0 ? '#22d3ee' : '#ec4899';

            ctx.beginPath();
            ctx.arc(beam.x, beam.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
            
            ctx.shadowBlur = 30;
            ctx.shadowColor = pColor;
            ctx.beginPath();
            ctx.arc(beam.x, beam.y, 25, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Insane sparking during spiral
            for(let sp=0; sp<3; sp++) {
                const rx = beam.x + (Math.random() - 0.5) * dist;
                const ry = beam.y + (Math.random() - 0.5) * dist;
                ctx.beginPath();
                ctx.moveTo(rx, ry);
                ctx.lineTo(rx + (Math.random()-0.5)*80, ry + (Math.random()-0.5)*80);
                ctx.strokeStyle = pColor;
                ctx.lineWidth = 1.5;
                ctx.stroke();

                // Drop stray particles inwards
                if (Math.random() > 0.6) {
                    const maxLife = Math.random() * 20 + 10;
                    state.particles.push({
                        x: rx, y: ry,
                        vx: (centerX - rx) * 0.05 + (Math.random() - 0.5) * 8,
                        vy: (centerY - ry) * 0.05 + (Math.random() - 0.5) * 8,
                        radius: Math.random() * 2 + 1,
                        color: pColor,
                        mass: Math.random() * 1.5 + 0.5,
                        charge: Math.random() > 0.5 ? 1 : -1,
                        life: maxLife, maxLife: maxLife,
                    });
                }
            }
           });
        }
      } 
      
      // Background flashes during decay immediately after collision
      if (phase === 'decaying' && state.particles.length > 500) {
        if (Math.random() > 0.7) {
            ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.05})`;
            ctx.fillRect(0, 0, W, H);
        }
      }

      // Render all particles (stray and decay alike)
      const B = (magneticField / 100); 
      for (let i = state.particles.length - 1; i >= 0; i--) {
        const p = state.particles[i];
        if (p.life <= 0) {
            state.particles.splice(i, 1);
            continue;
        }

        // B-Field limits curve
        const ax = (p.charge * p.vy * B) / p.mass;
        const ay = -(p.charge * p.vx * B) / p.mass;

        p.vx += ax;
        p.vy += ay;
        
        // Friction / Energy Loss
        p.vx *= 0.985;
        p.vy *= 0.985;

        p.x += p.vx;
        p.y += p.vy;
        
        p.life -= 1;

        // Draw Particle
        const lifeRatio = Math.max(0, p.life / p.maxLife);
        const currentRadius = Math.max(0, p.radius * lifeRatio);
        
        // Use single fill for high performance
        ctx.beginPath();
        // Convert hex or named color to an approximate visual or just rely on globalAlpha minimally
        ctx.globalAlpha = lifeRatio;
        ctx.fillStyle = p.color;
        
        // Just draw a single circle. The lighter composite operation makes it look glowy organically.
        if (lifeRatio > 0.8 || p.radius >= 3) {
            // Hot core
            ctx.arc(p.x, p.y, currentRadius * 1.5, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.beginPath();
            ctx.fillStyle = '#fff';
            ctx.arc(p.x, p.y, currentRadius * 0.5, 0, Math.PI * 2);
            ctx.fill();
        } else {
            ctx.arc(p.x, p.y, currentRadius, 0, Math.PI * 2);
            ctx.fill();
        }
        
        // Connect very close energetic particles (simulating plasma behavior or secondary arcs)
        if (phase === 'decaying' && lifeRatio > 0.9 && Math.random() > 0.98 && i > 0) {
            const nextP = state.particles[i - 1];
            // Fast distance check without hypot function call
            const dx = p.x - nextP.x;
            const dy = p.y - nextP.y;
            if (dx * dx + dy * dy < 1600) { // 40^2 = 1600
                ctx.beginPath();
                ctx.moveTo(p.x, p.y);
                ctx.lineTo(nextP.x, nextP.y);
                ctx.strokeStyle = p.color;
                ctx.lineWidth = 0.5;
                ctx.stroke();
            }
        }
        ctx.globalAlpha = 1.0;
      }

      reqId = requestAnimationFrame(render);
    };

    reqId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(reqId);
      window.removeEventListener('resize', resize);
    };
  }, []); // Empty dependency array - loop runs forever, reads from propsRef

  return (
    <canvas ref={canvasRef} className="absolute inset-0 w-full h-full border border-slate-800 shadow-[0_0_50px_rgba(34,211,238,0.1)] rounded-lg" />
  );
}
