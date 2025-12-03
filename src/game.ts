// ボールクラス
class Ball {
    x: number;
    y: number;
    dx: number;
    dy: number;
    radius: number;
    speed: number;

    constructor(x: number, y: number, speed: number = 4) {
        this.x = x;
        this.y = y;
        this.radius = 8;
        this.speed = speed;
        this.dx = speed * (Math.random() > 0.5 ? 1 : -1);
        this.dy = -speed;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = '#fff';
        ctx.fill();
        ctx.strokeStyle = '#0ff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }

    update(): void {
        this.x += this.dx;
        this.y += this.dy;
    }

    reset(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.dx = this.speed * (Math.random() > 0.5 ? 1 : -1);
        this.dy = -this.speed;
    }
}

// パドルクラス
class Paddle {
    x: number;
    y: number;
    width: number;
    height: number;
    speed: number;
    canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        this.width = 100;
        this.height = 15;
        this.x = canvas.width / 2 - this.width / 2;
        this.y = canvas.height - 30;
        this.speed = 7;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.width, this.height);
        const gradient = ctx.createLinearGradient(this.x, this.y, this.x, this.y + this.height);
        gradient.addColorStop(0, '#0ff');
        gradient.addColorStop(1, '#00a0ff');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.closePath();
    }

    moveLeft(): void {
        this.x -= this.speed;
        if (this.x < 0) {
            this.x = 0;
        }
    }

    moveRight(): void {
        this.x += this.speed;
        if (this.x + this.width > this.canvas.width) {
            this.x = this.canvas.width - this.width;
        }
    }

    reset(): void {
        this.x = this.canvas.width / 2 - this.width / 2;
    }
}

// ブロッククラス
class Brick {
    x: number;
    y: number;
    width: number;
    height: number;
    status: number;
    color: string;
    points: number;

    constructor(x: number, y: number, width: number, height: number, color: string, points: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
        this.status = 1; // 1 = 表示, 0 = 破壊済み
        this.color = color;
        this.points = points;
    }

    draw(ctx: CanvasRenderingContext2D): void {
        if (this.status === 1) {
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.width, this.height);
            ctx.fillStyle = this.color;
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.closePath();
        }
    }
}

// ゲームクラス
class Game {
    canvas: HTMLCanvasElement;
    ctx: CanvasRenderingContext2D;
    ball: Ball;
    paddle: Paddle;
    bricks: Brick[][];
    score: number;
    lives: number;
    isRunning: boolean;
    isPaused: boolean;
    rightPressed: boolean;
    leftPressed: boolean;
    animationId: number | null;

    brickRowCount: number = 5;
    brickColumnCount: number = 8;
    brickWidth: number = 90;
    brickHeight: number = 25;
    brickPadding: number = 5;
    brickOffsetTop: number = 50;
    brickOffsetLeft: number = 35;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;
        const context = canvas.getContext('2d');
        if (!context) {
            throw new Error('Canvas context not supported');
        }
        this.ctx = context;

        this.ball = new Ball(canvas.width / 2, canvas.height - 50);
        this.paddle = new Paddle(canvas);
        this.bricks = [];
        this.score = 0;
        this.lives = 3;
        this.isRunning = false;
        this.isPaused = false;
        this.rightPressed = false;
        this.leftPressed = false;
        this.animationId = null;

        this.initBricks();
        this.setupEventListeners();
        this.draw();
    }

    initBricks(): void {
        const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'];

        for (let c = 0; c < this.brickColumnCount; c++) {
            this.bricks[c] = [];
            for (let r = 0; r < this.brickRowCount; r++) {
                const brickX = c * (this.brickWidth + this.brickPadding) + this.brickOffsetLeft;
                const brickY = r * (this.brickHeight + this.brickPadding) + this.brickOffsetTop;
                const points = (this.brickRowCount - r) * 10;
                this.bricks[c][r] = new Brick(
                    brickX,
                    brickY,
                    this.brickWidth,
                    this.brickHeight,
                    colors[r % colors.length],
                    points
                );
            }
        }
    }

    setupEventListeners(): void {
        document.addEventListener('keydown', (e) => this.keyDownHandler(e));
        document.addEventListener('keyup', (e) => this.keyUpHandler(e));

        const restartButton = document.getElementById('restartButton');
        if (restartButton) {
            restartButton.addEventListener('click', () => this.restart());
        }

        const playAgainButton = document.getElementById('playAgainButton');
        if (playAgainButton) {
            playAgainButton.addEventListener('click', () => this.restart());
        }
    }

    keyDownHandler(e: KeyboardEvent): void {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            this.rightPressed = true;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            this.leftPressed = true;
        } else if (e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (!this.isRunning) {
                this.start();
            } else {
                this.togglePause();
            }
        }
    }

    keyUpHandler(e: KeyboardEvent): void {
        if (e.key === 'Right' || e.key === 'ArrowRight') {
            this.rightPressed = false;
        } else if (e.key === 'Left' || e.key === 'ArrowLeft') {
            this.leftPressed = false;
        }
    }

    start(): void {
        this.isRunning = true;
        this.isPaused = false;
        this.gameLoop();
    }

    togglePause(): void {
        this.isPaused = !this.isPaused;
        if (!this.isPaused) {
            this.gameLoop();
        }
    }

    restart(): void {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }

        this.score = 0;
        this.lives = 3;
        this.isRunning = false;
        this.isPaused = false;
        this.ball.reset(this.canvas.width / 2, this.canvas.height - 50);
        this.paddle.reset();
        this.initBricks();
        this.updateScore();
        this.updateLives();
        this.hideGameOver();
        this.draw();
    }

    collisionDetection(): void {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                const brick = this.bricks[c][r];
                if (brick.status === 1) {
                    if (
                        this.ball.x > brick.x &&
                        this.ball.x < brick.x + brick.width &&
                        this.ball.y > brick.y &&
                        this.ball.y < brick.y + brick.height
                    ) {
                        this.ball.dy = -this.ball.dy;
                        brick.status = 0;
                        this.score += brick.points;
                        this.updateScore();

                        // 全ブロック破壊チェック
                        if (this.isAllBricksDestroyed()) {
                            this.win();
                        }
                    }
                }
            }
        }
    }

    isAllBricksDestroyed(): boolean {
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                if (this.bricks[c][r].status === 1) {
                    return false;
                }
            }
        }
        return true;
    }

    win(): void {
        this.isRunning = false;
        this.showGameOver('クリア！おめでとうございます！');
    }

    draw(): void {
        // 背景をクリア
        this.ctx.fillStyle = '#000';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // 星空エフェクト
        this.ctx.fillStyle = '#fff';
        for (let i = 0; i < 50; i++) {
            const x = Math.random() * this.canvas.width;
            const y = Math.random() * this.canvas.height;
            this.ctx.fillRect(x, y, 1, 1);
        }

        // ブロックを描画
        for (let c = 0; c < this.brickColumnCount; c++) {
            for (let r = 0; r < this.brickRowCount; r++) {
                this.bricks[c][r].draw(this.ctx);
            }
        }

        // ボールとパドルを描画
        this.ball.draw(this.ctx);
        this.paddle.draw(this.ctx);

        // 一時停止メッセージ
        if (this.isPaused) {
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            this.ctx.font = '48px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText('一時停止', this.canvas.width / 2, this.canvas.height / 2);
        }
    }

    gameLoop(): void {
        if (!this.isRunning || this.isPaused) {
            return;
        }

        this.draw();

        // パドルの移動
        if (this.rightPressed) {
            this.paddle.moveRight();
        } else if (this.leftPressed) {
            this.paddle.moveLeft();
        }

        // ボールの更新
        this.ball.update();

        // 壁との衝突判定
        if (this.ball.x + this.ball.dx > this.canvas.width - this.ball.radius ||
            this.ball.x + this.ball.dx < this.ball.radius) {
            this.ball.dx = -this.ball.dx;
        }

        if (this.ball.y + this.ball.dy < this.ball.radius) {
            this.ball.dy = -this.ball.dy;
        } else if (this.ball.y + this.ball.dy > this.canvas.height - this.ball.radius) {
            // パドルとの衝突判定
            if (this.ball.x > this.paddle.x && this.ball.x < this.paddle.x + this.paddle.width) {
                // パドルのどこに当たったかで反射角度を変える
                const hitPos = (this.ball.x - this.paddle.x) / this.paddle.width;
                this.ball.dx = this.ball.speed * (hitPos * 2 - 1) * 1.5;
                this.ball.dy = -this.ball.dy;
            } else {
                // ボールを落とした
                this.lives--;
                this.updateLives();

                if (this.lives === 0) {
                    this.gameOver();
                } else {
                    this.ball.reset(this.canvas.width / 2, this.canvas.height - 50);
                    this.paddle.reset();
                }
            }
        }

        // ブロックとの衝突判定
        this.collisionDetection();

        this.animationId = requestAnimationFrame(() => this.gameLoop());
    }

    gameOver(): void {
        this.isRunning = false;
        this.showGameOver('ゲームオーバー');
    }

    showGameOver(message: string): void {
        const gameOverDiv = document.getElementById('gameOver');
        const finalScoreSpan = document.getElementById('finalScore');
        const gameOverTitle = gameOverDiv?.querySelector('h2');

        if (gameOverDiv && finalScoreSpan) {
            if (gameOverTitle) {
                gameOverTitle.textContent = message;
            }
            finalScoreSpan.textContent = this.score.toString();
            gameOverDiv.classList.remove('hidden');
        }
    }

    hideGameOver(): void {
        const gameOverDiv = document.getElementById('gameOver');
        if (gameOverDiv) {
            gameOverDiv.classList.add('hidden');
        }
    }

    updateScore(): void {
        const scoreSpan = document.getElementById('score');
        if (scoreSpan) {
            scoreSpan.textContent = this.score.toString();
        }
    }

    updateLives(): void {
        const livesSpan = document.getElementById('lives');
        if (livesSpan) {
            livesSpan.textContent = this.lives.toString();
        }
    }
}

// ゲーム初期化
window.addEventListener('DOMContentLoaded', () => {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (canvas) {
        new Game(canvas);
    } else {
        console.error('Canvas element not found');
    }
});
