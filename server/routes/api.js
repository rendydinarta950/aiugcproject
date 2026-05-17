const express = require('express');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const contentService = require('../services/contentService');
const aiService = require('../services/aiService');
const videoComposer = require('../services/videoComposer');
const ttsService = require('../services/ttsService');
const schedulerService = require('../services/schedulerService');
const imageService = require('../services/imageService');

// ===== NICHES =====
router.get('/niches', (req, res) => {
  try {
    const niches = contentService.getAllNiches();
    res.json({ success: true, data: niches });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/niches', (req, res) => {
  try {
    const { name, description, keywords, platform, language } = req.body;
    if (!name) return res.status(400).json({ success: false, error: 'Name is required' });
    const niche = contentService.createNiche({ name, description, keywords, platform, language });
    res.json({ success: true, data: niche });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/niches/:id', (req, res) => {
  try {
    contentService.deleteNiche(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== CONTENT RESEARCH =====
router.post('/research/:nicheId', async (req, res) => {
  try {
    const niche = contentService.getNicheById(req.params.nicheId);
    if (!niche) return res.status(404).json({ success: false, error: 'Niche not found' });
    const count = req.body.count || 10;
    const ideas = await aiService.researchContent(niche, count);
    // Save ideas to database
    const items = ideas.map(idea => ({
      niche_id: niche.id,
      title: idea.title,
      hook: idea.hook,
      viral_score: idea.viral_score || 0,
      duration_target: idea.duration_target || 30,
    }));
    const ids = contentService.createMultipleContent(items);
    const savedContent = ids.map(id => contentService.getContentById(id));
    res.json({ success: true, data: { ideas, saved: savedContent } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== CONTENT =====
router.get('/content', (req, res) => {
  try {
    const filters = {};
    if (req.query.niche_id) filters.niche_id = req.query.niche_id;
    if (req.query.status) filters.status = req.query.status;
    if (req.query.limit) filters.limit = parseInt(req.query.limit);
    const content = contentService.getAllContent(filters);
    res.json({ success: true, data: content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/content/:id', (req, res) => {
  try {
    const content = contentService.getContentById(req.params.id);
    if (!content) return res.status(404).json({ success: false, error: 'Content not found' });
    res.json({ success: true, data: content });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/content/generate-script', async (req, res) => {
  try {
    const { content_id } = req.body;
    if (!content_id) return res.status(400).json({ success: false, error: 'content_id required' });
    const content = contentService.getContentById(content_id);
    if (!content) return res.status(404).json({ success: false, error: 'Content not found' });
    const niche = contentService.getNicheById(content.niche_id);
    const scriptData = await aiService.generateScript(content, niche);
    // Update content with generated script
    const updated = contentService.updateContent(content_id, {
      script: JSON.stringify(scriptData),
      status: 'scripted'
    });
    res.json({ success: true, data: { script: scriptData, content: updated } });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/content/:id', (req, res) => {
  try {
    const updated = contentService.updateContent(req.params.id, req.body);
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/content/:id', (req, res) => {
  try {
    contentService.deleteContent(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== VIDEOS =====
router.get('/videos', (req, res) => {
  try {
    const videos = contentService.getAllVideos(req.query);
    res.json({ success: true, data: videos });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== SCHEDULES =====
router.get('/schedules', (req, res) => {
  try {
    const schedules = contentService.getSchedules();
    res.json({ success: true, data: schedules });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/schedules', (req, res) => {
  try {
    const schedule = contentService.createSchedule(req.body);
    res.json({ success: true, data: schedule });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/schedules/:id/toggle', (req, res) => {
  try {
    contentService.toggleSchedule(req.params.id, req.body.is_active);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== DASHBOARD =====
router.get('/dashboard', (req, res) => {
  try {
    const stats = contentService.getDashboardStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ===== VIDEO COMPOSITION (Phase 3) =====
router.post('/videos/compose', async (req, res) => {
  try {
    const { content_id } = req.body;
    if (!content_id) return res.status(400).json({ success: false, error: 'content_id required' });

    const content = contentService.getContentById(content_id);
    if (!content) return res.status(404).json({ success: false, error: 'Content not found' });

    let scriptData;
    try { scriptData = JSON.parse(content.script); }
    catch { return res.status(400).json({ success: false, error: 'Content has no valid script. Generate a script first.' }); }

    // Generate TTS
    const scriptText = scriptData.script_full || scriptData.sections?.map(s => s.text).join(' ') || content.title;
    const audioResult = await ttsService.generateSpeech(scriptText);

    // Compose video
    const videoResult = await videoComposer.composeVideo(content, scriptData);

    // Save to DB
    const video = contentService.createVideo({
      content_id: content.id,
      filename: videoResult.filename,
      duration_seconds: videoResult.duration,
      resolution: '1080x1920',
      status: 'done',
      file_path: videoResult.filePath,
      file_size: videoResult.fileSize || 0,
    });

    contentService.updateContent(content_id, { status: 'done' });

    res.json({
      success: true,
      data: {
        video,
        renderer: videoResult.renderer,
        previewUrl: videoResult.previewUrl || null,
        audioProvider: audioResult.provider,
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/videos/:id/preview', (req, res) => {
  try {
    const videos = contentService.getAllVideos();
    const video = videos.find(v => v.id === parseInt(req.params.id));
    if (!video) return res.status(404).json({ success: false, error: 'Video not found' });
    if (!video.file_path || !fs.existsSync(video.file_path)) {
      return res.status(404).json({ success: false, error: 'Video file not found on disk' });
    }
    res.sendFile(path.resolve(video.file_path));
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ===== SCHEDULER (Phase 4) =====
router.post('/scheduler/start', (req, res) => {
  try {
    schedulerService.start();
    res.json({ success: true, data: schedulerService.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/stop', (req, res) => {
  try {
    schedulerService.stop();
    res.json({ success: true, data: schedulerService.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/scheduler/status', (req, res) => {
  try {
    res.json({ success: true, data: schedulerService.getStatus() });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/scheduler/trigger/:nicheId', async (req, res) => {
  try {
    const result = await schedulerService.triggerManual(parseInt(req.params.nicheId));
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});


// ===== IMAGE GENERATION =====

// Generate an optimized Imagen prompt from a rough user idea (Gemini 3 Flash)
router.post('/images/generate-prompt', async (req, res) => {
  try {
    const { idea, size = '9:16 vertical' } = req.body;
    if (!idea) return res.status(400).json({ success: false, error: 'idea is required' });

    const prompt = await imageService.generateImagePrompt(
      { title: idea, hook: idea },
      { name: 'general', platform: 'TikTok' },
      'ugc',
      size,
    );
    res.json({ success: true, prompt });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate image from a content idea (full pipeline: Gemini prompt → Imagen)
router.post('/images/generate', async (req, res) => {
  try {
    const { content_id, style, custom_prompt } = req.body;

    let idea, niche;
    if (content_id) {
      const content = contentService.getContentById(content_id);
      if (!content) return res.status(404).json({ success: false, error: 'Content not found' });
      niche = contentService.getNicheById(content.niche_id);
      idea = content;
    } else if (custom_prompt) {
      // Raw prompt mode - no content needed
      const result = await imageService.generateFromPrompt(custom_prompt);
      return res.json({ success: true, data: result });
    } else {
      return res.status(400).json({ success: false, error: 'content_id or custom_prompt required' });
    }

    const result = await imageService.generateContentImage(idea, niche, { style, customPrompt: custom_prompt });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Generate multiple images (3 styles) for a content
router.post('/images/generate-multiple', async (req, res) => {
  try {
    const { content_id, count = 3 } = req.body;
    if (!content_id) return res.status(400).json({ success: false, error: 'content_id required' });

    const content = contentService.getContentById(content_id);
    if (!content) return res.status(404).json({ success: false, error: 'Content not found' });
    const niche = contentService.getNicheById(content.niche_id);

    const results = await imageService.generateMultipleImages(content, niche, count);
    res.json({ success: true, data: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// List all generated images
router.get('/images', (req, res) => {
  try {
    const imgDir = require('path').join(__dirname, '..', '..', 'output', 'images');
    if (!require('fs').existsSync(imgDir)) return res.json({ success: true, data: [] });

    const files = require('fs').readdirSync(imgDir)
      .filter(f => /\.(png|jpg|jpeg|webp)$/i.test(f))
      .map(f => {
        const stat = require('fs').statSync(require('path').join(imgDir, f));
        return {
          filename: f,
          fileSize: stat.size,
          created_at: stat.birthtime,
          url: `/output/images/${f}`,
        };
      })
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Delete an image
router.delete('/images/:filename', (req, res) => {
  try {
    const filePath = require('path').join(__dirname, '..', '..', 'output', 'images', req.params.filename);
    if (require('fs').existsSync(filePath)) require('fs').unlinkSync(filePath);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
