const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

/**
 * Image Service
 * 
 * Handles AI image generation via router.getcore.id:
 * 1. Gemini 3 Flash → generates optimized image prompt from content context
 * 2. Imagen 3.0-generate-002 → renders the actual image (foto realistik, ~$0.025/img)
 *
 * Usage flow:
 *   generateContentImage(idea, niche, style) →
 *     [Gemini generates prompt] → [Imagen renders image] → saved to disk
 */
class ImageService {
  constructor() {
    this.baseUrl = process.env.AI_BASE_URL || 'https://router.getcore.id/v1';
    this.apiKey = process.env.AI_API_KEY || 'intern1';
    this.textModel = process.env.TEXT_MODEL || 'gemini-3-flash-preview';
    this.imageModel = process.env.IMAGE_MODEL || 'imagen-3.0-generate-002';

    this.outputDir = path.join(__dirname, '..', '..', 'output', 'images');
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /** Core HTTP request to the AI router */
  callAPI(endpoint, body) {
    return new Promise((resolve, reject) => {
      const url = new URL(`${this.baseUrl}${endpoint}`);
      const payload = JSON.stringify(body);
      const req = https.request({
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
      }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
          try { resolve(JSON.parse(data)); }
          catch (e) { reject(new Error(`Parse error: ${data.substring(0, 200)}`)); }
        });
      });
      req.on('error', reject);
      req.write(payload);
      req.end();
    });
  }

  /**
   * Step 1: Generate optimized image prompt using Gemini 3 Flash
   * Takes content context → returns detailed Imagen-ready prompt
   */
  async generateImagePrompt(idea, niche, style = 'ugc', size = '9:16 vertical') {
    const styleGuides = {
      ugc: 'UGC (User Generated Content) aesthetic, phone camera style, natural candid feel, slightly imperfect, authentic',
      product: 'product photography, clean background, professional lighting, sharp focus, commercial quality',
      lifestyle: 'lifestyle photography, natural environment, warm tones, golden hour lighting, relatable everyday setting',
      tutorial: 'step-by-step visual, flat lay or over-the-shoulder angle, educational feel, organized composition',
    };

    const styleDesc = styleGuides[style] || styleGuides.ugc;

    const systemPrompt = `Kamu adalah AI prompt engineer expert untuk image generation. 
Tugasmu: buat satu image generation prompt yang sangat detail dan optimal untuk Imagen AI.
PENTING: Gunakan TEPAT subject/objek yang disebutkan user. Jangan ganti atau tambah subject lain yang tidak diminta.
Output: HANYA text prompt dalam Bahasa Inggris, maksimal 150 kata, tanpa penjelasan tambahan.`;

    const userPrompt = `Buat image generation prompt berdasarkan ide berikut:
- Ide/Subject: ${idea.title}${idea.hook && idea.hook !== idea.title ? `\n- Detail tambahan: ${idea.hook}` : ''}
- Style visual: ${styleDesc}

Kriteria:
- WAJIB: subject utama harus PERSIS sesuai ide di atas (jangan tambah orang/manusia jika tidak disebutkan)
- Foto realistik, bukan ilustrasi atau kartun
- Lighting: natural, soft, cinematic
- Angle: eye-level atau sesuai subject
- Mood: authentic, engaging, high quality

Tambahkan technical tags: photorealistic, ${size}, DSLR quality, sharp focus on subject`;

    const response = await this.callAPI('/chat/completions', {
      model: this.textModel,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: 300,
      temperature: 0.7,
    });

    if (!response.choices || !response.choices[0]) {
      throw new Error('Failed to generate image prompt: ' + JSON.stringify(response));
    }

    const prompt = response.choices[0].message.content.trim();
    console.log(`📝 Image prompt generated (${prompt.length} chars): ${prompt.substring(0, 80)}...`);
    return prompt;
  }

  /**
   * Step 2: Generate actual image using Imagen
   * Returns: { filePath, filename, prompt, model, size }
   */
  async renderImage(prompt) {
    const response = await this.callAPI('/chat/completions', {
      model: this.imageModel,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 100,
    });

    if (!response.choices || !response.choices[0]?.message?.images?.length) {
      throw new Error('No image returned from Imagen: ' + JSON.stringify(response).substring(0, 200));
    }

    const imageData = response.choices[0].message.images[0].image_url.url;
    const b64 = imageData.replace(/^data:image\/\w+;base64,/, '');
    const ext = imageData.startsWith('data:image/png') ? 'png' : 'jpg';
    const filename = `img_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const filePath = path.join(this.outputDir, filename);

    fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));

    const stats = fs.statSync(filePath);
    console.log(`🖼️  Image rendered: ${filename} (${(stats.size / 1024).toFixed(0)}KB) via ${this.imageModel}`);

    return {
      filePath,
      filename,
      fileSize: stats.size,
      model: this.imageModel,
      promptModel: this.textModel,
    };
  }

  /**
   * Full pipeline: idea + niche → prompt → image
   * This is the main entry point.
   */
  async generateContentImage(idea, niche, options = {}) {
    const style = options.style || 'ugc';
    const customPrompt = options.customPrompt || null;

    console.log(`🎨 Generating image for: "${idea.title}" [${this.imageModel}]`);

    // Step 1: Generate or use custom prompt
    let prompt;
    if (customPrompt) {
      prompt = customPrompt;
      console.log('📝 Using custom prompt');
    } else {
      prompt = await this.generateImagePrompt(idea, niche, style);
    }

    // Step 2: Render image
    const result = await this.renderImage(prompt);

    return {
      ...result,
      prompt,
      style,
      nicheId: niche.id,
      contentId: idea.id || null,
    };
  }

  /**
   * Generate multiple images for a content piece (for different sections)
   */
  async generateMultipleImages(idea, niche, count = 3) {
    const styles = ['ugc', 'lifestyle', 'tutorial'];
    const results = [];

    for (let i = 0; i < Math.min(count, styles.length); i++) {
      try {
        const result = await this.generateContentImage(idea, niche, { style: styles[i] });
        results.push({ ...result, index: i, style: styles[i] });
      } catch (err) {
        console.error(`Image ${i + 1} failed:`, err.message);
        results.push({ error: err.message, index: i, style: styles[i] });
      }
    }

    return results;
  }

  /**
   * Quick generate from raw prompt only (for manual UI input)
   */
  async generateFromPrompt(rawPrompt, label = 'manual') {
    console.log(`🎨 Quick generate: "${rawPrompt.substring(0, 50)}..."`);
    const result = await this.renderImage(rawPrompt);
    return { ...result, prompt: rawPrompt, label };
  }
}

module.exports = new ImageService();
