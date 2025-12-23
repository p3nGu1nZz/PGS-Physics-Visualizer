export interface Vec2 {
  x: number;
  y: number;
}

export interface Body {
  id: number;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  mass: number;
  invMass: number;
  color: string;
  restitution: number;
  trail: Vec2[]; // History of positions
  isStatic: boolean; // Static bodies don't move
}

export interface Contact {
  id: string;
  bodyA: Body;
  bodyB: Body | null; // null implies static wall
  normal: Vec2; // Points from A to B (or wall normal)
  penetration: number;
  impulseAcc: number; // Accumulated impulse (lambda)
  effectiveMass: number;
  bias: number; // Baumgarte stabilization term
}

export interface SimState {
  bodies: Body[];
  contacts: Contact[];
  totalEnergy: number;
  solverErrors: number[]; // Error per iteration for the current frame
}

export interface SimulationParams {
  gravity: number;
  iterations: number;
  restitution: number;
  paused: boolean;
  timeScale: number;
  warmStarting: boolean;
}

export enum MessageRole {
  USER = 'user',
  MODEL = 'model',
}

export interface ChatMessage {
  role: MessageRole;
  text: string;
}