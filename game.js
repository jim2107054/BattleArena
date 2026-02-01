// =====================================================
// ⚔️ AI BATTLE ARENA - GRID TACTICS
// Minimax vs Greedy Algorithm - 3D Visualization
// =====================================================

// === CONFIGURATION ===
const GRID_SIZE = 8;
const CELL_SIZE = 2;

// Tile Types
const TILE = {
    EMPTY: 0,
    WALL: 1,
    DOOR: 2,
    WINDOW: 3,
    TREE: 4,
    CRATE: 5,
    POWERUP: 6
};

// Tile Properties
const TILE_PROPS = {
    [TILE.EMPTY]: { passable: true, cover: 0, name: 'Floor' },
    [TILE.WALL]: { passable: false, cover: 100, name: 'Wall' },
    [TILE.DOOR]: { passable: true, cover: 0, name: 'Door', moveCost: 2 },
    [TILE.WINDOW]: { passable: false, cover: 15, shootThrough: true, name: 'Window' },
    [TILE.TREE]: { passable: false, cover: 10, name: 'Tree' },
    [TILE.CRATE]: { passable: false, cover: 20, name: 'Crate', destructible: true, health: 50 },
    [TILE.POWERUP]: { passable: true, cover: 0, name: 'Power-up', points: 50 }
};

// Unit Types
const UNIT_TYPES = {
    SOLDIER: { health: 100, attack: 25, range: 2, critChance: 0.15, icon: '🎖️' },
    SNIPER: { health: 60, attack: 45, range: 4, critChance: 0.30, icon: '🎯' },
    HEAVY: { health: 180, attack: 20, range: 1, critChance: 0.05, icon: '🛡️' },
    SCOUT: { health: 70, attack: 20, range: 2, critChance: 0.20, icon: '⚡', speed: 2 }
};

// Points System
const POINTS = {
    DAMAGE: 2,
    KILL: 500,
    CRITICAL: 100,
    FIRST_BLOOD: 300,
    POWERUP: 50,
    DOOR_USE: 20,
    COVER_BONUS: 30,
    VICTORY: 1000,
    FLAWLESS: 500,
    DOMINATION: 300
};

// === GAME STATE ===
let scene, camera, renderer;
let grid = [];
let tileMeshes = [];
let unitMeshes = {};
let redUnits = [];
let blueUnits = [];
let currentTurn = 'red';
let gameRunning = false;
let gamePaused = false;
let gameSpeed = 700;
let round = 1;
let firstBlood = false;
let cameraMode = 0;
let cameraAngle = 0;

let scores = { red: 0, blue: 0, total: 0 };
let stats = { damage: 0, kills: 0, crits: 0, powerups: 0 };

// === THREE.JS SETUP ===
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a1a);
    
    camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 20, 16);
    camera.lookAt(0, 0, 0);
    
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    document.getElementById('game-container').appendChild(renderer.domElement);
    
    // Lighting
    const ambient = new THREE.AmbientLight(0x404060, 0.6);
    scene.add(ambient);
    
    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(15, 30, 15);
    mainLight.castShadow = true;
    mainLight.shadow.mapSize.width = 4096;
    mainLight.shadow.mapSize.height = 4096;
    mainLight.shadow.camera.near = 1;
    mainLight.shadow.camera.far = 60;
    mainLight.shadow.camera.left = -20;
    mainLight.shadow.camera.right = 20;
    mainLight.shadow.camera.top = 20;
    mainLight.shadow.camera.bottom = -20;
    scene.add(mainLight);
    
    // Team lights
    const redLight = new THREE.PointLight(0xff4757, 0.8, 20);
    redLight.position.set(-10, 8, 0);
    scene.add(redLight);
    
    const blueLight = new THREE.PointLight(0x3742fa, 0.8, 20);
    blueLight.position.set(10, 8, 0);
    scene.add(blueLight);
    
    // Fog
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.02);
    
    window.addEventListener('resize', onResize);
    animate();
}

// === MAP GENERATION ===
function generateMap() {
    // Clear existing
    tileMeshes.forEach(m => scene.remove(m));
    tileMeshes = [];
    
    // Initialize empty grid
    grid = Array(GRID_SIZE).fill(null).map(() => 
        Array(GRID_SIZE).fill(null).map(() => ({ type: TILE.EMPTY, mesh: null }))
    );
    
    // Create base platform
    const platformGeo = new THREE.BoxGeometry(GRID_SIZE * CELL_SIZE + 2, 0.5, GRID_SIZE * CELL_SIZE + 2);
    const platformMat = new THREE.MeshStandardMaterial({ color: 0x1a1a2e, metalness: 0.7, roughness: 0.3 });
    const platform = new THREE.Mesh(platformGeo, platformMat);
    platform.position.y = -0.3;
    platform.receiveShadow = true;
    scene.add(platform);
    tileMeshes.push(platform);
    
    const offset = (GRID_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2;
    
    // Create grid cells
    for (let x = 0; x < GRID_SIZE; x++) {
        for (let z = 0; z < GRID_SIZE; z++) {
            const isLight = (x + z) % 2 === 0;
            const cellGeo = new THREE.BoxGeometry(CELL_SIZE - 0.1, 0.1, CELL_SIZE - 0.1);
            const cellMat = new THREE.MeshStandardMaterial({
                color: isLight ? 0x2d3436 : 0x1e272e,
                metalness: 0.3,
                roughness: 0.7
            });
            const cell = new THREE.Mesh(cellGeo, cellMat);
            cell.position.set(x * CELL_SIZE - offset, 0.05, z * CELL_SIZE - offset);
            cell.receiveShadow = true;
            scene.add(cell);
            tileMeshes.push(cell);
        }
    }
    
    // Add environmental objects
    addMapFeatures(offset);
    
    // Add decorative elements
    addEnvironmentDecor();
}

function addMapFeatures(offset) {
    // === WALLS (Building outline) ===
    const walls = [
        [3, 0], [4, 0], [3, 7], [4, 7],  // Top/bottom walls
        [0, 3], [0, 4], [7, 3], [7, 4]   // Side walls
    ];
    walls.forEach(([x, z]) => {
        grid[x][z].type = TILE.WALL;
        createWall(x, z, offset);
    });
    
    // === CENTER STRUCTURE ===
    [[3, 3], [4, 3], [3, 4], [4, 4]].forEach(([x, z]) => {
        grid[x][z].type = TILE.WALL;
        createWall(x, z, offset);
    });
    
    // === DOORS ===
    const doors = [[3, 2], [4, 5], [2, 3], [5, 4]];
    doors.forEach(([x, z]) => {
        grid[x][z].type = TILE.DOOR;
        createDoor(x, z, offset);
    });
    
    // === WINDOWS ===
    const windows = [[2, 0], [5, 0], [2, 7], [5, 7], [0, 2], [0, 5], [7, 2], [7, 5]];
    windows.forEach(([x, z]) => {
        grid[x][z].type = TILE.WINDOW;
        createWindow(x, z, offset);
    });
    
    // === TREES ===
    const trees = [[1, 1], [6, 1], [1, 6], [6, 6]];
    trees.forEach(([x, z]) => {
        grid[x][z].type = TILE.TREE;
        createTree(x, z, offset);
    });
    
    // === CRATES ===
    const crates = [[2, 2], [5, 2], [2, 5], [5, 5]];
    crates.forEach(([x, z]) => {
        grid[x][z].type = TILE.CRATE;
        grid[x][z].health = 50;
        createCrate(x, z, offset);
    });
    
    // === POWER-UPS ===
    const powerups = [[3, 1], [4, 6], [1, 4], [6, 3]];
    powerups.forEach(([x, z]) => {
        grid[x][z].type = TILE.POWERUP;
        createPowerup(x, z, offset);
    });
}

function createWall(x, z, offset) {
    const geo = new THREE.BoxGeometry(CELL_SIZE - 0.2, 2.5, CELL_SIZE - 0.2);
    const mat = new THREE.MeshStandardMaterial({ 
        color: 0x4a4a5a, 
        metalness: 0.5, 
        roughness: 0.5 
    });
    const wall = new THREE.Mesh(geo, mat);
    wall.position.set(x * CELL_SIZE - offset, 1.25, z * CELL_SIZE - offset);
    wall.castShadow = true;
    wall.receiveShadow = true;
    scene.add(wall);
    tileMeshes.push(wall);
    grid[x][z].mesh = wall;
    
    // Top edge glow
    const edgeGeo = new THREE.BoxGeometry(CELL_SIZE - 0.1, 0.1, CELL_SIZE - 0.1);
    const edgeMat = new THREE.MeshBasicMaterial({ color: 0x6c5ce7 });
    const edge = new THREE.Mesh(edgeGeo, edgeMat);
    edge.position.set(x * CELL_SIZE - offset, 2.55, z * CELL_SIZE - offset);
    scene.add(edge);
    tileMeshes.push(edge);
}

function createDoor(x, z, offset) {
    const group = new THREE.Group();
    
    // Door frame
    const frameGeo = new THREE.BoxGeometry(CELL_SIZE - 0.3, 2.2, 0.2);
    const frameMat = new THREE.MeshStandardMaterial({ color: 0x5d4e37, metalness: 0.3, roughness: 0.7 });
    const frame = new THREE.Mesh(frameGeo, frameMat);
    frame.position.y = 1.1;
    group.add(frame);
    
    // Door panel
    const doorGeo = new THREE.BoxGeometry(CELL_SIZE - 0.5, 2, 0.15);
    const doorMat = new THREE.MeshStandardMaterial({ color: 0x8b4513, metalness: 0.2, roughness: 0.8 });
    const door = new THREE.Mesh(doorGeo, doorMat);
    door.position.y = 1;
    door.castShadow = true;
    group.add(door);
    
    // Handle
    const handleGeo = new THREE.SphereGeometry(0.1, 8, 8);
    const handleMat = new THREE.MeshStandardMaterial({ color: 0xffd700, metalness: 0.8, roughness: 0.2 });
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.set(0.5, 1, 0.1);
    group.add(handle);
    
    group.position.set(x * CELL_SIZE - offset, 0, z * CELL_SIZE - offset);
    scene.add(group);
    tileMeshes.push(group);
    grid[x][z].mesh = group;
}

function createWindow(x, z, offset) {
    const group = new THREE.Group();
    
    // Window frame (lower wall)
    const wallLowGeo = new THREE.BoxGeometry(CELL_SIZE - 0.2, 0.8, CELL_SIZE - 0.2);
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a4a5a, metalness: 0.5, roughness: 0.5 });
    const wallLow = new THREE.Mesh(wallLowGeo, wallMat);
    wallLow.position.y = 0.4;
    group.add(wallLow);
    
    // Window frame (upper wall)
    const wallHighGeo = new THREE.BoxGeometry(CELL_SIZE - 0.2, 0.6, CELL_SIZE - 0.2);
    const wallHigh = new THREE.Mesh(wallHighGeo, wallMat);
    wallHigh.position.y = 2.2;
    group.add(wallHigh);
    
    // Glass
    const glassGeo = new THREE.BoxGeometry(CELL_SIZE - 0.4, 1.2, 0.05);
    const glassMat = new THREE.MeshStandardMaterial({ 
        color: 0x87ceeb, 
        transparent: true, 
        opacity: 0.4,
        metalness: 0.9,
        roughness: 0.1
    });
    const glass = new THREE.Mesh(glassGeo, glassMat);
    glass.position.y = 1.4;
    group.add(glass);
    
    // Window bars
    for (let i = -0.4; i <= 0.4; i += 0.4) {
        const barGeo = new THREE.CylinderGeometry(0.03, 0.03, 1.2, 8);
        const barMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const bar = new THREE.Mesh(barGeo, barMat);
        bar.position.set(i, 1.4, 0);
        group.add(bar);
    }
    
    group.position.set(x * CELL_SIZE - offset, 0, z * CELL_SIZE - offset);
    group.castShadow = true;
    scene.add(group);
    tileMeshes.push(group);
    grid[x][z].mesh = group;
}

function createTree(x, z, offset) {
    const group = new THREE.Group();
    
    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.2, 0.3, 1.5, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5d4e37 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 0.75;
    trunk.castShadow = true;
    group.add(trunk);
    
    // Foliage layers
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x27ae60 });
    
    const foliage1 = new THREE.Mesh(new THREE.ConeGeometry(0.9, 1.2, 8), foliageMat);
    foliage1.position.y = 1.8;
    foliage1.castShadow = true;
    group.add(foliage1);
    
    const foliage2 = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1, 8), foliageMat);
    foliage2.position.y = 2.5;
    foliage2.castShadow = true;
    group.add(foliage2);
    
    const foliage3 = new THREE.Mesh(new THREE.ConeGeometry(0.5, 0.8, 8), foliageMat);
    foliage3.position.y = 3.1;
    foliage3.castShadow = true;
    group.add(foliage3);
    
    group.position.set(x * CELL_SIZE - offset, 0, z * CELL_SIZE - offset);
    scene.add(group);
    tileMeshes.push(group);
    grid[x][z].mesh = group;
}

function createCrate(x, z, offset) {
    const group = new THREE.Group();
    
    // Main crate
    const crateGeo = new THREE.BoxGeometry(CELL_SIZE - 0.4, 1.2, CELL_SIZE - 0.4);
    const crateMat = new THREE.MeshStandardMaterial({ color: 0x7f8c8d, metalness: 0.4, roughness: 0.6 });
    const crate = new THREE.Mesh(crateGeo, crateMat);
    crate.position.y = 0.6;
    crate.castShadow = true;
    group.add(crate);
    
    // Metal bands
    const bandMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.8, roughness: 0.3 });
    [-0.3, 0.3].forEach(yOff => {
        const bandGeo = new THREE.BoxGeometry(CELL_SIZE - 0.35, 0.1, CELL_SIZE - 0.35);
        const band = new THREE.Mesh(bandGeo, bandMat);
        band.position.y = 0.6 + yOff;
        group.add(band);
    });
    
    // Hazard symbol
    const symbolGeo = new THREE.BoxGeometry(0.5, 0.5, 0.02);
    const symbolMat = new THREE.MeshBasicMaterial({ color: 0xf39c12 });
    const symbol = new THREE.Mesh(symbolGeo, symbolMat);
    symbol.position.set(0, 0.6, (CELL_SIZE - 0.4) / 2 + 0.01);
    group.add(symbol);
    
    group.position.set(x * CELL_SIZE - offset, 0, z * CELL_SIZE - offset);
    scene.add(group);
    tileMeshes.push(group);
    grid[x][z].mesh = group;
}

function createPowerup(x, z, offset) {
    const group = new THREE.Group();
    
    // Base platform
    const baseGeo = new THREE.CylinderGeometry(0.4, 0.5, 0.15, 16);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.7, roughness: 0.3 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.1;
    group.add(base);
    
    // Star
    const starShape = new THREE.Shape();
    const outerRadius = 0.4;
    const innerRadius = 0.2;
    for (let i = 0; i < 5; i++) {
        const outerAngle = (i * 72 - 90) * Math.PI / 180;
        const innerAngle = ((i * 72) + 36 - 90) * Math.PI / 180;
        if (i === 0) {
            starShape.moveTo(Math.cos(outerAngle) * outerRadius, Math.sin(outerAngle) * outerRadius);
        } else {
            starShape.lineTo(Math.cos(outerAngle) * outerRadius, Math.sin(outerAngle) * outerRadius);
        }
        starShape.lineTo(Math.cos(innerAngle) * innerRadius, Math.sin(innerAngle) * innerRadius);
    }
    starShape.closePath();
    
    const starGeo = new THREE.ExtrudeGeometry(starShape, { depth: 0.1, bevelEnabled: false });
    const starMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
    const star = new THREE.Mesh(starGeo, starMat);
    star.rotation.x = Math.PI / 2;
    star.position.y = 0.8;
    star.name = 'star';
    group.add(star);
    
    // Glow ring
    const glowGeo = new THREE.TorusGeometry(0.5, 0.05, 8, 32);
    const glowMat = new THREE.MeshBasicMaterial({ color: 0xffd700, transparent: true, opacity: 0.5 });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.rotation.x = Math.PI / 2;
    glow.position.y = 0.3;
    glow.name = 'glow';
    group.add(glow);
    
    group.position.set(x * CELL_SIZE - offset, 0, z * CELL_SIZE - offset);
    group.userData = { type: 'powerup', x, z };
    scene.add(group);
    tileMeshes.push(group);
    grid[x][z].mesh = group;
}

function addEnvironmentDecor() {
    // Floating particles
    const particleCount = 100;
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount * 3; i += 3) {
        positions[i] = (Math.random() - 0.5) * 50;
        positions[i + 1] = Math.random() * 20 + 5;
        positions[i + 2] = (Math.random() - 0.5) * 50;
    }
    
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({ color: 0x6c5ce7, size: 0.1, transparent: true, opacity: 0.6 });
    const particles = new THREE.Points(particleGeo, particleMat);
    scene.add(particles);
}

// === UNIT CREATION ===
function createUnit(type, team, x, z) {
    const offset = (GRID_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2;
    const config = UNIT_TYPES[type];
    
    const unit = {
        id: `${team}_${type}_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        type,
        team,
        x, z,
        health: config.health,
        maxHealth: config.health,
        attack: config.attack,
        range: config.range,
        critChance: config.critChance,
        speed: config.speed || 1
    };
    
    const teamColor = team === 'red' ? 0xff4757 : 0x3742fa;
    const teamColorDark = team === 'red' ? 0xaa0000 : 0x0000aa;
    const group = new THREE.Group();
    
    // Base glow
    const baseGlowGeo = new THREE.RingGeometry(0.5, 0.7, 32);
    const baseGlowMat = new THREE.MeshBasicMaterial({ color: teamColor, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const baseGlow = new THREE.Mesh(baseGlowGeo, baseGlowMat);
    baseGlow.rotation.x = -Math.PI / 2;
    baseGlow.position.y = 0.12;
    group.add(baseGlow);
    
    if (type === 'SOLDIER') {
        // Body
        const bodyGeo = new THREE.CylinderGeometry(0.35, 0.4, 1.3, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: teamColor, metalness: 0.6, roughness: 0.4 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.85;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.28, 16, 16);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 1.75;
        head.castShadow = true;
        group.add(head);
        
        // Helmet
        const helmetGeo = new THREE.SphereGeometry(0.3, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2);
        const helmetMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8, roughness: 0.2 });
        const helmet = new THREE.Mesh(helmetGeo, helmetMat);
        helmet.position.y = 1.78;
        group.add(helmet);
        
        // Rifle
        const rifleGeo = new THREE.BoxGeometry(0.08, 0.08, 1);
        const rifleMat = new THREE.MeshStandardMaterial({ color: 0x2d3436, metalness: 0.7 });
        const rifle = new THREE.Mesh(rifleGeo, rifleMat);
        rifle.position.set(0.4, 1.1, 0.3);
        rifle.rotation.x = 0.2;
        group.add(rifle);
        
    } else if (type === 'SNIPER') {
        // Slim body
        const bodyGeo = new THREE.CylinderGeometry(0.25, 0.3, 1.4, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: teamColor, metalness: 0.5, roughness: 0.5 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.9;
        body.castShadow = true;
        group.add(body);
        
        // Hooded head
        const headGeo = new THREE.SphereGeometry(0.25, 16, 16);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 1.8;
        head.castShadow = true;
        group.add(head);
        
        // Hood
        const hoodGeo = new THREE.ConeGeometry(0.35, 0.5, 8);
        const hood = new THREE.Mesh(hoodGeo, bodyMat);
        hood.position.y = 2.05;
        hood.rotation.x = 0.2;
        group.add(hood);
        
        // Sniper rifle
        const sniperGeo = new THREE.BoxGeometry(0.06, 0.06, 1.5);
        const sniperMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, metalness: 0.8 });
        const sniper = new THREE.Mesh(sniperGeo, sniperMat);
        sniper.position.set(0.35, 1.2, 0.4);
        sniper.rotation.x = 0.1;
        group.add(sniper);
        
        // Scope
        const scopeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.2, 8);
        const scope = new THREE.Mesh(scopeGeo, new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
        scope.position.set(0.35, 1.35, 0.2);
        scope.rotation.x = Math.PI / 2;
        group.add(scope);
        
    } else if (type === 'HEAVY') {
        // Bulky body
        const bodyGeo = new THREE.BoxGeometry(0.9, 1.3, 0.7);
        const bodyMat = new THREE.MeshStandardMaterial({ color: teamColor, metalness: 0.7, roughness: 0.3 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.85;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const headGeo = new THREE.BoxGeometry(0.5, 0.45, 0.45);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 1.75;
        head.castShadow = true;
        group.add(head);
        
        // Shoulder pads
        const shoulderMat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.8 });
        [-0.55, 0.55].forEach(xOff => {
            const shoulderGeo = new THREE.BoxGeometry(0.35, 0.25, 0.4);
            const shoulder = new THREE.Mesh(shoulderGeo, shoulderMat);
            shoulder.position.set(xOff, 1.45, 0);
            group.add(shoulder);
        });
        
        // Shield
        const shieldGeo = new THREE.BoxGeometry(0.15, 1.2, 0.8);
        const shieldMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.9, roughness: 0.1 });
        const shield = new THREE.Mesh(shieldGeo, shieldMat);
        shield.position.set(0.65, 0.8, 0);
        group.add(shield);
        
    } else if (type === 'SCOUT') {
        // Agile body
        const bodyGeo = new THREE.CylinderGeometry(0.28, 0.32, 1.1, 8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: teamColor, metalness: 0.4, roughness: 0.6 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.75;
        body.castShadow = true;
        group.add(body);
        
        // Head
        const headGeo = new THREE.SphereGeometry(0.22, 16, 16);
        const head = new THREE.Mesh(headGeo, bodyMat);
        head.position.y = 1.55;
        head.castShadow = true;
        group.add(head);
        
        // Visor
        const visorGeo = new THREE.BoxGeometry(0.45, 0.1, 0.25);
        const visorMat = new THREE.MeshBasicMaterial({ color: 0x00ffff });
        const visor = new THREE.Mesh(visorGeo, visorMat);
        visor.position.set(0, 1.55, 0.15);
        group.add(visor);
        
        // Speed lines
        const lineMat = new THREE.MeshBasicMaterial({ color: 0xffff00, transparent: true, opacity: 0.5 });
        for (let i = 0; i < 3; i++) {
            const lineGeo = new THREE.BoxGeometry(0.02, 0.3, 0.02);
            const line = new THREE.Mesh(lineGeo, lineMat);
            line.position.set(-0.3 - i * 0.1, 0.8, 0);
            group.add(line);
        }
    }
    
    // Health bar
    const healthBgGeo = new THREE.BoxGeometry(0.9, 0.12, 0.12);
    const healthBgMat = new THREE.MeshBasicMaterial({ color: 0x333333 });
    const healthBg = new THREE.Mesh(healthBgGeo, healthBgMat);
    healthBg.position.y = 2.4;
    group.add(healthBg);
    
    const healthGeo = new THREE.BoxGeometry(0.86, 0.1, 0.1);
    const healthMat = new THREE.MeshBasicMaterial({ color: 0x2ecc71 });
    const healthBar = new THREE.Mesh(healthGeo, healthMat);
    healthBar.position.y = 2.4;
    healthBar.name = 'healthBar';
    group.add(healthBar);
    
    // Unit type label
    const labelCanvas = document.createElement('canvas');
    labelCanvas.width = 128;
    labelCanvas.height = 64;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = 'white';
    ctx.font = 'bold 32px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(config.icon, 64, 45);
    
    const labelTexture = new THREE.CanvasTexture(labelCanvas);
    const labelMat = new THREE.SpriteMaterial({ map: labelTexture, transparent: true });
    const label = new THREE.Sprite(labelMat);
    label.position.y = 2.8;
    label.scale.set(0.8, 0.4, 1);
    group.add(label);
    
    group.position.set(x * CELL_SIZE - offset, 0.1, z * CELL_SIZE - offset);
    scene.add(group);
    
    unitMeshes[unit.id] = group;
    unit.mesh = group;
    
    return unit;
}

function updateUnitHealth(unit) {
    if (!unitMeshes[unit.id]) return;
    
    const healthBar = unitMeshes[unit.id].getObjectByName('healthBar');
    if (healthBar) {
        const pct = Math.max(0, unit.health / unit.maxHealth);
        healthBar.scale.x = pct;
        healthBar.position.x = -(1 - pct) * 0.43;
        
        if (pct > 0.6) healthBar.material.color.setHex(0x2ecc71);
        else if (pct > 0.3) healthBar.material.color.setHex(0xf39c12);
        else healthBar.material.color.setHex(0xe74c3c);
    }
}

function moveUnit(unit, newX, newZ) {
    const offset = (GRID_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2;
    const mesh = unitMeshes[unit.id];
    if (!mesh) return;
    
    const startX = mesh.position.x;
    const startZ = mesh.position.z;
    const targetX = newX * CELL_SIZE - offset;
    const targetZ = newZ * CELL_SIZE - offset;
    
    const duration = 350;
    const startTime = Date.now();
    
    function animateMove() {
        const elapsed = Date.now() - startTime;
        const t = Math.min(elapsed / duration, 1);
        const ease = 1 - Math.pow(1 - t, 3);
        
        mesh.position.x = startX + (targetX - startX) * ease;
        mesh.position.z = startZ + (targetZ - startZ) * ease;
        mesh.position.y = 0.1 + Math.sin(t * Math.PI) * 0.6;
        mesh.rotation.y = Math.sin(t * Math.PI * 2) * 0.15;
        
        if (t < 1) requestAnimationFrame(animateMove);
        else mesh.rotation.y = 0;
    }
    animateMove();
    
    unit.x = newX;
    unit.z = newZ;
}

function removeUnit(unit) {
    const mesh = unitMeshes[unit.id];
    if (!mesh) return;
    
    createExplosion(mesh.position.clone(), unit.team);
    
    const startTime = Date.now();
    function animateDeath() {
        const t = Math.min((Date.now() - startTime) / 600, 1);
        mesh.position.y = 0.1 - t * 2;
        mesh.rotation.z = t * Math.PI;
        mesh.scale.setScalar(1 - t);
        
        if (t < 1) requestAnimationFrame(animateDeath);
        else {
            scene.remove(mesh);
            delete unitMeshes[unit.id];
        }
    }
    animateDeath();
    
    redUnits = redUnits.filter(u => u.id !== unit.id);
    blueUnits = blueUnits.filter(u => u.id !== unit.id);
}

function createExplosion(pos, team) {
    const color = team === 'red' ? 0xff4757 : 0x3742fa;
    
    for (let i = 0; i < 25; i++) {
        const geo = new THREE.SphereGeometry(Math.random() * 0.15 + 0.05, 8, 8);
        const mat = new THREE.MeshBasicMaterial({ 
            color: Math.random() > 0.5 ? color : 0xffd700, 
            transparent: true 
        });
        const particle = new THREE.Mesh(geo, mat);
        particle.position.copy(pos);
        particle.position.y += 1;
        
        const vel = new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            Math.random() * 0.4,
            (Math.random() - 0.5) * 0.4
        );
        
        scene.add(particle);
        
        const start = Date.now();
        function animate() {
            const t = (Date.now() - start) / 800;
            if (t < 1) {
                particle.position.add(vel);
                vel.y -= 0.015;
                particle.material.opacity = 1 - t;
                requestAnimationFrame(animate);
            } else {
                scene.remove(particle);
            }
        }
        animate();
    }
}

function createProjectile(from, to, team, isCrit) {
    const offset = (GRID_SIZE * CELL_SIZE) / 2 - CELL_SIZE / 2;
    const startPos = new THREE.Vector3(from.x * CELL_SIZE - offset, 1.3, from.z * CELL_SIZE - offset);
    const endPos = new THREE.Vector3(to.x * CELL_SIZE - offset, 1.3, to.z * CELL_SIZE - offset);
    
    const color = team === 'red' ? 0xff6b6b : 0x74b9ff;
    const geo = new THREE.SphereGeometry(isCrit ? 0.2 : 0.12, 12, 12);
    const mat = new THREE.MeshBasicMaterial({ color: isCrit ? 0xffd700 : color });
    const proj = new THREE.Mesh(geo, mat);
    proj.position.copy(startPos);
    scene.add(proj);
    
    const duration = 200;
    const start = Date.now();
    
    function animate() {
        const t = Math.min((Date.now() - start) / duration, 1);
        proj.position.lerpVectors(startPos, endPos, t);
        proj.position.y += Math.sin(t * Math.PI) * 1;
        
        if (t < 1) {
            requestAnimationFrame(animate);
        } else {
            scene.remove(proj);
            createImpact(endPos, team, isCrit);
        }
    }
    animate();
}

function createImpact(pos, team, isCrit) {
    const color = team === 'red' ? 0xff4757 : 0x3742fa;
    
    // Ring effect
    const ringGeo = new THREE.RingGeometry(0.1, 0.3, 32);
    const ringMat = new THREE.MeshBasicMaterial({ 
        color: isCrit ? 0xffd700 : color, 
        transparent: true, 
        side: THREE.DoubleSide 
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(pos);
    ring.rotation.x = -Math.PI / 2;
    scene.add(ring);
    
    const start = Date.now();
    function animate() {
        const t = (Date.now() - start) / 400;
        if (t < 1) {
            ring.scale.setScalar(1 + t * 3);
            ring.material.opacity = 1 - t;
            requestAnimationFrame(animate);
        } else {
            scene.remove(ring);
        }
    }
    animate();
    
    if (isCrit) {
        shakeScreen();
        showCriticalHit();
    }
}

function shakeScreen() {
    const container = document.getElementById('game-container');
    container.style.animation = 'none';
    container.offsetHeight;
    container.style.animation = 'shake 0.3s ease-out';
    
    if (!document.getElementById('shake-css')) {
        const style = document.createElement('style');
        style.id = 'shake-css';
        style.textContent = `@keyframes shake { 
            0%, 100% { transform: translateX(0); } 
            25% { transform: translateX(-8px) rotate(-0.5deg); } 
            75% { transform: translateX(8px) rotate(0.5deg); } 
        }`;
        document.head.appendChild(style);
    }
}

function showCriticalHit() {
    const crit = document.createElement('div');
    crit.className = 'critical-flash';
    crit.textContent = '💥 CRITICAL!';
    document.body.appendChild(crit);
    setTimeout(() => crit.remove(), 700);
}

// === GAME LOGIC ===
function initGame() {
    // Clear
    Object.values(unitMeshes).forEach(m => scene.remove(m));
    unitMeshes = {};
    redUnits = [];
    blueUnits = [];
    
    // Reset state
    scores = { red: 0, blue: 0, total: 0 };
    stats = { damage: 0, kills: 0, crits: 0, powerups: 0 };
    round = 1;
    firstBlood = false;
    currentTurn = 'red';
    
    document.getElementById('log-content').innerHTML = '';
    
    // Generate map
    generateMap();
    
    // Create Red Team (Minimax)
    redUnits.push(createUnit('SOLDIER', 'red', 0, 0));
    redUnits.push(createUnit('SNIPER', 'red', 0, 7));
    redUnits.push(createUnit('HEAVY', 'red', 1, 3));
    redUnits.push(createUnit('SCOUT', 'red', 1, 5));
    
    // Create Blue Team (Greedy)
    blueUnits.push(createUnit('SOLDIER', 'blue', 7, 0));
    blueUnits.push(createUnit('SNIPER', 'blue', 7, 7));
    blueUnits.push(createUnit('HEAVY', 'blue', 6, 4));
    blueUnits.push(createUnit('SCOUT', 'blue', 6, 2));
    
    updateUI();
}

function getDistance(x1, z1, x2, z2) {
    return Math.max(Math.abs(x1 - x2), Math.abs(z1 - z2)); // Chebyshev distance
}

function isValidPosition(x, z) {
    return x >= 0 && x < GRID_SIZE && z >= 0 && z < GRID_SIZE;
}

function isTilePassable(x, z) {
    if (!isValidPosition(x, z)) return false;
    const tile = grid[x][z];
    return TILE_PROPS[tile.type].passable;
}

function isOccupied(x, z) {
    return [...redUnits, ...blueUnits].some(u => u.health > 0 && u.x === x && u.z === z);
}

function canShootThrough(x, z) {
    if (!isValidPosition(x, z)) return false;
    const tile = grid[x][z];
    return TILE_PROPS[tile.type].passable || TILE_PROPS[tile.type].shootThrough;
}

function hasLineOfSight(from, to) {
    // Simple line of sight check
    const dx = Math.sign(to.x - from.x);
    const dz = Math.sign(to.z - from.z);
    let x = from.x + dx;
    let z = from.z + dz;
    
    while (x !== to.x || z !== to.z) {
        if (!canShootThrough(x, z) && !(x === to.x && z === to.z)) {
            return false;
        }
        if (x !== to.x) x += dx;
        if (z !== to.z) z += dz;
    }
    return true;
}

function getCoverBonus(unit) {
    // Check adjacent tiles for cover
    let maxCover = 0;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dz]) => {
        const nx = unit.x + dx;
        const nz = unit.z + dz;
        if (isValidPosition(nx, nz)) {
            maxCover = Math.max(maxCover, TILE_PROPS[grid[nx][nz].type].cover || 0);
        }
    });
    return maxCover;
}

function getValidMoves(unit) {
    const moves = [];
    const range = unit.speed || 1;
    
    for (let dx = -range; dx <= range; dx++) {
        for (let dz = -range; dz <= range; dz++) {
            if (dx === 0 && dz === 0) continue;
            const nx = unit.x + dx;
            const nz = unit.z + dz;
            if (isTilePassable(nx, nz) && !isOccupied(nx, nz)) {
                moves.push({ type: 'move', x: nx, z: nz });
            }
        }
    }
    return moves;
}

function getValidAttacks(unit) {
    const attacks = [];
    const enemies = unit.team === 'red' ? blueUnits : redUnits;
    
    enemies.filter(e => e.health > 0).forEach(enemy => {
        const dist = getDistance(unit.x, unit.z, enemy.x, enemy.z);
        if (dist <= unit.range && hasLineOfSight(unit, enemy)) {
            attacks.push({ type: 'attack', target: enemy });
        }
    });
    
    return attacks;
}

function getAllActions(unit) {
    return [...getValidMoves(unit), ...getValidAttacks(unit)];
}

// === AI: MINIMAX (Red Team) ===
function minimax(depth, isMax, alpha, beta) {
    if (depth === 0 || isGameOver()) {
        return evaluateBoard();
    }
    
    const units = isMax ? redUnits.filter(u => u.health > 0) : blueUnits.filter(u => u.health > 0);
    
    if (isMax) {
        let maxEval = -Infinity;
        for (const unit of units) {
            for (const action of getAllActions(unit)) {
                const undo = simulateAction(unit, action);
                const score = minimax(depth - 1, false, alpha, beta);
                undoAction(undo);
                maxEval = Math.max(maxEval, score);
                alpha = Math.max(alpha, score);
                if (beta <= alpha) break;
            }
            if (beta <= alpha) break;
        }
        return maxEval;
    } else {
        let minEval = Infinity;
        for (const unit of units) {
            for (const action of getAllActions(unit)) {
                const undo = simulateAction(unit, action);
                const score = minimax(depth - 1, true, alpha, beta);
                undoAction(undo);
                minEval = Math.min(minEval, score);
                beta = Math.min(beta, score);
                if (beta <= alpha) break;
            }
            if (beta <= alpha) break;
        }
        return minEval;
    }
}

function evaluateBoard() {
    let score = 0;
    
    redUnits.forEach(u => {
        if (u.health > 0) {
            score += u.health * 2;
            score += u.attack * 1.5;
            score += 80; // Alive bonus
            score += getCoverBonus(u) * 2;
            // Aggressive positioning
            const nearestEnemy = Math.min(...blueUnits.filter(e => e.health > 0).map(e => getDistance(u.x, u.z, e.x, e.z)));
            if (nearestEnemy <= u.range) score += 40;
        }
    });
    
    blueUnits.forEach(u => {
        if (u.health > 0) {
            score -= u.health * 2;
            score -= u.attack * 1.5;
            score -= 80;
            score -= getCoverBonus(u) * 2;
        }
    });
    
    return score;
}

function simulateAction(unit, action) {
    const undo = { unit, action, oldX: unit.x, oldZ: unit.z, targetHP: null, target: null };
    
    if (action.type === 'move') {
        unit.x = action.x;
        unit.z = action.z;
    } else if (action.type === 'attack') {
        undo.target = action.target;
        undo.targetHP = action.target.health;
        action.target.health -= unit.attack;
    }
    
    return undo;
}

function undoAction(undo) {
    if (undo.action.type === 'move') {
        undo.unit.x = undo.oldX;
        undo.unit.z = undo.oldZ;
    } else if (undo.target) {
        undo.target.health = undo.targetHP;
    }
}

function getMinimaxAction() {
    let bestAction = null, bestUnit = null, bestScore = -Infinity;
    
    for (const unit of redUnits.filter(u => u.health > 0)) {
        for (const action of getAllActions(unit)) {
            const undo = simulateAction(unit, action);
            const score = minimax(2, false, -Infinity, Infinity);
            undoAction(undo);
            
            if (score > bestScore) {
                bestScore = score;
                bestAction = action;
                bestUnit = unit;
            }
        }
    }
    
    return { unit: bestUnit, action: bestAction };
}

// === AI: GREEDY (Blue Team) ===
function getGreedyAction() {
    let bestAction = null, bestUnit = null, bestValue = -Infinity;
    
    for (const unit of blueUnits.filter(u => u.health > 0)) {
        const actions = getAllActions(unit);
        
        for (const action of actions) {
            let value = 0;
            
            if (action.type === 'attack') {
                // Prioritize attacks, especially killing blows
                value = action.target.maxHealth - action.target.health + unit.attack * 3;
                if (action.target.health <= unit.attack) {
                    value += 500; // Kill bonus
                }
                // Prefer attacking low health targets
                value += (1 - action.target.health / action.target.maxHealth) * 100;
            } else if (action.type === 'move') {
                // Value moving toward enemies
                const enemies = redUnits.filter(e => e.health > 0);
                if (enemies.length > 0) {
                    const nearestBefore = Math.min(...enemies.map(e => getDistance(unit.x, unit.z, e.x, e.z)));
                    const nearestAfter = Math.min(...enemies.map(e => getDistance(action.x, action.z, e.x, e.z)));
                    value = (nearestBefore - nearestAfter) * 20;
                    
                    // Value cover
                    const coverAt = getCoverAtPosition(action.x, action.z);
                    value += coverAt * 2;
                }
                
                // Check for power-ups
                if (grid[action.x][action.z].type === TILE.POWERUP) {
                    value += 100;
                }
            }
            
            // Add randomness
            value += Math.random() * 30;
            
            if (value > bestValue) {
                bestValue = value;
                bestAction = action;
                bestUnit = unit;
            }
        }
    }
    
    return { unit: bestUnit, action: bestAction };
}

function getCoverAtPosition(x, z) {
    let cover = 0;
    [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(([dx, dz]) => {
        const nx = x + dx;
        const nz = z + dz;
        if (isValidPosition(nx, nz)) {
            cover = Math.max(cover, TILE_PROPS[grid[nx][nz].type].cover || 0);
        }
    });
    return cover;
}

// === ACTION EXECUTION ===
function executeAction(unit, action) {
    if (action.type === 'move') {
        // Check for power-up
        if (grid[action.x][action.z].type === TILE.POWERUP) {
            awardPoints(unit.team, POINTS.POWERUP, 'Power-up!');
            logAction(unit.team, `${UNIT_TYPES[unit.type].icon} ${unit.type} collected ⭐ POWER-UP!`, POINTS.POWERUP);
            stats.powerups++;
            
            // Remove power-up
            grid[action.x][action.z].type = TILE.EMPTY;
            if (grid[action.x][action.z].mesh) {
                scene.remove(grid[action.x][action.z].mesh);
                grid[action.x][action.z].mesh = null;
            }
        }
        
        // Check for door
        if (grid[action.x][action.z].type === TILE.DOOR) {
            awardPoints(unit.team, POINTS.DOOR_USE, 'Used door');
            logAction(unit.team, `${UNIT_TYPES[unit.type].icon} ${unit.type} moved through 🚪 door`, POINTS.DOOR_USE);
        } else {
            logAction(unit.team, `${UNIT_TYPES[unit.type].icon} ${unit.type} moved to (${action.x},${action.z})`, 0);
        }
        
        moveUnit(unit, action.x, action.z);
        
    } else if (action.type === 'attack') {
        const target = action.target;
        const isCrit = Math.random() < unit.critChance;
        let damage = unit.attack;
        
        // Apply cover reduction
        const cover = getCoverBonus(target);
        damage = Math.max(5, damage - cover);
        
        if (isCrit) {
            damage = Math.floor(damage * 1.8);
            stats.crits++;
            awardPoints(unit.team, POINTS.CRITICAL, 'CRITICAL HIT!');
        }
        
        target.health -= damage;
        stats.damage += damage;
        
        awardPoints(unit.team, damage * POINTS.DAMAGE, 'Damage');
        createProjectile(unit, target, unit.team, isCrit);
        
        setTimeout(() => updateUnitHealth(target), 220);
        
        const critText = isCrit ? ' ⚡CRIT!' : '';
        const coverText = cover > 0 ? ` (${cover} cover)` : '';
        logAction(unit.team, `${UNIT_TYPES[unit.type].icon} ${unit.type} → ${UNIT_TYPES[target.type].icon} ${target.type}: ${damage} dmg${critText}${coverText}`, damage * POINTS.DAMAGE + (isCrit ? POINTS.CRITICAL : 0));
        
        if (target.health <= 0) {
            stats.kills++;
            awardPoints(unit.team, POINTS.KILL, 'ELIMINATION!');
            
            if (!firstBlood) {
                firstBlood = true;
                awardPoints(unit.team, POINTS.FIRST_BLOOD, 'FIRST BLOOD!');
                logAction('event', `🩸 FIRST BLOOD by ${unit.team.toUpperCase()}!`, POINTS.FIRST_BLOOD);
            }
            
            logAction('event', `💀 ${UNIT_TYPES[target.type].icon} ${target.type} ELIMINATED!`, POINTS.KILL);
            setTimeout(() => removeUnit(target), 250);
        }
    }
    
    updateUI();
}

// === UI & SCORING ===
function awardPoints(team, amount, reason) {
    scores[team] += amount;
    scores.total += amount;
    showFloatingPoints(amount, team);
    updateUI();
}

function showFloatingPoints(amount, team) {
    const el = document.createElement('div');
    el.className = 'float-points';
    el.textContent = `+${amount}`;
    el.style.left = (window.innerWidth / 2 + (Math.random() - 0.5) * 200) + 'px';
    el.style.top = (window.innerHeight / 2) + 'px';
    el.style.color = team === 'red' ? '#ff6b6b' : (team === 'blue' ? '#74b9ff' : '#ffd700');
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1500);
}

function logAction(team, text, points) {
    const log = document.getElementById('log-content');
    const entry = document.createElement('div');
    entry.className = `log-entry ${team}`;
    entry.innerHTML = `${text}${points > 0 ? ` <span class="points">+${points}</span>` : ''}`;
    log.insertBefore(entry, log.firstChild);
    
    while (log.children.length > 15) {
        log.removeChild(log.lastChild);
    }
}

function updateUI() {
    document.getElementById('red-units').textContent = redUnits.filter(u => u.health > 0).length;
    document.getElementById('blue-units').textContent = blueUnits.filter(u => u.health > 0).length;
    document.getElementById('red-score').textContent = scores.red;
    document.getElementById('blue-score').textContent = scores.blue;
    document.getElementById('total-score').textContent = scores.total;
    document.getElementById('round-num').textContent = `ROUND ${round}`;
}

function isGameOver() {
    return redUnits.filter(u => u.health > 0).length === 0 || 
           blueUnits.filter(u => u.health > 0).length === 0;
}

// === GAME LOOP ===
async function playTurn() {
    if (!gameRunning || gamePaused) return;
    
    if (isGameOver()) {
        endGame();
        return;
    }
    
    const turnDisplay = document.getElementById('turn-display');
    
    if (currentTurn === 'red') {
        turnDisplay.innerHTML = '🔴 <strong>RED TEAM</strong> (Minimax) thinking...';
        turnDisplay.style.borderColor = '#ff4757';
        
        await delay(gameSpeed * 0.4);
        
        const { unit, action } = getMinimaxAction();
        if (unit && action) {
            executeAction(unit, action);
        }
        
        currentTurn = 'blue';
    } else {
        turnDisplay.innerHTML = '🔵 <strong>BLUE TEAM</strong> (Greedy) thinking...';
        turnDisplay.style.borderColor = '#3742fa';
        
        await delay(gameSpeed * 0.4);
        
        const { unit, action } = getGreedyAction();
        if (unit && action) {
            executeAction(unit, action);
        }
        
        currentTurn = 'red';
        round++;
    }
    
    await delay(gameSpeed * 0.6);
    
    if (gameRunning && !gamePaused) {
        playTurn();
    }
}

function delay(ms) {
    return new Promise(r => setTimeout(r, ms));
}

function endGame() {
    gameRunning = false;
    
    const redAlive = redUnits.filter(u => u.health > 0).length;
    const blueAlive = blueUnits.filter(u => u.health > 0).length;
    const winner = redAlive > 0 ? 'red' : 'blue';
    const winnerName = winner === 'red' ? 'RED TEAM (Minimax)' : 'BLUE TEAM (Greedy)';
    const aliveCount = winner === 'red' ? redAlive : blueAlive;
    
    // Victory bonuses
    awardPoints(winner, POINTS.VICTORY, 'VICTORY!');
    if (aliveCount === 4) awardPoints(winner, POINTS.FLAWLESS, 'FLAWLESS!');
    if (aliveCount >= 3) awardPoints(winner, POINTS.DOMINATION, 'DOMINATION!');
    
    // Show game over
    const popup = document.getElementById('game-over');
    document.getElementById('winner-title').style.color = winner === 'red' ? '#ff4757' : '#3742fa';
    document.getElementById('winner-name').innerHTML = `🎉 ${winnerName} WINS! 🎉`;
    document.getElementById('winner-name').style.color = winner === 'red' ? '#ff6b6b' : '#74b9ff';
    
    document.getElementById('rewards-grid').innerHTML = `
        <div class="reward-row"><span>Victory Bonus</span><span class="pts">+${POINTS.VICTORY}</span></div>
        <div class="reward-row"><span>Total Damage (${stats.damage})</span><span class="pts">+${stats.damage * POINTS.DAMAGE}</span></div>
        <div class="reward-row"><span>Eliminations (${stats.kills})</span><span class="pts">+${stats.kills * POINTS.KILL}</span></div>
        <div class="reward-row"><span>Critical Hits (${stats.crits})</span><span class="pts">+${stats.crits * POINTS.CRITICAL}</span></div>
        <div class="reward-row"><span>Power-ups (${stats.powerups})</span><span class="pts">+${stats.powerups * POINTS.POWERUP}</span></div>
        ${aliveCount === 4 ? `<div class="reward-row"><span>🏆 FLAWLESS VICTORY</span><span class="pts">+${POINTS.FLAWLESS}</span></div>` : ''}
        ${aliveCount >= 3 ? `<div class="reward-row"><span>👑 DOMINATION</span><span class="pts">+${POINTS.DOMINATION}</span></div>` : ''}
    `;
    
    document.getElementById('final-score').textContent = `${scores.total} PTS`;
    popup.style.display = 'block';
}

function startGame() {
    document.getElementById('game-over').style.display = 'none';
    initGame();
    gameRunning = true;
    gamePaused = false;
    
    document.getElementById('turn-display').textContent = '⚔️ Battle Starting...';
    
    setTimeout(playTurn, 1500);
}

function toggleSpeed() {
    const btn = document.getElementById('btn-speed');
    if (gameSpeed === 700) {
        gameSpeed = 350;
        btn.textContent = '⚡ FAST';
    } else if (gameSpeed === 350) {
        gameSpeed = 150;
        btn.textContent = '⚡ ULTRA';
    } else if (gameSpeed === 150) {
        gameSpeed = 1200;
        btn.textContent = '⚡ SLOW';
    } else {
        gameSpeed = 700;
        btn.textContent = '⚡ NORMAL';
    }
}

function togglePause() {
    gamePaused = !gamePaused;
    document.getElementById('btn-pause').textContent = gamePaused ? '▶️ RESUME' : '⏸️ PAUSE';
    if (!gamePaused) playTurn();
}

function cycleCamera() {
    cameraMode = (cameraMode + 1) % 3;
}

function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    // Camera modes
    if (cameraMode === 0) {
        cameraAngle += 0.003;
        camera.position.x = Math.sin(cameraAngle) * 6;
        camera.position.z = 16 + Math.cos(cameraAngle) * 6;
        camera.position.y = 20 + Math.sin(cameraAngle * 0.5) * 2;
    } else if (cameraMode === 1) {
        camera.position.set(0, 28, 4);
    } else {
        cameraAngle += 0.005;
        camera.position.x = Math.sin(cameraAngle) * 14;
        camera.position.z = Math.cos(cameraAngle) * 14;
        camera.position.y = 14;
    }
    camera.lookAt(0, 0, 0);
    
    // Animate power-ups
    tileMeshes.forEach(mesh => {
        if (mesh.userData && mesh.userData.type === 'powerup') {
            const star = mesh.getObjectByName('star');
            const glow = mesh.getObjectByName('glow');
            if (star) {
                star.rotation.z = time * 2;
                star.position.y = 0.8 + Math.sin(time * 3) * 0.15;
            }
            if (glow) {
                glow.scale.setScalar(1 + Math.sin(time * 4) * 0.2);
            }
        }
    });
    
    renderer.render(scene, camera);
}

// === INITIALIZE ===
initThreeJS();
initGame();
setTimeout(startGame, 2000);
