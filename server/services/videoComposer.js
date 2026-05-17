const fs = require('fs');
const path = require('path');
const { createCanvas } = (() => {
  // Try to load canvas, fallback to HTML-based rendering
  try { return require('canvas'); } catch { return { createCanvas: null }; }
})();

/**
 * Video Composer Service
 * 
 * Generates video content using multiple strategies:
 * 1. FFmpeg + Canvas: Full video rendering with text overlays, transitions
 * 2. HTML Renderer: Generates an HTML file that can be screen-recorded
 * 3. Storyboard: Generates frame-by-frame image storyboard + metadata
 *
 * Since FFmpeg may not be installed, we default to generating a complete
 * HTML-based video player with all script sections, timing, and visuals
 * that can be exported or screen-captured.
 */
class VideoComposerService {
  constructor() {
    this.outputDir = path.join(__dirname, '..', '..', 'output');
    this.videosDir = path.join(this.outputDir, 'videos');
    this.htmlDir = path.join(this.outputDir, 'html');

    [this.videosDir, this.htmlDir].forEach(dir => {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    this.ffmpegAvailable = this.checkFFmpeg();
  }

  checkFFmpeg() {
    try {
      const { execSync } = require('child_process');
      execSync('ffmpeg -version', { stdio: 'ignore' });
      console.log('✅ FFmpeg detected - full video rendering available');
      return true;
    } catch {
      console.log('⚠️  FFmpeg not found - using HTML video renderer');
      return false;
    }
  }

  /**
   * Compose a video from a content idea and its script
   * Returns: { filePath, type, duration, metadata }
   */
  async composeVideo(content, scriptData, options = {}) {
    const videoId = `video_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

    if (this.ffmpegAvailable) {
      return this.composeWithFFmpeg(videoId, content, scriptData, options);
    }

    return this.composeHTMLVideo(videoId, content, scriptData, options);
  }

  /**
   * FFmpeg-based video composition (when available)
   */
  async composeWithFFmpeg(videoId, content, scriptData, options) {
    const ffmpeg = require('fluent-ffmpeg');
    const duration = content.duration_target || 30;
    const outputPath = path.join(this.videosDir, `${videoId}.mp4`);

    // Generate frame images for each section
    const frames = await this.generateFrameImages(videoId, content, scriptData);

    return new Promise((resolve, reject) => {
      const command = ffmpeg();

      // Add each frame as input with duration
      frames.forEach(frame => {
        command.input(frame.imagePath).inputOptions([`-loop 1`, `-t ${frame.duration}`]);
      });

      command
        .complexFilter([
          // Concat all sections
          frames.map((_, i) => `[${i}:v]scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2[v${i}]`).join(';') + ';' +
          frames.map((_, i) => `[v${i}]`).join('') + `concat=n=${frames.length}:v=1:a=0[outv]`
        ])
        .outputOptions([
          '-map', '[outv]',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-r', '30',
          '-preset', 'fast',
        ])
        .output(outputPath)
        .on('end', () => {
          // Cleanup temp frames
          frames.forEach(f => { try { fs.unlinkSync(f.imagePath); } catch {} });
          const stats = fs.statSync(outputPath);
          resolve({
            filePath: outputPath,
            filename: `${videoId}.mp4`,
            type: 'mp4',
            duration,
            fileSize: stats.size,
            renderer: 'ffmpeg',
          });
        })
        .on('error', (err) => {
          frames.forEach(f => { try { fs.unlinkSync(f.imagePath); } catch {} });
          reject(err);
        })
        .run();
    });
  }

  /**
   * Generate frame images for each script section using Canvas
   */
  async generateFrameImages(videoId, content, scriptData) {
    const tempDir = path.join(this.outputDir, 'temp', videoId);
    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

    const sections = scriptData.sections || [];
    const totalDuration = content.duration_target || 30;
    const sectionDuration = totalDuration / Math.max(sections.length, 1);

    const colors = [
      { bg: '#1a1a2e', accent: '#8b5cf6', text: '#f1f1f7' },
      { bg: '#0f172a', accent: '#3b82f6', text: '#e2e8f0' },
      { bg: '#18181b', accent: '#f59e0b', text: '#fafafa' },
      { bg: '#1e1b4b', accent: '#06b6d4', text: '#e0f2fe' },
    ];

    const frames = [];
    for (let i = 0; i < sections.length; i++) {
      const section = sections[i];
      const color = colors[i % colors.length];
      const imagePath = path.join(tempDir, `frame_${i}.png`);

      if (createCanvas) {
        const canvas = createCanvas(1080, 1920);
        const ctx = canvas.getContext('2d');

        // Background
        ctx.fillStyle = color.bg;
        ctx.fillRect(0, 0, 1080, 1920);

        // Accent bar top
        const gradient = ctx.createLinearGradient(0, 0, 1080, 0);
        gradient.addColorStop(0, color.accent);
        gradient.addColorStop(1, color.accent + '80');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 1080, 8);

        // Section label
        ctx.fillStyle = color.accent;
        ctx.font = 'bold 36px Arial';
        ctx.fillText(section.label || `Section ${i + 1}`, 80, 200);

        // Time indicator
        ctx.fillStyle = color.text + '80';
        ctx.font = '28px Arial';
        ctx.fillText(section.time || '', 80, 250);

        // Main text - word wrap
        ctx.fillStyle = color.text;
        ctx.font = '44px Arial';
        const words = (section.text || '').split(' ');
        let line = '';
        let y = 400;
        for (const word of words) {
          const testLine = line + word + ' ';
          if (ctx.measureText(testLine).width > 920) {
            ctx.fillText(line, 80, y);
            line = word + ' ';
            y += 60;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, 80, y);

        // Visual note
        if (section.visual_note) {
          ctx.fillStyle = color.accent + '60';
          ctx.font = '24px Arial';
          ctx.fillText(`🎥 ${section.visual_note}`, 80, 1800);
        }

        // Title at bottom
        ctx.fillStyle = color.text + '40';
        ctx.font = '24px Arial';
        ctx.fillText(content.title || '', 80, 1860);

        const buffer = canvas.toBuffer('image/png');
        fs.writeFileSync(imagePath, buffer);
      } else {
        // No canvas: create a simple placeholder image
        await this.createPlaceholderImage(imagePath, section, color, content.title);
      }

      frames.push({ imagePath, duration: sectionDuration, section });
    }

    return frames;
  }

  /**
   * Create a simple placeholder PNG (1x1 pixel) when canvas isn't available
   */
  async createPlaceholderImage(filePath, section, color, title) {
    // Minimal valid PNG (1x1 pixel)
    const png = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
      0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
      0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0xCF, 0xC0, 0x00,
      0x00, 0x00, 0x02, 0x00, 0x01, 0xE2, 0x21, 0xBC, 0x33, 0x00, 0x00, 0x00,
      0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82,
    ]);
    fs.writeFileSync(filePath, png);
  }

  /**
   * HTML-based video composition (works without FFmpeg)
   * Generates a self-contained HTML file with CSS animations
   * that plays like a video with proper timing
   */
  async composeHTMLVideo(videoId, content, scriptData, options) {
    const duration = content.duration_target || 30;
    const sections = scriptData.sections || [];
    const totalSections = sections.length || 1;

    // Calculate time for each section from the time strings or distribute evenly
    const sectionTimings = sections.map((s, i) => {
      const match = (s.time || '').match(/(\d+)-(\d+)/);
      if (match) return { start: parseInt(match[1]), end: parseInt(match[2]) };
      const secDur = duration / totalSections;
      return { start: Math.floor(i * secDur), end: Math.floor((i + 1) * secDur) };
    });

    const colors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#ec4899', '#06b6d4'];

    const html = `<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title || 'NyarAI Video'}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Inter', sans-serif;
    background: #0a0a0f;
    color: #f1f1f7;
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    overflow: hidden;
  }
  .video-container {
    width: 1080px; height: 1920px;
    transform: scale(0.45);
    transform-origin: center center;
    background: #0a0a0f;
    position: relative;
    overflow: hidden;
    border-radius: 24px;
    box-shadow: 0 0 60px rgba(139,92,246,0.2);
  }
  .section {
    position: absolute;
    inset: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 80px;
    opacity: 0;
    animation-fill-mode: forwards;
  }
  ${sections.map((s, i) => {
    const t = sectionTimings[i];
    const dur = t.end - t.start;
    return `.section-${i} {
    animation: fadeSection ${dur}s ease ${t.start}s forwards;
    z-index: ${i + 1};
  }`;
  }).join('\n  ')}
  @keyframes fadeSection {
    0% { opacity: 0; transform: translateY(30px); }
    8% { opacity: 1; transform: translateY(0); }
    85% { opacity: 1; transform: translateY(0); }
    100% { opacity: 0; transform: translateY(-20px); }
  }
  .section-label {
    font-size: 32px;
    font-weight: 800;
    text-transform: uppercase;
    letter-spacing: 4px;
    margin-bottom: 12px;
  }
  .section-time {
    font-size: 22px;
    opacity: 0.4;
    margin-bottom: 48px;
    font-weight: 500;
  }
  .section-text {
    font-size: 52px;
    font-weight: 700;
    line-height: 1.35;
    margin-bottom: 40px;
  }
  .visual-note {
    font-size: 22px;
    opacity: 0.5;
    position: absolute;
    bottom: 120px;
    left: 80px;
    right: 80px;
  }
  .progress-bar {
    position: absolute;
    bottom: 0; left: 0;
    height: 6px;
    background: linear-gradient(90deg, #8b5cf6, #3b82f6);
    animation: progress ${duration}s linear forwards;
    z-index: 100;
  }
  @keyframes progress {
    from { width: 0%; }
    to { width: 100%; }
  }
  .watermark {
    position: absolute;
    top: 60px; right: 80px;
    font-size: 28px;
    font-weight: 800;
    opacity: 0.15;
    letter-spacing: 2px;
    z-index: 99;
  }
  .title-overlay {
    position: absolute;
    top: 60px; left: 80px;
    font-size: 24px;
    font-weight: 600;
    opacity: 0.3;
    max-width: 700px;
    z-index: 99;
  }
  .bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    opacity: 0.15;
    pointer-events: none;
  }
  ${sections.map((_, i) => {
    const c = colors[i % colors.length];
    const x = 200 + (i * 200) % 700;
    const y = 400 + (i * 300) % 1000;
    return `.glow-${i} {
    width: 500px; height: 500px;
    background: ${c};
    top: ${y}px; left: ${x}px;
    animation: glowPulse ${3 + i}s ease-in-out infinite alternate;
    animation-delay: ${i * 0.5}s;
  }`;
  }).join('\n  ')}
  @keyframes glowPulse {
    from { transform: scale(1); opacity: 0.1; }
    to { transform: scale(1.3); opacity: 0.2; }
  }
  .controls {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%) scale(1);
    display: flex;
    gap: 12px;
    z-index: 200;
    background: rgba(26,26,46,0.9);
    padding: 12px 24px;
    border-radius: 16px;
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1);
  }
  .controls button {
    background: linear-gradient(135deg, #8b5cf6, #3b82f6);
    color: white;
    border: none;
    padding: 10px 24px;
    border-radius: 10px;
    font-family: 'Inter', sans-serif;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.2s;
  }
  .controls button:hover { transform: scale(1.05); }
  .timer {
    color: rgba(255,255,255,0.6);
    font-size: 14px;
    display: flex;
    align-items: center;
    font-variant-numeric: tabular-nums;
  }
</style>
</head>
<body>
<div class="video-container" id="videoContainer">
  <div class="watermark">NYAR AI</div>
  <div class="title-overlay">${content.title || ''}</div>
  ${sections.map((_, i) => `<div class="bg-glow glow-${i}"></div>`).join('\n  ')}
  ${sections.map((s, i) => `
  <div class="section section-${i}">
    <div class="section-label" style="color:${colors[i % colors.length]}">${s.label || 'SECTION'}</div>
    <div class="section-time">${s.time || ''}</div>
    <div class="section-text">${(s.text || '').replace(/\n/g, '<br>')}</div>
    ${s.visual_note ? `<div class="visual-note">🎥 ${s.visual_note}</div>` : ''}
  </div>`).join('')}
  <div class="progress-bar" id="progressBar"></div>
</div>
<div class="controls">
  <button onclick="replay()">🔄 Replay</button>
  <div class="timer" id="timer">0:00 / ${Math.floor(duration / 60)}:${String(duration % 60).padStart(2, '0')}</div>
</div>
<script>
  let startTime = Date.now();
  const totalDuration = ${duration} * 1000;
  function updateTimer() {
    const elapsed = Math.min(Date.now() - startTime, totalDuration);
    const sec = Math.floor(elapsed / 1000);
    const total = ${duration};
    document.getElementById('timer').textContent = 
      Math.floor(sec/60) + ':' + String(sec%60).padStart(2,'0') + ' / ' +
      Math.floor(total/60) + ':' + String(total%60).padStart(2,'0');
    if (elapsed < totalDuration) requestAnimationFrame(updateTimer);
  }
  updateTimer();
  function replay() {
    const container = document.getElementById('videoContainer');
    container.style.display = 'none';
    void container.offsetHeight;
    container.style.display = '';
    startTime = Date.now();
    updateTimer();
  }
</script>
</body>
</html>`;

    const filePath = path.join(this.htmlDir, `${videoId}.html`);
    fs.writeFileSync(filePath, html, 'utf8');

    const stats = fs.statSync(filePath);
    console.log(`🎬 HTML Video composed: ${filePath}`);

    return {
      filePath,
      filename: `${videoId}.html`,
      type: 'html',
      duration,
      fileSize: stats.size,
      renderer: 'html',
      previewUrl: `/output/html/${videoId}.html`,
    };
  }
}

module.exports = new VideoComposerService();
