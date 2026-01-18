import React, { useEffect, useMemo, useState } from "react";
import "./App.css";

const WIN_LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
];

function getWinnerInfo(board) {
  for (const line of WIN_LINES) {
    const [a, b, c] = line;
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return { winner: board[a], line };
    }
  }
  return { winner: null, line: null };
}

function isBoardFull(board) {
  return board.every((v) => v);
}

function availableMoves(board) {
  const moves = [];
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) moves.push(i);
  }
  return moves;
}

function scoreTerminal(winner, depth) {
  if (winner === "O") return 10 - depth;
  if (winner === "X") return depth - 10;
  return 0;
}

// Simple minimax (unbeatable) for 3x3 Tic Tac Toe
function minimax(board, isMaximizing, depth) {
  const { winner } = getWinnerInfo(board);
  if (winner) return { score: scoreTerminal(winner, depth) };
  if (isBoardFull(board)) return { score: 0 };

  const moves = availableMoves(board);

  if (isMaximizing) {
    let best = { score: -Infinity, index: moves[0] };
    for (const idx of moves) {
      const next = board.slice();
      next[idx] = "O";
      const result = minimax(next, false, depth + 1);
      if (result.score > best.score) best = { score: result.score, index: idx };
    }
    return best;
  }

  let best = { score: Infinity, index: moves[0] };
  for (const idx of moves) {
    const next = board.slice();
    next[idx] = "X";
    const result = minimax(next, true, depth + 1);
    if (result.score < best.score) best = { score: result.score, index: idx };
  }
  return best;
}

function pickBestAiMove(board) {
  const moves = availableMoves(board);
  if (moves.length === 0) return null;

  // implemented slight randomness for firt move
  const isEmpty = moves.length === 9;
  if (isEmpty) {
    const preferred = [4, 0, 2, 6, 8, 1, 3, 5, 7];
    return preferred[Math.floor(Math.random() * 3)]; 
  }

  return minimax(board, true, 0).index;
}

function Square({ value, onClick, disabled, isWinning }) {
  return (
    <button
      className={
        "square" +
        (value ? " filled" : "") +
        (isWinning ? " win" : "")
      }
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={value ? `Square ${value}` : "Empty square"}
    >
      {value}
    </button>
  );
}

export default function App() {
  const [mode, setMode] = useState(null); 
  const [board, setBoard] = useState(Array(9).fill(null));
  const [xIsNext, setXIsNext] = useState(true);

  const winnerInfo = useMemo(() => getWinnerInfo(board), [board]);
  const winner = winnerInfo.winner;
  const winningLine = winnerInfo.line;
  const winningSet = useMemo(
    () => new Set(winningLine ? winningLine : []),
    [winningLine]
  );
  const isDraw = useMemo(() => !winner && isBoardFull(board), [winner, board]);

  const status = useMemo(() => {
    if (winner) return `${winner} wins!`;
    if (isDraw) return "Draw!";
    if (!xIsNext && mode === "ai") return "AI thinking...";
    return xIsNext ? "Next: X" : "Next: O";
  }, [winner, isDraw, xIsNext, mode]);

  // Mouse-trail canvas (background)
  useEffect(() => {
    const canvas = document.getElementById("canvas");
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = 0;
    let height = 0;
    let rafId = 0;
    let particles = [];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      width = window.innerWidth;
      height = window.innerHeight;

      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);

      // reset to use CSS pixels
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    class Particle {
      constructor(x, y) {
        this.x = x;
        this.y = y;
        this.size = Math.random() * 70 + 70;
        this.vx = Math.random() * 2 - 1;
        this.vy = Math.random() * 2 - 1;
        this.life = 1;

        const hue = Math.random() > 0.5 ? 260 : 320;
        this.color = `hsla(${hue}, 100%, 70%,`;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;
        this.size *= 0.98;
        this.life -= 0.01;
      }

      draw() {
        ctx.beginPath();
        const gradient = ctx.createRadialGradient(
          this.x,
          this.y,
          0,
          this.x,
          this.y,
          this.size
        );
        gradient.addColorStop(0, this.color + this.life + ")");
        gradient.addColorStop(1, "rgba(0,0,0,0)");

        ctx.fillStyle = gradient;
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function animate() {
      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = "screen";

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.update();
        p.draw();

        if (p.life <= 0) {
          particles.splice(i, 1);
          i--;
        }
      }

      rafId = window.requestAnimationFrame(animate);
    }

    // throttling particle creation slightly (helpful for slower machines)
    let lastSpawn = 0;
    function onMove(e) {
      const now = performance.now();
      if (now - lastSpawn < 8) return;
      lastSpawn = now;

      for (let i = 0; i < 2; i++) {
        particles.push(new Particle(e.clientX, e.clientY));
      }

      // capping at 350
      if (particles.length > 350) {
        particles = particles.slice(particles.length - 350);
      }
    }

    window.addEventListener("resize", resize);
    window.addEventListener("mousemove", onMove);

    resize();
    rafId = window.requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMove);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, []);

  function resetGame({ toMenu = false } = {}) {
    setBoard(Array(9).fill(null));
    setXIsNext(true);
    if (toMenu) setMode(null);
  }

  function startMode(nextMode) {
    setMode(nextMode);
    setBoard(Array(9).fill(null));
    setXIsNext(true);
  }

  function handleSquareClick(i) {
    if (winner || isDraw) return;
    if (board[i]) return;
    if (mode === "ai" && !xIsNext) return;

    const next = board.slice();
    next[i] = xIsNext ? "X" : "O";
    setBoard(next);
    setXIsNext(!xIsNext);
  }

  function indexToCenter(i) {
    return { x: (i % 3) + 0.5, y: Math.floor(i / 3) + 0.5 };
  }

  function getLineEndpoints(line) {
    if (!line) return null;
    const a = indexToCenter(line[0]);
    const c = indexToCenter(line[2]);
    return { x1: a.x, y1: a.y, x2: c.x, y2: c.y };
  }

  useEffect(() => {
    if (mode !== "ai") return;
    if (winner || isDraw) return;
    if (xIsNext) return; 

    const move = pickBestAiMove(board);
    if (move === null || board[move]) return;

    const t = setTimeout(() => {
      setBoard((prev) => {
        if (prev[move]) return prev;
        const next = prev.slice();
        next[move] = "O";
        return next;
      });
      setXIsNext(true);
    }, 250);

    return () => clearTimeout(t);
  }, [mode, board, xIsNext, winner, isDraw]);

  if (!mode) {
    return (
      <>
        <canvas id="canvas" />
        <div className="app">
          <h1 className="title">Tic Tac Toe</h1>
          <div className="status">Choose a mode to start</div>

          <div className="modeRow">
            <button
              className="primaryBtn"
              type="button"
              onClick={() => startMode("pvp")}
            >
              2 Players
            </button>
            <button
              className="secondaryBtn"
              type="button"
              onClick={() => startMode("ai")}
            >
              Play vs AI
            </button>
          </div>
          <div className="credit">
            Created by: Muhammad Sheraz
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <canvas id="canvas" />
      <div className="app">
        <h1 className="title">Tic Tac Toe</h1>

        <div className="status">{status}</div>

        <div className="boardWrapper">
          {winningLine ? (
            <svg
              className="winLine"
              viewBox="0 0 3 3"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              {(() => {
                const pts = getLineEndpoints(winningLine);
                if (!pts) return null;
                return <line {...pts} />;
              })()}
            </svg>
          ) : null}

          <div className="board" role="grid" aria-label="Tic Tac Toe board">
            {board.map((v, i) => (
              <Square
                key={i}
                value={v}
                onClick={() => handleSquareClick(i)}
                disabled={!!winner || isDraw || (mode === "ai" && !xIsNext)}
                isWinning={winningSet.has(i)}
              />
            ))}
          </div>
        </div>

        <div className="actionsRow">
          <button
            className="secondaryBtn"
            type="button"
            onClick={() => resetGame()}
          >
            Reset
          </button>
          <button
            className="secondaryBtn"
            type="button"
            onClick={() => resetGame({ toMenu: true })}
          >
            Change Mode
          </button>
        </div>
      </div>
    </>
  );
}