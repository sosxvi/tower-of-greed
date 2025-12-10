// ===== KEYBIND SYSTEM =====
// Default keys
const DEFAULT_KEYS = {
    climb: ' ',  // Space bar
    turn: 'ArrowRight',
    cashout: 'c'
};

// Load saved keybinds from localStorage or use defaults
let keybinds = {
    climb: localStorage.getItem('key_climb') || DEFAULT_KEYS.climb,
    turn: localStorage.getItem('key_turn') || DEFAULT_KEYS.turn,
    cashout: localStorage.getItem('key_cashout') || DEFAULT_KEYS.cashout
};

// Save a keybind to localStorage
function saveKeybind(action, key) {
    localStorage.setItem(`key_${action}`, key);
    keybinds[action] = key;
    updateControlDisplay();
}

// Update the control display text
function updateControlDisplay() {
    const displayText = `${formatKeyName(keybinds.climb)} = climb | ${formatKeyName(keybinds.turn)} = turn | ${formatKeyName(keybinds.cashout)} = CASH OUT`;
    document.getElementById('control-display').textContent = displayText;
}

// Format key names to be more readable
function formatKeyName(key) {
    if (key === ' ') return 'SPACE';
    if (key.startsWith('Arrow')) return key.replace('Arrow', '').toUpperCase();
    return key.toUpperCase();
}

// ===== SETTINGS MODAL SYSTEM =====
const settingsModal = document.getElementById('settings-modal');
const settingsBtn = document.getElementById('settings-btn');
const closeSettingsBtn = document.getElementById('close-settings-btn');
const resetKeysBtn = document.getElementById('reset-keys-btn');

// Keybind buttons
const climbKeyBtn = document.getElementById('climb-key-btn');
const turnKeyBtn = document.getElementById('turn-key-btn');
const cashoutKeyBtn = document.getElementById('cashout-key-btn');

// Track if we're currently listening for a key press
let listeningForKey = null;  // Will be 'climb', 'turn', or 'cashout' when listening

// Open settings modal
function openSettings() {
    settingsModal.classList.add('show');
    gameOver = true;  // Pause game while in settings
    updateKeybindButtons();  // Update button displays
}

// Close settings modal
function closeSettings() {
    settingsModal.classList.remove('show');
    gameOver = false;  // Resume game
    listeningForKey = null;  // Stop listening for keys
}

// Update the keybind button displays
function updateKeybindButtons() {
    climbKeyBtn.textContent = formatKeyName(keybinds.climb);
    turnKeyBtn.textContent = formatKeyName(keybinds.turn);
    cashoutKeyBtn.textContent = formatKeyName(keybinds.cashout);
}

// Start listening for a key press
function startListening(action, button) {
    // Stop any previous listening
    if (listeningForKey) {
        const prevButton = document.getElementById(`${listeningForKey}-key-btn`);
        prevButton.classList.remove('listening');
    }
    
    listeningForKey = action;
    button.classList.add('listening');
    button.textContent = 'Press any key...';
}

// Reset all keys to defaults
function resetKeys() {
    keybinds.climb = DEFAULT_KEYS.climb;
    keybinds.turn = DEFAULT_KEYS.turn;
    keybinds.cashout = DEFAULT_KEYS.cashout;
    
    // Save to localStorage
    localStorage.setItem('key_climb', DEFAULT_KEYS.climb);
    localStorage.setItem('key_turn', DEFAULT_KEYS.turn);
    localStorage.setItem('key_cashout', DEFAULT_KEYS.cashout);
    
    updateKeybindButtons();
    updateControlDisplay();
    
    alert('Keys reset to defaults!');
}

// ===== UNIFIED KEY HANDLER =====
// Handles BOTH settings and game controls
document.addEventListener('keydown', (e) => {
    // PRIORITY 1: Settings Modal is Open
    if (settingsModal.classList.contains('show')) {
        // ESC closes settings
        if (e.key === 'Escape') {
            closeSettings();
            return;
        }
        
        // If we're listening for a key to rebind
        if (listeningForKey) {
            e.preventDefault();  // Prevent default browser behavior
            
            // Don't allow ESC as a keybind
            if (e.key === 'Escape') {
                alert('Cannot bind Escape key!');
                return;
            }
            
            // Save the new keybind
            saveKeybind(listeningForKey, e.key);
            
            // Update button display
            const button = document.getElementById(`${listeningForKey}-key-btn`);
            button.classList.remove('listening');
            button.textContent = formatKeyName(e.key);
            
            listeningForKey = null;
            return;
        }
        
        // Don't process game controls while in settings
        return;
    }
    
    // PRIORITY 2: Game is Playing (not in settings)
    
    // ESC opens settings during gameplay
    if (e.key === 'Escape') {
        openSettings();
        return;
    }
    
    // Prevent duplicate key presses
    if (keysPressed[e.key] || gameOver) return;
    keysPressed[e.key] = true;
    
    // Check against custom keybinds
    if (e.key === keybinds.climb) {
        tryMoveForward();
    } else if (e.key === keybinds.turn) {
        tryTurn();
    } else if (e.key.toLowerCase() === keybinds.cashout.toLowerCase()) {
        cashOut();
    }
});

// Key release handler
document.addEventListener('keyup', (e) => {
    keysPressed[e.key] = false;
});

// Event listeners for settings
settingsBtn.addEventListener('click', openSettings);
closeSettingsBtn.addEventListener('click', closeSettings);
resetKeysBtn.addEventListener('click', resetKeys);

// Keybind button listeners
climbKeyBtn.addEventListener('click', () => startListening('climb', climbKeyBtn));
turnKeyBtn.addEventListener('click', () => startListening('turn', turnKeyBtn));
cashoutKeyBtn.addEventListener('click', () => startListening('cashout', cashoutKeyBtn));



// Initialize - update displays on page load
updateControlDisplay();
updateKeybindButtons();
// Get the canvas and its drawing context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 600;
canvas.height = 400;

// Game variables - Load banked gold from localStorage!
let unclaimedGold = 0;  
let bankedGold = parseInt(localStorage.getItem('bankedGold')) || 0;  // Load saved gold OR start at 0
let height = 0;
let gameOver = false;

// Camera offset
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
const STAIR_WIDTH = 100;
const STAIR_HEIGHT = 20;
const STAIR_SPACING_Y = 70;
const STAIR_SPACING_X = 100;

// Track keyboard
const keysPressed = {};





// CASH OUT - Bank your gold and RESTART!
function cashOut() {
    if (unclaimedGold > 0) {
        // Add to banked gold
        bankedGold += unclaimedGold;
        
        // SAVE to localStorage so it survives reload!
        localStorage.setItem('bankedGold', bankedGold.toString());
        
        console.log(`💰 Cashed out! Total banked: ${bankedGold}`);
        
        let cashAmount = unclaimedGold;
        alert(`💰 CASHED OUT!\n\nBanked: ${cashAmount} gold\nTotal Safe: ${bankedGold}\n\nStarting new run...`);
        
        // Reset game
        location.reload();
    }
}

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

// Initialize stairs
function initStairs() {
    let currentX = 300;
    let currentY = 350;
    let currentDirection = 'right';
    let stepsInDirection = 0;
    let maxStepsBeforeChange = 3 + Math.floor(Math.random() * 3);
    
    stairs.push(createStair(currentX, currentY, currentDirection));
    currentY -= STAIR_SPACING_Y;
    
    for (let i = 0; i < 30; i++) {
        stepsInDirection++;
        
        if (currentDirection === 'right') {
            currentX += STAIR_SPACING_X;
        } else {
            currentX -= STAIR_SPACING_X;
        }
        
        if (stepsInDirection >= maxStepsBeforeChange) {
            currentDirection = currentDirection === 'right' ? 'left' : 'right';
            stepsInDirection = 0;
            maxStepsBeforeChange = 3 + Math.floor(Math.random() * 3);
        }
        
        stairs[stairs.length - 1].nextDirection = currentDirection;
        stairs.push(createStair(currentX, currentY, currentDirection));
        currentY -= STAIR_SPACING_Y;
    }
}

// Generate new stairs
function generateNewStairs() {
    let highestStair = stairs[stairs.length - 1];
    let highestStairScreenY = highestStair.y - cameraY;
    
    while (highestStairScreenY > -300) {
        let lastStair = stairs[stairs.length - 1];
        let lastDirection = lastStair.nextDirection || 'right';
        
        let nextDirection = lastDirection;
        if (Math.random() < 0.25) {
            nextDirection = nextDirection === 'right' ? 'left' : 'right';
        }
        
        stairs[stairs.length - 1].nextDirection = nextDirection;
        
        let newX = lastStair.x;
        if (nextDirection === 'right') {
            newX += STAIR_SPACING_X;
        } else {
            newX -= STAIR_SPACING_X;
        }
        
        let newY = lastStair.y - STAIR_SPACING_Y;
        stairs.push(createStair(newX, newY, null));
        
        highestStair = stairs[stairs.length - 1];
        highestStairScreenY = highestStair.y - cameraY;
    }
    
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
    player.facingRight = !player.facingRight;
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
        player.jumpProgress += 0.25;
        
        if (player.jumpProgress >= 1) {
            player.x = targetX;
            player.y = targetY;
            player.currentStairIndex = stairIndex;
            player.isJumping = false;
            
            height += 1;
            unclaimedGold += 1;  // Earn risky gold!
            
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

// Die - LOSE UNCLAIMED, KEEP BANKED!
function die() {
    gameOver = true;
    
    // Save banked gold before reload
    localStorage.setItem('bankedGold', bankedGold.toString());
    
    let message = `💀 YOU FELL! 💀\n\n`;
    message += `Height Reached: ${height}\n`;
    message += `❌ Lost Unclaimed Gold: ${unclaimedGold}\n`;
    message += `✅ Banked Gold Kept: ${bankedGold}\n\n`;
    message += `Total Banked: ${bankedGold}`;
    
    alert(message);
    location.reload();
}

// Update stats display
function updateStats() {
    document.getElementById('gold').textContent = `💰 ${unclaimedGold} | 🏦 ${bankedGold}`;
    document.getElementById('height').textContent = height;
}

// Draw stair
function drawStair(stair) {
    let screenX = stair.x - cameraX;
    let screenY = stair.y - cameraY;
    
    ctx.fillStyle = '#8B4513';
    ctx.fillRect(screenX, screenY, stair.width, 10);
    
    ctx.fillStyle = '#654321';
    ctx.fillRect(screenX, screenY + 10, stair.width, stair.height - 10);
    
    ctx.strokeStyle = '#d4af37';
    ctx.lineWidth = 2;
    ctx.strokeRect(screenX, screenY, stair.width, stair.height);
}

// Draw player
function drawPlayer() {
    let screenX = player.x - cameraX;
    let screenY = player.y - cameraY;
    
    ctx.fillStyle = '#ffd700';
    ctx.fillRect(screenX, screenY, player.size, player.size);
    
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

let firstStair = stairs[0];
player.x = firstStair.x + (STAIR_WIDTH / 2) - (player.size / 2);
player.y = firstStair.y - player.size;

cameraX = player.x - canvas.width / 2 + player.size / 2;
cameraY = player.y - canvas.height / 2;

gameLoop();

console.log("Tower of Greed - Risk/Reward Active!");
console.log("SPACE = climb | RIGHT ARROW = turn | C = CASH OUT!");