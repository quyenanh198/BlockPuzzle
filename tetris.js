// Pure game logic, no DOM. Also loaded by tests under Node.

const COLS = 10;
const ROWS = 20;

const SHAPES = {
  I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
  O: [[1, 1], [1, 1]],
  T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
  S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
  Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
  J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
  L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
};

// Wood tones per piece: maple, pine, walnut, oak, mahogany, teak, cherry.
const COLORS = {
  I: '#d9b382', O: '#e3c48c', T: '#6b4a2e', S: '#b98a55',
  Z: '#7a3b2a', J: '#9c6b3c', L: '#a8563a',
};

const LINE_SCORES = [0, 100, 300, 500, 800];

function emptyBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function randomType(rng = Math.random) {
  const types = Object.keys(SHAPES);
  return types[Math.floor(rng() * types.length)];
}

function spawnPiece(type) {
  const shape = SHAPES[type].map(row => row.slice());
  return { type, shape, x: Math.floor((COLS - shape[0].length) / 2), y: 0 };
}

function rotate(shape) {
  const n = shape.length;
  return shape[0].map((_, c) => shape.map(row => row[c]).reverse());
}

function collides(board, piece) {
  const { shape, x, y } = piece;
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const bx = x + c;
      const by = y + r;
      if (bx < 0 || bx >= COLS || by >= ROWS) return true;
      if (by >= 0 && board[by][bx]) return true;
    }
  }
  return false;
}

function merge(board, piece) {
  const next = board.map(row => row.slice());
  piece.shape.forEach((row, r) => {
    row.forEach((cell, c) => {
      if (cell && piece.y + r >= 0) next[piece.y + r][piece.x + c] = piece.type;
    });
  });
  return next;
}

function clearLines(board) {
  const kept = board.filter(row => row.some(cell => !cell));
  const cleared = ROWS - kept.length;
  while (kept.length < ROWS) kept.unshift(Array(COLS).fill(null));
  return { board: kept, cleared };
}

function dropInterval(level) {
  return Math.max(100, 1000 - (level - 1) * 100);
}

class Game {
  constructor(rng = Math.random) {
    this.rng = rng;
    this.reset();
  }

  reset() {
    this.board = emptyBoard();
    this.score = 0;
    this.lines = 0;
    this.level = 1;
    this.gameOver = false;
    this.nextType = randomType(this.rng);
    this.spawn();
  }

  spawn() {
    this.piece = spawnPiece(this.nextType);
    this.nextType = randomType(this.rng);
    if (collides(this.board, this.piece)) this.gameOver = true;
  }

  tryMove(dx, dy) {
    if (this.gameOver) return false;
    const moved = { ...this.piece, x: this.piece.x + dx, y: this.piece.y + dy };
    if (collides(this.board, moved)) return false;
    this.piece = moved;
    return true;
  }

  rotate() {
    if (this.gameOver) return false;
    const shape = rotate(this.piece.shape);
    // Wall kick: try in place, then shift left/right by 1 and 2.
    for (const dx of [0, -1, 1, -2, 2]) {
      const rotated = { ...this.piece, shape, x: this.piece.x + dx };
      if (!collides(this.board, rotated)) {
        this.piece = rotated;
        return true;
      }
    }
    return false;
  }

  softDrop() {
    if (this.tryMove(0, 1)) {
      this.score += 1;
      return true;
    }
    this.lock();
    return false;
  }

  hardDrop() {
    if (this.gameOver) return;
    let rows = 0;
    while (this.tryMove(0, 1)) rows++;
    this.score += rows * 2;
    this.lock();
  }

  tick() {
    if (this.gameOver) return;
    if (!this.tryMove(0, 1)) this.lock();
  }

  lock() {
    const { board, cleared } = clearLines(merge(this.board, this.piece));
    this.board = board;
    this.lines += cleared;
    this.score += LINE_SCORES[cleared] * this.level;
    this.level = Math.floor(this.lines / 10) + 1;
    this.spawn();
  }

  ghostY() {
    let y = this.piece.y;
    while (!collides(this.board, { ...this.piece, y: y + 1 })) y++;
    return y;
  }
}

if (typeof module !== 'undefined') {
  module.exports = {
    COLS, ROWS, SHAPES, COLORS, Game,
    emptyBoard, spawnPiece, rotate, collides, merge, clearLines, dropInterval,
  };
}
