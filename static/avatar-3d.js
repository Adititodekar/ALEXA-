/**
 * NOVA 3D Animated Robot Avatar (Three.js WebGL)
 * Faithfully recreates the friendly white and cyan 3D robot character from the user's image:
 * - Rounded glossy white head with sleek top ridge
 * - Symmetric curved dark-blue visor face centered perfectly on the front
 * - Dual neon cyan digital glowing smiling eyes (^ ^)
 * - Teal earfin headphones and chest crest badge
 * - Articulated waving right arm and gentle floating levitation
 * - Interactive mouse gaze tracking, speech sync, and eye blinking
 */

(function () {
    let scene, camera, renderer;
    let robotGroup, headGroup, visorMesh, leftEye, rightEye, mouthBar;
    let rightArmGroup, leftEarfin, rightEarfin, shadowMesh;
    let mouseX = 0, mouseY = 0;
    let targetHeadRotY = 0, targetHeadRotX = 0;
    let isSpeaking = false;
    let isListening = false;
    let isEmergency = false;
    let clock;
    let eyeBlinkTimer = 0;
    let waveTime = 0;
    let avatarCanvasContainer;
    let isInitialized = false;

    function init3DAvatar(containerId) {
        if (isInitialized) return;
        avatarCanvasContainer = document.getElementById(containerId);
        if (!avatarCanvasContainer || typeof THREE === "undefined") {
            return;
        }

        const width = avatarCanvasContainer.clientWidth || 320;
        const height = avatarCanvasContainer.clientHeight || 260;

        clock = new THREE.Clock();

        // 1. Scene & Camera
        scene = new THREE.Scene();
        camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
        camera.position.set(0, 0.18, 4.6);

        // 2. Safe WebGL Renderer
        try {
            renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: "high-performance"
            });
        } catch (e) {
            console.warn("WebGL not supported; keeping animated fallback image.", e);
            return;
        }

        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.domElement.style.width = "100%";
        renderer.domElement.style.height = "100%";
        renderer.domElement.style.maxWidth = "320px";
        renderer.domElement.style.maxHeight = "260px";
        renderer.domElement.style.display = "block";
        renderer.domElement.style.margin = "0 auto";

        // 3. High-End Studio Lighting (Matches user Pixar-style 3D render)
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.1);
        scene.add(ambientLight);

        // Warm Key Light (top right)
        const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
        keyLight.position.set(3, 4, 3.5);
        scene.add(keyLight);

        // Cyan Fill Light (bottom left)
        const fillLight = new THREE.DirectionalLight(0x00d4ff, 0.9);
        fillLight.position.set(-3.5, -1, 2.5);
        scene.add(fillLight);

        // Back Rim Light (creates crisp edge highlights on white shell)
        const rimLight = new THREE.DirectionalLight(0x00f0ff, 1.2);
        rimLight.position.set(0, 3, -3);
        scene.add(rimLight);

        // Front Soft Fill
        const frontFill = new THREE.PointLight(0xffffff, 0.6, 8);
        frontFill.position.set(0, 0.5, 3.5);
        scene.add(frontFill);

        // 4. Glossy Pixar-grade Materials
        const whiteBodyMat = new THREE.MeshStandardMaterial({
            color: 0xfafcff,
            metalness: 0.05,
            roughness: 0.18
        });

        const tealAccentMat = new THREE.MeshStandardMaterial({
            color: 0x0db8ca,
            metalness: 0.12,
            roughness: 0.22,
            emissive: 0x05626b,
            emissiveIntensity: 0.25
        });

        const darkAccentMat = new THREE.MeshStandardMaterial({
            color: 0x142036,
            metalness: 0.2,
            roughness: 0.4
        });

        // Visor: Glossy Dark Navy Glass
        const visorMat = new THREE.MeshStandardMaterial({
            color: 0x081738,
            metalness: 0.15,
            roughness: 0.12
        });

        // Digital Cyan Glowing Eyes
        const cyanGlowMat = new THREE.MeshBasicMaterial({
            color: 0x00f6ff
        });

        // 5. Robot Assembly
        robotGroup = new THREE.Group();
        scene.add(robotGroup);

        // --- A. HEAD ---
        headGroup = new THREE.Group();
        headGroup.position.set(0, 0.42, 0);
        robotGroup.add(headGroup);

        // Head Shell (smooth glossy sphere, slightly wider for cute anime proportions)
        const headGeo = new THREE.SphereGeometry(0.88, 64, 48);
        headGeo.scale(1.02, 0.95, 0.92);
        const headMesh = new THREE.Mesh(headGeo, whiteBodyMat);
        headGroup.add(headMesh);

        // Head Top Ridge Notch (smooth rounded pill)
        const topNotchGeo = new THREE.CylinderGeometry(0.11, 0.13, 0.28, 32);
        const topNotch = new THREE.Mesh(topNotchGeo, whiteBodyMat);
        topNotch.rotation.z = Math.PI / 2;
        topNotch.position.set(0, 0.86, 0.04);
        headGroup.add(topNotch);

        // --- B. CURVED FRONT VISOR (Symmetric & Centered on +Z) ---
        // In Three.js: front is phi = pi/2. We span phi symmetrically across front:
        const phiSpan = Math.PI * 0.65;
        const phiStart = (Math.PI / 2) - (phiSpan / 2); // 0.55 rad
        const thetaSpan = Math.PI * 0.40;
        const thetaStart = (Math.PI / 2) - (thetaSpan / 2); // 0.94 rad

        const visorGeo = new THREE.SphereGeometry(
            0.895, // Sits just 0.015 above head surface (0.88)
            48,
            32,
            phiStart,
            phiSpan,
            thetaStart,
            thetaSpan
        );
        visorGeo.scale(1.025, 0.96, 0.935);
        visorMesh = new THREE.Mesh(visorGeo, visorMat);
        visorMesh.position.set(0, 0, 0); // Perfectly concentric with head!
        headGroup.add(visorMesh);

        // --- C. GLOWING CYAN DIGITAL SMILING EYES (^ ^) ---
        // Torus arc with opening downward creating happy ^ arches:
        const eyeArcGeo = new THREE.TorusGeometry(0.12, 0.038, 16, 32, Math.PI * 0.92);

        // Left Eye
        leftEye = new THREE.Mesh(eyeArcGeo, cyanGlowMat);
        leftEye.position.set(-0.24, 0.04, 0.82);
        leftEye.rotation.x = -0.12;
        leftEye.rotation.z = 0.08;
        headGroup.add(leftEye);

        // Right Eye
        rightEye = new THREE.Mesh(eyeArcGeo, cyanGlowMat);
        rightEye.position.set(0.24, 0.04, 0.82);
        rightEye.rotation.x = -0.12;
        rightEye.rotation.z = -0.08;
        headGroup.add(rightEye);

        // Digital Voice Visualizer Line (inside visor, pulses with speech)
        const mouthGeo = new THREE.BoxGeometry(0.22, 0.03, 0.02);
        mouthBar = new THREE.Mesh(mouthGeo, cyanGlowMat);
        mouthBar.position.set(0, -0.16, 0.83);
        mouthBar.scale.set(0.2, 0.4, 1);
        mouthBar.visible = false;
        headGroup.add(mouthBar);

        // --- D. TEAL EARFIN HEADPHONES ---
        const earBaseGeo = new THREE.CylinderGeometry(0.25, 0.27, 0.22, 32);

        // Left Ear Base
        const leftEarBase = new THREE.Mesh(earBaseGeo, whiteBodyMat);
        leftEarBase.rotation.z = Math.PI / 2;
        leftEarBase.position.set(-0.86, 0.08, 0);
        headGroup.add(leftEarBase);

        const leftEarInset = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 32), darkAccentMat);
        leftEarInset.rotation.z = Math.PI / 2;
        leftEarInset.position.set(-0.975, 0.08, 0);
        headGroup.add(leftEarInset);

        // Left Teal Fin (swept upward and back)
        const finGeo = new THREE.BoxGeometry(0.10, 0.46, 0.20);
        leftEarfin = new THREE.Mesh(finGeo, tealAccentMat);
        leftEarfin.position.set(-0.92, 0.36, -0.04);
        leftEarfin.rotation.z = -0.18;
        leftEarfin.rotation.x = -0.14;
        headGroup.add(leftEarfin);

        // Right Ear Base
        const rightEarBase = new THREE.Mesh(earBaseGeo, whiteBodyMat);
        rightEarBase.rotation.z = Math.PI / 2;
        rightEarBase.position.set(0.86, 0.08, 0);
        headGroup.add(rightEarBase);

        const rightEarInset = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.02, 32), darkAccentMat);
        rightEarInset.rotation.z = Math.PI / 2;
        rightEarInset.position.set(0.975, 0.08, 0);
        headGroup.add(rightEarInset);

        // Right Teal Fin
        rightEarfin = new THREE.Mesh(finGeo, tealAccentMat);
        rightEarfin.position.set(0.92, 0.36, -0.04);
        rightEarfin.rotation.z = 0.18;
        rightEarfin.rotation.x = -0.14;
        headGroup.add(rightEarfin);

        // --- E. FLOATING BODY ---
        const bodyGeo = new THREE.SphereGeometry(0.68, 48, 36);
        bodyGeo.scale(0.88, 1.08, 0.76);
        const bodyMesh = new THREE.Mesh(bodyGeo, whiteBodyMat);
        bodyMesh.position.set(0, -0.66, -0.02);
        robotGroup.add(bodyMesh);

        // Dark Neck Seam Ring
        const neckRingGeo = new THREE.TorusGeometry(0.44, 0.035, 16, 32);
        const neckRing = new THREE.Mesh(neckRingGeo, darkAccentMat);
        neckRing.rotation.x = Math.PI / 2;
        neckRing.position.set(0, -0.12, 0);
        robotGroup.add(neckRing);

        // Chest Shield Badge (Teal crest from user image)
        const crestGeo = new THREE.CylinderGeometry(0.22, 0.14, 0.28, 3);
        const crestMesh = new THREE.Mesh(crestGeo, tealAccentMat);
        crestMesh.rotation.x = 0.20;
        crestMesh.rotation.y = Math.PI;
        crestMesh.position.set(0, -0.58, 0.45);
        robotGroup.add(crestMesh);

        // Slim Waistline Seam
        const waistRingGeo = new THREE.TorusGeometry(0.42, 0.025, 16, 32);
        const waistRing = new THREE.Mesh(waistRingGeo, darkAccentMat);
        waistRing.rotation.x = Math.PI / 2;
        waistRing.position.set(0, -0.74, -0.01);
        robotGroup.add(waistRing);

        // --- F. ARTICULATED WAVING ARM (Right Hand from user image) ---
        rightArmGroup = new THREE.Group();
        rightArmGroup.position.set(0.60, -0.40, 0.06);
        robotGroup.add(rightArmGroup);

        const rightArmGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.42, 24);
        const rightArm = new THREE.Mesh(rightArmGeo, whiteBodyMat);
        rightArm.position.set(0.20, 0.20, 0.08);
        rightArm.rotation.z = -0.55;
        rightArmGroup.add(rightArm);

        // Rounded Mitten Hand
        const handGeo = new THREE.SphereGeometry(0.14, 24, 24);
        handGeo.scale(1, 1.25, 0.75);
        const rightHand = new THREE.Mesh(handGeo, whiteBodyMat);
        rightHand.position.set(0.38, 0.42, 0.12);
        rightHand.rotation.z = -0.4;
        rightArmGroup.add(rightHand);

        // Left Arm (relaxed against body)
        const leftArmGeo = new THREE.CylinderGeometry(0.10, 0.10, 0.36, 24);
        const leftArm = new THREE.Mesh(leftArmGeo, whiteBodyMat);
        leftArm.position.set(-0.64, -0.56, 0);
        leftArm.rotation.z = 0.32;
        robotGroup.add(leftArm);

        // --- G. FLOATING SHADOW / CYAN AURA GLOW ---
        const shadowGeo = new THREE.CircleGeometry(0.62, 32);
        const shadowMat = new THREE.MeshBasicMaterial({
            color: 0x00f0ff,
            transparent: true,
            opacity: 0.20
        });
        shadowMesh = new THREE.Mesh(shadowGeo, shadowMat);
        shadowMesh.rotation.x = -Math.PI / 2;
        shadowMesh.position.set(0, -1.48, 0);
        scene.add(shadowMesh);

        // 6. Mount Canvas & Hide Image Fallback
        const fallback = document.getElementById("avatarFallback");
        if (fallback) fallback.style.display = "none";
        avatarCanvasContainer.appendChild(renderer.domElement);
        isInitialized = true;

        // 7. Event Listeners
        window.addEventListener("resize", onWindowResize);
        window.addEventListener("mousemove", onMouseMove);

        // Click on 3D canvas triggers greeting / mic
        avatarCanvasContainer.addEventListener("click", () => {
            waveTime = 2.5; // Trigger waving greeting
            if (typeof window.triggerAvatarInteraction === "function") {
                window.triggerAvatarInteraction();
            }
        });

        // Start animation loop
        animate();
        console.log("3D Animated Nova Robot Avatar mounted successfully with Pixar-grade styling.");
    }

    function onMouseMove(e) {
        const rect = avatarCanvasContainer ? avatarCanvasContainer.getBoundingClientRect() : null;
        if (!rect) return;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        mouseX = (e.clientX - centerX) / (window.innerWidth / 2);
        mouseY = (e.clientY - centerY) / (window.innerHeight / 2);

        targetHeadRotY = Math.max(-0.45, Math.min(0.45, mouseX * 0.7));
        targetHeadRotX = Math.max(-0.35, Math.min(0.35, mouseY * 0.5));
    }

    function onWindowResize() {
        if (!avatarCanvasContainer || !camera || !renderer) return;
        const width = avatarCanvasContainer.clientWidth || 320;
        const height = avatarCanvasContainer.clientHeight || 260;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height);
    }

    function animate() {
        requestAnimationFrame(animate);

        const delta = clock ? clock.getDelta() : 0.016;
        const elapsed = clock ? clock.getElapsedTime() : Date.now() * 0.001;

        // 1. Smooth Head Gaze Tracking
        if (headGroup) {
            headGroup.rotation.y += (targetHeadRotY - headGroup.rotation.y) * 0.08;
            headGroup.rotation.x += (targetHeadRotX - headGroup.rotation.x) * 0.08;
        }

        // 2. Natural Floating / Hovering Animation
        if (robotGroup) {
            const hoverFreq = isSpeaking ? 3.5 : (isListening ? 2.5 : 1.8);
            const hoverAmp = isSpeaking ? 0.08 : 0.05;
            robotGroup.position.y = Math.sin(elapsed * hoverFreq) * hoverAmp;
            robotGroup.rotation.z = Math.sin(elapsed * 1.2) * 0.025;

            // Listening: Leans forward toward user
            if (isListening) {
                robotGroup.position.z += (0.25 - robotGroup.position.z) * 0.1;
                robotGroup.rotation.x += (0.12 - robotGroup.rotation.x) * 0.1;
            } else {
                robotGroup.position.z += (0 - robotGroup.position.z) * 0.08;
                robotGroup.rotation.x += (0 - robotGroup.rotation.x) * 0.08;
            }
        }

        // 3. Ground Shadow / Glow Pulse
        if (shadowMesh && robotGroup) {
            const scale = 1 - (robotGroup.position.y * 1.5);
            shadowMesh.scale.set(scale, scale, scale);
            shadowMesh.material.opacity = isEmergency ? (0.35 + Math.sin(elapsed * 8) * 0.2) : (0.18 - robotGroup.position.y * 0.08);
            if (isEmergency) {
                shadowMesh.material.color.setHex(0xff1144);
            } else {
                shadowMesh.material.color.setHex(0x00f0ff);
            }
        }

        // 4. Arm Waving Animation
        if (rightArmGroup) {
            if (waveTime > 0) {
                waveTime -= delta;
                rightArmGroup.rotation.z = -0.3 + Math.sin(elapsed * 12) * 0.45;
                rightArmGroup.rotation.x = Math.cos(elapsed * 10) * 0.25;
            } else {
                const idleWave = Math.sin(elapsed * 1.6) * 0.08;
                rightArmGroup.rotation.z += (idleWave - rightArmGroup.rotation.z) * 0.1;
                rightArmGroup.rotation.x += (0 - rightArmGroup.rotation.x) * 0.1;
            }
        }

        // 5. Eye Blinking & Smiling Expressions
        eyeBlinkTimer += delta;
        if (eyeBlinkTimer > 4.2) {
            if (leftEye && rightEye) {
                leftEye.scale.y = 0.1;
                rightEye.scale.y = 0.1;
            }
            if (eyeBlinkTimer > 4.35) {
                eyeBlinkTimer = 0;
            }
        } else if (leftEye && rightEye) {
            if (isSpeaking) {
                const eyeBounce = 1 + Math.sin(elapsed * 14) * 0.2;
                leftEye.scale.y = eyeBounce;
                rightEye.scale.y = eyeBounce;
            } else {
                leftEye.scale.y = 1;
                rightEye.scale.y = 1;
            }
        }

        // 6. Speaking Visualizer Wave on Visor
        if (mouthBar) {
            if (isSpeaking) {
                mouthBar.visible = true;
                const mouthWidth = 0.4 + Math.abs(Math.sin(elapsed * 14)) * 0.6;
                const mouthHeight = 0.5 + Math.abs(Math.cos(elapsed * 12)) * 1.2;
                mouthBar.scale.set(mouthWidth, mouthHeight, 1);
            } else {
                mouthBar.visible = isListening;
                mouthBar.scale.set(0.3, 0.4, 1);
            }
        }

        if (renderer && scene && camera) {
            renderer.render(scene, camera);
        }
    }

    // Public API for Dashboard Integration
    window.setNovaAvatarState = function (state) {
        if (state === "speaking") {
            isSpeaking = true;
            isListening = false;
            isEmergency = false;
        } else if (state === "listening") {
            isSpeaking = false;
            isListening = true;
            isEmergency = false;
        } else if (state === "emergency") {
            isSpeaking = false;
            isListening = false;
            isEmergency = true;
        } else {
            isSpeaking = false;
            isListening = false;
            isEmergency = false;
        }
    };

    window.triggerAvatarWave = function (seconds = 3) {
        waveTime = seconds;
    };

    // Auto-init when DOM and Three.js are ready
    function tryInit() {
        if (typeof THREE !== "undefined" && document.getElementById("avatar3DContainer")) {
            init3DAvatar("avatar3DContainer");
        } else {
            setTimeout(tryInit, 120);
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", tryInit);
    } else {
        tryInit();
    }
})();
