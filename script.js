const boardElement = document.getElementById("board");
const movesValue = document.getElementById("movesValue");
const moodValue = document.getElementById("moodValue");
const helperText = document.getElementById("helperText");
const hintBadge = document.getElementById("hintBadge");
const winOverlay = document.getElementById("winOverlay");
const finalMoves = document.getElementById("finalMoves");

const resetButton = document.getElementById("resetButton");
const shuffleButton = document.getElementById("shuffleButton");
const hintButton = document.getElementById("hintButton");
const playAgainButton = document.getElementById("playAgainButton");
const installButton = document.getElementById("installButton");

const directions = ["top", "right", "bottom", "left"];
const directionOffsets = {
  top: [-1, 0],
  right: [0, 1],
  bottom: [1, 0],
  left: [0, -1],
};
const oppositeDirection = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right",
};

const solvedLayout = [
  [
    { type: "start", rotation: 0 },
    { type: "straight", rotation: 90 },
    { type: "corner", rotation: 180 },
  ],
  [
    { type: "stone", rotation: 0 },
    { type: "corner", rotation: 0 },
    { type: "corner", rotation: 270 },
  ],
  [
    { type: "stone", rotation: 0 },
    { type: "straight", rotation: 90 },
    { type: "goal", rotation: 180 },
  ],
];

let tiles = [];
let moveCount = 0;
let puzzleLocked = false;
let tutorialSeen = false;

function cloneLayout(layout) {
  return layout.map((row, rowIndex) =>
    row.map((tile, colIndex) => ({
      ...tile,
      row: rowIndex,
      col: colIndex,
      currentRotation: tile.rotation,
      solvedRotation: tile.rotation,
      active: false,
      isHint: false,
    }))
  );
}

function rotateOpenings(openings, rotation) {
  const steps = ((rotation % 360) + 360) % 360 / 90;
  return openings.map((opening) => directions[(directions.indexOf(opening) + steps) % 4]);
}

function getBaseOpenings(type) {
  switch (type) {
    case "start":
      return ["right"];
    case "goal":
      return ["left"];
    case "straight":
      return ["top", "bottom"];
    case "corner":
      return ["top", "right"];
    default:
      return [];
  }
}

function getOpenings(tile) {
  return rotateOpenings(getBaseOpenings(tile.type), tile.currentRotation);
}

function getTile(row, col) {
  return tiles[row]?.[col] ?? null;
}

function randomizePuzzle() {
  tiles = cloneLayout(solvedLayout);

  tiles.forEach((row) => {
    row.forEach((tile) => {
      if (tile.type === "stone") {
        tile.currentRotation = 0;
        return;
      }

      const randomTurns = Math.floor(Math.random() * 4);
      tile.currentRotation = (tile.solvedRotation + randomTurns * 90) % 360;
    });
  });

  if (isSolved()) {
    tiles[0][1].currentRotation = (tiles[0][1].currentRotation + 90) % 360;
  }

  moveCount = 0;
  puzzleLocked = false;
  tutorialSeen = false;
  helperText.textContent = "Make the water path glow from the spring to the flower.";
  hintBadge.textContent = "Tap a tile";
  moodValue.textContent = "Calm";
  winOverlay.classList.add("hidden");
  updateBoardState();
  renderBoard();
}

function traceActivePath() {
  const visited = new Set();
  const queue = [{ row: 0, col: 0 }];
  const activeKeys = new Set();
  let goalReached = false;

  while (queue.length) {
    const current = queue.shift();
    const key = `${current.row}-${current.col}`;

    if (visited.has(key)) {
      continue;
    }

    const tile = getTile(current.row, current.col);
    if (!tile || tile.type === "stone") {
      continue;
    }

    visited.add(key);
    activeKeys.add(key);

    if (tile.type === "goal") {
      goalReached = true;
    }

    getOpenings(tile).forEach((opening) => {
      const [rowOffset, colOffset] = directionOffsets[opening];
      const nextRow = current.row + rowOffset;
      const nextCol = current.col + colOffset;
      const nextTile = getTile(nextRow, nextCol);

      if (!nextTile || nextTile.type === "stone") {
        return;
      }

      const nextOpenings = getOpenings(nextTile);
      if (!nextOpenings.includes(oppositeDirection[opening])) {
        return;
      }

      queue.push({ row: nextRow, col: nextCol });
    });
  }

  return { activeKeys, goalReached };
}

function isSolved() {
  const { goalReached } = traceActivePath();
  return goalReached;
}

function updateBoardState() {
  const { activeKeys, goalReached } = traceActivePath();

  tiles.forEach((row) => {
    row.forEach((tile) => {
      tile.active = activeKeys.has(`${tile.row}-${tile.col}`);
    });
  });

  movesValue.textContent = String(moveCount);

  if (goalReached) {
    moodValue.textContent = "Blooming";
    helperText.textContent = "The garden is restored. Time for the next cozy challenge.";
    hintBadge.textContent = "Perfect flow";
    puzzleLocked = true;
    finalMoves.textContent = String(moveCount);
    window.setTimeout(() => {
      winOverlay.classList.remove("hidden");
    }, 420);
  } else if (moveCount > 0) {
    moodValue.textContent = moveCount < 6 ? "Focused" : "Flowing";
    hintBadge.textContent = tutorialSeen ? "Keep rotating" : "Tap a tile";
  }
}

function createTileSegments(tile) {
  const openings = getOpenings(tile);
  const segments = ["center", ...openings];

  return segments
    .map((segment) => {
      const segmentElement = document.createElement("span");
      segmentElement.className = `stream-segment stream-${segment}${tile.active ? " active" : ""}`;
      return segmentElement;
    });
}

function renderBoard() {
  boardElement.innerHTML = "";

  tiles.forEach((row) => {
    row.forEach((tile) => {
      const tileButton = document.createElement("button");
      tileButton.type = "button";
      tileButton.className = `tile ${tile.type}${tile.active ? " active" : ""}${tile.isHint ? " hint" : ""}`;
      tileButton.setAttribute("aria-label", `Tile ${tile.row + 1}-${tile.col + 1}`);
      tileButton.disabled = tile.type === "stone" || puzzleLocked;

      const inner = document.createElement("div");
      inner.className = "tile-inner";

      if (tile.type === "stone") {
        const pebble = document.createElement("div");
        pebble.className = "spring";
        pebble.style.width = "44%";
        pebble.style.height = "44%";
        pebble.style.background =
          "radial-gradient(circle at 35% 30%, #ffffff 0 18%, #e6efea 20%, #adc0b7 60%, #879a92 100%)";
        inner.append(pebble);
      } else {
        createTileSegments(tile).forEach((segment) => inner.append(segment));
      }

      if (tile.type === "start") {
        const spring = document.createElement("div");
        spring.className = "spring";
        inner.append(spring);
      }

      if (tile.type === "goal") {
        const lotus = document.createElement("div");
        lotus.className = "lotus";
        inner.append(lotus);
      }

      tileButton.addEventListener("click", () => rotateTile(tile.row, tile.col));
      tileButton.append(inner);
      boardElement.append(tileButton);
    });
  });
}

function rotateTile(row, col) {
  if (puzzleLocked) {
    return;
  }

  const tile = getTile(row, col);
  if (!tile || tile.type === "stone") {
    return;
  }

  tile.currentRotation = (tile.currentRotation + 90) % 360;
  tile.isHint = false;
  moveCount += 1;
  tutorialSeen = true;

  if (moveCount === 1) {
    helperText.textContent = "Nice. Keep going until the lotus lights up.";
  }

  updateBoardState();
  renderBoard();
}

function showHint() {
  if (puzzleLocked) {
    return;
  }

  const wrongTile = tiles
    .flat()
    .find((tile) => tile.type !== "stone" && tile.currentRotation !== tile.solvedRotation);

  tiles.flat().forEach((tile) => {
    tile.isHint = false;
  });

  if (wrongTile) {
    wrongTile.isHint = true;
    hintBadge.textContent = "A highlighted tile belongs in the path";
    helperText.textContent = "Hints point to a tile that still needs rotation.";
  } else {
    hintBadge.textContent = "You are one move away";
  }

  renderBoard();
}

resetButton.addEventListener("click", () => {
  moveCount = 0;
  puzzleLocked = false;
  tutorialSeen = false;
  winOverlay.classList.add("hidden");
  tiles = cloneLayout(solvedLayout);
  tiles.forEach((row) =>
    row.forEach((tile) => {
      tile.currentRotation = tile.solvedRotation;
      tile.active = false;
      tile.isHint = false;
    })
  );
  helperText.textContent = "Make the water path glow from the spring to the flower.";
  hintBadge.textContent = "Solved board";
  moodValue.textContent = "Balanced";
  updateBoardState();
  renderBoard();
});

shuffleButton.addEventListener("click", randomizePuzzle);
hintButton.addEventListener("click", showHint);
playAgainButton.addEventListener("click", randomizePuzzle);
installButton.addEventListener("click", () => {
  hintBadge.textContent = "CTA tapped";
  helperText.textContent = "Hook this button to your store URL in production.";
});

randomizePuzzle();
