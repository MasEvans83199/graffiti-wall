let scene, camera, renderer, wall;
let paintMaterial, currentPaintSize = 0.1;
let currentPattern = 'normal';
let dripProbability = 0.005; 

init();
animate();

function init() {
    renderer = new THREE.WebGLRenderer();
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    scene = new THREE.Scene();

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 5);

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

    updatePaintMaterial(document.getElementById('colorPicker').value);

    let painting = false;
    document.addEventListener('mousedown', () => { painting = true; });
    document.addEventListener('mouseup', () => { painting = false; });
    document.addEventListener('mousemove', (event) => {
        if (!painting) return;
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        checkIntersect();
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

    document.getElementById('saveButton').addEventListener('click', saveArtwork);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

const colorPicker = new iro.ColorPicker('#colorPicker', {
    width: 200,
    color: "#ff0000",
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
    const a = document.createElement('a');
    a.href = imgData;
    a.download = 'Graffiti-Artwork.png';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

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

