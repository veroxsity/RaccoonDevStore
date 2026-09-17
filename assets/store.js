const state = {
  projects: [],
  category: "All",
  search: "",
  sort: "updated"
};

const fallbackMark = '<img class="cover-fallback" src="assets/logo.png" alt="">';

export function formatDate(value) {
  if (!value) return "Unknown";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function safeUrl(value, base = "https://example.com/") {
  try {
    const url = new URL(value, base);
    return ["http:", "https:"].includes(url.protocol) ? url.href : "#";
  } catch {
    return "#";
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function inlineMarkdown(value) {
  const links = [];
  const withTokens = value.replace(/\[([^\]]+)]\(([^)]+)\)/g, (_, label, href) => {
    const token = `LINKTOKEN${links.length}END`;
    const url = safeUrl(href);
    links.push(`<a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`);
    return token;
  });

  let html = escapeHtml(withTokens)
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");

  links.forEach((link, index) => {
    html = html.replace(`LINKTOKEN${index}END`, link);
  });
  return html;
}

export function renderMarkdown(source = "") {
  const output = [];
  const paragraph = [];
  let list = [];

  const flushParagraph = () => {
    if (!paragraph.length) return;
    output.push(`<p>${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph.length = 0;
  };

  const flushList = () => {
    if (!list.length) return;
    output.push(`<ul>${list.map(item => `<li>${inlineMarkdown(item)}</li>`).join("")}</ul>`);
    list = [];
  };

  for (const rawLine of source.replaceAll("\r", "").split("\n")) {
    const line = rawLine.trim();
    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    const item = line.match(/^[-*]\s+(.+)$/);

    if (!line) {
      flushParagraph();
      flushList();
    } else if (heading) {
      flushParagraph();
      flushList();
      const level = heading[1].length + 1;
      output.push(`<h${level}>${inlineMarkdown(heading[2])}</h${level}>`);
    } else if (item) {
      flushParagraph();
      list.push(item[1]);
    } else {
      flushList();
      paragraph.push(line);
    }
  }

  flushParagraph();
  flushList();
  return output.join("");
}

export function matchesProject(project, search, category) {
  const term = search.trim().toLocaleLowerCase();
  const searchable = [project.name, project.summary, project.developer, project.category, ...(project.compatibility || [])]
    .filter(Boolean)
    .join(" ")
    .toLocaleLowerCase();
  return (!term || searchable.includes(term)) && (category === "All" || project.category === category);
}

function projectPath(slug, file) {
  return safeUrl(`projects/${encodeURIComponent(slug)}/${file}`, document.baseURI);
}

async function loadProject(slug) {
  const response = await fetch(projectPath(slug, "project.json"), { cache: "no-cache" });
  if (!response.ok) throw new Error(`Could not load ${slug}`);
  const project = await response.json();
  return { ...project, slug };
}

async function loadCatalogue() {
  const response = await fetch("catalog.json", { cache: "no-cache" });
  if (!response.ok) throw new Error("Could not load the catalogue");
  const slugs = await response.json();
  if (!Array.isArray(slugs)) throw new Error("catalog.json must be an array");
  return Promise.all(slugs.map(loadProject));
}

function makeCover(project, className) {
  const cover = document.createElement("div");
  cover.className = className;
  if (!project.cover) {
    cover.innerHTML = fallbackMark;
    return cover;
  }

  const image = document.createElement("img");
  image.src = projectPath(project.slug, project.cover);
  image.alt = "";
  image.loading = "lazy";
  image.addEventListener("error", () => {
    cover.innerHTML = fallbackMark;
  }, { once: true });
  cover.append(image);
  return cover;
}

function projectCard(project) {
  const article = document.createElement("article");
  article.className = "project-card";

  const button = document.createElement("button");
  button.className = "project-card__button";
  button.type = "button";
  button.setAttribute("aria-label", `Open ${project.name}`);
  button.addEventListener("click", () => openProject(project));

  const cover = makeCover(project, "project-card__cover");
  const body = document.createElement("div");
  body.className = "project-card__body";
  const meta = document.createElement("div");
  meta.className = "project-card__meta";
  const category = document.createElement("span");
  category.textContent = project.category || "App";
  const version = document.createElement("span");
  version.textContent = project.version ? `v${project.version}` : "";
  meta.append(category, version);

  const title = document.createElement("h3");
  title.textContent = project.name;
  const summary = document.createElement("p");
  summary.className = "project-card__summary";
  summary.textContent = project.summary;
  body.append(meta, title, summary);
  button.append(cover, body);
  article.append(button);
  return article;
}

function renderProjects() {
  const grid = document.querySelector("#project-grid");
  const empty = document.querySelector("#empty-state");
  const emptyTitle = document.querySelector("#empty-title");
  const emptyCopy = document.querySelector("#empty-copy");
  const count = document.querySelector("#result-count");
  const filtered = state.projects
    .filter(project => matchesProject(project, state.search, state.category))
    .sort((a, b) => state.sort === "title"
      ? a.name.localeCompare(b.name)
      : String(b.updated || "").localeCompare(String(a.updated || "")));

  grid.replaceChildren(...filtered.map(projectCard));
  grid.setAttribute("aria-busy", "false");
  count.textContent = `${filtered.length} ${filtered.length === 1 ? "build" : "builds"}`;
  empty.hidden = filtered.length > 0;

  if (!state.projects.length) {
    emptyTitle.textContent = "No apps yet";
    emptyCopy.textContent = "Builds will appear here when they are added.";
  } else if (!filtered.length) {
    emptyTitle.textContent = "Nothing matched";
    emptyCopy.textContent = "Try another search or clear the category filter.";
  }
}

function renderCategories() {
  const container = document.querySelector("#categories");
  const categories = ["All", ...new Set(state.projects.map(project => project.category).filter(Boolean).sort())];
  const buttons = categories.map(category => {
    const button = document.createElement("button");
    button.className = "category-button";
    button.type = "button";
    button.textContent = category;
    button.setAttribute("aria-pressed", String(category === state.category));
    button.addEventListener("click", () => {
      state.category = category;
      renderCategories();
      renderProjects();
    });
    return button;
  });
  container.replaceChildren(...buttons);
}

function addMeta(label, value) {
  if (!value) return;
  const wrapper = document.createElement("div");
  const term = document.createElement("dt");
  const description = document.createElement("dd");
  term.textContent = label;
  description.textContent = value;
  wrapper.append(term, description);
  document.querySelector("#dialog-meta").append(wrapper);
}

async function openProject(project) {
  const dialog = document.querySelector("#project-dialog");
  document.querySelector("#dialog-title").textContent = project.name;
  document.querySelector("#dialog-summary").textContent = project.summary;

  const cover = makeCover(project, "dialog-cover");
  document.querySelector("#dialog-cover").replaceWith(cover);
  cover.id = "dialog-cover";

  const meta = document.querySelector("#dialog-meta");
  meta.replaceChildren();
  addMeta("Version", project.version);
  addMeta("Updated", formatDate(project.updated));
  addMeta("Developer", project.developer);
  addMeta("Works on", (project.compatibility || []).join(", "));

  const about = document.querySelector("#dialog-about");
  about.textContent = "Loading about this build";
  const aboutFile = project.about || "about.md";
  fetch(projectPath(project.slug, aboutFile), { cache: "no-cache" })
    .then(response => response.ok ? response.text() : "")
    .then(markdown => {
      about.innerHTML = markdown ? renderMarkdown(markdown) : "";
    })
    .catch(() => {
      about.textContent = "More information is not available yet.";
    });

  const downloads = document.querySelector("#dialog-downloads");
  const links = (project.downloads || []).map(download => {
    const link = document.createElement("a");
    const external = /^https?:\/\//i.test(download.url || "");
    link.className = "download-button";
    link.href = external ? safeUrl(download.url) : projectPath(project.slug, download.file);
    if (external) {
      link.target = "_blank";
      link.rel = "noreferrer";
    } else {
      link.download = "";
    }

    const label = document.createElement("strong");
    label.textContent = download.label || "Download";
    const detail = document.createElement("small");
    detail.textContent = [download.architecture, download.size].filter(Boolean).join(" · ");
    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    arrow.classList.add("download-icon");
    arrow.setAttribute("viewBox", "0 0 24 24");
    arrow.setAttribute("aria-hidden", "true");
    arrow.innerHTML = '<path d="M12 4v11m-5-5 5 5 5-5M5 20h14"/>';
    link.append(label, detail, arrow);
    return link;
  });
  downloads.replaceChildren(...links);

  const source = document.querySelector("#dialog-source");
  source.hidden = !project.source;
  if (project.source) source.href = safeUrl(project.source);
  dialog.showModal();
}

async function init() {
  const search = document.querySelector("#search");
  const sort = document.querySelector("#sort");
  const dialog = document.querySelector("#project-dialog");

  search.addEventListener("input", event => {
    state.search = event.target.value;
    renderProjects();
  });
  sort.addEventListener("change", event => {
    state.sort = event.target.value;
    renderProjects();
  });
  document.querySelector("#dialog-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", event => {
    if (event.target === dialog) dialog.close();
  });

  try {
    state.projects = await loadCatalogue();
    renderCategories();
    renderProjects();
  } catch (error) {
    document.querySelector("#result-count").textContent = "Catalogue unavailable";
    document.querySelector("#project-grid").setAttribute("aria-busy", "false");
    const empty = document.querySelector("#empty-state");
    empty.hidden = false;
    document.querySelector("#empty-title").textContent = "The catalogue could not load";
    document.querySelector("#empty-copy").textContent = "Check catalog.json and try again.";
    console.error(error);
  }
}

if (typeof document !== "undefined") init();
