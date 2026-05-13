import * as THREE from "three";

const fileInput = document.getElementById("audio-file");
const audioPlayer = document.getElementById("audio-player");
const volumeControl = document.getElementById("volumeControl");
const canvas = document.getElementById("visualizer");

const playPauseBtn = document.getElementById("play-pause");
const nextTrackBtn = document.getElementById("next-track");
const prevTrackBtn = document.getElementById("prev-track");

const currentTimeText = document.getElementById("current-time");
const durationText = document.getElementById("duration");
const progressBar = document.getElementById("progress-bar");
const fileName = document.getElementById("file-name");
const playlistEl = document.getElementById("playlist");

let playlist = [];
let currentTrackIndex = 0;

let audioContext;
let analyser;
let source;
let dataArray;

// --------------------
// Playlist / File Setup
// --------------------
fileInput.addEventListener("change", () => {
  const files = Array.from(fileInput.files);

  if (!files.length) return;

  playlist = files.map((file) => ({
    name: file.name,
    url: URL.createObjectURL(file),
  }));

  currentTrackIndex = 0;
  loadTrack(currentTrackIndex);
  renderPlaylist();
});

function renderPlaylist() {
  playlistEl.innerHTML = "";

  if (!playlist.length) {
    const emptyItem = document.createElement("li");
    emptyItem.className = "empty-track";
    emptyItem.textContent = "No tracks loaded";
    playlistEl.appendChild(emptyItem);
    return;
  }

  playlist.forEach((track, index) => {
    const trackItem = document.createElement("li");
    trackItem.className = "track-item";

    if (index === currentTrackIndex) {
      trackItem.classList.add("active");
    }

    trackItem.textContent = track.name;

    trackItem.addEventListener("click", () => {
      currentTrackIndex = index;
      loadTrack(currentTrackIndex);
      playCurrentTrack();
    });

    playlistEl.appendChild(trackItem);
  });
}

function loadTrack(index) {
  if (!playlist[index]) return;

  audioPlayer.src = playlist[index].url;
  audioPlayer.load();

  fileName.textContent = playlist[index].name;
  currentTimeText.textContent = "0:00";
  durationText.textContent = "0:00";
  progressBar.value = 0;
  playPauseBtn.textContent = "▶";

  renderPlaylist();
}

function playCurrentTrack() {
  if (!playlist.length) return;

  audioPlayer.play();
  playPauseBtn.textContent = "❚❚";
}

function playNextTrack() {
  if (!playlist.length) return;

  currentTrackIndex = (currentTrackIndex + 1) % playlist.length;
  loadTrack(currentTrackIndex);
  playCurrentTrack();
}

function playPreviousTrack() {
  if (!playlist.length) return;

  currentTrackIndex =
    (currentTrackIndex - 1 + playlist.length) % playlist.length;

  loadTrack(currentTrackIndex);
  playCurrentTrack();
}

// --------------------
// Audio Controls
// --------------------
playPauseBtn.addEventListener("click", () => {
  if (!playlist.length) return;

  if (audioPlayer.paused) {
    playCurrentTrack();
  } else {
    audioPlayer.pause();
    playPauseBtn.textContent = "▶";
  }
});

nextTrackBtn.addEventListener("click", playNextTrack);
prevTrackBtn.addEventListener("click", playPreviousTrack);
audioPlayer.addEventListener("ended", playNextTrack);

volumeControl.addEventListener("input", () => {
  audioPlayer.volume = volumeControl.value;
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
  if (!audioPlayer.duration) return;

  const seekTime = (progressBar.value / 100) * audioPlayer.duration;
  audioPlayer.currentTime = seekTime;
});

function formatTime(seconds) {
  if (!seconds || Number.isNaN(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes}:${secs.toString().padStart(2, "0")}`;
}

// --------------------
// Audio Analyzer Setup
// --------------------
audioPlayer.addEventListener("play", () => {
  if (!audioContext) {
    audioContext = new AudioContext();

    source = audioContext.createMediaElementSource(audioPlayer);
    analyser = audioContext.createAnalyser();

    source.connect(analyser);
    analyser.connect(audioContext.destination);

    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.82;

    const bufferLength = analyser.frequencyBinCount;
    dataArray = new Uint8Array(bufferLength);
  }

  if (audioContext.state === "suspended") {
    audioContext.resume();
  }
});

// --------------------
// Three.js Visualizer
// --------------------
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
  alpha: true,
});

renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Outer transparent shell
const outerShellGeometry = new THREE.SphereGeometry(1.85, 12, 12);

const outerShellMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ff99,
  wireframe: true,
  transparent: true,
  opacity: 0.08,
});

const outerShell = new THREE.Mesh(outerShellGeometry, outerShellMaterial);
scene.add(outerShell);

// Inner color-changing shell
const innerShellGeometry = new THREE.SphereGeometry(1.25, 48, 48);

const innerShellMaterial = new THREE.MeshBasicMaterial({
  color: 0x39ff14,
  wireframe: true,
  transparent: true,
  opacity: 0.58,
});

const innerShell = new THREE.Mesh(innerShellGeometry, innerShellMaterial);
scene.add(innerShell);

// Ferrofluid-style spike core
const spikeCoreGeometry = new THREE.IcosahedronGeometry(0.72, 5);
const originalSpikePositions = spikeCoreGeometry.attributes.position.array.slice();

const spikeCoreMaterial = new THREE.MeshBasicMaterial({
  color: 0xb6ff00,
  wireframe: true,
  transparent: true,
  opacity: 0.95,
});

const spikeCore = new THREE.Mesh(spikeCoreGeometry, spikeCoreMaterial);
scene.add(spikeCore);

// Small bright center
const centerGeometry = new THREE.SphereGeometry(0.22, 24, 24);

const centerMaterial = new THREE.MeshBasicMaterial({
  color: 0xdfff7f,
  transparent: true,
  opacity: 0.9,
});

const centerOrb = new THREE.Mesh(centerGeometry, centerMaterial);
scene.add(centerOrb);

// Background particles
const particleCount = 1600;
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
  transparent: true,
  opacity: 0.65,
});

const particles = new THREE.Points(particleGeometry, particleMaterial);
scene.add(particles);

function getFrequencyAverage(start, end) {
  if (!dataArray) return 0;

  let total = 0;
  let count = 0;

  for (let i = start; i <= end; i++) {
    total += dataArray[i] || 0;
    count++;
  }

  return total / count;
}

// Animation loop
function animate() {
  requestAnimationFrame(animate);

  let bass = 0;
  let mids = 0;
  let highs = 0;

  if (analyser && dataArray) {
    analyser.getByteFrequencyData(dataArray);

    bass = getFrequencyAverage(2, 10);
    mids = getFrequencyAverage(18, 60);
    highs = getFrequencyAverage(90, 180);
  }

  const bassLevel = bass / 255;
  const midLevel = mids / 255;
  const highLevel = highs / 255;

  const time = Date.now() * 0.001;

  // Outer shell: slow breathing container
  const outerPulse = 1 + bassLevel * 0.18;
  outerShell.scale.set(outerPulse, outerPulse, outerPulse);

  outerShell.rotation.x += 0.0015;
  outerShell.rotation.y += 0.0025;
  outerShell.rotation.z += 0.0008;

  outerShell.material.opacity = 0.05 + bassLevel * 0.08;

  // Inner shell: reacts to mids and changes color
  const innerPulse = 1 + midLevel * 0.45;
  innerShell.scale.set(innerPulse, innerPulse, innerPulse);

  innerShell.rotation.x -= 0.003 + midLevel * 0.01;
  innerShell.rotation.y += 0.004 + midLevel * 0.012;

  const midHue = 0.28 + midLevel * 0.34;
  innerShell.material.color.setHSL(midHue, 1, 0.55);
  innerShell.material.opacity = 0.42 + midLevel * 0.35;

  // Ferrofluid core: high-frequency spike deformation
  const positions = spikeCoreGeometry.attributes.position.array;

  for (let i = 0; i < positions.length; i += 3) {
    const ox = originalSpikePositions[i];
    const oy = originalSpikePositions[i + 1];
    const oz = originalSpikePositions[i + 2];

    const vertex = new THREE.Vector3(ox, oy, oz).normalize();

    const spikeNoise =
      Math.sin(vertex.x * 18 + time * 7) *
      Math.cos(vertex.y * 14 + time * 5) *
      Math.sin(vertex.z * 16 + time * 6);

    const sharpPeaks = Math.max(0, spikeNoise);
    const spikeAmount = 1 + highLevel * 1.8 * sharpPeaks + highLevel * 0.35;

    positions[i] = ox * spikeAmount;
    positions[i + 1] = oy * spikeAmount;
    positions[i + 2] = oz * spikeAmount;
  }

  spikeCoreGeometry.attributes.position.needsUpdate = true;
  spikeCoreGeometry.computeVertexNormals();

  const spikePulse = 1 + highLevel * 0.55;
  spikeCore.scale.set(spikePulse, spikePulse, spikePulse);

  spikeCore.rotation.x += 0.006 + highLevel * 0.025;
  spikeCore.rotation.y -= 0.008 + highLevel * 0.03;
  spikeCore.rotation.z += 0.004;

  spikeCore.material.opacity = 0.65 + highLevel * 0.35;
  spikeCore.material.color.setHSL(0.22 - highLevel * 0.08, 1, 0.55);

  // Center energy point
  const centerPulse = 1 + highLevel * 1.25;
  centerOrb.scale.set(centerPulse, centerPulse, centerPulse);
  centerOrb.material.opacity = 0.5 + highLevel * 0.45;

  // Particle field
  particles.rotation.y += 0.0008 + bassLevel * 0.0015;
  particles.rotation.x += 0.0003 + highLevel * 0.001;

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