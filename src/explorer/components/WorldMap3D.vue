<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { useElementSize } from '@vueuse/core';
import { TubeGeometry } from 'three';

const props = defineProps<{
    clusters: Array<{
        name: string;
        validators: string[];
        color: string;
        coordinates: [number, number]; // [latitude, longitude]
        connections?: string[];
    }>;
}>();

const emit = defineEmits<{
    (e: 'validatorHover', validator: string): void;
}>();

const containerRef = ref<HTMLElement | null>(null);
const { width, height } = useElementSize(containerRef);

let scene: THREE.Scene;
let camera: THREE.PerspectiveCamera;
let renderer: THREE.WebGLRenderer;
let controls: OrbitControls;
let globe: THREE.Mesh;
let points: THREE.Points;
let rotatingGroup: THREE.Group;
let isRotating = true;
let connectionLines: THREE.Line[] = [];

// Convert lat/long to 3D coordinates
const latLongToVector3 = (lat: number, long: number, radius: number): THREE.Vector3 => {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (long + 180) * (Math.PI / 180);
    const x = -(radius * Math.sin(phi) * Math.cos(theta));
    const z = radius * Math.sin(phi) * Math.sin(theta);
    const y = radius * Math.cos(phi);
    return new THREE.Vector3(x, y, z);
};

// Convert 3D coordinates to lat/long
const vector3ToLatLong = (vector: THREE.Vector3): [number, number] => {
    const radius = Math.sqrt(vector.x * vector.x + vector.y * vector.y + vector.z * vector.z);
    const lat = 90 - (Math.acos(vector.y / radius) * 180 / Math.PI);
    const long = (Math.atan2(vector.z, -vector.x) * 180 / Math.PI) - 180;
    return [lat, long];
};

// Find cluster by validator address
const findClusterByValidator = (validator: string) => {
    return props.clusters.find(cluster => 
        cluster.validators.some(v => v.toLowerCase() === validator.toLowerCase())
    );
};

const startRotating = () => {
    isRotating = true;
};

// Rotate globe to show specific validator
const rotateToValidator = (validator: string) => {
    const cluster = findClusterByValidator(validator);
    if (!cluster) return;

    const [targetLat, targetLong] = cluster.coordinates;
    
    // Get current camera position in lat/long
    const currentPosition = camera.position.clone();
    const [currentLat, currentLong] = vector3ToLatLong(currentPosition);
    
    // Adjust longitude to take the shortest path
    let adjustedTargetLong = targetLong;
    const longDiff = targetLong - currentLong;
    if (Math.abs(longDiff) > 180) {
        if (longDiff > 0) {
            adjustedTargetLong -= 360;
        } else {
            adjustedTargetLong += 360;
        }
    }
    
    const duration = 1500; // 1.5 seconds
    const startTime = Date.now();
    isRotating = false;
    rotatingGroup.rotation.y = 0;

    const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease in-out function
        const easeProgress = progress < 0.5
            ? 2 * progress * progress
            : 1 - Math.pow(-2 * progress + 2, 2) / 2;

        // Great circle interpolation
        const lat = currentLat + (targetLat - currentLat) * easeProgress;
        const long = currentLong + (adjustedTargetLong - currentLong) * easeProgress;
        
        // Normalize longitude to [-180, 180]
        const normalizedLong = ((long + 180) % 360 + 360) % 360 - 180;
        
        // Calculate camera position with slight offset from surface
        const cameraOffset = 10;
        const position = latLongToVector3(lat, normalizedLong, cameraOffset);
        camera.position.copy(position);
        
        // Look at the target point on the surface
        const targetPosition = latLongToVector3(targetLat, targetLong, 5.1);
        camera.lookAt(targetPosition);

        if (progress < 1) {
            requestAnimationFrame(animate);
        }
    };

    animate();
};

// Expose the method to parent component
defineExpose({
    rotateToValidator,
    startRotating
});

// Create connection lines between clusters
const createConnectionLines = () => {
    // Remove existing connection lines
    connectionLines.forEach(line => rotatingGroup.remove(line));
    connectionLines = [];

    // Create lines based on cluster connections
    for (let i = 0; i < props.clusters.length; i++) {
        const cluster1 = props.clusters[i];
        if (!cluster1.connections) continue;

        for (const targetName of cluster1.connections) {
            const cluster2 = props.clusters.find(c => c.name === targetName);
            if (!cluster2) continue;

            // Calculate intermediate points using great circle interpolation
            let startLat = cluster1.coordinates[0];
            let startLong = cluster1.coordinates[1];
            let endLat = cluster2.coordinates[0];
            let endLong = cluster2.coordinates[1];

            // Adjust longitude to take the shortest path
            const longDiff = endLong - startLong;
            if (Math.abs(longDiff) > 180) {
                if (longDiff > 0) {
                    endLong -= 360;
                } else {
                    endLong += 360;
                }
            }

            const points: THREE.Vector3[] = [];
            const steps = 50;
            for (let t = 0; t <= 1; t += 1/steps) {
                // Great circle interpolation
                const lat = startLat + (endLat - startLat) * t;
                const long = startLong + (endLong - startLong) * t;
                // Normalize longitude to [-180, 180]
                const normalizedLong = ((long + 180) % 360 + 360) % 360 - 180;
                
                // Add a small offset to the radius based on the position in the curve
                const radius = 5.1 + 0.1 * Math.sin(t * Math.PI); // Creates a smooth arc
                points.push(latLongToVector3(lat, normalizedLong, radius));
            }

            // Create a line geometry
            const geometry = new THREE.BufferGeometry().setFromPoints(points);
            const material = new THREE.LineBasicMaterial({
                color: 0xffff00,
                linewidth: 2,
                transparent: true,
                opacity: 0.8
            });

            const line = new THREE.Line(geometry, material);
            rotatingGroup.add(line);
            connectionLines.push(line);
        }
    }
};

const init = () => {
    if (!containerRef.value) return;

    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(45, width.value / height.value, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width.value, height.value);
    renderer.setClearColor(0xffffff);
    containerRef.value.appendChild(renderer.domElement);

    // Controls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;

    // Create rotating group
    rotatingGroup = new THREE.Group();
    scene.add(rotatingGroup);

    // Load Earth textures
    const textureLoader = new THREE.TextureLoader();
    const earthTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
    const bumpMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_normal_2048.jpg');
    const specularMap = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_specular_2048.jpg');
    const cloudsTexture = textureLoader.load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_clouds_1024.png');

    // Globe
    const geometry = new THREE.SphereGeometry(5, 64, 64);
    const material = new THREE.MeshPhongMaterial({
        map: earthTexture,
        bumpMap: bumpMap,
        bumpScale: 0.05,
        specularMap: specularMap,
        specular: new THREE.Color('grey'),
        shininess: 5
    });
    globe = new THREE.Mesh(geometry, material);
    rotatingGroup.add(globe);

    // Add clouds
    const cloudsGeometry = new THREE.SphereGeometry(5.1, 64, 64);
    const cloudsMaterial = new THREE.MeshPhongMaterial({
        map: cloudsTexture,
        transparent: true,
        opacity: 0.4
    });
    const clouds = new THREE.Mesh(cloudsGeometry, cloudsMaterial);
    rotatingGroup.add(clouds);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 3);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1.2);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Validator points
    const pointsGeometry = new THREE.BufferGeometry();
    const pointsMaterial = new THREE.PointsMaterial({
        size: 0.2,
        vertexColors: true
    });

    const positions: number[] = [];
    const colors: number[] = [];

    props.clusters.forEach(cluster => {
        const [lat, long] = cluster.coordinates;
        const position = latLongToVector3(lat, long, 5.1);
        positions.push(position.x, position.y, position.z);

        const color = new THREE.Color(cluster.color);
        colors.push(color.r, color.g, color.b);
    });

    pointsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    pointsGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    points = new THREE.Points(pointsGeometry, pointsMaterial);
    rotatingGroup.add(points);

    // Create connection lines
    createConnectionLines();

    // Camera position
    const cameraDistance = 10;
    const latitude = 45; // 45e parallèle nord
    const longitude = 0; // Méridien de Greenwich
    const cameraPosition = latLongToVector3(latitude, longitude, cameraDistance);
    camera.position.copy(cameraPosition);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
};

const animate = () => {
    requestAnimationFrame(animate);
    controls.update();
    if (isRotating) {
        rotatingGroup.rotation.y += 0.001;
    }
    
    renderer.render(scene, camera);
};

const handleResize = () => {
    if (!containerRef.value) return;
    camera.aspect = width.value / height.value;
    camera.updateProjectionMatrix();
    renderer.setSize(width.value, height.value);
};

onMounted(() => {
    init();
    animate();
    window.addEventListener('resize', handleResize);
});

onUnmounted(() => {
    window.removeEventListener('resize', handleResize);
    if (containerRef.value) {
        containerRef.value.removeChild(renderer.domElement);
    }
    renderer.dispose();
});
</script>

<template>
    <div ref="containerRef" class="w-full h-[500px] rounded-lg overflow-hidden"></div>
</template> 