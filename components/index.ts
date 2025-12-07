/**
 * Component exports - re-exports all components for easy importing
 */

// Transform and physics
export type { Transform } from './Transform';
export { createTransform, setTransformPosition, moveTransform, setTransformFacing, flipTransformFacing } from './Transform';
export type { Physics } from './Physics';
export { createPhysics, setVelocity, applyForce, applyImpulse, setGrounded, updateGroundedTime } from './Physics';

// Player-specific components
export type { PlayerInput } from './PlayerInput';
export { createPlayerInput, clearPlayerInput, setBufferedInput, consumeBufferedInput, updateWeaponZone } from './PlayerInput';

// Re-export component types
export type { Transform as TransformType } from './Transform';
export type { Physics as PhysicsType } from './Physics';
export type { PlayerInput as PlayerInputType } from './PlayerInput';