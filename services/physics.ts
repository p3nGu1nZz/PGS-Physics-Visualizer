import { Body, Contact, SimState, Vec2 } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, PIXELS_PER_METER, TIMESTEP, BAUMGARTE, SLOP, TRAIL_LENGTH, MAX_BODIES } from '../constants';

// Vector Math Helpers
export const vAdd = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x + b.x, y: a.y + b.y });
export const vSub = (a: Vec2, b: Vec2): Vec2 => ({ x: a.x - b.x, y: a.y - b.y });
export const vScale = (v: Vec2, s: number): Vec2 => ({ x: v.x * s, y: v.y * s });
export const vDot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y;
export const vLen = (v: Vec2): number => Math.sqrt(v.x * v.x + v.y * v.y);
export const vNorm = (v: Vec2): Vec2 => {
  const len = vLen(v);
  return len > 0 ? vScale(v, 1 / len) : { x: 0, y: 0 };
};
export const vDist = (a: Vec2, b: Vec2): number => vLen(vSub(a, b));

// --- Body Factory ---
export const createBody = (x: number, y: number, id: number, isStatic: boolean = false): Body => {
    const radius = 0.4 + Math.random() * 0.4;
    // Static bodies get infinite mass (invMass = 0)
    const mass = radius * radius * Math.PI;
    const invMass = isStatic ? 0 : 1 / mass;
    
    return {
        id,
        pos: { x, y },
        vel: isStatic ? { x: 0, y: 0 } : { x: (Math.random() - 0.5) * 8, y: (Math.random() - 0.5) * 8 },
        radius,
        mass,
        invMass,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
        restitution: 0.5,
        trail: [],
        isStatic
    };
};

// --- Initial State Factory ---

export const createInitialState = (count: number = MAX_BODIES): SimState => {
  const bodies: Body[] = [];
  const widthM = CANVAS_WIDTH / PIXELS_PER_METER;
  const heightM = CANVAS_HEIGHT / PIXELS_PER_METER;

  for (let i = 0; i < count; i++) {
     bodies.push(createBody(
        (Math.random() * (widthM - 2)) + 1,
        (Math.random() * (heightM - 2)) + 1,
        i
     ));
  }
  return { bodies, contacts: [], totalEnergy: 0, solverErrors: [] };
};

// --- Physics Pipeline ---

export const stepPhysics = (
  state: SimState,
  params: { gravity: number; iterations: number; restitution: number; warmStarting: boolean }
): SimState => {
  const { bodies } = state;
  const contacts: Contact[] = [];

  // 1. Integrate Velocity (Gravity)
  bodies.forEach(b => {
    if (b.invMass === 0 || b.isStatic) return;
    b.vel.y += params.gravity * TIMESTEP;
  });

  // 2. Broadphase & Narrowphase (Collision Detection)
  
  // Wall Constraints (Floor, Ceiling, Walls)
  const widthM = CANVAS_WIDTH / PIXELS_PER_METER;
  const heightM = CANVAS_HEIGHT / PIXELS_PER_METER;

  bodies.forEach(b => {
    // Floor
    if (b.pos.y + b.radius > heightM) {
      contacts.push(createWallContact(b, { x: 0, y: -1 }, heightM - (b.pos.y + b.radius), params.restitution));
    }
    // Ceiling
    if (b.pos.y - b.radius < 0) {
      contacts.push(createWallContact(b, { x: 0, y: 1 }, (b.pos.y - b.radius) - 0, params.restitution));
    }
    // Left Wall
    if (b.pos.x - b.radius < 0) {
      contacts.push(createWallContact(b, { x: 1, y: 0 }, (b.pos.x - b.radius) - 0, params.restitution));
    }
    // Right Wall
    if (b.pos.x + b.radius > widthM) {
      contacts.push(createWallContact(b, { x: -1, y: 0 }, widthM - (b.pos.x + b.radius), params.restitution));
    }
  });

  // Body-Body Constraints (Naive O(N^2))
  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const A = bodies[i];
      const B = bodies[j];
      
      // If both are static, ignore collision
      if (A.isStatic && B.isStatic) continue;

      const dist = vDist(A.pos, B.pos);
      const totalRad = A.radius + B.radius;
      
      if (dist < totalRad) {
        const normal = vNorm(vSub(B.pos, A.pos)); // Normal A -> B
        const penetration = dist - totalRad;
        
        const k = A.invMass + B.invMass;
        const effectiveMass = k > 0 ? 1 / k : 0;
        
        // Baumgarte Stabilization
        const bias = -BAUMGARTE * (Math.min(0, penetration + SLOP) / TIMESTEP);

        // Warm Start
        let initialImpulse = 0;
        if (params.warmStarting) {
           const existing = state.contacts.find(c => 
             (c.bodyA.id === A.id && c.bodyB?.id === B.id) || 
             (c.bodyA.id === B.id && c.bodyB?.id === A.id)
           );
           if (existing) {
             initialImpulse = existing.impulseAcc;
           }
        }

        contacts.push({
          id: `${A.id}-${B.id}`,
          bodyA: A,
          bodyB: B,
          normal,
          penetration,
          impulseAcc: initialImpulse,
          effectiveMass,
          bias,
        });
      }
    }
  }

  // Warm Start
  if (params.warmStarting) {
    contacts.forEach(c => {
      const impulse = vScale(c.normal, c.impulseAcc);
      c.bodyA.vel = vSub(c.bodyA.vel, vScale(impulse, c.bodyA.invMass));
      if (c.bodyB) {
        c.bodyB.vel = vAdd(c.bodyB.vel, vScale(impulse, c.bodyB.invMass));
      }
    });
  }

  // 3. Projected Gauss-Seidel Solver
  const solverErrors: number[] = [];

  for (let i = 0; i < params.iterations; i++) {
    let maxError = 0;

    contacts.forEach(c => {
      // Relative Velocity: V_rel = Vb - Va
      let rv = c.bodyB ? vSub(c.bodyB.vel, c.bodyA.vel) : vSub({ x: 0, y: 0 }, c.bodyA.vel);
      
      // Velocity along normal
      const contactVel = vDot(rv, c.normal);

      let restitutionBias = 0;
      if (contactVel < -1.0) {
        restitutionBias = -params.restitution * contactVel;
      }
      
      const lambda = -c.effectiveMass * (contactVel + c.bias + restitutionBias);

      const oldImpulse = c.impulseAcc;
      c.impulseAcc = Math.max(0, oldImpulse + lambda);
      const deltaImpulse = c.impulseAcc - oldImpulse;

      const impulseVec = vScale(c.normal, deltaImpulse);
      
      c.bodyA.vel = vSub(c.bodyA.vel, vScale(impulseVec, c.bodyA.invMass));
      
      if (c.bodyB) {
        c.bodyB.vel = vAdd(c.bodyB.vel, vScale(impulseVec, c.bodyB.invMass));
      }

      maxError = Math.max(maxError, Math.abs(lambda));
    });
    solverErrors.push(maxError);
  }

  // 4. Integrate Position & Clamp to World Bounds
  bodies.forEach(b => {
    // Skip integration for static bodies
    if (b.isStatic || b.invMass === 0) return;

    // Record Trail before update
    // Performance optimization: only record if speed is significant
    const speed = vLen(b.vel);
    if (speed > 0.1) {
        b.trail.unshift({ ...b.pos });
        if (b.trail.length > TRAIL_LENGTH) {
            b.trail.pop();
        }
    } else if (b.trail.length > 0) {
        // Slowly decay trail if standing still
        b.trail.pop();
    }

    b.pos = vAdd(b.pos, vScale(b.vel, TIMESTEP));

    // Simple position clamping to prevent tunneling
    // This is a safety measure if the solver fails to keep them inside
    if (b.pos.x - b.radius < 0) { b.pos.x = b.radius; b.vel.x *= -0.5; }
    if (b.pos.x + b.radius > widthM) { b.pos.x = widthM - b.radius; b.vel.x *= -0.5; }
    if (b.pos.y - b.radius < 0) { b.pos.y = b.radius; b.vel.y *= -0.5; }
    if (b.pos.y + b.radius > heightM) { b.pos.y = heightM - b.radius; b.vel.y *= -0.5; }
  });

  return { ...state, contacts, solverErrors };
};

const createWallContact = (body: Body, normal: Vec2, penetration: number, restitution: number): Contact => {
  const effectiveMass = 1 / body.invMass; 
  const bias = -BAUMGARTE * (Math.min(0, penetration + SLOP) / TIMESTEP);
  return {
    id: `wall-${body.id}`,
    bodyA: body,
    bodyB: null,
    normal,
    penetration,
    impulseAcc: 0,
    effectiveMass,
    bias,
  };
};