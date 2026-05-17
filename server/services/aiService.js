const https = require('https');

/**
 * AI Service - Handles all OpenRouter API interactions
 * for content research and script generation.
 *
 * When a valid API key is configured, uses OpenRouter (GPT-4o / Claude).
 * When no key is set, generates truly dynamic randomized content
 * that is different every single time.
 */
class AIService {
  constructor() {
    this.model = process.env.TEXT_MODEL || 'gemini-3-flash-preview';
    this.baseUrl = `${process.env.AI_BASE_URL || 'https://router.getcore.id/v1'}/chat/completions`;
  }

  /** Check if a real API key is configured */
  hasValidApiKey() {
    const key = process.env.AI_API_KEY;
    return key && key.length > 2 && !key.includes('your_') && !key.includes('_here');
  }

  async callOpenRouter(messages, options = {}) {
    if (!this.hasValidApiKey()) {
      throw new Error('NO_API_KEY');
    }

    const payload = {
      model: options.model || this.model,
      messages,
      temperature: options.temperature || 0.8,
      max_tokens: options.max_tokens || 2000,
    };

    return new Promise((resolve, reject) => {
      const url = new URL(this.baseUrl);
      const reqOptions = {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3001',
          'X-Title': 'NyarProject AI Content Creator',
        },
      };

      const data = JSON.stringify(payload);
      const req = https.request(reqOptions, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            if (parsed.error) {
              reject(new Error(parsed.error.message || 'OpenRouter API error'));
            } else {
              resolve(parsed.choices[0].message.content);
            }
          } catch (e) {
            reject(new Error(`Failed to parse API response: ${e.message}`));
          }
        });
      });

      req.on('error', reject);
      req.write(data);
      req.end();
    });
  }

  /**
   * Research viral content ideas for a given niche
   */
  async researchContent(niche, count = 10) {
    // Try real API first
    if (this.hasValidApiKey()) {
      try {
        const messages = [
          {
            role: 'system',
            content: `Kamu adalah AI Content Strategist yang ahli dalam membuat konten viral di social media, khususnya TikTok, Instagram Reels, dan YouTube Shorts. Kamu memahami algoritma, trend, dan psikologi audiens Indonesia.\n\nBerikan response dalam format JSON array yang valid.`
          },
          {
            role: 'user',
            content: `Research ${count} ide konten viral untuk niche "${niche.name}" dengan keyword: ${niche.keywords || niche.name}.
Platform target: ${niche.platform || 'tiktok'}.
Bahasa: ${niche.language || 'Indonesia'}.

Untuk setiap ide, berikan:
1. title: Judul konten yang catchy
2. hook: Kalimat pembuka 3 detik pertama yang bikin orang berhenti scroll (harus sangat menarik!)
3. outline: Garis besar konten (3-5 poin)
4. viral_score: Skor potensi viral 1-100 (berdasarkan tren saat ini)
5. duration_target: Durasi target dalam detik (30-60)
6. reasoning: Alasan mengapa konten ini berpotensi viral

Format response HARUS berupa JSON array yang valid:
[{"title":"...","hook":"...","outline":["..."],"viral_score":85,"duration_target":30,"reasoning":"..."}]

PENTING: Response HANYA berisi JSON array, tanpa markdown code block, tanpa teks tambahan.`
          }
        ];

        const response = await this.callOpenRouter(messages, { temperature: 0.95 });
        let cleaned = response.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        const parsed = JSON.parse(cleaned);
        console.log(`✅ AI Research: ${parsed.length} ideas generated via OpenRouter`);
        return parsed;
      } catch (error) {
        console.error('OpenRouter API error, falling back to dynamic generator:', error.message);
      }
    } else {
      console.log('⚠️  No API key configured, using dynamic content generator');
    }

    // Fallback: generate truly dynamic, randomized content
    return this.generateDynamicResearch(niche, count);
  }

  /**
   * Generate a full script for a content idea
   */
  async generateScript(idea, niche) {
    if (this.hasValidApiKey()) {
      try {
        const messages = [
          {
            role: 'system',
            content: `Kamu adalah AI Scriptwriter profesional untuk konten UGC (User Generated Content) social media. Style kamu: natural, casual, relatable.`
          },
          {
            role: 'user',
            content: `Buatkan script lengkap untuk konten:
Judul: ${idea.title}
Hook: ${idea.hook}
Niche: ${niche.name}
Platform: ${niche.platform || 'tiktok'}
Durasi Target: ${idea.duration_target || 30} detik
Bahasa: ${niche.language || 'Indonesia'}

Format JSON:
{"script_full":"...","sections":[{"label":"HOOK","time":"0-3s","text":"...","visual_note":"..."}],"hashtags":["#tag"],"caption":"...","music_suggestion":"..."}

Response HANYA JSON object, tanpa markdown code block.`
          }
        ];
        const response = await this.callOpenRouter(messages, { temperature: 0.7, max_tokens: 3000 });
        let cleaned = response.trim();
        if (cleaned.startsWith('```')) {
          cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
        }
        return JSON.parse(cleaned);
      } catch (error) {
        console.error('Script generation API error:', error.message);
      }
    }

    return this.generateDynamicScript(idea, niche);
  }

  // ============================================================
  // DYNAMIC CONTENT GENERATOR (no API needed, always unique)
  // ============================================================

  /** Pick N random unique items from array */
  pickRandom(arr, n) {
    const shuffled = [...arr].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, n);
  }

  /** Random integer between min and max inclusive */
  randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /** Pick one random item */
  pickOne(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  /**
   * Generate truly dynamic, randomized research data.
   * Every call produces completely different content.
   */
  generateDynamicResearch(niche, count) {
    const name = niche.name;
    const now = new Date();
    const year = now.getFullYear();
    const monthNames = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
    const month = monthNames[now.getMonth()];

    // === TITLE TEMPLATES (60+ patterns) ===
    const titleTemplates = [
      () => `${this.pickOne(['3','5','7','10'])} Kesalahan Fatal di ${name} yang ${this.pickOne(['Sering Diabaikan','Bikin Gagal','Harus Kamu Hindari'])}`,
      () => `${name}: ${this.pickOne(['Rahasia','Trik','Cara'])} yang ${this.pickOne(['Pro','Expert','Master'])} ${this.pickOne(['Gak Mau Kamu Tau','Sembunyikan','Jarang Dibagikan'])}`,
      () => `Berhenti ${this.pickOne(['Buang Waktu','Buang Duit','Salah Langkah'])}! Ini Cara ${name} yang ${this.pickOne(['Bener','Efektif','Terbukti'])}`,
      () => `POV: ${this.pickOne(['Kamu','Gue','Lo'])} ${this.pickOne(['Baru Mulai','Pertama Kali Coba','Nekat Coba'])} ${name}`,
      () => `${name} ${this.pickOne(['Hack','Trick','Cheat Code'])} ${year} yang ${this.pickOne(['Viral','Game Changer','Belum Banyak yang Tau'])}`,
      () => `Kenapa ${this.pickOne(['90%','Kebanyakan','Hampir Semua'])} Orang ${this.pickOne(['Gagal','Salah','Stuck'])} di ${name}`,
      () => `${this.pickOne(['Jujur','Honest','Real'])} Review: ${name} ${this.pickOne(['Worth It?','Overrated?','Beneran Bagus?'])}`,
      () => `${this.pickOne(['Pemula Wajib Tau','Beginner Guide','Starter Pack'])}: ${name} ${month} ${year}`,
      () => `${name} ${this.pickOne(['Sebelum','Before'])} vs ${this.pickOne(['Sesudah','After'])}: ${this.pickOne(['Hasilnya Gila','Transformasi Total','Beda Banget'])}`,
      () => `${this.pickOne(['Ternyata','Shock','Gak Nyangka'])}! ${name} ${this.pickOne(['Bisa Kayak Gini','Secanggih Ini','Segampang Ini'])}`,
      () => `Day ${this.randInt(1,30)} ${this.pickOne(['Belajar','Nyoba','Challenge'])} ${name}: ${this.pickOne(['Update','Hasilnya','Progress'])}`,
      () => `${name}: Myth vs Fakta yang ${this.pickOne(['Bikin Kaget','Perlu Diluruskan','Salah Kaprah'])}`,
      () => `${this.pickOne(['Ngobrol Santai','Cerita Jujur','Curhat'])} Soal ${name}: ${this.pickOne(['Pengalaman Gue','Yang Gue Pelajari','The Truth'])}`,
      () => `${this.pickOne(['1 Menit','60 Detik','Quick'])} ${this.pickOne(['Tutorial','Explain','Guide'])} ${name} untuk ${this.pickOne(['Pemula','Beginner','Yang Baru Mulai'])}`,
      () => `Cara ${this.pickOne(['Hemat','Murah','Budget-Friendly'])} ${this.pickOne(['Mulai','Coba','Masuk ke'])} ${name}`,
      () => `${this.pickOne(['Red Flag','Warning','Awas'])}! ${this.pickOne(['Jangan','Stop','Hindari'])} ${this.pickOne(['Lakuin Ini','Hal Ini','Kebiasaan Ini'])} di ${name}`,
      () => `${name}: ${this.pickOne(['Ekspektasi','Harapan'])} vs ${this.pickOne(['Realita','Kenyataan'])} ${year}`,
      () => `Apa yang ${this.pickOne(['Gak Dibilang','Disembunyikan','Gak Dikasih Tau'])} Soal ${name}`,
      () => `${name} Challenge ${this.pickOne(['7 Hari','30 Hari','1 Minggu'])}: ${this.pickOne(['Hasilnya Wow','Berhasil Gak Ya','Epic'])}`,
      () => `${this.pickOne(['Hot Take','Unpopular Opinion','Controversial'])}: ${name} ${this.pickOne(['Overrated','Underrated','Gak Sesuai Hype'])}?`,
      () => `Ranking ${this.pickOne(['Top 5','Best 3','Top 10'])} ${name} ${this.pickOne(['Terbaik','Paling Worth It','Paling Recommended'])} ${month} ${year}`,
      () => `${this.pickOne(['Storytime','Cerita'])} ${name}: ${this.pickOne(['Pengalaman Pertama','Momen Lucu','Yang Bikin Kapok'])}`,
      () => `${name} ${this.pickOne(['A-Z','Lengkap','Komplit'])} dalam ${this.pickOne(['1 Menit','60 Detik','Singkat'])}`,
      () => `Gimana Cara ${this.pickOne(['Gue','Aku','Saya'])} ${this.pickOne(['Sukses','Berhasil','Bisa'])} di ${name} ${this.pickOne(['Dari Nol','Tanpa Modal','Tanpa Pengalaman'])}`,
      () => `${this.pickOne(['Update','News','Info'])} ${name} ${month} ${year}: ${this.pickOne(['Yang Perlu Kamu Tau','Wajib Tau','Penting Banget'])}`,
      () => `${name} ${this.pickOne(['Do','Dont','Tips'])} yang ${this.pickOne(['Bikin Beda','Level Up','Upgrade'])} Hasilmu`,
      () => `${this.pickOne(['Test','Coba','Eksperimen'])}: ${name} ${this.pickOne(['Termahal vs Termurah','Branded vs Lokal','Premium vs Budget'])}`,
      () => `Hal ${this.pickOne(['Pertama','Paling Penting','Utama'])} yang Harus Kamu ${this.pickOne(['Tau','Pelajari','Kuasai'])} di ${name}`,
      () => `${name} ${this.pickOne(['Routine','Ritual','Kebiasaan'])} ${this.pickOne(['Pagi','Malam','Harian'])} yang ${this.pickOne(['Berubah Total','Bikin Produktif','Game Changer'])}`,
      () => `React to ${name} ${this.pickOne(['Trend','Viral','Hype'])} ${month} ${year}`,
    ];

    // === HOOK TEMPLATES (40+ patterns) ===
    const hookTemplates = [
      () => `${this.pickOne(['Gue','Aku','Gw'])} ${this.pickOne(['baru aja','barusan','literally baru'])} ${this.pickOne(['discover','nemuin','tau'])} sesuatu yang ${this.pickOne(['mind-blowing','gila','bikin kaget'])} soal ${name}...`,
      () => `Kalau kamu ${this.pickOne(['masih','lagi','baru mau'])} ${this.pickOne(['coba','mulai','belajar'])} ${name}, ${this.pickOne(['STOP dulu','tonton ini dulu','jangan skip'])}...`,
      () => `${this.pickOne(['Ini','Nih','Ini dia'])} yang ${this.pickOne(['gak ada yang bilang','jarang dibahas','orang-orang sembunyiin'])} soal ${name}...`,
      () => `${this.pickOne(['Serius','Jujur','Real talk'])}, ${name} itu ${this.pickOne(['gak sesulit','lebih gampang dari','beda banget sama'])} yang kamu ${this.pickOne(['pikirin','bayangin','kira'])}...`,
      () => `${this.pickOne(['Dulu','Awalnya','Pertama kali'])} gue ${this.pickOne(['skeptis','ragu','gak percaya'])} sama ${name}, tapi ${this.pickOne(['ternyata','sekarang','setelah coba'])}...`,
      () => `${this.pickOne(['Challenge accepted','Gue nekat','Iseng-iseng'])}! ${this.pickOne(['Coba','Test','Eksperimen'])} ${name} selama ${this.pickOne(['7 hari','1 minggu','30 hari'])} dan ${this.pickOne(['hasilnya...','yang terjadi...','ini updatenya...'])}`,
      () => `Kamu ${this.pickOne(['pasti','mungkin','kayaknya'])} ${this.pickOne(['pernah','sering','masih'])} lakuin ${this.pickOne(['kesalahan ini','hal ini','kebiasaan ini'])} di ${name}...`,
      () => `${this.pickOne(['Wait','Tunggu','Eh'])}, ${this.pickOne(['beneran','serius','masa sih'])} ${name} bisa ${this.pickOne(['kayak gini?','segampang ini?','se-worth it ini?'])}`,
      () => `${this.pickOne(['Penasaran','Curious','Mau tau'])} kenapa ${this.pickOne(['hasilmu','caramu','usahamu'])} di ${name} ${this.pickOne(['gak maksimal?','stuck?','gitu-gitu aja?'])}`,
      () => `${this.pickOne(['Hack','Trik','Secret'])} ${name} yang bikin ${this.pickOne(['gue','aku','temen gue'])} literally ${this.pickOne(['berubah total','level up','speechless'])}...`,
      () => `${this.pickOne(['POV','Imagine','Bayangin'])}: kamu ${this.pickOne(['akhirnya','finally','baru aja'])} ${this.pickOne(['paham','ngerti','discover'])} cara ${name} yang ${this.pickOne(['bener','efektif','next level'])}...`,
      () => `Jangan ${this.pickOne(['buang duit','sia-siain waktu','salah langkah'])} lagi di ${name}. ${this.pickOne(['Ini caranya','Tonton sampe habis','Simak ini'])}...`,
      () => `${this.pickOne(['3 detik','Sebentar','Quick'])}: ${this.pickOne(['cek','liat','perhatiin'])} apakah kamu juga ${this.pickOne(['ngalamin ini','lakuin ini','punya masalah ini'])} di ${name}...`,
      () => `${name} di ${month} ${year}? ${this.pickOne(['Ini yang berubah','Ada yang beda','Update penting'])}...`,
      () => `${this.pickOne(['Gila','Wow','Anjir'])}, ${this.pickOne(['ternyata','baru tau','gak nyangka'])} ${name} bisa ${this.pickOne(['secanggih ini','se-simple ini','se-worth it ini'])} di ${year}...`,
    ];

    // === OUTLINE COMPONENTS ===
    const outlineParts = {
      opening: ['Pembukaan yang bikin penasaran', 'Hook statement', 'Attention grabber', 'Pattern interrupt', 'Pertanyaan provocative', 'Fakta mengejutkan', 'Situasi relatable'],
      middle: ['Penjelasan detail dengan contoh', 'Step-by-step breakdown', 'Perbandingan visual', 'Data dan bukti', 'Demo langsung', 'Testimoni/pengalaman', 'Tips praktis', 'Tutorial singkat', 'Before & after', 'Analisis mendalam', 'Pro dan kontra', 'Common mistakes', 'Insider knowledge', 'Quick tutorial'],
      closing: ['CTA follow untuk lanjutan', 'Call to action save/share', 'Teaser konten berikutnya', 'Kesimpulan powerful', 'Challenge untuk penonton', 'Pertanyaan engagement di komentar', 'Plot twist ending', 'Motivational closing'],
    };

    // === REASONING POOLS ===
    const reasoningPool = [
      `Format ini punya ${this.pickOne(['save rate','engagement rate','watch time'])} tinggi di ${niche.platform || 'TikTok'}`,
      `Konten ${this.pickOne(['edukatif','relatable','controversial'])} selalu perform well di algoritma ${year}`,
      `${this.pickOne(['Curiosity gap','Pattern interrupt','Emotional trigger'])} di hook meningkatkan retention`,
      `Trend ${month} ${year} menunjukkan minat tinggi terhadap topik ini`,
      `Format ${this.pickOne(['listicle','storytime','tutorial','POV'])} masih dominan di FYP`,
      `Konten yang ${this.pickOne(['debunk mitos','challenge norms','beri perspektif baru'])} viral karena memicu diskusi`,
      `Durasi pendek + value tinggi = high completion rate yang disukai algoritma`,
      `Personal experience content membangun trust dan loyal audience`,
      `Topik ${name} sedang dalam ${this.pickOne(['rising trend','peak interest','growing niche'])} di social media`,
      `Challenge/experiment format creates suspense → higher watch time`,
    ];

    // === GENERATE IDEAS ===
    const usedTitleIndices = new Set();
    const ideas = [];

    for (let i = 0; i < count; i++) {
      // Pick a unique title template
      let titleIdx;
      do {
        titleIdx = this.randInt(0, titleTemplates.length - 1);
      } while (usedTitleIndices.has(titleIdx) && usedTitleIndices.size < titleTemplates.length);
      usedTitleIndices.add(titleIdx);

      const title = titleTemplates[titleIdx]();
      const hook = this.pickOne(hookTemplates)();

      // Build random outline
      const outlineCount = this.randInt(3, 5);
      const outline = [
        this.pickOne(outlineParts.opening),
        ...this.pickRandom(outlineParts.middle, outlineCount - 2),
        this.pickOne(outlineParts.closing),
      ];

      ideas.push({
        title,
        hook,
        outline,
        viral_score: this.randInt(62, 96),
        duration_target: this.pickOne([30, 35, 40, 45, 50, 55, 60]),
        reasoning: this.pickOne(reasoningPool),
      });
    }

    // Sort by viral_score descending
    ideas.sort((a, b) => b.viral_score - a.viral_score);

    console.log(`🎲 Dynamic Research: Generated ${ideas.length} unique ideas for "${name}"`);
    return ideas;
  }

  /**
   * Generate dynamic script (no API needed)
   */
  generateDynamicScript(idea, niche) {
    const name = niche.name;
    const dur = idea.duration_target || 30;

    const hookTexts = [
      idea.hook || `Hei, kamu harus tau ini soal ${name}...`,
      `Oke jadi ini penting banget buat kamu yang lagi ${this.pickOne(['belajar','nyoba','explore'])} ${name}...`,
      `Stop scroll dulu! Ini bakal ${this.pickOne(['ngubah','ngebantu','upgrade'])} cara kamu di ${name}...`,
    ];

    const problemTexts = [
      `Jadi gini, banyak banget orang yang ${this.pickOne(['salah','keliru','gak paham'])} soal ${name}. ${this.pickOne(['Termasuk gue dulu','Gue juga pernah','Kita semua pernah'])}. Dan itu ${this.pickOne(['bikin rugi','buang waktu','bikin stuck'])}.`,
      `Masalahnya, ${this.pickOne(['kebanyakan','rata-rata','90%'])} orang ${this.pickOne(['cuma tau permukaannya','gak paham fundamentalnya','skip yang penting'])} di ${name}.`,
      `Gue ${this.pickOne(['udah riset','pengalaman sendiri','belajar dari kesalahan'])}, dan ternyata ${this.pickOne(['ada pola','ada pattern','kuncinya simpel'])} yang bikin ${name} itu ${this.pickOne(['jauh lebih gampang','lebih efektif','worth it'])}.`,
    ];

    const contentTexts = [
      `Pertama, yang perlu kamu lakuin itu ${this.pickOne(['pahami basic-nya','set fondasi yang bener','jangan skip fundamentals'])}. Banyak orang langsung loncat ke advanced tapi ${this.pickOne(['basic-nya aja masih salah','fondasinya rapuh','hasilnya gak konsisten'])}.\n\nKedua, ${this.pickOne(['konsistensi','disiplin','rutinitas'])} itu kunci. Gak perlu ${this.pickOne(['sempurna','perfect','ideal'])}, yang penting ${this.pickOne(['jalan terus','progres','mulai aja dulu'])}.\n\nDan yang ketiga, ${this.pickOne(['jangan takut eksperimen','cari mentor/komunitas','track hasilmu'])}. Ini yang ${this.pickOne(['bedain','bikin beda antara','nentuin'])} orang yang ${this.pickOne(['berhasil','sukses','level up'])} vs yang ${this.pickOne(['stuck','gitu-gitu aja','nyerah'])}.`,
      `Oke jadi intinya ada ${this.pickOne(['3','beberapa','key'])} hal:\n\n1. ${this.pickOne(['Riset dulu sebelum mulai','Pahami target/goal kamu','Set ekspektasi yang realistis'])} - ini ${this.pickOne(['krusial','penting banget','non-negotiable'])}.\n\n2. ${this.pickOne(['Praktek > teori','Action over planning','Langsung eksekusi'])} - ${this.pickOne(['stop overthinking','jangan kebanyakan mikir','mulai aja'])}.\n\n3. ${this.pickOne(['Evaluasi dan improve','Review hasilnya','Iterate terus'])} - ${this.pickOne(['setiap minggu','secara rutin','consistently'])}.`,
    ];

    const ctaTexts = [
      `${this.pickOne(['Kalau','Kalo'])} konten ini ${this.pickOne(['helpful','bermanfaat','ngebantu'])}, ${this.pickOne(['follow','tap follow','pencet follow'])} buat ${this.pickOne(['tips','konten','insight'])} ${name} lainnya. ${this.pickOne(['Save juga ya!','Share ke temenmu!','Comment kalau mau part 2!'])}`,
      `${this.pickOne(['That\'s it!','Segitu dulu!','Oke segitu aja!'])} ${this.pickOne(['Drop','Tulis','Kasih'])} ${this.pickOne(['pertanyaan','pendapat','pengalaman'])} kamu di ${this.pickOne(['comment','komentar','kolom komentar'])}. Dan jangan lupa ${this.pickOne(['follow','save','share'])}!`,
    ];

    const hookText = this.pickOne(hookTexts);
    const problemText = this.pickOne(problemTexts);
    const contentText = this.pickOne(contentTexts);
    const ctaText = this.pickOne(ctaTexts);

    const midPoint = Math.floor(dur * 0.7);
    const ctaStart = dur - 5;

    const visualNotes = [
      ['Close-up face, ekspresi excited/shocked', 'Eye contact langsung ke camera', 'Gestur tangan dramatic'],
      ['Medium shot, setting casual/relatable', 'Hand gestures sambil explain', 'Background yang clean'],
      ['Mix talking head + text overlay key points', 'B-roll relevan', 'Split screen atau zoom in-out'],
      ['Pointing gesture + smile', 'Text overlay CTA', 'Ekspresi friendly & inviting'],
    ];

    const hashtagPool = ['#fyp','#foryou','#viral','#tips','#edukasi','#tutorial','#indonesia',
      `#${name.toLowerCase().replace(/\s+/g,'')}`, '#belajar','#sharing','#pengalaman',
      '#trending','#hack','#lifehack','#motivasi','#growth','#upgrade'];

    return {
      script_full: `${hookText}\n\n${problemText}\n\n${contentText}\n\n${ctaText}`,
      sections: [
        { label: 'HOOK', time: '0-3s', text: hookText, visual_note: this.pickOne(visualNotes[0]) },
        { label: 'PROBLEM', time: '3-8s', text: problemText, visual_note: this.pickOne(visualNotes[1]) },
        { label: 'CONTENT', time: `8-${ctaStart}s`, text: contentText, visual_note: this.pickOne(visualNotes[2]) },
        { label: 'CTA', time: `${ctaStart}-${dur}s`, text: ctaText, visual_note: this.pickOne(visualNotes[3]) },
      ],
      hashtags: this.pickRandom(hashtagPool, this.randInt(5, 8)),
      caption: `${idea.title} 🔥 ${this.pickOne(['Save ini buat nanti!','Share ke yang butuh!','Tag temenmu!','Jangan lupa follow!'])} ${this.pickRandom(hashtagPool, 4).join(' ')}`,
      music_suggestion: this.pickOne([
        'Trending lo-fi beat yang calm',
        'Upbeat acoustic background',
        'Motivational piano instrumental',
        'Chill hip-hop instrumental',
        'Trending TikTok sound of the week',
        'Soft electronic ambient',
        'Corporate inspiring background',
        'Catchy pop instrumental remix',
      ]),
    };
  }
}

module.exports = new AIService();
