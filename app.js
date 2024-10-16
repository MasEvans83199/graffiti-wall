let scene, camera, renderer, wall;
let paintMaterial, currentPaintSize = 0.1;
let currentPattern = 'normal';
let dripProbability = 0.02; 

const isMobile = window.innerWidth < 768;
const defaultColor = '#8e44ad';
const defaultPattern = 'normal';

init();
animate();


function init() {
    renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setClearColor(0x000000, 0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    if (isMobile) {
        camera.position.set(0, 2, 10)
    }
    else{
        camera.position.set(-0.5, 1, 5);
    }

    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);

    const loader = new THREE.TextureLoader();
    loader.load('textures/concrete_wall.jpg', (texture) => {
        const wallMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide });
        wall = new THREE.Mesh(new THREE.PlaneGeometry(10, 5), wallMaterial);
        wall.position.set(0, 1, 0);
        scene.add(wall);
    }, undefined, (error) => {
        console.error('An error occurred while loading the texture:', error);
    });

    const colorPicker = document.getElementById('colorPicker');
    colorPicker.value = defaultColor;

    const patternSelector = document.getElementById('patternSelector');
    patternSelector.value = defaultPattern;

    updatePaintMaterial(defaultColor);

    colorPicker.addEventListener('input', (event) => {
        updatePaintMaterial(event.target.value);
    });

    patternSelector.addEventListener('change', (event) => {
        currentPattern = event.target.value;
    });

    let painting = false;
    document.addEventListener('mousedown', () => { painting = true; });
    document.addEventListener('mouseup', () => { painting = false; });
    document.addEventListener('mousemove', (event) => {
        if (!painting) return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        checkIntersect();
    });

    const toggleUI = document.getElementById('toggleUI');
    const ui = document.getElementById('ui');
    toggleUI.addEventListener('click', () => {
        ui.classList.toggle('-translate-x-full');
    });
    
    document.getElementById('colorPicker').addEventListener('change', (event) => {
        updatePaintMaterial(event.target.value);
    });

    document.getElementById('patternSelector').addEventListener('change', (event) => {
        const selectedPattern = event.target.value;
        setSprayPattern(selectedPattern);
    });

    document.getElementById('sizeSelector').addEventListener('input', (event) => {
        currentPaintSize = parseFloat(event.target.value);
    });

    window.addEventListener('resize', onWindowResize, false);

    window.addEventListener('orientationchange', onWindowResize, false);

    document.getElementById('saveButton').addEventListener('click', saveArtwork);

    addTouchListeners();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);

    if (window.innerWidth < window.innerHeight) {
        wall.position.set(0, 0, 0);
        camera.position.z = 7;
    } else {
        wall.position.set(0, 1, 0);
        camera.position.z = 5;
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

const colorPicker = new iro.ColorPicker('#colorPicker', {
    width: 200,
    color: "#8e44ad",
});

updatePaintMaterial(colorPicker.color.hexString);

colorPicker.on('color:change', function(color) {
    updatePaintMaterial(color.hexString);
});

function updatePaintMaterial(color) {
    paintMaterial = new THREE.MeshBasicMaterial({ color: color });
}

const mouse = new THREE.Vector2();
const raycaster = new THREE.Raycaster();
let painting = false;

function onTouchStart(event) {
    event.preventDefault();
    painting = true;
    updateTouchPosition(event.touches[0]);
    checkIntersect();
}

function onTouchMove(event) {
    event.preventDefault();
    if (painting) {
        updateTouchPosition(event.touches[0]);
        checkIntersect();
    }
}

function onTouchEnd(event) {
    event.preventDefault();
    painting = false;
}

function updateTouchPosition(touch) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
}

function onMouseMove(event) {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    checkIntersect();
}

function checkIntersect() {
    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(wall);
    if (intersects.length > 0) {
        const { x, y, z } = intersects[0].point;
        addPaint(x, y, z);
    }
}

function setSprayPattern(pattern) {
    currentPattern = pattern; 
}

function addPaint(x, y, z) {
    const color = paintMaterial.color.clone();
    const paint = new THREE.Mesh(new THREE.CircleGeometry(currentPaintSize, 32), paintMaterial);
    
    switch (currentPattern) {
        case 'splatter':
            splatterPaint(x, y, z, color);
            break;
        case 'thin':
            thinLinePaint(x, y, z, color);
            break;
        case 'spray':
            sprayPaint(x, y, z, color);
            break;
        case 'dotted':
            dottedPaint(x, y, z, color);
            break;
        case 'streak':
            streakPaint(x, y, z, color);
            break;
        default: 
            normalPaint(x, y, z, color);
            break;
    }

    maybeDripPaint(paint);
}

function normalPaint(x, y, z, color) {
    const gradient = new THREE.MeshBasicMaterial({ 
        color: color, 
        transparent: true, 
        opacity: 0.5 + Math.random() * 0.5 
    });
    const paint = new THREE.Mesh(new THREE.CircleGeometry(currentPaintSize, 32), gradient);
    paint.position.set(x, y, z);
    scene.add(paint);
}

function splatterPaint(x, y, z, color) {
    const numSplats = Math.floor(5 + Math.random() * 10);
    for (let i = 0; i < numSplats; i++) {
        const splatSize = currentPaintSize * (0.1 + Math.random() * 0.5);
        const offsetX = (Math.random() - 0.5) * 0.5;
        const offsetY = (Math.random() - 0.5) * 0.5;
        const splatMaterial = new THREE.MeshBasicMaterial({ 
            color: color, 
            transparent: true, 
            opacity: 0.4 + Math.random() * 0.6
        });
        const splat = new THREE.Mesh(new THREE.CircleGeometry(splatSize, 32), splatMaterial);
        splat.position.set(x + offsetX, y + offsetY, z);
        scene.add(splat);
    }
}

function thinLinePaint(x, y, z, color) {
    const lineMaterial = new THREE.LineBasicMaterial({
        color: color, 
        linewidth: 1
    });

    const lineGeometry = new THREE.BufferGeometry();

    const positions = new Float32Array([
        x - currentPaintSize * 0.05, y, z,
        x + currentPaintSize * 0.05, y + (Math.random() - 0.5) * 0.2, z  
    ]);

    lineGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
}

function sprayPaint(x, y, z, color) {
    const numSprays = Math.floor(20 + Math.random() * 30);
    for (let i = 0; i < numSprays; i++) {
        const spraySize = currentPaintSize * (0.05 + Math.random() * 0.3);
        const offsetX = (Math.random() - 0.5) * 1.0;
        const offsetY = (Math.random() - 0.5) * 1.0;
        const sprayMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.3 + Math.random() * 0.7
        });
        const spray = new THREE.Mesh(new THREE.CircleGeometry(spraySize, 32), sprayMaterial);
        spray.position.set(x + offsetX, y + offsetY, z);
        scene.add(spray);
    }
}

function dottedPaint(x, y, z, color) {
    const numDots = Math.floor(15 + Math.random() * 25);
    for (let i = 0; i < numDots; i++) {
        const dotSize = currentPaintSize * (0.02 + Math.random() * 0.1);
        const offsetX = (Math.random() - 0.5) * 0.8;
        const offsetY = (Math.random() - 0.5) * 0.8;
        const dotMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5 + Math.random() * 0.5
        });
        const dot = new THREE.Mesh(new THREE.CircleGeometry(dotSize, 32), dotMaterial);
        dot.position.set(x + offsetX, y + offsetY, z);
        scene.add(dot);
    }
}

function streakPaint(x, y, z, color) {
    const streaks = Math.floor(5 + Math.random() * 10);
    for (let i = 0; i < streaks; i++) {
        const streakWidth = currentPaintSize * 0.1;
        const streakLength = currentPaintSize * (0.2 + Math.random() * 0.5);
        const streakMaterial = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5 + Math.random() * 0.5
        });
        const streakGeometry = new THREE.PlaneGeometry(streakLength, streakWidth);
        const streak = new THREE.Mesh(streakGeometry, streakMaterial);
        streak.position.set(x + (Math.random() - 0.5) * 0.5, y, z);
        streak.rotation.z = Math.random() * Math.PI;
        scene.add(streak);
    }
}

function maybeDripPaint(paint) {
    if (!paint) {
        console.warn("No paint object provided for dripping.");
        return;
    }
    if (Math.random() < dripProbability) {
        const drip = new THREE.Mesh(
            new THREE.CylinderGeometry(currentPaintSize * 0.1, currentPaintSize * 0.05, 1, 32),
            paint.material.clone()
        );
        drip.position.set(paint.position.x, paint.position.y - 0.5, paint.position.z);
        scene.add(drip);
    }
}

function animateDrip(drip) {
    const dripDistance = 0.5 + Math.random() * 0.5; 
    let elapsed = 0;
    function step() {
        if (elapsed < dripDistance) {
            drip.position.y -= 0.01; 
            requestAnimationFrame(step);
        }
    }
    step();
}

document.getElementById('resetButton').addEventListener('click', resetWall);

function resetWall() {
    for (let i = scene.children.length - 1; i >= 0; i--) {
        const object = scene.children[i];
        if (object !== wall && !(object instanceof THREE.AmbientLight)) {
            scene.remove(object);
        }
    }
    console.log("Wall reset!");
}

function saveArtwork() {
    renderer.render(scene, camera);
    const imgData = renderer.domElement.toDataURL('image/png');
    
    if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
        window.open(imgData, '_blank');
    } else {
        const a = document.createElement('a');
        a.href = imgData;
        a.download = `TagMaster-${Math.random().toString(36).substring(2, 8)}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    }
}

const cursor = document.getElementById('neon-cursor');
const ui = document.getElementById('ui');

function addTouchListeners() {
    document.addEventListener('touchstart', onTouchStart, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('touchend', onTouchEnd, { passive: false });
}

function paint(touch) {
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
    checkIntersect();
}

function updateCursorPosition(x, y) {
    if ('ontouchstart' in window) {
        cursor.style.display = 'none';
    } else {
        cursor.style.display = 'block';
        cursor.style.left = `${x}px`;
        cursor.style.top = `${y}px`;
    }
}

document.addEventListener('mousemove', (e) => {
    updateCursorPosition(e.clientX, e.clientY);
    const cursorSize = parseFloat(getComputedStyle(cursor).width);
    cursor.style.left = `${e.clientX - cursorSize / 2}px`;
    cursor.style.top = `${e.clientY - cursorSize / 2}px`;
});

document.addEventListener('touchmove', (e) => {
    updateCursorPosition(e.touches[0].clientX, e.touches[0].clientY);
});

document.addEventListener('mousedown', () => {
    cursor.style.transform = 'scale(0.8)';
});

document.addEventListener('mouseup', () => {
    cursor.style.transform = 'scale(1)';
});

ui.addEventListener('mouseenter', () => {
    cursor.style.opacity = '0';
});

ui.addEventListener('mouseleave', () => {
    cursor.style.opacity = '1';
});

function updateCursorSize(size) {
    const newSize = size * 200;
    cursor.style.width = `${newSize}px`;
    cursor.style.height = `${newSize}px`;
}

document.getElementById('sizeSelector').addEventListener('input', (event) => {
    currentPaintSize = parseFloat(event.target.value);
    updateCursorSize(currentPaintSize);
});

updateCursorSize(currentPaintSize);


function warnUser(e) {
    e.preventDefault();
    e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
}

window.addEventListener('beforeunload', warnUser);

function onDocumentKeyDown(event) {
    switch(event.keyCode) {
        case 49: // '1' key
            currentColorIndex = 0;
            break;
        case 50: // '2' key
            currentColorIndex = 1;
            break;
        case 51: // '3' key
            currentColorIndex = 2;
            break;
        case 52: // '4' key
            currentColorIndex = 3;
            break;
        case 187: // '+' key
            currentPaintSize += 0.05;
            break;
        case 189: // '-' key
            currentPaintSize = Math.max(0.05, currentPaintSize - 0.05);
            break;
    }
    updatePaintMaterial();
}

