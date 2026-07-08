const RESOURCE_TYPES = {
  wheat: { emoji: "🌾", label: "Wheat", base: 20 },
  sheep: { emoji: "🐑", label: "Sheep", base: 20 },
  wood: { emoji: "🪵", label: "Wood", base: 10 },
  brick: { emoji: "🧱", label: "Brick", base: 10 }
};

const CELL = {
  EMPTY: "empty",
  MOUNTAIN: "mountain",
  CITY: "city",
  PORT: "port"
};

const RANDOM_MAP_ID = "random-map";
const MIN_PORT_GAP = 2;


const state = {
  mapId: RANDOM_MAP_ID,
  selectedResource: "wheat",
  placements: {},
  randomMap: null,
  randomRows: 5,
  randomCols: 5
};

//const mapSelect = document.getElementById("map-select");
const boardEl = document.getElementById("board");
const resourcePicker = document.getElementById("resource-picker");
const clearBtn = document.getElementById("clear-btn");
const rerollBtn = document.getElementById("reroll-btn");
const randomHInput = document.getElementById("random-h-input");
const randomWInput = document.getElementById("random-w-input");

//const finalScoreEl = document.getElementById("final-score");
const potentialScoreEl = document.getElementById("potential-score");

function getActiveMap() {
  if (state.mapId === RANDOM_MAP_ID) {
    if (!state.randomMap) {
      state.randomMap = createRandomMap();
    } else if (!state.randomMap.solverVerified && !isMapSolvable(state.randomMap)) {
      state.randomMap = createRandomMap();
    }
    return state.randomMap;
  }
  return MAPS.find((m) => m.id === state.mapId);
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPick(items) {
  return items[randomInt(0, items.length - 1)];
}

function edgeCells(rows, cols) {
  const result = [];
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      if (row === 0 || row === rows - 1 || col === 0 || col === cols - 1) {
        result.push([row, col]);
      }
    }
  }
  return result;
}

function arePortsTooClose(aRow, aCol, bRow, bCol) {
  return Math.abs(aRow - bRow) <= MIN_PORT_GAP && Math.abs(aCol - bCol) <= MIN_PORT_GAP;
}

function createRandomMapCandidate(rows, cols) {
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ kind: CELL.EMPTY })));

  const portsToPlace = randomInt(3, 5);
  const edges = edgeCells(rows, cols).sort(() => Math.random() - 0.5);
  const portResources = Object.keys(RESOURCE_TYPES);
  const placedPorts = [];
  for (let i = 0; i < edges.length && placedPorts.length < portsToPlace; i += 1) {
    const [row, col] = edges[i];
    const touchesExistingPort = placedPorts.some(([pRow, pCol]) => arePortsTooClose(row, col, pRow, pCol));
    if (touchesExistingPort) {
      continue;
    }
    cells[row][col] = { kind: CELL.PORT, resource: randomPick(portResources) };
    placedPorts.push([row, col]);
  }

  const interior = [];
  for (let row = 1; row < rows - 1; row += 1) {
    for (let col = 1; col < cols - 1; col += 1) {
      interior.push([row, col]);
    }
  }
  const shuffledInterior = interior.sort(() => Math.random() - 0.5);

  const boardArea = rows * cols;
  const minMountains = Math.max(4, Math.floor(boardArea / 12));
  const maxMountains = Math.max(minMountains, Math.floor(boardArea / 6));
  const mountainsToPlace = maxMountains;
  for (let i = 0; i < mountainsToPlace; i += 1) {
    const [row, col] = shuffledInterior[i];
    cells[row][col] = { kind: CELL.MOUNTAIN };
  }

  const cityCandidates = shuffledInterior.filter(([row, col]) => cells[row][col].kind === CELL.EMPTY);
  const minCities = Math.max(3, Math.floor(boardArea / 18));
  const maxCities = Math.max(minCities, Math.floor(boardArea / 8));
  const citiesToPlace = maxCities;
  for (let i = 0; i < citiesToPlace; i += 1) {
    const [row, col] = cityCandidates[i];
    const maxNeighbors = getNeighbors(row, col, rows, cols).filter(([nr, nc]) => cells[nr][nc].kind === CELL.EMPTY).length;
    const quotaCap = Math.max(1, Math.min(3, maxNeighbors));
    const quota = randomInt(1, quotaCap);
    cells[row][col] = { kind: CELL.CITY, quota };
  }

  return {
    id: RANDOM_MAP_ID,
    name: `Random Map (${rows}x${cols})`,
    rows,
    cols,
    cells,
    examplePlacements: []
  };
}

function getAllowedResourcesForCell(map, row, col) {
  const ports = getAdjacentPorts(map, row, col);
  if (ports.length === 0) {
    return Object.keys(RESOURCE_TYPES);
  }
  const requiredType = ports[0].resource;
  const hasConflict = ports.some((p) => p.resource !== requiredType);
  if (hasConflict) {
    return [];
  }
  return [requiredType];
}

function isMapSolvable(map) {
  const candidateCells = [];
  const candidateKeyToIndex = new Map();
  for (let row = 0; row < map.rows; row += 1) {
    for (let col = 0; col < map.cols; col += 1) {
      if (mapCellAt(map, row, col).kind !== CELL.EMPTY) {
        continue;
      }
      if (!isAdjacentToCity(map, row, col)) {
        continue;
      }
      const key = keyFor(row, col);
      candidateKeyToIndex.set(key, candidateCells.length);
      candidateCells.push({ row, col, key, allowed: getAllowedResourcesForCell(map, row, col) });
    }
  }

  const cities = [];
  for (let row = 0; row < map.rows; row += 1) {
    for (let col = 0; col < map.cols; col += 1) {
      const cell = mapCellAt(map, row, col);
      if (cell.kind !== CELL.CITY) {
        continue;
      }
      const touching = getNeighbors(row, col, map.rows, map.cols)
        .map(([nr, nc]) => candidateKeyToIndex.get(keyFor(nr, nc)))
        .filter((idx) => idx !== undefined);
      cities.push({ row, col, quota: cell.quota, touching });
    }
  }

  const cellToCities = candidateCells.map(() => []);
  cities.forEach((city, cityIndex) => {
    city.touching.forEach((cellIndex) => {
      cellToCities[cellIndex].push(cityIndex);
    });
  });

  const cellNeighbors = candidateCells.map(() => []);
  candidateCells.forEach((cell, i) => {
    const neighbors = getNeighbors(cell.row, cell.col, map.rows, map.cols);
    neighbors.forEach(([nr, nc]) => {
      const neighborIdx = candidateKeyToIndex.get(keyFor(nr, nc));
      if (neighborIdx !== undefined) {
        cellNeighbors[i].push(neighborIdx);
      }
    });
  });

  const cityPlaced = cities.map(() => 0);
  const cityUnassignedCapacity = cities.map((city) => city.touching.length);
  const assignment = candidateCells.map(() => undefined);

  for (let c = 0; c < cities.length; c += 1) {
    if (cityUnassignedCapacity[c] < cities[c].quota) {
      return false;
    }
  }

  function canStillSatisfyQuotasForCells(cellIndex) {
    for (const cityIndex of cellToCities[cellIndex]) {
      if (cityPlaced[cityIndex] > cities[cityIndex].quota) {
        return false;
      }
      if (cityPlaced[cityIndex] + cityUnassignedCapacity[cityIndex] < cities[cityIndex].quota) {
        return false;
      }
    }
    return true;
  }

  function isIsolationSafe(cellIndex, resource) {
    if (!resource) {
      return true;
    }
    for (const neighborIdx of cellNeighbors[cellIndex]) {
      if (assignment[neighborIdx] === resource) {
        return false;
      }
    }
    return true;
  }

  function chooseNextCell() {
    let best = -1;
    let bestScore = Infinity;
    for (let i = 0; i < candidateCells.length; i += 1) {
      if (assignment[i] !== undefined) {
        continue;
      }
      const domainSize = candidateCells[i].allowed.length + 1;
      const score = domainSize * 10 - cellToCities[i].length;
      if (score < bestScore) {
        bestScore = score;
        best = i;
      }
    }
    return best;
  }

  function dfs() {
    const next = chooseNextCell();
    if (next === -1) {
      for (let c = 0; c < cities.length; c += 1) {
        if (cityPlaced[c] !== cities[c].quota) {
          return false;
        }
      }
      return true;
    }

    const values = [null, ...candidateCells[next].allowed];
    for (const value of values) {
      if (!isIsolationSafe(next, value)) {
        continue;
      }

      assignment[next] = value;
      for (const cityIndex of cellToCities[next]) {
        cityUnassignedCapacity[cityIndex] -= 1;
        if (value) {
          cityPlaced[cityIndex] += 1;
        }
      }

      const feasible = canStillSatisfyQuotasForCells(next);
      if (feasible && dfs()) {
        return true;
      }

      for (const cityIndex of cellToCities[next]) {
        cityUnassignedCapacity[cityIndex] += 1;
        if (value) {
          cityPlaced[cityIndex] -= 1;
        }
      }
      assignment[next] = undefined;
    }
    return false;
  }

  return dfs();
}

function createSolvedFallbackMap(rows, cols) {
  const cells = Array.from({ length: rows }, () => Array.from({ length: cols }, () => ({ kind: CELL.EMPTY })));
  cells[0][0] = { kind: CELL.PORT, resource: "wood" };
  cells[1][0] = { kind: CELL.EMPTY };
  cells[1][1] = { kind: CELL.CITY, quota: 1 };

  return {
    id: RANDOM_MAP_ID,
    name: "Random Map (fallback)",
    rows,
    cols,
    cells,
    examplePlacements: [],
    solverVerified: true
  };
}

function createRandomMap() {
  const rows = Math.max(4, Math.min(10, Number(state.randomRows) || 5));
  const cols = Math.max(4, Math.min(10, Number(state.randomCols) || 5));
  const maxAttempts = 120;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = createRandomMapCandidate(rows, cols);
    if (isMapSolvable(candidate)) {
      candidate.solverVerified = true;
      return candidate;
    }
  }
  return createSolvedFallbackMap(rows, cols);
}

function keyFor(row, col) {
  return `${row},${col}`;
}

function getNeighbors(row, col, rows, cols) {
  const points = [];
  for (let dr = -1; dr <= 1; dr += 1) {
    for (let dc = -1; dc <= 1; dc += 1) {
      if (dr === 0 && dc === 0) {
        continue;
      }
      const nr = row + dr;
      const nc = col + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
        points.push([nr, nc]);
      }
    }
  }
  return points;
}

function mapCellAt(map, row, col) {
  return map.cells[row][col];
}

function placementAt(row, col) {
  return state.placements[keyFor(row, col)] || null;
}

function setPlacement(row, col, resource) {
  const key = keyFor(row, col);
  if (!resource) {
    delete state.placements[key];
  } else {
    state.placements[key] = resource;
  }
}

function isAdjacentToCity(map, row, col) {
  return getNeighbors(row, col, map.rows, map.cols).some(([nr, nc]) => mapCellAt(map, nr, nc).kind === CELL.CITY);
}

function getAdjacentPorts(map, row, col) {
  return getNeighbors(row, col, map.rows, map.cols)
    .map(([nr, nc]) => ({ ...mapCellAt(map, nr, nc), row: nr, col: nc }))
    .filter((cell) => cell.kind === CELL.PORT);
}

function getAdjacentCityCount(map, row, col) {
  return getNeighbors(row, col, map.rows, map.cols)
    .map(([nr, nc]) => mapCellAt(map, nr, nc))
    .filter((cell) => cell.kind === CELL.CITY).length;
}

function validateAndScore(map) {
  const issues = {
    quota: [],
    zoning: [],
    isolation: [],
    port: []
  };
  const invalidCells = {
    cities: new Set(),
    ports: new Set(),
    resources: new Set()
  };
  const validCells = {
    cities: new Set()
  };
  const tileScores = [];

  for (let row = 0; row < map.rows; row += 1) {
    for (let col = 0; col < map.cols; col += 1) {
      const cell = mapCellAt(map, row, col);
      if (cell.kind !== CELL.CITY) {
        continue;
      }
      const nearby = getNeighbors(row, col, map.rows, map.cols)
        .map(([nr, nc]) => placementAt(nr, nc))
        .filter(Boolean);
      if (nearby.length !== cell.quota) {
        issues.quota.push(`City at (${row + 1},${col + 1}) needs ${cell.quota} resources, found ${nearby.length}.`);
        if (nearby.length > cell.quota) {
          invalidCells.cities.add(keyFor(row, col));
        }
      } else {
        validCells.cities.add(keyFor(row, col));
      }
    }
  }

  for (let row = 0; row < map.rows; row += 1) {
    for (let col = 0; col < map.cols; col += 1) {
      const placed = placementAt(row, col);
      if (!placed) {
        continue;
      }

      if (!isAdjacentToCity(map, row, col)) {
        issues.zoning.push(`Resource at (${row + 1},${col + 1}) is not adjacent to any city.`);
        invalidCells.resources.add(keyFor(row, col));
      }

      const sameTouching = getNeighbors(row, col, map.rows, map.cols).some(([nr, nc]) => {
        const neighborPlaced = placementAt(nr, nc);
        if (neighborPlaced === placed) {
          invalidCells.resources.add(keyFor(row, col));
          invalidCells.resources.add(keyFor(nr, nc));
          return true;
        }
        return false;
      });
      if (sameTouching) {
        issues.isolation.push(`Matching ${RESOURCE_TYPES[placed].emoji} touch at (${row + 1},${col + 1}).`);
      }

      const ports = getAdjacentPorts(map, row, col);
      const mismatchedPorts = ports.filter((p) => p.resource !== placed);
      const hasPortMismatch = mismatchedPorts.length > 0;
      if (hasPortMismatch) {
        const required = ports.map((p) => RESOURCE_TYPES[p.resource].emoji).join("/");
        issues.port.push(`Resource at (${row + 1},${col + 1}) must match adjacent port type ${required}.`);
        invalidCells.resources.add(keyFor(row, col));
        mismatchedPorts.forEach((port) => {
          invalidCells.ports.add(keyFor(port.row, port.col));
        });
      }

      const base = RESOURCE_TYPES[placed].base;
      const hasMatchingPort = ports.some((p) => p.resource === placed);
      const portBonus = hasMatchingPort ? 20 : 0;
      const cityTouches = getAdjacentCityCount(map, row, col);
      const multiplier = Math.max(1, cityTouches);
      const points = (base + portBonus) * multiplier;

      tileScores.push({
        row,
        col,
        resource: placed,
        base,
        portBonus,
        cityTouches,
        points
      });
    }
  }

  const potentialScore = tileScores.reduce((sum, t) => sum + t.points, 0);
  const valid = Object.values(issues).every((arr) => arr.length === 0);

  return {
    valid,
    issues,
    invalidCells,
    validCells,
    tileScores,
    potentialScore,
    finalScore: valid ? potentialScore : 0
  };
}

function renderMapSelect() {
  //mapSelect.innerHTML = "";

  const randomOption = document.createElement("option");
  randomOption.value = RANDOM_MAP_ID;
  randomOption.textContent = "Random Map";
  //mapSelect.appendChild(randomOption);

  // for (const map of MAPS) {
  //   const option = document.createElement("option");
  //   option.value = map.id;
  //   option.textContent = map.name;
  //   mapSelect.appendChild(option);
  // }
  //mapSelect.value = RANDOM_MAP_ID;
}

function updateRerollButtonState() {
  const isRandom = state.mapId === RANDOM_MAP_ID;
  rerollBtn.disabled = !isRandom;
  rerollBtn.title = isRandom ? "Generate a fresh random layout" : "Select Random Map to reroll";
}

function syncRandomSizeInputs() {
  randomHInput.value = String(state.randomRows);
  randomWInput.value = String(state.randomCols);
}

function renderResourcePicker() {
  resourcePicker.innerHTML = "";

  for (const [id, item] of Object.entries(RESOURCE_TYPES)) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `resource-btn ${state.selectedResource === id ? "active" : ""}`;
    btn.textContent = `${item.emoji} ${item.label}`;
    btn.addEventListener("click", () => {
      state.selectedResource = id;
      renderResourcePicker();
    });
    resourcePicker.appendChild(btn);
  }
}

function renderBoard(options = {}) {
  const map = getActiveMap();
  const report = validateAndScore(map);
  const pulse = options.pulse || null;
  const tileScoreByKey = new Map();
  report.tileScores.forEach((tile) => {
    tileScoreByKey.set(keyFor(tile.row, tile.col), tile);
  });
  boardEl.innerHTML = "";
  boardEl.style.setProperty("--board-cols", String(map.cols));

  for (let row = 0; row < map.rows; row += 1) {
    for (let col = 0; col < map.cols; col += 1) {
      const cell = mapCellAt(map, row, col);
      const placed = placementAt(row, col);
      const cellKey = keyFor(row, col);
      const div = document.createElement("button");
      div.type = "button";
      div.className = "cell";

      if (cell.kind === CELL.EMPTY) {
        div.classList.add("empty", "buildable");
        if (placed) {
          const tileScore = tileScoreByKey.get(cellKey);
          const badgeParts = [];
          if (tileScore && tileScore.portBonus > 0) {
            badgeParts.push(`<span class="cell-badge bonus">+${tileScore.portBonus}</span>`);
          }
          if (tileScore && tileScore.cityTouches > 1) {
            badgeParts.push(`<span class="cell-badge multi">x${tileScore.cityTouches}</span>`);
          }

          div.classList.add("resource-cell");
          div.innerHTML = `
            <span class="cell-emoji">${RESOURCE_TYPES[placed].emoji}</span>
            <span class="cell-badges">${badgeParts.join("")}</span>
          `;
        } else {
          div.textContent = "";
        }
        div.title = `Plot (${row + 1},${col + 1})`;
        div.addEventListener("click", () => {
          const sourceRect = div.getBoundingClientRect();
          const previousResource = placementAt(row, col);
          const nextResource = state.selectedResource === "erase" ? null : state.selectedResource;

          if (state.selectedResource === "erase" || previousResource === nextResource) {
            setPlacement(row, col, null);
          } else {
            setPlacement(row, col, state.selectedResource);
          }

          const resourceChanged = nextResource !== previousResource;
          const shouldAnimateScore = Boolean(nextResource) && resourceChanged;
          const afterReport = validateAndScore(map);
          const updatedTile = afterReport.tileScores.find((tile) => tile.row === row && tile.col === col);
          const popIntensity = updatedTile
            ? 1 + (updatedTile.portBonus > 0 ? 1 : 0) + Math.max(0, updatedTile.cityTouches - 1)
            : 1;

          renderBoard({ pulse: { row, col, intensity: popIntensity } });
          renderScorePanel(afterReport);

          if (updatedTile && shouldAnimateScore) {
            animateScoreFly(sourceRect, updatedTile.points, popIntensity);
          }
        });
        if (placed && report.invalidCells.resources.has(cellKey)) {
          div.classList.add("invalid-resource");
        }

        if (pulse && pulse.row === row && pulse.col === col) {
          div.classList.add("cell-pop");
          div.style.setProperty("--pop-scale", String(Math.min(1.42, 1.08 + pulse.intensity * 0.08)));
        }
      } else if (cell.kind === CELL.CITY) {
        div.classList.add("city");
        div.textContent = `🏙️ ${cell.quota}`;
        div.disabled = true;
        if (report.invalidCells.cities.has(cellKey)) {
          div.classList.add("invalid-city");
        } else if (report.validCells.cities.has(cellKey)) {
          div.classList.add("valid-city");
        }
      } else if (cell.kind === CELL.MOUNTAIN) {
        div.classList.add("mountain");
        div.textContent = "⛰️";
        div.disabled = true;
      } else if (cell.kind === CELL.PORT) {
        div.classList.add("port");
        div.textContent = `⚓${RESOURCE_TYPES[cell.resource].emoji}`;
        div.disabled = true;
        if (report.invalidCells.ports.has(cellKey)) {
          div.classList.add("invalid-port");
        }
      }

      boardEl.appendChild(div);
    }
  }
}

function renderScorePanel(report) {
  const map = getActiveMap();
  const reportToUse = report || validateAndScore(map);

  //finalScoreEl.textContent = String(reportToUse.finalScore);
  potentialScoreEl.textContent = String(reportToUse.potentialScore);
}

function animateScoreFly(sourceRect, points, intensity) {
  if (points <= 0) {
    return;
  }

  const startX = sourceRect.left + sourceRect.width / 2;
  const startY = sourceRect.top + sourceRect.height / 2;
  const riseDistance = sourceRect.height / 2 + 14;

  const flyer = document.createElement("div");
  flyer.className = "score-flyer";
  flyer.textContent = `+${points}`;
  flyer.style.left = `${startX}px`;
  flyer.style.top = `${startY}px`;
  flyer.style.setProperty("--fly-scale", String(Math.min(1.45, 1 + intensity * 0.08)));
  document.body.appendChild(flyer);

  const duration = 340 + Math.min(180, intensity * 65);

  const animation = flyer.animate(
    [
      { transform: "translate(-50%, -50%) scale(0.65)", opacity: 0 },
      { transform: "translate(-50%, -50%) scale(var(--fly-scale))", opacity: 1, offset: 0.25 },
      { transform: `translate(-50%, calc(-50% - ${riseDistance}px)) scale(0.9)`, opacity: 0 }
    ],
    {
      duration,
      easing: "cubic-bezier(.22,.9,.26,1)",
      fill: "forwards"
    }
  );

  animation.addEventListener("finish", () => {
    flyer.remove();
  });
}

function clearPlacements() {
  state.placements = {};
}

function installEvents() {
  // mapSelect.addEventListener("change", (event) => {
  //   state.mapId = event.target.value;
  //   if (state.mapId === RANDOM_MAP_ID) {
  //     state.randomMap = createRandomMap();
  //   }
  //   clearPlacements();
  //   syncRandomSizeInputs();
  //   updateRerollButtonState();
  //   renderBoard();
  //   renderScorePanel();
  // });

  randomHInput.addEventListener("change", () => {
    const nextValue = Number(randomHInput.value);
    state.randomRows = Math.max(4, Math.min(10, Number.isFinite(nextValue) ? nextValue : 5));
    syncRandomSizeInputs();
    if (state.mapId === RANDOM_MAP_ID) {
      state.randomMap = createRandomMap();
      clearPlacements();
      renderBoard();
      renderScorePanel();
    }
  });

  randomWInput.addEventListener("change", () => {
    const nextValue = Number(randomWInput.value);
    state.randomCols = Math.max(4, Math.min(10, Number.isFinite(nextValue) ? nextValue : 5));
    syncRandomSizeInputs();
    if (state.mapId === RANDOM_MAP_ID) {
      state.randomMap = createRandomMap();
      clearPlacements();
      renderBoard();
      renderScorePanel();
    }
  });

  clearBtn.addEventListener("click", () => {
    clearPlacements();
    renderBoard();
    renderScorePanel();
  });

  rerollBtn.addEventListener("click", () => {
    if (state.mapId !== RANDOM_MAP_ID) {
      return;
    }
    state.randomMap = createRandomMap();
    clearPlacements();
    renderBoard();
    renderScorePanel();
  });
}

function init() {
  //renderMapSelect();
  syncRandomSizeInputs();
  renderResourcePicker();
  updateRerollButtonState();
  renderBoard();
  renderScorePanel();
  installEvents();
}

init();
