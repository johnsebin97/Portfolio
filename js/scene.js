/* ============================================================
   THREE.JS — 3D HERO SCENE
   Particle field + wireframe icosahedron
   ============================================================ */

(function () {
    'use strict';

    const canvas = document.getElementById('heroCanvas');
    if (!canvas || typeof THREE === 'undefined') return;

    // ---------- SCENE SETUP ----------
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({
        canvas: canvas,
        antialias: true,
        alpha: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x0a0a0f, 1);

    // ---------- PARTICLES ----------
    const particleCount = window.innerWidth < 768 ? 300 : 600;
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        positions[i3] = (Math.random() - 0.5) * 20;
        positions[i3 + 1] = (Math.random() - 0.5) * 20;
        positions[i3 + 2] = (Math.random() - 0.5) * 15;

        velocities[i3] = (Math.random() - 0.5) * 0.003;
        velocities[i3 + 1] = (Math.random() - 0.5) * 0.003;
        velocities[i3 + 2] = (Math.random() - 0.5) * 0.002;

        sizes[i] = Math.random() * 2 + 0.5;
    }

    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    // Custom shader for glowing particles
    const particleMaterial = new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor1: { value: new THREE.Color(0x6c63ff) },
            uColor2: { value: new THREE.Color(0x00d4aa) },
        },
        vertexShader: `
            attribute float size;
            uniform float uTime;
            varying float vAlpha;
            varying vec3 vPos;
            
            void main() {
                vPos = position;
                vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                gl_PointSize = size * (300.0 / -mvPosition.z);
                gl_Position = projectionMatrix * mvPosition;
                
                // Distance-based alpha
                float dist = length(position.xy);
                vAlpha = smoothstep(12.0, 3.0, dist) * 0.6;
            }
        `,
        fragmentShader: `
            uniform vec3 uColor1;
            uniform vec3 uColor2;
            uniform float uTime;
            varying float vAlpha;
            varying vec3 vPos;
            
            void main() {
                // Circular particle shape
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                
                // Soft glow
                float glow = 1.0 - smoothstep(0.0, 0.5, dist);
                glow = pow(glow, 2.0);
                
                // Color mix based on position
                float mixFactor = (sin(vPos.x * 0.3 + uTime * 0.2) + 1.0) * 0.5;
                vec3 color = mix(uColor1, uColor2, mixFactor);
                
                gl_FragColor = vec4(color, glow * vAlpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ---------- WIREFRAME GEOMETRY ----------
    const icoGeometry = new THREE.IcosahedronGeometry(1.8, 1);
    const wireframeMaterial = new THREE.MeshBasicMaterial({
        color: 0x6c63ff,
        wireframe: true,
        transparent: true,
        opacity: 0.08,
    });
    const icosahedron = new THREE.Mesh(icoGeometry, wireframeMaterial);
    icosahedron.position.set(3.5, 0.5, -2);
    scene.add(icosahedron);

    // Secondary smaller geometry
    const octaGeometry = new THREE.OctahedronGeometry(0.8, 0);
    const octaMaterial = new THREE.MeshBasicMaterial({
        color: 0x00d4aa,
        wireframe: true,
        transparent: true,
        opacity: 0.06,
    });
    const octahedron = new THREE.Mesh(octaGeometry, octaMaterial);
    octahedron.position.set(-4, -1.5, -3);
    scene.add(octahedron);

    // ---------- CONNECTING LINES ----------
    const lineCount = 40;
    const linePositions = new Float32Array(lineCount * 6);
    const lineGeometry = new THREE.BufferGeometry();

    function updateLines() {
        const posArr = particleGeometry.attributes.position.array;
        let lineIndex = 0;

        for (let i = 0; i < particleCount && lineIndex < lineCount; i++) {
            for (let j = i + 1; j < particleCount && lineIndex < lineCount; j++) {
                const i3 = i * 3;
                const j3 = j * 3;
                const dx = posArr[i3] - posArr[j3];
                const dy = posArr[i3 + 1] - posArr[j3 + 1];
                const dz = posArr[i3 + 2] - posArr[j3 + 2];
                const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

                if (dist < 2.0) {
                    const li = lineIndex * 6;
                    linePositions[li] = posArr[i3];
                    linePositions[li + 1] = posArr[i3 + 1];
                    linePositions[li + 2] = posArr[i3 + 2];
                    linePositions[li + 3] = posArr[j3];
                    linePositions[li + 4] = posArr[j3 + 1];
                    linePositions[li + 5] = posArr[j3 + 2];
                    lineIndex++;
                }
            }
        }

        lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions.slice(0, lineIndex * 6), 3));
    }

    const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x6c63ff,
        transparent: true,
        opacity: 0.04,
    });
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    // ---------- MOUSE INTERACTION ----------
    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };

    document.addEventListener('mousemove', (e) => {
        mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
        mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    // ---------- SCROLL PERFORMANCE ----------
    let isHeroVisible = true;
    const heroSection = document.getElementById('hero');

    const heroObserver = new IntersectionObserver(
        (entries) => {
            isHeroVisible = entries[0].isIntersecting;
        },
        { threshold: 0 }
    );

    if (heroSection) {
        heroObserver.observe(heroSection);
    }

    // ---------- ANIMATION LOOP ----------
    const clock = new THREE.Clock();
    let frameCount = 0;

    function animate() {
        requestAnimationFrame(animate);

        if (!isHeroVisible) return;

        const elapsed = clock.getElapsedTime();
        frameCount++;

        // Smooth mouse follow
        mouse.x += (mouse.targetX - mouse.x) * 0.02;
        mouse.y += (mouse.targetY - mouse.y) * 0.02;

        // Camera subtle movement
        camera.position.x = mouse.x * 0.3;
        camera.position.y = mouse.y * 0.2;
        camera.lookAt(0, 0, 0);

        // Update particles
        const posArr = particleGeometry.attributes.position.array;
        for (let i = 0; i < particleCount; i++) {
            const i3 = i * 3;
            posArr[i3] += velocities[i3];
            posArr[i3 + 1] += velocities[i3 + 1];
            posArr[i3 + 2] += velocities[i3 + 2];

            // Wrap around boundaries
            if (Math.abs(posArr[i3]) > 10) velocities[i3] *= -1;
            if (Math.abs(posArr[i3 + 1]) > 10) velocities[i3 + 1] *= -1;
            if (Math.abs(posArr[i3 + 2]) > 7.5) velocities[i3 + 2] *= -1;
        }
        particleGeometry.attributes.position.needsUpdate = true;

        // Update shader time
        particleMaterial.uniforms.uTime.value = elapsed;

        // Rotate geometries
        icosahedron.rotation.x = elapsed * 0.1;
        icosahedron.rotation.y = elapsed * 0.15;
        octahedron.rotation.x = elapsed * -0.12;
        octahedron.rotation.z = elapsed * 0.08;

        // Update connecting lines every 3 frames (performance)
        if (frameCount % 3 === 0) {
            updateLines();
        }

        renderer.render(scene, camera);
    }

    animate();

    // ---------- RESIZE ----------
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    });
})();
