const ADMIN_USER = "Enzo_labubu";
const ADMIN_PASS = "20121710";
const SESSION_KEY = "fofoca8a_session";

const state = {
  users: [],
  gossips: [],
  session: loadSession(),
  authMode: "login",
  adminUnlocked: false,
};

const els = {
  mouseGlow: document.getElementById("mouseGlow"),
  sessionLabel: document.getElementById("sessionLabel"),
  authButtons: document.getElementById("authButtons"),
  logoutBtn: document.getElementById("logoutBtn"),
  showLoginBtn: document.getElementById("showLoginBtn"),
  showRegisterBtn: document.getElementById("showRegisterBtn"),
  postForm: document.getElementById("postForm"),
  gossipTitle: document.getElementById("gossipTitle"),
  gossipContent: document.getElementById("gossipContent"),
  gossipImage: document.getElementById("gossipImage"),
  postHint: document.getElementById("postHint"),
  gossipList: document.getElementById("gossipList"),
  searchInput: document.getElementById("searchInput"),
  serverStatus: document.getElementById("serverStatus"),
  authDialog: document.getElementById("authDialog"),
  authForm: document.getElementById("authForm"),
  authTitle: document.getElementById("authTitle"),
  authUsername: document.getElementById("authUsername"),
  authPassword: document.getElementById("authPassword"),
  authError: document.getElementById("authError"),
  cancelAuth: document.getElementById("cancelAuth"),
  openAdmin: document.getElementById("openAdmin"),
  adminDialog: document.getElementById("adminDialog"),
  adminGate: document.getElementById("adminGate"),
  adminPanel: document.getElementById("adminPanel"),
  adminUser: document.getElementById("adminUser"),
  adminPass: document.getElementById("adminPass"),
  adminEnter: document.getElementById("adminEnter"),
  adminExit: document.getElementById("adminExit"),
  closeAdminGate: document.getElementById("closeAdminGate"),
  adminLoginError: document.getElementById("adminLoginError"),
  accountsList: document.getElementById("accountsList"),
  adminGossipList: document.getElementById("adminGossipList"),
  resetSite: document.getElementById("resetSite"),
};

bindEvents();
boot();
setInterval(refreshPublicState, 5000);

async function boot() {
  await refreshPublicState();
  render();
}

function bindEvents() {
  document.addEventListener("mousemove", ({ clientX, clientY }) => {
    els.mouseGlow.style.left = `${clientX}px`;
    els.mouseGlow.style.top = `${clientY}px`;
  });

  els.showLoginBtn.addEventListener("click", () => openAuth("login"));
  els.showRegisterBtn.addEventListener("click", () => openAuth("register"));
  els.cancelAuth.addEventListener("click", () => els.authDialog.close());

  els.authForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (state.authMode === "login") await login();
    else await register();
  });

  els.logoutBtn.addEventListener("click", () => {
    state.session = null;
    saveSession(null);
    render();
  });

  els.postForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!state.session) {
      alert("Faça login para postar fofocas.");
      return;
    }

    const title = els.gossipTitle.value.trim();
    const content = els.gossipContent.value.trim();
    if (!title) {
      alert("Título obrigatório.");
      return;
    }

    const image = await fileToDataURL(els.gossipImage.files[0]);

    const response = await api("/api/post", {
      method: "POST",
      body: JSON.stringify({ username: state.session, title, content, image }),
    });

    if (!response.ok) {
      const data = await response.json();
      alert(data.error || "Não foi possível postar.");
      if (response.status === 401 || response.status === 403) {
        state.session = null;
        saveSession(null);
      }
      render();
      return;
    }

    els.postForm.reset();
    await refreshPublicState();
    render();
  });

  els.searchInput.addEventListener("input", renderGossips);

  els.openAdmin.addEventListener("click", () => {
    state.adminUnlocked = false;
    els.adminDialog.showModal();
    updateAdminView();
  });

  els.closeAdminGate.addEventListener("click", () => els.adminDialog.close());

  els.adminEnter.addEventListener("click", async () => {
    const response = await api("/api/admin/login", {
      method: "POST",
      body: JSON.stringify({ adminUser: els.adminUser.value, adminPass: els.adminPass.value }),
    });

    if (!response.ok) {
      els.adminLoginError.textContent = "Credenciais inválidas.";
      return;
    }

    state.adminUnlocked = true;
    els.adminLoginError.textContent = "";
    await updateAdminView();
  });

  els.adminExit.addEventListener("click", () => {
    state.adminUnlocked = false;
    els.adminDialog.close();
  });

  els.resetSite.addEventListener("click", async () => {
    if (!confirm("Tem certeza? Isso apaga todas as contas e fofocas.")) return;

    await api("/api/admin/reset", {
      method: "POST",
      body: JSON.stringify({ adminUser: ADMIN_USER, adminPass: ADMIN_PASS }),
    });

    state.session = null;
    saveSession(null);
    await refreshPublicState();
    render();
    await updateAdminView();
  });
}

async function refreshPublicState() {
  const response = await api("/api/state");
  if (!response.ok) return;
  const data = await response.json();
  state.gossips = data.gossips || [];
  els.serverStatus.textContent = "Mural online e sincronizado entre dispositivos.";
  renderGossips();
}

function openAuth(mode) {
  state.authMode = mode;
  els.authTitle.textContent = mode === "login" ? "Entrar na conta" : "Criar conta";
  els.authError.textContent = "";
  els.authForm.reset();
  els.authDialog.showModal();
}

async function register() {
  const username = els.authUsername.value.trim();
  const password = els.authPassword.value;

  if (!username || !password) return;

  const response = await api("/api/register", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const data = await response.json();
    els.authError.textContent = data.error || "Erro ao criar conta.";
    return;
  }

  state.session = username;
  saveSession(username);
  els.authDialog.close();
  render();
}

async function login() {
  const username = els.authUsername.value.trim();
  const password = els.authPassword.value;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    els.authError.textContent = "Use o botão adm para acessar o painel.";
    return;
  }

  const response = await api("/api/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });

  if (!response.ok) {
    const data = await response.json();
    els.authError.textContent = data.error || "Usuário ou senha inválidos.";
    return;
  }

  state.session = username;
  saveSession(username);
  els.authDialog.close();
  render();
}

function render() {
  if (state.session) {
    els.sessionLabel.textContent = `Logado como ${state.session}`;
    els.authButtons.classList.add("hidden");
    els.logoutBtn.classList.remove("hidden");
    els.postHint.textContent = "Postagem anônima ativa. Seu nome nunca aparece no mural.";
    disableForm(false);
  } else {
    els.sessionLabel.textContent = "Você está navegando como visitante.";
    els.authButtons.classList.remove("hidden");
    els.logoutBtn.classList.add("hidden");
    els.postHint.textContent = "Faça login para publicar fofocas. Visitantes só podem ler.";
    disableForm(true);
  }

  renderGossips();
}

function disableForm(disabled) {
  const fields = els.postForm.querySelectorAll("input, textarea, button");
  fields.forEach((field) => {
    field.disabled = disabled;
  });
}

function renderGossips() {
  const term = els.searchInput.value.trim().toLowerCase();
  const filtered = state.gossips.filter((g) => g.title.toLowerCase().includes(term));

  els.gossipList.innerHTML = filtered.length
    ? filtered
        .map(
          (gossip) => `
          <article class="gossip-card">
            <h3>${escapeHtml(gossip.title)}</h3>
            <p>${escapeHtml(gossip.content || "(Sem descrição)")}</p>
            ${gossip.image ? `<img src="${gossip.image}" alt="Imagem da fofoca"/>` : ""}
            <p class="meta">Postado em: ${formatDate(gossip.createdAt)}</p>
          </article>
        `,
        )
        .join("")
    : "<p class='card'>Nenhuma fofoca encontrada.</p>";
}

async function updateAdminView() {
  els.adminGate.classList.toggle("hidden", state.adminUnlocked);
  els.adminPanel.classList.toggle("hidden", !state.adminUnlocked);

  if (!state.adminUnlocked) return;

  const response = await api("/api/admin/state", {
    method: "POST",
    body: JSON.stringify({ adminUser: ADMIN_USER, adminPass: ADMIN_PASS }),
  });

  if (!response.ok) return;

  const data = await response.json();
  state.users = data.users || [];
  state.gossips = data.gossips || [];

  els.accountsList.innerHTML = state.users.length
    ? state.users
        .map(
          (u) => `
          <div class="admin-item">
            <span>${escapeHtml(u.username)} ${u.banned ? "(banido)" : ""}</span>
            <button class="btn ${u.banned ? "ghost" : "danger"}" data-action="ban" data-user="${escapeHtml(
              u.username,
            )}">${u.banned ? "Desbanir" : "Banir"}</button>
          </div>
        `,
        )
        .join("")
    : "<p>Nenhuma conta criada.</p>";

  els.adminGossipList.innerHTML = state.gossips.length
    ? state.gossips
        .map(
          (g) => `
          <div class="admin-item">
            <span><strong>${escapeHtml(g.title)}</strong> — por ${escapeHtml(g.author)}</span>
            <button class="btn danger" data-action="delete-gossip" data-id="${g.id}">Apagar</button>
          </div>
        `,
        )
        .join("")
    : "<p>Nenhuma fofoca enviada.</p>";

  bindAdminActions();
  renderGossips();
}

function bindAdminActions() {
  els.accountsList.querySelectorAll("[data-action='ban']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api("/api/admin/ban", {
        method: "POST",
        body: JSON.stringify({ adminUser: ADMIN_USER, adminPass: ADMIN_PASS, username: btn.dataset.user }),
      });
      await updateAdminView();
    });
  });

  els.adminGossipList.querySelectorAll("[data-action='delete-gossip']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      await api("/api/admin/gossip/delete", {
        method: "POST",
        body: JSON.stringify({ adminUser: ADMIN_USER, adminPass: ADMIN_PASS, id: btn.dataset.id }),
      });
      await refreshPublicState();
      await updateAdminView();
    });
  });
}

function api(url, options = {}) {
  return fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  }).catch(() => {
    els.serverStatus.textContent = "Servidor offline. Use: node server.js";
    return {
      ok: false,
      status: 0,
      json: async () => ({ error: "Servidor offline. Inicie com node server.js" }),
    };
  });
}

function loadSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

function saveSession(username) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(username));
}

function fileToDataURL(file) {
  if (!file) return Promise.resolve("");
  if (file.type.startsWith("image/")) return compressImage(file);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = () => resolve(reader.result);
      img.src = reader.result;
    };
    reader.onerror = () => resolve("");
    reader.readAsDataURL(file);
  });
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month} às ${hours}:${minutes}`;
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
