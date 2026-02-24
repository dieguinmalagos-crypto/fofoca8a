const ADMIN_USER = "Enzo_labubu";
const ADMIN_PASS = "20121710";

const STORAGE_KEYS = {
  users: "fofoca8a_users",
  gossips: "fofoca8a_gossips",
  session: "fofoca8a_session",
};

const state = {
  users: load(STORAGE_KEYS.users, []),
  gossips: load(STORAGE_KEYS.gossips, []),
  session: load(STORAGE_KEYS.session, null),
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
render();

function bindEvents() {
  document.addEventListener("mousemove", ({ clientX, clientY }) => {
    els.mouseGlow.style.left = `${clientX}px`;
    els.mouseGlow.style.top = `${clientY}px`;
  });

  els.showLoginBtn.addEventListener("click", () => openAuth("login"));
  els.showRegisterBtn.addEventListener("click", () => openAuth("register"));
  els.cancelAuth.addEventListener("click", () => els.authDialog.close());

  els.authForm.addEventListener("submit", (event) => {
    event.preventDefault();
    state.authMode === "login" ? login() : register();
  });

  els.logoutBtn.addEventListener("click", () => {
    state.session = null;
    persist(STORAGE_KEYS.session, null);
    render();
  });

  els.postForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!state.session) {
      alert("Faça login para postar fofocas.");
      return;
    }

    const user = getCurrentUser();
    if (!user || user.banned) {
      alert("Sua conta está banida. Você não pode postar.");
      return;
    }

    const title = els.gossipTitle.value.trim();
    const content = els.gossipContent.value.trim();
    if (!title) {
      alert("Título obrigatório.");
      return;
    }

    const image = await fileToDataURL(els.gossipImage.files[0]);
    state.gossips.unshift({
      id: crypto.randomUUID(),
      title,
      content,
      image,
      author: state.session,
      createdAt: new Date().toISOString(),
    });

    persist(STORAGE_KEYS.gossips, state.gossips);
    els.postForm.reset();
    render();
  });

  els.searchInput.addEventListener("input", renderGossips);

  els.openAdmin.addEventListener("click", () => {
    state.adminUnlocked = false;
    els.adminDialog.showModal();
    updateAdminView();
  });

  els.closeAdminGate.addEventListener("click", () => els.adminDialog.close());

  els.adminEnter.addEventListener("click", () => {
    if (els.adminUser.value === ADMIN_USER && els.adminPass.value === ADMIN_PASS) {
      state.adminUnlocked = true;
      els.adminLoginError.textContent = "";
      updateAdminView();
    } else {
      els.adminLoginError.textContent = "Credenciais inválidas.";
    }
  });

  els.adminExit.addEventListener("click", () => {
    state.adminUnlocked = false;
    els.adminDialog.close();
  });

  els.resetSite.addEventListener("click", () => {
    if (!confirm("Tem certeza? Isso apaga todas as contas e fofocas.")) return;
    state.users = [];
    state.gossips = [];
    state.session = null;
    persist(STORAGE_KEYS.users, state.users);
    persist(STORAGE_KEYS.gossips, state.gossips);
    persist(STORAGE_KEYS.session, state.session);
    render();
    updateAdminView();
  });
}

function openAuth(mode) {
  state.authMode = mode;
  els.authTitle.textContent = mode === "login" ? "Entrar na conta" : "Criar conta";
  els.authError.textContent = "";
  els.authForm.reset();
  els.authDialog.showModal();
}

function register() {
  const username = els.authUsername.value.trim();
  const password = els.authPassword.value;

  if (!username || !password) return;
  if (username === ADMIN_USER) {
    els.authError.textContent = "Esse nome está reservado.";
    return;
  }

  const exists = state.users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    els.authError.textContent = "Nome de usuário já existe.";
    return;
  }

  state.users.push({ username, password, banned: false });
  persist(STORAGE_KEYS.users, state.users);
  state.session = username;
  persist(STORAGE_KEYS.session, state.session);
  els.authDialog.close();
  render();
}

function login() {
  const username = els.authUsername.value.trim();
  const password = els.authPassword.value;

  if (username === ADMIN_USER && password === ADMIN_PASS) {
    els.authError.textContent = "Use o botão adm para acessar o painel.";
    return;
  }

  const user = state.users.find((u) => u.username === username && u.password === password);

  if (!user) {
    els.authError.textContent = "Usuário ou senha inválidos.";
    return;
  }

  if (user.banned) {
    els.authError.textContent = "Conta banida.";
    return;
  }

  state.session = user.username;
  persist(STORAGE_KEYS.session, state.session);
  els.authDialog.close();
  render();
}

function render() {
  const user = getCurrentUser();

  if (state.session && user && !user.banned) {
    els.sessionLabel.textContent = `Logado como ${state.session}`;
    els.authButtons.classList.add("hidden");
    els.logoutBtn.classList.remove("hidden");
    els.postHint.textContent = "Postagem anônima ativa. Seu nome nunca aparece no mural.";
    disableForm(false);
  } else {
    if (state.session && (!user || user.banned)) {
      state.session = null;
      persist(STORAGE_KEYS.session, null);
    }

    els.sessionLabel.textContent = "Você está navegando como visitante.";
    els.authButtons.classList.remove("hidden");
    els.logoutBtn.classList.add("hidden");
    els.postHint.textContent = "Faça login para publicar fofocas. Visitantes só podem ler.";
    disableForm(true);
  }

  renderGossips();
  if (state.adminUnlocked) updateAdminView();
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

function updateAdminView() {
  els.adminGate.classList.toggle("hidden", state.adminUnlocked);
  els.adminPanel.classList.toggle("hidden", !state.adminUnlocked);

  if (!state.adminUnlocked) return;

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
}

function bindAdminActions() {
  els.accountsList.querySelectorAll("[data-action='ban']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const user = state.users.find((u) => u.username === btn.dataset.user);
      if (!user) return;
      user.banned = !user.banned;
      if (user.banned && state.session === user.username) {
        state.session = null;
        persist(STORAGE_KEYS.session, null);
      }
      persist(STORAGE_KEYS.users, state.users);
      render();
      updateAdminView();
    });
  });

  els.adminGossipList.querySelectorAll("[data-action='delete-gossip']").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.gossips = state.gossips.filter((g) => g.id !== btn.dataset.id);
      persist(STORAGE_KEYS.gossips, state.gossips);
      render();
      updateAdminView();
    });
  });
}

function load(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
}

function persist(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function fileToDataURL(file) {
  if (!file) return Promise.resolve("");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getCurrentUser() {
  return state.users.find((u) => u.username === state.session) || null;
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
