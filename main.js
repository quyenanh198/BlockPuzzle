const CELL = 30;
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

function drawCell(ctx, x, y, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.fillRect(x * CELL, y * CELL, CELL, CELL);
  ctx.strokeStyle = '#000';
  ctx.strokeRect(x * CELL, y * CELL, CELL, CELL);
  ctx.globalAlpha = 1;
}

function drawPiece(ctx, piece, ox, oy, alpha) {
  piece.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell) drawCell(ctx, ox + c, oy + r, COLORS[piece.type], alpha);
    });
  });
}

function render() {
  boardCtx.clearRect(0, 0, boardCanvas.width, boardCanvas.height);
  game.board.forEach((row, y) => {
    row.forEach((cell, x) => {
      if (cell) drawCell(boardCtx, x, y, COLORS[cell]);
    });
  });
  if (!game.gameOver) {
    drawPiece(boardCtx, game.piece, game.piece.x, game.ghostY(), 0.25);
    drawPiece(boardCtx, game.piece, game.piece.x, game.piece.y);
  }

  nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
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
