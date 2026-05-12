import * as THREE from "three";

const fileInput = document.getElementById("audio-file");
const audioPlayer = document.getElementById("audio-player");
const volumeControl = document.getElementById("volumeControl");
const canvas = document.getElementById("visualizer");

const playPauseBtn = document.getElementById("play-pause");
const currentTimeText = document.getElementById("current-time");
const durationText = document.getElementById("duration");
const progressBar = document.getElementById("progress-bar");
const fileName = document.getElementById("file-name");

let audioContext;
let analyser;
let source;
let dataArray;

// File selection
fileInput.addEventListener("change", () => {
  const file = fileInput.files[0];

  if (!file) return;

  fileName.textContent = file.name;

  const fileURL = URL.createObjectURL(file);
  audioPlayer.src = fileURL;
  audioPlayer.load();
});

volumeControl.addEventListener("input", () => {
  audioPlayer.volume = volumeControl.value;
});

// Three.js setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
  75,
  canvas.clientWidth / canvas.clientHeight,
  0.1,
  1000
);

camera.position.z = 5;

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
});

renderer.setSize(canvas.clientWidth, canvas.clientHeight);

const geometry = new THREE.SphereGeometry(1.5, 32, 32);

const material = new THREE.MeshBasicMaterial({
  color: 0x00ff66,
  wireframe: true,
});

const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

// particle generation
const particleCount = 800;
const particleGeometry = new THREE.BufferGeometry();
const particlePositions = new Float32Array(particleCount * 3);

for (let i = 0; i < particleCount * 3; i++) {
  particlePositions[i] = (Math.random() - 0.5) * 20;
}

particleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(particlePositions, 3)
);

const particleMaterial = new THREE.PointsMaterial({
  color: 0x00ff99,
  size: 0.03,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

// Audio setup
audioPlayer.addEventListener("play", () => {
  if (!audioContext) {
    audioContext = new AudioContext();

    source = audioContext.createMediaElementSource(audioPlayer);
    analyser = audioContext.createAnalyser();

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 256;

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
  }
});

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  let bassLevel = 1;
  let bass = 0;

  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);

    const bass = dataArray[2] || 0;
    bassLevel = 1 + bass / 255;
  }

  sphere.scale.set(bassLevel, bassLevel, bassLevel);

  const time = Date.now() * 0.001;

  sphere.rotation.x += 0.002 + bass * 0.00005;
  sphere.rotation.y = Math.sin(time * 0.5) * 1.5;
  sphere.rotation.z = Math.cos(time * 0.3) * 1.5;

  particles.rotation.y += 0.0008;
  particles.rotation.x += 0.0003;

  renderer.render(scene, camera);
}

animate();

// Resize handling
window.addEventListener("resize", () => {
  const width = canvas.clientWidth;
  const height = canvas.clientHeight;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
});

// Audio controls
function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

playPauseBtn.addEventListener("click", () => {
  if (audioPlayer.paused) {
    audioPlayer.play();
    playPauseBtn.textContent = "❚❚";
  } else {
    audioPlayer.pause();
    playPauseBtn.textContent = "▶";
  }
});

audioPlayer.addEventListener("loadedmetadata", () => {
  durationText.textContent = formatTime(audioPlayer.duration);
});

audioPlayer.addEventListener("timeupdate", () => {
  currentTimeText.textContent = formatTime(audioPlayer.currentTime);

  const progressPercent =
    (audioPlayer.currentTime / audioPlayer.duration) * 100;

  progressBar.value = progressPercent || 0;
});

progressBar.addEventListener("input", () => {
  const seekTime = (progressBar.value / 100) * audioPlayer.duration;
  
  audioPlayer.currentTime = seekTime;
});
