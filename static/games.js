/**
 * NOVA AI — Interactive Gaming Arcade Hub
 * Includes:
 * 1. Cyber Snake Arcade (Canvas 60FPS with D-pad & keyboard)
 * 2. Nova AI Tic-Tac-Toe (Smart AI with adaptive difficulty)
 * 3. Nova AI Trivia Challenge (Instant quiz with streaks)
 * 4. Cosmic Asteroid Dodge (Retro arcade space shooter)
 * 5. Web Audio Synthesized Retro Sound Effects
 */

// --- Retro Web Audio Synthesizer ---
const ArcadeAudio = {
    ctx: null,
    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            if (AudioCtx) this.ctx = new AudioCtx();
        }
        if (this.ctx && this.ctx.state === "suspended") {
            this.ctx.resume();
        }
    },
    playTone(freq, type = "sine", duration = 0.1, gainVal = 0.1) {
        try {
            this.init();
            if (!this.ctx) return;
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = type;
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
            gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            osc.start();
            osc.stop(this.ctx.currentTime + duration);
        } catch (_) {}
    },
    eat() { this.playTone(587.33, "square", 0.08, 0.08); },
    move() { this.playTone(220, "sine", 0.03, 0.02); },
    hit() { this.playTone(110, "sawtooth", 0.25, 0.15); },
    win() {
        this.playTone(523.25, "triangle", 0.1, 0.1);
        setTimeout(() => this.playTone(659.25, "triangle", 0.1, 0.1), 100);
        setTimeout(() => this.playTone(783.99, "triangle", 0.2, 0.12), 200);
    },
    shoot() { this.playTone(880, "square", 0.06, 0.06); }
};

// =========================================================================
// 1. CYBER SNAKE GAME ENGINE
// =========================================================================
class CyberSnakeGame {
    constructor(canvas, scoreEl, highScoreEl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.scoreEl = scoreEl;
        this.highScoreEl = highScoreEl;
        this.gridSize = 20;
        this.tileCount = 20; // 400x400
        this.highScore = parseInt(localStorage.getItem("novaSnakeHighScore") || "0");
        if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;
        this.reset();
    }

    reset() {
        this.snake = [
            { x: 10, y: 10 },
            { x: 10, y: 11 },
            { x: 10, y: 12 }
        ];
        this.dx = 0;
        this.dy = -1;
        this.score = 0;
        this.speed = 100;
        this.gameOver = false;
        this.paused = false;
        this.spawnFood();
        if (this.scoreEl) this.scoreEl.textContent = this.score;
        if (this.loopId) clearInterval(this.loopId);
        this.loopId = setInterval(() => this.tick(), this.speed);
        this.draw();
    }

    spawnFood() {
        while (true) {
            this.food = {
                x: Math.floor(Math.random() * this.tileCount),
                y: Math.floor(Math.random() * this.tileCount)
            };
            if (!this.snake.some(s => s.x === this.food.x && s.y === this.food.y)) break;
        }
    }

    changeDir(dx, dy) {
        if (this.gameOver) { this.reset(); return; }
        if (this.dx === -dx && dx !== 0) return;
        if (this.dy === -dy && dy !== 0) return;
        this.dx = dx;
        this.dy = dy;
        ArcadeAudio.move();
    }

    tick() {
        if (this.gameOver || this.paused) return;
        if (this.dx === 0 && this.dy === 0) return;

        const head = { x: this.snake[0].x + this.dx, y: this.snake[0].y + this.dy };

        // Wall collision (wrap-around or wall bounce)
        if (head.x < 0 || head.x >= this.tileCount || head.y < 0 || head.y >= this.tileCount) {
            this.triggerGameOver();
            return;
        }

        // Tail collision
        if (this.snake.some(s => s.x === head.x && s.y === head.y)) {
            this.triggerGameOver();
            return;
        }

        this.snake.unshift(head);

        // Food eaten
        if (head.x === this.food.x && head.y === this.food.y) {
            this.score += 10;
            ArcadeAudio.eat();
            if (this.scoreEl) this.scoreEl.textContent = this.score;
            if (this.score > this.highScore) {
                this.highScore = this.score;
                localStorage.setItem("novaSnakeHighScore", this.highScore);
                if (this.highScoreEl) this.highScoreEl.textContent = this.highScore;
            }
            this.spawnFood();
            // Speed up slightly
            if (this.speed > 60 && this.score % 50 === 0) {
                this.speed -= 5;
                clearInterval(this.loopId);
                this.loopId = setInterval(() => this.tick(), this.speed);
            }
        } else {
            this.snake.pop();
        }

        this.draw();
    }

    triggerGameOver() {
        this.gameOver = true;
        ArcadeAudio.hit();
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        const s = this.gridSize;

        // Dark cyber grid background
        ctx.fillStyle = "#030712";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Grid lines
        ctx.strokeStyle = "rgba(15, 23, 42, 0.6)";
        ctx.lineWidth = 0.5;
        for (let i = 0; i < this.canvas.width; i += s) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, this.canvas.height);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(0, i);
            ctx.lineTo(this.canvas.width, i);
            ctx.stroke();
        }

        // Draw Food (Neon Pink Pulsing Orb)
        ctx.fillStyle = "#ec4899";
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(this.food.x * s + s / 2, this.food.y * s + s / 2, s / 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw Snake (Glowing Cyan gradient)
        this.snake.forEach((seg, idx) => {
            const isHead = idx === 0;
            ctx.fillStyle = isHead ? "#22d3ee" : "#06b6d4";
            if (isHead) {
                ctx.shadowColor = "#06b6d4";
                ctx.shadowBlur = 10;
            }
            ctx.beginPath();
            ctx.roundRect(seg.x * s + 1, seg.y * s + 1, s - 2, s - 2, isHead ? 6 : 4);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Eyes on head
            if (isHead) {
                ctx.fillStyle = "#ffffff";
                ctx.beginPath();
                ctx.arc(seg.x * s + s / 3, seg.y * s + s / 3, 2, 0, Math.PI * 2);
                ctx.arc(seg.x * s + (s * 2) / 3, seg.y * s + s / 3, 2, 0, Math.PI * 2);
                ctx.fill();
            }
        });

        // Game Over Overlay
        if (this.gameOver) {
            ctx.fillStyle = "rgba(3, 7, 18, 0.85)";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.fillStyle = "#ef4444";
            ctx.font = "bold 20px monospace";
            ctx.textAlign = "center";
            ctx.fillText("SYSTEM CRASH", this.canvas.width / 2, this.canvas.height / 2 - 15);

            ctx.fillStyle = "#e2e8f0";
            ctx.font = "12px sans-serif";
            ctx.fillText(`Final Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);

            ctx.fillStyle = "#22d3ee";
            ctx.font = "11px monospace";
            ctx.fillText("PRESS ANY KEY OR TAP TO RESTART", this.canvas.width / 2, this.canvas.height / 2 + 35);
        }
    }

    destroy() {
        if (this.loopId) clearInterval(this.loopId);
    }
}

// =========================================================================
// 2. NOVA AI TIC-TAC-TOE ENGINE
// =========================================================================
class TicTacToeGame {
    constructor(containerEl, statusEl, scoreEl) {
        this.container = containerEl;
        this.statusEl = statusEl;
        this.scoreEl = scoreEl;
        this.board = Array(9).fill(null);
        this.human = "X";
        this.ai = "O";
        this.turn = "X";
        this.gameOver = false;
        this.wins = { player: 0, ai: 0, draws: 0 };
        this.render();
    }

    reset() {
        this.board = Array(9).fill(null);
        this.turn = "X";
        this.gameOver = false;
        this.render();
        this.updateStatus("Your turn! Place your X.");
    }

    makeMove(idx) {
        if (this.gameOver || this.board[idx] || this.turn !== this.human) return;

        this.board[idx] = this.human;
        ArcadeAudio.move();
        this.render();

        const winner = this.checkWinner(this.board);
        if (winner) {
            this.handleEnd(winner);
            return;
        }

        this.turn = this.ai;
        this.updateStatus("Nova AI is thinking...");

        setTimeout(() => {
            const aiIdx = this.getBestMove();
            if (aiIdx !== null && aiIdx !== undefined) {
                this.board[aiIdx] = this.ai;
                ArcadeAudio.move();
                this.render();

                const aiWin = this.checkWinner(this.board);
                if (aiWin) {
                    this.handleEnd(aiWin);
                    return;
                }
            }
            this.turn = this.human;
            this.updateStatus("Your turn! Place your X.");
        }, 400);
    }

    getBestMove() {
        const available = this.board.map((v, i) => v === null ? i : null).filter(v => v !== null);
        if (available.length === 0) return null;

        // 1. Can AI win immediately?
        for (const idx of available) {
            const copy = [...this.board];
            copy[idx] = this.ai;
            if (this.checkWinner(copy) === this.ai) return idx;
        }

        // 2. Can player win immediately? Block them!
        for (const idx of available) {
            const copy = [...this.board];
            copy[idx] = this.human;
            if (this.checkWinner(copy) === this.human) return idx;
        }

        // 3. Take center if available
        if (this.board[4] === null) return 4;

        // 4. Take corners
        const corners = [0, 2, 6, 8].filter(c => available.includes(c));
        if (corners.length > 0) return corners[Math.floor(Math.random() * corners.length)];

        // 5. Random available
        return available[Math.floor(Math.random() * available.length)];
    }

    checkWinner(b) {
        const lines = [
            [0, 1, 2], [3, 4, 5], [6, 7, 8],
            [0, 3, 6], [1, 4, 7], [2, 5, 8],
            [0, 4, 8], [2, 4, 6]
        ];
        for (const [x, y, z] of lines) {
            if (b[x] && b[x] === b[y] && b[x] === b[z]) return b[x];
        }
        if (b.every(v => v !== null)) return "draw";
        return null;
    }

    handleEnd(result) {
        this.gameOver = true;
        if (result === this.human) {
            this.wins.player++;
            ArcadeAudio.win();
            this.updateStatus("🎉 You won against Nova AI!");
        } else if (result === this.ai) {
            this.wins.ai++;
            ArcadeAudio.hit();
            this.updateStatus("🤖 Nova AI won! Try again.");
        } else {
            this.wins.draws++;
            ArcadeAudio.move();
            this.updateStatus("🤝 It's a draw!");
        }
        this.updateScores();
    }

    updateStatus(msg) {
        if (this.statusEl) this.statusEl.textContent = msg;
    }

    updateScores() {
        if (this.scoreEl) {
            this.scoreEl.innerHTML = `
                <span class="text-cyan-400 font-bold">You: ${this.wins.player}</span> • 
                <span class="text-pink-400 font-bold">Nova: ${this.wins.ai}</span> • 
                <span class="text-slate-400">Draws: ${this.wins.draws}</span>
            `;
        }
    }

    render() {
        if (!this.container) return;
        this.container.innerHTML = `
            <div class="grid grid-cols-3 gap-2 w-64 h-64 mx-auto p-2 bg-slate-950 rounded-2xl border border-cyan-500/30 shadow-xl">
                ${this.board.map((val, idx) => `
                    <button onclick="window.activeTicTacToe.makeMove(${idx})" class="w-full h-full rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-2xl font-black flex items-center justify-center transition ${val === 'X' ? 'text-cyan-400 shadow-sm shadow-cyan-500/20' : (val === 'O' ? 'text-pink-400 shadow-sm shadow-pink-500/20' : 'text-slate-600')}">
                        ${val || ''}
                    </button>
                `).join('')}
            </div>
        `;
    }
}

// =========================================================================
// 3. TRIVIA QUIZ ENGINE
// =========================================================================
class TriviaGame {
    constructor(containerEl) {
        this.container = containerEl;
        this.streak = 0;
        this.score = 0;
        this.currentQ = null;
        this.answered = false;
        this.loadNext();
    }

    async loadNext() {
        this.answered = false;
        this.container.innerHTML = `<div class="py-12 text-center text-xs text-slate-400 animate-pulse">Loading next challenge question...</div>`;
        try {
            const res = await fetch("/api/games/trivia");
            this.currentQ = await res.json();
            this.render();
        } catch (e) {
            this.container.innerHTML = `<div class="py-8 text-center text-xs text-red-400">Could not fetch trivia question.</div>`;
        }
    }

    selectAnswer(idx) {
        if (this.answered || !this.currentQ) return;
        this.answered = true;
        const isCorrect = idx === this.currentQ.correct;

        if (isCorrect) {
            this.streak++;
            this.score += 100 * this.streak;
            ArcadeAudio.win();
        } else {
            this.streak = 0;
            ArcadeAudio.hit();
        }

        const buttons = this.container.querySelectorAll(".trivia-btn");
        buttons.forEach((btn, i) => {
            if (i === this.currentQ.correct) {
                btn.className = "trivia-btn w-full p-2.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs border border-emerald-400 shadow-md text-left";
            } else if (i === idx && !isCorrect) {
                btn.className = "trivia-btn w-full p-2.5 rounded-xl bg-red-600 text-white font-semibold text-xs border border-red-400 text-left";
            } else {
                btn.className = "trivia-btn w-full p-2.5 rounded-xl bg-slate-900/60 text-slate-400 text-xs border border-slate-800 text-left opacity-50";
            }
        });

        const feedbackEl = document.getElementById("triviaFeedback");
        if (feedbackEl) {
            feedbackEl.innerHTML = `
                <div class="p-3 rounded-xl ${isCorrect ? 'bg-emerald-950/80 border-emerald-700/60 text-emerald-200' : 'bg-red-950/80 border-red-700/60 text-red-200'} border text-xs space-y-1">
                    <p class="font-bold">${isCorrect ? '✨ Correct! +100 Points' : '❌ Incorrect'}</p>
                    <p class="text-[11px] text-slate-300">${this.currentQ.explanation}</p>
                </div>
            `;
        }

        const nextBtn = document.getElementById("triviaNextBtn");
        if (nextBtn) nextBtn.classList.remove("hidden");
    }

    render() {
        const q = this.currentQ;
        this.container.innerHTML = `
            <div class="space-y-3.5 max-w-md mx-auto">
                <div class="flex items-center justify-between text-xs">
                    <span class="px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800 font-mono text-[10px] font-bold">
                        ${q.category || 'General'}
                    </span>
                    <div class="flex items-center space-x-2 font-mono text-[11px]">
                        <span class="text-amber-400 font-bold">🔥 Streak: ${this.streak}</span>
                        <span class="text-emerald-400 font-bold">Score: ${this.score}</span>
                    </div>
                </div>

                <div class="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-slate-200 font-semibold text-sm">
                    ${q.question}
                </div>

                <div class="space-y-2">
                    ${q.options.map((opt, idx) => `
                        <button onclick="window.activeTrivia.selectAnswer(${idx})" class="trivia-btn w-full p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs border border-slate-800 hover:border-slate-700 transition text-left flex items-center space-x-2">
                            <span class="w-5 h-5 rounded-lg bg-slate-800 text-slate-400 flex items-center justify-center font-mono font-bold text-[10px] shrink-0">
                                ${['A', 'B', 'C', 'D'][idx]}
                            </span>
                            <span class="truncate">${opt}</span>
                        </button>
                    `).join('')}
                </div>

                <div id="triviaFeedback"></div>

                <button id="triviaNextBtn" onclick="window.activeTrivia.loadNext()" class="hidden w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg transition">
                    Next Question &rarr;
                </button>
            </div>
        `;
    }
}

// =========================================================================
// 4. COSMIC ASTEROID DODGE ENGINE
// =========================================================================
class SpaceDodgeGame {
    constructor(canvas, scoreEl) {
        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");
        this.scoreEl = scoreEl;
        this.reset();
    }

    reset() {
        this.player = { x: this.canvas.width / 2 - 12, y: this.canvas.height - 40, w: 24, h: 24, speed: 7 };
        this.asteroids = [];
        this.lasers = [];
        this.keys = {};
        this.score = 0;
        this.gameOver = false;
        this.tickCount = 0;

        if (this.loopId) cancelAnimationFrame(this.loopId);
        this.setupKeys();
        this.loop();
    }

    setupKeys() {
        this.keyHandler = (e) => {
            if (["ArrowLeft", "ArrowRight", "Space", " "].includes(e.code)) e.preventDefault();
            this.keys[e.code] = (e.type === "keydown");
            if (e.type === "keydown" && (e.code === "Space" || e.code === "KeyZ")) {
                this.fireLaser();
            }
            if (this.gameOver && e.type === "keydown") {
                this.reset();
            }
        };
        window.addEventListener("keydown", this.keyHandler);
        window.addEventListener("keyup", this.keyHandler);
    }

    fireLaser() {
        if (this.gameOver) return;
        this.lasers.push({ x: this.player.x + this.player.w / 2 - 2, y: this.player.y, w: 4, h: 10 });
        ArcadeAudio.shoot();
    }

    movePlayer(dir) {
        if (dir === "left") this.player.x = Math.max(10, this.player.x - 20);
        if (dir === "right") this.player.x = Math.min(this.canvas.width - this.player.w - 10, this.player.x + 20);
        ArcadeAudio.move();
    }

    loop() {
        this.update();
        this.draw();
        if (!this.gameOver) {
            this.loopId = requestAnimationFrame(() => this.loop());
        }
    }

    update() {
        this.tickCount++;

        // Keyboard steering
        if (this.keys["ArrowLeft"] || this.keys["KeyA"]) {
            this.player.x = Math.max(10, this.player.x - this.player.speed);
        }
        if (this.keys["ArrowRight"] || this.keys["KeyD"]) {
            this.player.x = Math.min(this.canvas.width - this.player.w - 10, this.player.x + this.player.speed);
        }

        // Move lasers
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            this.lasers[i].y -= 9;
            if (this.lasers[i].y < -10) this.lasers.splice(i, 1);
        }

        // Spawn asteroids
        if (this.tickCount % 35 === 0) {
            const size = 18 + Math.random() * 22;
            this.asteroids.push({
                x: Math.random() * (this.canvas.width - size),
                y: -size,
                w: size,
                h: size,
                speed: 2.5 + Math.random() * 2.5
            });
        }

        // Move asteroids & check collisions
        for (let aIdx = this.asteroids.length - 1; aIdx >= 0; aIdx--) {
            const ast = this.asteroids[aIdx];
            ast.y += ast.speed;

            // Check collision with player
            if (
                ast.x < this.player.x + this.player.w &&
                ast.x + ast.w > this.player.x &&
                ast.y < this.player.y + this.player.h &&
                ast.y + ast.h > this.player.y
            ) {
                this.gameOver = true;
                ArcadeAudio.hit();
                this.draw();
                return;
            }

            // Check collision with lasers
            for (let lIdx = this.lasers.length - 1; lIdx >= 0; lIdx--) {
                const laser = this.lasers[lIdx];
                if (
                    laser.x < ast.x + ast.w &&
                    laser.x + laser.w > ast.x &&
                    laser.y < ast.y + ast.h &&
                    laser.y + laser.h > ast.y
                ) {
                    this.asteroids.splice(aIdx, 1);
                    this.lasers.splice(lIdx, 1);
                    this.score += 25;
                    ArcadeAudio.eat();
                    if (this.scoreEl) this.scoreEl.textContent = this.score;
                    break;
                }
            }

            if (ast.y > this.canvas.height + 30) {
                this.asteroids.splice(aIdx, 1);
                this.score += 5;
                if (this.scoreEl) this.scoreEl.textContent = this.score;
            }
        }
    }

    draw() {
        const ctx = this.ctx;

        // Space background
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Stars
        ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
        for (let i = 0; i < 20; i++) {
            const sx = (i * 37 + this.tickCount) % this.canvas.width;
            const sy = (i * 53 + this.tickCount * 2) % this.canvas.height;
            ctx.fillRect(sx, sy, 1.5, 1.5);
        }

        // Draw Player Ship (Cyan triangular fighter)
        ctx.fillStyle = "#38bdf8";
        ctx.shadowColor = "#38bdf8";
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.moveTo(this.player.x + this.player.w / 2, this.player.y);
        ctx.lineTo(this.player.x, this.player.y + this.player.h);
        ctx.lineTo(this.player.x + this.player.w, this.player.y + this.player.h);
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Engine glow
        ctx.fillStyle = "#f59e0b";
        ctx.beginPath();
        ctx.arc(this.player.x + this.player.w / 2, this.player.y + this.player.h + 2, 4, 0, Math.PI * 2);
        ctx.fill();

        // Draw Lasers
        ctx.fillStyle = "#22c55e";
        ctx.shadowColor = "#22c55e";
        ctx.shadowBlur = 8;
        this.lasers.forEach(l => {
            ctx.fillRect(l.x, l.y, l.w, l.h);
        });
        ctx.shadowBlur = 0;

        // Draw Asteroids
        ctx.fillStyle = "#94a3b8";
        this.asteroids.forEach(a => {
            ctx.beginPath();
            ctx.arc(a.x + a.w / 2, a.y + a.h / 2, a.w / 2, 0, Math.PI * 2);
            ctx.fill();
        });

        // Game Over Screen
        if (this.gameOver) {
            ctx.fillStyle = "rgba(2, 6, 23, 0.85)";
            ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

            ctx.fillStyle = "#f43f5e";
            ctx.font = "bold 22px monospace";
            ctx.textAlign = "center";
            ctx.fillText("HULL DESTROYED", this.canvas.width / 2, this.canvas.height / 2 - 15);

            ctx.fillStyle = "#e2e8f0";
            ctx.font = "12px sans-serif";
            ctx.fillText(`Score: ${this.score}`, this.canvas.width / 2, this.canvas.height / 2 + 10);

            ctx.fillStyle = "#38bdf8";
            ctx.font = "11px monospace";
            ctx.fillText("PRESS ANY KEY OR TAP TO RESTART", this.canvas.width / 2, this.canvas.height / 2 + 35);
        }
    }

    destroy() {
        if (this.loopId) cancelAnimationFrame(this.loopId);
        if (this.keyHandler) {
            window.removeEventListener("keydown", this.keyHandler);
            window.removeEventListener("keyup", this.keyHandler);
        }
    }
}

// =========================================================================
// 5. NOVA ARCADE MASTER MODAL & LAUNCHER
// =========================================================================
let currentActiveArcadeGame = null;

window.openGameArcadeModal = function(initialGameId = "snake") {
    const defaultGame = initialGameId || "snake";

    openModal(
        "🎮 Nova Gaming Arcade Hub",
        "",
        `
        <div class="space-y-4">
            <!-- Arcade Game Tabs -->
            <div class="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                <button onclick="switchArcadeGame('snake')" id="tabBtnSnake" class="px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center space-x-1">
                    <span>🐍 Cyber Snake</span>
                </button>
                <button onclick="switchArcadeGame('tictactoe')" id="tabBtnTtt" class="px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center space-x-1">
                    <span>❌⭕ Tic-Tac-Toe</span>
                </button>
                <button onclick="switchArcadeGame('trivia')" id="tabBtnTrivia" class="px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center space-x-1">
                    <span>🧠 Trivia Quiz</span>
                </button>
                <button onclick="switchArcadeGame('space')" id="tabBtnSpace" class="px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center space-x-1">
                    <span>🚀 Space Dodge</span>
                </button>
            </div>

            <!-- Game View Container -->
            <div id="arcadeGameMount" class="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 flex flex-col items-center justify-center min-h-[360px]">
                <!-- Dynamically loaded game -->
            </div>
        </div>
        `
    );

    setTimeout(() => {
        switchArcadeGame(defaultGame);
    }, 50);
};

window.switchArcadeGame = function(gameId) {
    const mount = document.getElementById("arcadeGameMount");
    if (!mount) return;

    // Cleanup previous game
    if (currentActiveArcadeGame && typeof currentActiveArcadeGame.destroy === "function") {
        currentActiveArcadeGame.destroy();
    }

    // Update tab styling
    ["snake", "tictactoe", "trivia", "space"].forEach(g => {
        const btn = document.getElementById(g === "tictactoe" ? "tabBtnTtt" : `tabBtn${g.charAt(0).toUpperCase() + g.slice(1)}`);
        if (btn) {
            if (g === gameId) {
                btn.className = "px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center space-x-1 bg-cyan-600 text-white shadow-md shadow-cyan-600/30";
            } else {
                btn.className = "px-3 py-1.5 rounded-xl font-semibold transition shrink-0 flex items-center space-x-1 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800";
            }
        }
    });

    if (gameId === "snake") {
        mount.innerHTML = `
            <div class="space-y-3 flex flex-col items-center">
                <div class="flex items-center justify-between w-full max-w-[360px] text-xs px-1">
                    <span class="text-cyan-400 font-bold font-mono">Score: <span id="snakeScore">0</span></span>
                    <span class="text-pink-400 font-bold font-mono">Best: <span id="snakeHighScore">0</span></span>
                    <button onclick="window.activeSnake.reset()" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]">Restart</button>
                </div>
                <canvas id="snakeCanvas" width="360" height="360" class="rounded-2xl border border-cyan-500/30 shadow-2xl bg-black cursor-pointer"></canvas>
                <!-- D-pad Controls -->
                <div class="flex flex-col items-center space-y-1 pt-1">
                    <button onclick="window.activeSnake.changeDir(0, -1)" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-cyan-600 text-white flex items-center justify-center font-bold">▲</button>
                    <div class="flex space-x-2">
                        <button onclick="window.activeSnake.changeDir(-1, 0)" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-cyan-600 text-white flex items-center justify-center font-bold">◀</button>
                        <button onclick="window.activeSnake.changeDir(0, 1)" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-cyan-600 text-white flex items-center justify-center font-bold">▼</button>
                        <button onclick="window.activeSnake.changeDir(1, 0)" class="w-10 h-10 rounded-xl bg-slate-800 hover:bg-cyan-600 text-white flex items-center justify-center font-bold">▶</button>
                    </div>
                </div>
            </div>
        `;
        const canvas = document.getElementById("snakeCanvas");
        const scoreEl = document.getElementById("snakeScore");
        const highEl = document.getElementById("snakeHighScore");
        window.activeSnake = new CyberSnakeGame(canvas, scoreEl, highEl);
        currentActiveArcadeGame = window.activeSnake;

        const snakeKeyHandler = (e) => {
            if (["ArrowUp", "KeyW"].includes(e.code)) window.activeSnake.changeDir(0, -1);
            if (["ArrowDown", "KeyS"].includes(e.code)) window.activeSnake.changeDir(0, 1);
            if (["ArrowLeft", "KeyA"].includes(e.code)) window.activeSnake.changeDir(-1, 0);
            if (["ArrowRight", "KeyD"].includes(e.code)) window.activeSnake.changeDir(1, 0);
        };
        window.removeEventListener("keydown", window._snakeKeyHandler);
        window._snakeKeyHandler = snakeKeyHandler;
        window.addEventListener("keydown", window._snakeKeyHandler);
    }
    else if (gameId === "tictactoe") {
        mount.innerHTML = `
            <div class="space-y-4 flex flex-col items-center">
                <div class="text-center space-y-1">
                    <h4 id="tttStatus" class="font-bold text-slate-200 text-xs">Your turn! Place your X.</h4>
                    <div id="tttScore" class="text-xs font-mono"></div>
                </div>
                <div id="tttBoardContainer"></div>
                <button onclick="window.activeTicTacToe.reset()" class="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold">
                    New Round
                </button>
            </div>
        `;
        const board = document.getElementById("tttBoardContainer");
        const status = document.getElementById("tttStatus");
        const score = document.getElementById("tttScore");
        window.activeTicTacToe = new TicTacToeGame(board, status, score);
        currentActiveArcadeGame = window.activeTicTacToe;
    }
    else if (gameId === "trivia") {
        mount.innerHTML = `<div id="triviaMount" class="w-full"></div>`;
        const triviaMount = document.getElementById("triviaMount");
        window.activeTrivia = new TriviaGame(triviaMount);
        currentActiveArcadeGame = window.activeTrivia;
    }
    else if (gameId === "space") {
        mount.innerHTML = `
            <div class="space-y-3 flex flex-col items-center">
                <div class="flex items-center justify-between w-full max-w-[360px] text-xs px-1">
                    <span class="text-sky-400 font-bold font-mono">Score: <span id="spaceScore">0</span></span>
                    <button onclick="window.activeSpace.reset()" class="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]">Restart</button>
                </div>
                <canvas id="spaceCanvas" width="360" height="340" class="rounded-2xl border border-sky-500/30 shadow-2xl bg-black"></canvas>
                <div class="flex items-center space-x-3 pt-1">
                    <button onclick="window.activeSpace.movePlayer('left')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-sky-600 text-white font-bold text-xs">◀ Left</button>
                    <button onclick="window.activeSpace.fireLaser()" class="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md">🔥 Fire</button>
                    <button onclick="window.activeSpace.movePlayer('right')" class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-sky-600 text-white font-bold text-xs">Right ▶</button>
                </div>
            </div>
        `;
        const canvas = document.getElementById("spaceCanvas");
        const scoreEl = document.getElementById("spaceScore");
        window.activeSpace = new SpaceDodgeGame(canvas, scoreEl);
        currentActiveArcadeGame = window.activeSpace;
    }
};

