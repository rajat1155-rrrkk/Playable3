const BOARD_SIZE = 5;
const GAME_TIME = 40;
const TARGET_BLOOMS = 3;
const STORE_URL = "https://play.google.com/store";

const PIECE_LIBRARY = [
  {
    id: "bunny_line",
    name: "Bunny",
    className: "tile-bunny",
    face: "🐰",
    cells: [
      [0, 0],
      [1, 0]
    ]
  },
  {
    id: "kitten_corner",
    name: "Kitten",
    className: "tile-kitten",
    face: "🐱",
    cells: [
      [0, 0],
      [1, 0],
      [0, 1]
    ]
  },
  {
    id: "panda_line",
    name: "Panda",
    className: "tile-panda",
    face: "🐼",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0]
    ]
  },
  {
    id: "chick_square",
    name: "Chick",
    className: "tile-chick",
    face: "🐥",
    cells: [
      [0, 0],
      [1, 0],
      [0, 1],
      [1, 1]
    ]
  }
];

const tutorialPieces = ["bunny_line", "kitten_corner", "chick_square"];

const boardEl = document.getElementById("board");
const trayEl = document.getElementById("tray");
const dragGhostEl = document.getElementById("dragGhost");
const scoreValueEl = document.getElementById("scoreValue");
const bloomsValueEl = document.getElementById("bloomsValue");
const timerValueEl = document.getElementById("timerValue");
const messageTextEl = document.getElementById("messageText");
const endCardEl = document.getElementById("endCard");
const endTitleEl = document.getElementById("endTitle");
const endSummaryEl = document.getElementById("endSummary");
const replayButtonEl = document.getElementById("replayButton");
const finalCtaButtonEl = document.getElementById("finalCtaButton");
const ctaButtonEl = document.getElementById("ctaButton");
const muteToggleEl = document.getElementById("muteToggle");
const timerCardEl = document.querySelector(".timer-card");

let board = [];
let tray = [];
let score = 0;
let blooms = 0;
let timeLeft = GAME_TIME;
let timerId = null;
let gameOver = false;
let soundEnabled = true;
let dragState = null;
let tutorialStep = 0;
let activePointerId = null;

function clonePiece(id) {
  const template = PIECE_LIBRARY.find((piece) => piece.id === id);
  return {
    ...template,
    cells: template.cells.map(([x, y]) => [x, y])
  };
}

function setupBoard() {
  board = Array.from({ length: BOARD_SIZE }, () => Array(BOARD_SIZE).fill(null));

  const seededCells = [
    [0, 0, "tile-kitten", "🐱"],
    [1, 0, "tile-panda", "🐼"],
    [2, 0, "tile-bunny", "🐰"],
    [4, 1, "tile-chick", "🐥"],
    [0, 2, "tile-panda", "🐼"],
    [2, 2, "tile-kitten", "🐱"],
    [3, 2, "tile-bunny", "🐰"],
    [0, 3, "tile-chick", "🐥"],
    [2, 3, "tile-bunny", "🐰"],
    [4, 3, "tile-panda", "🐼"],
    [0, 4, "tile-kitten", "🐱"],
    [3, 4, "tile-chick", "🐥"]
  ];

  seededCells.forEach(([x, y, className, face]) => {
    board[y][x] = { className, face };
  });
}

function buildBoard() {
  boardEl.innerHTML = "";
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.dataset.x = String(x);
      cell.dataset.y = String(y);
      boardEl.appendChild(cell);
    }
  }
  renderBoard();
}

function renderBoard() {
  Array.from(boardEl.children).forEach((cell) => {
    const x = Number(cell.dataset.x);
    const y = Number(cell.dataset.y);
    const occupant = board[y][x];
    cell.className = "cell";
    cell.innerHTML = "";
    if (occupant) {
      cell.classList.add("filled", occupant.className);
      const fragment = createFragment(occupant.face, occupant.className);
      cell.appendChild(fragment);
    }
  });
  paintTutorialTarget();
}

function createFragment(face, className) {
  const fragment = document.createElement("div");
  fragment.className = `piece-fragment ${className}`;
  fragment.dataset.face = face;
  return fragment;
}

function randomPieceIds(count) {
  const pool = [...PIECE_LIBRARY];
  const picks = [];
  while (picks.length < count) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    const [picked] = pool.splice(randomIndex, 1);
    picks.push(picked.id);
  }
  return picks;
}

function refillTray(useTutorial = false) {
  const ids = useTutorial ? tutorialPieces : randomPieceIds(3);
  tray = ids.map((id) => clonePiece(id));
  renderTray();
  if (hasNoMoves()) {
    endGame(false, "The garden is full for now.");
  }
}

function renderTray() {
  trayEl.innerHTML = "";

  tray.forEach((piece, index) => {
    const card = document.createElement("button");
    card.className = "piece-card";
    card.type = "button";
    card.dataset.index = String(index);
    card.dataset.pieceId = piece.id;
    if (tutorialStep === 0 && index === 0) {
      card.classList.add("glow");
    }

    const grid = buildPieceGrid(piece);
    card.appendChild(grid);

    const label = document.createElement("span");
    label.className = "piece-name";
    label.textContent = piece.name;
    card.appendChild(label);

    card.addEventListener("pointerdown", handlePointerDown);
    trayEl.appendChild(card);
  });

  while (trayEl.children.length < 3) {
    const spacer = document.createElement("div");
    spacer.className = "piece-card hidden-card";
    trayEl.appendChild(spacer);
  }
}

function buildPieceGrid(piece, scale = 1) {
  const grid = document.createElement("div");
  grid.className = "piece-grid";

  const width = Math.max(...piece.cells.map(([x]) => x)) + 1;
  const height = Math.max(...piece.cells.map(([, y]) => y)) + 1;
  const unit = Math.min(22, 58 / Math.max(width, height)) * scale;
  const gridWidth = width * unit;
  const gridHeight = height * unit;

  grid.style.width = `${gridWidth}px`;
  grid.style.height = `${gridHeight}px`;
  grid.style.margin = "6px auto 22px";

  piece.cells.forEach(([x, y]) => {
    const fragment = createFragment(piece.face, piece.className);
    fragment.style.left = `${x * unit}px`;
    fragment.style.top = `${y * unit}px`;
    fragment.style.width = `${unit}px`;
    fragment.style.height = `${unit}px`;
    fragment.style.position = "absolute";
    fragment.style.inset = "auto";
    grid.appendChild(fragment);
  });

  return grid;
}

function startTimer() {
  clearInterval(timerId);
  timerId = window.setInterval(() => {
    if (gameOver) {
      return;
    }
    timeLeft -= 1;
    updateHud();
    if (timeLeft <= 0) {
      endGame(blooms >= TARGET_BLOOMS, blooms >= TARGET_BLOOMS ? "You found the calm rhythm." : "One more bloom would do it.");
    }
  }, 1000);
}

function updateHud() {
  scoreValueEl.textContent = String(score);
  bloomsValueEl.textContent = `${blooms} / ${TARGET_BLOOMS}`;
  timerValueEl.textContent = `${Math.max(timeLeft, 0)}s`;
  timerCardEl.classList.toggle("alert", timeLeft <= 10);
}

function setMessage(text) {
  messageTextEl.textContent = text;
}

function handlePointerDown(event) {
  if (gameOver || activePointerId !== null) {
    return;
  }

  const card = event.currentTarget;
  const trayIndex = Number(card.dataset.index);
  const piece = tray[trayIndex];
  if (!piece) {
    return;
  }

  if (tutorialStep === 0 && trayIndex !== 0) {
    return;
  }

  const ghostGrid = buildPieceGrid(piece, 1.12);
  dragGhostEl.innerHTML = "";
  dragGhostEl.appendChild(ghostGrid);
  dragGhostEl.classList.remove("hidden");

  activePointerId = event.pointerId;
  dragState = {
    trayIndex,
    piece,
    originCard: card
  };

  card.setPointerCapture(event.pointerId);
  moveGhost(event.clientX, event.clientY);
  highlightDrop(event.clientX, event.clientY);
}

function moveGhost(clientX, clientY) {
  dragGhostEl.style.transform = `translate(${clientX - 43}px, ${clientY - 43}px)`;
}

function getBoardCoordinates(clientX, clientY) {
  const rect = boardEl.getBoundingClientRect();
  const cellWidth = rect.width / BOARD_SIZE;
  const cellHeight = rect.height / BOARD_SIZE;
  const x = Math.floor((clientX - rect.left) / cellWidth);
  const y = Math.floor((clientY - rect.top) / cellHeight);
  if (x < 0 || x >= BOARD_SIZE || y < 0 || y >= BOARD_SIZE) {
    return null;
  }
  return { x, y };
}

function canPlacePiece(piece, anchorX, anchorY) {
  return piece.cells.every(([x, y]) => {
    const boardX = anchorX + x;
    const boardY = anchorY + y;
    return boardX >= 0 && boardX < BOARD_SIZE && boardY >= 0 && boardY < BOARD_SIZE && !board[boardY][boardX];
  });
}

function clearDropHighlights() {
  boardEl.querySelectorAll(".can-drop, .tutorial-target").forEach((cell) => {
    cell.classList.remove("can-drop", "tutorial-target");
  });
  paintTutorialTarget();
}

function paintTutorialTarget() {
  if (tutorialStep !== 0) {
    return;
  }
  [
    [3, 0],
    [4, 0]
  ].forEach(([x, y]) => {
    const cell = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) {
      cell.classList.add("tutorial-target");
    }
  });
}

function highlightDrop(clientX, clientY) {
  clearDropHighlights();
  const coords = getBoardCoordinates(clientX, clientY);
  if (!coords || !dragState) {
    return;
  }
  if (!canPlacePiece(dragState.piece, coords.x, coords.y)) {
    return;
  }
  dragState.piece.cells.forEach(([offsetX, offsetY]) => {
    const x = coords.x + offsetX;
    const y = coords.y + offsetY;
    const cell = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (cell) {
      cell.classList.add("can-drop");
    }
  });
}

function placePiece(piece, anchorX, anchorY) {
  piece.cells.forEach(([x, y]) => {
    board[anchorY + y][anchorX + x] = {
      className: piece.className,
      face: piece.face
    };
  });

  score += piece.cells.length * 10;
  renderBoard();

  const clearedCells = collectClears();
  if (clearedCells.length > 0) {
    blooms += clearedCells.length >= 4 ? 1 : 0;
    score += clearedCells.length * 12;
    animateClear(clearedCells);
    if (blooms >= TARGET_BLOOMS) {
      window.setTimeout(() => endGame(true, "Three blooms and a very happy garden."), 480);
    }
    setMessage(clearedCells.length >= 8 ? "Lovely combo. Everything feels lighter." : "A soft bloom clears the board.");
    chirp(760, 0.07);
  } else {
    chirp(520, 0.05);
    setMessage("Nice placement. Build another bloom.");
  }

  tray[dragState.trayIndex] = null;
  tray = tray.filter(Boolean);
  renderTray();

  if (tutorialStep === 0) {
    tutorialStep = 1;
    setMessage("Perfect. Now try any shape to make calm combos.");
  } else if (tutorialStep === 1) {
    tutorialStep = 2;
  }

  updateHud();

  if (tray.length === 0 && !gameOver) {
    window.setTimeout(() => refillTray(false), 260);
  } else if (hasNoMoves() && !gameOver) {
    endGame(false, "No more cozy moves left.");
  }
}

function collectClears() {
  const clearSet = new Set();

  for (let y = 0; y < BOARD_SIZE; y += 1) {
    if (board[y].every(Boolean)) {
      for (let x = 0; x < BOARD_SIZE; x += 1) {
        clearSet.add(`${x},${y}`);
      }
    }
  }

  for (let x = 0; x < BOARD_SIZE; x += 1) {
    let fullColumn = true;
    for (let y = 0; y < BOARD_SIZE; y += 1) {
      if (!board[y][x]) {
        fullColumn = false;
        break;
      }
    }
    if (fullColumn) {
      for (let y = 0; y < BOARD_SIZE; y += 1) {
        clearSet.add(`${x},${y}`);
      }
    }
  }

  for (let y = 0; y < BOARD_SIZE - 1; y += 1) {
    for (let x = 0; x < BOARD_SIZE - 1; x += 1) {
      if (board[y][x] && board[y][x + 1] && board[y + 1][x] && board[y + 1][x + 1]) {
        clearSet.add(`${x},${y}`);
        clearSet.add(`${x + 1},${y}`);
        clearSet.add(`${x},${y + 1}`);
        clearSet.add(`${x + 1},${y + 1}`);
      }
    }
  }

  return [...clearSet].map((value) => value.split(",").map(Number));
}

function animateClear(cells) {
  cells.forEach(([x, y]) => {
    const cellEl = boardEl.querySelector(`.cell[data-x="${x}"][data-y="${y}"]`);
    if (cellEl) {
      cellEl.classList.add("clear-flash");
    }
  });

  window.setTimeout(() => {
    cells.forEach(([x, y]) => {
      board[y][x] = null;
    });
    renderBoard();
    updateHud();
  }, 230);
}

function endGame(didWin, summary) {
  if (gameOver) {
    return;
  }
  gameOver = true;
  clearInterval(timerId);
  setMessage(didWin ? "A quiet little victory." : "Almost there. Try one more soothing round.");
  endTitleEl.textContent = didWin ? "So peaceful." : "One more bloom?";
  endSummaryEl.textContent = `${summary} Final score: ${score}.`;
  endCardEl.classList.remove("hidden");
  chirp(didWin ? 860 : 420, 0.11);
}

function replay() {
  score = 0;
  blooms = 0;
  timeLeft = GAME_TIME;
  gameOver = false;
  tutorialStep = 0;
  activePointerId = null;
  dragState = null;
  endCardEl.classList.add("hidden");
  setupBoard();
  buildBoard();
  refillTray(true);
  setMessage("Drag the glowing bunny tile into the sparkling space.");
  updateHud();
  startTimer();
}

function hasNoMoves() {
  return tray.every((piece) => !piece || !hasPlacementForPiece(piece));
}

function hasPlacementForPiece(piece) {
  for (let y = 0; y < BOARD_SIZE; y += 1) {
    for (let x = 0; x < BOARD_SIZE; x += 1) {
      if (canPlacePiece(piece, x, y)) {
        return true;
      }
    }
  }
  return false;
}

function goToStore() {
  window.open(STORE_URL, "_blank", "noopener,noreferrer");
}

function chirp(frequency, duration) {
  if (!soundEnabled) {
    return;
  }

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    return;
  }

  if (!chirp.audioContext) {
    chirp.audioContext = new AudioContextClass();
  }

  const ctx = chirp.audioContext;
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gainNode.gain.value = 0.0001;
  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  const now = ctx.currentTime;
  gainNode.gain.exponentialRampToValueAtTime(0.03, now + 0.02);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.start(now);
  oscillator.stop(now + duration);
}

document.addEventListener("pointermove", (event) => {
  if (!dragState || event.pointerId !== activePointerId) {
    return;
  }
  moveGhost(event.clientX, event.clientY);
  highlightDrop(event.clientX, event.clientY);
});

document.addEventListener("pointerup", (event) => {
  if (!dragState || event.pointerId !== activePointerId) {
    return;
  }

  const coords = getBoardCoordinates(event.clientX, event.clientY);
  if (coords && canPlacePiece(dragState.piece, coords.x, coords.y)) {
    placePiece(dragState.piece, coords.x, coords.y);
  }

  clearDropHighlights();
  dragGhostEl.innerHTML = "";
  dragGhostEl.classList.add("hidden");
  activePointerId = null;
  dragState = null;
});

document.addEventListener("pointercancel", () => {
  clearDropHighlights();
  dragGhostEl.innerHTML = "";
  dragGhostEl.classList.add("hidden");
  activePointerId = null;
  dragState = null;
});

replayButtonEl.addEventListener("click", replay);
finalCtaButtonEl.addEventListener("click", goToStore);
ctaButtonEl.addEventListener("click", goToStore);
muteToggleEl.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  muteToggleEl.textContent = soundEnabled ? "Sound On" : "Sound Off";
});

replay();
