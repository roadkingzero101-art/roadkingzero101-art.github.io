const FORM_KEY = "novel-manju-studio-draft-v2";
const RENDER_PREFS_KEY = "novel-manju-studio-render-prefs-v1";
const DEMO_HISTORY_KEY = "novel-manju-studio-demo-history-v1";

const stylePresets = {
  manju: {
    label: "国漫漫剧",
    image: "premium Chinese AI manju keyframe, detailed character linework, expressive eyes, cinematic comic lighting, clean silhouettes, high-detail background, vertical drama composition",
    video: "2.5D parallax, subtle hair and cloth motion, slow camera push, atmospheric particles, manga-panel rhythm, clean character consistency"
  },
  cinematic: {
    label: "电影感写实",
    image: "photorealistic cinematic still, practical locations, 35mm lens, controlled depth of field, textured props and atmosphere",
    video: "subtle dolly movement, natural handheld micro-shake, realistic motion blur, restrained performance"
  },
  anime: {
    label: "高质感动画",
    image: "premium animated film frame, detailed backgrounds, expressive lighting, clean character silhouettes, polished cel-shaded finish",
    video: "smooth anime camera move, layered parallax, flowing cloth and hair motion, precise emotional acting"
  },
  noir: {
    label: "黑色悬疑",
    image: "neo-noir animated drama frame, hard shadows, rain reflections, high contrast lighting, restrained color accents",
    video: "slow push-in, drifting smoke or fog, dramatic shadow movement, tense pacing"
  },
  wuxia: {
    label: "东方武侠",
    image: "elegant eastern wuxia manju frame, mist, silk textures, weathered architecture, graceful composition",
    video: "floating crane-like camera, slow fabric motion, mist drifting, controlled martial tension"
  },
  future: {
    label: "近未来科幻",
    image: "near-future animated drama keyframe, functional technology, luminous interfaces without readable text, urban scale",
    video: "smooth tracking shot, light panels flicker softly, rain or dust particles moving through the frame"
  }
};

const sampleText = `第一章 雾港来信

雾港每年只亮三次灯。

第三次亮灯的夜里，林澈在旧码头收到一封没有邮戳的信。信纸被海水泡得发软，只有一句话清晰得像刚写上去：别相信回来的船。

远处的灯塔忽明忽暗，失踪七年的货轮正穿过浓雾。船身没有锈迹，甲板上却站着一个和林澈父亲一模一样的人。

“你终于来了。”那人隔着潮声开口。

第二章 红色风灯

林澈握紧信纸，发现背面多出了一行小字：如果他说认识你，就立刻烧掉灯塔。

守塔人沈鸢从阴影里走出，手里提着一盏红色风灯。她低声说：“这座港口不是等船，是等一个愿意关灯的人。”

第三章 回来的船

货轮的汽笛声像从海底传来，所有窗户同时亮起。林澈看见甲板上的父亲举起右手，掌心有一道他小时候亲手包扎过的伤疤。

沈鸢把火柴递给他：“要么让它靠岸，要么让整座港口醒来。”`;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const els = {
  form: $("#storyForm"),
  title: $("#titleInput"),
  novel: $("#novelInput"),
  episodeCount: $("#episodeCountInput"),
  charsPerEpisode: $("#charsPerEpisodeInput"),
  minutesPerEpisode: $("#minutesPerEpisodeInput"),
  shotsPerEpisode: $("#shotsPerEpisodeInput"),
  genre: $("#genreInput"),
  style: $("#styleInput"),
  aspect: $("#aspectInput"),
  tone: $("#toneInput"),
  notes: $("#notesInput"),
  sample: $("#sampleButton"),
  clear: $("#clearButton"),
  empty: $("#emptyState"),
  output: $("#outputState"),
  meta: $("#metaLine"),
  projectTitle: $("#projectTitle"),
  copyAll: $("#copyAllButton"),
  exportMd: $("#exportMdButton"),
  exportJson: $("#exportJsonButton"),
  episodeSelect: $("#episodeSelect"),
  providerStatus: $("#providerStatus"),
  providerHint: $("#providerHint"),
  chatgptStatus: $("#chatgptStatus"),
  chatgptHint: $("#chatgptHint"),
  useChatgptToggle: $("#useChatgptToggle"),
  startChatgpt: $("#startChatgptButton"),
  renderAllToggle: $("#renderAllToggle"),
  assembleToggle: $("#assembleToggle"),
  dryRun: $("#dryRunToggle"),
  retryAttempts: $("#retryAttemptsInput"),
  startRender: $("#startRenderButton"),
  toast: $("#toast")
};

const state = {
  project: null,
  activeEpisodeIndex: 0,
  provider: null,
  chatgpt: null,
  chatgptRun: null,
  adapting: false,
  renderJob: null,
  renderHistory: [],
  renderSubmitting: false,
  renderPollTimer: 0,
  copyTargets: {},
  saveTimer: 0
};

function init() {
  restoreDraft();
  restoreDemoHistory();
  bindEvents();
  checkProviderStatus();
  checkChatGPTStatus();
  loadRenderHistory();
  renderRenderPanel();
  renderAdaptPanel();
}

function bindEvents() {
  els.form.addEventListener("submit", generateFromForm);

  els.sample.addEventListener("click", () => {
    els.title.value = "雾港来信";
    els.episodeCount.value = "0";
    els.charsPerEpisode.value = "800";
    els.minutesPerEpisode.value = "2";
    els.shotsPerEpisode.value = "6";
    els.genre.value = "悬疑";
    els.style.value = "manju";
    els.aspect.value = "9:16";
    els.tone.value = "AI漫剧爽感";
    els.notes.value = "保留雾、灯塔、红色风灯；不要血腥画面；每集结尾必须有钩子";
    els.novel.value = sampleText;
    generateFromForm();
  });

  els.clear.addEventListener("click", () => {
    els.form.reset();
    els.episodeCount.value = "0";
    els.charsPerEpisode.value = "3000";
    els.minutesPerEpisode.value = "3";
    els.shotsPerEpisode.value = "8";
    localStorage.removeItem(FORM_KEY);
    localStorage.removeItem(RENDER_PREFS_KEY);
    restoreRenderPrefs();
    resetOutput();
    notify("已清空");
  });

  els.copyAll.addEventListener("click", () => {
    copyText(state.copyTargets.all, "已复制全集生产包");
  });

  els.exportMd.addEventListener("click", () => {
    if (!state.project) return notify("还没有可导出的内容");
    downloadBlob(`${safeFileName(state.project.title)}-AI漫剧全集生产包.md`, state.project.markdown, "text/markdown;charset=utf-8");
  });

  els.exportJson.addEventListener("click", () => {
    if (!state.project) return notify("还没有可导出的内容");
    downloadBlob(`${safeFileName(state.project.title)}-AI漫剧生产数据.json`, JSON.stringify(state.project.exportData, null, 2), "application/json;charset=utf-8");
  });

  els.startRender.addEventListener("click", startJimengRender);
  els.startChatgpt.addEventListener("click", () => startChatGPTAdapt({ activate: true }));
  els.dryRun?.addEventListener("change", () => {
    saveRenderPrefs();
    renderRenderPanel();
    checkProviderStatus();
  });
  [els.renderAllToggle, els.assembleToggle, els.retryAttempts, els.useChatgptToggle].forEach((input) => {
    input?.addEventListener("change", () => {
      saveRenderPrefs();
      renderOverviewIfReady();
      renderRenderPanel();
    });
  });
  els.retryAttempts?.addEventListener("input", () => {
    saveRenderPrefs();
    renderOverviewIfReady();
    renderRenderPanel();
  });

  els.episodeSelect.addEventListener("change", () => {
    state.activeEpisodeIndex = Number(els.episodeSelect.value) || 0;
    renderEpisodePanels();
    setEpisodeCopyTargets();
  });

  $$(".tab-button").forEach((button) => {
    button.addEventListener("click", () => activateTab(button.dataset.tab));
  });

  document.addEventListener("click", (event) => {
    const copyButton = event.target.closest("[data-copy-key]");
    if (copyButton) {
      copyText(state.copyTargets[copyButton.dataset.copyKey], copyButton.dataset.copyLabel || "已复制");
      return;
    }

    if (event.target.id === "reviewButton") {
      runReview();
      return;
    }

    if (event.target.id === "scopeAllButton") {
      setRenderScope(true);
      return;
    }

    if (event.target.id === "scopeCurrentButton") {
      setRenderScope(false);
      return;
    }

    if (event.target.id === "toggleDryRunPanelButton") {
      els.dryRun.checked = !els.dryRun.checked;
      saveRenderPrefs();
      checkProviderStatus();
      renderRenderPanel();
      return;
    }

    if (event.target.id === "copyRenderManifestButton") {
      copyText(buildRenderAssetList(state.renderJob), "已复制产物清单");
      return;
    }

    if (event.target.id === "copyFailedScenesButton") {
      copyText(buildFailedSceneList(state.renderJob), "已复制失败镜头清单");
      return;
    }

    const historyButton = event.target.closest("[data-load-render-job]");
    if (historyButton) {
      loadRenderJob(historyButton.dataset.loadRenderJob);
    }
  });

  document.addEventListener("change", (event) => {
    if (event.target.matches("[data-qc-check]")) {
      updateQcScore();
    }
  });

  [
    els.title,
    els.novel,
    els.episodeCount,
    els.charsPerEpisode,
    els.minutesPerEpisode,
    els.shotsPerEpisode,
    els.genre,
    els.style,
    els.aspect,
    els.tone,
    els.notes
  ].forEach((input) => {
    input.addEventListener("input", scheduleSave);
    input.addEventListener("change", scheduleSave);
  });
}

function generateFromForm(event) {
  if (event) event.preventDefault();
  const config = collectConfig();

  if (!config.text) {
    notify("先粘贴整本小说正文");
    els.novel.focus();
    return;
  }

  const project = buildProject(config);
  renderProject(project);
  saveDraft();
  notify("整本小说已拆集并生成生产包");
}

function collectConfig() {
  return {
    title: els.title.value.trim(),
    text: normalizeText(els.novel.value),
    targetEpisodeCount: clamp(Number(els.episodeCount.value) || 0, 0, 200),
    charsPerEpisode: clamp(Number(els.charsPerEpisode.value) || 3000, 800, 12000),
    minutesPerEpisode: clamp(Number(els.minutesPerEpisode.value) || 3, 1, 20),
    shotsPerEpisode: clamp(Number(els.shotsPerEpisode.value) || 8, 4, 16),
    genre: els.genre.value,
    styleKey: els.style.value,
    aspect: els.aspect.value,
    tone: els.tone.value,
    notes: els.notes.value.trim()
  };
}

function buildProject(config) {
  const title = config.title || deriveTitle(config.text);
  const source = splitSourceUnits(config.text, config.charsPerEpisode);
  const units = explodeLongUnits(source.units, config.charsPerEpisode);
  const episodeGroups = config.targetEpisodeCount > 0
    ? chunkUnitsByCount(units, config.targetEpisodeCount)
    : chunkUnitsByTargetChars(units, config.charsPerEpisode);
  const characters = extractCharacters(config.text);
  const characterBible = buildCharacterBible(characters, config, config.text);
  const shotSeconds = Math.max(4, Math.round((config.minutesPerEpisode * 60) / config.shotsPerEpisode));
  const episodes = episodeGroups.map((group, index) => buildEpisode({
    group,
    index,
    title,
    config,
    characters,
    characterBible,
    shotSeconds
  }));
  const stats = {
    characters: config.text.length,
    sourceUnits: source.units.length,
    splitMode: source.mode,
    episodes: episodes.length,
    scenes: episodes.reduce((sum, episode) => sum + episode.scenes.length, 0),
    totalMinutes: episodes.length * config.minutesPerEpisode
  };
  const outline = buildOutline({ title, config, characters, episodes, stats });
  const project = { title, config, source, characters, characterBible, episodes, stats, outline };

  project.scriptText = episodes.map((episode) => episode.scriptText).join("\n\n---\n\n");
  project.storyboardText = episodes.map((episode) => episode.storyboardText).join("\n\n");
  project.imageText = episodes.map((episode) => episode.imageText).join("\n\n");
  project.videoText = episodes.map((episode) => episode.videoText).join("\n\n");
  project.qcText = buildQcText(project);
  project.masterPrompt = buildMasterPrompt(project, config.text);
  project.markdown = buildMarkdown(project);
  project.exportData = buildExportData(project);
  project.allText = `${project.markdown}\n\n---\n\n${project.masterPrompt}`;

  return project;
}

function splitSourceUnits(text, charsPerEpisode) {
  const chapters = splitChapters(text);
  if (chapters.length >= 2) {
    return { mode: "按章节标题自动识别", units: chapters };
  }

  const paragraphs = splitParagraphs(text);
  const units = paragraphs.map((paragraph, index) => ({
    title: `段落 ${pad(index + 1)}`,
    text: paragraph
  }));

  if (units.length > 1) {
    return { mode: `无章节标题，按段落和约 ${charsPerEpisode} 字拆集`, units };
  }

  const sentences = splitSentences(text).map((sentence, index) => ({
    title: `句组 ${pad(index + 1)}`,
    text: sentence
  }));

  return { mode: "无章节和段落，按句子拆分", units: sentences.length ? sentences : [{ title: "全文", text }] };
}

function splitChapters(text) {
  const headingPattern = /^\s*((?:第[一二三四五六七八九十百千万零〇两\d]+[章节回幕卷集][^\n]{0,36})|(?:Chapter\s+\d+[^\n]{0,40})|(?:#{1,3}\s+.+))\s*$/i;
  const lines = text.split("\n");
  const chapters = [];
  let current = null;

  lines.forEach((line) => {
    const heading = line.match(headingPattern);
    if (heading) {
      if (current && current.text.trim()) chapters.push(current);
      current = { title: heading[1].replace(/^#{1,3}\s+/, "").trim(), text: "" };
      return;
    }
    if (!current) current = { title: "开篇", text: "" };
    current.text += `${line}\n`;
  });

  if (current && current.text.trim()) chapters.push(current);
  return chapters.filter((chapter) => chapter.text.trim().length > 0);
}

function explodeLongUnits(units, limit) {
  const result = [];
  units.forEach((unit) => {
    if (unit.text.length <= limit * 1.35) {
      result.push({ ...unit, text: unit.text.trim() });
      return;
    }

    const paragraphs = splitParagraphs(unit.text);
    let bucket = [];
    let length = 0;
    let part = 1;

    paragraphs.forEach((paragraph) => {
      const parts = paragraph.length > limit ? splitLongText(paragraph, limit) : [paragraph];
      parts.forEach((piece) => {
        if (length + piece.length > limit && bucket.length) {
          result.push({ title: `${unit.title} · ${part}`, text: bucket.join("\n\n") });
          bucket = [];
          length = 0;
          part += 1;
        }
        bucket.push(piece);
        length += piece.length;
      });
    });

    if (bucket.length) {
      result.push({ title: `${unit.title} · ${part}`, text: bucket.join("\n\n") });
    }
  });
  return result;
}

function chunkUnitsByTargetChars(units, targetChars) {
  const groups = [];
  let group = [];
  let length = 0;

  units.forEach((unit) => {
    if (group.length && length + unit.text.length > targetChars) {
      groups.push(group);
      group = [];
      length = 0;
    }
    group.push(unit);
    length += unit.text.length;
  });

  if (group.length) groups.push(group);
  return groups;
}

function chunkUnitsByCount(units, count) {
  const wanted = Math.min(Math.max(1, count), Math.max(1, units.length));
  const total = units.reduce((sum, unit) => sum + unit.text.length, 0);
  const target = Math.max(1, Math.ceil(total / wanted));
  const groups = [];
  let group = [];
  let length = 0;

  units.forEach((unit, index) => {
    const remainingUnits = units.length - index;
    const remainingGroups = wanted - groups.length;
    const shouldClose = group.length && length >= target && remainingUnits >= remainingGroups;
    if (shouldClose) {
      groups.push(group);
      group = [];
      length = 0;
    }
    group.push(unit);
    length += unit.text.length;
  });

  if (group.length) groups.push(group);
  while (groups.length > wanted) {
    const last = groups.pop();
    groups[groups.length - 1] = groups[groups.length - 1].concat(last);
  }
  return groups;
}

function buildEpisode({ group, index, title, config, characters, characterBible, shotSeconds }) {
  const number = index + 1;
  const text = group.map((unit) => `${unit.title}\n${unit.text}`).join("\n\n");
  const episodeTitle = makeEpisodeTitle(text, number, config.genre);
  const sourceRange = makeSourceRange(group);
  const summary = summarizeText(text, 160);
  const hook = makeHook(text, config.genre);
  const endingHook = makeEndingHook(text, config.genre);
  const sceneChunks = chunkTextForScenes(text, config.shotsPerEpisode);
  const scenes = sceneChunks.map((chunk, sceneIndex) => buildScene({
    episodeNumber: number,
    sceneIndex,
    raw: chunk,
    title,
    episodeTitle,
    config,
    characters,
    characterBible,
    shotSeconds
  }));

  const episode = {
    number,
    title: episodeTitle,
    sourceRange,
    text,
    charCount: text.length,
    summary,
    hook,
    endingHook,
    scenes
  };

  episode.scriptText = buildEpisodeScript(episode, config);
  episode.storyboardText = buildEpisodeStoryboard(episode);
  episode.imageText = buildEpisodeImageText(episode);
  episode.videoText = buildEpisodeVideoText(episode);
  episode.productionText = buildEpisodeProductionText(episode, config);

  return episode;
}

function buildScene({ episodeNumber, sceneIndex, raw, title, episodeTitle, config, characters, characterBible, shotSeconds }) {
  const sceneNumber = sceneIndex + 1;
  const label = `EP${pad(episodeNumber)}-S${pad(sceneNumber)}`;
  const location = inferLocation(raw, config.genre);
  const time = inferTime(raw);
  const emotion = inferEmotion(raw);
  const conflict = inferConflict(raw, config.genre);
  const beat = compactSentence(extractBeat(raw, sceneNumber), 120);
  const sceneTitle = `${label} ${makeSceneTitle(raw, sceneNumber, config.genre)}`;
  const camera = pickCamera(sceneIndex, config.tone);
  const dialogue = extractDialogue(raw, characters);
  const narration = makeNarration(raw, config.genre);
  const script = buildSceneScript({
    sceneTitle,
    episodeTitle,
    location,
    time,
    emotion,
    conflict,
    beat,
    dialogue,
    narration,
    camera,
    config
  });
  const imagePrompt = buildImagePrompt({
    sceneTitle,
    title,
    episodeTitle,
    location,
    time,
    emotion,
    beat,
    camera,
    config,
    characterBible
  });
  const videoPrompt = buildVideoPrompt({
    sceneTitle,
    title,
    episodeTitle,
    location,
    emotion,
    beat,
    camera,
    config,
    shotSeconds
  });

  return {
    episodeNumber,
    sceneNumber,
    label,
    title: sceneTitle,
    location,
    time,
    emotion,
    conflict,
    beat,
    camera,
    narration,
    durationSeconds: shotSeconds,
    script,
    imagePrompt,
    videoPrompt
  };
}

function buildOutline({ title, config, characters, episodes, stats }) {
  const hero = characters[0] || "主角";
  const firstEpisode = episodes[0];
  const lastEpisode = episodes[episodes.length - 1];

  return {
    logline: `《${title}》改编为 ${stats.episodes} 集 ${config.tone} AI漫剧：${hero}从“${firstEpisode?.hook || "异常事件"}”出发，在连续反转中逼近“${lastEpisode?.endingHook || "最终选择"}”。`,
    theme: themeByGenre(config.genre),
    productionRule: `整本小说已按“${stats.splitMode}”完成拆集；每集约 ${config.minutesPerEpisode} 分钟、${config.shotsPerEpisode} 镜头、单镜约 ${Math.max(4, Math.round((config.minutesPerEpisode * 60) / config.shotsPerEpisode))} 秒。`,
    acceptanceGoal: `验收目标：${stats.episodes} 集、${stats.scenes} 个镜头全部成片；角色脸型、服装、道具、色调、字幕和镜头顺序连续。`
  };
}

function buildCharacterBible(characters, config, text) {
  const names = characters.length ? characters : ["主角", "关键人物", "阻力人物"];
  const atmosphere = inferEmotion(text);
  return names.slice(0, 6).map((name, index) => {
    const role = index === 0 ? "核心主角" : index === 1 ? "关系推动者" : index === 2 ? "主要阻力" : "重要配角";
    return `${name}：${role}；所有图片和视频保持同一脸型、发型、服装轮廓和标志性道具；表演基调为${atmosphere}，适配${config.genre}漫剧。`;
  });
}

function buildSceneScript({ sceneTitle, episodeTitle, location, time, emotion, conflict, beat, dialogue, narration, camera, config }) {
  const dialogueBlock = dialogue.length
    ? dialogue.slice(0, 3).map((line) => `${line.speaker}：${line.text}`).join("\n")
    : "主角：这一次，我必须亲眼确认真相。\n关键人物：别让它先看见你的犹豫。";

  return `${sceneTitle}
所属集：${episodeTitle}
场景：${location} / ${time}

画面动作：
${beat}

旁白：
${narration}

对白：
${dialogueBlock}

冲突：
${conflict}

镜头：
${camera}

情绪与声音：
${emotion}；音效贴近环境，转场用漫剧式强节奏，不要解释性字幕。

生产要求：
按${config.tone}推进，画面信息必须能被观众一眼读懂；本镜头结尾留下下一镜的动作方向或情绪悬念。`;
}

function buildImagePrompt({ sceneTitle, title, episodeTitle, location, time, emotion, beat, camera, config, characterBible }) {
  const preset = stylePresets[config.styleKey];
  return `【${sceneTitle}｜ChatGPT图片生成提示词】
生成一张 ${config.aspect} 的AI漫剧关键帧，用于《${title}》${episodeTitle}。

画面剧情：${beat}
场景：${location}，${time}
人物连续性：${characterBible.join("；")}
构图与镜头：${camera}
画风：${preset.image}
情绪：${emotion}
额外要求：${config.notes || "保持角色一致，画面干净，故事信息明确。"}

负面限制：不要字幕，不要水印，不要可读文字，不要logo，不要多余手指，不要多余肢体，不要角色变脸，不要把多个镜头拼成一张图。`;
}

function buildVideoPrompt({ sceneTitle, title, episodeTitle, location, emotion, beat, camera, config, shotSeconds }) {
  const preset = stylePresets[config.styleKey];
  return `【${sceneTitle}｜图生视频提示词】
以上一张图片为首帧和角色参考，生成 ${shotSeconds} 秒 ${config.aspect} AI漫剧视频。

作品：《${title}》${episodeTitle}
镜头剧情：${beat}
动作方式：动作清晰、幅度克制，人物不要突然改变姿势或脸型。
镜头运动：${camera}
漫剧动效：${preset.video}
环境运动：${location}中的光影、雾气、风、尘埃或室内微光缓慢变化。
情绪节奏：${config.tone}，情绪为${emotion}，结尾停在可接下一镜的悬念点。

必须保持：角色脸型、发型、服装、道具、空间方向、色调与首帧完全一致。
必须避免：画面跳变、变脸、穿模、文字、字幕、水印、身体扭曲、突然出现新角色。`;
}

function buildEpisodeScript(episode, config) {
  return `# EP${pad(episode.number)} ${episode.title}
来源：${episode.sourceRange}
本集钩子：${episode.hook}
本集摘要：${episode.summary}
结尾悬念：${episode.endingHook}
节奏：${config.tone}

${episode.scenes.map((scene) => scene.script).join("\n\n")}`;
}

function buildEpisodeStoryboard(episode) {
  return episode.scenes.map((scene) => {
    return `${scene.label}｜${scene.title}｜${scene.location}｜${scene.time}｜${scene.camera}｜${scene.durationSeconds}s｜${scene.beat}`;
  }).join("\n");
}

function buildEpisodeImageText(episode) {
  return `# EP${pad(episode.number)} ${episode.title} 图片批量提示词\n\n${episode.scenes.map((scene) => scene.imagePrompt).join("\n\n")}`;
}

function buildEpisodeVideoText(episode) {
  return `# EP${pad(episode.number)} ${episode.title} 图生视频批量提示词\n\n${episode.scenes.map((scene) => scene.videoPrompt).join("\n\n")}`;
}

function buildEpisodeProductionText(episode, config) {
  return `# EP${pad(episode.number)} ${episode.title} AI漫剧生产包

来源：${episode.sourceRange}
字数：${episode.charCount}
预计时长：${config.minutesPerEpisode} 分钟
镜头数：${episode.scenes.length}
本集钩子：${episode.hook}
本集摘要：${episode.summary}
结尾悬念：${episode.endingHook}

## 剧本
${episode.scriptText}

## 分镜
${episode.storyboardText}

## 图片提示词
${episode.imageText}

## 视频提示词
${episode.videoText}`;
}

function buildMasterPrompt(project, novelText) {
  const config = project.config;
  return `你是一名AI漫剧总导演、拆书编剧、分镜导演和成片验收主管。请把下面整本小说做成可直接生产的AI漫剧全集包。

必须完成：
1. 自动识别章节；没有章节时按段落、剧情转折和字数拆集。
2. 输出全集拆集表，每集包含：来源范围、字数、钩子、摘要、结尾悬念。
3. 每集拆成 ${config.shotsPerEpisode} 个镜头，单集约 ${config.minutesPerEpisode} 分钟。
4. 每个镜头输出：漫剧剧本、分镜、ChatGPT图片提示词、图生视频提示词。
5. 生成角色连续性手册，保证所有图片和视频角色不变脸、不换服装、不乱道具。
6. 最后输出成片验收清单，按集检查：镜头齐全、剧情完整、角色连续、无水印文字、无穿模变形、节奏和钩子达标。

项目参数：
标题：${project.title}
类型：${config.genre}
风格：${stylePresets[config.styleKey].label}
画幅：${config.aspect}
节奏：${config.tone}
目标集数：${config.targetEpisodeCount || "自动"}
每集目标字数：${config.charsPerEpisode}
额外要求：${config.notes || "无"}

输出格式：
一、全集总控
二、角色连续性手册
三、自动拆集表
四、逐集漫剧剧本
五、逐集分镜表
六、逐镜ChatGPT图片提示词
七、逐镜图生视频提示词
八、成片验收表

小说全文：
"""
${novelText}
"""`;
}

function buildQcText(project) {
  return `# 《${project.title}》AI漫剧成片验收表

验收目标：${project.stats.episodes} 集，${project.stats.scenes} 个镜头，总时长约 ${project.stats.totalMinutes} 分钟。

硬性通过标准：
1. 每集镜头数量与拆分表一致。
2. 每个镜头的首帧图片、视频、字幕或旁白顺序一致。
3. 角色脸型、发型、服装、道具连续。
4. 无水印、无乱码、无多余文字、无明显穿模变形。
5. 每集结尾有钩子，下一集开头能接上。
6. 画幅统一为 ${project.config.aspect}，整体风格统一为 ${stylePresets[project.config.styleKey].label}。

建议低于 85 分返工，85-94 分局部修，95 分以上可验收。`;
}

function buildMarkdown(project) {
  const episodeRows = project.episodes.map((episode) => {
    return `| EP${pad(episode.number)} | ${episode.title} | ${episode.sourceRange} | ${episode.charCount} | ${episode.scenes.length} | ${episode.hook} | ${episode.endingHook} |`;
  }).join("\n");

  return `# 《${project.title}》AI漫剧全集生产包

## 全集总控

**一句话总控**：${project.outline.logline}

**主题**：${project.outline.theme}

**拆分规则**：${project.outline.productionRule}

**验收目标**：${project.outline.acceptanceGoal}

## 角色连续性手册

${project.characterBible.map((item) => `- ${item}`).join("\n")}

## 自动拆集表

| 集数 | 标题 | 来源 | 字数 | 镜头 | 开场钩子 | 结尾悬念 |
| --- | --- | --- | ---: | ---: | --- | --- |
${episodeRows}

## 全集剧本

${project.scriptText}

## 全集分镜

${project.storyboardText}

## 全集图片提示词

${project.imageText}

## 全集视频提示词

${project.videoText}

## 成片验收

${project.qcText}`;
}

function buildExportData(project) {
  return {
    title: project.title,
    config: project.config,
    stats: project.stats,
    outline: project.outline,
    characterBible: project.characterBible,
    episodes: project.episodes.map((episode) => ({
      number: episode.number,
      title: episode.title,
      sourceRange: episode.sourceRange,
      charCount: episode.charCount,
      summary: episode.summary,
      hook: episode.hook,
      endingHook: episode.endingHook,
      scenes: episode.scenes
    }))
  };
}

function renderProject(project) {
  state.project = project;
  state.renderJob = null;
  state.activeEpisodeIndex = 0;
  state.copyTargets = buildCopyTargets(project);
  setEpisodeOptions(project);
  setEpisodeCopyTargets();

  els.empty.classList.add("hidden");
  els.output.classList.remove("hidden");
  els.meta.textContent = `${project.stats.characters} 字 · ${project.stats.episodes} 集 · ${project.stats.scenes} 镜头 · 约 ${project.stats.totalMinutes} 分钟`;
  els.projectTitle.textContent = `《${project.title}》AI漫剧生产包`;

  renderOverview(project);
  renderEpisodes(project);
  renderEpisodePanels();
  renderAdaptPanel();
  renderRenderPanel();
  renderQC(project);
  renderMaster(project);
  activateTab("overview");
}

function buildCopyTargets(project) {
  return {
    all: project.allText,
    overview: `${project.outline.logline}\n\n${project.outline.productionRule}\n\n${project.characterBible.join("\n")}`,
    episodes: project.episodes.map((episode) => `EP${pad(episode.number)} ${episode.title}\n${episode.sourceRange}\n${episode.summary}\n钩子：${episode.hook}\n结尾：${episode.endingHook}`).join("\n\n"),
    script: project.scriptText,
    storyboard: project.storyboardText,
    image: project.imageText,
    video: project.videoText,
    qc: project.qcText,
    master: project.masterPrompt
  };
}

function setEpisodeCopyTargets() {
  if (!state.project) return;
  const episode = currentEpisode();
  state.copyTargets.episode = episode.productionText;
  state.copyTargets["episode-image"] = episode.imageText;
  state.copyTargets["episode-video"] = episode.videoText;
}

function setEpisodeOptions(project) {
  els.episodeSelect.innerHTML = project.episodes.map((episode, index) => {
    return `<option value="${index}">EP${pad(episode.number)} ${escapeHtml(episode.title)} · ${episode.scenes.length}镜</option>`;
  }).join("");
  els.episodeSelect.value = "0";
}

function renderOverview(project) {
  $("#panel-overview").innerHTML = `
    <div class="section-heading">
      <h3>全集总控</h3>
      <button type="button" data-copy-key="overview" data-copy-label="已复制全集总控">⎘ 复制</button>
    </div>

    <div class="metric-grid">
      ${metric("字数", project.stats.characters)}
      ${metric("集数", project.stats.episodes)}
      ${metric("镜头", project.stats.scenes)}
      ${metric("总时长", `${project.stats.totalMinutes} 分钟`)}
    </div>

    <div class="summary-grid">
      ${summaryItem("一句话总控", project.outline.logline)}
      ${summaryItem("拆分方式", project.outline.productionRule)}
      ${summaryItem("主题", project.outline.theme)}
      ${summaryItem("验收目标", project.outline.acceptanceGoal)}
      ${summaryItem("角色连续性", `<div class="pill-list">${project.characterBible.map((item) => `<span class="pill">${escapeHtml(item)}</span>`).join("")}</div>`, { html: true })}
      ${summaryItem("生产顺序", "先按拆集表验收剧情，再逐集生成首帧图片，然后用首帧图片生成视频，最后进入验收台打分。")}
    </div>

    ${renderProductionPlan(project)}
  `;
}

function renderProductionPlan(project) {
  const plan = calculateProductionPlan(project);
  return `
    <div class="review-box">
      <div class="section-heading">
        <h3>生产预检</h3>
        <button type="button" data-copy-key="preflight" data-copy-label="已复制生产预检">⎘ 预检</button>
      </div>
      <div class="metric-grid">
        ${metric("首帧图", `${plan.imageCalls} 张`)}
        ${metric("视频任务", `${plan.videoTasks} 条`)}
        ${metric("镜头总秒数", `${plan.totalClipSeconds}s`)}
        ${metric("失败重试", `${plan.retryAttempts} 次/镜`)}
      </div>
      <div class="summary-grid">
        ${summaryItem("市场参考升级", "采用剧本到分镜、角色一致性锁定、首帧图生视频、失败镜头重跑、成片验收这几个成熟生产工具常见能力。")}
        ${summaryItem("一致性策略", plan.consistency)}
        ${summaryItem("首尾帧策略", plan.keyframe)}
        ${summaryItem("风险提醒", plan.risks.join("；") || "当前配置风险较低。")}
      </div>
    </div>
  `;
}

function calculateProductionPlan(project, episodesOverride = null) {
  const episodes = episodesOverride || project.episodes || [];
  const sceneCount = episodes.reduce((sum, episode) => sum + (episode.scenes?.length || 0), 0);
  const totalClipSeconds = episodes.reduce((sum, episode) => {
    return sum + (episode.scenes || []).reduce((sceneSum, scene) => sceneSum + (Number(scene.durationSeconds) || 0), 0);
  }, 0);
  const retryAttempts = els.retryAttempts ? clamp(Number(els.retryAttempts.value) || 0, 0, 3) : 1;
  const risks = [];
  if (sceneCount > 80) risks.push("镜头较多，建议先生成前1集验证角色风格");
  if ((project.characterBible || []).length < 2) risks.push("角色连续性信息偏少，建议先跑ChatGPT改编");
  if (!project.fromChatGPT) risks.push("当前为本地规则拆书，质量低于ChatGPT智能改编");
  if (project.config.aspect !== "9:16") risks.push("非竖屏画幅可能不适合漫剧短视频平台");

  const text = [
    `首帧图调用：${sceneCount}`,
    `图生视频任务：${sceneCount}`,
    `镜头总秒数：${totalClipSeconds}`,
    `失败重试：${retryAttempts} 次/镜`,
    episodesOverride ? `生成范围：${els.renderAllToggle.checked ? "全集" : `当前集 EP${pad(currentEpisode().number)}`}` : "生成范围：全集",
    `一致性：${(project.characterBible || []).join("；")}`
  ].join("\n");
  state.copyTargets.preflight = text;

  return {
    imageCalls: sceneCount,
    videoTasks: sceneCount,
    totalClipSeconds,
    retryAttempts,
    risks,
    consistency: "每个镜头提示词都继承角色连续性手册；生成前先确认主角脸型、发型、服装、标志道具和色调。",
    keyframe: "每个镜头先生成首帧图，再用首帧图生成视频；视频结尾停在可接下一镜的动作或情绪点。"
  };
}

function calculateJobProductionPlan(job) {
  const scenes = (job?.episodes || []).flatMap((episode) => episode.scenes || []);
  const totalClipSeconds = scenes.reduce((sum, scene) => sum + (Number(scene.durationSeconds) || 0), 0);
  return {
    imageCalls: scenes.length,
    videoTasks: scenes.length,
    totalClipSeconds,
    retryAttempts: Number(job?.options?.retryAttempts || 0),
    risks: job?.options?.dryRun ? ["这是模拟任务，不代表实际模型画面质量"] : [],
    consistency: "历史任务从 manifest 读取，仅展示当时提交的镜头和产物。",
    keyframe: "历史任务保留首帧图、视频链接、本地文件和日志，便于验收与返工。"
  };
}

function selectedRenderEpisodes() {
  if (!state.project) return [];
  return els.renderAllToggle.checked ? state.project.episodes : [currentEpisode()];
}

function setRenderScope(allEpisodes) {
  els.renderAllToggle.checked = Boolean(allEpisodes);
  saveRenderPrefs();
  renderOverviewIfReady();
  renderRenderPanel();
  notify(allEpisodes ? "已切换为生成全集" : "已切换为只生成当前集");
}

function renderOverviewIfReady() {
  if (!state.project) return;
  renderOverview(state.project);
}

function buildRenderAssetList(job) {
  if (!job) return "";
  const lines = [
    `# ${job.title || "AI漫剧任务"} 产物清单`,
    `任务ID：${job.id}`,
    `状态：${renderJobStatus(job)}`,
    `模式：${job.options?.dryRun ? "模拟生成" : "实跑生成"}`,
    `输出目录：${job.outputDir || ""}`,
    ""
  ];

  for (const episode of job.episodes || []) {
    lines.push(`## EP${pad(episode.number)} ${episode.title || ""}`.trim());
    for (const scene of episode.scenes || []) {
      lines.push([
        `${scene.label} ${cleanSceneTitle(scene)}`.trim(),
        `状态：${scene.status || "queued"}`,
        `图片：${scene.localImagePath || scene.imageUrl || "未生成"}`,
        `视频：${scene.localVideoPath || scene.videoUrl || "未生成"}`,
        scene.error ? `错误：${scene.error}` : ""
      ].filter(Boolean).join("\n"));
      lines.push("");
    }
  }

  return lines.join("\n").trim();
}

function buildFailedSceneList(job) {
  if (!job) return "";
  const failed = [];
  for (const episode of job.episodes || []) {
    for (const scene of episode.scenes || []) {
      if (scene.status === "failed") {
        failed.push(`${scene.label} ${cleanSceneTitle(scene)}\n错误：${scene.error || "未知错误"}\n图片提示词：${scene.imagePrompt || ""}\n视频提示词：${scene.videoPrompt || ""}`);
      }
    }
  }
  return failed.length ? failed.join("\n\n") : "当前没有失败镜头。";
}

function renderEpisodes(project) {
  $("#panel-episodes").innerHTML = `
    <div class="section-heading">
      <h3>自动拆集表</h3>
      <button type="button" data-copy-key="episodes" data-copy-label="已复制拆集表">⎘ 复制</button>
    </div>
    <div class="episode-grid">
      ${project.episodes.map((episode, index) => `
        <section class="episode-card">
          <header>
            <h4>EP${pad(episode.number)} ${escapeHtml(episode.title)}</h4>
            <button type="button" data-jump-episode="${index}">查看</button>
          </header>
          <div class="episode-meta">${escapeHtml(episode.sourceRange)} · ${episode.charCount} 字 · ${episode.scenes.length} 镜</div>
          <p>${escapeHtml(episode.summary)}</p>
          <p><b>开场钩子</b>${escapeHtml(episode.hook)}</p>
          <p><b>结尾悬念</b>${escapeHtml(episode.endingHook)}</p>
        </section>
      `).join("")}
    </div>
  `;

  $$("[data-jump-episode]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeEpisodeIndex = Number(button.dataset.jumpEpisode);
      els.episodeSelect.value = String(state.activeEpisodeIndex);
      renderEpisodePanels();
      setEpisodeCopyTargets();
      activateTab("script");
    });
  });
}

function renderEpisodePanels() {
  if (!state.project) return;
  const episode = currentEpisode();
  renderScript(episode);
  renderStoryboard(episode);
  renderImagePrompts(episode);
  renderVideoPrompts(episode);
  renderRenderPanel();
}

function renderScript(episode) {
  $("#panel-script").innerHTML = `
    <div class="section-heading">
      <h3>EP${pad(episode.number)} 剧本</h3>
      <button type="button" data-copy-key="episode" data-copy-label="已复制当前集生产包">⎘ 当前集</button>
    </div>
    <div class="script-block">
      <pre>${escapeHtml(episode.scriptText)}</pre>
    </div>
  `;
}

function renderStoryboard(episode) {
  $("#panel-storyboard").innerHTML = `
    <div class="section-heading">
      <h3>EP${pad(episode.number)} 分镜</h3>
      <button type="button" data-copy-key="storyboard" data-copy-label="已复制全集分镜">⎘ 全集分镜</button>
    </div>
    <div class="storyboard-wrap">
      <table>
        <thead>
          <tr>
            <th>镜头</th>
            <th>场景</th>
            <th>时间</th>
            <th>时长</th>
            <th>镜头设计</th>
            <th>动作</th>
          </tr>
        </thead>
        <tbody>
          ${episode.scenes.map((scene) => `
            <tr>
              <td>${scene.label}</td>
              <td>${escapeHtml(scene.location)}</td>
              <td>${escapeHtml(scene.time)}</td>
              <td>${scene.durationSeconds}s</td>
              <td>${escapeHtml(scene.camera)}</td>
              <td>${escapeHtml(scene.beat)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function renderImagePrompts(episode) {
  $("#panel-image").innerHTML = `
    <div class="section-heading">
      <h3>EP${pad(episode.number)} 图片提示词</h3>
      <button type="button" data-copy-key="image" data-copy-label="已复制全集图片提示词">⎘ 全集图片</button>
    </div>
    <div class="prompt-grid">
      ${episode.scenes.map((scene) => `
        <section class="prompt-card">
          <b>${escapeHtml(scene.title)}</b>
          <pre>${escapeHtml(scene.imagePrompt)}</pre>
          <button class="copy-card" type="button" data-copy-key="scene-image-${scene.label}" data-copy-label="已复制 ${scene.label} 图片提示词">⎘ 复制</button>
        </section>
      `).join("")}
    </div>
  `;

  episode.scenes.forEach((scene) => {
    state.copyTargets[`scene-image-${scene.label}`] = scene.imagePrompt;
  });
}

function renderVideoPrompts(episode) {
  $("#panel-video").innerHTML = `
    <div class="section-heading">
      <h3>EP${pad(episode.number)} 图生视频提示词</h3>
      <button type="button" data-copy-key="video" data-copy-label="已复制全集视频提示词">⎘ 全集视频</button>
    </div>
    <div class="prompt-grid">
      ${episode.scenes.map((scene) => `
        <section class="prompt-card video">
          <b>${escapeHtml(scene.title)}</b>
          <pre>${escapeHtml(scene.videoPrompt)}</pre>
          <button class="copy-card" type="button" data-copy-key="scene-video-${scene.label}" data-copy-label="已复制 ${scene.label} 视频提示词">⎘ 复制</button>
        </section>
      `).join("")}
    </div>
  `;

  episode.scenes.forEach((scene) => {
    state.copyTargets[`scene-video-${scene.label}`] = scene.videoPrompt;
  });
}

function renderAdaptPanel() {
  const panel = $("#panel-adapt");
  if (!panel) return;

  const run = state.chatgptRun;
  const status = state.adapting ? "改编中" : run?.status === "completed" ? "已完成" : run?.status === "failed" ? "失败" : "等待改编";
  const model = run?.model || state.chatgpt?.model || "未连接";
  const duration = run?.durationMs ? `${Math.round(run.durationMs / 1000)} 秒` : "-";
  const logs = run?.logs?.length ? run.logs.join("\n") : "ChatGPT 改编日志会显示在这里。";
  const project = state.project;
  const summary = project ? `
    <div class="metric-grid">
      ${metric("模型", model)}
      ${metric("状态", status)}
      ${metric("集数", project.stats?.episodes || 0)}
      ${metric("镜头", project.stats?.scenes || 0)}
    </div>
    <div class="summary-grid">
      ${summaryItem("改编总控", project.outline?.logline || "等待 ChatGPT 输出")}
      ${summaryItem("生产规则", project.outline?.productionRule || "等待 ChatGPT 输出")}
      ${summaryItem("耗时", duration)}
      ${summaryItem("来源", project.fromChatGPT ? "当前生产包来自 ChatGPT 智能改编。" : "当前生产包来自本地规则，可点击 ChatGPT 智能改编升级。")}
    </div>
  ` : `
    <div class="progress-box">
      <p>先粘贴小说，点击“ChatGPT智能改编”。</p>
    </div>
  `;

  panel.innerHTML = `
    <div class="section-heading">
      <h3>ChatGPT智能改编</h3>
      <div class="render-actions">
        <button type="button" id="adaptPanelStartButton">ChatGPT智能改编</button>
      </div>
    </div>
    ${summary}
    <pre class="render-log">${escapeHtml(logs)}</pre>
  `;

  $("#adaptPanelStartButton")?.addEventListener("click", () => startChatGPTAdapt({ activate: true }));
}

async function startChatGPTAdapt(options = {}) {
  const activate = options.activate !== false;
  const config = collectConfig();

  if (!config.text) {
    notify("先粘贴整本小说正文");
    els.novel.focus();
    return false;
  }

  await checkChatGPTStatus();
  if (state.chatgpt?.demo) {
    if (!state.project) generateFromForm();
    state.chatgptRun = {
      status: "completed",
      model: "作品演示模式",
      logs: ["公开作品站未调用 ChatGPT API，已使用本地拆书和提示词生产包。"]
    };
    renderAdaptPanel();
    if (activate) activateTab("adapt");
    notify("作品演示使用本地改编，不会调用 ChatGPT API");
    return Boolean(state.project);
  }
  if (!state.chatgpt?.configured) {
    state.chatgptRun = {
      status: "failed",
      logs: ["未配置 OPENAI_API_KEY，无法调用 ChatGPT。"]
    };
    renderAdaptPanel();
    if (activate) activateTab("adapt");
    notify("未配置 OPENAI_API_KEY，不能调用 ChatGPT");
    return false;
  }

  try {
    state.adapting = true;
    state.chatgptRun = {
      status: "running",
      model: state.chatgpt.model,
      logs: [`开始调用 ChatGPT：${state.chatgpt.model}`]
    };
    if (activate) activateTab("adapt");
    renderAdaptPanel();

    const localProject = state.project?.exportData || null;
    const response = await apiPost("/api/chatgpt/adapt", { config, localProject });
    if (!response.ok) throw new Error(response.message || response.error || "ChatGPT 改编失败");

    state.chatgptRun = {
      status: "completed",
      model: response.model,
      durationMs: response.durationMs,
      logs: [
        `ChatGPT 改编完成：${response.model}`,
        `耗时：${Math.round(response.durationMs / 1000)} 秒`,
        `输出：${response.project.stats.episodes} 集，${response.project.stats.scenes} 镜头`
      ]
    };
    state.renderJob = null;
    renderProject(response.project);
    if (activate) activateTab("adapt");
    notify("ChatGPT改编完成");
    return true;
  } catch (error) {
    state.chatgptRun = {
      status: "failed",
      model: state.chatgpt?.model || "",
      logs: [`ChatGPT 改编失败：${error.message}`]
    };
    renderAdaptPanel();
    if (activate) activateTab("adapt");
    notify(error.message);
    return false;
  } finally {
    state.adapting = false;
    renderAdaptPanel();
  }
}

function renderRenderPanel() {
  const panel = $("#panel-render");
  if (!panel) return;
  const dryRun = Boolean(els.dryRun?.checked);
  const history = renderRenderHistory();

  if (!state.project && !state.renderJob) {
    if (els.startRender) els.startRender.textContent = "生成AI漫剧";
    panel.innerHTML = `
      <div class="section-heading">
        <h3>即梦生成</h3>
        <div class="render-actions">
          <button type="button" id="refreshRenderHistoryButton">刷新历史</button>
        </div>
      </div>
      <div class="progress-box">
        <p>先粘贴小说并点击“一键拆书生产”，再生成整部AI漫剧。</p>
      </div>
      ${history}
    `;
    $("#refreshRenderHistoryButton")?.addEventListener("click", loadRenderHistory);
    return;
  }

  const job = state.renderJob;
  const statusText = job ? renderJobStatus(job) : "等待生成";
  const percent = job?.progress?.percent || 0;
  const current = job?.progress?.current || "未开始";
  const finalLinks = job ? renderFinalLinks(job) : "";
  const cards = job ? renderRenderCards(job) : renderPlannedCards();
  const logs = job?.logs?.length ? job.logs.join("\n") : "任务日志会显示在这里。";
  const activeJob = jobIsActive(job);
  const startDisabled = state.renderSubmitting || activeJob;
  const plan = job ? calculateJobProductionPlan(job) : calculateProductionPlan(state.project, selectedRenderEpisodes());
  const renderScopeText = job
    ? `当前任务 · ${job.progress?.totalScenes || 0} 镜`
    : state.project
    ? (els.renderAllToggle.checked ? `全集 · ${state.project.stats.scenes} 镜` : `当前集 · ${currentEpisode().scenes.length} 镜`)
    : "历史任务";
  const nextScopeText = state.project && job ? `下一次生成：${els.renderAllToggle.checked ? "全集" : `当前集 EP${pad(currentEpisode().number)}`}` : "";
  const startLabel = state.project
    ? `${dryRun ? "模拟" : "生成"}${els.renderAllToggle.checked ? "全集" : "当前集"}AI漫剧`
    : "生成AI漫剧";
  if (els.startRender) els.startRender.textContent = startLabel;
  const modeText = job?.options?.dryRun || dryRun
    ? "模拟生成，不调用 ChatGPT / 即梦 API"
    : "实跑生成，会调用已配置的 ChatGPT / 即梦 API";

  panel.innerHTML = `
    <div class="section-heading">
      <h3>即梦生成</h3>
      <div class="render-actions">
        <button type="button" id="renderPanelStartButton" ${startDisabled ? "disabled" : ""}>${state.renderSubmitting ? "提交中" : escapeHtml(startLabel)}</button>
        ${activeJob ? `<button type="button" id="stopRenderButton">停止任务</button>` : ""}
        ${jobHasFailures(job) ? `<button type="button" id="retryFailedButton">重跑失败镜头</button>` : ""}
        <button type="button" id="refreshRenderButton">刷新</button>
      </div>
    </div>

    <div class="render-console">
      <div class="quick-switch" aria-label="生成范围">
        <button type="button" id="scopeCurrentButton" class="${!els.renderAllToggle.checked ? "active" : ""}" ${!state.project ? "disabled" : ""}>当前集</button>
        <button type="button" id="scopeAllButton" class="${els.renderAllToggle.checked ? "active" : ""}" ${!state.project ? "disabled" : ""}>全集</button>
      </div>
      <button type="button" id="toggleDryRunPanelButton" class="mode-button ${dryRun ? "active" : ""}">
        ${dryRun ? "模拟模式" : "实跑模式"}
      </button>
      <div class="episode-meta">${escapeHtml([renderScopeText, nextScopeText, modeText].filter(Boolean).join("；"))}</div>
    </div>

    <div class="progress-box">
      <div class="qc-line">
        <strong>${escapeHtml(statusText)}</strong>
        <span>${percent}%</span>
      </div>
      <div class="progress-bar"><div class="progress-fill" style="width:${percent}%"></div></div>
      <div class="episode-meta">${escapeHtml(current)}</div>
      ${finalLinks}
      ${job ? `
        <div class="render-actions">
          <button type="button" id="copyRenderManifestButton">复制产物清单</button>
          ${jobHasFailures(job) ? `<button type="button" id="copyFailedScenesButton">复制失败清单</button>` : ""}
        </div>
      ` : ""}
    </div>

    <div class="progress-box">
      <strong>生产预算</strong>
      <div class="episode-meta">当前模式：${escapeHtml(modeText)}</div>
      <div class="episode-meta">首帧图 ${plan.imageCalls} 张；视频任务 ${plan.videoTasks} 条；镜头总秒数 ${plan.totalClipSeconds}s；失败重试 ${plan.retryAttempts} 次/镜。</div>
      <div class="episode-meta">风险：${escapeHtml(plan.risks.join("；") || "当前配置风险较低。")}</div>
    </div>

    ${history}
    <div class="render-grid">${cards}</div>
    <pre class="render-log">${escapeHtml(logs)}</pre>
  `;

  $("#renderPanelStartButton")?.addEventListener("click", startJimengRender);
  $("#stopRenderButton")?.addEventListener("click", stopRenderJob);
  $("#retryFailedButton")?.addEventListener("click", retryFailedRender);
  $("#refreshRenderButton")?.addEventListener("click", () => {
    if (state.renderJob?.id) pollRenderJob(state.renderJob.id, { once: true });
    else checkProviderStatus();
    loadRenderHistory();
  });
}

function jobHasFailures(job) {
  return Boolean(job?.episodes?.some((episode) => episode.scenes.some((scene) => scene.status === "failed")));
}

function jobIsActive(job) {
  return Boolean(job && ["queued", "running", "image", "video", "retrying", "assembling", "cancelling"].includes(job.status));
}

function renderJobStatus(job) {
  const map = {
    queued: "排队中",
    running: "生成中",
    assembling: "拼接成片中",
    cancelling: "停止中",
    cancelled: "已停止",
    completed: "已完成",
    partial: "部分完成",
    failed: "失败"
  };
  return `${map[job.status] || job.status} · ${job.progress?.completedScenes || 0}/${job.progress?.totalScenes || 0} 镜完成`;
}

function renderFinalLinks(job) {
  const links = [];
  if (job.finalVideoPath) links.push(`<a class="button-link" href="${escapeAttr(job.finalVideoPath)}" target="_blank" rel="noopener">打开全集</a>`);
  (job.finalVideos || []).forEach((url, index) => {
    links.push(`<a class="button-link" href="${escapeAttr(url)}" target="_blank" rel="noopener">打开第${pad(index + 1)}集</a>`);
  });
  if (job.outputDir) links.push(`<a class="button-link" href="${escapeAttr(`${job.outputDir}/manifest.json`)}" target="_blank" rel="noopener">Manifest</a>`);
  return links.length ? `<div class="render-links">${links.join("")}</div>` : "";
}

function renderRenderHistory() {
  const items = (state.renderHistory || []).slice(0, 8);
  const rows = items.length
    ? items.map((job) => {
      const time = formatLocalTime(job.updatedAt || job.createdAt);
      const status = renderJobStatus(job);
      const mode = job.options?.dryRun ? "模拟" : "实跑";
      return `
        <div class="history-row">
          <div>
            <strong>${escapeHtml(job.title || "AI漫剧任务")}</strong>
            <span>${escapeHtml(mode)} · ${escapeHtml(status)} · ${escapeHtml(time)}</span>
          </div>
          <div class="render-actions">
            ${job.outputDir ? `<a class="button-link" href="${escapeAttr(`${job.outputDir}/manifest.json`)}" target="_blank" rel="noopener">Manifest</a>` : ""}
            <button type="button" data-load-render-job="${escapeAttr(job.id)}">载入</button>
          </div>
        </div>
      `;
    }).join("")
    : `<div class="episode-meta">还没有历史任务。可以先开启“模拟生成”跑一遍整部流程。</div>`;

  return `
    <div class="progress-box render-history">
      <div class="qc-line">
        <strong>任务历史</strong>
        <span>${items.length ? `${items.length} 条` : "空"}</span>
      </div>
      <div class="history-list">${rows}</div>
    </div>
  `;
}

function renderRenderCards(job) {
  return job.episodes.flatMap((episode) => episode.scenes.map((scene) => {
    const className = `render-card ${scene.status === "done" ? "done" : scene.status === "failed" ? "failed" : ""}`;
    const previewUrl = scenePreviewUrl(scene);
    const preview = previewUrl
      ? `<a class="render-thumb" href="${escapeAttr(previewUrl)}" target="_blank" rel="noopener"><img src="${escapeAttr(previewUrl)}" alt="${escapeAttr(scene.label)} 首帧"></a>`
      : `<div class="render-thumb empty">等待首帧</div>`;
    const localVideoLabel = scene.localVideoPath?.endsWith(".txt") ? "视频清单" : "本地视频";
    const links = [
      scene.imageUrl ? `<a href="${escapeAttr(scene.imageUrl)}" target="_blank" rel="noopener">图片</a>` : "",
      scene.videoUrl ? `<a href="${escapeAttr(scene.videoUrl)}" target="_blank" rel="noopener">视频</a>` : "",
      scene.localImagePath ? `<a href="${escapeAttr(scene.localImagePath)}" target="_blank" rel="noopener">本地图片</a>` : "",
      scene.localVideoPath ? `<a href="${escapeAttr(scene.localVideoPath)}" target="_blank" rel="noopener">${localVideoLabel}</a>` : ""
    ].filter(Boolean).join("");
    return `
      <section class="${className}">
        ${preview}
        <h4>${escapeHtml(scene.label)} ${escapeHtml(cleanSceneTitle(scene))}</h4>
        <p>状态：${escapeHtml(scene.status || "queued")}</p>
        ${scene.error ? `<p>错误：${escapeHtml(scene.error)}</p>` : ""}
        <div class="render-links">${links || "等待产物"}</div>
      </section>
    `;
  })).join("");
}

function scenePreviewUrl(scene) {
  const url = scene.localImagePath || scene.imageUrl || "";
  if (!url) return "";
  if (/^data:image\//.test(url)) return url;
  if (/\.(png|jpe?g|webp|gif|svg)(\?|#|$)/i.test(url)) return url;
  return "";
}

function renderPlannedCards() {
  const episodes = els.renderAllToggle.checked ? state.project.episodes : [currentEpisode()];
  return episodes.flatMap((episode) => episode.scenes.map((scene) => `
    <section class="render-card">
      <h4>${escapeHtml(scene.label)} ${escapeHtml(cleanSceneTitle(scene))}</h4>
      <p>待生成：首帧图片 + 图生视频</p>
      <p>${escapeHtml(scene.beat)}</p>
    </section>
  `)).join("");
}

function cleanSceneTitle(scene) {
  return String(scene.title || "").replace(scene.label || "", "").trim();
}

async function startJimengRender() {
  if (state.renderSubmitting) {
    notify("任务正在提交中");
    return;
  }
  if (jobIsActive(state.renderJob)) {
    notify("当前任务还在运行，可先停止或等待完成");
    return;
  }

  if (!state.project) {
    generateFromForm();
    if (!state.project) return;
  }

  let dryRun = Boolean(els.dryRun?.checked);
  await checkProviderStatus();
  if (state.provider?.demo) {
    dryRun = true;
    els.dryRun.checked = true;
    saveRenderPrefs();
  }

  if (!dryRun && els.useChatgptToggle.checked && !state.project.fromChatGPT) {
    const adapted = await startChatGPTAdapt({ activate: false, renderAfter: false });
    if (!adapted) return;
  } else if (dryRun && els.useChatgptToggle.checked && !state.project.fromChatGPT) {
    notify(state.provider?.demo ? "作品演示使用本地改编与模拟生成" : "模拟模式跳过 ChatGPT API，使用本地拆书生产包演练");
  }

  if (!dryRun && !state.provider?.configured) {
    notify("未配置 ARK_API_KEY，不能直连即梦生成");
    activateTab("render");
    renderRenderPanel();
    return;
  }

  const payloadProject = prepareRenderProject();
  try {
    state.renderSubmitting = true;
    els.startRender.disabled = true;
    renderRenderPanel();
    notify(dryRun ? "模拟生成任务已提交" : "即梦生成任务已提交");
    if (state.provider?.demo) {
      const job = createBrowserDemoJob(payloadProject, {
        aspect: state.project.config.aspect,
        retryAttempts: clamp(Number(els.retryAttempts.value) || 0, 0, 3)
      });
      state.renderJob = job;
      state.renderHistory = mergeDemoHistory(job);
      activateTab("render");
      renderRenderPanel();
      await runBrowserDemoJob(job);
      return;
    }
    const response = await apiPost("/api/render/start", {
      project: payloadProject,
      options: {
        assemble: els.assembleToggle.checked,
        dryRun,
        aspect: state.project.config.aspect,
        retryAttempts: clamp(Number(els.retryAttempts.value) || 0, 0, 3)
      }
    });
    if (!response.ok) throw new Error(response.message || response.error || "任务提交失败");
    state.renderJob = response.job;
    activateTab("render");
    renderRenderPanel();
    loadRenderHistory();
    pollRenderJob(response.jobId);
  } catch (error) {
    notify(error.message);
    state.renderJob = {
      status: "failed",
      progress: { totalScenes: 0, completedScenes: 0, failedScenes: 0, percent: 0, current: error.message },
      episodes: [],
      logs: [error.message]
    };
    renderRenderPanel();
  } finally {
    state.renderSubmitting = false;
    els.startRender.disabled = false;
    renderRenderPanel();
  }
}

function createBrowserDemoJob(project, options) {
  const id = `demo-${Date.now().toString(36)}`;
  const episodes = (project.episodes || []).map((episode) => ({
    number: episode.number,
    title: episode.title,
    scenes: (episode.scenes || []).map((scene, index) => ({
      label: scene.label || `EP${pad(episode.number)}-S${pad(index + 1)}`,
      title: scene.title,
      imagePrompt: scene.imagePrompt || "",
      videoPrompt: scene.videoPrompt || "",
      durationSeconds: scene.durationSeconds || 5,
      status: "queued",
      imageUrl: "",
      videoTaskId: "",
      videoUrl: "",
      localImagePath: "",
      localVideoPath: "",
      error: ""
    }))
  }));
  const totalScenes = episodes.reduce((sum, episode) => sum + episode.scenes.length, 0);
  const timestamp = new Date().toISOString();
  return {
    id,
    title: project.title || "AI漫剧",
    status: "queued",
    createdAt: timestamp,
    updatedAt: timestamp,
    outputDir: "",
    options: { dryRun: true, browserDemo: true, assemble: false, aspect: options.aspect || "9:16", retryAttempts: options.retryAttempts || 0 },
    provider: { mode: "browser-demo", imageModel: "作品演示", videoModel: "作品演示" },
    progress: { totalScenes, completedScenes: 0, failedScenes: 0, percent: 0, current: "排队中" },
    episodes,
    logs: ["作品演示模式：所有生成仅在浏览器本地模拟，不会上传小说内容。"],
    finalVideos: [],
    finalVideoPath: "",
    cancelRequested: false,
    error: ""
  };
}

async function runBrowserDemoJob(job) {
  job.status = "running";
  job.progress.current = "开始模拟生成";
  job.logs.push("开始本地模拟生成");
  renderRenderPanel();

  const scenes = job.episodes.flatMap((episode) => episode.scenes);
  for (const scene of scenes) {
    if (job.cancelRequested) {
      scene.status = "cancelled";
      continue;
    }
    scene.status = "image";
    job.progress.current = `${scene.label} 生成演示首帧`;
    scene.imageUrl = createBrowserDemoImage(job, scene);
    job.logs.push(`${scene.label} 演示首帧完成`);
    renderRenderPanel();
    await waitForDemoFrame(70);

    if (job.cancelRequested) {
      scene.status = "cancelled";
      continue;
    }
    scene.status = "video";
    job.progress.current = `${scene.label} 生成演示视频清单`;
    scene.videoTaskId = `demo-video-${job.id}-${scene.label}`;
    scene.videoUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(`${scene.label} 演示视频\n\n${scene.videoPrompt || ""}`)}`;
    await waitForDemoFrame(70);

    scene.status = "done";
    job.progress.completedScenes += 1;
    job.progress.percent = Math.round((job.progress.completedScenes / job.progress.totalScenes) * 100);
    job.progress.current = `${scene.label} 完成`;
    job.logs.push(`${scene.label} 演示镜头完成`);
    job.updatedAt = new Date().toISOString();
    renderRenderPanel();
  }

  if (job.cancelRequested) {
    job.status = "cancelled";
    job.episodes.forEach((episode) => episode.scenes.forEach((scene) => {
      if (["queued", "image", "video"].includes(scene.status)) scene.status = "cancelled";
    }));
    job.progress.current = "已停止";
    job.logs.push("作品演示任务已停止");
  } else {
    job.status = "completed";
    job.progress.percent = 100;
    job.progress.current = "完成";
    job.logs.push("作品演示任务完成");
  }
  job.updatedAt = new Date().toISOString();
  state.renderHistory = mergeDemoHistory(job);
  renderRenderPanel();
}

function createBrowserDemoImage(job, scene) {
  const title = escapeXmlForSvg(cleanSceneTitle(scene) || scene.label);
  const subtitle = escapeXmlForSvg(`${job.title} · ${scene.label}`);
  const prompt = escapeXmlForSvg(String(scene.imagePrompt || "演示首帧").replace(/\s+/g, " ").slice(0, 72));
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280" viewBox="0 0 720 1280"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#111c22"/><stop offset="1" stop-color="#163f38"/></linearGradient></defs><rect width="720" height="1280" fill="url(#g)"/><rect x="36" y="36" width="648" height="1208" rx="18" fill="none" stroke="#50c8b8" stroke-opacity=".65"/><text x="68" y="112" fill="#87e8d7" font-size="24" font-family="Arial, Microsoft YaHei">PORTFOLIO DEMO</text><text x="68" y="186" fill="#f5f1e8" font-size="38" font-weight="700" font-family="Arial, Microsoft YaHei">${title}</text><text x="68" y="232" fill="#b8c8c5" font-size="22" font-family="Arial, Microsoft YaHei">${subtitle}</text><path d="M68 320H652" stroke="#50c8b8" stroke-opacity=".5"/><text x="68" y="380" fill="#d9e7e3" font-size="25" font-family="Arial, Microsoft YaHei">${prompt}</text><text x="68" y="1168" fill="#9fb0ad" font-size="20" font-family="Arial, Microsoft YaHei">本地演示首帧 · 不调用真实模型</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function escapeXmlForSvg(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function waitForDemoFrame(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function retryFailedRender() {
  if (state.renderSubmitting) {
    notify("任务正在提交中");
    return;
  }
  if (jobIsActive(state.renderJob)) {
    notify("当前任务还在运行，不能同时重跑失败镜头");
    return;
  }
  if (!state.renderJob || !jobHasFailures(state.renderJob)) {
    notify("没有失败镜头可重跑");
    return;
  }

  const dryRun = Boolean(els.dryRun?.checked || state.renderJob?.options?.dryRun);
  await checkProviderStatus();
  if (!dryRun && !state.provider?.configured) {
    notify("未配置 ARK_API_KEY，不能重跑失败镜头");
    return;
  }

  const episodes = state.renderJob.episodes.map((episode) => {
    const scenes = episode.scenes
      .filter((scene) => scene.status === "failed")
      .map((scene) => ({
        ...scene,
        status: "queued",
        imageUrl: "",
        videoTaskId: "",
        videoUrl: "",
        localImagePath: "",
        localVideoPath: "",
        error: ""
      }));
    return { ...episode, scenes };
  }).filter((episode) => episode.scenes.length);

  try {
    state.renderSubmitting = true;
    renderRenderPanel();
    const response = await apiPost("/api/render/start", {
      project: {
        title: `${state.project?.title || state.renderJob.title}-失败镜头重跑`,
        config: state.project?.config || { aspect: "9:16" },
        episodes
      },
      options: {
        assemble: false,
        dryRun,
        aspect: state.project?.config?.aspect || "9:16",
        retryAttempts: clamp(Number(els.retryAttempts.value) || 0, 0, 3)
      }
    });
    if (!response.ok) throw new Error(response.message || response.error || "重跑任务提交失败");
    state.renderJob = response.job;
    activateTab("render");
    renderRenderPanel();
    loadRenderHistory();
    pollRenderJob(response.jobId);
    notify("失败镜头重跑已提交");
  } catch (error) {
    notify(error.message);
  } finally {
    state.renderSubmitting = false;
    renderRenderPanel();
  }
}

async function stopRenderJob() {
  if (!state.renderJob?.id) {
    notify("没有正在运行的任务");
    return;
  }
  if (!jobIsActive(state.renderJob)) {
    notify("当前任务已经结束");
    return;
  }

  if (state.renderJob.options?.browserDemo) {
    state.renderJob.cancelRequested = true;
    state.renderJob.status = "cancelling";
    state.renderJob.progress.current = "正在停止任务";
    renderRenderPanel();
    notify("正在停止本地演示任务");
    return;
  }

  try {
    const response = await apiPost(`/api/render/jobs/${state.renderJob.id}/cancel`, {});
    if (!response.ok) throw new Error(response.message || response.error || "停止任务失败");
    state.renderJob = response.job;
    renderRenderPanel();
    loadRenderHistory();
    if (jobIsActive(state.renderJob)) pollRenderJob(state.renderJob.id);
    notify("已发送停止任务请求");
  } catch (error) {
    notify(error.message);
  }
}

function prepareRenderProject() {
  const data = structuredCloneSafe(state.project.exportData);
  if (!els.renderAllToggle.checked) {
    const episode = currentEpisode();
    data.episodes = data.episodes.filter((item) => item.number === episode.number);
  }
  data.config = state.project.config;
  return data;
}

async function pollRenderJob(jobId, options = {}) {
  window.clearTimeout(state.renderPollTimer);
  try {
    const data = await apiGet(`/api/render/jobs/${jobId}`);
    if (data.ok === false) throw new Error(data.message || data.error || "任务不存在");
    state.renderJob = data;
    renderRenderPanel();
    const done = ["completed", "partial", "failed", "cancelled"].includes(data.status);
    if (!done && !options.once) {
      state.renderPollTimer = window.setTimeout(() => pollRenderJob(jobId), 3000);
    } else if (done) {
      loadRenderHistory();
    }
  } catch (error) {
    notify(error.message);
  }
}

async function loadRenderHistory() {
  try {
    const data = await apiGet("/api/render/jobs");
    if (data.ok === false) throw new Error(data.message || data.error || "历史任务读取失败");
    state.renderHistory = data.jobs || [];
    renderRenderPanel();
  } catch (error) {
    if (isPortfolioDemo()) {
      renderRenderPanel();
      return;
    }
    state.renderHistory = [];
  }
}

async function loadRenderJob(jobId) {
  if (!jobId) return;
  const browserDemo = state.renderHistory.find((job) => job.id === jobId && job.options?.browserDemo);
  if (browserDemo) {
    state.renderJob = browserDemo;
    activateTab("render");
    renderRenderPanel();
    notify("已载入本地演示任务");
    return;
  }
  try {
    const data = await apiGet(`/api/render/jobs/${jobId}`);
    if (data.ok === false) throw new Error(data.message || data.error || "任务不存在");
    state.renderJob = data;
    activateTab("render");
    renderRenderPanel();
    notify("已载入历史任务");
  } catch (error) {
    notify(error.message);
  }
}

function mergeDemoHistory(job) {
  const history = [job, ...state.renderHistory.filter((item) => item.id !== job.id && item.options?.browserDemo)].slice(0, 3);
  try {
    localStorage.setItem(DEMO_HISTORY_KEY, JSON.stringify(history));
  } catch {
    // 演示任务仍保留在当前会话，浏览器空间不足时不强行写入。
  }
  return history;
}

function restoreDemoHistory() {
  try {
    const raw = localStorage.getItem(DEMO_HISTORY_KEY);
    const history = raw ? JSON.parse(raw) : [];
    if (Array.isArray(history)) state.renderHistory = history.filter((job) => job?.options?.browserDemo);
  } catch {
    localStorage.removeItem(DEMO_HISTORY_KEY);
  }
}

function isPortfolioDemo() {
  const host = window.location.hostname;
  return new URLSearchParams(window.location.search).get("portfolioDemo") === "1"
    || (window.location.protocol !== "file:" && !["127.0.0.1", "localhost", "::1"].includes(host));
}

async function checkProviderStatus() {
  if (isPortfolioDemo()) {
    state.provider = { configured: false, demo: true };
    els.providerStatus.textContent = "作品演示";
    els.providerStatus.className = "status-pill ready";
    els.providerHint.textContent = "公开作品站使用浏览器本地模拟，不会上传小说内容或调用即梦接口。";
    return;
  }
  try {
    const data = await apiGet("/api/provider/status");
    state.provider = data;
    const dryRun = Boolean(els.dryRun?.checked);
    els.providerStatus.textContent = dryRun ? "模拟模式" : data.configured ? "已连接" : "未配置";
    els.providerStatus.className = `status-pill ${dryRun || data.configured ? "ready" : "offline"}`;
    els.providerHint.textContent = dryRun
      ? "模拟生成不会调用即梦 API，会在本地 output 目录生成占位图片、视频清单和 manifest。"
      : data.configured
      ? `模型：${data.imageModel} / ${data.videoModel}${data.ffmpegAvailable ? "；可拼接" : "；未检测到 ffmpeg"}`
      : "未配置 ARK_API_KEY。请用后端启动命令设置后再生成。";
  } catch (error) {
    state.provider = { configured: false };
    els.providerStatus.textContent = "后端未启动";
    els.providerStatus.className = "status-pill error";
    els.providerHint.textContent = "请使用 server.js 启动本地后端，而不是普通静态服务器。";
  }
}

async function checkChatGPTStatus() {
  if (isPortfolioDemo()) {
    state.chatgpt = { configured: false, demo: true };
    els.chatgptStatus.textContent = "作品演示";
    els.chatgptStatus.className = "status-pill ready";
    els.chatgptHint.textContent = "公开作品站使用本地规则拆书，真实 ChatGPT 改编仅在配置后端密钥时启用。";
    return;
  }
  try {
    const data = await apiGet("/api/chatgpt/status");
    state.chatgpt = data;
    els.chatgptStatus.textContent = data.configured ? "已连接" : "未配置";
    els.chatgptStatus.className = `status-pill ${data.configured ? "ready" : "offline"}`;
    els.chatgptHint.textContent = data.configured
      ? `模型：${data.model}；用于拆书、剧本、分镜和提示词。`
      : "未配置 OPENAI_API_KEY。请在 .env 中填写后重启后端。";
  } catch (error) {
    state.chatgpt = { configured: false };
    els.chatgptStatus.textContent = "后端未启动";
    els.chatgptStatus.className = "status-pill error";
    els.chatgptHint.textContent = "请使用 server.js 启动本地后端，而不是普通静态服务器。";
  }
}

function renderQC(project) {
  $("#panel-qc").innerHTML = `
    <div class="section-heading">
      <h3>成片验收台</h3>
      <button type="button" data-copy-key="qc" data-copy-label="已复制验收清单">⎘ 清单</button>
    </div>

    <div class="metric-grid">
      ${metric("应交付集数", project.stats.episodes)}
      ${metric("应交付镜头", project.stats.scenes)}
      ${metric("最低合格", "85 分")}
      ${metric("推荐验收", "95 分")}
    </div>

    <div class="score-strip">
      <div class="score-bar"><div id="qcScoreFill" class="score-fill"></div></div>
      <strong id="qcScoreText">0 / 100</strong>
    </div>

    <div class="qc-grid">
      ${qcItem("镜头齐全", `所有 ${project.stats.episodes} 集、${project.stats.scenes} 个镜头均已生成，无缺集、缺镜、错序。`)}
      ${qcItem("剧情完整", "每集开头钩子、核心冲突、结尾悬念都能对应拆集表。")}
      ${qcItem("角色连续", "脸型、发型、服装、标志性道具和人物关系在全剧中保持一致。")}
      ${qcItem("画面干净", "没有水印、乱码、无关字幕、logo、多余肢体、明显穿模或变脸。")}
      ${qcItem("动效合格", "图生视频没有跳帧、鬼影、突然变形，动作幅度符合漫剧风格。")}
      ${qcItem("风格统一", `画幅统一为 ${project.config.aspect}，画风统一为 ${stylePresets[project.config.styleKey].label}。`)}
      ${qcItem("声音字幕", "旁白、对白、音效和字幕顺序能对齐镜头，不抢画面信息。")}
      ${qcItem("商业交付", "封面、集标题、正片、返工备注和导出文件命名完整可追踪。")}
    </div>

    <div class="review-box">
      <h4>粘贴AI成果链接/文件清单/返工备注</h4>
      <textarea id="reviewInput" placeholder="例如：EP01.mp4 通过；EP02-S03 变脸；EP04 缺视频；或粘贴成片链接列表"></textarea>
      <button type="button" id="reviewButton">自动生成验收意见</button>
      <div id="reviewReport" class="review-result">等待粘贴成果清单。</div>
    </div>
  `;
  updateQcScore();
}

function renderMaster(project) {
  $("#panel-master").innerHTML = `
    <div class="section-heading">
      <h3>整本主控提示词</h3>
      <button type="button" data-copy-key="master" data-copy-label="已复制主控提示词">⎘ 复制</button>
    </div>
    <div class="master-block">
      <pre>${escapeHtml(clipText(project.masterPrompt, 12000))}</pre>
    </div>
  `;
}

function qcItem(title, body) {
  return `
    <section class="qc-card">
      <label>
        <input type="checkbox" data-qc-check>
        <span><strong>${escapeHtml(title)}</strong><br>${escapeHtml(body)}</span>
      </label>
    </section>
  `;
}

function updateQcScore() {
  const checks = $$("[data-qc-check]");
  if (!checks.length) return;
  const checked = checks.filter((item) => item.checked).length;
  const score = Math.round((checked / checks.length) * 100);
  const fill = $("#qcScoreFill");
  const text = $("#qcScoreText");
  if (fill) fill.style.width = `${score}%`;
  if (text) text.textContent = `${score} / 100`;
}

function runReview() {
  if (!state.project) return;
  const value = ($("#reviewInput")?.value || "").trim();
  const report = $("#reviewReport");
  if (!value) {
    report.textContent = "先粘贴AI成果链接、文件名或返工备注。";
    return;
  }

  const links = value.match(/https?:\/\/\S+/g) || [];
  const files = value.match(/\b[\w\u4e00-\u9fa5.-]+\.(?:mp4|mov|webm|mkv)\b/gi) || [];
  const episodeMentions = Array.from(value.matchAll(/EP\s*0*(\d+)|第\s*(\d+)\s*集/gi))
    .map((match) => `EP${pad(Number(match[1] || match[2]))}`);
  const issueWords = ["变脸", "崩", "跳帧", "花屏", "水印", "乱码", "穿模", "模糊", "缺", "错序", "字幕错", "鬼影"];
  const issues = issueWords.filter((word) => value.includes(word));
  const expected = state.project.stats.episodes;
  const uniqueEpisodes = new Set(episodeMentions);
  const artifactCount = links.length + files.length;
  const deliveryCount = uniqueEpisodes.size || Math.min(artifactCount, expected);
  const coverage = expected ? Math.min(100, Math.round((deliveryCount / expected) * 100)) : 0;
  const issuePenalty = Math.min(45, issues.length * 8);
  const score = clamp(coverage - issuePenalty, 0, 100);
  const verdict = score >= 95 ? "可验收" : score >= 85 ? "局部返修后验收" : "需要返工";
  const missing = Math.max(0, expected - deliveryCount);

  report.textContent = [
    `自动验收意见：${verdict}`,
    `估算交付覆盖：${deliveryCount}/${expected} 集，覆盖率 ${coverage}%`,
    `估算得分：${score}/100`,
    missing ? `缺口：可能还缺 ${missing} 集或链接未列全。` : "缺口：未发现明显缺集。",
    issues.length ? `风险词：${issues.join("、")}。建议按这些问题回到对应镜头重做首帧或视频。` : "风险词：未发现明显返工关键词。",
    "人工复核重点：角色连续性、字幕顺序、结尾钩子、画幅统一、无水印文字。"
  ].join("\n");
}

function resetOutput() {
  state.project = null;
  state.renderJob = null;
  state.activeEpisodeIndex = 0;
  state.copyTargets = {};
  if (els.startRender) els.startRender.textContent = "生成AI漫剧";
  els.empty.classList.remove("hidden");
  els.output.classList.add("hidden");
  els.meta.textContent = "等待整本小说";
  els.projectTitle.textContent = "AI漫剧成果预览";
}

function currentEpisode() {
  return state.project.episodes[state.activeEpisodeIndex] || state.project.episodes[0];
}

function metric(label, value) {
  return `<div class="metric"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(value)}</span></div>`;
}

function summaryItem(label, value, options = {}) {
  const content = options.html ? value : `<p>${escapeHtml(value)}</p>`;
  return `<section class="summary-item"><b>${escapeHtml(label)}</b>${content}</section>`;
}

function activateTab(name) {
  $$(".tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.tab === name);
  });
  $$(".tab-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.panel === name);
  });
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "\n")
    .replace(/\u3000/g, " ")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function splitParagraphs(text) {
  return normalizeText(text)
    .split(/\n{1,}/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitSentences(text) {
  const normalized = normalizeText(text).replace(/\s+/g, " ");
  return (normalized.match(/[^。！？!?；;]+[。！？!?；;][”"』」）)]?|[^。！？!?；;]+$/g) || [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !/^[”"』」）)]+$/.test(sentence));
}

function splitLongText(text, limit) {
  const sentences = splitSentences(text);
  const chunks = [];
  let bucket = "";
  sentences.forEach((sentence) => {
    if (bucket && bucket.length + sentence.length > limit) {
      chunks.push(bucket);
      bucket = "";
    }
    bucket += sentence;
  });
  if (bucket) chunks.push(bucket);
  return chunks.length ? chunks : [text.slice(0, limit)];
}

function chunkTextForScenes(text, sceneCount) {
  const paragraphs = splitParagraphs(text);
  const units = paragraphs.length >= sceneCount ? paragraphs : splitSentences(text);
  const count = Math.min(sceneCount, Math.max(1, units.length));
  const chunks = [];
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor((index * units.length) / count);
    const end = Math.floor(((index + 1) * units.length) / count);
    chunks.push(units.slice(start, Math.max(end, start + 1)).join("\n"));
  }
  return chunks;
}

function extractCharacters(text) {
  const scores = new Map();
  const stopWords = new Set(["他们", "她们", "我们", "你们", "自己", "一个", "那个", "这里", "远处", "声音", "影子", "男人", "女人", "父亲", "母亲", "如果他", "如果她", "这座港", "别相信"]);
  const patterns = [
    /(?:^|[，。；、\n\s]|人)([一-龥]{2,3})(?=说|问|道|喊|低声|笑道|回答|望着|看着|走向|站在|握住|抬头|转身|在|从|把|看见|发现|进入|决定|走出|收到)/g,
    /(?:“[^”]{1,80}”|"[^"]{1,80}")\s*([一-龥]{2,3})(?:说|问|道|喊|低声)/g
  ];

  const isLikelyName = (name) => {
    if (stopWords.has(name)) return false;
    if (/^(如果|那个|这个|这座|一个|所有|别相)/.test(name)) return false;
    if (/(低声|掌心|一道|有人|每个|所有|危险|港口|灯光|火柴|货轮|窗户|线索|雾气|脚步|记号)/.test(name)) return false;
    if (/[的是有在从把被和与到就不也都里中上下]/.test(name)) return false;
    return name.length >= 2 && name.length <= 3;
  };

  patterns.forEach((pattern) => {
    let match = pattern.exec(text);
    while (match) {
      const name = match[1];
      if (isLikelyName(name)) {
        scores.set(name, (scores.get(name) || 0) + 1);
      }
      match = pattern.exec(text);
    }
  });

  const western = text.match(/\b[A-Z][a-z]{2,}\b/g) || [];
  western.forEach((name) => scores.set(name, (scores.get(name) || 0) + 1));

  return Array.from(scores.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name]) => name)
    .slice(0, 6);
}

function deriveTitle(text) {
  const firstLine = normalizeText(text).split("\n").map((line) => line.trim()).find(Boolean) || "未命名小说";
  const stripped = firstLine.replace(/^第[一二三四五六七八九十百千万零〇两\d]+[章节回幕卷集]\s*/, "").replace(/[《》"'“”#]/g, "");
  return stripped.length <= 18 ? stripped : "未命名小说";
}

function makeSourceRange(group) {
  const first = group[0]?.title || "开篇";
  const last = group[group.length - 1]?.title || first;
  return first === last ? first : `${first} 至 ${last}`;
}

function makeEpisodeTitle(text, number, genre) {
  const hit = [
    [/信|纸|字条/, "来信"],
    [/船|码头|海|灯塔/, "归船"],
    [/门|房间|楼梯|电梯/, "门后"],
    [/追|逃|枪|刀|危险/, "追逃"],
    [/爱|吻|心|离开/, "选择"],
    [/真相|秘密|背叛/, "反转"],
    [/火|爆炸|燃烧/, "燃点"],
    [/雨|雪|风|雾/, "预兆"]
  ].find(([pattern]) => pattern.test(text));
  return hit ? `${hit[1]}篇` : `${genre}篇 ${pad(number)}`;
}

function makeSceneTitle(text, sceneNumber, genre) {
  const hit = [
    [/信|纸|字条/, "无法寄出的信"],
    [/船|码头|海|灯塔/, "雾中的归船"],
    [/门|房间|楼梯|电梯/, "门后的回声"],
    [/追|逃|枪|刀|危险/, "逼近的威胁"],
    [/爱|吻|心|离开/, "未说出口的选择"],
    [/真相|秘密|背叛/, "真相反转"],
    [/火|爆炸|燃烧/, "点燃的决定"],
    [/雨|雪|风|雾/, "天气里的预兆"]
  ].find(([pattern]) => pattern.test(text));
  return hit ? hit[1] : `${genre}节点 ${sceneNumber}`;
}

function inferLocation(text, genre) {
  const hit = [
    [/码头|船|海|港|灯塔|潮|雾/, "港口/码头"],
    [/学校|教室|操场|图书馆/, "学校"],
    [/医院|病房|手术|药/, "医院"],
    [/办公室|公司|会议|电梯/, "办公楼"],
    [/街|巷|路口|霓虹|车站/, "城市街区"],
    [/山|林|谷|雪|河|崖/, "野外山林"],
    [/宫|殿|城门|将军|皇/, "古代城池"],
    [/飞船|基地|星|舱|算法|机器人/, "近未来空间"]
  ].find(([pattern]) => pattern.test(text));
  if (hit) return hit[1];
  if (genre === "武侠") return "江湖驿站";
  if (genre === "科幻") return "近未来城市";
  if (genre === "历史") return "旧城街巷";
  return "关键场景";
}

function inferTime(text) {
  if (/凌晨|黎明|清晨|天亮/.test(text)) return "清晨";
  if (/夜|晚|灯|月|星|黑/.test(text)) return "夜晚";
  if (/黄昏|傍晚|夕阳|落日/.test(text)) return "黄昏";
  if (/雨|雾|雪|风暴/.test(text)) return "天气压迫的白天";
  return "白天";
}

function inferEmotion(text) {
  const hit = [
    [/恐|怕|惊|逃|死|血|危险|尖叫/, "恐惧、压迫、急促"],
    [/爱|吻|抱|想念|心跳|温柔/, "克制、亲密、暗涌"],
    [/怒|恨|背叛|杀|复仇/, "愤怒、撕裂、决绝"],
    [/雾|雨|信|失踪|秘密|真相/, "悬疑、潮湿、紧绷"],
    [/笑|热闹|阳光|朋友/, "明亮、轻快、带转折"],
    [/孤|冷|空|旧|遗忘/, "孤独、冷冽、回忆感"]
  ].find(([pattern]) => pattern.test(text));
  return hit ? hit[1] : "克制、紧张、逐步升温";
}

function inferConflict(text, genre) {
  if (/信|秘密|真相|谎|隐瞒/.test(text)) return "信息不可信，人物必须判断谁在操控真相。";
  if (/追|逃|抓|危险|杀/.test(text)) return "外部威胁逼近，人物必须立刻行动。";
  if (/爱|离开|分手|婚|吻/.test(text)) return "情感选择与现实代价发生冲突。";
  if (/算法|机器|星|时间|实验/.test(text)) return "技术规则失控，人必须做出伦理选择。";
  return `${genre}核心冲突升级，人物目标与阻力正面相撞。`;
}

function extractBeat(text, sceneNumber) {
  const sentences = splitSentences(text);
  return sentences.find((sentence) => sentence.length >= 10) || sentences[0] || `第 ${sceneNumber} 镜推进关键动作。`;
}

function makeNarration(text, genre) {
  const sentence = compactSentence(extractBeat(text, 1), 70);
  if (genre === "悬疑") return `有些真相不是被发现的，是被一步步逼出来的。${sentence}`;
  if (genre === "爱情") return `越想靠近，越要先承认害怕失去。${sentence}`;
  if (genre === "武侠") return `江湖从不问理由，只看这一刻敢不敢出手。${sentence}`;
  return `命运把选择推到眼前，人物必须立刻回应。${sentence}`;
}

function extractDialogue(text, characters) {
  const quotes = [];
  const pattern = /[“"『「]([^”"』」]{2,80})[”"』」]/g;
  let match = pattern.exec(text);
  while (match && quotes.length < 4) {
    quotes.push(match[1].trim());
    match = pattern.exec(text);
  }
  return quotes.map((quote, index) => ({
    speaker: characters[index % Math.max(1, characters.length)] || (index % 2 ? "关键人物" : "主角"),
    text: quote
  }));
}

function pickCamera(index, tone) {
  const fast = [
    "低角度慢推，前景遮挡制造悬念",
    "横向跟拍，动作从画面边缘突然进入",
    "特写切到广角，揭示空间里的危险",
    "快速插入细节特写，随后定格人物眼神"
  ];
  const drama = [
    "竖屏中近景推轨，人物居中，保留上方情绪空间",
    "漫画分镜式近景，背景轻微视差移动",
    "俯拍建立空间关系，再切回人物特写",
    "长焦压缩空间，让人物显得孤立"
  ];
  const list = /爽感|短剧|预告/.test(tone) ? fast : drama;
  return list[index % list.length];
}

function summarizeText(text, maxLength) {
  const sentences = splitSentences(text);
  const picks = [sentences[0], sentences[Math.floor(sentences.length / 2)], sentences[sentences.length - 1]].filter(Boolean);
  return compactSentence([...new Set(picks)].join(" "), maxLength);
}

function makeHook(text, genre) {
  const first = compactSentence(splitSentences(text)[0] || text, 70);
  return `${genre}开场钩子：${first}`;
}

function makeEndingHook(text, genre) {
  const sentences = splitSentences(text);
  const last = compactSentence(sentences[sentences.length - 1] || text, 70);
  return `${genre}结尾悬念：${last}`;
}

function themeByGenre(genre) {
  const map = {
    悬疑: "真相从来不是答案本身，而是谁愿意为它承担代价。",
    科幻: "技术放大人性选择，未来的核心仍是人的责任。",
    奇幻: "命运不是预言，而是人物在恐惧中做出的选择。",
    都市: "熟悉生活里的裂缝，会暴露最真实的欲望。",
    爱情: "亲密关系里的勇气，是承认失去也继续选择。",
    武侠: "江湖规则之外，真正的侠义来自主动承担。",
    历史: "个人命运被时代裹挟，但选择仍能留下回声。",
    现实主义: "细小的现实压力会塑造人，也会逼人醒来。"
  };
  return map[genre] || "人物在压力中完成选择，故事因此获得影像力量。";
}

function compactSentence(text, maxLength) {
  const cleaned = String(text || "").replace(/\s+/g, " ").replace(/[“”"']/g, "").trim();
  if (cleaned.length <= maxLength) return cleaned;
  return `${cleaned.slice(0, maxLength - 1)}…`;
}

function clipText(text, maxLength) {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength)}\n\n[预览已截断，复制按钮会复制完整主控提示词。]`;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function pad(value) {
  return String(value).padStart(2, "0");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function formatLocalTime(value) {
  if (!value) return "未知时间";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString("zh-CN", { hour12: false });
}

function structuredCloneSafe(value) {
  if (typeof structuredClone === "function") return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

async function apiGet(url) {
  const response = await fetch(url);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `请求失败：${response.status}`);
  return data;
}

async function apiPost(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || data.error || `请求失败：${response.status}`);
  return data;
}

async function copyText(text, successMessage) {
  if (!text) return notify("还没有可复制的内容");
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
    } else {
      fallbackCopy(text);
    }
    notify(successMessage);
  } catch (error) {
    fallbackCopy(text);
    notify(successMessage);
  }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  notify("文件已导出");
}

function safeFileName(name) {
  return String(name || "AI漫剧生产包")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

function notify(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  window.clearTimeout(els.toast.timer);
  els.toast.timer = window.setTimeout(() => els.toast.classList.remove("show"), 2200);
}

function scheduleSave() {
  window.clearTimeout(state.saveTimer);
  state.saveTimer = window.setTimeout(saveDraft, 250);
}

function saveDraft() {
  const payload = collectConfig();
  try {
    localStorage.setItem(FORM_KEY, JSON.stringify(payload));
  } catch (error) {
    const lightPayload = { ...payload, text: payload.text.slice(0, 120000) };
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify(lightPayload));
      notify("小说太长，只暂存前 12 万字");
    } catch {
      localStorage.removeItem(FORM_KEY);
    }
  }
}

function saveRenderPrefs() {
  const prefs = {
    useChatgpt: Boolean(els.useChatgptToggle?.checked),
    renderAll: Boolean(els.renderAllToggle?.checked),
    assemble: Boolean(els.assembleToggle?.checked),
    dryRun: Boolean(els.dryRun?.checked),
    retryAttempts: clamp(Number(els.retryAttempts?.value) || 0, 0, 3)
  };
  try {
    localStorage.setItem(RENDER_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    localStorage.removeItem(RENDER_PREFS_KEY);
  }
}

function restoreRenderPrefs() {
  const defaults = {
    useChatgpt: true,
    renderAll: true,
    assemble: true,
    dryRun: false,
    retryAttempts: 1
  };
  let prefs = defaults;
  try {
    const raw = localStorage.getItem(RENDER_PREFS_KEY);
    if (raw) prefs = { ...defaults, ...JSON.parse(raw) };
  } catch {
    localStorage.removeItem(RENDER_PREFS_KEY);
  }

  if (els.useChatgptToggle) els.useChatgptToggle.checked = Boolean(prefs.useChatgpt);
  if (els.renderAllToggle) els.renderAllToggle.checked = Boolean(prefs.renderAll);
  if (els.assembleToggle) els.assembleToggle.checked = Boolean(prefs.assemble);
  if (els.dryRun) els.dryRun.checked = Boolean(prefs.dryRun);
  if (els.retryAttempts) els.retryAttempts.value = String(clamp(Number(prefs.retryAttempts) || 0, 0, 3));
}

function restoreDraft() {
  try {
    const raw = localStorage.getItem(FORM_KEY);
    if (raw) {
      const draft = JSON.parse(raw);
      els.title.value = draft.title || "";
      els.novel.value = draft.text || "";
      els.episodeCount.value = draft.targetEpisodeCount ?? 0;
      els.charsPerEpisode.value = draft.charsPerEpisode || 3000;
      els.minutesPerEpisode.value = draft.minutesPerEpisode || 3;
      els.shotsPerEpisode.value = draft.shotsPerEpisode || 8;
      els.genre.value = draft.genre || "悬疑";
      els.style.value = draft.styleKey || "manju";
      els.aspect.value = draft.aspect || "9:16";
      els.tone.value = draft.tone || "AI漫剧爽感";
      els.notes.value = draft.notes || "";
    }
  } catch (error) {
    localStorage.removeItem(FORM_KEY);
  } finally {
    restoreRenderPrefs();
  }
}

init();
