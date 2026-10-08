type Gesture = { x0: number; dx: number; dy: number; vx: number };
export function capturesEdgeSwipe({ x0, dx, dy }: Gesture) { return x0 >= 0 && x0 <= 28 && dx > 14 && Math.abs(dy) < 12 && dx > Math.abs(dy) * 2; }
export function completesEdgeSwipe(gesture: Gesture) { return gesture.x0 >= 0 && gesture.x0 <= 28 && gesture.dx >= 80 && Math.abs(gesture.dy) < gesture.dx * 0.35 && gesture.vx >= 0; }
