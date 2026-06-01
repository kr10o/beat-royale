// public/js/tone-engine.js

// Keep state variables in scope
let isPlaying = false;
let isLocked = false;
let bpmValue = 120;
let synthDecay = 0.4;
let filterCutoff = 1200;

// Setup Grid Data: 3 rows x 16 steps
const grid = {
  kick: Array(16).fill(false),
  snare: Array(16).fill(false),
  hihat: Array(16).fill(false)
};

// Initialize Instruments
let kickSynth, snareNoise, hihatSynth, polySynth, filter, mainDelay;
let analyser;
let loopId;

// DOM Selectors
const playBtn = document.getElementById('playBtn');
const triggerEffectBtn = document.getElementById('triggerEffect');
const loadZipBtn = document.getElementById('loadZipBtn');
const lockStatus = document.getElementById('lockStatus');
const canvas = document.getElementById('waveformCanvas');
const ctx = canvas.getContext('2d');

// Knobs
const cutoffSlider = document.getElementById('cutoff');
const decaySlider = document.getElementById('decay');
const bpmSlider = document.getElementById('bpm');

// Generate 16 steps in rows
function generateSequencerUI() {
  const generateRow = (rowId, typeClass) => {
    const container = document.getElementById(rowId);
    container.innerHTML = '';
    for (let i = 0; i < 16; i++) {
      const btn = document.createElement('button');
      btn.className = `step-btn ${typeClass}`;
      btn.dataset.step = i;
      btn.addEventListener('click', () => {
        if (isLocked) return;
        const stateKey = rowId.replace('Row', '');
        grid[stateKey][i] = !grid[stateKey][i];
        btn.classList.toggle('active');
        // Play click feedback sound
        playFeedbackSound(stateKey);
      });
      container.appendChild(btn);
    }
  };

  generateRow('kickRow', 'kick');
  generateRow('snareRow', 'snare');
  generateRow('hatRow', 'hihat');
}

// Play a quick synth ping on click
function playFeedbackSound(type) {
  if (!Tone.context || Tone.context.state !== 'running') return;
  try {
    if (type === 'kick') {
      kickSynth.triggerAttackRelease("C1", "16n");
    } else if (type === 'snare') {
      snareNoise.triggerAttackRelease("16n");
    } else if (type === 'hihat') {
      hihatSynth.triggerAttackRelease("G5", "32n");
    }
  } catch(e) {}
}

// Setup Tone Audio Nodes
function initAudio() {
  if (analyser) return; // already initialized

  // Kick
  kickSynth = new Tone.MembraneSynth({
    envelope: { sustain: 0.1, attack: 0.002, decay: 0.3 }
  });

  // Snare (Noise Synth)
  snareNoise = new Tone.NoiseSynth({
    volume: -10,
    envelope: { attack: 0.001, decay: 0.15 },
    filterEnvelope: { attack: 0.001, decay: 0.1, baseFrequency: 800 }
  });

  // Hihat
  hihatSynth = new Tone.MetalSynth({
    volume: -15,
    envelope: { attack: 0.001, decay: 0.08, release: 0.08 },
    resonance: 6000,
    harmonicity: 5.1
  });

  // Polyphonic Lead Synth
  polySynth = new Tone.PolySynth(Tone.Synth, {
    volume: -8,
    oscillator: { type: "sawtooth" },
    envelope: { attack: 0.01, decay: synthDecay, sustain: 0.1, release: 0.2 }
  });

  // Filter & Delay FX
  filter = new Tone.Filter(filterCutoff, "lowpass");
  mainDelay = new Tone.PingPongDelay("8n.", 0.25);

  // Connect routes
  polySynth.chain(filter, mainDelay, Tone.Destination);
  kickSynth.connect(Tone.Destination);
  snareNoise.connect(Tone.Destination);
  hihatSynth.connect(Tone.Destination);

  // Analyzer for Visuals
  analyser = new Tone.Analyser("waveform", 256);
  Tone.Destination.connect(analyser);

  // Start Transport loop
  let stepIndex = 0;
  loopId = new Tone.Loop((time) => {
    // Sequencer step trigger
    if (grid.kick[stepIndex]) {
      kickSynth.triggerAttackRelease("C1", "8n", time);
    }
    if (grid.snare[stepIndex]) {
      snareNoise.triggerAttack(time);
    }
    if (grid.hihat[stepIndex]) {
      hihatSynth.triggerAttackRelease("32n", time);
    }

    // Melodic notes triggered periodically
    if (stepIndex % 4 === 0 && Math.random() > 0.4) {
      const notes = ["C3", "Eb3", "G3", "Bb3"];
      const randomNote = notes[Math.floor(Math.random() * notes.length)];
      polySynth.triggerAttackRelease(randomNote, "8n", time);
    }

    // Canvas visuals trigger
    Tone.Draw.schedule(() => {
      highlightActiveSteps(stepIndex);
    }, time);

    stepIndex = (stepIndex + 1) % 16;
  }, "16n").start(0);

  Tone.Transport.bpm.value = bpmValue;
}

// Highlight step indicators
function highlightActiveSteps(stepIndex) {
  const steps = document.querySelectorAll('.step-btn');
  steps.forEach(step => {
    if (parseInt(step.dataset.step) === stepIndex) {
      step.style.borderColor = 'var(--neon-green)';
    } else {
      step.style.borderColor = 'var(--border-color)';
    }
  });
}

// Toggle Playback
playBtn.addEventListener('click', async () => {
  if (isLocked) return;

  // Start audio context if suspended
  await Tone.start();
  initAudio();

  if (isPlaying) {
    Tone.Transport.stop();
    playBtn.textContent = "Play Sequence";
    isPlaying = false;
  } else {
    Tone.Transport.start();
    playBtn.textContent = "Stop Sequence";
    isPlaying = true;
  }
});

// Sound modifications bound to sliders
cutoffSlider.addEventListener('input', (e) => {
  filterCutoff = parseFloat(e.target.value);
  if (filter) {
    filter.frequency.setValueAtTime(filterCutoff, Tone.immediate());
  }
});

decaySlider.addEventListener('input', (e) => {
  synthDecay = parseFloat(e.target.value);
  if (polySynth) {
    polySynth.set({
      envelope: { decay: synthDecay }
    });
  }
});

bpmSlider.addEventListener('input', (e) => {
  bpmValue = parseInt(e.target.value);
  Tone.Transport.bpm.value = bpmValue;
});

// Glitch FX Action
triggerEffectBtn.addEventListener('click', () => {
  if (isLocked || !mainDelay) return;
  // Push feedback high temporarily
  mainDelay.feedback.setValueAtTime(0.85, Tone.immediate());
  mainDelay.delayTime.setValueAtTime("16n", Tone.immediate());
  setTimeout(() => {
    mainDelay.feedback.setValueAtTime(0.25, Tone.immediate());
    mainDelay.delayTime.setValueAtTime("8n.", Tone.immediate());
  }, 1000);
});

// Sample loader trigger
loadZipBtn.addEventListener('click', async () => {
  if (isLocked) return;
  loadZipBtn.textContent = "Loading Pack...";
  try {
    const samples = await window.fetchAndUnzipPack('battle_pack_1');
    if (samples.length > 0) {
      alert(`Loaded ${samples.length} custom samples from ZIP package!`);
    } else {
      alert("No ZIP file loaded. Falling back to local synthesized engine.");
    }
  } catch (err) {
    console.error(err);
  } finally {
    loadZipBtn.textContent = "Load Pack (ZIP)";
  }
});

// Canvas Oscilloscope Renderer
function drawVisuals() {
  requestAnimationFrame(drawVisuals);
  
  // Clear Canvas
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Background grid
  ctx.strokeStyle = '#121217';
  ctx.lineWidth = 1;
  for (let i = 0; i < canvas.width; i += 30) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, canvas.height);
    ctx.stroke();
  }
  for (let i = 0; i < canvas.height; i += 30) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(canvas.width, i);
    ctx.stroke();
  }

  if (!analyser) {
    // Simple mock idle line
    ctx.strokeStyle = 'rgba(0, 242, 254, 0.4)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    return;
  }

  const values = analyser.getValue();
  ctx.strokeStyle = isLocked ? '#ff007f' : '#00f2fe';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  
  const sliceWidth = canvas.width / values.length;
  let x = 0;

  for (let i = 0; i < values.length; i++) {
    // Normal audio value bounds
    const v = values[i];
    const y = (v + 1) * canvas.height / 2;

    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  
  ctx.stroke();
}

// Adjust canvas resolution dynamically
function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
drawVisuals();

// Generate default buttons
generateSequencerUI();

// Parent Window PostMessage Hooks
window.addEventListener('message', async (e) => {
  const data = e.data;
  if (!data) return;

  if (data.action === 'START_TIMER') {
    console.log("DAW Engine: LOCK unlocked, timer started!");
    isLocked = false;
    lockStatus.textContent = "Engine Active";
    lockStatus.classList.remove('locked');
    document.querySelectorAll('.step-btn').forEach(btn => btn.disabled = false);
    document.querySelectorAll('input[type="range"]').forEach(input => input.disabled = false);
    playBtn.disabled = false;
    triggerEffectBtn.disabled = false;
    loadZipBtn.disabled = false;
  }

  if (data.action === 'LOCK_DAW') {
    console.log("DAW Engine: LOCK directive received, compiling mix...");
    isLocked = true;
    lockStatus.textContent = "DAW LOCKED";
    lockStatus.classList.add('locked');

    // Disable all user interactions
    document.querySelectorAll('.step-btn').forEach(btn => btn.disabled = true);
    document.querySelectorAll('input[type="range"]').forEach(input => input.disabled = true);
    playBtn.disabled = true;
    triggerEffectBtn.disabled = true;
    loadZipBtn.disabled = true;

    // Stop playback
    if (isPlaying) {
      Tone.Transport.stop();
      playBtn.textContent = "Play Sequence";
      isPlaying = false;
    }

    // Generate simulated Audio WebM Blob
    // Inside standard DAW, this retrieves master node audio stream chunks.
    // For our sandboxed simulator, we generate a mock wave-buffer blob.
    const mockAudioBuffer = new Uint8Array(8192);
    for(let i = 0; i < mockAudioBuffer.length; i++) {
      mockAudioBuffer[i] = Math.floor(Math.random() * 256);
    }
    const audioBlob = new Blob([mockAudioBuffer], { type: 'audio/webm' });

    // Send the compiled mixdown block back to the Nuxt frontend
    window.parent.postMessage({
      action: 'MIX_EXPORTED',
      blob: audioBlob
    }, '*');
  }
});
