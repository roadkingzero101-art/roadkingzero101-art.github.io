"use strict";

const element = (selector) => document.querySelector(selector);
const elements = (selector) => Array.from(document.querySelectorAll(selector));

const projectForm = element("#projectForm");
const projectTitle = element("#projectTitle");
const sourceBrief = element("#sourceBrief");
const episodeCount = element("#episodeCount");
const episodeDuration = element("#episodeDuration");
const visualStyle = element("#visualStyle");
const aspectRatio = element("#aspectRatio");
const productionNotes = element("#productionNotes");
const briefCount = element("#briefCount");
const sampleButton = element("#sampleButton");
const clearButton = element("#clearButton");
const exportJson = element("#exportJson");
const exportMarkdown = element("#exportMarkdown");
const systemStatus = element("#systemStatus");
const episodeMetric = element("#episodeMetric");
const shotMetric = element("#shotMetric");
const runtimeMetric = element("#runtimeMetric");
const readinessMetric = element("#readinessMetric");
const episodesPanel = element("#episodesPanel");
const shotsPanel = element("#shotsPanel");
const reviewPanel = element("#reviewPanel");

let currentProject = null;
let buildTimer = null;

const stageNames = [
  "世界入场",
  "目标出现",
  "阻力升级",
  "关系失衡",
  "信息反转",
  "代价兑现",
  "终局对抗",
  "余波与新局"
];

const hookLines = [
  "关键身份在最后一刻被揭开",
  "新的证据推翻当前判断",
  "主角必须在两个代价之间选择",
  "看似可靠的同盟突然失联",
  "倒计时进入不可逆阶段",
  "旧线索与当下危机形成闭环"
];

const shotTemplates = [
  {
    type: "ESTABLISH",
    title: "空间建立",
    camera: "广角 · 缓慢推进",
    duration: 4,
    detail: "用环境、人物位置与光线关系快速建立本集情境。"
  },
  {
    type: "EMOTION",
    title: "情绪落点",
    camera: "近景 · 固定机位",
    duration: 3,
    detail: "捕捉关键表情与短暂停顿，让观众读到人物选择。"
  },
  {
    type: "TURN",
    title: "冲突转向",
    camera: "中近景 · 快切",
    duration: 5,
    detail: "通过动作、反应与信息差，把场面推向下一处悬念。"
  }
];

const sampleProject = {
  title: "雾港来信",
  brief: "暴雨封港前夜，失踪多年的哥哥给档案修复师林澈寄来一盘损坏的旧磁带。磁带里记录着一场从未发生过的火灾，以及她第二天将会说出的每一句话。林澈沿着声音留下的线索进入废弃灯塔，却发现港口所有人都在隐瞒同一段过去。她必须在潮水淹没地下库房前找到原始档案，并判断哥哥究竟是在求救，还是把她引向一场精心设计的替罪局。",
  count: 8,
  duration: "90",
  style: "赛博悬疑",
  ratio: "9:16",
  tone: "高能反转",
  notes: "主场景控制在港口、修复室和灯塔三处；强调雨夜反光、磁带噪点与冷暖光冲突。"
};

function escapeMarkup(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function textSegments(value) {
  return value
    .split(/[。！？!?；;\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}

function clampNumber(value, minimum, maximum) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return minimum;
  }
  return Math.min(maximum, Math.max(minimum, parsed));
}

function storyToneValue() {
  return element('input[name="storyTone"]:checked')?.value || "高能反转";
}

function choose(items, index) {
  return items[index % items.length];
}

function buildEpisodeLine(segments, index, total) {
  const source = choose(segments, index);
  const support = choose(segments, index + Math.ceil(total / 2));
  const phase = (index + 1) / total;

  if (phase <= 0.25) {
    return `围绕“${source}”建立人物目标，并用“${support}”埋下第一层风险。`;
  }

  if (phase <= 0.6) {
    return `让“${source}”成为正面阻力，同时推动“${support}”改变人物关系。`;
  }

  if (phase < 1) {
    return `通过“${source}”兑现前置线索，再以“${support}”制造更高代价。`;
  }

  return `收束“${source}”与“${support}”两条主线，完成选择并留下可延展的余波。`;
}

function readinessScore(brief, count, notes) {
  let score = 72;
  if (brief.length >= 120) score += 8;
  if (brief.length >= 220) score += 5;
  if (count >= 6 && count <= 12) score += 5;
  if (notes.trim().length >= 20) score += 5;
  return Math.min(98, score);
}

function buildProject() {
  const title = projectTitle.value.trim();
  const brief = sourceBrief.value.trim();
  const count = clampNumber(episodeCount.value, 3, 24);
  const duration = clampNumber(episodeDuration.value, 30, 600);
  const style = visualStyle.value;
  const ratio = aspectRatio.value;
  const tone = storyToneValue();
  const notes = productionNotes.value.trim();
  const segments = textSegments(brief);
  const safeSegments = segments.length ? segments : [brief];
  const score = readinessScore(brief, count, notes);

  const episodes = Array.from({ length: count }, (_, index) => {
    const number = index + 1;
    const stage = choose(stageNames, Math.floor((index / count) * stageNames.length));
    const hook = choose(hookLines, index + title.length);
    const line = buildEpisodeLine(safeSegments, index, count);
    const shots = shotTemplates.map((shot, shotIndex) => ({
      number: shotIndex + 1,
      type: shot.type,
      title: shot.title,
      camera: shot.camera,
      duration: shot.duration + ((index + shotIndex) % 3),
      detail: shotIndex === 1
        ? `围绕第 ${number} 集的“${choose(safeSegments, index)}”强化人物反应与信息差。`
        : shot.detail
    }));

    return {
      number,
      stage,
      title: `${String(number).padStart(2, "0")} · ${stage}`,
      line,
      hook,
      shots
    };
  });

  const checks = [
    {
      status: brief.length >= 100 ? "pass" : "note",
      name: "故事信息密度",
      detail: brief.length >= 100 ? "人物、目标与阻力信息足以支撑分集。" : "建议补充人物目标、阻力或关键转折。",
      label: brief.length >= 100 ? "PASS" : "REVIEW"
    },
    {
      status: count >= 6 && count <= 12 ? "pass" : "note",
      name: "分集节奏",
      detail: count >= 6 && count <= 12 ? "当前集数适合建立清晰的起承转合。" : "当前集数跨度较大，进入制作前建议复核节奏。",
      label: count >= 6 && count <= 12 ? "PASS" : "REVIEW"
    },
    {
      status: "pass",
      name: "镜头覆盖",
      detail: `已为 ${count} 集配置建立、情绪与转向三类基础镜头卡。`,
      label: "PASS"
    },
    {
      status: notes.length >= 20 ? "pass" : "note",
      name: "制作约束",
      detail: notes.length >= 20 ? "场景或交付约束已纳入项目摘要。" : "可补充场景数量、角色限制或交付重点。",
      label: notes.length >= 20 ? "PASS" : "REVIEW"
    },
    {
      status: "pass",
      name: "交付格式",
      detail: "制作蓝图可导出为 JSON 与 Markdown，便于继续协作。",
      label: "PASS"
    }
  ];

  return {
    project: {
      title,
      brief,
      episodeCount: count,
      episodeDurationSeconds: duration,
      visualStyle: style,
      aspectRatio: ratio,
      storyTone: tone,
      productionNotes: notes
    },
    overview: {
      totalRuntimeSeconds: count * duration,
      shotCardCount: count * shotTemplates.length,
      readiness: score,
      createdAt: new Date().toISOString()
    },
    episodes,
    deliveryReview: checks
  };
}

function renderEpisodes(project) {
  const cards = project.episodes.map((episode) => `
    <article class="episode-card">
      <span class="episode-index">${String(episode.number).padStart(2, "0")}</span>
      <div class="episode-copy">
        <small>${escapeMarkup(episode.stage)} · ${project.project.episodeDurationSeconds} SEC</small>
        <h3>${escapeMarkup(episode.title)}</h3>
        <p>${escapeMarkup(episode.line)}</p>
      </div>
      <div class="episode-hook">
        <small>END HOOK</small>
        <strong>${escapeMarkup(episode.hook)}</strong>
      </div>
    </article>
  `).join("");

  episodesPanel.innerHTML = `
    <div class="episode-list">
      ${cards}
    </div>
  `;
}

function renderShots(project) {
  const groups = project.episodes.map((episode) => {
    const cards = episode.shots.map((shot) => `
      <article class="shot-card">
        <span>${escapeMarkup(shot.type)} · ${String(shot.number).padStart(2, "0")}</span>
        <h4>${escapeMarkup(shot.title)}</h4>
        <p>${escapeMarkup(shot.detail)}</p>
        <div class="shot-meta">
          <span>${escapeMarkup(shot.camera)}</span>
          <span>${shot.duration} SEC</span>
        </div>
      </article>
    `).join("");

    return `
      <section class="shot-group">
        <header class="shot-group-header">
          <h3>EP ${String(episode.number).padStart(2, "0")} · ${escapeMarkup(episode.stage)}</h3>
          <p>${project.project.aspectRatio} · ${escapeMarkup(project.project.visualStyle)}</p>
        </header>
        <div class="shot-grid">${cards}</div>
      </section>
    `;
  }).join("");

  shotsPanel.innerHTML = `<div class="shot-list">${groups}</div>`;
}

function renderReview(project) {
  const rows = project.deliveryReview.map((check) => `
    <article class="review-item">
      <span class="review-dot ${check.status}" aria-hidden="true"></span>
      <div>
        <h4>${escapeMarkup(check.name)}</h4>
        <p>${escapeMarkup(check.detail)}</p>
      </div>
      <span>${escapeMarkup(check.label)}</span>
    </article>
  `).join("");

  reviewPanel.innerHTML = `
    <div class="review-summary">
      <div class="score-ring">
        <div>
          <strong>${project.overview.readiness}</strong>
          <span>READINESS</span>
        </div>
      </div>
      <div>
        <h3>${escapeMarkup(project.project.title)} · 制作检查完成</h3>
        <p>${escapeMarkup(project.project.storyTone)} / ${escapeMarkup(project.project.visualStyle)} / ${escapeMarkup(project.project.aspectRatio)}。建议在正式制作前完成标记为 REVIEW 的项目。</p>
      </div>
    </div>
    <div class="review-list">${rows}</div>
  `;
}

function updateMetrics(project) {
  episodeMetric.textContent = String(project.project.episodeCount).padStart(2, "0");
  shotMetric.textContent = String(project.overview.shotCardCount).padStart(2, "0");
  runtimeMetric.textContent = `${Math.ceil(project.overview.totalRuntimeSeconds / 60)} MIN`;
  readinessMetric.textContent = `${project.overview.readiness}%`;
}

function setStatus(mode, label) {
  systemStatus.classList.remove("is-working", "is-ready");
  if (mode) {
    systemStatus.classList.add(mode);
  }
  systemStatus.innerHTML = `<i></i> ${escapeMarkup(label)}`;
}

function activatePanel(panelId) {
  elements(".tab").forEach((tab) => {
    const active = tab.dataset.panel === panelId;
    tab.classList.toggle("is-active", active);
    tab.setAttribute("aria-selected", String(active));
  });

  elements(".tab-panel").forEach((panel) => {
    const active = panel.id === panelId;
    panel.classList.toggle("is-active", active);
    panel.hidden = !active;
  });
}

function renderProject(project) {
  renderEpisodes(project);
  renderShots(project);
  renderReview(project);
  updateMetrics(project);
  exportJson.disabled = false;
  exportMarkdown.disabled = false;
  activatePanel("episodesPanel");
}

function resetResults() {
  if (buildTimer !== null) {
    window.clearTimeout(buildTimer);
    buildTimer = null;
  }
  currentProject = null;
  episodeMetric.textContent = "—";
  shotMetric.textContent = "—";
  runtimeMetric.textContent = "—";
  readinessMetric.textContent = "—";
  exportJson.disabled = true;
  exportMarkdown.disabled = true;
  setStatus("", "WAITING");
  episodesPanel.innerHTML = `
    <div class="empty-state">
      <span class="empty-orbit" aria-hidden="true"><i></i></span>
      <p>READY FOR INPUT</p>
      <h3>填入故事梗概，开始搭建制作蓝图</h3>
      <span>Complete the brief to reveal the episode system.</span>
    </div>
  `;
  shotsPanel.replaceChildren();
  reviewPanel.replaceChildren();
  activatePanel("episodesPanel");
}

function loadSample() {
  if (buildTimer !== null) {
    window.clearTimeout(buildTimer);
    buildTimer = null;
  }
  projectTitle.value = sampleProject.title;
  sourceBrief.value = sampleProject.brief;
  episodeCount.value = sampleProject.count;
  episodeDuration.value = sampleProject.duration;
  visualStyle.value = sampleProject.style;
  aspectRatio.value = sampleProject.ratio;
  productionNotes.value = sampleProject.notes;
  const toneInput = element(`input[name="storyTone"][value="${sampleProject.tone}"]`);
  if (toneInput) toneInput.checked = true;
  briefCount.textContent = String(sourceBrief.value.length);
  setStatus("", "SAMPLE LOADED");
  projectTitle.focus();
}

function markdownDocument(project) {
  const episodeBlocks = project.episodes.map((episode) => {
    const shots = episode.shots.map((shot) =>
      `  - ${shot.number}. ${shot.title}｜${shot.camera}｜${shot.duration} 秒\n    - ${shot.detail}`
    ).join("\n");

    return [
      `## 第 ${episode.number} 集｜${episode.stage}`,
      "",
      episode.line,
      "",
      `- 结尾钩子：${episode.hook}`,
      `- 镜头清单：`,
      shots
    ].join("\n");
  }).join("\n\n");

  const checks = project.deliveryReview
    .map((check) => `- [${check.status === "pass" ? "x" : " "}] ${check.name}：${check.detail}`)
    .join("\n");

  return [
    `# ${project.project.title}｜漫剧制作蓝图`,
    "",
    `- 集数：${project.project.episodeCount}`,
    `- 单集时长：${project.project.episodeDurationSeconds} 秒`,
    `- 视觉风格：${project.project.visualStyle}`,
    `- 画幅：${project.project.aspectRatio}`,
    `- 叙事气质：${project.project.storyTone}`,
    `- 制作就绪度：${project.overview.readiness}%`,
    "",
    "## 故事梗概",
    "",
    project.project.brief,
    "",
    "## 制作备注",
    "",
    project.project.productionNotes || "无",
    "",
    episodeBlocks,
    "",
    "## 交付质检",
    "",
    checks
  ].join("\n");
}

function safeFileName(value) {
  return value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-")
    .slice(0, 48) || "frameflow-project";
}

function downloadFile(content, fileName, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

sourceBrief.addEventListener("input", () => {
  briefCount.textContent = String(sourceBrief.value.length);
});

projectForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (!projectForm.reportValidity()) return;

  if (buildTimer !== null) {
    window.clearTimeout(buildTimer);
  }
  setStatus("is-working", "BUILDING");
  buildTimer = window.setTimeout(() => {
    currentProject = buildProject();
    renderProject(currentProject);
    setStatus("is-ready", "PLAN READY");
    buildTimer = null;
  }, 260);
});

sampleButton.addEventListener("click", loadSample);

clearButton.addEventListener("click", () => {
  projectForm.reset();
  episodeCount.value = "6";
  episodeDuration.value = "90";
  briefCount.textContent = "0";
  resetResults();
});

elements(".tab").forEach((tab) => {
  tab.addEventListener("click", () => activatePanel(tab.dataset.panel));
});

exportJson.addEventListener("click", () => {
  if (!currentProject) return;
  const name = `${safeFileName(currentProject.project.title)}-production-plan.json`;
  downloadFile(JSON.stringify(currentProject, null, 2), name, "application/json;charset=utf-8");
});

exportMarkdown.addEventListener("click", () => {
  if (!currentProject) return;
  const name = `${safeFileName(currentProject.project.title)}-production-plan.md`;
  downloadFile(markdownDocument(currentProject), name, "text/markdown;charset=utf-8");
});
