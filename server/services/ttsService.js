const https = require('https');
const fs = require('fs');
const path = require('path');

/**
 * TTS Service - Text-to-Speech using multiple providers:
 * 1. ElevenLabs API (if key configured) - premium natural voice
 * 2. Built-in Web Speech synthesis fallback via browser
 * 3. Silent audio placeholder for testing
 */
class TTSService {
  constructor() {
    this.outputDir = path.join(__dirname, '..', '..', 'output', 'audio');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  hasElevenLabsKey() {
    const key = process.env.ELEVENLABS_API_KEY;
    return key && key.length > 10 && !key.includes('your_') && !key.includes('_here');
  }

  /**
   * Generate speech audio from text
   * Returns: { filePath, duration, provider }
   */
  async generateSpeech(text, options = {}) {
    const filename = `tts_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.mp3`;
    const filePath = path.join(this.outputDir, filename);

    // Try ElevenLabs first
    if (this.hasElevenLabsKey()) {
      try {
        const result = await this.elevenLabsTTS(text, filePath, options);
        return { ...result, provider: 'elevenlabs' };
      } catch (err) {
        console.error('ElevenLabs TTS error:', err.message);
      }
    }

    // Fallback: generate a silent/placeholder audio with estimated duration
    const estimatedDuration = this.estimateDuration(text);
    await this.generatePlaceholderAudio(filePath, estimatedDuration);
    return { filePath, duration: estimatedDuration, provider: 'placeholder' };
  }

  /**
   * ElevenLabs TTS API
   */
  async elevenLabsTTS(text, filePath, options = {}) {
    const voiceId = options.voiceId || '21m00Tcm4TlvDq8ikWAM'; // Rachel - default
    const modelId = options.modelId || 'eleven_multilingual_v2';

    return new Promise((resolve, reject) => {
      const payload = JSON.stringify({
        text,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true,
        },
      });

      const reqOptions = {
        hostname: 'api.elevenlabs.io',
        path: `/v1/text-to-speech/${voiceId}`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Accept': 'audio/mpeg',
        },
      };

      const req = https.request(reqOptions, (res) => {
        if (res.statusCode !== 200) {
          let body = '';
          res.on('data', (c) => body += c);
          res.on('end', () => reject(new Error(`ElevenLabs API ${res.statusCode}: ${body}`)));
          return;
        }

        const writeStream = fs.createWriteStream(filePath);
        res.pipe(writeStream);
        writeStream.on('finish', () => {
          const stats = fs.statSync(filePath);
          // Estimate duration from file size (MP3 ~16KB/sec at 128kbps)
          const duration = Math.ceil(stats.size / 16000);
          resolve({ filePath, duration });
        });
        writeStream.on('error', reject);
      });

      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  /**
   * Estimate speech duration from text (words per minute basis)
   * Indonesian speech: ~140 WPM casual, ~160 WPM fast
   */
  estimateDuration(text) {
    const words = text.split(/\s+/).filter(Boolean).length;
    const wpm = 150; // average speaking rate
    const seconds = Math.ceil((words / wpm) * 60);
    return Math.max(3, Math.min(60, seconds)); // clamp 3-60s
  }

  /**
   * Generate a minimal valid MP3 placeholder (silence)
   * This creates a tiny valid MP3 file for pipeline testing
   */
  async generatePlaceholderAudio(filePath, durationSec) {
    // Minimal MP3 frame header for silence
    // This is a valid but near-silent MP3 that players can read
    const frameHeader = Buffer.from([
      0xFF, 0xFB, 0x90, 0x00, // MPEG1 Layer3 128kbps 44100Hz stereo
    ]);
    const frameData = Buffer.alloc(413, 0); // rest of frame is silence
    const frame = Buffer.concat([frameHeader, frameData]);

    // ~38 frames per second at 128kbps
    const framesNeeded = Math.ceil(durationSec * 38);
    const frames = [];
    for (let i = 0; i < Math.min(framesNeeded, 300); i++) { // cap at ~8s worth
      frames.push(frame);
    }

    fs.writeFileSync(filePath, Buffer.concat(frames));
    console.log(`🔇 Placeholder audio: ${filePath} (~${durationSec}s)`);
  }
}

module.exports = new TTSService();
