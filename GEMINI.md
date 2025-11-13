# GEMINI.md - Project Context for AI Assistant

This document provides a comprehensive overview of the `vibeMUD` project, intended to serve as instructional context for AI assistants.

## Project Overview

`vibeMUD` is an LPmud-inspired text-based multiplayer game server for "The Wumpy and Grift". It is built on a "Simple Object Architecture" principle where "Everything is an Object" with an ID, managed by a central `EntityManager`. The project emphasizes a data-driven approach, utilizing JavaScript files for object definitions (behavior) and JSON files for object instances (data). It leverages prototypal inheritance for instances to inherit behavior from definitions.

**Key Technologies:**
*   **Node.js:** The server-side runtime environment.
*   **Telnet Protocol:** For client connections.
*   **JavaScript:** For core engine logic, object definitions, and commands.
*   **JSON:** For data-driven object instances (world content, NPCs, items).

**Core Architectural Principles:**
*   **Simple Object Architecture:** Everything is an object with an ID, managed by `EntityManager`.
*   **Data-Driven:** Configuration over code, with clear separation of definitions (behavior) and instances (data).
*   **Prototypal Inheritance:** Instances inherit functions from definitions.
*   **Unified `move()` function:** Prevents item duplication bugs by centralizing all location changes.
*   **Heartbeat System:** Enables time-based events per object.
*   **Modular Design:** Commands and object behaviors are implemented as independent modules.
*   **Dirty Tracking:** Optimizes persistence by only saving modified objects.

## Building and Running

The project uses `npm` for dependency management and script execution.

**1. Install Dependencies:**
To set up the project, navigate to the root directory and install the required Node.js packages:
```bash
npm install
```

**2. Start the MUD Server:**
Once dependencies are installed, you can start the game server:
```bash
npm start
```
The server will typically run on `telnet localhost 4000`.

**3. Connect to the Server:**
You can connect to the running MUD server using a telnet client or a dedicated MUD client:
```bash
telnet localhost 4000
```

**4. Testing:**
*   **Run the demo script:**
    ```bash
    node demo.js
    ```
*   **Connect with telnet:**
    ```bash
    telnet localhost 4000
    ```
*   **Validation:** The system includes consistency checks. `entityManager.validate()` can be run to check for unique object IDs, correct item locations, and valid references.

## Development Conventions

**1. Definitions vs. Instances:**
*   **Definitions:** JavaScript files in `src/lib/` define object behaviors and functions (e.g., `monster.js`, `torch.js`).
*   **Instances:** JSON files in `src/world/` define specific objects in the game world (e.g., `rat_001.json`, `shield_001.json`). Instances inherit behavior from their corresponding definitions.

**2. Directory Structure:**
*   `src/core/`: Engine infrastructure (server, entity management, sessions, networking).
*   `src/lib/`: Object Definitions (reusable behavior templates).
*   `src/commands/`: Modular command definitions.
*   `src/systems/`: Game-wide rules (e.g., combat, magic - planned).
*   `src/world/`: Game World instances (rooms, NPCs, items, containers).
*   `src/data/players/`: Runtime save data for players only.

**3. Adding New Content:**
*   **Items/Monsters/Rooms:** Created as JSON files within `src/world/[realm]/items/`, `src/world/[realm]/npcs/`, or `src/world/[realm]/rooms/` respectively.
*   **Commands:** New commands are added as modular JavaScript files in `src/commands/`. They must export an object with `id`, `name`, `aliases`, `category`, `description`, `usage`, `requiresLogin`, and an `execute` function.
*   **Dynamic Behavior:** Achieved by adding a `heartbeat` function to object definitions in `src/lib/` and setting a `heartbeatInterval` in the instance JSON.

**4. Persistence:**
*   Only player data is saved at runtime (in `src/data/players/`).
*   World content (`src/world/`) is loaded as static content at server startup.
*   The `EntityManager` tracks "dirty" objects to minimize disk writes during auto-saving.

**5. Code Style:**
*   The `README.md` provides code examples that suggest a standard JavaScript style, including `module.exports` for modularity and clear function definitions.
*   ANSI color utilities are used for colored output in the game.

**6. Documentation:**
*   `CLAUDE.md`: Instructions for AI assistants (this file).
*   `docs/SYSTEM_DESIGN.md`: Detailed architecture documentation.
*   `docs/design_quick.md`: Quick reference guide.

This `GEMINI.md` will serve as a foundational document for understanding the `vibeMUD` project and guiding future interactions.
