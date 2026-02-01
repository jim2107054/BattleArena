# 🎮 AI Battle Arena - 3D Tactical Combat Game

A turn-based tactical battle game featuring two AI opponents fighting on a grid-based battlefield with environmental elements. Built with **Three.js** for 3D visualization.

---

## 📋 Table of Contents

1. [Game Overview](#game-overview)
2. [Installation & Running](#installation--running)
3. [Game Interface](#game-interface)
4. [Units & Stats](#units--stats)
5. [Environment Objects](#environment-objects)
6. [Turn System](#turn-system)
7. [Combat Mechanics](#combat-mechanics)
8. [AI Algorithms](#ai-algorithms)
9. [Points & Rewards System](#points--rewards-system)
10. [Win Conditions](#win-conditions)
11. [Technical Implementation](#technical-implementation)

---

## 🎯 Game Overview

**AI Battle Arena** is an automated turn-based strategy game where two AI-controlled teams battle for supremacy on an 8×8 tactical grid. The game demonstrates the difference between optimal (Minimax) and non-optimal (Greedy) decision-making algorithms in a visual, engaging format.

### Teams
- **🔴 Red Team** - Controlled by Minimax AI (Strategic, looks ahead)
- **🔵 Blue Team** - Controlled by Greedy AI (Reactive, immediate decisions)

### Objective
Eliminate all enemy units or have the highest total HP when the turn limit (100 turns) is reached.

---

## 🚀 Installation & Running

### Prerequisites
- Python 3.x (for local HTTP server)
- Modern web browser (Chrome, Firefox, Edge)

### Steps to Run

1. **Navigate to the game directory:**
   ```bash
   cd y:\3-2\AI_Lab\game
   ```

2. **Start the local server:**
   ```bash
   python -m http.server 8080
   ```

3. **Open in browser:**
   ```
   http://localhost:8080
   ```

4. **Click "Start Game"** to begin the AI battle!

---

## 🖥️ Game Interface

### Header HUD (Heads-Up Display)

```
┌─────────────────────────────────────────────────────────────┐
│  🔴 RED TEAM          TURN: 1           🔵 BLUE TEAM        │
│  Points: 0            [Current Turn]    Points: 0           │
│  Units: 4/4                             Units: 4/4          │
└─────────────────────────────────────────────────────────────┘
```

| Element | Description |
|---------|-------------|
| **Team Panels** | Shows each team's current points and surviving units |
| **Turn Counter** | Displays the current turn number (max 100) |
| **Turn Indicator** | Shows which team is currently taking their turn |

### Control Buttons

| Button | Function |
|--------|----------|
| **▶ Start Game** | Begins the automated AI battle |
| **⏸ Pause** | Pauses the game (changes to Resume when paused) |
| **🔄 Reset** | Restarts the game with fresh units and map |

### Legend Panel (Bottom Right)

Shows color coding for all game elements:
- Unit types for both teams
- Environment object types
- Interactive elements

### Action Log (Bottom Left)

Real-time text log showing:
- Unit movements
- Attack actions and damage dealt
- Kills and special events
- Power-up collections
- Turn transitions

---

## ⚔️ Units & Stats

Each team starts with **4 units**, one of each type:

### Unit Statistics Table

| Unit | Symbol | HP | Attack | Range | Speed | Role |
|------|--------|-----|--------|-------|-------|------|
| **Soldier** | 🟥/🟦 | 100 | 25 | 2 | 1 | Balanced all-rounder |
| **Sniper** | 🔺 | 60 | 45 | 4 | 1 | Long-range damage dealer |
| **Heavy** | ⬢ | 180 | 20 | 1 | 1 | High HP tank, melee only |
| **Scout** | ◆ | 70 | 20 | 2 | 2 | Fast, mobile harasser |

### Unit Details

#### 🎖️ Soldier (Balanced Fighter)
- **Health Points:** 100
- **Attack Damage:** 25
- **Attack Range:** 2 tiles
- **Movement Speed:** 1 tile per turn
- **Strategy:** Versatile unit, good for frontline combat
- **3D Model:** Cube shape

#### 🎯 Sniper (Long-Range Specialist)
- **Health Points:** 60
- **Attack Damage:** 45
- **Attack Range:** 4 tiles
- **Movement Speed:** 1 tile per turn
- **Strategy:** Stay back, deal heavy damage from distance
- **3D Model:** Cone shape (pointing direction)

#### 🛡️ Heavy (Tank)
- **Health Points:** 180
- **Attack Damage:** 20
- **Attack Range:** 1 tile (melee only)
- **Movement Speed:** 1 tile per turn
- **Strategy:** Absorb damage, protect other units
- **3D Model:** Cylinder shape

#### 🏃 Scout (Fast Attacker)
- **Health Points:** 70
- **Attack Damage:** 20
- **Attack Range:** 2 tiles
- **Movement Speed:** 2 tiles per turn
- **Strategy:** Flank enemies, grab power-ups quickly
- **3D Model:** Diamond/octahedron shape

### Starting Positions

```
    0   1   2   3   4   5   6   7
  ┌───┬───┬───┬───┬───┬───┬───┬───┐
0 │🔴S│   │   │   │   │   │   │🔵S│  S = Soldier
  ├───┼───┼───┼───┼───┼───┼───┼───┤
1 │🔴N│   │   │   │   │   │   │🔵N│  N = Sniper
  ├───┼───┼───┼───┼───┼───┼───┼───┤
2 │🔴H│   │   │   │   │   │   │🔵H│  H = Heavy
  ├───┼───┼───┼───┼───┼───┼───┼───┤
3 │🔴C│   │   │   │   │   │   │🔵C│  C = Scout
  ├───┼───┼───┼───┼───┼───┼───┼───┤
```

- **Red Team:** Spawns on left side (column 0)
- **Blue Team:** Spawns on right side (column 7)

---

## 🏗️ Environment Objects

The battlefield contains various environmental objects that affect gameplay:

### Object Types

| Object | Walkable | Blocks LOS | Cover Value | Special |
|--------|----------|------------|-------------|---------|
| **Wall** | ❌ No | ✅ Yes | N/A | Impassable barrier |
| **Door** | ✅ Yes | ❌ No | 15% | Can be opened |
| **Window** | ❌ No | ❌ No | 15% | Shoot through, can't walk |
| **Tree** | ❌ No | ❌ No | 10% | Natural obstacle |
| **Crate** | ❌ No | ❌ No | 20% | Destructible cover |
| **Power-up** | ✅ Yes | ❌ No | N/A | Heals 30 HP |

### Environment Details

#### 🧱 Walls (Brown Boxes)
- **Function:** Complete barriers
- **Movement:** Cannot pass through
- **Line of Sight:** Blocks attacks
- **Strategy:** Use for protection, but limits your attack options too

#### 🚪 Doors (Wooden Rectangles)
- **Function:** Passable barriers with cover
- **Movement:** Units can move through
- **Line of Sight:** Does not block
- **Cover Bonus:** 15% damage reduction when adjacent
- **Points:** +20 for using a door

#### 🪟 Windows (Blue-tinted Frames)
- **Function:** Shoot-through barriers
- **Movement:** Cannot pass through
- **Line of Sight:** Does NOT block (can attack through)
- **Cover Bonus:** 15% damage reduction when adjacent
- **Strategy:** Great sniper positions

#### 🌲 Trees (Green Cones)
- **Function:** Natural obstacles with light cover
- **Movement:** Cannot pass through
- **Line of Sight:** Does not block
- **Cover Bonus:** 10% damage reduction when adjacent

#### 📦 Crates (Orange Boxes)
- **Function:** Tactical cover objects
- **Movement:** Cannot pass through
- **Line of Sight:** Does not block
- **Cover Bonus:** 20% damage reduction when adjacent
- **Strategy:** Best cover in the game

#### ⭐ Power-ups (Yellow Stars)
- **Function:** Health restoration pickups
- **Effect:** Restores 30 HP (up to max)
- **Points:** +50 for collection
- **Respawn:** Do not respawn after collection
- **Strategy:** Prioritize when low on health

### Map Layout Example

```
    0   1   2   3   4   5   6   7
  ┌───┬───┬───┬───┬───┬───┬───┬───┐
0 │   │   │ W │   │   │ W │   │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
1 │   │ T │   │ D │ D │   │ T │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
2 │   │   │ C │   │   │ C │   │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
3 │ W │   │   │ ⭐│ ⭐│   │   │ W │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
4 │ W │   │   │ ⭐│ ⭐│   │   │ W │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
5 │   │   │ C │   │   │ C │   │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
6 │   │ T │   │ N │ N │   │ T │   │
  ├───┼───┼───┼───┼───┼───┼───┼───┤
7 │   │   │ W │   │   │ W │   │   │
  └───┴───┴───┴───┴───┴───┴───┴───┘

W = Wall, T = Tree, C = Crate, D = Door, N = Window, ⭐ = Power-up
```

---

## 🔄 Turn System

### Turn Structure

Each turn follows this sequence:

```
┌─────────────────────────────────────────┐
│           TURN START                     │
│              ↓                           │
│    ┌─────────────────────┐              │
│    │ AI Selects Unit     │              │
│    │ (alive units only)  │              │
│    └─────────────────────┘              │
│              ↓                           │
│    ┌─────────────────────┐              │
│    │ AI Evaluates        │              │
│    │ All Possible Actions│              │
│    └─────────────────────┘              │
│              ↓                           │
│    ┌─────────────────────┐              │
│    │ AI Chooses Best     │              │
│    │ Action (Move/Attack)│              │
│    └─────────────────────┘              │
│              ↓                           │
│    ┌─────────────────────┐              │
│    │ Action Executes     │              │
│    │ + Animation Plays   │              │
│    └─────────────────────┘              │
│              ↓                           │
│    ┌─────────────────────┐              │
│    │ Points Awarded      │              │
│    │ UI Updated          │              │
│    └─────────────────────┘              │
│              ↓                           │
│           TURN END                       │
│              ↓                           │
│    Switch to Other Team                  │
└─────────────────────────────────────────┘
```

### Turn Timing

| Event | Duration |
|-------|----------|
| Turn delay | 800ms between turns |
| Attack animation | ~300ms |
| Movement animation | ~200ms |
| Game start delay | 2000ms |

### Available Actions Per Turn

1. **Move** - Relocate to an adjacent empty tile
2. **Attack** - Deal damage to an enemy in range

*Note: A unit can only perform ONE action per turn (move OR attack, not both)*

---

## ⚔️ Combat Mechanics

### Attack Range Calculation

The game uses **Chebyshev Distance** (chessboard distance):

```
Distance = max(|x2 - x1|, |y2 - y1|)
```

Example for a unit at position (3,3):
```
    0   1   2   3   4   5   6
  ┌───┬───┬───┬───┬───┬───┬───┐
0 │ 3 │ 3 │ 3 │ 3 │ 3 │ 3 │ 3 │
  ├───┼───┼───┼───┼───┼───┼───┤
1 │ 3 │ 2 │ 2 │ 2 │ 2 │ 2 │ 3 │
  ├───┼───┼───┼───┼───┼───┼───┤
2 │ 3 │ 2 │ 1 │ 1 │ 1 │ 2 │ 3 │
  ├───┼───┼───┼───┼───┼───┼───┤
3 │ 3 │ 2 │ 1 │ ⬤ │ 1 │ 2 │ 3 │  ⬤ = Unit position
  ├───┼───┼───┼───┼───┼───┼───┤
4 │ 3 │ 2 │ 1 │ 1 │ 1 │ 2 │ 3 │
  ├───┼───┼───┼───┼───┼───┼───┤
5 │ 3 │ 2 │ 2 │ 2 │ 2 │ 2 │ 3 │
  ├───┼───┼───┼───┼───┼───┼───┤
6 │ 3 │ 3 │ 3 │ 3 │ 3 │ 3 │ 3 │
  └───┴───┴───┴───┴───┴───┴───┘
```

### Line of Sight (LOS)

Before attacking, the game checks if a clear path exists:

```javascript
// Simplified LOS algorithm
function hasLineOfSight(from, to):
    for each tile along the line from→to:
        if tile is WALL:
            return false  // Blocked!
    return true  // Clear shot
```

**LOS Rules:**
- ✅ Empty tiles - Clear
- ✅ Doors - Clear (can shoot through open doors)
- ✅ Windows - Clear (designed for shooting through)
- ✅ Trees - Clear (sparse enough to shoot through)
- ✅ Crates - Clear (can shoot over/around)
- ❌ Walls - **BLOCKED**

### Damage Calculation

```
Final Damage = Base Attack - Cover Reduction

Where:
- Base Attack = Unit's attack stat
- Cover Reduction = Sum of adjacent cover values
```

**Example:**
```
Sniper attacks Soldier (adjacent to crate + tree)
Base Damage: 45
Crate Cover: -20% of 45 = -9
Tree Cover: -10% of 45 = -4.5 (rounded to -4)
Final Damage: 45 - 9 - 4 = 32
```

### Cover System Details

Units receive damage reduction when **adjacent** (within 1 tile) to cover objects:

```
Adjacent = Chebyshev distance of 1

    ┌───┬───┬───┐
    │ ✓ │ ✓ │ ✓ │
    ├───┼───┼───┤
    │ ✓ │ C │ ✓ │  C = Cover object
    ├───┼───┼───┤    ✓ = Gets cover bonus
    │ ✓ │ ✓ │ ✓ │
    └───┴───┴───┘
```

**Cover stacks!** A unit adjacent to multiple cover objects gets ALL bonuses.

---

## 🤖 AI Algorithms

### Red Team: Minimax Algorithm

The Minimax algorithm is a decision-making algorithm for two-player games that assumes both players play optimally.

#### How It Works

```
                    [Current State]
                          │
           ┌──────────────┼──────────────┐
           ↓              ↓              ↓
       [Move A]       [Move B]       [Move C]      ← Red maximizes
           │              │              │
      ┌────┼────┐    ┌────┼────┐    ┌────┼────┐
      ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓
     [B1] [B2] [B3] [B1] [B2] [B3] [B1] [B2] [B3]  ← Blue minimizes
      │    │    │    │    │    │    │    │    │
      ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓    ↓
     +5   -3   +2   +1   +4   -1   +3   +2   +6    ← Evaluation scores
      │    │    │    │    │    │    │    │    │
      └────┴────┘    └────┴────┘    └────┴────┘
           │              │              │
          -3             -1             +2         ← Min of each branch
           │              │              │
           └──────────────┴──────────────┘
                          │
                         +2                        ← Max = Best move (C)
```

#### Alpha-Beta Pruning

Optimization that skips evaluating branches that can't affect the final decision:

```javascript
function minimax(state, depth, alpha, beta, isMaximizing):
    if depth == 0 or game_over:
        return evaluate(state)
    
    if isMaximizing:  // Red's turn
        maxEval = -infinity
        for each action:
            eval = minimax(result, depth-1, alpha, beta, false)
            maxEval = max(maxEval, eval)
            alpha = max(alpha, eval)
            if beta <= alpha:
                break  // Prune! Blue won't allow this
        return maxEval
    else:  // Blue's turn
        minEval = +infinity
        for each action:
            eval = minimax(result, depth-1, alpha, beta, true)
            minEval = min(minEval, eval)
            beta = min(beta, eval)
            if beta <= alpha:
                break  // Prune! Red won't choose this
        return minEval
```

#### Evaluation Function

The AI scores board states using:

```javascript
score = (Red Total HP - Blue Total HP) 
      + (Red Damage Potential × 0.5) 
      - (Blue Damage Potential × 0.5)
      + Positional Bonuses
```

**Factors considered:**
- Total remaining HP for each team
- Number of surviving units
- Potential damage each team can deal
- Strategic positioning

#### Minimax Parameters
- **Search Depth:** 2-3 moves ahead
- **Branching Factor:** ~20-40 actions per state
- **Pruning:** Alpha-beta reduces nodes by ~50-70%

---

### Blue Team: Greedy Algorithm

The Greedy algorithm makes locally optimal choices without considering future consequences.

#### Decision Priority

```
┌─────────────────────────────────────────────────────┐
│                GREEDY DECISION TREE                  │
├─────────────────────────────────────────────────────┤
│                                                      │
│  1. Can I KILL an enemy this turn?                  │
│     └─→ YES: Attack that enemy! (+500 points)       │
│     └─→ NO: Continue to step 2                      │
│                                                      │
│  2. Can I deal HIGH DAMAGE?                         │
│     └─→ YES: Attack highest-damage target           │
│     └─→ NO: Continue to step 3                      │
│                                                      │
│  3. Is there a POWER-UP nearby?                     │
│     └─→ YES: Move toward it (+50 points, +30 HP)    │
│     └─→ NO: Continue to step 4                      │
│                                                      │
│  4. DEFAULT: Move randomly or toward enemies        │
│                                                      │
└─────────────────────────────────────────────────────┘
```

#### Greedy Code Logic

```javascript
function getGreedyAction(state, team):
    bestAction = null
    bestScore = -infinity
    
    for each unit in team:
        for each possible action:
            score = evaluateImmediateValue(action)
            
            // Scoring priorities:
            if action.kills_enemy:
                score += 1000  // Highest priority
            else if action.deals_damage:
                score += damage_amount
            else if action.collects_powerup:
                score += 50
            else:
                score += random(0, 10)  // Random exploration
            
            if score > bestScore:
                bestScore = score
                bestAction = action
    
    return bestAction
```

#### Why Greedy is Non-Optimal

| Situation | Greedy Choice | Optimal Choice |
|-----------|---------------|----------------|
| Can deal 40 damage now OR position for 80 damage next turn | Deals 40 now | Positions for 80 |
| Enemy sniper exposed but heavy is low HP | Attacks sniper (more damage) | Kills heavy (strategic) |
| Power-up available but enemy about to kill ally | Grabs power-up | Defends ally |

---

### AI Comparison

| Aspect | Minimax (Red) | Greedy (Blue) |
|--------|---------------|---------------|
| **Planning** | 2-3 turns ahead | Current turn only |
| **Decision Time** | Slower (more computation) | Faster |
| **Adaptability** | Reacts to opponent strategy | Reactive only |
| **Weakness** | Limited depth | No foresight |
| **Win Rate** | Higher (~60-70%) | Lower (~30-40%) |

---

## 🏆 Points & Rewards System

### Point Values

| Action | Points | Description |
|--------|--------|-------------|
| **DAMAGE** | +2 per HP | Points for each damage dealt |
| **KILL** | +500 | Eliminating an enemy unit |
| **CRITICAL** | +100 | Bonus for high-damage hits |
| **FIRST_BLOOD** | +300 | First kill of the game |
| **POWERUP** | +50 | Collecting a power-up |
| **DOOR_USE** | +20 | Moving through a door |
| **VICTORY** | +1000 | Winning the game |
| **FLAWLESS** | +500 | Victory with no unit losses |
| **DOMINATION** | +300 | Victory with 3+ units alive |

### Point Calculation Examples

**Example 1: Standard Attack**
```
Soldier attacks enemy Sniper for 25 damage
Points: 25 × 2 = 50 points
```

**Example 2: Kill Shot**
```
Sniper kills enemy Scout (finishing blow of 45 damage)
Points: 45 × 2 + 500 = 590 points
```

**Example 3: First Blood**
```
Heavy gets first kill of the game
Points: Damage × 2 + 500 + 300 = Damage points + 800
```

**Example 4: Victory Bonuses**
```
Red team wins with all 4 units alive
Points: 1000 (Victory) + 500 (Flawless) + 300 (Domination) = 1800 bonus points
```

### Floating Points Animation

When points are earned, animated "+XX" numbers float upward from the action location in the team's color (red/blue).

---

## 🏁 Win Conditions

### Primary Win Condition: Elimination

```
┌─────────────────────────────────────┐
│     ALL ENEMY UNITS ELIMINATED      │
│                                     │
│   Team with surviving units WINS    │
│                                     │
│   Bonuses Applied:                  │
│   • +1000 Victory                   │
│   • +500 Flawless (if no losses)    │
│   • +300 Domination (if 3+ alive)   │
└─────────────────────────────────────┘
```

### Secondary Win Condition: Turn Limit

```
┌─────────────────────────────────────┐
│      TURN LIMIT REACHED (100)       │
│                                     │
│   Team with HIGHEST TOTAL HP WINS   │
│                                     │
│   Calculation:                      │
│   Sum of all surviving units' HP    │
│                                     │
│   Tie-breaker: Team with more units │
└─────────────────────────────────────┘
```

### Game Over Screen

When the game ends, a popup displays:
- 🏆 **Winner announcement** (Red/Blue Team Wins!)
- 📊 **Final scores** for both teams
- 🔄 **Play Again** button

---

## 🔧 Technical Implementation

### Technology Stack

| Component | Technology |
|-----------|------------|
| **3D Rendering** | Three.js r128 |
| **Language** | Vanilla JavaScript |
| **Styling** | CSS3 with custom properties |
| **Fonts** | Google Fonts (Orbitron, Rajdhani) |
| **Server** | Python HTTP server |

### File Structure

```
game/
├── index.html      # Main HTML with UI/HUD
├── game.js         # Game engine (~800 lines)
└── README.md       # This documentation
```

### Key Code Components

#### Game State Object
```javascript
gameState = {
    units: [
        { id, team, type, x, y, hp, maxHp, attack, range, speed, mesh }
    ],
    map: [
        [TILE_TYPE, TILE_TYPE, ...],  // 8x8 grid
        ...
    ],
    currentTeam: 'red' | 'blue',
    turn: 1,
    scores: { red: 0, blue: 0 },
    gameOver: false,
    firstBlood: false
}
```

#### Three.js Scene Setup
```javascript
// Scene components
scene = new THREE.Scene()
camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000)
renderer = new THREE.WebGLRenderer({ antialias: true })

// Lighting
ambientLight = new THREE.AmbientLight(0x404040, 0.6)
directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)

// Camera position (isometric-like view)
camera.position.set(12, 15, 12)
camera.lookAt(4, 0, 4)  // Center of 8x8 grid
```

### Performance Considerations

1. **Minimax Depth Limiting** - Prevents excessive computation
2. **Alpha-Beta Pruning** - Reduces search space by ~60%
3. **Object Pooling** - Reuses Three.js geometries
4. **RequestAnimationFrame** - Smooth 60fps rendering

---

## 🎮 Gameplay Tips

### General Strategy
1. **Use cover** - Position units near crates/trees
2. **Protect snipers** - Keep them behind front-line units
3. **Focus fire** - Concentrate attacks to secure kills
4. **Control center** - Power-ups spawn in the middle

### Understanding the AI

**Red Team (Minimax) tends to:**
- Make sacrificial plays for future advantage
- Protect high-value units (snipers)
- Set up multi-turn combinations

**Blue Team (Greedy) tends to:**
- Chase immediate damage opportunities
- Rush for power-ups aggressively
- Miss strategic positioning plays

### Watching for Key Moments
- **First Blood** - Early aggression indicator
- **Sniper Positioning** - Long-range control
- **Heavy Engagements** - Tank battles
- **Scout Flanks** - Mobile harassment

---

## 📝 Version History

| Version | Changes |
|---------|---------|
| 1.0 | Initial release with basic units |
| 2.0 | Added environment objects, cover system |
| 2.1 | Points/rewards system, improved UI |
| 2.2 | Enhanced AI evaluation functions |

---

## 🙏 Credits

- **Three.js** - 3D rendering library
- **Google Fonts** - Typography
- **Minimax Algorithm** - Classic game theory

---

## 📄 License

This project is created for educational purposes as part of AI Lab coursework.

---

*Happy watching! May the best AI win! 🎮🤖*
