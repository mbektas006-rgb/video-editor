// ─── TERMINAL TABS & TYPING ANIMATION ─────────────────────────────────
const tabCommands = {
  0: [
    'ffmpeg -i video.mp4 -ss 00:00:10 -to 00:01:30 -c copy output.mp4',
    'ffmpeg -i podcast.mp3 -af "volume=1.5,afade=t=in:ss=0:d=2" output.mp3',
    'ffmpeg -i video.mp4 -vf "scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920" shorts.mp4',
    'ffmpeg -i input.mp4 -c:v libx265 -crf 20 -c:a aac master.mp4'
  ],
  1: [
    'python auto_subtitle.py --video sunum.mp4 --model base --lang tr',
    'python -m whisper audio.wav --output_format srt --language Turkish',
    'python auto_subtitle.py --video klip.mp4 --model small --export-ass'
  ],
  2: [
    'cat render_status.json | jq .perf_metrics',
    'ffmpeg -v stats -progress pipe:1 -i raw.mov out.mp4'
  ]
};

let activeTermTab = 0;
let commands = tabCommands[0];
let cmdIdx = 0, charIdx = 0, deleting = false;
const typingEl = document.getElementById('typingText');

function typeLoop() {
  if (!typingEl) return;
  if (heroAnimPaused) return;
  const current = commands[cmdIdx] || tabCommands[0][0];
  if (!deleting) {
    typingEl.textContent = current.slice(0, ++charIdx);
    if (charIdx === current.length) { deleting = true; setTimeout(typeLoop, 2400); return; }
  } else {
    typingEl.textContent = current.slice(0, --charIdx);
    if (charIdx === 0) { deleting = false; cmdIdx = (cmdIdx + 1) % commands.length; }
  }
  setTimeout(typeLoop, deleting ? 20 : 40);
}
typeLoop();

function switchTermTab(tabIndex) {
  activeTermTab = tabIndex;
  commands = tabCommands[tabIndex] || tabCommands[0];
  cmdIdx = 0;
  charIdx = 0;
  deleting = false;

  const tabs = document.querySelectorAll('.term-tab');
  tabs.forEach((t, i) => {
    if (i === tabIndex) t.classList.add('active');
    else t.classList.remove('active');
  });

  const promptEl = document.querySelector('.t-prompt');
  if (promptEl) {
    if (tabIndex === 0) promptEl.textContent = 'videoforge@local:~$';
    else if (tabIndex === 1) promptEl.textContent = '(venv) py-whisper:~$';
    else promptEl.textContent = 'videoforge@stats:~$';
  }
}


// ─── TAB SWITCHER ──────────────────────────────────────────────────────
const tabGroupCardMap = {
  audio: 'card-audio',
  sub: 'card-subtitle',
  viral: 'card-viral-text',
  pip: 'card-pip-split',
  thumb: 'card-thumb-time'
};

function switchTab(group, tab) {
  const cardId = tabGroupCardMap[group] || `card-${group}`;
  const container = document.getElementById(cardId);
  if (!container) return;
  const tabs = container.querySelectorAll('.tab');
  const contents = container.querySelectorAll('.tab-content');
  tabs.forEach(t => t.classList.remove('active'));
  contents.forEach(c => c.classList.remove('active'));
  const content = container.querySelector(`.tab-content#${group}-${tab}`);
  if (content) content.classList.add('active');
  tabs.forEach(t => {
    if (t.getAttribute('onclick')?.includes(`'${tab}'`)) t.classList.add('active');
  });
}

// ─── RESIZE PRESET ────────────────────────────────────────────────────
document.getElementById('resize-preset').addEventListener('change', function() {
  const custom = document.getElementById('custom-size');
  if (this.value === 'custom') custom.classList.remove('hidden');
  else custom.classList.add('hidden');
});

// ─── SPEED LABEL ──────────────────────────────────────────────────────
function updateSpeedLabel(v) {
  const f = parseFloat(v);
  let label = `${f}×`;
  if (f < 1) label += ' (Yavaş / Slow-mo)';
  else if (f === 1) label += ' (Normal)';
  else if (f <= 2) label += ' (Hızlı)';
  else label += ' (Çok Hızlı)';
  document.getElementById('speed-label').textContent = label;
}

// ─── SHOW CMD ─────────────────────────────────────────────────────────
function showCmd(id, cmd) {
  const el = document.getElementById(id);
  el.classList.remove('hidden');
  el.innerHTML = `<span class="cmd-label">FFmpeg Komutu — Kopyalamak için tıkla</span>${escapeHtml(cmd)}`;
  el.onclick = () => copyToClipboard(cmd);
}

function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => showToast('📋 Komut kopyalandı!'));
}

function showToast(msg = '📋 Komut kopyalandı!') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.remove('hidden');
  t.classList.add('show');
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.classList.add('hidden'), 300); }, 2500);
}

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : '';
}

// ─── SUBTITLE OPTION TOGGLES ──────────────────────────────────────────
function toggleSubOpt(key) {
  const chk = document.getElementById(`${key}-has-sub`);
  chk.checked = !chk.checked;
  toggleSubBox(key);
}

function toggleSubBox(key) {
  const chk = document.getElementById(`${key}-has-sub`);
  const box = document.getElementById(`${key}-sub-box`);
  if (chk.checked) {
    box.classList.remove('hidden');
  } else {
    box.classList.add('hidden');
  }
}

function escapeSubPath(path) {
  return path.replace(/\\/g, '/').replace(/:/g, '\\:');
}

// ─── GENERATORS ───────────────────────────────────────────────────────

// ✂️ KESME
function generateCut() {
  const input = val('cut-input') || 'input.mp4';
  const start = val('cut-start') || '00:00:00';
  const end   = val('cut-end')   || '00:01:00';
  const output= val('cut-output') || 'output.mp4';
  const hasSub= document.getElementById('cut-has-sub').checked;
  const srtFile = val('cut-sub-file') || 'altyazi.srt';

  let cmd;
  if (hasSub) {
    const escSrt = escapeSubPath(srtFile);
    cmd = `ffmpeg -i "${input}" -ss ${start} -to ${end} -vf "subtitles='${escSrt}'" -c:a copy "${output}"`;
  } else {
    cmd = `ffmpeg -i "${input}" -ss ${start} -to ${end} -c copy "${output}"`;
  }
  showCmd('cut-cmd', cmd);
}

// 🔗 BİRLEŞTİRME
function generateMerge() {
  const lines = document.getElementById('merge-inputs').value.trim().split('\n').filter(Boolean);
  const output= val('merge-output') || 'birlesik.mp4';
  if (lines.length < 2) { alert('En az 2 video dosyası girin!'); return; }
  // concat demuxer
  const listFile = 'concat_list.txt';
  const cmd =
`# Önce bu içeriği concat_list.txt dosyasına kaydet:
${lines.map(l => `file '${l}'`).join('\n')}

# Sonra bu komutu çalıştır:
ffmpeg -f concat -safe 0 -i "${listFile}" -c copy "${output}"`;
  showCmd('merge-cmd', cmd);
}

// 🎵 SES
function generateAudio() {
  const card = document.getElementById('card-audio');
  const activeContent = card.querySelector('.tab-content.active').id;
  const hasSub = document.getElementById('audio-has-sub').checked;
  const srtFile = val('audio-sub-file') || 'altyazi.srt';
  const escSrt = escapeSubPath(srtFile);

  if (activeContent === 'audio-replace') {
    const video = val('audio-rep-video') || 'video.mp4';
    const music = val('audio-rep-music') || 'muzik.mp3';
    const out   = val('audio-rep-out')   || 'output.mp4';

    let cmd;
    if (hasSub) {
      cmd = `ffmpeg -i "${video}" -i "${music}" -vf "subtitles='${escSrt}'" -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${out}"`;
    } else {
      cmd = `ffmpeg -i "${video}" -i "${music}" -c:v copy -c:a aac -map 0:v:0 -map 1:a:0 -shortest "${out}"`;
    }
    showCmd('audio-cmd', cmd);

  } else if (activeContent === 'audio-add') {
    const video = val('audio-video') || 'video.mp4';
    const music = val('audio-music') || 'muzik.mp3';
    const vol   = val('audio-vol')   || '0.3';
    const out   = val('audio-out')   || 'output.mp4';

    let cmd;
    if (hasSub) {
      cmd = `ffmpeg -i "${video}" -i "${music}" -filter_complex "[1:a]volume=${vol}[music];[0:a][music]amix=inputs=2:duration=first[aout]" -vf "subtitles='${escSrt}'" -map 0:v -map "[aout]" "${out}"`;
    } else {
      cmd = `ffmpeg -i "${video}" -i "${music}" -filter_complex "[1:a]volume=${vol}[music];[0:a][music]amix=inputs=2:duration=first[aout]" -map 0:v -map "[aout]" -c:v copy "${out}"`;
    }
    showCmd('audio-cmd', cmd);

  } else if (activeContent === 'audio-remove') {
    const video = val('audio-rm-video') || 'video.mp4';
    const out   = val('audio-rm-out')   || 'sessiz.mp4';

    let cmd;
    if (hasSub) {
      cmd = `ffmpeg -i "${video}" -vf "subtitles='${escSrt}'" -an "${out}"`;
    } else {
      cmd = `ffmpeg -i "${video}" -an -c:v copy "${out}"`;
    }
    showCmd('audio-cmd', cmd);

  } else {
    const video = val('audio-vol-video') || 'video.mp4';
    const mult  = val('audio-vol-mult')  || '1.5';
    const out   = val('audio-vol-out')   || 'output.mp4';

    let cmd;
    if (hasSub) {
      cmd = `ffmpeg -i "${video}" -vf "subtitles='${escSrt}'" -af "volume=${mult}" "${out}"`;
    } else {
      cmd = `ffmpeg -i "${video}" -af "volume=${mult}" -c:v copy "${out}"`;
    }
    showCmd('audio-cmd', cmd);
  }
}

// 🤖 OTOMATİK YAPAY ZEKA ALTYAZI (WHISPER)
function generateAISubtitle() {
  const video = val('ai-video') || 'video.mp4';
  const audio = val('ai-audio');
  const lang  = document.getElementById('ai-lang').value;
  const model = document.getElementById('ai-model').value;
  const out   = val('ai-output') || 'altyazili_video.mp4';

  const scriptPath = `C:\\Users\\mbektas\\.gemini\\antigravity\\scratch\\video-editor\\auto_subtitle.py`;

  let args = `-v "${video}" -o "${out}" -m ${model} -l ${lang}`;
  if (audio) {
    args += ` -a "${audio}"`;
  }

  const cmd = 
`# 1. İlk defa kullanıyorsanız AI kütüphanesini kurun (tek seferlik):
pip install faster-whisper

# 2. Otomatik Altyazılı Videoyu Oluşturun:
python "${scriptPath}" ${args}`;

  showCmd('ai-cmd', cmd);
}

// 💬 ALTYAZI / YAZI
function generateSubtitle() {
  const card = document.getElementById('card-subtitle');
  const activeContent = card.querySelector('.tab-content.active').id;

  if (activeContent === 'sub-text') {
    const video = val('sub-video')     || 'video.mp4';
    const text  = val('sub-text-val')  || 'Metin';
    const x     = val('sub-x')         || '50';
    const y     = val('sub-y')         || '50';
    const size  = val('sub-size')      || '36';
    const color = val('sub-color')     || 'white';
    const out   = val('sub-out')       || 'output.mp4';
    const cmd = `ffmpeg -i "${video}" -vf "drawtext=text='${text}':fontcolor=${color}:fontsize=${size}:x=${x}:y=${y}" "${out}"`;
    showCmd('sub-cmd', cmd);

  } else {
    const video = val('sub-srt-video') || 'video.mp4';
    const srt   = val('sub-srt-file')  || 'altyazi.srt';
    const out   = val('sub-srt-out')   || 'output.mp4';
    const escapedSrt = escapeSubPath(srt);
    const cmd = `ffmpeg -i "${video}" -vf "subtitles='${escapedSrt}'" "${out}"`;
    showCmd('sub-cmd', cmd);
  }
}

// 📐 BOYUTLANDIRMA
function generateResize() {
  const input  = val('resize-input')  || 'video.mp4';
  const output = val('resize-output') || 'output.mp4';
  const preset = document.getElementById('resize-preset').value;
  const hasSub = document.getElementById('resize-has-sub').checked;
  const srtFile= val('resize-sub-file') || 'altyazi.srt';

  let size;
  if (preset === 'custom') {
    const w = val('resize-w') || '1080';
    const h = val('resize-h') || '1920';
    size = `${w}:${h}`;
  } else {
    size = preset;
  }

  let vfFilter = `scale=${size}:force_original_aspect_ratio=decrease,pad=${size}:(ow-iw)/2:(oh-ih)/2`;
  if (hasSub) {
    const escSrt = escapeSubPath(srtFile);
    vfFilter += `,subtitles='${escSrt}'`;
  }

  const cmd = `ffmpeg -i "${input}" -vf "${vfFilter}" "${output}"`;
  showCmd('resize-cmd', cmd);
}

// ⚡ HIZ
function generateSpeed() {
  const input  = val('speed-input')  || 'video.mp4';
  const output = val('speed-output') || 'output.mp4';
  const speed  = parseFloat(document.getElementById('speed-range').value);
  const pts    = (1 / speed).toFixed(4);
  const atempo = speed;

  // atempo only supports 0.5–2.0, chain for extremes
  let atempoParts = [];
  let remaining = atempo;
  while (remaining > 2.0) { atempoParts.push('atempo=2.0'); remaining /= 2.0; }
  while (remaining < 0.5) { atempoParts.push('atempo=0.5'); remaining *= 2.0; }
  atempoParts.push(`atempo=${remaining.toFixed(4)}`);
  const atempoFilter = atempoParts.join(',');

  const cmd = `ffmpeg -i "${input}" -vf "setpts=${pts}*PTS" -af "${atempoFilter}" "${output}"`;
  showCmd('speed-cmd', cmd);
}

// 🔄 FORMAT DÖNÜŞTÜRME
function generateConvert() {
  const input  = val('conv-input')  || 'video.avi';
  const format = document.getElementById('conv-format').value;
  const output = val('conv-output') || `output.${format}`;

  let cmd;
  if (format === 'gif') {
    cmd = `ffmpeg -i "${input}" -vf "fps=15,scale=480:-1:flags=lanczos,split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "${output}"`;
  } else if (format === 'mp3') {
    cmd = `ffmpeg -i "${input}" -q:a 0 -map a "${output}"`;
  } else {
    cmd = `ffmpeg -i "${input}" "${output}"`;
  }
  showCmd('conv-cmd', cmd);
}

// 🎨 1. SİNEMATİK RENK & VİDEO EFEKTLERİ
function generateVideoFX() {
  const input = val('vfx-input') || 'video.mp4';
  const output = val('vfx-output') || 'efektli_video.mp4';
  const colorPreset = document.getElementById('vfx-color').value;
  const brightness = parseFloat(document.getElementById('vfx-brightness').value) || 0;
  const saturation = parseFloat(document.getElementById('vfx-saturation').value) || 1;

  let filters = [];

  // Color Preset
  if (colorPreset === 'cinematic-warm') {
    filters.push('eq=brightness=0.04:contrast=1.15:saturation=1.25,colorbalance=rs=0.08:gs=0.03:bs=-0.08');
  } else if (colorPreset === 'cinematic-teal') {
    filters.push('colorbalance=rs=-0.08:gs=0.02:bs=0.12,eq=contrast=1.15:saturation=1.1');
  } else if (colorPreset === 'vintage') {
    filters.push('curves=vintage,eq=saturation=0.8:contrast=1.1');
  } else if (colorPreset === 'cyberpunk') {
    filters.push('eq=saturation=1.8:contrast=1.25,colorbalance=rs=0.15:bs=0.25');
  } else if (colorPreset === 'bwhite') {
    filters.push('hue=s=0,eq=contrast=1.3:brightness=0.04');
  } else if (colorPreset === 'sepia') {
    filters.push('colorchannelmixer=.393:.769:.189:0:.349:.686:.168:0:.272:.534:.131');
  }

  // Sliders
  if (brightness !== 0 || saturation !== 1) {
    let eqParts = [];
    if (brightness !== 0) eqParts.push(`brightness=${brightness}`);
    if (saturation !== 1) eqParts.push(`saturation=${saturation}`);
    filters.push(`eq=${eqParts.join(':')}`);
  }

  // FX Checkboxes
  if (document.getElementById('vfx-vignette').checked) {
    filters.push('vignette=PI/4');
  }
  if (document.getElementById('vfx-shake').checked) {
    filters.push('crop=in_w-24:in_h-24:12+6*sin(t*10):6+4*cos(t*8)');
  }
  if (document.getElementById('vfx-glitch').checked) {
    filters.push('noise=alls=50:allf=t,rgbashift=rh=5:bv=-5');
  }
  if (document.getElementById('vfx-grain').checked) {
    filters.push('noise=alls=16:allf=t+u');
  }
  if (document.getElementById('vfx-zoom').checked) {
    filters.push("zoompan=z='min(zoom+0.0015,1.25)':d=125:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=hd1080");
  }
  if (document.getElementById('vfx-blur').checked) {
    filters.push('gblur=sigma=3');
  }

  let cmd;
  if (filters.length > 0) {
    cmd = `ffmpeg -i "${input}" -vf "${filters.join(',')}" -c:a copy "${output}"`;
  } else {
    cmd = `ffmpeg -i "${input}" -c copy "${output}"`;
  }
  showCmd('vfx-cmd', cmd);
}

// ✨ 2. VİRAL ALTYAZI & METİN/LOGO STÜDYOSU
function generateViralText() {
  const card = document.getElementById('card-viral-text');
  const activeTab = card.querySelector('.tab-content.active').id;

  if (activeTab === 'viral-text') {
    const video = val('vtext-video') || 'video.mp4';
    const rawText = val('vtext-text') || 'ABONE OL';
    const style = document.getElementById('vtext-style').value;
    const pos = document.getElementById('vtext-pos').value;
    const size = parseInt(val('vtext-size')) || 48;
    const out = val('vtext-out') || 'baslikli_video.mp4';

    // Escape text for ffmpeg drawtext filter
    const escapedText = rawText.replace(/'/g, "\\'").replace(/:/g, "\\:").replace(/%/g, "\\%");

    let styleStr = "";
    if (style === 'hormozi-yellow') {
      styleStr = "fontcolor=yellow:borderw=4:bordercolor=black:shadowcolor=black@0.7:shadowx=3:shadowy=3";
    } else if (style === 'mrbeast-red') {
      styleStr = "fontcolor=white:borderw=3:bordercolor=black:box=1:boxcolor=red@0.85:boxborderw=12";
    } else if (style === 'neon-green') {
      styleStr = "fontcolor=#39ff14:borderw=4:bordercolor=black:shadowcolor=black@0.8:shadowx=4:shadowy=4";
    } else if (style === 'cyber-box') {
      styleStr = "fontcolor=white:box=1:boxcolor=#8b5cf6@0.8:boxborderw=10:borderw=2:bordercolor=black";
    } else {
      styleStr = "fontcolor=white:borderw=2:bordercolor=black:shadowcolor=black@0.6:shadowx=2:shadowy=2";
    }

    let posStr = "";
    if (pos === 'bottom-center') {
      posStr = "x=(w-text_w)/2:y=h-th-60";
    } else if (pos === 'middle') {
      posStr = "x=(w-text_w)/2:y=(h-text_h)/2";
    } else if (pos === 'top-center') {
      posStr = "x=(w-text_w)/2:y=60";
    } else if (pos === 'marquee') {
      posStr = "x=w-mod(max(t-1\\,0)*(w+tw)/6\\,w+tw):y=h-th-40";
    }

    const cmd = `ffmpeg -i "${video}" -vf "drawtext=text='${escapedText}':fontsize=${size}:${styleStr}:${posStr}" -c:a copy "${out}"`;
    showCmd('viral-cmd', cmd);

  } else {
    // Logo / Watermark
    const video = val('vlogo-video') || 'video.mp4';
    const logoImg = val('vlogo-img') || 'logo.png';
    const pos = document.getElementById('vlogo-pos').value;
    const size = parseInt(val('vlogo-size')) || 160;
    const opacity = parseFloat(document.getElementById('vlogo-opacity').value) || 0.85;
    const out = val('vlogo-out') || 'filigranli_video.mp4';

    let overlayPos = "W-w-24:24"; // top-right
    if (pos === 'top-left') overlayPos = "24:24";
    else if (pos === 'bottom-right') overlayPos = "W-w-24:H-h-24";
    else if (pos === 'bottom-left') overlayPos = "24:H-h-24";

    const cmd = `ffmpeg -i "${video}" -i "${logoImg}" -filter_complex "[1:v]scale=${size}:-1,format=rgba,colorchannelmixer=aa=${opacity}[logo];[0:v][logo]overlay=${overlayPos}" -c:a copy "${out}"`;
    showCmd('viral-cmd', cmd);
  }
}

// 🔊 3. SES EFEKTLERİ & VOICE CHANGER
function generateVoiceFX() {
  const input = val('voice-input') || 'video.mp4';
  const voiceMod = document.getElementById('voice-mod').value;
  const voiceEq = document.getElementById('voice-eq').value;
  const vol = parseFloat(document.getElementById('voice-vol').value) || 1.0;
  const output = val('voice-output') || 'ses_efektli.mp4';

  let audioFilters = [];

  // Voice Modulator / Pitch
  if (voiceMod === 'chipmunk') {
    audioFilters.push('asetrate=44100*1.35,atempo=1/1.35,aresample=44100');
  } else if (voiceMod === 'deep') {
    audioFilters.push('asetrate=44100*0.78,atempo=1/0.78,aresample=44100');
  } else if (voiceMod === 'robotic') {
    audioFilters.push('flanger=delay=8:depth=5:regen=65:width=80:speed=0.5');
  } else if (voiceMod === 'walkie') {
    audioFilters.push('highpass=f=450,lowpass=f=2700');
  } else if (voiceMod === 'megaphone') {
    audioFilters.push('highpass=f=800,lowpass=f=3200,acompressor=threshold=0.1:ratio=10');
  }

  // Special Sound FX / EQ
  if (voiceEq === 'bass-boost') {
    audioFilters.push('bass=g=8:f=110:w=0.6');
  } else if (voiceEq === 'ear-rape') {
    audioFilters.push('volume=5.0,bass=g=14:f=90:w=0.8');
  } else if (voiceEq === 'reverb') {
    audioFilters.push('aecho=0.8:0.88:60:0.4');
  } else if (voiceEq === 'noise-reduction') {
    audioFilters.push('anlmdn=s=7:p=0.002:r=0.002');
  } else if (voiceEq === 'loudnorm') {
    audioFilters.push('loudnorm=I=-16:TP=-1.5:LRA=11');
  }

  // Volume
  if (vol !== 1.0) {
    audioFilters.push(`volume=${vol}`);
  }

  let cmd;
  if (audioFilters.length > 0) {
    cmd = `ffmpeg -i "${input}" -af "${audioFilters.join(',')}" -c:v copy "${output}"`;
  } else {
    cmd = `ffmpeg -i "${input}" -c copy "${output}"`;
  }
  showCmd('voice-cmd', cmd);
}

// 🖼️ 4. PICTURE-IN-PICTURE (PiP) & SPLIT SCREEN
function generatePipSplit() {
  const card = document.getElementById('card-pip-split');
  const activeTab = card.querySelector('.tab-content.active').id;

  if (activeTab === 'pip-pip') {
    const mainVideo = val('pip-main-video') || 'ana_video.mp4';
    const subVideo = val('pip-sub-video') || 'webcam.mp4';
    const corner = document.getElementById('pip-corner').value;
    const scale = document.getElementById('pip-scale').value;
    const out = val('pip-out') || 'pip_video.mp4';

    let overlayPos = "W-w-24:H-h-24"; // bottom-right
    if (corner === 'bottom-left') overlayPos = "24:H-h-24";
    else if (corner === 'top-right') overlayPos = "W-w-24:24";
    else if (corner === 'top-left') overlayPos = "24:24";

    const cmd = `ffmpeg -i "${mainVideo}" -i "${subVideo}" -filter_complex "[1:v]scale=iw*${scale}:-1[pip];[0:v][pip]overlay=${overlayPos}" -c:a copy "${out}"`;
    showCmd('pip-cmd', cmd);

  } else {
    // Split Screen
    const v1 = val('split-v1') || 'video1.mp4';
    const v2 = val('split-v2') || 'video2.mp4';
    const mode = document.getElementById('split-mode').value;
    const out = val('split-out') || 'split_video.mp4';

    let filterComplex = "";
    if (mode === 'horizontal') {
      filterComplex = "[0:v]scale=960:1080[l];[1:v]scale=960:1080[r];[l][r]hstack";
    } else {
      filterComplex = "[0:v]scale=1080:960[t];[1:v]scale=1080:960[b];[t][b]vstack";
    }

    const cmd = `ffmpeg -i "${v1}" -i "${v2}" -filter_complex "${filterComplex}" -c:a copy "${out}"`;
    showCmd('pip-cmd', cmd);
  }
}

// 📸 5. AKILLI THUMBNAIL & ZAMAN ARAÇLARI
function generateThumbTime() {
  const card = document.getElementById('card-thumb-time');
  const activeTab = card.querySelector('.tab-content.active').id;

  if (activeTab === 'thumb-thumb') {
    const video = val('thumb-video') || 'video.mp4';
    const time = val('thumb-time') || '00:00:05';
    const format = document.getElementById('thumb-format').value;
    const out = val('thumb-out') || 'thumbnail.jpg';

    let optStr = format === 'jpg-best' ? "-q:v 2" : "-vcodec png";
    const cmd = `ffmpeg -ss ${time} -i "${video}" -vframes 1 ${optStr} "${out}"`;
    showCmd('thumbtime-cmd', cmd);

  } else {
    // Time effect (Reverse, Time-Lapse)
    const video = val('time-video') || 'video.mp4';
    const effect = document.getElementById('time-effect').value;
    const audioMode = document.getElementById('time-audio').value;
    const out = val('time-out') || 'zaman_efektli.mp4';

    let vf = "";
    let af = "";
    let isMute = (audioMode === 'mute');

    if (effect === 'reverse') {
      vf = "reverse";
      af = "areverse";
    } else if (effect === 'timelapse-5x') {
      vf = "setpts=0.2*PTS";
      af = "atempo=2.0,atempo=2.5";
    } else if (effect === 'timelapse-10x') {
      vf = "setpts=0.1*PTS";
      af = "atempo=2.0,atempo=2.0,atempo=2.5";
    } else if (effect === 'timelapse-30x') {
      vf = "setpts=0.0333*PTS";
      isMute = true;
    }

    let cmd = "";
    if (isMute) {
      cmd = `ffmpeg -i "${video}" -vf "${vf}" -an "${out}"`;
    } else if (audioMode === 'reverse' && effect === 'reverse') {
      cmd = `ffmpeg -i "${video}" -vf "${vf}" -af "${af}" "${out}"`;
    } else if (audioMode === 'speedup' && af) {
      cmd = `ffmpeg -i "${video}" -vf "${vf}" -af "${af}" "${out}"`;
    } else {
      cmd = `ffmpeg -i "${video}" -vf "${vf}" -c:a copy "${out}"`;
    }

    showCmd('thumbtime-cmd', cmd);
  }
}

// ─── PYTHON SCRIPT DOWNLOAD ────────────────────────────────────────────
function downloadPythonScript() {
  const pyCode = `#!/usr/bin/env python3
"""
VideoForge Python Script
Gereksinimler: pip install moviepy ffmpeg-python
FFmpeg de kurulu olmalı.
"""

import subprocess
import sys
import os

def run(cmd):
    print(f"\\n🎬 Çalıştırılıyor: {cmd}\\n")
    result = subprocess.run(cmd, shell=True)
    if result.returncode == 0:
        print("✅ Başarılı!")
    else:
        print("❌ Hata oluştu.")
    return result.returncode == 0

# ─── 1. VIDEO KESME ───────────────────────────────────────────────────
def cut_video(input_path, start, end, output_path):
    """Videodan belirtilen aralığı kes."""
    cmd = f'ffmpeg -i "{input_path}" -ss {start} -to {end} -c copy "{output_path}"'
    return run(cmd)

# ─── 2. VİDEO BİRLEŞTİRME ───────────────────────────────────────────
def merge_videos(video_list, output_path):
    """Birden fazla videoyu birleştir."""
    list_file = "concat_list.txt"
    with open(list_file, "w", encoding="utf-8") as f:
        for v in video_list:
            f.write(f"file '{v}'\\n")
    cmd = f'ffmpeg -f concat -safe 0 -i "{list_file}" -c copy "{output_path}"'
    result = run(cmd)
    os.remove(list_file)
    return result

# ─── 3. MÜZİK EKLEME ─────────────────────────────────────────────────
def add_music(video_path, music_path, output_path, music_volume=0.3):
    """Videoya arka plan müziği ekle."""
    cmd = (
        f'ffmpeg -i "{video_path}" -i "{music_path}" '
        f'-filter_complex "[1:a]volume={music_volume}[music];[0:a][music]amix=inputs=2:duration=first[aout]" '
        f'-map 0:v -map "[aout]" -c:v copy "{output_path}"'
    )
    return run(cmd)

# ─── 4. SESİ ÇIKARMA ─────────────────────────────────────────────────
def remove_audio(video_path, output_path):
    """Videodan sesi tamamen kaldır."""
    cmd = f'ffmpeg -i "{video_path}" -an -c:v copy "{output_path}"'
    return run(cmd)

# ─── 5. SES SEVİYESİ ─────────────────────────────────────────────────
def change_volume(video_path, output_path, multiplier=1.5):
    """Ses seviyesini artır/azalt. 1.0=normal, 2.0=iki kat."""
    cmd = f'ffmpeg -i "{video_path}" -af "volume={multiplier}" -c:v copy "{output_path}"'
    return run(cmd)

# ─── 6. METİN EKLEME ─────────────────────────────────────────────────
def add_text(video_path, output_path, text, x=50, y=50, fontsize=36, color="white"):
    """Video üzerine metin yaz."""
    cmd = (
        f'ffmpeg -i "{video_path}" '
        f'-vf "drawtext=text=\\'{text}\\':fontcolor={color}:fontsize={fontsize}:x={x}:y={y}" '
        f'"{output_path}"'
    )
    return run(cmd)

# ─── 7. SRT ALTYAZI ───────────────────────────────────────────────────
def add_subtitle(video_path, srt_path, output_path):
    """Videoya SRT altyazı dosyası göm."""
    escaped = srt_path.replace("\\\\", "/").replace(":", "\\\\:")
    cmd = f'ffmpeg -i "{video_path}" -vf "subtitles=\\'{escaped}\\'" "{output_path}"'
    return run(cmd)

# ─── 8. BOYUTLANDIRMA ────────────────────────────────────────────────
def resize_video(video_path, output_path, width=1080, height=1920):
    """Videoyu yeniden boyutlandır (varsayılan: Shorts/Reels 9:16)."""
    cmd = (
        f'ffmpeg -i "{video_path}" '
        f'-vf "scale={width}:{height}:force_original_aspect_ratio=decrease,'
        f'pad={width}:{height}:(ow-iw)/2:(oh-ih)/2" '
        f'"{output_path}"'
    )
    return run(cmd)

# ─── 9. HIZ AYARI ─────────────────────────────────────────────────────
def change_speed(video_path, output_path, speed=2.0):
    """Hızı değiştir. 0.5=yarı hız, 2.0=iki kat hız."""
    pts = 1 / speed
    cmd = (
        f'ffmpeg -i "{video_path}" '
        f'-vf "setpts={pts:.4f}*PTS" '
        f'-af "atempo={min(max(speed,0.5),2.0):.4f}" '
        f'"{output_path}"'
    )
    return run(cmd)

# ─── 10. FORMAT DÖNÜŞTÜRME ───────────────────────────────────────────
def convert_format(input_path, output_path):
    """Otomatik format dönüştürme (uzantıya göre)."""
    if output_path.lower().endswith(".gif"):
        cmd = (
            f'ffmpeg -i "{input_path}" '
            f'-vf "fps=15,scale=480:-1:flags=lanczos,'
            f'split[s0][s1];[s0]palettegen[p];[s1][p]paletteuse" "{output_path}"'
        )
    elif output_path.lower().endswith(".mp3"):
        cmd = f'ffmpeg -i "{input_path}" -q:a 0 -map a "{output_path}"'
    else:
        cmd = f'ffmpeg -i "{input_path}" "{output_path}"'
    return run(cmd)

# ─── 11. SİNEMATİK FİLTRE & EFEKT ─────────────────────────────────────
def apply_video_effects(input_path, output_path, preset="cinematic-warm", vignette=True, shake=False):
    """Sinematik renk filtresi ve görsel efektler ekle."""
    filters = []
    if preset == "cinematic-warm":
        filters.append("eq=brightness=0.04:contrast=1.15:saturation=1.25,colorbalance=rs=0.08:gs=0.03:bs=-0.08")
    elif preset == "cinematic-teal":
        filters.append("colorbalance=rs=-0.08:gs=0.02:bs=0.12,eq=contrast=1.15:saturation=1.1")
    elif preset == "cyberpunk":
        filters.append("eq=saturation=1.8:contrast=1.25,colorbalance=rs=0.15:bs=0.25")
    elif preset == "bwhite":
        filters.append("hue=s=0,eq=contrast=1.3:brightness=0.04")
    
    if vignette: filters.append("vignette=PI/4")
    if shake: filters.append("crop=in_w-24:in_h-24:12+6*sin(t*10):6+4*cos(t*8)")
    
    vf_str = ",".join(filters) if filters else "null"
    cmd = f'ffmpeg -i "{input_path}" -vf "{vf_str}" -c:a copy "{output_path}"'
    return run(cmd)

# ─── 12. SES EFEKTİ & VOICE MOD ───────────────────────────────────────
def voice_effects(input_path, output_path, mod="chipmunk", bass_boost=False):
    """Ses perdesi ve efektleri ayarla (Sincap, Canavar, Robot vb.)."""
    af = []
    if mod == "chipmunk":
        af.append("asetrate=44100*1.35,atempo=1/1.35,aresample=44100")
    elif mod == "deep":
        af.append("asetrate=44100*0.78,atempo=1/0.78,aresample=44100")
    elif mod == "robotic":
        af.append("flanger=delay=8:depth=5:regen=65:width=80:speed=0.5")
    
    if bass_boost: af.append("bass=g=8:f=110:w=0.6")
    af_str = ",".join(af) if af else "anull"
    cmd = f'ffmpeg -i "{input_path}" -af "{af_str}" -c:v copy "{output_path}"'
    return run(cmd)

# ─── 13. PICTURE-IN-PICTURE (PiP) ─────────────────────────────────────
def picture_in_picture(main_video, sub_video, output_path, scale=0.33, corner="bottom-right"):
    """İki videoyu köşe bindirmeli (webcam overlay) birleştir."""
    pos = "W-w-24:H-h-24" if corner == "bottom-right" else "W-w-24:24"
    cmd = f'ffmpeg -i "{main_video}" -i "{sub_video}" -filter_complex "[1:v]scale=iw*{scale}:-1[pip];[0:v][pip]overlay={pos}" -c:a copy "{output_path}"'
    return run(cmd)

# ─── 14. THUMBNAIL ÇIKAR ──────────────────────────────────────────────
def extract_thumbnail(input_path, timestamp, output_path):
    """Videonun belirtilen anından yüksek kaliteli kapak görseli al."""
    cmd = f'ffmpeg -ss {timestamp} -i "{input_path}" -vframes 1 -q:v 2 "{output_path}"'
    return run(cmd)

# ─── 15. TERS ÇEVİR VEYA TIME-LAPSE ──────────────────────────────────
def time_effects(input_path, output_path, mode="reverse"):
    """Videoyu geri sar veya time-lapse yap."""
    if mode == "reverse":
        cmd = f'ffmpeg -i "{input_path}" -vf reverse -af areverse "{output_path}"'
    else:
        cmd = f'ffmpeg -i "{input_path}" -vf "setpts=0.1*PTS" -af "atempo=2.0,atempo=2.0,atempo=2.5" "{output_path}"'
    return run(cmd)

# ─── MENU ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("=" * 55)
    print("   🎬  VideoForge Python Script")
    print("=" * 55)
    print("1. Video Kes")
    print("2. Video Birleştir")
    print("3. Müzik Ekle")
    print("4. Sesi Kaldır")
    print("5. Ses Seviyesi Ayarla")
    print("6. Metin Ekle")
    print("7. SRT Altyazı Ekle")
    print("8. Boyutlandır (Shorts/Reels)")
    print("9. Hız Ayarla")
    print("10. Format Dönüştür")
    print("11. Sinematik Filtre & Efektler")
    print("12. Ses Efekti & Voice Changer")
    print("13. Picture-in-Picture (PiP / Webcam)")
    print("14. Kapak Görseli (Thumbnail) Çıkar")
    print("15. Video Ters Çevir (Reverse) / Time-Lapse")
    print("0. Çıkış")
    print("-" * 55)

    choice = input("Seçiminizi girin: ").strip()

    if choice == "1":
        i = input("Video dosyası: ")
        s = input("Başlangıç (ss:dd:ss): ")
        e = input("Bitiş (ss:dd:ss): ")
        o = input("Çıkış dosyası: ")
        cut_video(i, s, e, o)

    elif choice == "2":
        print("Video dosyalarını girin (bitirmek için boş bırakın):")
        videos = []
        while True:
            v = input(f"  Video {len(videos)+1}: ")
            if not v: break
            videos.append(v)
        o = input("Çıkış dosyası: ")
        merge_videos(videos, o)

    elif choice == "3":
        v = input("Video dosyası: ")
        m = input("Müzik dosyası: ")
        vol = float(input("Müzik ses seviyesi (0-1, ör: 0.3): ") or "0.3")
        o = input("Çıkış dosyası: ")
        add_music(v, m, o, vol)

    elif choice == "4":
        v = input("Video dosyası: ")
        o = input("Çıkış dosyası: ")
        remove_audio(v, o)

    elif choice == "5":
        v = input("Video dosyası: ")
        mult = float(input("Ses çarpanı (1=normal, 2=iki kat): ") or "1.5")
        o = input("Çıkış dosyası: ")
        change_volume(v, o, mult)

    elif choice == "6":
        v = input("Video dosyası: ")
        t = input("Metin: ")
        x = int(input("X konumu (piksel): ") or "50")
        y = int(input("Y konumu (piksel): ") or "50")
        fs = int(input("Yazı boyutu: ") or "36")
        c = input("Renk (ör: white, yellow): ") or "white"
        o = input("Çıkış dosyası: ")
        add_text(v, o, t, x, y, fs, c)

    elif choice == "7":
        v = input("Video dosyası: ")
        s = input("SRT dosyası: ")
        o = input("Çıkış dosyası: ")
        add_subtitle(v, s, o)

    elif choice == "8":
        v = input("Video dosyası: ")
        print("Format: 1=Shorts(1080x1920)  2=FullHD(1920x1080)  3=HD(1280x720)  4=Özel")
        fmt = input("Seçim: ") or "1"
        sizes = {"1":(1080,1920),"2":(1920,1080),"3":(1280,720)}
        if fmt in sizes:
            w, h = sizes[fmt]
        else:
            w = int(input("Genişlik: ") or "1080")
            h = int(input("Yükseklik: ") or "1920")
        o = input("Çıkış dosyası: ")
        resize_video(v, o, w, h)

    elif choice == "9":
        v = input("Video dosyası: ")
        spd = float(input("Hız (0.5=yavaş, 1=normal, 2=hızlı): ") or "2")
        o = input("Çıkış dosyası: ")
        change_speed(v, o, spd)

    elif choice == "10":
        i = input("Kaynak dosya: ")
        o = input("Çıkış dosyası (uzantıya göre dönüştürür): ")
        convert_format(i, o)

    elif choice == "11":
        i = input("Video dosyası: ")
        p = input("Preset (cinematic-warm / cinematic-teal / cyberpunk / bwhite): ") or "cinematic-warm"
        o = input("Çıkış dosyası: ")
        apply_video_effects(i, o, p)

    elif choice == "12":
        i = input("Kaynak dosya: ")
        m = input("Mod (chipmunk / deep / robotic): ") or "chipmunk"
        o = input("Çıkış dosyası: ")
        voice_effects(i, o, m)

    elif choice == "13":
        m = input("Ana Video: ")
        s = input("Webcam / İkinci Video: ")
        o = input("Çıkış dosyası: ")
        picture_in_picture(m, s, o)

    elif choice == "14":
        i = input("Video dosyası: ")
        t = input("Zaman (ss:dd:ss, ör: 00:00:05): ") or "00:00:05"
        o = input("Çıkış resmi (ör: thumbnail.jpg): ") or "thumbnail.jpg"
        extract_thumbnail(i, t, o)

    elif choice == "15":
        i = input("Video dosyası: ")
        m = input("1=Ters Çevir (Reverse), 2=Time-Lapse (10x): ") or "1"
        mode = "reverse" if m == "1" else "timelapse"
        o = input("Çıkış dosyası: ")
        time_effects(i, o, mode)

    elif choice == "0":
        print("Çıkış yapılıyor...")
        sys.exit()
    else:
        print("Geçersiz seçim.")
`;

  const blob = new Blob([pyCode], { type: 'text/plain' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'videoforge.py';
  a.click();
  URL.revokeObjectURL(url);
}

// ═══════════════════════════════════════════════════════════════════════
// 🎧 MP3 KIRPMA & SES STÜDYOSU MOTORU (WEB AUDIO API & WAVEFORM)
// ═══════════════════════════════════════════════════════════════════════

let audioCtx = null;
let audioBuffer = null;
let audioSourceNode = null;
let isAudioPlaying = false;
let audioStartTime = 0;
let audioEndTime = 30;
let audioDuration = 0;
let playbackOffset = 0;
let playbackStartCtxTime = 0;
let playAnimReq = null;
let currentLoadedFileName = "ses.mp3";

function getAudioContext() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// 📁 Dosya Yükleme & Sürükle Bırak
function handleAudioUpload(e) {
  const file = e.target.files[0];
  if (file) loadAudioFile(file);
}

const dropZone = document.getElementById('audioDropZone');
if (dropZone) {
  ['dragenter', 'dragover'].forEach(name => {
    dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  });
  ['dragleave', 'drop'].forEach(name => {
    dropZone.addEventListener(name, (e) => { e.preventDefault(); dropZone.classList.remove('dragover'); });
  });
  dropZone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    if (file) loadAudioFile(file);
  });
}

function loadAudioFile(file) {
  currentLoadedFileName = file.name;
  showLoading();
  document.getElementById('dropLabel').textContent = `🎵 ${file.name} (${(file.size / (1024*1024)).toFixed(2)} MB)`;
  document.getElementById('dropSub').textContent = "Ses yüklendi! Dalga grafiğinden aralığı seçebilirsiniz.";
  document.getElementById('trim-output-name').value = `kirpilmis_${file.name}`;

  const reader = new FileReader();
  reader.onload = function(e) {
    const arrayBuffer = e.target.result;
    const ctx = getAudioContext();
    ctx.decodeAudioData(arrayBuffer, function(decoded) {
      audioBuffer = decoded;
      audioDuration = decoded.duration;
      audioStartTime = 0;
      audioEndTime = Math.min(30, audioDuration);

      document.getElementById('trim-start').value = formatSec(audioStartTime);
      document.getElementById('trim-end').value = formatSec(audioEndTime);
      document.getElementById('audioTimeTotal').textContent = `/ ${formatSec(audioDuration)}`;
      
      updateSelectedTimeBadge();
      hideLoading();
      drawWaveform();
      updateScrubberProgress(0);
    }, function(err) {
      hideLoading();
      alert("Ses dosyası çözümlenemedi. Lütfen geçerli bir MP3/WAV dosyası seçin.");
    });
  };
  reader.readAsArrayBuffer(file);
}

// 🎨 Dalga Grafiği Çizimi (Waveform Canvas)
function drawWaveform() {
  const canvas = document.getElementById('waveformCanvas');
  if (!canvas || !audioBuffer) return;

  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = 90 * dpr;
  const ctx = canvas.getContext('2d');
  const width = canvas.width;
  const height = canvas.height;

  ctx.clearRect(0, 0, width, height);

  const rawData = audioBuffer.getChannelData(0);
  const step = Math.ceil(rawData.length / width);
  const amp = height / 2;

  // Dalga barları
  const grad = ctx.createLinearGradient(0, 0, 0, height);
  grad.addColorStop(0, '#818cf8');
  grad.addColorStop(0.5, '#6366f1');
  grad.addColorStop(1, '#4f46e5');

  ctx.fillStyle = grad;
  for (let i = 0; i < width; i++) {
    let min = 1.0;
    let max = -1.0;
    for (let j = 0; j < step; j++) {
      const datum = rawData[(i * step) + j];
      if (datum < min) min = datum;
      if (datum > max) max = datum;
    }
    const barHeight = Math.max(2, (max - min) * amp * 0.85);
    ctx.fillRect(i, (height - barHeight) / 2, 1.5, barHeight);
  }

  // Seçili Alan Vurgusu
  const startX = (audioStartTime / audioDuration) * width;
  const endX = (audioEndTime / audioDuration) * width;

  ctx.fillStyle = 'rgba(99, 102, 241, 0.25)';
  ctx.fillRect(startX, 0, endX - startX, height);

  ctx.strokeStyle = '#a5f3fc';
  ctx.lineWidth = 2 * window.devicePixelRatio;
  ctx.beginPath();
  ctx.moveTo(startX, 0); ctx.lineTo(startX, height);
  ctx.moveTo(endX, 0); ctx.lineTo(endX, height);
  ctx.stroke();
}

// ⏱️ Zaman Yardımcıları
function formatSec(sec) {
  sec = Math.max(0, sec);
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.floor((sec - Math.floor(sec)) * 10);
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}.${ms}`;
}

function parseTimeToSec(str) {
  str = String(str).trim();
  if (str.includes(':')) {
    const parts = str.split(':');
    if (parts.length === 3) {
      return parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      return parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    }
  }
  return parseFloat(str) || 0;
}

function updateSelectedTimeBadge() {
  const selDur = Math.max(0, audioEndTime - audioStartTime);
  document.getElementById('audioTimeSelected').textContent = 
    `Seçili Aralık: ${formatSec(audioStartTime)} - ${formatSec(audioEndTime)} (${selDur.toFixed(1)} sn)`;
}

function updateTrimFromInputs() {
  audioStartTime = Math.max(0, parseTimeToSec(document.getElementById('trim-start').value));
  if (audioDuration > 0) {
    audioEndTime = Math.min(audioDuration, parseTimeToSec(document.getElementById('trim-end').value));
  } else {
    audioEndTime = parseTimeToSec(document.getElementById('trim-end').value);
  }
  updateSelectedTimeBadge();
  drawWaveform();
}

function setStartToCurrent() {
  audioStartTime = playbackOffset;
  document.getElementById('trim-start').value = formatSec(audioStartTime);
  updateSelectedTimeBadge();
  drawWaveform();
}

function setEndToCurrent() {
  audioEndTime = Math.max(audioStartTime + 0.5, playbackOffset);
  document.getElementById('trim-end').value = formatSec(audioEndTime);
  updateSelectedTimeBadge();
  drawWaveform();
}

function updateAudioVolLabel(v) {
  const percent = Math.round(parseFloat(v) * 100);
  document.getElementById('trim-vol-label').textContent = `${percent}%`;
}

// ▶️ Ses Çalma / Kontrol
function toggleAudioPlay() {
  if (isAudioPlaying) {
    stopAudioPlayback();
  } else {
    playFromOffset(playbackOffset);
  }
}

function playFromOffset(offset) {
  if (!audioBuffer) return;
  stopAudioPlayback(false);

  const ctx = getAudioContext();
  audioSourceNode = ctx.createBufferSource();
  audioSourceNode.buffer = audioBuffer;

  const gainNode = ctx.createGain();
  const vol = parseFloat(document.getElementById('trim-volume').value) || 1.0;
  gainNode.gain.value = vol;

  audioSourceNode.connect(gainNode);
  gainNode.connect(ctx.destination);

  playbackOffset = offset >= audioDuration ? 0 : offset;
  playbackStartCtxTime = ctx.currentTime - playbackOffset;

  audioSourceNode.start(0, playbackOffset);
  isAudioPlaying = true;
  document.getElementById('btnPlayPause').textContent = '⏸️';

  audioSourceNode.onended = () => {
    if (isAudioPlaying) stopAudioPlayback();
  };

  trackPlayback();
}

function playSelectedRange() {
  if (!audioBuffer) return;
  stopAudioPlayback(false);

  const ctx = getAudioContext();
  audioSourceNode = ctx.createBufferSource();
  audioSourceNode.buffer = audioBuffer;

  const gainNode = ctx.createGain();
  const vol = parseFloat(document.getElementById('trim-volume').value) || 1.0;
  gainNode.gain.value = vol;

  audioSourceNode.connect(gainNode);
  gainNode.connect(ctx.destination);

  const playDur = Math.max(0.1, audioEndTime - audioStartTime);
  playbackOffset = audioStartTime;
  playbackStartCtxTime = ctx.currentTime - playbackOffset;

  audioSourceNode.start(0, audioStartTime, playDur);
  isAudioPlaying = true;
  document.getElementById('btnPlayPause').textContent = '⏸️';

  audioSourceNode.onended = () => {
    if (isAudioPlaying) stopAudioPlayback();
  };

  trackPlayback();
}

function stopAudioPlayback(resetOffset = true) {
  if (audioSourceNode) {
    try { audioSourceNode.stop(); } catch(e){}
    audioSourceNode.disconnect();
    audioSourceNode = null;
  }
  isAudioPlaying = false;
  document.getElementById('btnPlayPause').textContent = '▶️';
  cancelAnimationFrame(playAnimReq);

  if (resetOffset) {
    playbackOffset = 0;
    updateScrubberProgress(0);
    document.getElementById('audioTimeCurrent').textContent = formatSec(0);
  }
}

function trackPlayback() {
  if (!isAudioPlaying || !audioCtx) return;
  playbackOffset = audioCtx.currentTime - playbackStartCtxTime;

  if (playbackOffset > audioDuration) {
    stopAudioPlayback();
    return;
  }

  document.getElementById('audioTimeCurrent').textContent = formatSec(playbackOffset);
  const progressPercent = (playbackOffset / audioDuration) * 100;
  updateScrubberProgress(progressPercent);

  playAnimReq = requestAnimationFrame(trackPlayback);
}

function updateScrubberProgress(percent) {
  const el = document.getElementById('timelineProgress');
  if (el) el.style.width = `${Math.min(100, Math.max(0, percent))}%`;
}

function seekAudioFromScrubber(e) {
  if (!audioDuration) return;
  const rect = e.currentTarget.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const ratio = Math.max(0, Math.min(1, clickX / rect.width));
  playbackOffset = ratio * audioDuration;
  document.getElementById('audioTimeCurrent').textContent = formatSec(playbackOffset);
  updateScrubberProgress(ratio * 100);

  if (isAudioPlaying) {
    playFromOffset(playbackOffset);
  }
}

// ⚡ FFmpeg Komutu Üret
function generateAudioTrimCmd() {
  const localPath = val('studio-audio-path') || currentLoadedFileName || 'ses.mp3';
  const start = val('trim-start') || '00:00:00';
  const end   = val('trim-end')   || '00:00:30';
  const vol   = parseFloat(document.getElementById('trim-volume').value) || 1.0;
  const fadeIn = parseInt(document.getElementById('trim-fade-in').value) || 0;
  const fadeOut = parseInt(document.getElementById('trim-fade-out').value) || 0;
  const speed = parseFloat(document.getElementById('trim-speed').value) || 1.0;
  const outName = val('trim-output-name') || 'kirpilmis_ses.mp3';

  let filters = [];
  if (vol !== 1.0) filters.push(`volume=${vol}`);
  if (fadeIn > 0) filters.push(`afade=t=in:ss=0:d=${fadeIn}`);
  if (fadeOut > 0) {
    const startSec = parseTimeToSec(start);
    const endSec = parseTimeToSec(end);
    const dur = Math.max(1, endSec - startSec);
    filters.push(`afade=t=out:st=${Math.max(0, dur - fadeOut)}:d=${fadeOut}`);
  }
  if (speed !== 1.0) filters.push(`atempo=${speed}`);

  let filterStr = "";
  if (filters.length > 0) {
    filterStr = `-af "${filters.join(',')}"`;
  }

  const cmd = `ffmpeg -i "${localPath}" -ss ${start} -to ${end} ${filterStr} "${outName}"`;
  showCmd('trim-cmd', cmd);
}

// 💾 Tarayıcıdan Doğrudan Kırpılmış Sesi İndir (WAV Formatında)
function exportAudioDirectly() {
  try {
    if (!audioBuffer) {
      alert("Lütfen önce bir ses dosyası yükleyin!");
      return;
    }

    // Giriş kutularındaki güncel değerleri güvenle oku
    const startVal = document.getElementById('trim-start').value;
    const endVal = document.getElementById('trim-end').value;
    
    let start = parseTimeToSec(startVal);
    let end = parseTimeToSec(endVal);

    if (isNaN(start) || start < 0) start = audioStartTime;
    if (isNaN(end) || end <= start) end = audioEndTime || audioDuration;
    
    start = Math.max(0, Math.min(start, audioDuration));
    end = Math.max(start + 0.1, Math.min(end, audioDuration));

    const sampleRate = audioBuffer.sampleRate;
    const startSample = Math.floor(start * sampleRate);
    const endSample = Math.floor(end * sampleRate);
    const lengthSamples = Math.max(1, endSample - startSample);
    const numChannels = audioBuffer.numberOfChannels;

    const ctx = getAudioContext();
    const croppedBuffer = ctx.createBuffer(numChannels, lengthSamples, sampleRate);

    const vol = parseFloat(document.getElementById('trim-volume').value) || 1.0;
    const fadeIn = parseInt(document.getElementById('trim-fade-in').value) || 0;
    const fadeOut = parseInt(document.getElementById('trim-fade-out').value) || 0;
    const fadeInSamples = fadeIn * sampleRate;
    const fadeOutSamples = fadeOut * sampleRate;

    for (let ch = 0; ch < numChannels; ch++) {
      const srcData = audioBuffer.getChannelData(ch);
      const dstData = croppedBuffer.getChannelData(ch);

      for (let i = 0; i < lengthSamples; i++) {
        let sample = (srcData[startSample + i] || 0) * vol;

        // Fade In
        if (fadeInSamples > 0 && i < fadeInSamples) {
          sample *= (i / fadeInSamples);
        }
        // Fade Out
        if (fadeOutSamples > 0 && i > (lengthSamples - fadeOutSamples)) {
          const remaining = lengthSamples - i;
          sample *= (remaining / fadeOutSamples);
        }

        dstData[i] = Math.max(-1, Math.min(1, sample));
      }
    }

    // WAV Encode
    const wavBlob = audioBufferToWavBlob(croppedBuffer);
    
    let rawOutName = (val('trim-output-name') || currentLoadedFileName || 'kirpilmis_ses').trim();
    let cleanName = rawOutName.replace(/\.[^/.]+$/, "");
    if (!cleanName) cleanName = "kirpilmis_ses";
    const outName = cleanName + ".wav";

    const url = URL.createObjectURL(wavBlob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    a.download = outName;
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
      if (document.body.contains(a)) document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1500);

    showToast('💾 Kırpılmış ses indirildi!');
  } catch (err) {
    console.error("Export error:", err);
    alert("Ses dışa aktarılırken bir hata oluştu: " + err.message);
  }
}

function audioBufferToWavBlob(buffer) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;
  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  const length = buffer.length * numChannels * bytesPerSample;
  const bufferArray = new ArrayBuffer(44 + length);
  const view = new DataView(bufferArray);

  function writeString(view, offset, string) {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  }

  /* RIFF chunk descriptor */
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + length, true);
  writeString(view, 8, 'WAVE');
  /* FMT sub-chunk */
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  /* data sub-chunk */
  writeString(view, 36, 'data');
  view.setUint32(40, length, true);

  // Write PCM samples
  let offset = 44;
  for (let i = 0; i < buffer.length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let sample = buffer.getChannelData(ch)[i];
      sample = Math.max(-1, Math.min(1, sample));
      view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: 'audio/wav' });
}

// ═══════════════════════════════════════════════════════════════════════
// 🖱️ WAVEFORM DRAG-SELECT
// ═══════════════════════════════════════════════════════════════════════

let isDraggingWaveform = false;
let dragStartRatio = 0;

const waveformCanvas = document.getElementById('waveformCanvas');
if (waveformCanvas) {
  waveformCanvas.addEventListener('mousedown', (e) => {
    if (!audioBuffer) return;
    isDraggingWaveform = true;
    const rect = waveformCanvas.getBoundingClientRect();
    dragStartRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audioStartTime = dragStartRatio * audioDuration;
    audioEndTime = audioStartTime;
    waveformCanvas.classList.add('dragging');
  });

  waveformCanvas.addEventListener('mousemove', (e) => {
    if (!isDraggingWaveform || !audioBuffer) return;
    const rect = waveformCanvas.getBoundingClientRect();
    const currentRatio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const startR = Math.min(dragStartRatio, currentRatio);
    const endR = Math.max(dragStartRatio, currentRatio);
    audioStartTime = startR * audioDuration;
    audioEndTime = endR * audioDuration;
    document.getElementById('trim-start').value = formatSec(audioStartTime);
    document.getElementById('trim-end').value = formatSec(audioEndTime);
    updateSelectedTimeBadge();
    drawWaveform();
  });

  document.addEventListener('mouseup', () => {
    if (isDraggingWaveform) {
      isDraggingWaveform = false;
      waveformCanvas.classList.remove('dragging');
      if (audioEndTime - audioStartTime < 0.1 && audioBuffer) {
        // Click without drag — seek
        playbackOffset = audioStartTime;
        document.getElementById('audioTimeCurrent').textContent = formatSec(playbackOffset);
        updateScrubberProgress((playbackOffset / audioDuration) * 100);
      }
    }
  });
}

// ═══════════════════════════════════════════════════════════════════════
// ⌨️ KEYBOARD SHORTCUTS
// ═══════════════════════════════════════════════════════════════════════

document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in input/textarea
  const tag = e.target.tagName.toLowerCase();
  if (tag === 'input' || tag === 'textarea' || tag === 'select') return;

  if (e.code === 'Space') {
    e.preventDefault();
    toggleAudioPlay();
  } else if (e.code === 'Escape') {
    e.preventDefault();
    stopAudioPlayback();
  }
});

// ═══════════════════════════════════════════════════════════════════════
// 📏 DEBOUNCED WAVEFORM REDRAW ON RESIZE
// ═══════════════════════════════════════════════════════════════════════

let resizeTimer = null;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => {
    if (audioBuffer) drawWaveform();
  }, 200);
});

// ═══════════════════════════════════════════════════════════════════════
// 👁️ VISIBILITY CHANGE — PAUSE HERO ANIMATION WHEN TAB IS HIDDEN
// ═══════════════════════════════════════════════════════════════════════

let heroAnimPaused = false;
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    heroAnimPaused = true;
  } else {
    if (heroAnimPaused) {
      heroAnimPaused = false;
      typeLoop();
    }
  }
});

// ═══════════════════════════════════════════════════════════════════════
// ⬆️ SCROLL-TO-TOP BUTTON
// ═══════════════════════════════════════════════════════════════════════

const scrollTopBtn = document.getElementById('scrollTopBtn');
if (scrollTopBtn) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      scrollTopBtn.classList.add('visible');
    } else {
      scrollTopBtn.classList.remove('visible');
    }
  }, { passive: true });

  scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ═══════════════════════════════════════════════════════════════════════
// 📋 FORM VALIDATION HELPERS
// ═══════════════════════════════════════════════════════════════════════

function validateRequired(inputId, errorMsg) {
  const el = document.getElementById(inputId);
  if (!el) return true;
  const value = el.value.trim();
  if (!value) {
    el.classList.add('input-error');
    showToast(errorMsg || 'Lütfen gerekli alanları doldurun!', 'error');
    el.focus();
    setTimeout(() => el.classList.remove('input-error'), 3000);
    return false;
  }
  el.classList.remove('input-error');
  return true;
}

// ═══════════════════════════════════════════════════════════════════════
// 🔔 ENHANCED TOAST WITH VARIANTS
// ═══════════════════════════════════════════════════════════════════════

// Override the original showToast to support variants
const _origShowToast = showToast;
showToast = function(msg = '📋 Komut kopyalandı!', variant = 'info') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast show';
  if (variant === 'error') t.classList.add('toast-error');
  else if (variant === 'success') t.classList.add('toast-success');
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.className = 'toast hidden', 300); }, 2500);
};

// ═══════════════════════════════════════════════════════════════════════
// 🔄 LOADING OVERLAY HELPERS
// ═══════════════════════════════════════════════════════════════════════

function showLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.remove('hidden');
}

function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.classList.add('hidden');
}
