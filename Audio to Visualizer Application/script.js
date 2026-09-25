const audioElement = document.getElementById('audio');
const audioFileInput = document.getElementById('audioFile');
const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');
const smoothingInput = document.getElementById('smoothing');
const sensitivityInput = document.getElementById('sensitivity');
const barStyleSelect = document.getElementById('barStyle');

canvas.width = 800;
canvas.height = 400;

let audioContext;
let analyser;
let sourceNode;
let dataArray;
let bufferLength;
let isInitialized = false;
let animationStarted = false;

function initAudioPipeline() {
  if (isInitialized) return;

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    console.error('Web Audio API is not supported in this browser.');
    return;
  }

  audioContext = new AudioContextClass();
  analyser = audioContext.createAnalyser();
  analyser.fftSize = 256;
  analyser.smoothingTimeConstant = Number(smoothingInput.value);

  bufferLength = analyser.frequencyBinCount;
  dataArray = new Uint8Array(bufferLength);

  sourceNode = audioContext.createMediaElementSource(audioElement);
  sourceNode.connect(analyser);
  analyser.connect(audioContext.destination);

  isInitialized = true;
}

function drawBackgroundGlow() {
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#0b1021');
  gradient.addColorStop(0.5, '#111827');
  gradient.addColorStop(1, '#090d18');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawRoundedRect(x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function getBarAverages(barCount, step) {
  const values = [];

  for (let i = 0; i < barCount; i++) {
    let sum = 0;

    for (let j = 0; j < step; j++) {
      const index = i * step + j;
      if (index < bufferLength) {
        sum += dataArray[index];
      }
    }

    values.push(sum / step);
  }

  return values;
}

function drawClassicBars(barCount, step, sensitivity) {
  const values = getBarAverages(barCount, step);

  for (let i = 0; i < barCount; i++) {
    const average = values[i];
    const barHeight = (average / 255) * canvas.height * sensitivity;
    const x = i * (canvas.width / barCount) + 2;
    const y = canvas.height - barHeight;
    const barWidth = canvas.width / barCount - 4;
    const hue = (i / barCount) * 300;

    ctx.fillStyle = `hsl(${hue}, 90%, 60%)`;
    ctx.fillRect(x, y, barWidth, barHeight);
  }
}

function drawRoundedBars(barCount, step, sensitivity) {
  const values = getBarAverages(barCount, step);

  for (let i = 0; i < barCount; i++) {
    const average = values[i];
    const barHeight = (average / 255) * canvas.height * sensitivity;
    const x = i * (canvas.width / barCount) + 4;
    const y = canvas.height - barHeight;
    const barWidth = canvas.width / barCount - 8;
    const hue = 220 + (i / barCount) * 80;

    ctx.fillStyle = `hsl(${hue}, 85%, 65%)`;
    drawRoundedRect(x, y, barWidth, barHeight, 12);
    ctx.fill();
  }
}

function drawGlowBars(barCount, step, sensitivity) {
  const values = getBarAverages(barCount, step);

  for (let i = 0; i < barCount; i++) {
    const average = values[i];
    const barHeight = (average / 255) * canvas.height * sensitivity;
    const x = i * (canvas.width / barCount) + 3;
    const y = canvas.height - barHeight;
    const barWidth = canvas.width / barCount - 6;
    const hue = 150 + (i / barCount) * 120;

    ctx.shadowBlur = 18;
    ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
    ctx.fillStyle = `hsl(${hue}, 100%, 65%)`;
    ctx.fillRect(x, y, barWidth, barHeight);
  }

  ctx.shadowBlur = 0;
}

function drawMirrorBars(barCount, step, sensitivity) {
  const centerY = canvas.height / 2;
  const values = getBarAverages(barCount, step);

  for (let i = 0; i < barCount; i++) {
    const average = values[i];
    const barHeight = (average / 255) * canvas.height * 0.6 * sensitivity;
    const x = i * (canvas.width / barCount) + 2;
    const barWidth = canvas.width / barCount - 4;
    const hue = 280 + (i / barCount) * 60;

    ctx.fillStyle = `hsl(${hue}, 85%, 65%)`;
    ctx.fillRect(x, centerY, barWidth, -barHeight);
    ctx.fillRect(x, centerY, barWidth, barHeight);
  }
}

function updateVisualizer() {
  if (!analyser || !dataArray) {
    return;
  }

  analyser.getByteFrequencyData(dataArray);
  drawBackgroundGlow();

  const barCount = 64;
  const step = Math.ceil(bufferLength / barCount);
  const sensitivity = Number(sensitivityInput.value);
  const selectedStyle = barStyleSelect.value;

  switch (selectedStyle) {
    case 'classic':
      drawClassicBars(barCount, step, sensitivity);
      break;
    case 'rounded':
      drawRoundedBars(barCount, step, sensitivity);
      break;
    case 'glow':
      drawGlowBars(barCount, step, sensitivity);
      break;
    case 'mirror':
      drawMirrorBars(barCount, step, sensitivity);
      break;
    default:
      drawClassicBars(barCount, step, sensitivity);
  }

  requestAnimationFrame(updateVisualizer);
}

function updateControls() {
  if (analyser) {
    analyser.smoothingTimeConstant = Number(smoothingInput.value);
  }
}

function startVisualizerLoop() {
  if (animationStarted) return;
  animationStarted = true;
  updateVisualizer();
}

smoothingInput.addEventListener('input', updateControls);
barStyleSelect.addEventListener('change', () => {
  if (audioElement.paused) {
    drawBackgroundGlow();
  }
});

audioElement.addEventListener('play', async () => {
  initAudioPipeline();

  if (audioContext && audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  if (!isInitialized) {
    return;
  }

  startVisualizerLoop();
});

audioElement.addEventListener('pause', () => {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackgroundGlow();
});

audioFileInput.addEventListener('change', (event) => {
  const file = event.target.files[0];
  if (!file) return;

  const objectUrl = URL.createObjectURL(file);
  audioElement.src = objectUrl;
  audioElement.load();
});

if (audioElement && audioElement.src) {
  initAudioPipeline();
  drawBackgroundGlow();
}
