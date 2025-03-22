// Global variables
let scene, camera, renderer, sphere, light;
let diffuseTexture, normalTexture, bumpTexture;
let originalImageData;

// DOM Elements
const uploadArea = document.getElementById('upload-area');
const textureUpload = document.getElementById('texture-upload');
const imagePreview = document.getElementById('image-preview');
const uploadedImage = document.getElementById('uploaded-image');
const sphereContainer = document.getElementById('sphere-container');
const diffuseCanvas = document.getElementById('diffuse-map');
const normalCanvas = document.getElementById('normal-map');
const bumpCanvas = document.getElementById('bump-map');

// Control Elements
const diffuseStrength = document.getElementById('diffuse-strength');
const normalStrength = document.getElementById('normal-strength');
const bumpStrength = document.getElementById('bump-strength');
const roughness = document.getElementById('roughness');
const metalness = document.getElementById('metalness');
const lightX = document.getElementById('light-x');
const lightY = document.getElementById('light-y');
const lightZ = document.getElementById('light-z');

// Value display elements
const diffuseValue = document.getElementById('diffuse-value');
const normalValue = document.getElementById('normal-value');
const bumpValue = document.getElementById('bump-value');
const roughnessValue = document.getElementById('roughness-value');
const metalnessValue = document.getElementById('metalness-value');

// Download buttons
const downloadDiffuse = document.getElementById('download-diffuse');
const downloadNormal = document.getElementById('download-normal');
const downloadBump = document.getElementById('download-bump');

// Initialize the application
function init() {
    initThreeJS();
    setupEventListeners();
}

// Initialize Three.js scene
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf9fafb);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, sphereContainer.clientWidth / sphereContainer.clientHeight, 0.1, 1000);
    camera.position.z = 3;

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(sphereContainer.clientWidth, sphereContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    sphereContainer.appendChild(renderer.domElement);

    // Create lighting
    light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 5, 5);
    scene.add(light);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    // Create a default sphere
    createSphere();

    // Set up orbit controls
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

// Create or update the sphere with textures
function createSphere() {
    // Remove existing sphere if it exists
    if (sphere) {
        scene.remove(sphere);
    }

    // Create geometry
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: parseFloat(roughness.value),
        metalness: parseFloat(metalness.value)
    });

    // Apply textures if available
    if (diffuseTexture) {
        material.map = diffuseTexture;
    }
    if (normalTexture) {
        material.normalMap = normalTexture;
        material.normalScale.set(parseFloat(normalStrength.value), parseFloat(normalStrength.value));
    }
    if (bumpTexture) {
        material.bumpMap = bumpTexture;
        material.bumpScale = parseFloat(bumpStrength.value);
    }

    // Create mesh
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Rotate the sphere slowly
    if (sphere) {
        sphere.rotation.y += 0.002;
    }
    
    renderer.render(scene, camera);
}

// Handle window resize
function onWindowResize() {
    camera.aspect = sphereContainer.clientWidth / sphereContainer.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(sphereContainer.clientWidth, sphereContainer.clientHeight);
}

// Set up event listeners
function setupEventListeners() {
    // File upload via input
    textureUpload.addEventListener('change', handleFileUpload);
    
    // Drag and drop events
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadArea.classList.add('active');
    });
    
    uploadArea.addEventListener('dragleave', () => {
        uploadArea.classList.remove('active');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadArea.classList.remove('active');
        
        if (e.dataTransfer.files.length) {
            processUploadedFile(e.dataTransfer.files[0]);
        }
    });
    
    uploadArea.addEventListener('click', () => {
        textureUpload.click();
    });
    
    // Sliders
    diffuseStrength.addEventListener('input', updateTextures);
    normalStrength.addEventListener('input', updateTextures);
    bumpStrength.addEventListener('input', updateTextures);
    roughness.addEventListener('input', updateMaterial);
    metalness.addEventListener('input', updateMaterial);
    
    // Light position
    lightX.addEventListener('input', updateLightPosition);
    lightY.addEventListener('input', updateLightPosition);
    lightZ.addEventListener('input', updateLightPosition);
    
    // Download buttons
    downloadDiffuse.addEventListener('click', () => downloadTexture(diffuseCanvas, 'diffuse-map'));
    downloadNormal.addEventListener('click', () => downloadTexture(normalCanvas, 'normal-map'));
    downloadBump.addEventListener('click', () => downloadTexture(bumpCanvas, 'bump-map'));
}

// Handle file upload
function handleFileUpload(e) {
    if (e.target.files.length) {
        processUploadedFile(e.target.files[0]);
    }
}

// Process uploaded file
function processUploadedFile(file) {
    if (!file.type.match('image.*')) {
        alert('Please upload an image file.');
        return;
    }
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        // Display the image
        uploadedImage.src = e.target.result;
        uploadedImage.style.display = 'block';
        
        // Load the image to process it
        const img = new Image();
        img.onload = function() {
            // Store original image data
            originalImageData = getImageData(img);
            
            // Generate texture maps
            generateTextureMaps(img);
        };
        img.src = e.target.result;
    };
    
    reader.readAsDataURL(file);
}

// Get image data from an image element
function getImageData(img) {
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
}

// Generate all texture maps
function generateTextureMaps(img) {
    // Generate diffuse map (just the original image with adjustable intensity)
    generateDiffuseMap(img);
    
    // Generate normal map
    generateNormalMap(originalImageData);
    
    // Generate bump map
    generateBumpMap(originalImageData);
    
    // Update the 3D sphere
    updateTextures();
}

// Generate diffuse map
function generateDiffuseMap(img) {
    // Set canvas dimensions
    diffuseCanvas.width = img.width;
    diffuseCanvas.height = img.height;
    
    // Draw the image
    const ctx = diffuseCanvas.getContext('2d');
    ctx.drawImage(img, 0, 0);
    
    // Create diffuse texture
    diffuseTexture = new THREE.Texture(diffuseCanvas);
    diffuseTexture.needsUpdate = true;
}

// Generate normal map
function generateNormalMap(imageData) {
    // Set canvas dimensions
    normalCanvas.width = imageData.width;
    normalCanvas.height = imageData.height;
    
    const ctx = normalCanvas.getContext('2d');
    const outputData = ctx.createImageData(imageData.width, imageData.height);
    
    // Sobel operators for edge detection
    const sobelX = [
        -1, 0, 1,
        -2, 0, 2,
        -1, 0, 1
    ];
    
    const sobelY = [
        -1, -2, -1,
        0, 0, 0,
        1, 2, 1
    ];
    
    // Process each pixel to create normal map
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            // Calculate gradient using Sobel operators
            let gx = 0;
            let gy = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const px = Math.min(imageData.width - 1, Math.max(0, x + kx));
                    const py = Math.min(imageData.height - 1, Math.max(0, y + ky));
                    
                    const idx = (py * imageData.width + px) * 4;
                    // Use grayscale value (average of RGB)
                    const val = (imageData.data[idx] + imageData.data[idx + 1] + imageData.data[idx + 2]) / 3;
                    
                    gx += val * sobelX[(ky + 1) * 3 + (kx + 1)];
                    gy += val * sobelY[(ky + 1) * 3 + (kx + 1)];
                }
            }
            
            // Convert gradient to normal vector
            // The Z component is arbitrary but affects the strength of the normal map
            const scale = 1.0; // Adjust scale for normal strength
            const nx = -gx * scale;
            const ny = -gy * scale;
            const nz = 1.0;
            
            // Normalize
            const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
            
            // Convert from [-1, 1] to [0, 1] range for RGB
            const outIdx = (y * imageData.width + x) * 4;
            outputData.data[outIdx] = ((nx / length) * 0.5 + 0.5) * 255;
            outputData.data[outIdx + 1] = ((ny / length) * 0.5 + 0.5) * 255;
            outputData.data[outIdx + 2] = ((nz / length) * 0.5 + 0.5) * 255;
            outputData.data[outIdx + 3] = 255; // Alpha
        }
    }
    
    // Put the processed data back to canvas
    ctx.putImageData(outputData, 0, 0);
    
    // Create normal texture
    normalTexture = new THREE.Texture(normalCanvas);
    normalTexture.needsUpdate = true;
}

// Generate bump map
function generateBumpMap(imageData) {
    // Set canvas dimensions
    bumpCanvas.width = imageData.width;
    bumpCanvas.height = imageData.height;
    
    const ctx = bumpCanvas.getContext('2d');
    const outputData = ctx.createImageData(imageData.width, imageData.height);
    
    // Convert to grayscale for bump map (based on brightness)
    for (let i = 0; i < imageData.data.length; i += 4) {
        // Calculate brightness
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        
        // Calculate brightness (simple average)
        const brightness = (r + g + b) / 3;
        
        // Set grayscale value
        outputData.data[i] = brightness;
        outputData.data[i + 1] = brightness;
        outputData.data[i + 2] = brightness;
        outputData.data[i + 3] = 255; // Alpha
    }
    
    // Put the processed data back to canvas
    ctx.putImageData(outputData, 0, 0);
    
    // Create bump texture
    bumpTexture = new THREE.Texture(bumpCanvas);
    bumpTexture.needsUpdate = true;
}

// Update textures based on slider values
function updateTextures() {
    // Update display values
    diffuseValue.textContent = parseFloat(diffuseStrength.value).toFixed(1);
    normalValue.textContent = parseFloat(normalStrength.value).toFixed(1);
    bumpValue.textContent = parseFloat(bumpStrength.value).toFixed(1);
    
    if (sphere && sphere.material) {
        // Update diffuse intensity
        if (sphere.material.map) {
            sphere.material.map.intensity = parseFloat(diffuseStrength.value);
            sphere.material.map.needsUpdate = true;
        }
        
        // Update normal map intensity
        if (sphere.material.normalMap) {
            sphere.material.normalScale.set(
                parseFloat(normalStrength.value),
                parseFloat(normalStrength.value)
            );
            sphere.material.normalMap.needsUpdate = true;
        }
        
        // Update bump map intensity
        if (sphere.material.bumpMap) {
            sphere.material.bumpScale = parseFloat(bumpStrength.value);
            sphere.material.bumpMap.needsUpdate = true;
        }
        
        sphere.material.needsUpdate = true;
    }
}

// Update material properties
function updateMaterial() {
    // Update display values
    roughnessValue.textContent = parseFloat(roughness.value).toFixed(1);
    metalnessValue.textContent = parseFloat(metalness.value).toFixed(1);
    
    if (sphere && sphere.material) {
        sphere.material.roughness = parseFloat(roughness.value);
        sphere.material.metalness = parseFloat(metalness.value);
        sphere.material.needsUpdate = true;
    }
}

// Update light position
function updateLightPosition() {
    if (light) {
        light.position.set(
            parseFloat(lightX.value),
            parseFloat(lightY.value),
            parseFloat(lightZ.value)
        );
    }
}

// Download texture as image
function downloadTexture(canvas, filename) {
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
