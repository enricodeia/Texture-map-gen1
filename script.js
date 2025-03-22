// Global variables
let scene, camera, renderer, sphere, light;
let diffuseTexture, normalTexture, bumpTexture, displacementTexture;
let originalImageData;
let hasUploadedImage = false;

// DOM Elements
const uploadArea = document.getElementById('upload-area');
const uploadContent = document.querySelector('.upload-content');
const textureUpload = document.getElementById('texture-upload');
const previewOverlay = document.getElementById('preview-overlay');
const uploadedImage = document.getElementById('uploaded-image');
const deleteImageBtn = document.getElementById('delete-image');
const sphereContainer = document.getElementById('sphere-container');
const diffuseCanvas = document.getElementById('diffuse-map');
const normalCanvas = document.getElementById('normal-map');
const bumpCanvas = document.getElementById('bump-map');
const displacementCanvas = document.getElementById('displacement-map');

// Control Elements
const diffuseStrength = document.getElementById('diffuse-strength');
const normalStrength = document.getElementById('normal-strength');
const bumpStrength = document.getElementById('bump-strength');
const displacementStrength = document.getElementById('displacement-strength');
const roughness = document.getElementById('roughness');
const metalness = document.getElementById('metalness');
const lightX = document.getElementById('light-x');
const lightY = document.getElementById('light-y');
const lightZ = document.getElementById('light-z');

// Value display elements
const diffuseValue = document.getElementById('diffuse-value');
const normalValue = document.getElementById('normal-value');
const bumpValue = document.getElementById('bump-value');
const displacementValue = document.getElementById('displacement-value');
const roughnessValue = document.getElementById('roughness-value');
const metalnessValue = document.getElementById('metalness-value');

// Download buttons
const downloadDiffuse = document.getElementById('download-diffuse');
const downloadNormal = document.getElementById('download-normal');
const downloadBump = document.getElementById('download-bump');
const downloadDisplacement = document.getElementById('download-displacement');

// Initialize the application
function init() {
    // Make sure THREE is loaded before continuing
    if (typeof THREE === 'undefined') {
        console.error('THREE is not defined. Please check if Three.js is loaded correctly.');
        showNotification('Error loading Three.js. Please refresh the page.', 'error');
        return;
    }
    
    try {
        initThreeJS();
        setupEventListeners();
    } catch (error) {
        console.error('Error initializing application:', error);
        showNotification('Error initializing the application. Please refresh the page.', 'error');
    }
}

// Initialize Three.js scene
function initThreeJS() {
    // Create scene
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1A1A2E);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, sphereContainer.clientWidth / sphereContainer.clientHeight, 0.1, 1000);
    camera.position.z = 3;
    camera.position.y = 0.5; // Slight angle for better viewing

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(sphereContainer.clientWidth, sphereContainer.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.physicallyCorrectLights = true;
    
    // Append renderer to container
    sphereContainer.appendChild(renderer.domElement);

    // Create lighting
    light = new THREE.DirectionalLight(0xffffff, 1.5);
    light.position.set(5, 5, 5);
    scene.add(light);

    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    // Create a default sphere
    createSphere();
    
    // Add loading indicator until fully loaded
    const loadingElement = document.createElement('div');
    loadingElement.className = 'loading-indicator';
    loadingElement.innerHTML = '<div class="spinner"></div><p>Initializing 3D environment...</p>';
    sphereContainer.appendChild(loadingElement);
    
    // Remove loading indicator after a short delay
    setTimeout(() => {
        loadingElement.classList.add('fade-out');
        setTimeout(() => {
            if (loadingElement.parentNode) {
                loadingElement.parentNode.removeChild(loadingElement);
            }
        }, 500);
    }, 1500);

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

    // Create geometry with higher segment count for better displacement
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    
    // Create material
    const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: parseFloat(roughness.value),
        metalness: parseFloat(metalness.value)
    });

    // First make sure all textures are updated
    if (diffuseTexture) diffuseTexture.needsUpdate = true;
    if (normalTexture) normalTexture.needsUpdate = true;
    if (bumpTexture) bumpTexture.needsUpdate = true;
    if (displacementTexture) displacementTexture.needsUpdate = true;

    // Apply textures - explicitly set them
    material.map = diffuseTexture;
    material.normalMap = normalTexture;
    material.bumpMap = bumpTexture;
    material.displacementMap = displacementTexture;
    
    // Update material parameters
    if (normalTexture) {
        material.normalScale.set(parseFloat(normalStrength.value), parseFloat(normalStrength.value));
    }
    
    if (bumpTexture) {
        material.bumpScale = parseFloat(bumpStrength.value);
    }
    
    if (displacementTexture) {
        material.displacementScale = parseFloat(displacementStrength.value);
    }

    // Ensure material knows it needs updating
    material.needsUpdate = true;

    // Create mesh
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    
    console.log("Sphere created with textures:", {
        diffuse: !!material.map,
        normal: !!material.normalMap,
        bump: !!material.bumpMap,
        displacement: !!material.displacementMap
    });
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    // Add automatic rotation to the sphere
    if (sphere) {
        sphere.rotation.y += 0.004;
        sphere.rotation.x += 0.0005;
    }
    
    if (renderer) {
        renderer.render(scene, camera);
    }
}

// Handle window resize
function onWindowResize() {
    if (camera && renderer && sphereContainer) {
        camera.aspect = sphereContainer.clientWidth / sphereContainer.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(sphereContainer.clientWidth, sphereContainer.clientHeight);
    }
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
    
    uploadContent.addEventListener('click', () => {
        if (!hasUploadedImage) {
            textureUpload.click();
        }
    });
    
    // Delete image
    deleteImageBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearImage();
    });
    
    // Sliders
    diffuseStrength.addEventListener('input', updateTextures);
    normalStrength.addEventListener('input', updateTextures);
    bumpStrength.addEventListener('input', updateTextures);
    displacementStrength.addEventListener('input', updateTextures);
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
    downloadDisplacement.addEventListener('click', () => downloadTexture(displacementCanvas, 'displacement-map'));
}

// Clear the uploaded image
function clearImage() {
    // Reset the UI
    previewOverlay.style.display = 'none';
    uploadedImage.src = '';
    hasUploadedImage = false;
    
    // Remove textures from sphere
    if (sphere && sphere.material) {
        sphere.material.map = null;
        sphere.material.normalMap = null;
        sphere.material.bumpMap = null;
        sphere.material.displacementMap = null;
        sphere.material.needsUpdate = true;
    }
    
    // Clear canvases
    clearCanvas(diffuseCanvas);
    clearCanvas(normalCanvas);
    clearCanvas(bumpCanvas);
    clearCanvas(displacementCanvas);
    
    // Reset textures
    diffuseTexture = null;
    normalTexture = null;
    bumpTexture = null;
    displacementTexture = null;
    originalImageData = null;
    
    showNotification('Image removed', 'info');
}

// Clear a canvas
function clearCanvas(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
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
        showNotification('Please upload an image file.', 'error');
        return;
    }
    
    // Show loading state
    uploadArea.classList.add('processing');
    const loadingEl = document.createElement('div');
    loadingEl.className = 'processing-indicator';
    loadingEl.innerHTML = '<div class="spinner"></div><p>Processing texture...</p>';
    document.body.appendChild(loadingEl);
    
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            // Display the image
            uploadedImage.src = e.target.result;
            previewOverlay.style.display = 'flex';
            hasUploadedImage = true;
            
            // Load the image to process it
            const img = new Image();
            img.onload = function() {
                try {
                    // Store original image data
                    originalImageData = getImageData(img);
                    
                    // Generate texture maps
                    generateTextureMaps(img);
                    
                    // Recreate the sphere to apply textures
                    createSphere();
                    
                    // Remove loading state
                    setTimeout(() => {
                        uploadArea.classList.remove('processing');
                        if (loadingEl.parentNode) {
                            loadingEl.parentNode.removeChild(loadingEl);
                        }
                        showNotification('Texture maps generated successfully!', 'success');
                    }, 500);
                } catch (error) {
                    console.error('Error processing image:', error);
                    handleProcessingError(loadingEl);
                }
            };
            img.src = e.target.result;
        } catch (error) {
            console.error('Error loading image:', error);
            handleProcessingError(loadingEl);
        }
    };
    
    reader.onerror = function() {
        handleProcessingError(loadingEl);
    };
    
    reader.readAsDataURL(file);
}

// Handle processing error
function handleProcessingError(loadingEl) {
    uploadArea.classList.remove('processing');
    if (loadingEl && loadingEl.parentNode) {
        loadingEl.parentNode.removeChild(loadingEl);
    }
    showNotification('Error processing image. Please try another image.', 'error');
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'}"></i>
        <p>${message}</p>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Animate out after delay
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 3000);
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
    
    // Generate displacement map
    generateDisplacementMap(originalImageData);
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
    if (renderer) {
        diffuseTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }
    diffuseTexture.needsUpdate = true;
    
    console.log("Diffuse map generated");
}

// Generate normal map with enhanced detail
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
            const scale = 3.0; // Increased scale for stronger normal effect
            const nx = -gx * scale;
            const ny = -gy * scale;
            const nz = 200; // Higher Z value for more pronounced effect
            
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
    
    console.log("Normal map generated");
}

// Generate bump map - simplified algorithm
function generateBumpMap(imageData) {
    // Set canvas dimensions
    bumpCanvas.width = imageData.width;
    bumpCanvas.height = imageData.height;
    
    const ctx = bumpCanvas.getContext('2d');
    const outputData = ctx.createImageData(imageData.width, imageData.height);
    
    // Simple grayscale conversion
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        
        // Calculate brightness (simple grayscale)
        const brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        
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
    
    console.log("Bump map generated");
}

// Generate displacement map - simplified
function generateDisplacementMap(imageData) {
    // Set canvas dimensions
    displacementCanvas.width = imageData.width;
    displacementCanvas.height = imageData.height;
    
    const ctx = displacementCanvas.getContext('2d');
    const outputData = ctx.createImageData(imageData.width, imageData.height);
    
    // Simple grayscale conversion with contrast enhancement
    for (let i = 0; i < imageData.data.length; i += 4) {
        const r = imageData.data[i];
        const g = imageData.data[i + 1];
        const b = imageData.data[i + 2];
        
        // Calculate brightness
        let brightness = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
        
        // Enhance contrast
        brightness = Math.max(0, Math.min(255, (brightness - 128) * 1.2 + 128));
        
        outputData.data[i] = brightness;
        outputData.data[i + 1] = brightness;
        outputData.data[i + 2] = brightness;
        outputData.data[i + 3] = 255; // Alpha
    }
    
    // Put the processed data back to canvas
    ctx.putImageData(outputData, 0, 0);
    
    // Create displacement texture
    displacementTexture = new THREE.Texture(displacementCanvas);
    displacementTexture.needsUpdate = true;
    
    console.log("Displacement map generated");
}

// Apply Gaussian blur to reduce noise
function applyGaussianBlur(data, width, height) {
    const kernel = [
        0.0625, 0.125, 0.0625,
        0.125, 0.25, 0.125,
        0.0625, 0.125, 0.0625
    ];
    
    const result = new Array(width * height);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let sum = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const px = Math.min(width - 1, Math.max(0, x + kx));
                    const py = Math.min(height - 1, Math.max(0, y + ky));
                    
                    const idx = py * width + px;
                    sum += data[idx] * kernel[(ky + 1) * 3 + (kx + 1)];
                }
            }
            
            result[y * width + x] = sum;
        }
    }
    
    return result;
}

// Detect edges for the bump map
function detectEdges(data, width, height) {
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
    
    const result = new Array(width * height);
    
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            let gx = 0;
            let gy = 0;
            
            for (let ky = -1; ky <= 1; ky++) {
                for (let kx = -1; kx <= 1; kx++) {
                    const px = Math.min(width - 1, Math.max(0, x + kx));
                    const py = Math.min(height - 1, Math.max(0, y + ky));
                    
                    const idx = py * width + px;
                    gx += data[idx] * sobelX[(ky + 1) * 3 + (kx + 1)];
                    gy += data[idx] * sobelY[(ky + 1) * 3 + (kx + 1)];
                }
            }
            
            // Calculate the magnitude of the gradient
            const mag = Math.sqrt(gx * gx + gy * gy);
            result[y * width + x] = mag;
        }
    }
    
    // Normalize to 0-255 range
    const max = Math.max(...result);
    if (max > 0) {
        for (let i = 0; i < result.length; i++) {
            result[i] = (result[i] / max) * 255;
        }
    }
    
    return result;
}

// Create a detailed height map with frequency analysis
function createDetailedHeightMap(grayscale, width, height) {
    // Apply multiple levels of frequency detail
    const baseLayer = applyGaussianBlur(grayscale, width, height);
    const detailLayer = new Array(grayscale.length);
    
    // Calculate the detail layer by subtracting the blurred image from the original
    for (let i = 0; i < grayscale.length; i++) {
        detailLayer[i] = Math.max(0, grayscale[i] - baseLayer[i]);
    }
    
    // Normalize detail layer
    const maxDetail = Math.max(...detailLayer);
    if (maxDetail > 0) {
        for (let i = 0; i < detailLayer.length; i++) {
            detailLayer[i] = (detailLayer[i] / maxDetail) * 127; // Scale to mid-range
        }
    }
    
    // Create the final height map by combining layers with an adaptive blend
    const finalMap = new Array(grayscale.length);
    for (let i = 0; i < grayscale.length; i++) {
        // Use base layer as overall shape, add detail
        finalMap[i] = Math.min(255, baseLayer[i] + detailLayer[i]);
    }
    
    // Apply contrast enhancement
    enhanceContrast(finalMap, 1.2);
    
    return finalMap;
}

// Enhance contrast of an array
function enhanceContrast(array, factor) {
    // Find the average value
    const avg = array.reduce((sum, val) => sum + val, 0) / array.length;
    
    // Apply contrast adjustment centered around average
    for (let i = 0; i < array.length; i++) {
        array[i] = Math.max(0, Math.min(255, avg + (array[i] - avg) * factor));
    }
}

// Update textures based on slider values
function updateTextures() {
    // Update display values
    diffuseValue.textContent = parseFloat(diffuseStrength.value).toFixed(1);
    normalValue.textContent = parseFloat(normalStrength.value).toFixed(1);
    bumpValue.textContent = parseFloat(bumpStrength.value).toFixed(1);
    displacementValue.textContent = parseFloat(displacementStrength.value).toFixed(1);
    
    // Check if we need to recreate the sphere to apply updated textures
    if (sphere && sphere.material) {
        // Update normal map intensity
        if (sphere.material.normalMap) {
            sphere.material.normalScale.set(
                parseFloat(normalStrength.value),
                parseFloat(normalStrength.value)
            );
        }
        
        // Update bump map intensity
        if (sphere.material.bumpMap) {
            sphere.material.bumpScale = parseFloat(bumpStrength.value);
        }
        
        // Update displacement map intensity
        if (sphere.material.displacementMap) {
            sphere.material.displacementScale = parseFloat(displacementStrength.value);
        }
        
        // Make sure material updates
        sphere.material.needsUpdate = true;
    } else {
        // If sphere doesn't exist, create it
        createSphere();
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
    if (!hasUploadedImage) {
        showNotification('Please upload a texture first', 'error');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    
    showNotification(`${filename.split('-')[0]} map downloaded`, 'success');
}

// Initialize the application when the DOM is loaded
document.addEventListener('DOMContentLoaded', init);
