const test = require('node:test');
const assert = require('node:assert');
const { Game, COLS, ROWS, emptyBoard, rotate, collides, clearLines, SHAPES } = require('./tetris');

test('rotate turns T clockwise', () => {
  assert.deepStrictEqual(rotate(SHAPES.T), [[0, 1, 0], [0, 1, 1], [0, 1, 0]]);
});

test('collides at walls and floor', () => {
  const board = emptyBoard();
  const piece = { type: 'O', shape: SHAPES.O, x: 0, y: 0 };
  assert.strictEqual(collides(board, piece), false);
  assert.strictEqual(collides(board, { ...piece, x: -1 }), true);
  assert.strictEqual(collides(board, { ...piece, x: COLS - 1 }), true);
  assert.strictEqual(collides(board, { ...piece, y: ROWS - 1 }), true);
});

test('clearLines removes full rows and keeps others', () => {
  const board = emptyBoard();
  board[ROWS - 1].fill('I');
  board[ROWS - 2][0] = 'T';
  const { board: next, cleared } = clearLines(board);
  assert.strictEqual(cleared, 1);
  assert.strictEqual(next.length, ROWS);
  assert.strictEqual(next[ROWS - 1][0], 'T');
  assert.ok(next[0].every(c => c === null));
});

test('hard drop locks piece and spawns next', () => {
  const game = new Game(() => 0); // always I piece
  const first = game.piece;
  game.hardDrop();
  assert.notStrictEqual(game.piece, first);
  assert.ok(game.board[ROWS - 1].some(c => c === 'I'));
});

test('clearing a line adds score and lines', () => {
  const game = new Game(() => 0);
  for (let x = 0; x < COLS; x++) game.board[ROWS - 1][x] = 'O';
  game.board[ROWS - 1][0] = null;
  game.board[ROWS - 1][1] = null;
  game.board[ROWS - 1][2] = null;
  game.board[ROWS - 1][3] = null;
  // Vertical I fills nothing; use horizontal I at x=0 to complete the row.
  game.piece = { type: 'I', shape: SHAPES.I, x: 0, y: 0 };
  game.hardDrop();
  assert.strictEqual(game.lines, 1);
  assert.ok(game.score >= 100);
});

test('game over when spawn collides', () => {
  const game = new Game(() => 0);
  for (let y = 0; y < ROWS; y++) game.board[y].fill('O');
  game.spawn();
  assert.strictEqual(game.gameOver, true);
});
