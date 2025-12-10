// Get the canvas and its drawing context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 600;
canvas.height = 400;

// Game variables
let gold = 0;
let height = 0;
let gameOver = false;

// Camera offset (now tracks X and Y!)
let cameraX = 0;
let cameraY = 0;

// Player object
const player = {
    x: 250,
    y: 300,
    size: 30,
    currentStairIndex: 0,
    facingRight: true,
    isJumping: false,
    jumpProgress: 0
};

// Stairs array
const stairs = [];

// Stair settings
const STAIR_WIDTH = 80;   // Keep width good
const STAIR_HEIGHT = 20;   // MUCH flatter - looks like a real step!
const STAIR_SPACING_Y = 70;
const STAIR_SPACING_X = 100;  // Clear left/right positioning

// Track keyboard
const keysPressed = {};

document.addEventListener('keydown', (e) => {
    if (keysPressed[e.key] || gameOver) return;
    keysPressed[e.key] = true;
    
    if (e.key === ' ') {
        tryMoveForward();
    } else if (e.key === 'ArrowRight') {
        tryTurn();
    }
});

document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

// Create a stair
function createStair(x, y, nextDirection) {
    return {
        x: x,
        y: y,
        width: STAIR_WIDTH,
        height: STAIR_HEIGHT,
        nextDirection: nextDirection
    };
}

// Initialize stairs with winding path
function initStairs() {
    let currentX = 300;
    let currentY = 350;
    let currentDirection = 'right';  // Start going right
    let stepsInDirection = 0;
    let maxStepsBeforeChange = 3 + Math.floor(Math.random() * 3);  // 3-5 steps
    
    // First stair
    stairs.push(createStair(currentX, currentY, currentDirection));
    currentY -= STAIR_SPACING_Y;
    
    // Generate initial path
    for (let i = 0; i < 30; i++) {
        stepsInDirection++;
        
        // Move in current direction
        if (currentDirection === 'right') {
            currentX += STAIR_SPACING_X;
        } else {
            currentX -= STAIR_SPACING_X;
        }
        
        // Should we change direction?
        if (stepsInDirection >= maxStepsBeforeChange) {
            // Switch direction
            currentDirection = currentDirection === 'right' ? 'left' : 'right';
            stepsInDirection = 0;
            maxStepsBeforeChange = 3 + Math.floor(Math.random() * 3);
        }
        
        // Update previous stair's direction
        stairs[stairs.length - 1].nextDirection = currentDirection;
        
        // Create new stair
        stairs.push(createStair(currentX, currentY, currentDirection));
        currentY -= STAIR_SPACING_Y;
    }
}

// Generate new stairs at the top
function generateNewStairs() {
    let highestStair = stairs[stairs.length - 1];
    let highestStairScreenY = highestStair.y - cameraY;
    
    // Keep generating until we have enough stairs above
    while (highestStairScreenY > -300) {
        let lastStair = stairs[stairs.length - 1];
        let lastDirection = lastStair.nextDirection || 'right';
        
        // Continue in same direction or randomly switch
        let nextDirection = lastDirection;
        if (Math.random() < 0.25) {  // 25% chance to switch
            nextDirection = nextDirection === 'right' ? 'left' : 'right';
        }
        
        // Set CURRENT stair's direction BEFORE creating next one
        stairs[stairs.length - 1].nextDirection = nextDirection;
        
        // Calculate new position based on the direction we just set
        let newX = lastStair.x;
        if (nextDirection === 'right') {
            newX += STAIR_SPACING_X;
        } else {
            newX -= STAIR_SPACING_X;
        }
        
        let newY = lastStair.y - STAIR_SPACING_Y;
        
        // Create new stair WITHOUT setting its nextDirection yet (will be set later)
        stairs.push(createStair(newX, newY, null));
        
        highestStair = stairs[stairs.length - 1];
        highestStairScreenY = highestStair.y - cameraY;
    }
    
    // Remove old stairs below
    while (stairs.length > 0 && stairs[0].y - cameraY > canvas.height + 200) {
        stairs.shift();
        player.currentStairIndex--;
    }
}

// Try to move forward
function tryMoveForward() {
    if (player.isJumping) return;
    
    let currentStair = stairs[player.currentStairIndex];
    let nextStairIndex = player.currentStairIndex + 1;
    
    if (nextStairIndex >= stairs.length) {
        die();
        return;
    }
    
    let nextStair = stairs[nextStairIndex];
    
    // Check if next stair matches our direction
    let isNextStairRight = nextStair.x > currentStair.x;
    
    if (isNextStairRight === player.facingRight) {
        jumpToStair(nextStairIndex);
    } else {
        die();
    }
}

// Try to turn
function tryTurn() {
    if (player.isJumping) return;
    
    let currentStair = stairs[player.currentStairIndex];
    let nextStairIndex = player.currentStairIndex + 1;
    
    if (nextStairIndex >= stairs.length) {
        die();
        return;
    }
    
    let nextStair = stairs[nextStairIndex];
    
    // Flip direction
    player.facingRight = !player.facingRight;
    
    // Check if matches
    let isNextStairRight = nextStair.x > currentStair.x;
    
    if (isNextStairRight === player.facingRight) {
        jumpToStair(nextStairIndex);
    } else {
        die();
    }
}

// Jump to stair
function jumpToStair(stairIndex) {
    player.isJumping = true;
    player.jumpProgress = 0;
    
    let targetStair = stairs[stairIndex];
    let startX = player.x;
    let startY = player.y;
    let targetX = targetStair.x + (STAIR_WIDTH / 2) - (player.size / 2);
    let targetY = targetStair.y - player.size;
    
    function animate() {
        player.jumpProgress += 0.75; //Faster! (higher = faster jumps)
        
        if (player.jumpProgress >= 1) {
            player.x = targetX;
            player.y = targetY;
            player.currentStairIndex = stairIndex;
            player.isJumping = false;
            
            height += 1;
            gold += 1;
            
            // Update camera to follow player (both X and Y!)
            cameraX = player.x - canvas.width / 2 + player.size / 2;
            cameraY = player.y - canvas.height / 2;
            
            generateNewStairs();
            return;
        }
        
        let t = player.jumpProgress;
        player.x = startX + (targetX - startX) * t;
        player.y = startY + (targetY - startY) * t - Math.sin(t * Math.PI) * 25;
        
        requestAnimationFrame(animate);
    }
    
    animate();
}

// Die
function die() {
    gameOver = true;
    gold = 0;
    alert(`You fell! Height reached: ${height}`);
    location.reload();
}

// Update stats
function updateStats() {
    document.getElementById('gold').textContent = gold;
    document.getElementById('height').textContent = height;
}

// Draw stair
function drawStair(stair) {
    let screenX = stair.x - cameraX;
    let screenY = stair.y - cameraY;
    
    // Stair top
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(screenX, screenY, stair.width, 10);
    
    // Stair front
    ctx.fillStyle = '#654321';
    ctx.fillRect(screenX, screenY + 10, stair.width, stair.height - 10);
    
    // Border
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, screenY, stair.width, stair.height);
}

// Draw player
function drawPlayer() {
    let screenX = player.x - cameraX;
    let screenY = player.y - cameraY;
    
    // Player body
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(screenX, screenY, player.size, player.size);
    
    // Direction indicator
    ctx.fillStyle = '#000';
    ctx.font = '16px Arial';
    let arrow = player.facingRight ? '▶' : '◀';
    ctx.fillText(arrow, screenX + 8, screenY + 20);
}

// Draw everything
function draw() {
    ctx.fillStyle = '#0d0808';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    stairs.forEach(stair => {
        drawStair(stair);
    });
    
    drawPlayer();
}

// Game loop
function gameLoop() {
    if (!player.isJumping) {
        updateStats();
    }
    draw();
    requestAnimationFrame(gameLoop);
}

// Start game
initStairs();
updateStats();

// Position player on first stair
let firstStair = stairs[0];
player.x = firstStair.x + (STAIR_WIDTH / 2) - (player.size / 2);
player.y = firstStair.y - player.size;

// Set initial camera
cameraX = player.x - canvas.width / 2 + player.size / 2;
cameraY = player.y - canvas.height / 2;

gameLoop();

console.log("Tower of Greed - Winding path active!");