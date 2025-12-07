# 2D Soulslike Side-Scroller: Game Design Document

## Project Codename: EDGE

---

# 1. Vision Statement

A 2D side-scrolling action game featuring a directional, stance-based melee combat system inspired by Kingdom Come: Deliverance's weapon positioning and Dark Souls' stamina/timing mechanics. All graphics rendered as SVG for crisp scaling and procedural animation. Combat rewards observation, timing, and reading opponent tells over button mashing.

---

# 2. Core Design Pillars

**Pillar 1: Readable Combat**
- Every attack has clear wind-up, active, and recovery frames
- Player death should always feel deserved
- Enemies telegraph attacks through visual cues
- **UI Indicators** clearly show current stance/zone

**Pillar 2: Positional Depth**
- Mouse-controlled weapon angle creates asymmetric attack/defense zones
- Height differences (crouching, jumping) interact meaningfully with weapon positions
- Spacing is a core skill

**Pillar 3: Resource Tension**
- Stamina governs all offensive and defensive actions
- Health does not regenerate freely
- Commitment to actions creates risk/reward decisions
- **Stamina Exhaustion** leaves player vulnerable

**Pillar 4: Visual Clarity**
- SVG graphics rendered to **Canvas** ensure clean silhouettes
- Hitboxes match visuals precisely
- Distinct color coding for interactable elements

---

# 3. Control Scheme

## 3.1 Movement Controls

| Input | Action | Notes |
|-------|--------|-------|
| A | Move Left | Hold for continuous movement |
| D | Move Right | Hold for continuous movement |
| Shift | Run | Hold to sprint (costs stamina) |
| W | Move Up / Interact | Climb ladders; Interact with objects (Doors/Levers) |
| S | Crouch | Low profile |
| Space | Jump / Dismount | Jumps off ladder (if climbing); Normal jump otherwise with variable height based on hold duration |
| G | Dodge Roll | I-frames at start, costs stamina |
| V | Crouch Slide | Initiates from movement, momentum-based |

## 3.2 Combat Controls

| Input | Action | Notes |
|-------|--------|-------|
| Mouse Position | Weapon Angle | Continuous tracking relative to **Facing Direction** |
| LMB | Light Attack | Swings from current weapon angle |
| RMB | Block | Raises guard at current weapon angle |
| E | Heavy Attack | Slower, more damage, more stamina |
| Q | Parry | Tight timing window, high reward |
| Alt | Backstep | Quick retreat without full roll |

## 3.3 Weapon Angle System

The mouse position relative to the player character defines a weapon angle divided into **3 attack zones + 1 defensive stance** relative to the character's **facing direction**:

```
        Zone 1 (High)
           ↑
[Guard] ←─────→ Zone 2 (Mid)
  (0)      ↓
        Zone 3 (Low)
```

**Zones (Assuming Player Facing Right):**

| Zone | Mouse Position | Purpose |
|------|----------------|---------|
| High (1) | Above player center | Overhead attacks, blocks high |
| Mid (2) | Level with player | Horizontal slashes, standard guard |
| Low (3) | Below player center | Leg sweeps, blocks low |
| Guard (0) | Behind player | Cannot attack, enhanced block stability (+20%), auto-blocks all zones at reduced efficiency (45% damage reduction instead of 90%, stamina cost increased by 50%) |

**Guard Stance** (Zone 0): Mouse positioned behind the player character.
- Distinct from active blocking (RMB held in Zones 1-3)
- Provides passive defensive bonuses but cannot initiate attacks
- UI should display "GUARD" indicator rather than "Zone 0"
- Primary use: Defensive positioning when not actively engaging
- **Guard Stance requires RMB to be held to block; without RMB, the player is vulnerable**
- **When blocking in Guard Stance (RMB held):**
  - Incoming attacks are reduced by **60%** (up from 45%) regardless of zone.
  - Stamina cost is increased by **10%** (down from 50%) compared to a standard block.
  - **Strategic Purpose:** A "panic" guard that is safer against mixed-ups/feints but less stamina-efficient than a read.

## 3.4 Input Buffering

**Buffer Window:** 8 frames (133ms) before current action ends

**Bufferable Actions:**
- Attacks (queue next attack during recovery)
- Dodge roll (queue during any recovery)
- Jump (queue during landing recovery)

**Non-Bufferable:**
- Block (must hold, instant activation)
- Parry (timing-critical, no buffer)

**Implementation:**

A single buffer slot is used (not a queue), but overwrites are priority-gated:

```typescript
interface BufferedInput {
  action: 'lightAttack' | 'heavyAttack' | 'roll' | 'jump';
  timestamp: number;
  priority: number; // 1: Low (Jump), 2: Med (Attack), 3: High (Roll)
}

// In PlayerInputComponent:
// Logic: If a new input arrives, overwrite the buffer ONLY if:
// 1. The new input has higher or equal priority to the existing buffered input
// 2. OR the existing buffered input has expired (>133ms old)
buffer: BufferedInput | null;
```

---

# 4. Combat System

## 4.1 Stamina Mechanics

*See Section 13.1 for exact values.*

**Key mechanics**:
- Stamina costs vary by action (attacks, blocks, movement)
- Regeneration pauses during blocking and attack recovery (controlled by `StaminaComponent.regenPaused`)
- Exhaustion state triggers at 0, prevents actions until 30% recovered

**Stamina Exhaustion**:
- If stamina reaches 0 or below, player enters **Exhausted State**.
- Cannot Run, Attack, or Roll for 1.5 seconds or until stamina regenerates to 30%.
- Blocking while Exhausted results in immediate Guard Break.

## 4.2 Attack Frame Data Structure

*See Section 13.2 for exact timing values.*

Every attack consists of:

1. **Anticipation Phase** (Wind-up): Vulnerable, can be canceled early with dodge
2. **Active Phase** (Swing): Hitbox active, cannot cancel
3. **Impact Frame**: The precise moment damage is calculated
4. **Recovery Phase** (Follow-through): Vulnerable, cannot act

## 4.3 Block and Parry System

**Blocking (RMB Hold)**:
- Reduces incoming damage by 70-90% based on zone match
- Perfect zone match: 90% reduction
- Adjacent zone: 70% reduction
- Unmatched zone (e.g. High vs Low): 30% reduction (guard broken, staggered)
- Drains stamina on hit
- If stamina depletes while blocking: guard break, long stagger
- **No stamina regeneration while blocking** (must drop guard to regen)

**Guard Stance Blocking (RMB Hold in Zone 0)**:
- All incoming attacks reduced by 45% regardless of attack zone
- Stamina cost increased by 50% compared to normal blocking
- Block stability increased by 20%
- Cannot initiate attacks from Guard Stance

**Parrying (Q)**:
- 6-frame window (100ms at 60fps)
- Parry attempt costs 5 stamina
- Successful parry: enemy staggered, player recovers 15 stamina, counter-attack window opens
- Failed parry: player staggered, costs an additional 20 stamina (25 total)
- Zone matching still applies (perfect parry requires zone match)

## 4.4 Damage Calculation

```
Base Damage × Zone Modifier × Stance Modifier × Counter Modifier = Final Damage
```

| Zone Match | Modifier |
|------------|----------|
| Perfect (hit unguarded zone) | 1.0 |
| Adjacent zone partially blocked | 0.5 |
| Matched zone blocked | 0.1 |
| Counter-attack (post-parry) | 1.5 |
| Backstab (future feature) | 2.0 |

## 4.5 Stagger and Poise

**Poise**: Hidden stat determining stagger resistance

- Light attacks deal 20 poise damage
- Heavy attacks deal 50 poise damage
- When poise breaks: character is staggered for 36 frames
- Poise regenerates at **20 per second** after **5 seconds** of not taking hits.

## 4.6 Combat Tuning Targets

| Scenario | Expected Outcome |
|----------|------------------|
| Player vs Hollow (no blocking) | Player dies in 6-7 hits |
| Player vs Hollow (perfect play) | Hollow dies in 3 light attacks |
| Player vs Soldier (trading hits) | Player loses trades slightly |
| Player vs Brute (blocked heavy) | Player loses 30-40% stamina |
| Parry → Counter vs Soldier | Kills or nearly kills |
| Player full stamina to exhaustion | ~6-7 light attacks or ~3 heavy attacks |

## 4.7 Damage Invulnerability and Hit Stop

**Invulnerability:**
- After taking damage: **30 frames (500ms)** of invulnerability
- Visual indicator: Character flashes (alternates opacity every 4 frames)
- Does not apply to environmental hazards (can be hit repeatedly by spikes)
- Does not apply during guard break stagger (can be combo'd)

**Hit Stop (Frame Freeze):**
Brief pause on impact to accentuate force.
- Light Hit: 2 frames
- Heavy Hit: 4 frames
- Parry: Time-slow (see Visual Effects)

## 4.8 Feint Mechanics

**Enemy Feints:**
- During anticipation phase, enemy can cancel and restart with different zone
- Visual tell: Brief pause/stutter at 50% of wind-up
- Feint costs the enemy stamina (half of attack cost)
- Only Duelist and Boss-type enemies use feints

**Player Feints (Future Feature):**
- Not implemented in initial version
- Design space reserved for advanced combat expansion

---

# 5. Movement System

## 5.1 Ground Movement

**Walk Speed**: 150 pixels/second
**Run Speed**: 250 pixels/second (Hold Shift)

**Crouch (S)**:
- Reduces hurtbox height by 40%
- Movement speed reduced by 50%
- Evades high attacks
- Enables low attacks

**Crouch Slide (V)**:
- Initiated by pressing V while moving
- Covers 200 pixels over 500ms
- Low hurtbox throughout (same as crouch)
- Can transition into crouch or stand
- **500ms cooldown**
- **Stamina cost: 15**
- Slides under overhead attacks
- Can transition directly into rising attack (unique attack from slide)
- Primary use case: Gap closer with low profile

## 5.2 Aerial Movement

**Jump (Space)**:
- Variable height: ~127-184 pixels based on hold duration (see Section 13.3 for physics values)
- Horizontal momentum preserved
- Can attack once in air (jump attack)
- Cannot block while airborne
- Can dodge roll immediately on landing (roll cancel)

**Drop Down (S + Space)**:
- Drop through semi-solid platforms.

**Jump Attack**:
- Diagonal downward swing
- More damage than ground light attack (1.2x multiplier)
- Poise damage: Light attack poise damage × 1.2
- Hitbox shape: Angled rectangle covering downward-forward arc
- Long landing recovery if whiffed (16 frames)
- Minimal recovery if hit connects (landing recovery canceled)
- Timing: 6 frames anticipation, 6 frames active, 16 frames recovery (28 total / 467ms)

**Slide Attack**:
- Rising slash from slide
- Poise damage: Light attack poise damage × 1.0

## 5.3 Dodge Roll (G)

- 12 i-frames (200ms at 60fps) at roll start
- Total duration: 30 frames (500ms)
- Distance: 180 pixels
- Direction: Always toward current facing (tap A/D during start of roll to change facing/direction)
- Recovery: 10 frames before next action
- Cannot roll while airborne

## 5.4 Backstep (Alt)

- Quick backward hop
- 6 i-frames (100ms)
- Distance: 80 pixels
- Total duration: 18 frames (300ms)
- Lower stamina cost than roll
- Good for spacing, less i-frames

## 5.5 Jump Forgiveness

**Coyote Time:** 6 frames (100ms)
- After walking off platform, can still initiate jump
- Preserves grounded jump height
- Timer resets when grounded

**Jump Buffer:** 6 frames (100ms)
- Press jump slightly before landing, jump executes on land
- Prevents "eaten inputs"
- Buffer clears if another action is taken

---

# 6. Player Character

## 6.1 Attributes

| Attribute | Base Value | Purpose |
|-----------|------------|---------|
| Health | 100 | Damage before death |
| Stamina | 100 | Action resource |
| Poise | 40 | Stagger resistance |
| Attack Power | 20 | Base damage |
| Block Stability | 50 | Stamina efficiency when blocking |

## 6.2 SVG Character Structure

The player character is composed of modular SVG groups forming a skeletal hierarchy. Each bone has an explicit pivot point for rotation-based animation.

**Note:** The current animation system is purely FK (Forward Kinematics). IK (Inverse Kinematics) for foot placement or precise aiming is out of scope for this version.

### Skeleton Hierarchy

```
root (world position)
└── body-pivot (jump, knockback, overall lean)
    └── hip (weight shift, walk cycle base)
        ├── leg-back-upper
        │   └── leg-back-lower
        │       └── foot-back
        ├── leg-front-upper
        │   └── leg-front-lower
        │       └── foot-front
        └── torso (upper body lean, breathing)
            ├── shoulder-back
            │   └── arm-back-upper
            │       └── arm-back-lower
            │           └── hand-back
            │               └── off-hand-item
            ├── neck
            │   └── head
            └── shoulder-front
                └── arm-front-upper
                    └── arm-front-lower
                        └── hand-front
                            └── weapon-grip
                                └── weapon
```

### SVG Template Structure

*Note: This structure represents the content of `/assets/svg/PlayerSVG.ts`.*

```xml
<svg id="player" viewBox="-32 -64 64 64">
  <!-- Origin at center-bottom of character -->
  
  <g id="root">
    <!-- World position, translation only, never rotates -->
    
    <g id="body-pivot" data-pivot="0,0">
      <!-- Handles jumps, knockback, overall body lean -->
      
      <!-- === HIP (controls leg base + weight shift) === -->
      <g id="hip" data-pivot="0,-24">
      
        <!-- BACK LEG (renders behind) -->
        <g id="leg-back-upper" data-pivot="0,0">
          <g id="leg-back-lower" data-pivot="0,12">
            <g id="foot-back" data-pivot="0,12" />
          </g>
        </g>
        
        <!-- FRONT LEG (renders in front of back leg) -->
        <g id="leg-front-upper" data-pivot="0,0">
          <g id="leg-front-lower" data-pivot="0,12">
            <g id="foot-front" data-pivot="0,12" />
          </g>
        </g>
        
        <!-- === TORSO (chest, controls upper body) === -->
        <g id="torso" data-pivot="0,0">
          <!-- Torso base is AT the hip pivot point -->
          
          <!-- BACK ARM (renders behind torso) -->
          <g id="shoulder-back" data-pivot="-6,-10">
            <g id="arm-back-upper" data-pivot="0,0">
              <g id="arm-back-lower" data-pivot="0,10">
                <g id="hand-back" data-pivot="0,8">
                  <g id="off-hand-item" data-pivot="0,4" />
                </g>
              </g>
            </g>
          </g>
          
          <!-- NECK AND HEAD -->
          <g id="neck" data-pivot="0,-12">
            <g id="head" data-pivot="0,-4" />
          </g>
          
          <!-- FRONT ARM (weapon arm, renders in front) -->
          <g id="shoulder-front" data-pivot="6,-10">
            <g id="arm-front-upper" data-pivot="0,0">
              <g id="arm-front-lower" data-pivot="0,10">
                <g id="hand-front" data-pivot="0,8">
                  <g id="weapon-grip" data-pivot="0,2">
                    <g id="weapon" data-pivot="0,6" />
                  </g>
                </g>
              </g>
            </g>
          </g>
          
        </g>
        
      </g>
      
    </g>
  </g>
</svg>
```

### Bone Specifications

| Bone ID | Pivot Point | Parent | Purpose |
|---------|-------------|--------|---------|
| `root` | 0, 0 | (world) | World position, translation only |
| `body-pivot` | 0, 0 | root | Jump arc, knockback, global rotation |
| `hip` | 0, -24 | body-pivot | Weight shift during walk, crouch base |
| `leg-*-upper` | 0, 0 | hip | Thigh rotation (pivot at hip joint) |
| `leg-*-lower` | 0, 12 | leg-*-upper | Knee joint (12px below thigh origin) |
| `foot-*` | 0, 12 | leg-*-lower | Ankle rotation (12px below shin origin) |
| `torso` | 0, 0 | hip | Chest lean, breathing (shares hip pivot) |
| `shoulder-*` | ±6, -10 | torso | Arm base rotation, wind-up anchor |
| `arm-*-upper` | 0, 0 | shoulder-* | Upper arm/bicep rotation |
| `arm-*-lower` | 0, 10 | arm-*-upper | Elbow joint |
| `hand-*` | 0, 8 | arm-*-lower | Wrist rotation |
| `weapon-grip` | 0, 2 | hand-front | Per-weapon grip adjustment |
| `weapon` | 0, 6 | weapon-grip | Weapon geometry pivot |
| `off-hand-item` | 0, 4 | hand-back | Shield, torch, etc. |
| `neck` | 0, -12 | torso | Head base, can counter-rotate to stabilize |
| `head` | 0, -4 | neck | Look direction, reactions |

### Pivot Point Convention

`data-pivot="x, y"` defines the **joint location** where this bone rotates, expressed as an offset from the **parent bone's origin**.

- The pivot is where THIS bone connects to its PARENT.
- The bone's geometry extends FROM the pivot.
- Child bones define their own pivot relative to this bone's origin (not its pivot).

**Matrix Order of Operations:**
When calculating the world transform for a bone, the order of matrix multiplication is:
`ParentWorldMatrix * LocalTranslate * LocalRotate * -PivotOffset`

**Coordinate directions:**
- Positive Y = down (toward feet)
- Negative Y = up (toward head)
- Positive X = right (toward front arm when facing right)
- Negative X = left (toward back arm when facing right)

**Spatial Clarification:**
- `torso` has `data-pivot="0, 0"` relative to `hip`. Since `hip` is at `0, -24` relative to `body-pivot`, the torso origin is also at `0, -24`.
- `shoulder-front` is at `6, -10` relative to `torso`. This places the shoulder joint at world position `(6, -34)` relative to `body-pivot`.
- `leg-back-lower` has `data-pivot="0, 12"` meaning the knee joint is 12 pixels below the thigh's origin (the hip).

### Rotation Convention

All rotations use standard **HTML5 Canvas** convention:
- **Positive** = Clockwise (CW)
- **Negative** = Counter-Clockwise (CCW)

For a **right-facing** character:

| Limb | Positive Rotation (CW) | Negative Rotation (CCW) |
|------|-------------------|-------------------|
| Upper arm | Pulls backward/down | Swings forward/up |
| Forearm | Extends elbow (away from body) | Flexes elbow (toward body) |
| Thigh | Swings leg backward | Swings leg forward |
| Shin | Extends knee | Flexes knee (heel toward body) |
| Torso | Leans forward | Leans backward |
| Head | Tilts forward | Tilts backward |
| Weapon | Rotates blade backward/down | Rotates blade forward/up |

When `Transform.facing === -1` (left-facing), the RenderSystem applies `ctx.scale(-1, 1)`, which automatically mirrors the character and all rotation effects appropriately.

### Render Order

Each bone has a `renderOrder` number. Lower numbers render first (behind). The RenderSystem sorts bones by `renderOrder` before drawing.

**Note on Naming:** `leg-front` and `leg-back` refer to **Render Order** (Z-depth), not stride position. During a walk cycle, `leg-front` (closest to camera) may be physically behind the torso in the stride.

**Player render order assignments:**

| Element | renderOrder | Reason |
|---------|-------------|--------|
| Effects (behind) | 0 | Behind everything |
| leg-back-* | 1 | Behind body |
| arm-back-* | 2 | Behind torso |
| hip | 3 | Body mass |
| torso | 4 | Body mass |
| leg-front-* | 5 | In front of body |
| neck, head | 6 | Above torso |
| arm-front-* | 7 | Weapon arm in front |
| weapon | 8 | Foremost |
| Effects (front) | 9 | In front of everything |

**Note:** Each skeleton definition in `/skeleton/data` must assign `renderOrder` values matching this table.

### Facing Direction

`Transform.facing`: 1 (right) or -1 (left)

**Effects**:
- RenderSystem applies `ctx.scale(facing, 1)` to flip sprite
- Zone calculation uses facing to determine "forward" vs "behind"
- Attacks spawn hitboxes on the facing side
- AI approach/retreat logic references facing

**Changing facing**:
- **Strictly controlled by Movement Input**: Pressing 'A' sets facing to -1 (Left). Pressing 'D' sets facing to 1 (Right).
- **Mouse Independence**: Moving the mouse cursor behind the character does **NOT** flip the character. This allows the player to access **Zone 0 (Guard Stance)** by aiming behind their back.
- **Attack Lock**: Facing cannot change during the Active or Recovery frames of an attack.

### Design Rationale

| Feature | Reason |
|---------|--------|
| Torso as child of hip | Ensures upper body moves with hip during crouching/weight shifts |
| Both legs under hip | Consistent behavior, no asymmetric parenting bugs |
| Shoulder bones | Enables weapon wind-up rotation from shoulder, not just elbow |
| Separate neck bone | Head can counter-rotate to stay level during body lean |
| Weapon-grip node | Adjust grip position per weapon without modifying hand |
| data-pivot attributes | Explicit pivot points parsed at load time |
| Negative Y for upper bones | SVG Y-axis points down; negative Y is "up" |

## 6.3 Animation States

| State | Priority | Blend Behavior | Transitions |
|-------|----------|----------------|-------------|
| Idle | 0 | Subtle breathing loop | -> Walk, Crouch, Attack, Block |
| Walk | 1 | Leg cycle, arm follow weapon | -> Idle, Run, Attack, Block |
| Run | 1 | Aggressive forward lean | -> Walk, Idle, Slide, Attack |
| Crouch | 1 | Compressed pose | -> Idle, CrouchWalk |
| CrouchWalk | 2 | Low walk cycle | -> Crouch, Idle |
| Jump | 3 | Rising/falling pose | -> Fall, Land |
| Roll | 4 | Full body rotation | -> Idle/Run (on complete) |
| AttackWindup | 5 | Arm draws back based on zone | -> AttackSwing, Roll (cancel) |
| AttackSwing | 6 | Arm swings through arc | -> AttackRecover |
| AttackRecover | 5 | Return to neutral | -> Idle, Block, Roll |
| Block | 4 | Arm raised to zone | -> Idle, Attack (counter) |
| Stagger | 6 | Knockback recoil | -> Idle |
| Death | 7 | Collapse sequence | (Terminal) |

## 6.4 Death and Respawn

**Death Sequence:**
- On fatal damage: 60-frame death animation (1 second)
- Character collapses, weapon drops
- 2-second fade to black
- "YOU DIED" text display (optional, Souls-style)

**Respawn:**
- Respawn at last activated checkpoint with full health/stamina
- All enemies in the level respawn (including cleared arenas)
- Boss health resets fully
- Player retains any permanent progression (future: unlocked shortcuts stay open)
- Brief invulnerability (60 frames / 1000ms) on respawn

**Future Expansion:**
- Soul/currency loss on death
- Corpse run to recover lost souls
- Limited respawn resources (estus equivalent)

---

# 7. Enemy Design

## 7.1 Enemy Design Philosophy

- Each enemy teaches a specific lesson
- Enemies telegraph attacks clearly
- Enemies have exploitable patterns
- Difficulty comes from combinations and timing, not health sponges

## 7.2 Enemy Types

**Scope Note: Melee Focus**
For the initial implementation of Project EDGE, all enemies are strictly **Melee-only**. Ranged units (Archers/Mages) are out of scope to ensure the Directional Stance system is perfected first. Projectiles do not currently interact with the Zone Blocking system.

### Type 1: Hollow (Training Enemy)

**Purpose**: Teach basic attack and block timing

*See Section 13.4 for stat values.*

**Behavior**:
- Slow, obvious wind-ups
- Only attacks Mid zone
- Blocks randomly
- Staggers easily

**Visual**: Thin, hunched humanoid silhouette

### Type 2: Soldier

**Purpose**: Teach zone matching

*See Section 13.4 for stat values.*

**Behavior**:
- Cycles through 3 attack zones predictably
- Actively tries to match block zone to player attacks
- Faster attacks than Hollow
- Will punish whiffed heavy attacks

**Visual**: Upright humanoid with visible weapon, helmet

### Type 3: Duelist

**Purpose**: Teach parrying and reading feints

*See Section 13.4 for stat values.*

**Behavior**:
- Uses feint attacks (cancels wind-up into different zone)
- Attempts to parry player attacks
- Punishes predictable patterns
- Lower health rewards aggressive play (glass cannon design)

**Visual**: Lighter build, fencing stance, rapier-style weapon

### Type 4: Brute

**Purpose**: Teach dodge rolling and spacing

*See Section 13.4 for stat values.*

**Behavior**:
- Slow but devastating attacks
- Cannot be staggered by light attacks (hyper armor)
- Wide swing arcs covering multiple zones
- Long recovery windows

**Visual**: Large, heavy build, oversized weapon

### Type 5: Boss Template

**Purpose**: Test all skills

- Multi-phase structure
- Phase 1: Tests blocking and spacing
- Phase 2: Tests parry timing (faster attacks)
- Phase 3: Tests stamina management (aggressive pressure)
- Unique tell before each attack type
- Punish windows after specific attacks only

## 7.3 Enemy AI State Machine

```
IDLE → PATROL → ALERT → COMBAT → STAGGER → RECOVER → COMBAT
                                      ↓
                                   DEATH
```

**Combat Sub-states**:
- APPROACH: Move toward player
- CIRCLE: Maintain distance, look for opening
- ATTACK: Execute attack sequence
- BLOCK: Raise guard
- RETREAT: Create distance after attacking
- PUNISH: Attack during player recovery

## 7.4 SVG Enemy and Boss Structure 

### Humanoid Enemies

Humanoid enemies share the player's skeleton structure (defined in `HumanoidSkeleton.ts`), enabling:

- Animation retargeting (reuse base animations)
- Consistent hitbox placement
- Predictable visual language

**Shared skeleton with variations:**

| Enemy | Skeleton Modifications |
|-------|------------------------|
| Hollow | Same bones, hunched `torso` rotation, missing `off-hand-item` |
| Soldier | Same bones, added helmet geometry to `head` |
| Duelist | Same bones, thinner limb geometry, different weapon in `weapon` slot |
| Brute | Same bones, scaled up 1.5x, thicker limb geometry |

### Non-Humanoid Enemies

Non-humanoid enemies use custom skeletons defined per-entity. These are defined as `SkeletonDef` assets (see Section 11.2) rather than hardcoded components.

Example: `BeastSkeletonDef` would define a quadrupedal structure with a tail, four legs, and a jaw, using the same `BoneDef` recursive structure as the humanoid skeleton.

### Boss Skeletons

Bosses may use:

1. **Extended humanoid skeleton** - Additional bones for cape, extra limbs, etc.
2. **Fully custom skeleton** - Unique structure for non-humanoid bosses
3. **Multi-part skeleton** - Separate skeleton for body parts that can act independently

```typescript
// Example: Boss with detachable arm
const bossWithDetachableArm: BoneDef = {
  // ... base humanoid skeleton ...
  // arm-front can be flagged as 'detachable'
  // When detached, it becomes a separate entity with its own AI
};
```

---

## 7.5 Enemy UI

**Health Display:**
- Enemies show health bar when damaged
- Bar appears above enemy, 48px wide, 6px tall
- Red fill with dark background
- Fades out after 3 seconds of no damage taken
- Reappears instantly on next damage

**Boss Health:**
- Screen-width bar at bottom of screen
- Always visible during boss fight
- Named bosses: Name displayed above health bar
- Phase transitions shown as segmented bar

**Poise Indicator (Optional/Debug):**
- Small secondary bar below health
- Only visible when poise is below 50%
- Helps player learn stagger timing

---

# 8. SVG Visual Design System

## 8.1 Art Style Guidelines

**Color Palette** (Per-Biome):
- Dark muted backgrounds (low saturation)
- Characters use higher contrast
- Interactable elements have subtle color coding
- Damage feedback through color flash

**Line Weight**:
- Characters: 2-3px stroke
- Environment: 1-2px stroke
- UI elements: 1px stroke
- No stroke on filled shapes where possible

**Shape Language**:
- Player: Balanced, geometric, controlled
- Enemies (weak): Irregular, broken shapes
- Enemies (strong): Imposing, angular, heavy
- Environment: Organic curves for nature, rigid geometry for structures

## 8.2 SVG Asset Structure

All SVG assets follow consistent structure:

**Naming Convention**:
```
entity-type_variant_state.svg
player_knight_idle.svg
enemy-hollow_basic_attack-z2.svg
env-platform_stone_medium.svg
```

**Coordinate System**:
- Origin at center-bottom for characters
- Origin at top-left for environment tiles
- Consistent scale: 1 unit = 1 pixel at 1x zoom
- Character base height: 64px standing

## 8.3 Animation Implementation

### Canvas-Based Rendering

- SVGs are parsed at load time into drawable paths
- Rendered to **HTML5 Canvas** (2D Context preferred for simplicity; WebGL for effects)
- **Do not** use DOM elements for game entities to ensure 60fps performance
- Transforms are applied via `ctx.save()`, matrix operations, `ctx.restore()`

**Non-Scaling Strokes:**
To maintain visual consistency (Pillar 4) across different zoom levels and enemy scales (e.g., Brute 1.5x):
- The RenderSystem must calculate `lineWidth` dynamically.
- Formula: `ctx.lineWidth = DesiredStrokeWidth / (CameraZoom * EntityScale)`.
- Ensures a 2px outline looks like 2px on screen regardless of game scale.

### Skeleton Animation System

Types are defined in `/animation/AnimationTypes.ts` and referenced here.

```typescript
// Pose type definition
type BonePose = Record<string, {
  rotate?: number;    // Degrees
  translate?: { x: number; y: number };
  scale?: { x: number; y: number };
}>;

interface Keyframe {
  time: number;  // 0.0 to 1.0 normalized
  bones: BonePose;
  easing?: EasingType;  // Easing to NEXT keyframe
}

interface AnimationEvent {
  time: number;  // 0.0 to 1.0 normalized
  type: 'hitbox-start' | 'hitbox-end' | 'sound' | 'effect' | 'branch' | 'counter-window-start' | 'counter-window-end';
  data?: any;
}

interface Animation {
  name: string;
  duration: number;  // ms
  loop: boolean;
  keyframes: Keyframe[];
  events?: AnimationEvent[];
  zone?: 1 | 2 | 3;  // For directional attacks: High, Mid, Low
}

type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
```

### Bind Pose

Every `SkeletonDef` must define a **Bind Pose** (or Rest Pose). This is the default state of the skeleton when no animation is applied.
- `FinalPose = BindPose + AnimationDelta`
- This ensures that if an animation only keys the arm, the legs remain in their default (or blended) state rather than collapsing to (0,0).

### Animation Events in ECS

When the AnimationSystem detects an event trigger, it creates components rather than calling other systems directly. This keeps systems decoupled:

1. **hitbox-start**: Adds an `ActiveHitbox` component to the entity
2. **hitbox-end**: Removes the `ActiveHitbox` component
3. **sound**: Adds a `SoundRequest` component (AudioSystem processes and removes it)
4. **effect**: Adds a `SpawnEffect` component (EffectSystem processes and removes it)
5. **branch**: Sets a flag in `Animator` component for state machine to read
6. **counter-window-start**: Sets `counterWindowActive = true` in `CombatComponent`
7. **counter-window-end**: Sets `counterWindowActive = false` in `CombatComponent`

### Animation Layers

Animations can apply to subsets of the skeleton, enabling independent control of different body parts:

| Layer | Bones Affected | Typical Use |
|-------|---------------|-------------|
| FullBody | All | Roll, death, stagger |
| UpperBody | torso, shoulders, arms, neck, head | Combat, aiming |
| LowerBody | hip, legs | Movement |
| Additive | Any | Breathing, hit reactions |

**Layer Blending:**
- **Bone Mask:** An **Inclusion List**. If a layer specifies `boneMask: ['arm-front']`, it *only* affects that bone.
- **Override Mode:** `Final = LayerValue`. Replaces the value from lower layers.
- **Additive Mode:** `Final = BaseValue + LayerValue`. Adds to the value (useful for breathing or recoil).

**Important:** Child bones still inherit their parent's world transform regardless of layer mask. The bone mask only affects which bones receive *pose deltas* from that layer's animation. For example, if the combat layer affects `torso` but not `hip`, the torso will still move with the hip (due to hierarchy), but the combat layer's rotation will be applied on top.

```typescript
interface AnimationLayer {
  name: string;
  boneMask: Set<string>;  // Inclusion list: Which bones this layer affects
  animation: Animation | null;
  time: number;
  weight: number;  // 0-1 blend weight
  blendMode: 'override' | 'additive';
  priority: number;  // Higher priority layers take precedence (for pose blending, not render order)
}

interface AnimatorComponent {
  layers: AnimationLayer[];
  
  // Convenience: Primary layer state
  currentAnim: string;
  time: number;
  
  // Blending between animations
  blendFrom: string | null;
  blendFromTime: number;
  blendDuration: number;
  blendElapsed: number;
}
```

**Recommended Blend Durations:**

| Transition | Blend Duration |
|------------|----------------|
| Idle → Walk | 100ms |
| Walk → Run | 80ms |
| Any → Attack | 50ms |
| Attack → Idle | 150ms |
| Any → Stagger | 30ms |
| Any → Death | 50ms |
| Block → Idle | 100ms |

**Example Usage:**
```typescript
// Walk cycle plays on lower body while aim/attack plays on upper body
const walkLayer: AnimationLayer = {
  name: 'movement',
  boneMask: new Set(['hip', 'leg-front-upper', 'leg-front-lower', 'foot-front', 
                     'leg-back-upper', 'leg-back-lower', 'foot-back']),
  animation: walkAnimation,
  time: 0,
  weight: 1.0,
  blendMode: 'override',
  priority: 0
};

const combatLayer: AnimationLayer = {
  name: 'combat',
  boneMask: new Set(['torso', 'shoulder-front', 'arm-front-upper', 'arm-front-lower',
                     'hand-front', 'weapon-grip', 'weapon', 'shoulder-back', 
                     'arm-back-upper', 'arm-back-lower', 'hand-back', 'neck', 'head']),
  animation: attackAnimation,
  time: 0,
  weight: 1.0,
  blendMode: 'override',
  priority: 1  // Takes precedence over movement for shared bones
};
```

### World Transform Computation

The AnimationSystem computes world transforms for each bone by traversing the hierarchy:

```typescript
function computeWorldTransforms(
  skeleton: SkeletonComponent,
  entityTransform: Transform
): void {
  const { definition, currentPose, worldTransforms } = skeleton;
  
  function traverse(bone: BoneDef, parentMatrix: Matrix2D): void {
    const pose = currentPose[bone.id] || {};
    
    let matrix = parentMatrix.clone();
    
    matrix.translate(bone.pivot.x, bone.pivot.y);
    
    if (pose.translate) {
      matrix.translate(pose.translate.x, pose.translate.y);
    }
    if (pose.rotate) {
      matrix.rotate(pose.rotate * Math.PI / 180);
    }
    if (pose.scale) {
      matrix.scale(pose.scale.x, pose.scale.y);
    }
    
    matrix.translate(-bone.pivot.x, -bone.pivot.y);
    
    worldTransforms.set(bone.id, matrix);
    
    for (const child of bone.children) {
      traverse(child, matrix);
    }
  }
  
  const rootMatrix = new Matrix2D()
    .translate(entityTransform.position.x, entityTransform.position.y)
    .scale(entityTransform.facing, 1);
  
  traverse(definition.root, rootMatrix);
}
```

### Example Animation: Light Attack (Mid Zone)

```typescript
const lightAttackMid: Animation = {
  name: 'light-attack-mid',
  duration: 400,
  loop: false,
  zone: 2,
  keyframes: [
    {
      time: 0,
      bones: {
        'torso': { rotate: 5 },
        'shoulder-front': { rotate: 20 },
        'arm-front-upper': { rotate: 40 },
        'arm-front-lower': { rotate: 20 },
        'weapon-grip': { rotate: -15 }
      },
      easing: 'ease-out'
    },
    {
      time: 0.33,
      bones: {
        'torso': { rotate: 10 },
        'shoulder-front': { rotate: 35 },
        'arm-front-upper': { rotate: 55 },
        'arm-front-lower': { rotate: 30 },
        'weapon-grip': { rotate: -25 }
      },
      easing: 'ease-in'
    },
    {
      time: 0.5,
      bones: {
        'torso': { rotate: -10 },
        'shoulder-front': { rotate: -30 },
        'arm-front-upper': { rotate: -25 },
        'arm-front-lower': { rotate: -10 },
        'weapon-grip': { rotate: 15 }
      },
      easing: 'ease-out'
    },
    {
      time: 1.0,
      bones: {
        'torso': { rotate: 0 },
        'shoulder-front': { rotate: 0 },
        'arm-front-upper': { rotate: 0 },
        'arm-front-lower': { rotate: 0 },
        'weapon-grip': { rotate: 0 }
      }
    }
  ],
  events: [
    { time: 0.33, type: 'hitbox-start' },
    { time: 0.5, type: 'hitbox-end' },
    { time: 0.36, type: 'sound', data: 'swing-whoosh' }
  ]
};
```

### Example Animation: Idle Breathing

```typescript
const idle: Animation = {
  name: 'idle',
  duration: 2000,  // 2 second loop
  loop: true,
  keyframes: [
    {
      time: 0,
      bones: {
        'torso': { translate: { x: 0, y: 0 } },
        'shoulder-front': { rotate: 0 },
        'shoulder-back': { rotate: 0 }
      },
      easing: 'ease-in-out'
    },
    {
      time: 0.5,
      bones: {
        'torso': { translate: { x: 0, y: -1 } },
        'shoulder-front': { rotate: 2 },
        'shoulder-back': { rotate: 2 }
      },
      easing: 'ease-in-out'
    },
    {
      time: 1.0,
      bones: {
        'torso': { translate: { x: 0, y: 0 } },
        'shoulder-front': { rotate: 0 },
        'shoulder-back': { rotate: 0 }
      }
    }
  ]
};
```

### Example Animation: Walk Cycle

```typescript
const walk: Animation = {
  name: 'walk',
  duration: 600,
  loop: true,
  keyframes: [
    {
      time: 0,
      bones: {
        'hip': { translate: { x: 0, y: 2 } },
        'leg-front-upper': { rotate: -20 },
        'leg-front-lower': { rotate: 5 },
        'foot-front': { rotate: -5 },
        'leg-back-upper': { rotate: 20 },
        'leg-back-lower': { rotate: -10 },
        'foot-back': { rotate: 15 },
        'torso': { rotate: -2 },
        'shoulder-front': { rotate: 10 },
        'arm-front-upper': { rotate: 15 },
        'shoulder-back': { rotate: -10 },
        'arm-back-upper': { rotate: -15 }
      },
      easing: 'ease-in-out'
    },
    {
      time: 0.25,
      bones: {
        'hip': { translate: { x: 0, y: 0 } },
        'leg-front-upper': { rotate: 5 },
        'leg-front-lower': { rotate: 25 },
        'foot-front': { rotate: 0 },
        'leg-back-upper': { rotate: -5 },
        'leg-back-lower': { rotate: -35 },
        'foot-back': { rotate: -10 },
        'torso': { rotate: 0 },
        'shoulder-front': { rotate: 0 },
        'arm-front-upper': { rotate: 0 },
        'shoulder-back': { rotate: 0 },
        'arm-back-upper': { rotate: 0 }
      },
      easing: 'ease-in-out'
    },
    {
      time: 0.5,
      bones: {
        'hip': { translate: { x: 0, y: 2 } },
        'leg-front-upper': { rotate: 20 },
        'leg-front-lower': { rotate: -10 },
        'foot-front': { rotate: 15 },
        'leg-back-upper': { rotate: -20 },
        'leg-back-lower': { rotate: 5 },
        'foot-back': { rotate: -5 },
        'torso': { rotate: 2 },
        'shoulder-front': { rotate: -10 },
        'arm-front-upper': { rotate: -15 },
        'shoulder-back': { rotate: 10 },
        'arm-back-upper': { rotate: 15 }
      },
      easing: 'ease-in-out'
    },
    {
      time: 0.75,
      bones: {
        'hip': { translate: { x: 0, y: 0 } },
        'leg-front-upper': { rotate: -5 },
        'leg-front-lower': { rotate: -35 },
        'foot-front': { rotate: -10 },
        'leg-back-upper': { rotate: 5 },
        'leg-back-lower': { rotate: 25 },
        'foot-back': { rotate: 0 },
        'torso': { rotate: 0 },
        'shoulder-front': { rotate: 0 },
        'arm-front-upper': { rotate: 0 },
        'shoulder-back': { rotate: 0 },
        'arm-back-upper': { rotate: 0 }
      },
      easing: 'ease-in-out'
    },
    {
      time: 1.0,
      bones: {
        'hip': { translate: { x: 0, y: 2 } },
        'leg-front-upper': { rotate: -20 },
        'leg-front-lower': { rotate: 5 },
        'foot-front': { rotate: -5 },
        'leg-back-upper': { rotate: 20 },
        'leg-back-lower': { rotate: -10 },
        'foot-back': { rotate: 15 },
        'torso': { rotate: -2 },
        'shoulder-front': { rotate: 10 },
        'arm-front-upper': { rotate: 15 },
        'shoulder-back': { rotate: -10 },
        'arm-back-upper': { rotate: -15 }
      }
    }
  ],
  events: [
    { time: 0, type: 'sound', data: 'footstep-right' },
    { time: 0.5, type: 'sound', data: 'footstep-left' }
  ]
};
```

### Animation Blending

```typescript
interface AnimationState {
  current: Animation;
  currentTime: number;  // ms into current animation
  blendFrom?: Animation;
  blendFromTime?: number;
  blendDuration: number;  // ms
  blendElapsed: number;   // ms
}

function blendPoses(from: BonePose, to: BonePose, t: number): BonePose {
  const result: BonePose = {};
  const allBones = new Set([...Object.keys(from), ...Object.keys(to)]);
  
  for (const boneId of allBones) {
    const fromTransform = from[boneId] || {};
    const toTransform = to[boneId] || {};
    
    result[boneId] = {
      rotate: lerp(fromTransform.rotate || 0, toTransform.rotate || 0, t),
      translate: {
        x: lerp(fromTransform.translate?.x || 0, toTransform.translate?.x || 0, t),
        y: lerp(fromTransform.translate?.y || 0, toTransform.translate?.y || 0, t)
      },
      scale: {
        x: lerp(fromTransform.scale?.x || 1, toTransform.scale?.x || 1, t),
        y: lerp(fromTransform.scale?.y || 1, toTransform.scale?.y || 1, t)
      }
    };
  }
  
  return result;
}

// Adaptive Playback Speed (Prevent Foot Sliding)
// In AnimationSystem:
if (entity.isGrounded && currentAnim === 'walk' || currentAnim === 'run') {
  const speedFactor = Math.abs(physics.velocity.x) / BASE_ANIMATION_SPEED_CONSTANT;
  // Clamp to prevent animation freezing or hyper-speed
  animator.playbackRate = Math.max(0.5, Math.min(speedFactor, 1.5));
}
```

### Easing Functions

```typescript
const easings: Record<EasingType, (t: number) => number> = {
  'linear': (t) => t,
  'ease-in': (t) => t * t,
  'ease-out': (t) => 1 - (1 - t) * (1 - t),
  'ease-in-out': (t) => t < 0.5 
    ? 2 * t * t 
    : 1 - Math.pow(-2 * t + 2, 2) / 2
};

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
```

### Interpolation Guidelines

| Animation Type | Easing | Reason |
|----------------|--------|--------|
| Attack wind-up | ease-out | Slows at end, readable for player |
| Attack swing | ease-in | Accelerates, feels impactful |
| Attack recovery | ease-out | Slows at end, feels weighty |
| Block raise | ease-out | Quick start, settles into position |
| Idle/breathing | ease-in-out | Smooth, organic rhythm |
| Walk cycle | ease-in-out | Natural acceleration/deceleration |
| Stagger | ease-out | Sharp recoil, slow recovery |
| Jump rise | ease-out | Slows as gravity takes effect |
| Jump fall | ease-in | Accelerates with gravity |

---

## 8.4 Visual Effects

**Hit Effects**:
- White flash on character (2 frames)
- Spark SVG at impact point
- Screen shake (2px, 4 frames)

**Block Effects**:
- Metallic spark at weapon contact
- Stance pushback (small translate)

**Parry Effects**:
- Large spark burst
- Time slow (60ms at 50% speed)
- Sound emphasis

**Dodge Effects**:
- Motion blur via repeated semi-transparent copies
- Dust particles at start point

**Damage Invulnerability Visual**:
- Character flashes (opacity alternates 100%/30% every 4 frames)
- Lasts for full 30-frame invulnerability window

**UI Indicators**:
- Radial indicator around player showing current active Zone.

---

# 9. Audio Design

## 9.1 Audio Generation Approach

**Hybrid Approach**:
- **Samples**: Base sounds (metal impact, footsteps) are loaded from optimized assets.
- **Procedural Variation**: Pitch, volume, and filters are randomized in real-time via Web Audio API to prevent repetition.

## 9.2 Sound Categories

### Combat Sounds

| Sound | Description | Generation Method |
|-------|-------------|-------------------|
| Weapon Swing | Whoosh, pitch varies by speed | Filtered noise + Sample |
| Hit Flesh | Thud with slight wet quality | Sample + Low pass filter |
| Hit Metal | Clang, resonant | Sample + Pitch shift |
| Block | Sharp impact, no resonance | Sample + High pass |
| Parry | Distinctive ring | Sample + Reverb |
| Stagger | Dull impact + vocal hint | Sample |

### Movement Sounds

| Sound | Description |
|-------|-------------|
| Footstep | Surface-dependent, subtle |
| Jump | Cloth rustle + ground push |
| Land | Impact based on fall height |
| Roll | Quick series of cloth/armor sounds |
| Crouch | Armor settling sound |

### Ambient Sounds

- Per-biome ambient loops
- Dynamic intensity based on combat state
- Environmental audio cues (water, fire, wind)

## 9.3 Audio Implementation

**Sound Priority System**:
1. Player damage received (never skip)
2. Player attack/parry
3. Enemy attacks
4. Movement sounds
5. Ambient

**Pooling**: Pre-create audio nodes, reuse with parameter changes

---

# 10. Level Design

## 10.1 Level Structure

**Progression Model**:
- Hub area → Branching paths → Boss arenas
- Shortcuts connecting areas
- Checkpoints (bonfires/equivalent)

**Single Level Anatomy**:
```
[Checkpoint] → [Combat Arena 1] → [Traversal] → [Combat Arena 2] → [Secret Branch]
                                                        ↓
                                               [Mini-Boss] → [Shortcut to Hub]
                                                        ↓
                                               [Combat Arena 3] → [Boss]
```

## 10.2 Arena Design Principles

**Combat Arenas**:
- Flat ground for fair combat
- Enough width for spacing tactics
- Occasional height variation for tactical variety
- Clear boundaries (walls, pits)

**Enemy Placement**:
- Visible before aggro range
- Space to fight 1v1 even if multiple enemies
- Lure potential
- No blind corner spawns

**Environmental Hazards**:
- Always telegraphed
- Can harm enemies too
- Risk/reward for positioning

## 10.3 Level Tiles

**Platform Types**:
- Solid: Full collision
- Semi-solid: Can jump up through, can drop down (S+Space)
- Hazard: Damages on contact
- Climbable: Ladder/wall behavior

**Tile Dimensions**:
- Base tile: 32x32 pixels
- Platforms: Multiples of 32 wide
- Room height: Multiples of 64

## 10.4 Camera System

**Following Behavior:**
- **Camera center target**: Player position + (PlayerVelocity.x * 0.5).
- **Dead Zone**: 64px × 64px rectangle centered on screen target point. Player can move within this area without camera movement.
- Smooth follow: Lerp at 5.0 per second
- **Look-ahead**: Uses velocity rather than facing direction to prevent camera snapping when "wiggling" (rapidly tapping A/D) while standing still.

**Combat Mode:**
- When enemies in aggro range: Camera pulls back 10% zoom
- Boss arenas: Fixed camera boundaries, no zoom changes
- Camera confined to level boundaries (no showing void)
- **If `CameraState.bounds` is null:** Camera follows player freely without boundary constraints (used for cutscenes or special areas)

**Screen Shake:**
| Trigger | Amplitude | Duration |
|---------|-----------|----------|
| Light hit received | 2px | 4 frames |
| Heavy hit received | 4px | 8 frames |
| Boss attacks | 6px | 12 frames |
| Parry success | 3px | 6 frames |

- Decay: Linear falloff
- Direction: Random angle, biased toward hit direction

## 10.5 Collision Geometry

**Platform Properties:**
```typescript
interface Platform {
  type: 'solid' | 'semisolid' | 'hazard' | 'ladder';
  friction: number; // 1.0 = normal, 0.3 = ice, 1.5 = sticky
  damage?: number; // For hazards, damage per tick
  damageInterval?: number; // ms between damage ticks
}
```

**Semi-solid Rules:**
- Player passes up through when jumping (velocity.y < 0)
- Player stands on when falling (velocity.y > 0)
- Drop-through (S+Space) initiates 200ms pass-through window
- Enemies treat semi-solid platforms as solid (can stand on them) but their AI does not path through them from below

**Ladder Rules:**
- Player can grab when overlapping and pressing W
- Movement: W (up), S (down), A/D (dismount to side)
- Can jump off ladder at any time
- Cannot attack while on ladder
- Enemies do not use ladders (patrol on fixed platforms)

**Hazard Rules:**
- Hazard damage ignores invulnerability frames
- Damage is applied every `damageInterval` ms while the player overlaps the hazard
- Hazards can harm enemies too (environmental kills)

**Trigger Zones:**
- Invisible collision shapes that activate game events
- Used for: checkpoint activation, area transitions, boss fight start, cutscene triggers
- Player can pass through; collision triggers callback but does not impede movement

**Ladder Rules:**
- **Grab:** Press `W` when overlapping ladder hitbox.
- **Climb:** `W` (Up), `S` (Down).
- **Dismount (Jump):** Press `Space`.
  - If holding `A` or `D`: Jumps laterally away from ladder.
  - If Neutral: Jumps backward off the ladder.
- **Combat:** Cannot attack or block while on ladder.
- **Enemies:** Do not use ladders (pathfinding restricted to platforms).

---

# 11. Technical Architecture

## 11.1 Core Systems

```
┌─────────────────────────────────────────────────────────────┐
│                        Game Loop                            │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────────────┐│
│  │  Input  │→ │  Update │→ │ Render  │→ │ Audio Dispatch  ││
│  └─────────┘  └─────────┘  └─────────┘  └─────────────────┘│
└─────────────────────────────────────────────────────────────┘
         │              │            │
         ↓              ↓            ↓
┌─────────────┐ ┌──────────────┐ ┌───────────────┐
│InputManager │ │ World/Entity │ │ SVGRenderer   │
│- Keyboard   │ │   Systems    │ │- Canvas Ctx   │
│- Mouse      │ │- Physics     │ │- Layers       │
│- Bindings   │ │- Combat      │ │- Transforms   │
│- Buffer     │ │- AI          │ └───────────────┘
└─────────────┘ │- Animation   │
                │- Camera      │
                └──────────────┘
```

**Hybrid Architecture:**
- React Layer (DOM): Handles the application lifecycle, Main Menu, Test Runner GUI, and HUD overlays. It lives in the standard HTML DOM above the canvas.
- Game Engine Layer (Canvas): Runs strictly in `main.ts` on a `requestAnimationFrame` loop. **It knows nothing about React.**
- The Bridge (window.game): The `Game` instance is exposed globally. The React layer (specifically the Test Runner) uses this handle to inject inputs, reset state, and query ECS components for validation.

## 11.2 Component Definitions

Components are pure data containers. All logic lives in Systems.

### Asset Definitions (Immutable Data)

These are not components, but shared assets referenced by components.

```typescript
// Vec2: 2D vector type used throughout the codebase
interface Vec2 {
  x: number;
  y: number;
}

// SkeletonDef: The immutable structure of a skeleton
interface SkeletonDef {
  id: string;
  root: BoneDef;
  bones: Map<string, BoneDef>; // Flat map for easy lookup
  bindPose: BonePose; // Default pose when no animation is applied
}

interface BoneDef {
  id: string;
  pivot: Vec2; // Offset from parent origin
  children: BoneDef[];
  renderOrder: number;
}

// Collision layer definitions
enum CollisionLayer {
  PLAYER = 1 << 0,
  ENEMY = 1 << 1,
  PLAYER_ATTACK = 1 << 2,
  ENEMY_ATTACK = 1 << 3,
  ENVIRONMENT = 1 << 4,
  TRIGGER = 1 << 5,
}

// Defines which layers can collide with each other
// Note: PLAYER and ENEMY do not physically collide (can overlap); no push-out behavior
const COLLISION_MATRIX: Partial<Record<CollisionLayer, CollisionLayer[]>> = {
  [CollisionLayer.PLAYER_ATTACK]: [CollisionLayer.ENEMY],
  [CollisionLayer.ENEMY_ATTACK]: [CollisionLayer.PLAYER],
  [CollisionLayer.PLAYER]: [CollisionLayer.ENVIRONMENT, CollisionLayer.TRIGGER],
  [CollisionLayer.ENEMY]: [CollisionLayer.ENVIRONMENT],
};

// AI behavior parameters
interface AIParams {
  aggroRange: number;
  attackRange: number;
  retreatDistance: number;
  attackCooldown: number;
  canFeint: boolean;
  canParry: boolean;
  parryWindowFrames?: number;  // Defaults to 6 if canParry is true
  parryChance?: number;        // Probability of attempting parry when appropriate (0-1)
  hasHyperArmor: boolean;
}
```

### Core Components

```typescript
// Transform: Position and orientation in world space
interface TransformComponent {
  position: Vec2;
  rotation: number;  // Degrees
  scale: Vec2;
  facing: -1 | 1;    // -1 = left, 1 = right
}

// Physics: Movement simulation data
interface PhysicsComponent {
  velocity: Vec2;
  acceleration: Vec2;
  grounded: boolean;
  friction: number;
  // Note: movementState moved to MovementState component
}

// MovementState: Player/entity movement mode
interface MovementStateComponent {
  current: 'idle' | 'walk' | 'run' | 'crouch' | 'crouchWalk' | 'slide' | 'jump' | 'fall';
  previousGrounded: boolean;  // For coyote time detection
  coyoteTimer: number;        // Time remaining for coyote jump
  slideTimer: number;         // Time remaining in slide
  slideCooldown: number;      // Time before next slide allowed
}

// Collider: Collision shapes and layers
interface ColliderComponent {
  hitboxes: AABB[];      // Shapes that deal damage
  hurtboxes: AABB[];     // Shapes that receive damage
  layer: CollisionLayer;
}

// Health: Damage and death tracking
interface HealthComponent {
  current: number;
  max: number;
  invulnTimer: number;  // Remaining i-frame time in ms
  isDead: boolean;
}

// Stamina: Action resource
interface StaminaComponent {
  current: number;
  max: number;
  regenRate: number;      // Per second when not acting
  regenPaused: boolean;   // True while blocking or in attack recovery
  isExhausted: boolean;   // True when stamina hit 0, clears at 30%
}

// Combat: Attack and defense state
interface CombatComponent {
  attackState: 'idle' | 'windup' | 'active' | 'recovery';
  attackType: 'light' | 'heavy' | 'jump' | 'slide' | null;
  attackZone: 0 | 1 | 2 | 3;
  attackTimer: number;
  
  blockZone: 0 | 1 | 2 | 3;
  isBlocking: boolean;
  
  poise: number;
  maxPoise: number;
  poiseRegenTimer: number;  // Time since last hit
  staggerTimer: number;     // Remaining stagger duration
  staggerType: 'light' | 'heavy' | null;
  
  counterWindowActive: boolean;  // True during post-parry counter window
}

// ActiveHitbox: Damage-dealing collision (added/removed by AnimationSystem)
interface ActiveHitboxComponent {
  // Shape (relative to entity or bone origin)
  offset: Vec2;
  width: number;
  height: number;
  rotation: number;  // Degrees
  
  // Combat data
  damage: number;
  poiseDamage: number;
  knockback: Vec2;
  zone: 1 | 2 | 3;
  
  // State tracking
  alreadyHit: Set<EntityId>;  // Prevents multi-hit per swing
  attachedToBone?: string;    // If hitbox follows a bone's world transform
}

// Skeleton: Bone hierarchy and current pose (data only)
interface SkeletonComponent {
  definitionId: string;       // Reference to shared SkeletonDef asset
  currentPose: BonePose;      // Current bone transforms (mutated by AnimationSystem)
  
  // Runtime Cache: Written by SkeletonSystem, read by RenderSystem
  // Not serialized. Derived from currentPose + definition.
  readonly worldTransforms: Map<string, Matrix2D>;
}

// Animator: Animation playback state
interface AnimatorComponent {
  layers: AnimationLayer[];
  
  // Primary animation state
  currentAnim: string;
  time: number;
  
  // Blending
  blendFrom: string | null;
  blendFromTime: number;
  blendDuration: number;
  blendElapsed: number;
  
  // Event flags (set by AnimationSystem, read by other systems)
  pendingEvents: AnimationEvent[];
}

// AIController: Enemy behavior state
interface AIControllerComponent {
  state: 'idle' | 'patrol' | 'alert' | 'approach' | 'attack' | 'block' | 'retreat' | 'stagger' | 'death';
  target: EntityId | null;
  behaviorParams: AIParams;
  stateTimer: number;
  patrolOrigin: Vec2;
  patrolDirection: -1 | 1;
}

// PlayerInput: Tag + input state for player-controlled entities
interface PlayerInputComponent {
  // Tag presence marks entity as player-controlled
  
  // Input buffer
  buffer: BufferedInput | null;
}

// EnemyTag: Tag + type identifier
interface EnemyTagComponent {
  enemyType: 'hollow' | 'soldier' | 'duelist' | 'brute' | 'boss';
}

// SoundRequest: One-frame component for audio (processed and removed by AudioSystem)
interface SoundRequestComponent {
  soundId: string;
  volume?: number;
  pitch?: number;
  position?: Vec2;  // For spatial audio
}

// SpawnEffect: One-frame component for visual effects (processed by EffectSystem)
interface SpawnEffectComponent {
  effectType: string;
  position: Vec2;
  rotation?: number;
  scale?: number;
}
```

### Singleton Resources (Not Components)

Some data is global to the game, not attached to entities:

```typescript
// InputState: Global input capture (singleton, not a component)
interface InputState {
  // Current frame state
  keysDown: Set<string>;
  keysPressed: Set<string>;   // Just pressed this frame
  keysReleased: Set<string>;  // Just released this frame
  mousePosition: Vec2;        // Screen space
  mouseWorldPosition: Vec2;   // World space (computed with camera)
  mouseButtons: Set<number>;
  mouseButtonsPressed: Set<number>;
  mouseButtonsReleased: Set<number>;
}

// CameraState: Global camera data
interface CameraState {
  position: Vec2;
  targetPosition: Vec2;
  zoom: number;
  shake: { amplitude: number; duration: number; elapsed: number };
  bounds: { min: Vec2; max: Vec2 } | null;
}

// Checkpoint: Respawn location
interface Checkpoint {
  id: string;
  position: Vec2;
  respawnFacing: -1 | 1;
  levelId: string;
  isActivated: boolean;
}

// PlayerProgress: Persistent player data
interface PlayerProgress {
  lastCheckpointId: string;
  activatedCheckpoints: Set<string>;
  // Future: currency, unlocked shortcuts, etc.
}
```

### 11.2.1 World/ECS Container Interface

```typescript
interface World {
  // Entity management
  createEntity(): EntityId;
  destroyEntity(id: EntityId): void;
  
  // Component management
  addComponent<T>(entity: EntityId, component: T): void;
  removeComponent<T>(entity: EntityId, componentType: ComponentType<T>): void;
  getComponent<T>(entity: EntityId, componentType: ComponentType<T>): T | undefined;
  hasComponent<T>(entity: EntityId, componentType: ComponentType<T>): boolean;
  
  // Queries
  query<T extends ComponentType[]>(...components: T): QueryResult<T>;
  
  // Entity lookups
  getPlayer(): EntityId;  // Convenience for single-player
  getEntitiesWithTag(tag: string): EntityId[];
  
  // Singleton resources
  getResource<T>(resourceType: ResourceType<T>): T;
  setResource<T>(resourceType: ResourceType<T>, value: T): void;
}
```

### 11.2.2 Entity Archetypes

Entities are IDs with component bundles. Use archetype factory functions:

```typescript
// Archetypes.ts
export function createPlayer(world: World, x: number, y: number): EntityId {
  const id = world.createEntity();
  
  world.addComponent(id, { position: { x, y }, rotation: 0, scale: { x: 1, y: 1 }, facing: 1 } as TransformComponent);
  world.addComponent(id, { velocity: { x: 0, y: 0 }, acceleration: { x: 0, y: 0 }, grounded: false, friction: 1.0 } as PhysicsComponent);
  world.addComponent(id, { current: 'idle', previousGrounded: false, coyoteTimer: 0, slideTimer: 0, slideCooldown: 0 } as MovementStateComponent);
  world.addComponent(id, { current: 100, max: 100, invulnTimer: 0, isDead: false } as HealthComponent);
  world.addComponent(id, { current: 100, max: 100, regenRate: 25, regenPaused: false, isExhausted: false } as StaminaComponent);
  world.addComponent(id, { 
    attackState: 'idle', attackType: null, attackZone: 0, attackTimer: 0,
    blockZone: 0, isBlocking: false,
    poise: 40, maxPoise: 40, poiseRegenTimer: 0, staggerTimer: 0, staggerType: null,
    counterWindowActive: false
  } as CombatComponent);
  world.addComponent(id, { 
    definitionId: 'player-skeleton', 
    currentPose: {}, 
    worldTransforms: new Map() 
  } as SkeletonComponent);
  world.addComponent(id, { 
    layers: [], currentAnim: 'idle', time: 0,
    blendFrom: null, blendFromTime: 0, blendDuration: 0, blendElapsed: 0,
    pendingEvents: []
  } as AnimatorComponent);
  world.addComponent(id, { buffer: null } as PlayerInputComponent);
  
  return id;
}

export function createEnemy(
  world: World, 
  x: number, 
  y: number, 
  type: 'hollow' | 'soldier' | 'duelist' | 'brute'
): EntityId {
  const stats = enemyStats[type];
  const id = world.createEntity();
  
  world.addComponent(id, { position: { x, y }, rotation: 0, scale: { x: 1, y: 1 }, facing: -1 } as TransformComponent);
  world.addComponent(id, { velocity: { x: 0, y: 0 }, acceleration: { x: 0, y: 0 }, grounded: false, friction: 1.0 } as PhysicsComponent);
  world.addComponent(id, { current: stats.health, max: stats.health, invulnTimer: 0, isDead: false } as HealthComponent);
  world.addComponent(id, { 
    poise: stats.poise, maxPoise: stats.poise, poiseRegenTimer: 0, 
    staggerTimer: 0, staggerType: null,
    attackState: 'idle', attackType: null, attackZone: 2, attackTimer: 0,
    blockZone: 2, isBlocking: false,
    counterWindowActive: false
  } as CombatComponent);
  world.addComponent(id, { 
    definitionId: 'humanoid-skeleton', 
    currentPose: {}, 
    worldTransforms: new Map() 
  } as SkeletonComponent);
  world.addComponent(id, { 
    layers: [], currentAnim: 'idle', time: 0,
    blendFrom: null, blendFromTime: 0, blendDuration: 0, blendElapsed: 0,
    pendingEvents: []
  } as AnimatorComponent);
  world.addComponent(id, {
    state: 'idle',
    target: null,
    behaviorParams: enemyBehaviors[type],
    stateTimer: 0,
    patrolOrigin: { x, y },
    patrolDirection: 1
  } as AIControllerComponent);
  world.addComponent(id, { enemyType: type } as EnemyTagComponent);
  
  return id;
}
```

### 11.2.3 Hitbox Definition

```typescript
// HitboxDef: Asset definition for hitboxes (immutable, loaded from data)
interface HitboxDef {
  // Relative to entity origin or specified bone
  offset: Vec2;
  
  // Shape (OBB for weapon swings)
  width: number;
  height: number;
  rotation: number;  // Relative to bone/entity rotation
  
  // Combat data
  damage: number;
  poiseDamage: number;
  knockback: Vec2;
  zone: 1 | 2 | 3;
  
  // Optional bone attachment
  attachedToBone?: string;  // If specified, offset is relative to this bone's world transform
}

// Note: When creating an ActiveHitboxComponent at runtime from a HitboxDef,
// copy all properties including `attachedToBone`. The HitDetectionSystem
// will use `attachedToBone` to compute the hitbox's world position.
```

### 11.2.4 Zone Calculation

```typescript
// Zone calculation state for hysteresis
interface ZoneState {
  currentZone: 0 | 1 | 2 | 3;
  lastZoneChangeTime: number;
}

// Guard zone uses X-distance (world units), attack zones use angle (degrees)
// Thresholds must be in World Units, not Screen Pixels, to remain consistent during Camera Zoom.
const GUARD_ENTER_THRESHOLD = -10; // World Units (approx 1/6th of player width)
const GUARD_EXIT_THRESHOLD = 10;   // World Units
const ZONE_CHANGE_COOLDOWN = 50;    // ms before zone can change again (prevents flicker)

function calculateZone(
  playerPos: Vec2, 
  mouseScreenPos: Vec2, 
  camera: CameraState,
  facing: -1 | 1,
  previousZone: 0 | 1 | 2 | 3,
  timeSinceLastChange: number
): 0 | 1 | 2 | 3 {
  // 1. Screen to World
  const mouseWorldX = mouseScreenPos.x + camera.position.x;
  const mouseWorldY = mouseScreenPos.y + camera.position.y;
  
  // 2. Relative Vector
  // If facing left (-1), we flip the X axis so "forward" is always positive X in local space
  const dx = (mouseWorldX - playerPos.x) * facing; 
  const dy = mouseWorldY - playerPos.y;
  
  // 3. Guard Check with Hysteresis
  // Enter guard zone if significantly behind
  if (dx < GUARD_ENTER_THRESHOLD) return 0;
  
  // Stay in guard if previously in guard and not significantly forward
  if (previousZone === 0 && dx < GUARD_EXIT_THRESHOLD) return 0;
  
  // 4. Prevent rapid zone flickering
  if (timeSinceLastChange < ZONE_CHANGE_COOLDOWN) {
    return previousZone === 0 ? 2 : previousZone; // Default to mid if exiting guard
  }
  
  // 5. Angle Calculation
  // Math.atan2(y, x) -> Returns radians. 
  // In Canvas (Y-Down): Negative Y is Up.
  const angleDeg = Math.atan2(dy, dx) * (180 / Math.PI);
  
  // 6. Zone Thresholds
  // -30 to +30 = Mid (Forward)
  // < -30 = High (Up)
  // > +30 = Low (Down)
  
  if (angleDeg < -30) return 1; // High
  if (angleDeg > 30) return 3;  // Low
  return 2;                     // Mid
}
```

## 11.3 File Structure

The file structure follows ECS principles and uses a **Feature-Based** organization for core mechanics to keep related logic and data definitions together.

```
./
  App.tsx                // React Root Component (Manages Views: Menu, Game, Tests)
  index.tsx              // React Entry Point
  types.ts               // Global Type Definitions (window.game interface)
  index.html             // Entry point
  main.ts                // Bootstrap, creates Game instance
  tsconfig.json
  package.json  
  /core
    Game.ts              // Main loop, initialization, state management
    World.ts             // ECS container, entity/component management
    Input.ts             // Raw input capture, populates InputState resource
    Time.ts              // Delta time, fixed timestep, frame counting
    Constants.ts         // All tuning values, centralized magic numbers
    Resources.ts         // Singleton resource definitions (InputState, CameraState, etc.)
    
  /assets
    AssetLoader.ts       // SVG parsing, audio sample loading, asset manifest
    AssetTypes.ts        // Type definitions for loaded assets
    /svg
      PlayerSVG.ts       // Player SVG paths as template literal strings
      EnemySVGs.ts       // Enemy SVG paths
      EnvironmentSVGs.ts // Tiles, platforms, background elements
      EffectSVGs.ts      // Sparks, dust, particles
      UiSVGs.ts          // UI element graphics
    /audio
      Samples.ts         // Sample loading, audio sprite definitions
      
  /entities
    Archetypes.ts        // Factory functions that assemble component bundles
      
  /features              // Feature-based organization
    /combat
      CombatComponent.ts
      CombatSystem.ts
      CombatTypes.ts
      HitDetectionSystem.ts
      ActiveHitboxComponent.ts
    /movement
      MovementStateComponent.ts
      MovementSystem.ts
      PhysicsComponent.ts
      PhysicsSystem.ts
    /animation
      AnimatorComponent.ts
      AnimationSystem.ts
      AnimationTypes.ts
      SkeletonComponent.ts
      SkeletonSystem.ts
      SkeletonTypes.ts   // Includes SkeletonDef interface
    /ai
      AIControllerComponent.ts
      AISystem.ts
      EnemyBehaviors.ts
    
  /components            // Generic/Shared components
    index.ts             // Re-exports all components
    Transform.ts         // Position, rotation, scale, facing
    Collider.ts          // Hitbox/hurtbox shapes, collision layers
    Health.ts            // Current/max HP, invuln timer, death flag
    Stamina.ts           // Current/max stamina, regen, exhaustion
    PlayerInput.ts       // Tag + input buffer
    EnemyTag.ts          // Tag + enemy type
    SoundRequest.ts      // One-frame audio trigger
    SpawnEffect.ts       // One-frame effect spawn trigger
    
  /systems               // Generic/Shared systems
    index.ts             // System execution order definition
    InputSystem.ts       // Reads InputState, updates PlayerInput components
    CollisionSystem.ts   // Entity-environment and entity-entity collision
    RenderSystem.ts      // Canvas rendering, layer sorting, camera transform
    AudioSystem.ts       // Processes SoundRequest, manages playback
    EffectSystem.ts      // Processes SpawnEffect, manages particles
    CameraSystem.ts      // Camera follow, dead zone, shake, zoom
    UISystem.ts          // HUD updates, health bars
    
  /animation/data        // Authoritative animation definitions
    index.ts
    PlayerAnimations.ts
    EnemyAnimations.ts
    SharedAnimations.ts
    
  /skeleton/data         // Authoritative skeleton definitions
    index.ts
    PlayerSkeleton.ts
    HumanoidSkeleton.ts
    BeastSkeleton.ts
    BossSkeleton.ts
    
  /data
    EnemyStats.ts        // Enemy stat blocks
    WeaponDefinitions.ts // Weapon stats, timing, hitboxes
    Checkpoints.ts       // Checkpoint definitions
    Levels.ts            // Level layout data, tile maps
    
  /ui
    HUD.ts               // Player health bar, stamina bar
    EnemyHealthBar.ts    // Floating enemy health bars
    BossHealthBar.ts     // Screen-bottom boss health bar
    ZoneIndicator.ts     // Current weapon zone display
    Menu.ts              // Pause menu, main menu
    DeathScreen.ts       // Death overlay, respawn prompt
    
  /utils
    Vec2.ts              // 2D vector math (immutable functions)
    Matrix2D.ts          // 2D transformation matrix
    AABB.ts              // Axis-aligned bounding box
    CollisionMath.ts     // AABB, circle, OBB intersection tests
    Math.ts              // Clamp, lerp, remap, angle utilities
    ObjectPool.ts        // Generic object pooling for particles, audio nodes
    
  /debug                 // Development tools (exclude from production build)
    DebugFlags.ts        // Toggle flags for debug features
    DebugDraw.ts         // Hitbox visualization, bone overlay, collision shapes
    DebugUI.ts           // FPS counter, state display, tuning sliders
    AnimationDebug.ts    // Animation timeline, pose inspector
```

**Tooling And Diagnostics:**
- View State: App.tsx manages a simple state machine ('menu' | 'game' | 'tests').
- Test Execution: When the Test Runner view is active, it calls methods on window.game.testRunner. Tests run in the **Game Context** but report results to the **React Context**.
- The HUD (Health bars, Stamina) should currently be drawn via Canvas (inside UISystem), but the architecture allows for future migration to React overlays **if** complex UI (like inventory grids) are needed. This is why `UISystem.ts` exists despite the presence of React.

### Key Directory Explanations

| Directory | Purpose |
|-----------|---------|
| `/features` | Groups components, systems, and types by game mechanic |
| `/components` | Generic data structures shared across features |
| `/systems` | Generic logic shared across features |
| `/skeleton/data` | Authoritative location for all skeleton definitions |
| `/animation/data` | Authoritative location for all animation definitions |
| `/data` | Game balance data (stats, behaviors, levels) |
| `/assets` | Raw asset data and loading logic |
| `/debug` | Development-only tools, excluded from production |

### Module Responsibilities

| Module | Single Responsibility |
|--------|----------------------|
| `Game.ts` | Owns the game loop, initializes all systems, manages global state |
| `World.ts` | Entity creation, component storage, queries |
| `Input.ts` | Captures browser events, updates InputState resource |
| `InputSystem.ts` | Reads InputState, translates to PlayerInput component updates |
| `AssetLoader.ts` | Loads and parses all assets, provides typed asset access |
| `Archetypes.ts` | Factory functions that assemble component bundles for entity types |
| `AnimationSystem.ts` | Plays animations, interpolates keyframes, writes to Animator |
| `SkeletonSystem.ts` | Reads Animator.currentPose, computes worldTransforms |
| `RenderSystem.ts` | Reads worldTransforms, sorts entities by Y-depth, draws to canvas |

### Import Guidelines

```typescript
// ✓ Good: Clear dependency direction
import { Vec2 } from '../utils/Vec2';
import { PLAYER_WALK_SPEED } from '../core/Constants';
import type { Animation } from '../features/animation/AnimationTypes';
import type { SkeletonDef } from '../features/animation/SkeletonTypes';

// ✓ Good: Components import only types
import type { TransformComponent } from './Transform';

// ✓ Good: Systems import components and utils
import { TransformComponent } from '../components/Transform';
import { PhysicsComponent } from '../features/movement/PhysicsComponent';
import { Vec2 } from '../utils/Vec2';

// ✗ Avoid: Systems importing other systems directly
// Use the World to query entities; coordinate through Game.ts if needed

// ✗ Avoid: Components importing systems or entities
// Components are pure data
```

### Initialization Order

```typescript
// In Game.ts
async init(): Promise<void> {
  // 1. Load assets (blocking)
  await AssetLoader.loadAll();
  
  // 2. Initialize world (ECS container)
  this.world = new World();
  
  // 3. Initialize singleton resources
  this.world.setResource(InputState, createInputState());
  this.world.setResource(CameraState, createCameraState());
  this.world.setResource(PlayerProgress, loadOrCreateProgress());
  
  // 4. Initialize systems (order matters for update sequence)
  this.systems = [
    new InputSystem(this.world),
    new MovementSystem(this.world),
    new AISystem(this.world),
    new CombatSystem(this.world),
    new PhysicsSystem(this.world),
    new CollisionSystem(this.world),
    new HitDetectionSystem(this.world),
    new AnimationSystem(this.world),
    new SkeletonSystem(this.world),
    new EffectSystem(this.world),
    new AudioSystem(this.world),
    new CameraSystem(this.world),
    new UISystem(this.world),
    new RenderSystem(this.world, this.canvas),
  ];
  
  // 5. Create initial entities
  this.playerId = createPlayer(this.world, 100, 300);
  this.loadLevel('level1');
  
  // 6. Start game loop
  this.lastTime = performance.now();
  requestAnimationFrame(this.loop.bind(this));
}
```

---

## 11.4 Collision System

**Layer Matrix**:
- Player attacks → Enemy hurtbox
- Enemy attacks → Player hurtbox
- All entities → Environment
- Player hurtbox ≠ Enemy hurtbox (no friendly fire)
- Player and Enemy entities do not physically collide (can overlap); no push-out behavior

**Hitbox Lifecycle**:
1. Attack initiated → Hitbox inactive
2. Active frames begin → Hitbox enabled
3. Hit registered → Hitbox disabled for this attack (no multi-hit)
4. Attack ends → Hitbox removed

**Hitbox World Position Calculation**:
The `HitDetectionSystem` must calculate the world position of hitboxes manually. It cannot rely on the `ctx.scale` used in rendering.
```typescript
// Correct World X calculation
const worldX = entityPos.x + (hitbox.offset.x * entity.facing);
```

**Collision Shapes**:
- AABB for environment
- Rotated rectangles for weapon hitboxes
- Circles for proximity detection (AI aggro)

**Collision Response**:
- Environment: Stop movement, slide along surface
- Damage: Apply damage, knockback, trigger i-frames
- Trigger zones: Checkpoint activation, area transitions (no physical collision, callback only)

**Entity Separation (Soft Collision):**
While entities do not act as solid walls to each other, a separation force is applied to prevent perfect stacking (which breaks Zone calculation math).
- If `Distance(EntityA, EntityB) < (WidthA + WidthB) / 4`:
- Apply small velocity vector to both entities away from their shared center point.
- Force strength: 50 px/sec (subtle drift, not a bounce).

**Weapon vs. Environment (Recoil):**
- **Trigger:** If an active weapon hitbox overlaps with the `ENVIRONMENT` layer (Walls/Floors) *before* hitting an enemy.
- **Effect:**
  1.  **Attack Cancel:** The attack state immediately transitions to `Recovery`.
  2.  **Visual:** Spawn "Sparks" effect at contact point.
  3.  **Audio:** Play "Metal Clang" sound.
  4.  **Stamina:** Player loses 10 additional stamina.
  5.  **Animation:** Play a brief "Recoil" animation (or freeze frame for 6 frames).
- **Design Intent:** Discourages swinging long weapons in tight corridors (Spacing Pillar).

## 11.5 State Machines

**Player State Machine**:
```
IDLE ←→ WALK ←→ RUN
  ↓       ↓
CROUCH ←→ CROUCH_WALK
  ↓           ↓
CROUCH_SLIDE ←┘

Any Ground State → JUMP → FALL → LAND → Any Ground State
Any State (with stamina) → ROLL → Recovery → Previous State
Any Combat-Ready State → ATTACK_* → Recovery → Previous State
Any State ← HIT_STAGGER → Recovery
Any State ← DEATH
```

**Attack Sub-States**:
```
ATTACK_WINDUP → ATTACK_ACTIVE → ATTACK_RECOVERY
      ↓
   (Cancel via Roll if early enough)
```

**Enemy State Machine**:
```
IDLE → PATROL → ALERT → COMBAT → STAGGER → RECOVER → COMBAT
                   ↓                                    ↓
                RESET (player too far)              DEATH
```

# 12. Implementation Phases

## Test Runner Infrastructure

Before implementing any phase, the game must include an **in-game GUI test runner** accessible from the title screen. This test runner:

- Displays a "Run Tests" button on the title screen
- When activated, runs all per-phase test suites sequentially
- Shows pass/fail status for each test function with visual indicators (green ✓ / red ✗)
- Displays summary statistics (total passed, failed, skipped)
- Allows re-running individual test suites or all tests
- Does not block game functionality—tests run in a dedicated test mode
- Each phase has its own test file following the naming convention `tests/phase{N}_{phaseName}.test.ts`

```typescript
// tests/TestRunner.ts - Core test infrastructure
interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

interface TestSuite {
  name: string;
  phase: number;
  tests: TestResult[];
}

// Test runner renders results to a dedicated canvas overlay
// Accessible via title screen "Run Tests" button
```

---

## 12.1 Phase Dependencies

```
Phase 1 (Movement) ─────────────────────────┐
         │                                  │
         ▼                                  ▼
Phase 2a (Animation Engine) ←────── Phase 6a (Audio Foundation)
         │                          [System setup, movement sounds]
         ▼                                  │
Phase 2b (Combat Logic) ←───────── Phase 6b (Combat Audio)
         │                          [Hit sounds, parry sounds]
         ▼
Phase 3 (Advanced Combat)
         │
         ▼
Phase 4 (Enemy AI)
         │
         ├──────────────────────────────────┐
         ▼                                  ▼
Phase 5 (Visual Polish)              Phase 7 (Level Design)
         │                                  │
         └──────────────┬───────────────────┘
                        ▼
                Phase 8 (Polish)
```

---

## Phase 1: Core Foundation

**Goal**: Player movement on flat ground

**Test File**: `tests/phase1_movement.test.ts`

**Test Functions**:
```typescript
// Input System Tests
testKeyboardInputCapture()        // Verify keys are captured correctly
testMousePositionTracking()       // Verify mouse world position calculation
testInputBufferStorage()          // Verify single-buffer stores most recent input
testInputBufferExpiration()       // Verify buffer clears after 133ms
// Ground Movement Tests
testWalkSpeed()                   // Player moves at 150 px/sec when walking
testRunSpeed()                    // Player moves at 250 px/sec when running
testCrouchSpeed()                 // Player moves at 75 px/sec when crouching
testCrouchHitboxReduction()       // Hitbox height reduced by 40% when crouching
testFacingDirection()             // Facing changes with A/D input
testFacingLockedDuringAttack()    // Facing doesn't change mid-attack
// Jump Tests
testJumpInitiation()              // Space initiates jump when grounded
testVariableJumpHeight()          // Hold duration affects jump height (~127-184px)
testJumpMomentumPreservation()    // Horizontal velocity preserved during jump
testNoDoubleJump()                // Cannot jump while airborne
testCoyoteTime()                  // Can jump within 100ms of leaving platform
testJumpBuffer()                  // Jump queued before landing executes on land
// Dodge Roll Tests
testRollDistance()                // Roll covers 180 pixels
testRollDuration()                // Roll takes 500ms
testRollIFrames()                 // I-frames active for first 200ms
testRollDirectionChange()         // Can change direction at roll start
testNoAirRoll()                   // Cannot roll while airborne
// Backstep Tests
testBackstepDistance()            // Backstep covers 80 pixels
testBackstepDuration()            // Backstep takes 300ms
testBackstepIFrames()             // I-frames active for first 100ms
// Crouch Slide Tests
testSlideDistance()               // Slide covers 200 pixels
testSlideDuration()               // Slide takes 500ms
testSlideCooldown()               // Cannot slide again for 500ms
testSlideHitbox()                 // Hitbox matches crouch height during slide
testSlideStaminaCost()            // Slide costs 15 stamina
// Physics Tests
testGravityApplication()          // Gravity of 980 px/sec² applied
testGroundedDetection()           // Grounded state correctly detected
testPlatformCollision()           // Player stops on solid platforms
// Camera Tests
testCameraFollowsPlayer()         // Camera tracks player position
testCameraDeadZone()              // Player can move within 64x64 dead zone
testCameraLookAhead()             // Camera offsets 125px when running
testCameraNullBounds()            // Camera moves freely when bounds is null
```

**Tasks**:
1. Set up game loop with fixed timestep
2. Implement Input Manager with key binding
3. Create Player entity with Transform and Physics
4. Implement ground movement (walk, run, crouch, slide)
5. Implement jump with variable height
6. Add coyote time and jump buffer
7. Implement dodge roll with placeholder timing
8. Implement backstep
9. Create basic SVG player (rectangles for limbs)
10. Basic camera following player with dead zone

**Completion Criteria**: Player can walk, run, jump, crouch, slide, roll, and backstep on a flat platform. Coyote time and jump buffer feel responsive. All Phase 1 tests pass.

---

## Phase 2a: The Puppet Master (Animation Engine)

**Goal**: Functional skeletal animation system with no combat logic.

**Test File**: `tests/phase2a_animation.test.ts`

**Test Functions**:
```typescript
// Skeleton Definition Tests
testSkeletonDefStructure()        // SkeletonDef has root, bones map, bindPose
testBoneHierarchyParsing()        // Bone parent-child relationships correct
testPivotPointParsing()           // data-pivot attributes parsed correctly
// Skeleton System Tests
testWorldTransformComputation()   // World transforms computed from hierarchy
testMatrixOrderOfOperations()     // Parent * Translate * Rotate * -Pivot order
testFacingFlipsTransforms()       // ctx.scale(-1,1) applied when facing left
testBindPoseApplication()         // Un-keyed bones use bind pose values
// Animation System Tests
testKeyframeInterpolation()       // Values interpolate between keyframes
testNormalizedTimeCalculation()   // Time 0-1 maps to animation duration
testLoopingAnimation()            // Looping anims restart at end
testNonLoopingAnimation()         // Non-looping anims hold final pose
testAnimationEvents()             // Events trigger at correct times
testEventsDoNotDoubleFireDuringBlend() // Events don't fire twice when blending
testEventTimingDuringBlend()      // Events fire at correct time during blend
// Easing Tests
testLinearEasing()                // Linear: t = t
testEaseInEasing()                // EaseIn: t = t²
testEaseOutEasing()               // EaseOut: t = 1-(1-t)²
testEaseInOutEasing()             // EaseInOut: correct curve
// Animation Blending Tests
testAnimationBlendTransition()    // Smooth transition between anims
testBlendWeightInterpolation()    // Blend weight affects final pose
testOverrideBlendMode()           // Override replaces lower layer values
testAdditiveBlendMode()           // Additive adds to base values
testBoneMaskFiltering()           // Layer only affects masked bones
testLayerPriorityOrder()          // Higher priority layers take precedence
testChildBonesInheritParent()     // Child bones inherit parent transform regardless of mask
// Render Order Tests
testBoneRenderOrderSorting()      // Bones render in correct Z-order
testEntityYSorting()              // Entities sort by Y position
testEffectRenderOrder()           // Effects render at correct layer (0 or 9)
```

**Tasks**:
1. Implement `SkeletonDef` asset structure and `SkeletonComponent`.
2. Implement `SkeletonSystem` to compute world transforms (with correct matrix order).
3. Implement `RenderSystem` with Entity Z-sorting (sort by Y position).
4. Implement `AnimationSystem` with keyframe interpolation.
5. Implement "Bind Pose" logic for un-keyed bones.
6. Create idle and walk animations.
7. Implement animation blending (Override vs Additive).
8. Verify bone hierarchy visualization in debug mode.

**Completion Criteria**: Character walks and idles using the full skeletal system. Bones rotate correctly. Debug view shows correct pivot points. All Phase 2a tests pass.

---

## Phase 2b: The Warrior (Combat Logic)

**Goal**: Attack and block mechanics attached to the animated puppet.

**Test File**: `tests/phase2b_combat.test.ts`

**Test Functions**:
```typescript
// Zone Calculation Tests
testZoneHighCalculation()         // Mouse above player = Zone 1
testZoneMidCalculation()          // Mouse level with player = Zone 2
testZoneLowCalculation()          // Mouse below player = Zone 3
testZoneGuardCalculation()        // Mouse behind player = Zone 0
testZoneWithFacingLeft()          // Zone calculation correct when facing left
testZoneDeadZone()                // No flicker at zone boundaries
// Attack State Machine Tests
testLightAttackStateFlow()        // idle -> windup -> active -> recovery -> idle
testAttackZoneFromMouse()         // Attack uses zone at initiation
testAttackCommitment()            // Cannot change facing during attack
testAttackStaminaCost()           // Light attack costs 15 stamina
testAttackCancelIntoRoll()        // Can cancel windup with roll
// Block Tests
testBlockActivation()             // RMB activates block
testBlockZoneMatching()           // Block zone matches mouse position
testPerfectBlockReduction()       // Same zone = 90% damage reduction
testAdjacentBlockReduction()      // Adjacent zone = 70% reduction
testMismatchBlockReduction()      // Opposite zone = 30% reduction
testBlockStaminaDrain()           // Blocking hit drains stamina
testNoStaminaRegenWhileBlocking() // Stamina doesn't regen during block
// Stamina System Tests
testStaminaRegeneration()         // Stamina regens at 25/sec when idle
testStaminaExhaustionTrigger()    // Exhaustion triggers at 0 stamina
testStaminaExhaustionDuration()   // Exhaustion lasts 1.5s or until 30%
testExhaustedCannotAttack()       // Cannot attack while exhausted
testExhaustedCannotRoll()         // Cannot roll while exhausted
testExhaustedGuardBreak()         // Blocking while exhausted = guard break
// Hit Detection Tests
testHitboxWorldPosition()         // Hitbox position accounts for facing
testHitboxActiveDuringFrames()    // Hitbox only active during active frames
testHitboxSingleHitPerSwing()     // Cannot hit same target twice per swing
testHurtboxAlignment()            // Hurtbox aligns with character
// Damage Calculation Tests
testBaseDamageApplication()       // Base damage applied correctly
testZoneModifierApplication()     // Zone match modifiers apply
testDamageToHealth()              // Damage reduces health correctly
// Input Buffer Tests  
testBufferedAttackExecution()     // Buffered attack executes after recovery
testBufferOverwrite()             // New input overwrites buffer
testBufferClearAfterExecution()   // Buffer clears after action executes
// UI Tests
testHealthBarDisplay()            // Health bar shows correct percentage
testStaminaBarDisplay()           // Stamina bar shows correct percentage
testZoneIndicatorDisplay()        // Zone indicator shows current zone
```

**Tasks**:
1. Implement mouse tracking for weapon angle (3 zones + guard) with dead zone logic.
2. Implement UI indicator for current zone.
3. Create weapon geometry attached to weapon-grip bone.
4. Implement light attack state machine.
5. Implement block state with zone matching.
6. Create training dummy entity.
7. Implement `HitDetectionSystem` (Hitbox vs Hurtbox) using world space coordinates.
8. Implement damage calculation with zone matching.
9. Add stamina system with exhaustion state.
10. Implement input buffering.
11. Create basic UI (health bar, stamina bar).

**Completion Criteria**: 
- Player can attack dummy from different angles, block facing different zones
- Stamina drains and recovers correctly
- Input buffer makes combat feel responsive
- Hitboxes align visually with the weapon swing
- All Phase 2b tests pass

---

## Phase 3: Advanced Combat

**Goal**: Full combat system with reactions

**Test File**: `tests/phase3_advancedCombat.test.ts`

**Test Functions**:
```typescript
// Heavy Attack Tests
testHeavyAttackDamage()           // Heavy deals more damage than light
testHeavyAttackTiming()           // Heavy has longer windup/recovery
testHeavyAttackStaminaCost()      // Heavy costs 30 stamina
testHeavyAttackPoiseDamage()      // Heavy deals 50 poise damage
// Parry Tests
testParryWindow()                 // Parry window is 100ms (6 frames)
testParryZoneMatching()           // Perfect parry requires zone match
testSuccessfulParryStagger()      // Successful parry staggers enemy
testSuccessfulParryStaminaRecovery() // Parry recovers stamina
testFailedParryStagger()          // Failed parry staggers player
testFailedParryStaminaCost()      // Failed parry costs extra stamina
testCounterAttackWindow()         // Counter window after successful parry
// Stagger Tests
testLightStaggerDuration()        // Light stagger lasts 333ms
testHeavyStaggerDuration()        // Heavy stagger lasts 600ms
testStaggerPreventsActions()      // Cannot act during stagger
testGuardBreakCausesHeavyStagger() // Guard break = heavy stagger
// Poise Tests
testPoiseReduction()              // Attacks reduce poise
testPoiseBreakCausesStagger()     // Poise = 0 causes stagger
testPoiseRegenDelay()             // Poise regens after 5s no damage
testPoiseRegenRate()              // Poise regens at 20/sec
// Invulnerability Tests
testDamageInvulnDuration()        // 500ms invuln after damage
testInvulnPreventsMultiHit()      // Cannot be hit during invuln
testInvulnVisualFlicker()         // Character flickers during invuln
testInvulnNotDuringGuardBreak()   // No invuln during guard break stagger
// Hit Reactions Tests
testKnockbackApplication()        // Knockback pushes character
testHitStopLight()                // Light hit freezes 2 frames
testHitStopHeavy()                // Heavy hit freezes 4 frames
testStaggerAnimation()            // Stagger plays correct animation
// Slide Attack Tests
testSlideAttackFromSlide()        // Can attack during slide
testSlideAttackTiming()           // Slide attack has unique timing
testSlideAttackAsRisingSlash()    // Rising attack from slide
// Counter Attack Tests
testCounterDamageModifier()       // Counter attacks deal 1.5x damage
testCounterWindowDuration()       // Counter window timing correct
```

**Tasks**:
1. Implement heavy attacks
2. Implement parry timing window
3. Add stagger state to player and enemies
4. Implement poise system
5. Add hit reactions (knockback, stagger animations)
6. Implement post-damage invulnerability frames
7. Implement parry counter-attack window
8. Add guard break state
9. Refine hitbox shapes and timing
10. Implement slide attack

**Completion Criteria**: Full combat loop functional against dummy that can block, be staggered, and be parried. Player has i-frames after damage. All Phase 3 tests pass.

---

## Phase 4: Enemy AI

**Goal**: Functional enemy that fights back

**Test File**: `tests/phase4_enemyAI.test.ts`

**Test Functions**:
```typescript
// AI State Machine Tests
testIdleStateDefault()            // Enemy starts in idle state
testIdleToPatrolTransition()      // Idle transitions to patrol
testPatrolMovement()              // Enemy moves during patrol
testAlertOnPlayerDetection()      // Alert state when player in aggro range
testApproachBehavior()            // Enemy approaches player in combat
testRetreatAfterAttack()          // Enemy retreats after attacking
testStaggerStateTransition()      // Enemy enters stagger when poise breaks
testDeathStateTransition()        // Enemy enters death when health = 0
// Aggro Tests
testAggroRangeDetection()         // Player detected within aggro range
testAggroRangeByEnemyType()       // Each enemy type has correct aggro range
testAggroLossOnDistance()         // Enemy loses aggro if player too far
// Attack Behavior Tests
testEnemyAttackExecution()        // Enemy performs attacks
testAttackRangeRespected()        // Enemy only attacks within range
testAttackTelegraphing()          // Attack has visible windup
// Hollow Behavior Tests
testHollowSlowWindup()            // Hollow has 20-frame windup
testHollowMidZoneOnly()           // Hollow only attacks mid zone
testHollowRandomBlocking()        // Hollow blocks randomly
testHollowEasyStagger()           // Hollow staggers from light attacks
// Soldier Behavior Tests
testSoldierZoneCycling()          // Soldier cycles through zones
testSoldierActiveBlocking()       // Soldier tries to match block zone
testSoldierPunishWindow()         // Soldier punishes whiffed heavies
// Duelist Behavior Tests
testDuelistFeintMechanic()        // Duelist cancels windup into new zone
testDuelistFeintTell()            // Feint has visual stutter at 50%
testDuelistFeintStaminaCost()     // Feint costs half attack stamina
testDuelistParryAttempt()         // Duelist attempts to parry
testDuelistPatternPunish()        // Duelist punishes predictable patterns
// Brute Behavior Tests
testBruteHyperArmor()             // Light attacks don't stagger Brute
testBruteSlowAttacks()            // Brute has long windup (24 frames)
testBruteWideSwing()              // Brute swing covers multiple zones
testBruteLongRecovery()           // Brute has exploitable recovery
// Enemy Health Bar Tests
testEnemyHealthBarAppears()       // Health bar shows when damaged
testEnemyHealthBarFades()         // Health bar fades after 3s
testEnemyHealthBarAccuracy()      // Health bar matches health percentage
```

**Tasks**:
1. Create AI state machine (idle, patrol, alert, approach, attack, block, retreat)
2. Implement aggro range detection
3. Create Hollow enemy with simple behavior
4. Create Soldier enemy with zone-aware blocking
5. Create Duelist enemy with feints
6. Create Brute enemy with hyper-armor
7. Implement enemy attack telegraphs (visual cues)
8. Add enemy patrol behavior
9. Implement enemy health bars
10. Tune enemy timing for fairness

**Completion Criteria**: Player can fight all 4 enemy types with full combat mechanics. Each enemy feels distinct and teaches its intended lesson. All Phase 4 tests pass.

---

## Phase 5: Visual Polish

**Goal**: Final SVG art and visual effects

**Test File**: `tests/phase5_visuals.test.ts`

**Test Functions**:
```typescript
// SVG Rendering Tests
testPlayerSVGComplete()           // All player bones have geometry
testPlayerLimbProportions()       // Limb sizes match spec
testEnemySVGsComplete()           // All enemy types have geometry
testSVGPathParsing()              // SVG paths parse to Path2D
// Animation Polish Tests
testIdleAnimationLoop()           // Idle loops smoothly
testWalkAnimationCycle()          // Walk cycle has no pops
testAttackAnimationTiming()       // Attacks match frame data
testBlendingNoPopping()           // Animation transitions smooth
testAnimationLayering()           // Layers work as expected for ALL extant animations
// Visual Effect Tests
testHitSparkSpawn()               // Spark spawns at impact point
testHitFlashOnDamage()            // Character flashes white on hit
testBlockSparkEffect()            // Metallic spark on block
testParrySparkBurst()             // Large burst on parry
testParryTimeSlowEffect()         // Time slows on parry (50% for 60ms)
// Screen Shake Tests
testLightHitShake()               // 2px shake for 4 frames
testHeavyHitShake()               // 4px shake for 8 frames
testBossAttackShake()             // 6px shake for 12 frames
testParryShake()                  // 3px shake for 6 frames
testShakeDecay()                  // Shake amplitude decays linearly
// Invulnerability Visual Tests
testIFrameFlicker()               // Opacity alternates every 4 frames
testFlickerDuration()             // Flicker matches invuln duration
// Roll Effect Tests
testRollMotionBlur()              // Motion blur during roll
testRollDustParticles()           // Dust at roll start
// Environment Tests
testTileSVGsRender()              // Environment tiles render correctly
testBackgroundLayering()          // Background behind foreground
```

**Tasks**:
1. Create final player SVG with proper limbs (replace placeholder rectangles)
2. Finalize/Polish all player animation keyframes
3. Create enemy SVGs (Hollow, Soldier, Duelist, Brute)
4. Create enemy animations
5. Add visual effects (hit sparks, block effects)
6. Implement screen shake
7. Add parry time-slow effect
8. Add damage flash and i-frame flicker
9. Add roll motion blur / dust
10. Create environment tile SVGs

**Completion Criteria**: Game looks visually cohesive, animations are smooth and readable. All feedback effects implemented. All Phase 5 tests pass.

---

## Phase 6a: Audio Foundation

**Goal**: Audio system setup and movement sounds

**Test File**: `tests/phase6a_audioFoundation.test.ts`

**Test Functions**:
```typescript
// Audio Context Tests
testAudioContextCreation()        // Web Audio context initializes
testAudioContextResume()          // Context resumes on user interaction
// Audio Pool Tests
testAudioNodePooling()            // Nodes are reused from pool
testPoolExpansion()               // Pool expands when exhausted
testNodeCleanup()                 // Finished nodes return to pool
// Procedural Variation Tests
testPitchVariation()              // Pitch randomization in range
testVolumeVariation()             // Volume randomization in range
testNoRepetition()                // Same sound varies each play
// Movement Sound Tests
testFootstepOnWalk()              // Footstep plays during walk
testFootstepOnRun()               // Footstep plays during run (faster)
testJumpSound()                   // Sound on jump initiation
testLandSound()                   // Sound on landing
testRollSound()                   // Sound during roll
testSlideSound()                  // Sound during slide
// UI Sound Tests
testMenuNavigationSound()         // Sound on menu selection
testCheckpointActivationSound()   // Sound on checkpoint activation
```

**Tasks**:
1. Set up Web Audio API context
2. Implement audio node pooling
3. Create procedural variation system
4. Implement movement sounds (footsteps, jump, land, roll)
5. Basic UI sounds

**Completion Criteria**: Audio context works, movement has sound feedback, no audio clipping. All Phase 6a tests pass.

---

## Phase 6b: Combat Audio

**Goal**: Full combat audio feedback

**Test File**: `tests/phase6b_combatAudio.test.ts`

**Test Functions**:
```typescript
// Combat Sound Tests
testSwingSound()                  // Whoosh on attack swing
testSwingPitchBySpeed()           // Faster attacks = higher pitch
testHitFleshSound()               // Thud on unarmored hit
testHitMetalSound()               // Clang on armored hit
testBlockSound()                  // Sharp impact on block
testParrySound()                  // Distinctive ring on parry
testStaggerSound()                // Dull impact on stagger
// Enemy Audio Tests
testEnemyAttackTellSound()        // Audio cue before enemy attack
testEnemyHitSound()               // Sound when enemy takes damage
testEnemyDeathSound()             // Sound on enemy death
// Priority System Tests
testPlayerDamageHighPriority()    // Player damage sounds never skipped
testSoundPriorityOrder()          // Correct priority hierarchy
testSoundDucking()                // Lower priority sounds duck
// Death/Respawn Audio Tests
testDeathSound()                  // Sound on player death
testRespawnSound()                // Sound on respawn
```

**Tasks**:
1. Create combat sounds (swing, hit, block, parry)
2. Create movement sounds (footstep, jump, roll, land)
3. Create UI sounds (menu, checkpoint)
4. Create ambient sound generator
5. Implement audio priority system
6. Add death/respawn audio

**Completion Criteria**: All actions have audio feedback, sounds don't clip or overlap badly. Audio enhances game feel. All Phase 6b tests pass.

---

## Phase 7: Level Design

**Goal**: Playable level with progression

**Test File**: `tests/phase7_levelDesign.test.ts`

**Test Functions**:
```typescript
// Level Loading Tests
testLevelDataParsing()            // Level JSON/data loads correctly
testTilePlacement()               // Tiles placed at correct positions
testEnemySpawnPositions()         // Enemies spawn at defined locations
// Platform Type Tests
testSolidPlatformCollision()      // Player stops on solid platforms
testSemiSolidJumpThrough()        // Player jumps through from below
testSemiSolidDropThrough()        // S+Space drops through
testHazardDamage()                // Hazards deal damage on contact
testHazardDamageInterval()        // Hazard damage respects interval
testLadderGrab()                  // W grabs ladder when overlapping
testLadderMovement()              // W/S moves on ladder
testLadderDismount()              // A/D dismounts to side
testLadderJumpOff()               // Space jumps off ladder
// Checkpoint Tests
testCheckpointActivation()        // Checkpoint activates on touch
testRespawnAtCheckpoint()         // Player respawns at last checkpoint
testCheckpointPersistence()       // Activated checkpoints persist
testEnemyRespawnOnDeath()         // Enemies respawn on player death
testHealthResetOnRespawn()        // Full health on respawn
testRespawnInvulnerability()      // 60 frames invuln on respawn
// Death Screen Tests
testDeathScreenAppears()          // Death screen shows on death
testDeathAnimationPlays()         // Death animation completes
testRespawnFromDeathScreen()      // Can respawn from death screen
// Boss Arena Tests
testBossArenaCamera()             // Camera locks in boss arena
testBossHealthBar()               // Boss health bar appears
testBossPhaseTransitions()        // Boss has multiple phases
// Progression Tests
testShortcutPersistence()         // Unlocked shortcuts stay open
testLevelTransition()             // Can transition between areas
testVictoryState()                // Game recognizes boss defeat
```

**Tasks**:
1. Create level loader from tile data
2. Implement platform types (solid, semi-solid, hazard, ladder)
3. Build first complete level layout
4. Place enemies throughout level
5. Add checkpoint/respawn system
6. Implement death screen
7. Create boss arena
8. Create first boss encounter
9. Add secrets and shortcuts
10. Implement level transitions / victory state

**Completion Criteria**: Player can progress through level, die and respawn, defeat boss. Shortcuts work correctly. All Phase 7 tests pass.

---

## Phase 8: Polish and Balance

**Goal**: Fun, fair, complete experience

**Test File**: `tests/phase8_polish.test.ts`

**Test Functions**:
```typescript
// Tuning Target Tests
testPlayerDiesIn6To7HollowHits()  // Matches tuning target
testHollowDiesIn3LightAttacks()   // Matches tuning target
testBruteHeavyDrains30To40Stamina() // Matches tuning target
testParryCounterNearlyKillsSoldier() // Matches tuning target
// Balance Tests
testStaminaExhaustionIn6To7Lights() // ~6-7 light attacks to exhaust
testStaminaExhaustionIn3Heavies() // ~3 heavy attacks to exhaust
testAllEnemiesBeatable()          // Each enemy can be defeated
testNoDegenerateStrategies()      // No infinite loops or exploits
// Performance Tests
testConsistent60FPS()             // Frame rate stays at 60fps
testNoMemoryLeaks()               // Memory stable over time
testPoolsNotExhausted()           // Object pools sufficient
// Edge Case Tests
testScreenBoundaryBehavior()      // Player handles screen edges
testZeroStaminaBehavior()         // All zero-stamina cases handled
testRapidInputHandling()          // Rapid inputs don't break state
testCornerCollisions()            // Corner cases handled
testSimultaneousHits()            // Multiple hits same frame handled
// Integration Tests
testFullLevelPlaythrough()        // Level completable start to finish
testBossDefeat()                  // Boss can be defeated
testDeathAndRespawnCycle()        // Death/respawn loop works
testAllEnemyTypesEncounter()      // All enemy types function in level
```

**Tasks**:
1. Tune all timing values (wind-up, recovery, i-frames)
2. Balance damage numbers against tuning targets
3. Playtest and iterate on enemy patterns
4. Adjust stamina costs for balance
5. Fine-tune camera behavior
6. Performance optimization (target consistent 60fps)
7. Edge case handling (corners, rapid input, etc.)
8. Bug fixing
9. Final playtest pass

**Completion Criteria**: Playable from start to boss victory, consistent difficulty curve, no major bugs. Tuning targets from 4.6 are met. All Phase 8 tests pass.

# 13. Data Specifications

## 13.1 Player Stats (Initial Values)

```typescript
player = {
  health: 100,
  maxHealth: 100,
  stamina: 100,
  maxStamina: 100,
  staminaRegen: 25, // per second, when not acting (regenPaused = false)
  // Note: Stamina regeneration is controlled by StaminaComponent.regenPaused
  // regenPaused = true during: blocking (RMB held), attack recovery phase
  attackPower: 20,
  poise: 40,
  maxPoise: 40,
  poiseRegenDelay: 5000, // ms
  poiseRegenRate: 20, // per second
  invulnDuration: 500, // ms after taking damage
  
  // Stamina costs
  staminaCosts: {
    lightAttack: 15,
    heavyAttack: 30,
    roll: 20,
    backstep: 10,
    slide: 15,
    runPerSecond: 10,
    parryAttempt: 5,
    parryFail: 20, // Additional cost on failed parry (total = 5 + 20 = 25)
    parrySuccess: 0, // No additional cost; recovers 15 stamina instead
    blockPerHit: 10, // Base, modified by attack strength and zone match
  },
  
  // Parry rewards
  parryStaminaRecovery: 15, // Stamina recovered on successful parry
}
```

## 13.2 Timing Values (in frames at 60fps)

**Note:** All durations in code should be in milliseconds. Keyframe times are normalized 0-1.
**Note:** These are Base/Longsword values.

| Action | Anticipation | Active | Recovery | Total | Notes |
|--------|--------------|--------|----------|-------|-------|
| Light Attack | 8 | 4 | 12 | 24 (400ms) | |
| Heavy Attack | 18 | 6 | 20 | 44 (733ms) | |
| Jump Attack | 6 | 6 | 16 | 28 (467ms) | Recovery on whiff; canceled on hit |
| Slide Attack | 4 | 4 | 14 | 22 (367ms) | Rising slash |
| Block Raise | 4 | - | - | - | Instant hold |
| Parry Attempt | 0 | 6 (window) | 20 | 26 (433ms) | Fail = full recovery |
| Dodge Roll | 0 | 12 (i-frames) | 18 | 30 (500ms) | |
| Backstep | 0 | 6 (i-frames) | 12 | 18 (300ms) | |
| Crouch Slide | 0 | 24 | 6 | 30 (500ms) | |
| Stagger (light) | - | - | 20 | 20 (333ms) | |
| Stagger (heavy) | - | - | 36 | 36 (600ms) | Guard break |
| Damage Invuln | - | 30 | - | 30 (500ms) | |
| Hit Stop (Light) | - | 2 | - | 2 (33ms) | Frame freeze on impact |
| Hit Stop (Heavy) | - | 4 | - | 4 (66ms) | Frame freeze on impact |
| Coyote Time | - | 6 | - | 6 (100ms) | |
| Jump Buffer | - | 6 | - | 6 (100ms) | |
| Input Buffer | - | 8 | - | 8 (133ms) | |
| Death Animation | - | 60 | - | 60 (1000ms) | |
| Death Fade | - | - | - | 2000ms | Fade to black |
| Respawn Invuln | - | 60 | - | 60 (1000ms) | |

## 13.3 Movement Values

```typescript
movement = {
  walkSpeed: 150, // px/sec
  runSpeed: 250, // px/sec
  crouchSpeed: 75, // px/sec
  jumpForce: 500, // initial velocity (px/sec)
  jumpHoldBonus: 100, // additional velocity if held (px/sec)
  // Note: With gravity 980, this results in ~127-184 pixel jump heights
  gravity: 980, // px/sec²
  rollDistance: 180,
  rollDuration: 500, // ms
  backstepDistance: 80,
  backstepDuration: 300, // ms
  slideDistance: 200,
  slideDuration: 500, // ms
  slideCooldown: 500, // ms
  coyoteTime: 100, // ms
  jumpBuffer: 100, // ms
}
```

## 13.4 Enemy Stats

```typescript
enemies = {
  hollow: {
    health: 50,
    poise: 20,
    attackPower: 15,
    windupFrames: 20,
    aggroRange: 150,
    attackRange: 60,
  },
  soldier: {
    health: 80,
    poise: 40,
    attackPower: 20,
    windupFrames: 15,
    aggroRange: 180,
    attackRange: 70,
  },
  duelist: {
    health: 60,
    poise: 30,
    attackPower: 25,
    windupFrames: 12,
    aggroRange: 200,
    attackRange: 80,
    canFeint: true,
    canParry: true,
    parryWindowFrames: 6,  // Same as player
    parryChance: 0.3,      // 30% chance to attempt parry when appropriate
  },
  brute: {
    health: 150,
    poise: 80,
    attackPower: 40,
    windupFrames: 24,
    aggroRange: 120,
    attackRange: 100,
    hyperArmor: true, // immune to light stagger
  },
}

// Note: Boss stats are defined per-boss in level data files
```

---

## 13.5 Weapon Definitions

```typescript
interface WeaponDef {
  id: string;
  name: string;
  
  // Stats
  baseDamage: number;
  staminaCostLight: number;
  staminaCostHeavy: number;
  poiseDamageLight: number;
  poiseDamageHeavy: number;
  blockStability: number;  // Reduces stamina cost when blocking
  
  // Timing (frames at 60fps)
  lightAttack: {
    anticipation: number;
    active: number;
    recovery: number;
  };
  heavyAttack: {
    anticipation: number;
    active: number;
    recovery: number;
  };
  
  // Hitbox
  reach: number;      // Pixels from hand
  arcWidth: number;   // Degrees of swing arc
  
  // Visual
  gripOffset: { x: number; y: number };  // Offset in weapon-grip bone
  svgAsset: string;  // Reference to SVG asset ID
}

const weapons: Record<string, WeaponDef> = {
  'longsword': {
    id: 'longsword',
    name: 'Longsword',
    baseDamage: 20,
    staminaCostLight: 15,
    staminaCostHeavy: 30,
    poiseDamageLight: 20,
    poiseDamageHeavy: 50,
    blockStability: 50,
    lightAttack: { anticipation: 8, active: 4, recovery: 12 },
    heavyAttack: { anticipation: 18, active: 6, recovery: 20 },
    reach: 40,
    arcWidth: 90,
    gripOffset: { x: 0, y: 0 },
    svgAsset: 'weapon-longsword'
  },
  
  'rapier': {
    id: 'rapier',
    name: 'Rapier',
    baseDamage: 15,
    staminaCostLight: 10,
    staminaCostHeavy: 22,
    poiseDamageLight: 10,
    poiseDamageHeavy: 25,
    blockStability: 30,
    lightAttack: { anticipation: 5, active: 3, recovery: 8 },
    heavyAttack: { anticipation: 12, active: 4, recovery: 14 },
    reach: 50,
    arcWidth: 30,  // Thrust, narrow arc
    gripOffset: { x: 0, y: -2 },
    svgAsset: 'weapon-rapier'
  },
  
  'greatsword': {
    id: 'greatsword',
    name: 'Greatsword',
    baseDamage: 35,
    staminaCostLight: 22,
    staminaCostHeavy: 45,
    poiseDamageLight: 35,
    poiseDamageHeavy: 80,
    blockStability: 70,
    lightAttack: { anticipation: 14, active: 6, recovery: 18 },
    heavyAttack: { anticipation: 26, active: 8, recovery: 28 },
    reach: 55,
    arcWidth: 120,
    gripOffset: { x: 0, y: 2 },
    svgAsset: 'weapon-greatsword'
  },
  
  'dagger': {
    id: 'dagger',
    name: 'Dagger',
    baseDamage: 10,
    staminaCostLight: 8,
    staminaCostHeavy: 16,
    poiseDamageLight: 5,
    poiseDamageHeavy: 15,
    blockStability: 15,
    lightAttack: { anticipation: 4, active: 2, recovery: 6 },
    heavyAttack: { anticipation: 8, active: 3, recovery: 10 },
    reach: 20,
    arcWidth: 60,
    gripOffset: { x: 0, y: -1 },
    svgAsset: 'weapon-dagger'
  }
};
```

---

# 14. AI Agent Implementation Guidelines

## 14.1 General Principles

1. **Complete One Phase Before Starting Next**: Each phase builds on previous work. Ensure tests pass before moving forward.

2. **Test Incrementally**: After each task within a phase, verify functionality before proceeding.

3. **Maintain Constants File**: All magic numbers should be in `Constants.ts` for easy tuning.

4. **Comment State Transitions**: Combat and AI state machines are complex. Document state entry/exit conditions clearly.

5. **Keep Components Focused**: Each component does one thing. Combat component handles combat state, not rendering.

## 14.2 Priority Order When Stuck

If unclear how to proceed:
1. Re-read the relevant section of this document
2. Check if dependencies (earlier phase tasks) are complete
3. Implement simplest version that fulfills the stated criteria
4. Add complexity only after basic version works
5. Reference the phase dependency graph (12.1)

## 14.3 SVG Implementation Notes

### SVG Storage Format

SVGs are stored as template literal strings in TypeScript files, not as separate `.svg` files. This enables:
- Type-safe asset references
- Build-time bundling
- No async loading required for core assets (though lazy loading is possible for large asset sets)

```typescript
// In /assets/svg/PlayerSVG.ts
export const PLAYER_TORSO_PATH = `
  <path d="M-8,-24 L8,-24 L10,-8 L-10,-8 Z" fill="#444" stroke="#222" stroke-width="2"/>
`;

export const PLAYER_HEAD_PATH = `
  <circle cx="0" cy="-6" r="8" fill="#555" stroke="#222" stroke-width="2"/>
`;
```

### Bone Geometry Attachment

To associate SVG paths with bones:

```typescript
interface BoneVisual {
  boneId: string;
  paths: ParsedSVG;
  offset: Vec2;  // Offset from bone origin
}
```

### SVG Parsing

At load time, parse SVG strings into `Path2D` objects for efficient Canvas rendering:

```typescript
interface ParsedSVG {
  paths: Map<string, Path2D>;
  styles: Map<string, { fill?: string; stroke?: string; strokeWidth?: number }>;
  bounds: { width: number; height: number };
}

function parseSVGString(svgString: string): ParsedSVG {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgString, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  
  if (!svg) {
    throw new Error('Invalid SVG string: No <svg> element found');
  }
  
  const paths = new Map<string, Path2D>();
  const styles = new Map<string, { fill?: string; stroke?: string; strokeWidth?: number }>();
  
  // Parse <path> elements
  for (const pathEl of svg.querySelectorAll('path')) {
    const id = pathEl.getAttribute('id') || `path-${paths.size}`;
    const d = pathEl.getAttribute('d');
    if (!d) {
      console.warn(`SVG Parser: Path element '${id}' missing 'd' attribute, skipping`);
      continue;
    }
    try {
      paths.set(id, new Path2D(d));
      styles.set(id, {
        fill: pathEl.getAttribute('fill') || undefined,
        stroke: pathEl.getAttribute('stroke') || undefined,
        strokeWidth: parseFloat(pathEl.getAttribute('stroke-width') || '0') || undefined
      });
    } catch (e) {
      console.warn(`SVG Parser: Failed to parse path '${id}': ${e}`);
    }
  }
  
  // Parse <rect> elements (convert to Path2D)
  for (const rect of svg.querySelectorAll('rect')) {
    const id = rect.getAttribute('id') || `rect-${paths.size}`;
    const x = parseFloat(rect.getAttribute('x') || '0');
    const y = parseFloat(rect.getAttribute('y') || '0');
    const w = parseFloat(rect.getAttribute('width') || '0');
    const h = parseFloat(rect.getAttribute('height') || '0');
    
    if (isNaN(x) || isNaN(y) || isNaN(w) || isNaN(h)) {
      console.warn(`SVG Parser: Rect element '${id}' has invalid dimensions, skipping`);
      continue;
    }
    
    const path = new Path2D();
    path.rect(x, y, w, h);
    paths.set(id, path);
    styles.set(id, {
      fill: rect.getAttribute('fill') || undefined,
      stroke: rect.getAttribute('stroke') || undefined,
      strokeWidth: parseFloat(rect.getAttribute('stroke-width') || '0') || undefined
    });
  }
  
  // Parse <circle> elements (convert to Path2D)
  for (const circle of svg.querySelectorAll('circle')) {
    const id = circle.getAttribute('id') || `circle-${paths.size}`;
    const cx = parseFloat(circle.getAttribute('cx') || '0');
    const cy = parseFloat(circle.getAttribute('cy') || '0');
    const r = parseFloat(circle.getAttribute('r') || '0');
    
    if (isNaN(cx) || isNaN(cy) || isNaN(r) || r <= 0) {
      console.warn(`SVG Parser: Circle element '${id}' has invalid dimensions, skipping`);
      continue;
    }
    
    const path = new Path2D();
    path.arc(cx, cy, r, 0, Math.PI * 2);
    paths.set(id, path);
    styles.set(id, {
      fill: circle.getAttribute('fill') || undefined,
      stroke: circle.getAttribute('stroke') || undefined,
      strokeWidth: parseFloat(circle.getAttribute('stroke-width') || '0') || undefined
    });
  }
  
  // Parse <ellipse>, <polygon>, <polyline> as needed...
  
  const widthAttr = svg.getAttribute('width');
  const heightAttr = svg.getAttribute('height');
  
  return {
    paths,
    styles,
    bounds: {
      width: widthAttr ? parseFloat(widthAttr) : 64,
      height: heightAttr ? parseFloat(heightAttr) : 64
    }
  };
}
```

### Rendering SVG Paths

```typescript
function renderPath(
  ctx: CanvasRenderingContext2D, 
  path: Path2D, 
  style: { fill?: string; stroke?: string; strokeWidth?: number }
): void {
  if (style.fill) {
    ctx.fillStyle = style.fill;
    ctx.fill(path);
  }
  if (style.stroke && style.strokeWidth) {
    ctx.strokeStyle = style.stroke;
    ctx.lineWidth = style.strokeWidth;
    ctx.stroke(path);
  }
}
```

## 14.4 Common Pitfalls to Avoid

1. **Over-engineering early**: Get rectangles moving before adding particle effects
2. **Skipping the state machine**: Combat will break without proper state management
3. **Ignoring fixed timestep**: Physics must use delta time correctly
4. **Hitbox timing errors**: Test attack frame data against expected behavior
5. **Mouse coordinate confusion**: Always convert screen space to world space considering camera offset
6. **Forgetting i-frames**: Player should flash and be invulnerable after hits
7. **Infinite blocking**: Stamina must not regen while holding block
8. **Missing input buffer**: Combat will feel unresponsive without it

## 14.5 Animation Debugging

During development, enable debug overlays to visualize animation and combat systems:

### Debug Flags

```typescript
// In /debug/DebugFlags.ts
export const DEBUG = {
  DRAW_SKELETONS: true,      // Draw bone hierarchy lines
  DRAW_PIVOTS: true,         // Draw pivot points as circles
  DRAW_HITBOXES: true,       // Draw active hitboxes
  DRAW_HURTBOXES: true,      // Draw hurtboxes
  DRAW_COLLISION: true,      // Draw environment collision shapes
  SHOW_POSE_VALUES: false,   // Show rotation values on screen
  SHOW_STATE_INFO: true,     // Show current animation/combat state
  ANIMATION_TIMELINE: false, // Show scrubable animation timeline
};
```

### Skeleton Visualization

```typescript
// In /debug/DebugDraw.ts
function drawSkeleton(
  ctx: CanvasRenderingContext2D, 
  skeleton: SkeletonComponent,
  transform: TransformComponent
): void {
  ctx.save();
  ctx.translate(transform.position.x, transform.position.y);
  ctx.scale(transform.facing, 1);
  
  for (const [boneId, worldMatrix] of skeleton.worldTransforms) {
    const bone = skeleton.definition.bones.get(boneId);
    if (!bone) continue;
    
    // Get bone position from matrix
    const boneX = worldMatrix.tx;
    const boneY = worldMatrix.ty;
    
    // Draw pivot point
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(boneX, boneY, 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw bone ID label
    ctx.fillStyle = 'white';
    ctx.font = '8px monospace';
    ctx.fillText(boneId, boneX + 5, boneY - 5);
    
    // Draw line to each child's pivot
    ctx.strokeStyle = 'yellow';
    ctx.lineWidth = 1;
    for (const child of bone.children) {
      const childMatrix = skeleton.worldTransforms.get(child.id);
      if (childMatrix) {
        ctx.beginPath();
        ctx.moveTo(boneX, boneY);
        ctx.lineTo(childMatrix.tx, childMatrix.ty);
        ctx.stroke();
      }
    }
  }
  
  ctx.restore();
}
```

### Hitbox Visualization

```typescript
function drawHitboxes(
  ctx: CanvasRenderingContext2D,
  world: World
): void {
  // Draw active hitboxes (damage-dealing)
  for (const [id, hitbox, transform] of world.query(ActiveHitboxComponent, TransformComponent)) {
    ctx.save();
    ctx.translate(transform.position.x, transform.position.y);
    ctx.scale(transform.facing, 1);
    
    // Apply hitbox transform
    ctx.translate(hitbox.offset.x, hitbox.offset.y);
    ctx.rotate(hitbox.rotation * Math.PI / 180);
    
    // Color by zone
    const zoneColors = { 1: 'rgba(255, 0, 0, 0.5)', 2: 'rgba(0, 255, 0, 0.5)', 3: 'rgba(0, 0, 255, 0.5)' };
    ctx.fillStyle = zoneColors[hitbox.zone] || 'rgba(255, 255, 0, 0.5)';
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    
    ctx.fillRect(-hitbox.width / 2, -hitbox.height / 2, hitbox.width, hitbox.height);
    ctx.strokeRect(-hitbox.width / 2, -hitbox.height / 2, hitbox.width, hitbox.height);
    
    ctx.restore();
  }
  
  // Draw hurtboxes (damage-receiving)
  for (const [id, collider, transform] of world.query(ColliderComponent, TransformComponent)) {
    ctx.save();
    ctx.translate(transform.position.x, transform.position.y);
    
    ctx.strokeStyle = 'cyan';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    
    for (const hurtbox of collider.hurtboxes) {
      ctx.strokeRect(hurtbox.x, hurtbox.y, hurtbox.width, hurtbox.height);
    }
    
    ctx.restore();
  }
}
```

### Pose Inspector

```typescript
function drawPoseInspector(
  ctx: CanvasRenderingContext2D,
  skeleton: SkeletonComponent,
  screenX: number,
  screenY: number
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
  ctx.fillRect(screenX, screenY, 200, Object.keys(skeleton.currentPose).length * 16 + 20);
  
  ctx.fillStyle = 'white';
  ctx.font = '12px monospace';
  ctx.fillText('Bone Rotations:', screenX + 5, screenY + 14);
  
  let y = screenY + 30;
  for (const [boneId, pose] of Object.entries(skeleton.currentPose)) {
    const rotation = pose.rotate?.toFixed(1) || '0.0';
    ctx.fillText(`${boneId}: ${rotation}°`, screenX + 10, y);
    y += 16;
  }
  
  ctx.restore();
}
```

### Animation Timeline (Advanced)

```typescript
interface AnimationTimelineState {
  visible: boolean;
  selectedAnimation: string;
  scrubPosition: number;  // 0-1
  isPaused: boolean;
}

function drawAnimationTimeline(
  ctx: CanvasRenderingContext2D,
  animator: AnimatorComponent,
  animation: Animation,
  state: AnimationTimelineState
): void {
  const timelineY = ctx.canvas.height - 60;
  const timelineWidth = ctx.canvas.width - 40;
  const timelineX = 20;
  
  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
  ctx.fillRect(timelineX - 10, timelineY - 30, timelineWidth + 20, 80);
  
  // Animation name
  ctx.fillStyle = 'white';
  ctx.font = '14px monospace';
  ctx.fillText(animation.name, timelineX, timelineY - 10);
  
  // Timeline bar
  ctx.fillStyle = '#333';
  ctx.fillRect(timelineX, timelineY, timelineWidth, 20);
  
  // Keyframe markers
  ctx.fillStyle = 'yellow';
  for (const keyframe of animation.keyframes) {
    const x = timelineX + keyframe.time * timelineWidth;
    ctx.fillRect(x - 2, timelineY, 4, 20);
  }
  
  // Event markers
  if (animation.events) {
    for (const event of animation.events) {
      const x = timelineX + event.time * timelineWidth;
      ctx.fillStyle = event.type === 'hitbox-start' ? 'red' : 
                      event.type === 'hitbox-end' ? 'green' : 'cyan';
      ctx.beginPath();
      ctx.arc(x, timelineY + 10, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  
  // Playhead
  const playheadX = timelineX + (animator.time / animation.duration) * timelineWidth;
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(playheadX, timelineY - 5);
  ctx.lineTo(playheadX, timelineY + 25);
  ctx.stroke();
  
  // Time display
  ctx.fillStyle = 'white';
  ctx.fillText(`${animator.time.toFixed(0)}ms / ${animation.duration}ms`, 
               timelineX + timelineWidth - 100, timelineY - 10);
}
```

## 14.6 Definition of Done Per Phase

Each phase is complete when:
- All listed tasks are implemented
- Completion criteria can be demonstrated
- No console errors during normal play
- Basic edge cases handled (going off screen, zero stamina, etc.)
- Performance maintains 60fps

---

## 15. Quick Reference Card

## Controls Summary
```
WASD - Move / Crouch(S) / Climb(W)
Shift - Run (Hold)
Space - Jump (hold for height)
S + Space - Drop Down
G - Dodge Roll | Alt - Backstep
V - Crouch Slide
Mouse - Aim weapon angle
LMB - Light Attack | E - Heavy Attack
RMB - Block | Q - Parry
```

## Combat Zones
```
High (1) - Mouse above player
Mid (2) - Mouse level with player
Low (3) - Mouse below player
Guard (0) - Mouse behind player (RMB required to block, +20% stability, 45% damage reduction all zones, +50% stamina cost)
```

## Stamina Costs
```
Light: 15 | Heavy: 30 | Block: 10-25 | Parry: 5 (attempt) + 20 (fail) | Roll: 20 | Backstep: 10 | Run: 10/s | Slide: 15
Successful Parry: Recovers 15 stamina
```

## Stamina Exhaustion
```
Triggers at: 0 stamina
Duration: 1.5s or until 30% stamina recovered
Cannot: Run, Attack, Roll
Block: Instant guard break
```

## Damage Formula
```
Base × ZoneMatch × CounterBonus = Final
```

## Key Timings (at 60fps)
```
Light Attack: 400ms total, active frames 8-11 (0-indexed)
Heavy Attack: 733ms total, active frames 19-24
Parry Window: 100ms (frames 1-6)
Roll I-Frames: 200ms (frames 1-12)
Backstep I-Frames: 100ms (frames 1-6)
Damage I-Frames: 500ms (30 frames)
Hit Stop: 2-4 frames
Coyote Time: 100ms (6 frames)
Jump Buffer: 100ms (6 frames)
Input Buffer: 133ms (8 frames)
Slide Cooldown: 500ms
```

## Poise Regeneration
```
Delay: 5 seconds after last hit
Rate: 20 per second
```

## Combat Tuning Targets
```
Player vs Hollow (no block): Dies in 6-7 hits
Hollow vs Player (perfect): Dies in 3 light attacks
Player blocks Brute heavy: Loses 30-40% stamina
Parry → Counter vs Soldier: Kills or nearly kills
```

---

# 16. Glossary

| Term | Definition |
|------|------------|
| Active Frames | Frames during which an attack's hitbox can deal damage |
| Anticipation | Wind-up animation before an attack becomes active; can often be dodge-canceled |
| Bind Pose | The default state of a skeleton when no animation is applied; essential for partial animations |
| Buffer | System that queues inputs during recovery for immediate execution when able |
| Coyote Time | Grace period after leaving platform where jump is still possible |
| Feint | Canceled attack that restarts with different zone; used to bait reactions |
| Guard Break | State caused by blocking when stamina depletes; results in long stagger |
| Hit Stop | Brief frame freeze on impact to accentuate force |
| Hitbox | Collision shape that deals damage (on attacks) |
| Hurtbox | Collision shape that receives damage (on characters) |
| Hyper Armor | Property that prevents stagger from light attacks |
| I-Frames | Invincibility frames; character cannot receive damage |
| Poise | Hidden stat; taking damage reduces it, reaching zero causes stagger |
| Recovery | Frames after active phase where character cannot act |
| Semi-solid | Platform type that can be jumped through from below and dropped through |
| Stagger | Stunned state after poise break or guard break; cannot act |
| Tell | Visual cue that telegraphs an incoming enemy attack |
| Zone | One of 3 angular regions (High/Mid/Low) for attack/block matching |
| Zone Match | When attack zone aligns with block zone for maximum damage reduction |

# 17. Final Notes
- PROPERLY CREATE ALL BOILERPLATE PROJECT FILES AND INSTALL THE NEEDED NPM PACKAGES BEFORE WRITING ANY CODE
- DO NOT install, account for, or attempt to use ESLint at any time, in any way.
- DO NOT add a `lint` script of any kind to `package.json`, ever.
- DO NOT install, account for, or attempt to use Jest or Vitest at any time, in any way,
- DO NOT install, account for, or attempt to use Next.js at any time, in any way.
- DO NOT deviate from the specifics of `## 11.3 File Structure` at any time, in any way. DO NOT EVER UNDER ANY CIRCUMSTANCES CREATE A `src` subdirectory. There should be ABSOLUTELY NO folder called `src` anywhere, the project is CLEARLY laid out relative to the root directory (aka `./`).
- DO NOT USE JSDOC, INSTEAD, WRITE COMMENTS THAT TARGET TSDOC, AS THIS IS A STRICTLY TYPESCRIPT PROJECT.
- Use the LATEST version of all packages according to NPM (Vite build, React)
- ensure you use PROPER extensionless TypeScript-specific relative imports and NOTHING ELSE, at all times (e.g. `import { World } from '../core/World;'` is CORRECT)
- ensure Vite is properly configured in terms of ports and allowed domains for the Z.AI chat environment
- ensure `tsconfig.json` is configured SPECIFICALLY with these compiler options verbatim, and that you strictly adhere AT ALL TIMES to the ones directly related to code, when writing code:
```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "allowUnreachableCode": false,
    "allowUnusedLabels": false,
    "noErrorTruncation": false,
    "noFallthroughCasesInSwitch": true,
    "noImplicitAny": true,
    "noImplicitOverride": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noStrictGenericChecks": false,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noUncheckedIndexedAccess": false,
    "strict": true,
    "strictBindCallApply": true,
    "strictFunctionTypes": true,
    "strictPropertyInitialization": true,
    "strictNullChecks": true,
    "suppressExcessPropertyErrors": false,
    "suppressImplicitAnyIndexErrors": false,
    "useUnknownInCatchVariables": true,
    "lib": [
      "ESNext",
      "DOM",
      "DOM.Iterable",
      "WebWorker"
    ],
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "react-jsx",
    "allowImportingTsExtensions": true,
    "noEmit": true
  },
  "include": [
    "."
  ],
  "exclude": [
    "vite.config.ts",
    "vitest.config.ts",
    "tests",
    "dist",
    "node_modules",
    ".github",
    "*.md",
    ".gitignore"
  ]
}
```



