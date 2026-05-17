const cron = require('node-cron');
const contentService = require('./contentService');
const aiService = require('./aiService');
const ttsService = require('./ttsService');
const videoComposer = require('./videoComposer');

/**
 * Scheduler Service - Automates the content pipeline:
 * Research → Script → TTS → Video Composition
 * 
 * Default: 3 videos/day at 08:00, 12:00, 18:00
 * Monthly: ~90 content pieces
 */
class SchedulerService {
  constructor() {
    this.jobs = new Map();
    this.isRunning = false;
    this.logs = [];
    this.maxLogs = 200;
  }

  log(message, level = 'info') {
    const entry = { timestamp: new Date().toISOString(), message, level };
    this.logs.unshift(entry);
    if (this.logs.length > this.maxLogs) this.logs.pop();
    const icon = level === 'error' ? '❌' : level === 'warn' ? '⚠️' : level === 'success' ? '✅' : 'ℹ️';
    console.log(`[Scheduler] ${icon} ${message}`);
  }

  /**
   * Initialize scheduler based on active schedules in DB
   */
  start() {
    if (this.isRunning) {
      this.log('Scheduler already running', 'warn');
      return;
    }

    this.log('Starting scheduler service...');
    this.isRunning = true;

    // Load active schedules
    const schedules = contentService.getSchedules();
    const activeSchedules = schedules.filter(s => s.is_active);

    if (activeSchedules.length === 0) {
      this.log('No active schedules found. Create one via the Schedule page.', 'warn');
    }

    for (const schedule of activeSchedules) {
      this.setupScheduleJob(schedule);
    }

    // Also run a master job that checks for new/changed schedules every 5 minutes
    this.masterJob = cron.schedule('*/5 * * * *', () => {
      this.syncSchedules();
    });

    this.log(`Scheduler started with ${activeSchedules.length} active schedule(s)`, 'success');
  }

  /**
   * Stop all scheduler jobs
   */
  stop() {
    this.jobs.forEach((job, id) => {
      job.stop();
      this.log(`Stopped job for schedule #${id}`);
    });
    this.jobs.clear();
    if (this.masterJob) {
      this.masterJob.stop();
      this.masterJob = null;
    }
    this.isRunning = false;
    this.log('Scheduler stopped', 'warn');
  }

  /**
   * Sync jobs with database schedules
   */
  syncSchedules() {
    const schedules = contentService.getSchedules();
    const activeIds = new Set();

    for (const schedule of schedules) {
      if (schedule.is_active) {
        activeIds.add(schedule.id);
        if (!this.jobs.has(schedule.id)) {
          this.setupScheduleJob(schedule);
        }
      }
    }

    // Stop removed/deactivated schedules
    for (const [id, job] of this.jobs) {
      if (!activeIds.has(id)) {
        job.stop();
        this.jobs.delete(id);
        this.log(`Deactivated job for schedule #${id}`);
      }
    }
  }

  /**
   * Setup a cron job for a schedule
   */
  setupScheduleJob(schedule) {
    let timeSlots;
    try { timeSlots = JSON.parse(schedule.time_slots || '[]'); }
    catch { timeSlots = ['08:00', '12:00', '18:00']; }

    // Create a cron job for each time slot
    for (const slot of timeSlots) {
      const [hour, minute] = slot.split(':').map(Number);
      const cronExpr = `${minute || 0} ${hour || 8} * * *`;

      const job = cron.schedule(cronExpr, async () => {
        this.log(`⏰ Triggered: Schedule #${schedule.id} (${schedule.niche_name || 'Unknown'}) at ${slot}`);
        await this.executeContentPipeline(schedule);
      });

      this.jobs.set(`${schedule.id}_${slot}`, job);
      this.log(`Scheduled: ${schedule.niche_name || 'Niche #' + schedule.niche_id} at ${slot} daily`);
    }
  }

  /**
   * Execute the full content pipeline for a schedule:
   * Research → Pick Best → Script → TTS → Video
   */
  async executeContentPipeline(schedule) {
    const startTime = Date.now();
    const nicheId = schedule.niche_id;

    try {
      // Step 1: Get niche info
      const niche = contentService.getNicheById(nicheId);
      if (!niche) {
        this.log(`Niche #${nicheId} not found, skipping`, 'error');
        return null;
      }

      this.log(`🔍 Step 1/4: Researching viral content for "${niche.name}"...`);

      // Step 2: Research content ideas
      const ideas = await aiService.researchContent(niche, 5);
      if (!ideas || ideas.length === 0) {
        this.log('No ideas generated, skipping', 'error');
        return null;
      }

      // Pick the highest viral score idea
      const bestIdea = ideas.reduce((best, curr) =>
        (curr.viral_score || 0) > (best.viral_score || 0) ? curr : best, ideas[0]);

      // Save to DB
      const savedIds = contentService.createMultipleContent([{
        niche_id: niche.id,
        title: bestIdea.title,
        hook: bestIdea.hook,
        viral_score: bestIdea.viral_score || 0,
        duration_target: bestIdea.duration_target || 30,
      }]);

      const contentId = savedIds[0];
      this.log(`📝 Best idea: "${bestIdea.title}" (score: ${bestIdea.viral_score})`);

      // Step 3: Generate script
      this.log(`✍️ Step 2/4: Generating script...`);
      const scriptData = await aiService.generateScript(bestIdea, niche);
      contentService.updateContent(contentId, {
        script: JSON.stringify(scriptData),
        status: 'scripted',
      });

      // Step 4: Generate TTS audio
      this.log(`🎙️ Step 3/4: Generating voiceover...`);
      const scriptText = scriptData.script_full || scriptData.sections?.map(s => s.text).join(' ') || bestIdea.title;
      const audioResult = await ttsService.generateSpeech(scriptText);
      this.log(`🔊 Audio: ${audioResult.provider} (~${audioResult.duration}s)`);

      // Step 5: Compose video
      this.log(`🎬 Step 4/4: Composing video...`);
      const content = contentService.getContentById(contentId);
      const videoResult = await videoComposer.composeVideo(content, scriptData);

      // Save video to DB
      contentService.createVideo({
        content_id: contentId,
        filename: videoResult.filename,
        duration_seconds: videoResult.duration,
        resolution: '1080x1920',
        status: 'done',
        file_path: videoResult.filePath,
        file_size: videoResult.fileSize || 0,
      });

      // Update content status
      contentService.updateContent(contentId, { status: 'done' });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      this.log(`✅ Pipeline complete: "${bestIdea.title}" (${elapsed}s) → ${videoResult.renderer}`, 'success');

      return { contentId, videoResult, elapsed };
    } catch (error) {
      this.log(`Pipeline failed: ${error.message}`, 'error');
      return null;
    }
  }

  /**
   * Manually trigger the pipeline for a specific niche (on-demand)
   */
  async triggerManual(nicheId) {
    const niche = contentService.getNicheById(nicheId);
    if (!niche) throw new Error('Niche not found');

    this.log(`🖐️ Manual trigger for "${niche.name}"`);
    return this.executeContentPipeline({ niche_id: nicheId, niche_name: niche.name });
  }

  /**
   * Get scheduler status and recent logs
   */
  getStatus() {
    const activeJobs = [];
    this.jobs.forEach((job, key) => {
      activeJobs.push({ id: key, running: true });
    });

    return {
      isRunning: this.isRunning,
      activeJobs: activeJobs.length,
      jobs: activeJobs,
      recentLogs: this.logs.slice(0, 50),
    };
  }
}

module.exports = new SchedulerService();
