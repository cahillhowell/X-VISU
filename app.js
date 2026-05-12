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

const geometry = new THREE.SphereGeometry(1.5, 64, 64);

const material = new THREE.MeshBasicMaterial({
  color: 0x00ff99,
  wireframe: true,
});

const sphere = new THREE.Mesh(geometry, material);
scene.add(sphere);

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

  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);

    const bass = dataArray[2] || 0;
    bassLevel = 1 + bass / 255;
  }

  sphere.scale.set(bassLevel, bassLevel, bassLevel);

  sphere.rotation.x += 0.005;
  sphere.rotation.y += 0.01;

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
