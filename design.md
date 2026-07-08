# Game Design Document: Daily Emoji Resource Puzzle (Working Title)

## 🏙️ Game Premise
This game is a daily spatial logic and economic optimization puzzle played on a grid using emojis. Players are presented with a daily map containing numbered Cities, blocking Mountains, and edge Ports. 

The goal is to place an optimal configuration of resources to satisfy all City demands. However, simply solving the puzzle is just the baseline; the true objective is to maximize the daily score by exploiting scoring multipliers and high-value resource placements without violating strict zoning laws.

---

## 🧩 Grid Elements

### Board  Entities
*   **Cities (🏙️¹, 🏙️², 🏙️³):** Core constraint hubs. The number represents exactly how many resources must be placed adjacent to it (including diagonals).
*   **Mountains (⛰️):** Unbuildable terrain obstacles that block resource placement and restrict layout options.
*   **Ports (⚓🪵, ⚓🧱, ⚓🌾, ⚓🐑):** Edge tiles that restrict adjacent placement to a matching resource but reward huge point bonuses.
*   **Empty Plots (⬛):** Open, buildable land.

### Resource Inventory (Unlimited)
*   **High-Tier Resources:** 🐑 (Sheep), 🌾 (Wheat)
*   **Low-Tier Resources:** 🪵 (Wood), 🧱 (Brick)

---

## 📜 The 4 Golden Laws

A board is only considered **Valid** if it meets all four of the following criteria:

1.  **The Quota Rule**
    Every City must be surrounded by *exactly* the number of resources indicated by its number. This includes all 8 surrounding cells (orthogonally and diagonally).
2.  **The Strict Zoning Rule**
    Every placed resource must be adjacent to at least one City. You cannot dump resources in remote corners of the map ("the wilderness") just to harvest points.
3.  **The Isolation Rule**
    No two identical resources can touch each other, either orthogonally or diagonally. For example, a 🐑 can never be adjacent to another 🐑.
4.  **The Port Law**
    If a resource is placed in an empty plot adjacent to a Port, that resource *must* match the Port's designated type.

---

## 💰 The Point Scoring System

Once a board's validity is mathematically verified, the total score is computed dynamically based on resource tiers, location bonuses, and nexus multipliers.

### 1. Base Values
| Resource | Emoji | Base Value |
| :--- | :---: | :---: |
| Wheat | 🌾 | 20 Points |
| Sheep | 🐑 | 20 Points |
| Wood | 🪵 | 10 Points |
| Brick | 🧱 | 10 Points |

### 2. The Port Bonus
Placing a resource correctly adjacent to its matching Port grants a flat **+20 Point Bonus** to that specific item's base value. 
*   *Example:* A 🪵 placed at a Wood Port is worth 30 points instead of 10.

### 3. The "Nexus" Multiplier
Resources are scored **per City they touch**. If a resource is strategically positioned to overlap and touch multiple cities, its entire calculated value (Base + Port Bonus) multiplies.
*   **Double Nexus (Touches 2 Cities):** Total piece value is multiplied by 2.
*   **Triple Nexus (Touches 3 Cities):** Total piece value is multiplied by 3.
*   **Quad Nexus (Touches 4 Cities):** Total piece value is multiplied by 4.

> **Formula for a single tile score:**
> $$\text{Tile Score} = (\text{Base Value} + \text{Port Bonus}) \times \text{Cities Touched}$$

---

## 📝 Gameplay Examples

### Example 1: Basic Validity & Zoning
This example demonstrates the core constraints: satisfying the exact quotas, respecting the isolation rule, and obeying strict zoning.

#### The Starting Board
| ⚓🌾 | ⬛ | ⬛ |
| :---: | :---: | :---: |
| ⬛ | **🏙️²** | ⬛ |
| ⬛ | ⬛ | ⬛ |

#### The Invalid Play
A player places a **🐑 (Sheep)** in the top right corner, and another **🐑 (Sheep)** in the middle right space.
*   *Why it fails:* First, identical resources cannot touch orthogonally or diagonally (The Isolation Rule). Second, the top right space does not touch the **🏙️²** at all, meaning it was placed in the "wilderness" (violating The Strict Zoning Rule).

#### The Valid Play (Score: 60 Points)
*   **Move 1:** The player places a **🌾 (Wheat)** directly between the **🏙️²** and the **⚓🌾 (Wheat Port)**. 
    *   *Math:* 20 Base + 20 Port Bonus = 40 Points.
*   **Move 2:** The player needs one more resource to satisfy the city. They place a **🐑 (Sheep)** in the bottom right corner.
    *   *Math:* 20 Base.
*   **Result:** The city touches exactly two resources. No identical resources touch. All pieces touch a city. 
*   **Total Score:** 60 Points.

---

### Example 2: The "Mega-Play" Optimization
This example demonstrates how expert players will use multipliers and Ports to drastically increase their score, turning a simple board into an optimization puzzle.

#### The Starting Board
| ⬛ | ⚓🐑 | ⬛ | ⬛ |
| :---: | :---: | :---: | :---: |
| **🏙️²** | ⬛ | **🏙️²** | ⬛ |
| ⬛ | ⬛ | ⬛ | ⬛ |

#### The "Easy" Solution (Score: 90 Points)
A player avoids the center entirely and just places separate resources around the outside. 
*   They place a **🌾 (Wheat)** and a **🧱 (Brick)** on the far left to satisfy the first city. *(20 + 10 = 30)*
*   They place a **🌾 (Wheat)** and a **🐑 (Sheep)** on the far right to satisfy the second city. *(20 + 20 = 40)*
*   The **🐑** on the right was placed next to the Port! It gets a bonus. *(+20)*
*   *Total Score:* 30 + 40 + 20 = 90 Points. (Valid, but mathematically unoptimized).

#### The "Optimal" Solution (Score: 120 Points)
An expert player looks for the "Nexus" — the space that touches the most constraints simultaneously. 

*   **Move 1 (The Nexus):** They place a single **🐑 (Sheep)** directly in the center space (Row 2, Column 2). 
    *   It perfectly matches the Port directly above it.
    *   It touches the left **🏙️²**.
    *   It touches the right **🏙️²**.
    *   *Math:* (20 Base + 20 Port Bonus) = 40 points. Because it touches *two* cities, that value is multiplied by 2. This single tile generates **80 Points**.
*   **Move 2:** The left city still needs one resource. They place a **🌾 (Wheat)** directly below it. *(20 Points)*
*   **Move 3:** The right city still needs one resource. They place another **🌾 (Wheat)** directly below it. *(20 Points)*

#### The Max Score Board
| ⬛ | ⚓🐑 | ⬛ | ⬛ |
| :---: | :---: | :---: | :---: |
| **🏙️²** | 🐑 | **🏙️²** | ⬛ |
| 🌾 | ⬛ | 🌾 | ⬛ |

*   **Final Score Calculation:** 20 (Left Wheat) + 80 (Center Sheep Multiplier) + 20 (Right Wheat) = **120 Points**. All quotas perfectly met.