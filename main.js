const CELL = 60;
const boardCanvas = document.getElementById('board');
const boardCtx = boardCanvas.getContext('2d');
const nextCanvas = document.getElementById('next');
const nextCtx = nextCanvas.getContext('2d');
const overlay = document.getElementById('overlay');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const highscoreEl = document.getElementById('highscore');
const HIGHSCORE_KEY = 'tetris-highscore';

const game = new Game();
let paused = false;
let lastDrop = 0;
let highscore = Number(localStorage.getItem(HIGHSCORE_KEY)) || 0;

// Pre-rendered wooden tile per piece type: base wood color, grain lines, bevel.
const tiles = {};

function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v) => Math.max(0, Math.min(255, Math.round(v + amount)));
  const r = ch(n >> 16), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `rgb(${r},${g},${b})`;
}

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function makeTile(type) {
  const size = CELL * 2; // render at 2x for sharper scaling
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const ctx = c.getContext('2d');
  const base = COLORS[type];
  const rand = seededRandom(type.charCodeAt(0) * 7919);

  ctx.fillStyle = base;
  ctx.fillRect(0, 0, size, size);

  // Grain: wavy horizontal lines in a darker tone.
  ctx.lineWidth = 1.2;
  for (let i = 0; i < 9; i++) {
    const y0 = (i + rand()) * size / 9;
    const amp = 1.5 + rand() * 3;
    const freq = 0.15 + rand() * 0.2;
    const phase = rand() * Math.PI * 2;
    ctx.strokeStyle = shade(base, -25 - rand() * 30);
    ctx.globalAlpha = 0.45 + rand() * 0.35;
    ctx.beginPath();
    for (let x = 0; x <= size; x += 2) {
      const y = y0 + Math.sin(x * freq + phase) * amp;
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  // Bevel: light top/left, dark bottom/right.
  const b = size * 0.14;
  ctx.fillStyle = shade(base, 55);
  ctx.beginPath();
  ctx.moveTo(0, 0); ctx.lineTo(size, 0); ctx.lineTo(size - b, b);
  ctx.lineTo(b, b); ctx.lineTo(b, size - b); ctx.lineTo(0, size);
  ctx.closePath();
  ctx.globalAlpha = 0.55;
  ctx.fill();
  ctx.fillStyle = shade(base, -70);
  ctx.beginPath();
  ctx.moveTo(size, size); ctx.lineTo(0, size); ctx.lineTo(b, size - b);
  ctx.lineTo(size - b, size - b); ctx.lineTo(size - b, b); ctx.lineTo(size, 0);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(0,0,0,0.6)';
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, size - 2, size - 2);
  return c;
}

// Wood surface: planks with grain, used for the board background and page.
function makeWood(width, height, base, seed, plank) {
  const c = document.createElement('canvas');
  c.width = width;
  c.height = height;
  const ctx = c.getContext('2d');
  const rand = seededRandom(seed);
  for (let px = 0; px < width; px += plank) {
    const tone = shade(base, (rand() - 0.5) * 30);
    ctx.fillStyle = tone;
    ctx.fillRect(px, 0, plank, height);
    ctx.lineWidth = 1.5;
    for (let i = 0; i < 14; i++) {
      const x0 = px + rand() * plank;
      const amp = 2 + rand() * 6;
      const freq = 0.01 + rand() * 0.02;
      const phase = rand() * Math.PI * 2;
      ctx.strokeStyle = shade(tone, -20 - rand() * 25);
      ctx.globalAlpha = 0.3 + rand() * 0.4;
      ctx.beginPath();
      for (let y = 0; y <= height; y += 4) {
        const x = x0 + Math.sin(y * freq + phase) * amp;
        y === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 2;
    ctx.strokeRect(px + 1, 1, plank - 2, height - 2);
  }
  return c;
}

const boardBg = makeWood(boardCanvas.width, boardCanvas.height, '#4a2e1b', 42, CELL * 2);
const nextBg = makeWood(nextCanvas.width, nextCanvas.height, '#4a2e1b', 43, CELL * 2);
document.body.style.backgroundImage = `url(${makeWood(512, 512, '#2e1b10', 7, 128).toDataURL()})`;

function drawCell(ctx, x, y, type, alpha = 1) {
  if (!tiles[type]) tiles[type] = makeTile(type);
  ctx.globalAlpha = alpha;
  ctx.drawImage(tiles[type], x * CELL, y * CELL, CELL, CELL);
  ctx.globalAlpha = 1;
}

function drawPiece(ctx, piece, ox, oy, alpha) {
  piece.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) drawCell(ctx, ox + c, oy + r, piece.type, alpha);
    });
  });
}

function render() {
  boardCtx.drawImage(boardBg, 0, 0);
  game.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) drawCell(boardCtx, x, y, cell);
    });
  });
  if (!game.gameOver) {
    drawPiece(boardCtx, game.piece, game.piece.x, game.ghostY(), 0.25);
    drawPiece(boardCtx, game.piece, game.piece.x, game.piece.y);
  }

  nextCtx.drawImage(nextBg, 0, 0);
  const next = spawnPiece(game.nextType);
  const w = next.shape[0].length;
  const h = next.shape.length;
  drawPiece(nextCtx, next, (4 - w) / 2, (4 - h) / 2);

  scoreEl.textContent = game.score;
  linesEl.textContent = game.lines;
  levelEl.textContent = game.level;
  if (game.score > highscore) {
    highscore = game.score;
    localStorage.setItem(HIGHSCORE_KEY, highscore);
  }
  highscoreEl.textContent = highscore;

  if (game.gameOver) showOverlay('Thua rồi!');
  else if (paused) showOverlay('Tạm dừng');
  else overlay.classList.add('hidden');
}

function showOverlay(text) {
  overlay.textContent = text;
  overlay.classList.remove('hidden');
}

function loop(time) {
  if (!paused && !game.gameOver && time - lastDrop > dropInterval(game.level)) {
    game.tick();
    lastDrop = time;
  }
  render();
  requestAnimationFrame(loop);
}

function act(action) {
  if (paused || game.gameOver) return;
  switch (action) {
    case 'left': game.tryMove(-1, 0); break;
    case 'right': game.tryMove(1, 0); break;
    case 'down': game.softDrop(); lastDrop = performance.now(); break;
    case 'rotate': game.rotate(); break;
    case 'drop': game.hardDrop(); lastDrop = performance.now(); break;
  }
}

const KEY_ACTIONS = {
  ArrowLeft: 'left', ArrowRight: 'right', ArrowDown: 'down', ArrowUp: 'rotate', ' ': 'drop',
};

document.addEventListener('keydown', (e) => {
  if (e.key === 'p' || e.key === 'P') {
    if (!game.gameOver) paused = !paused;
    return;
  }
  const action = KEY_ACTIONS[e.key];
  if (!action) return;
  e.preventDefault();
  act(action);
});

document.querySelectorAll('.controls button').forEach((btn) => {
  btn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    act(btn.dataset.action);
  });
});

document.getElementById('restart').addEventListener('click', () => {
  game.reset();
  paused = false;
  lastDrop = performance.now();
});

requestAnimationFrame(loop);
