const fileInput = document.getElementById("audio-file");
const audioPlayer = document.getElementById("audio-player");

// User chooses file 
fileInput.addEventListener("change", () => {
    const file = fileInput.files[0];
    const fileName = document.getElementById("file-name");

    if (!file) {
        return;
    }

    fileName.textContent = file.name;

    const fileURL = URL.createObjectURL(file);

    audioPlayer.src = fileURL;
    audioPlayer.load();
});


//canvas setup and attributes
const canvas = document.getElementById("visualizer");
const ctx = canvas.getContext("2d");
const playPauseBtn = document.getElementById("play-pause");
const currentTimeText = document.getElementById("current-time");
const durationText = document.getElementById("duration");
const progressBar = document.getElementById("progress-bar");

canvas.width = window.innerWidth;
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

ctx.fillStyle = "black";
ctx.fillRect(0, 0, canvas.width, canvas.height);

ctx.fillStyle = "lime";
ctx.fillRect(50, 50, 100, 100);

let audioContext;
let analyser;
let source;
let dataArray;
let rotation = 0;
let gridOffset = 0;

//audio info
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

        animate();
    }
});

//background visuals
function drawWireframeBackground() {
    const spacing = 100;

    ctx.strokeStyle = "rgba(0,255,0,0.2)";
    ctx.lineWidth = 1;

    // X lines
    for (let x = -canvas.width; x < canvas.width * 2; x += spacing) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + canvas.width, canvas.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(x + canvas.width, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }

    // horizontal lines
    for (let i = 0; i < 20; i++) {
        const y =
            (canvas.height * 0.5 + i * 30 + gridOffset) %
            canvas.height;

        const scale = 1 + i * 0.08;

        ctx.beginPath();
        ctx.moveTo(canvas.width / 2 - canvas.width * scale, y);
        ctx.lineTo(canvas.width / 2 + canvas.width * scale, y);
        ctx.stroke();
    }
}

//visual animations
function animate() {
    requestAnimationFrame(animate);

    analyser.getByteFrequencyData(dataArray);

    ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    drawWireframeBackground();

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 90;

    let bass = dataArray[2] || 0;
    let orbRadius = 40 + bass * 0.25;
    rotation += 0.002;
    gridOffset += 2;

    const gradient = ctx.createRadialGradient(
    centerX,
    centerY,
    5,
    centerX,
    centerY,
    orbRadius
);

gradient.addColorStop(0, "white");
gradient.addColorStop(0.2, "lime");
gradient.addColorStop(1, "rgba(0, 255, 0, 0)");

ctx.fillStyle = gradient;

ctx.beginPath();
ctx.arc(centerX, centerY, orbRadius, 0, Math.PI * 2);
ctx.fill();

    for (let i = 0; i < dataArray.length; i++) {
        const usableBins = Math.floor(dataArray.length * 0.7);
        const dataIndex = Math.floor((i / dataArray.length) * usableBins);
        const value = dataArray[dataIndex];

        const barHeight = value * 0.8;

        const angle = (i / dataArray.length) * Math.PI * 2 + rotation;

        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;

        const x2 = centerX + Math.cos(angle) * (radius + barHeight);
        const y2 = centerY + Math.sin(angle) * (radius + barHeight);

        ctx.strokeStyle = "lime";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}

window.addEventListener("resize", () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
});


//audio controls adjusting
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
    const seekTime =
        (progressBar.value / 100) * audioPlayer.duration;

    audioPlayer.currentTime = seekTime;
});