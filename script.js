// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const finalScoreElement = document.getElementById('finalScore');
const gameOverScreen = document.getElementById('gameOverScreen');
const startScreen = document.getElementById('startScreen');
const restartBtn = document.getElementById('restartBtn');

// Audio context and variables
let audioContext;
let isAudioInitialized = false;

// Game state
let gameState = 'start'; // 'start', 'playing', 'gameOver'
let score = 0;
let animationId;

// Bird properties
const bird = {
    x: 100,
    y: canvas.height / 2,
    width: 30,
    height: 25,
    velocity: 0,
    gravity: 0.6,
    jumpPower: -12,
    color: '#FFD700'
};

// Pipe properties
const pipes = [];
const pipeWidth = 60;
const pipeGap = 150;
const pipeSpeed = 3;
let pipeTimer = 0;

// Audio functions
function initAudio() {
    if (isAudioInitialized) return;
    
    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        isAudioInitialized = true;
    } catch (error) {
        console.log('Audio not supported:', error);
    }
}

function createTone(frequency, duration, type = 'sine') {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = type;
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playJumpSound() {
    createTone(400, 0.1, 'square');
}

function playScoreSound() {
    createTone(800, 0.2, 'sine');
    setTimeout(() => createTone(1000, 0.2, 'sine'), 100);
}

function playCollisionSound() {
    // Play dramatic collision sound
    createTone(150, 0.5, 'sawtooth');
    setTimeout(() => createTone(100, 0.8, 'square'), 200);
}



// Game functions
function drawBird() {
    ctx.fillStyle = bird.color;
    ctx.fillRect(bird.x, bird.y, bird.width, bird.height);
    
    // Draw bird details (simple eye and beak)
    ctx.fillStyle = '#000';
    ctx.fillRect(bird.x + 20, bird.y + 5, 4, 4); // eye
    ctx.fillStyle = '#FF6B35';
    ctx.fillRect(bird.x + 25, bird.y + 12, 8, 3); // beak
}

function drawPipes() {
    ctx.fillStyle = '#228B22';
    pipes.forEach(pipe => {
        // Top pipe
        ctx.fillRect(pipe.x, 0, pipeWidth, pipe.topHeight);
        // Bottom pipe
        ctx.fillRect(pipe.x, pipe.topHeight + pipeGap, pipeWidth, canvas.height - pipe.topHeight - pipeGap);
        
        // Pipe caps for visual appeal
        ctx.fillStyle = '#32CD32';
        ctx.fillRect(pipe.x - 5, pipe.topHeight - 20, pipeWidth + 10, 20);
        ctx.fillRect(pipe.x - 5, pipe.topHeight + pipeGap, pipeWidth + 10, 20);
        ctx.fillStyle = '#228B22';
    });
}

function drawBackground() {
    // Sky gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(0.7, '#90EE90');
    gradient.addColorStop(1, '#228B22');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Simple clouds
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    drawCloud(150, 80);
    drawCloud(400, 120);
    drawCloud(650, 60);
}

function drawCloud(x, y) {
    ctx.beginPath();
    ctx.arc(x, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 25, y, 25, 0, Math.PI * 2);
    ctx.arc(x + 50, y, 20, 0, Math.PI * 2);
    ctx.arc(x + 25, y - 15, 15, 0, Math.PI * 2);
    ctx.fill();
}

function updateBird() {
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;
    
    // Prevent bird from going above canvas
    if (bird.y < 0) {
        bird.y = 0;
        bird.velocity = 0;
    }
    
    // Check ground collision
    if (bird.y + bird.height >= canvas.height) {
        gameOver();
    }
}

function updatePipes() {
    // Move existing pipes
    pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;
    });
    
    // Remove pipes that are off screen
    pipes.splice(0, pipes.filter(pipe => pipe.x + pipeWidth < 0).length);
    
    // Add new pipes
    pipeTimer++;
    if (pipeTimer > 120) { // Add pipe every 2 seconds at 60fps
        const topHeight = Math.random() * (canvas.height - pipeGap - 100) + 50;
        pipes.push({
            x: canvas.width,
            topHeight: topHeight,
            passed: false
        });
        pipeTimer = 0;
    }
    
    // Check for scoring
    pipes.forEach(pipe => {
        if (!pipe.passed && pipe.x + pipeWidth < bird.x) {
            pipe.passed = true;
            score++;
            scoreElement.textContent = score;
            playScoreSound();
        }
    });
}

function checkCollisions() {
    pipes.forEach(pipe => {
        // Check collision with top pipe
        if (bird.x < pipe.x + pipeWidth &&
            bird.x + bird.width > pipe.x &&
            bird.y < pipe.topHeight) {
            gameOver();
        }
        
        // Check collision with bottom pipe
        if (bird.x < pipe.x + pipeWidth &&
            bird.x + bird.width > pipe.x &&
            bird.y + bird.height > pipe.topHeight + pipeGap) {
            gameOver();
        }
    });
}

function jump() {
    if (gameState === 'start') {
        startGame();
    } else if (gameState === 'playing') {
        bird.velocity = bird.jumpPower;
        playJumpSound();
    }
}

function startGame() {
    initAudio();
    gameState = 'playing';
    startScreen.classList.add('hidden');
    gameLoop();
}

function gameOver() {
    gameState = 'gameOver';
    finalScoreElement.textContent = score;
    gameOverScreen.classList.remove('hidden');
    cancelAnimationFrame(animationId);
    playCollisionSound();
}

function resetGame() {
    gameState = 'start';
    score = 0;
    scoreElement.textContent = score;
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes.length = 0;
    pipeTimer = 0;
    gameOverScreen.classList.add('hidden');
    startScreen.classList.remove('hidden');
    
    // Draw initial state
    drawBackground();
    drawBird();
}

function gameLoop() {
    if (gameState !== 'playing') return;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw everything
    drawBackground();
    updateBird();
    updatePipes();
    checkCollisions();
    drawPipes();
    drawBird();
    
    // Continue game loop
    animationId = requestAnimationFrame(gameLoop);
}

// Event listeners
canvas.addEventListener('click', jump);
document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
        e.preventDefault();
        jump();
    }
});

restartBtn.addEventListener('click', resetGame);

// Initialize game
resetGame();
