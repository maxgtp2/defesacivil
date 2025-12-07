// =======================
// Admin Panel Completo
// =======================

const SUPABASE_URL = "https://tqihxrrwucbfwrfyjhav.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaWh4cnJ3dWNiZndyZnlqaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Nzc5NTgsImV4cCI6MjA4MDU1Mzk1OH0.Vzqrk2oQNfMj8KRcXlcQkk1-4WNmxMWetCNCMA6-8RM";

const supabaseAdmin = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let currentUser = null;
let currentSection = "dashboard";

// =======================
// Autenticação
// =======================
async function checkAdminAuth() {
  const session = localStorage.getItem("admin_session");
  if (!session) return (window.location.href = "login.html");

  const sessionData = JSON.parse(session);
  if (new Date(sessionData.expires_at) < new Date()) {
    localStorage.removeItem("admin_session");
    return (window.location.href = "login.html");
  }

  currentUser = sessionData;
  return sessionData;
}

// =======================
// Inicialização
// =======================
document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAdminAuth();
  if (!user) return;

  document.getElementById("admin-username").textContent = user.name;

  setupNavigation();
  setupForms();
  showSection("dashboard");
  checkPermissions();
});

// =======================
// Permissões
// =======================
function checkPermissions() {
  const permissions = currentUser.permissions || {};

  const sections = [
    { key: "can_manage_posts", navId: "nav-posts" },
    { key: "can_manage_ads", navId: "nav-ads" },
    { key: "can_manage_users", navId: "nav-users" },
    { key: "can_manage_settings", navId: "nav-settings" },
    { key: "can_manage_visibility", navId: "nav-visibility" },
    { key: "can_manage_quick_links", navId: "nav-quick-links" },
  ];

  sections.forEach(({ key, navId }) => {
    if (!permissions[key] && !currentUser.is_master) {
      document.getElementById(navId)?.classList.add("hidden");
    }
  });

  if (!currentUser.is_master) {
    document.getElementById("password-reset-card")?.classList.add("hidden");
  }
}

// =======================
// Navegação
// =======================
function setupNavigation() {
  document.querySelectorAll(".nav-item[data-section]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      showSection(item.dataset.section);
    });
  });
}

// =======================
// Forms
// =======================
function setupForms() {
  const forms = [
    { id: "post-form", handler: savePost },
    { id: "ad-form", handler: saveAd },
    { id: "link-form", handler: saveLink },
    { id: "user-form", handler: saveUser },
    { id: "contact-settings-form", handler: saveContactSettings },
    { id: "social-settings-form", handler: saveSocialSettings },
    { id: "colors-settings-form", handler: saveColorSettings },
    { id: "password-reset-form", handler: resetPassword },
  ];

  forms.forEach(({ id, handler }) => {
    document.getElementById(id)?.addEventListener("submit", handler);
  });
}

// =======================
// Mostrar seção
// =======================
function showSection(section) {
  document.querySelectorAll(".nav-item").forEach((item) => item.classList.remove("active"));
  document.querySelector(`[data-section="${section}"]`)?.classList.add("active");

  document.querySelectorAll(".admin-section").forEach((sec) => sec.classList.remove("active"));
  document.getElementById(`section-${section}`)?.classList.add("active");

  currentSection = section;

  const loaders = {
    dashboard: loadDashboard,
    posts: loadPosts,
    ads: loadAds,
    "quick-links": loadQuickLinks,
    users: loadUsers,
    settings: loadSettings,
    visibility: loadVisibility,
  };

  loaders[section]?.();
}

// =======================
// Dashboard
// =======================
async function loadDashboard() {
  try {
    const [postsRes, usersRes, adsRes, visitsRes] = await Promise.all([
      supabaseAdmin.from("posts").select("id", { count: "exact" }),
      supabaseAdmin.from("users").select("id", { count: "exact" }),
      supabaseAdmin.from("advertisements").select("id", { count: "exact" }),
      supabaseAdmin.from("visit_counter").select("count").limit(1).single(),
    ]);

    document.getElementById("total-posts").textContent = postsRes.count || 0;
    document.getElementById("total-users").textContent = usersRes.count || 0;
    document.getElementById("total-ads").textContent = adsRes.count || 0;
    document.getElementById("total-visits").textContent =
      visitsRes.data?.count?.toLocaleString("pt-BR") || 0;
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar dashboard!");
  }
}

// =======================
// Posts
// =======================
async function loadPosts() {
  try {
    const { data: posts } = await supabaseAdmin
      .from("posts")
      .select("*")
      .order("created_at", { ascending: false });

    const container = document.getElementById("posts-table-body");
    if (!posts?.length) {
      container.innerHTML = '<tr><td colspan="5">Nenhuma postagem encontrada</td></tr>';
      return;
    }

    container.innerHTML = posts
      .map(
        (post) => `
      <tr>
        <td><img src="${post.image_url || "/placeholder.svg"}" class="table-image"></td>
        <td>${post.title}</td>
        <td>${post.is_visible ? "Visível" : "Oculto"}</td>
        <td>${new Date(post.created_at).toLocaleDateString("pt-BR")}</td>
        <td>
          <button onclick="editPost('${post.id}')">Editar</button>
          <button onclick="togglePostVisibility('${post.id}', ${post.is_visible})">${
          post.is_visible ? "Ocultar" : "Mostrar"
        }</button>
          <button onclick="deletePost('${post.id}')">Excluir</button>
        </td>
      </tr>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar posts!");
  }
}

// =======================
// Ads
// =======================
async function loadAds() {
  try {
    const { data: ads } = await supabaseAdmin.from("advertisements").select("*").order("created_at", { ascending: false });
    const container = document.getElementById("ads-table-body");
    if (!ads?.length) {
      container.innerHTML = '<tr><td colspan="5">Nenhum anúncio encontrado</td></tr>';
      return;
    }
    container.innerHTML = ads
      .map(
        (ad) => `
      <tr>
        <td>${ad.title}</td>
        <td>${ad.is_active ? "Ativo" : "Inativo"}</td>
        <td>${new Date(ad.created_at).toLocaleDateString("pt-BR")}</td>
        <td>
          <button onclick="editAd('${ad.id}')">Editar</button>
          <button onclick="toggleAd('${ad.id}', ${ad.is_active})">${ad.is_active ? "Desativar" : "Ativar"}</button>
          <button onclick="deleteAd('${ad.id}')">Excluir</button>
        </td>
      </tr>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar anúncios!");
  }
}

// =======================
// Quick Links
// =======================
async function loadQuickLinks() {
  try {
    const { data: links } = await supabaseAdmin.from("quick_links").select("*").order("created_at", { ascending: false });
    const container = document.getElementById("links-table-body");
    if (!links?.length) {
      container.innerHTML = '<tr><td colspan="4">Nenhum link encontrado</td></tr>';
      return;
    }
    container.innerHTML = links
      .map(
        (link) => `
      <tr>
        <td>${link.name}</td>
        <td>${link.url}</td>
        <td>${new Date(link.created_at).toLocaleDateString("pt-BR")}</td>
        <td>
          <button onclick="editLink('${link.id}')">Editar</button>
          <button onclick="deleteLink('${link.id}')">Excluir</button>
        </td>
      </tr>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar links!");
  }
}

// =======================
// Users
// =======================
async function loadUsers() {
  try {
    const { data: users } = await supabaseAdmin.from("users").select("*").order("created_at", { ascending: false });
    const container = document.getElementById("users-table-body");
    if (!users?.length) {
      container.innerHTML = '<tr><td colspan="5">Nenhum usuário encontrado</td></tr>';
      return;
    }
    container.innerHTML = users
      .map(
        (user) => `
      <tr>
        <td>${user.name}</td>
        <td>${user.email}</td>
        <td>${user.role}</td>
        <td>${user.is_active ? "Ativo" : "Inativo"}</td>
        <td>
          <button onclick="editUser('${user.id}')">Editar</button>
          <button onclick="toggleUser('${user.id}', ${user.is_active})">${user.is_active ? "Desativar" : "Ativar"}</button>
          <button onclick="deleteUser('${user.id}')">Excluir</button>
        </td>
      </tr>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar usuários!");
  }
}

// =======================
// Settings
// =======================
async function loadSettings() {
  try {
    const { data: settings } = await supabaseAdmin.from("settings").select("*").single();
    if (!settings) return;

    document.getElementById("contact-email").value = settings.contact_email || "";
    document.getElementById("facebook-url").value = settings.facebook || "";
    document.getElementById("theme-color").value = settings.theme_color || "#000000";
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar configurações!");
  }
}

// =======================
// Visibility
// =======================
async function loadVisibility() {
  try {
    const { data: items } = await supabaseAdmin.from("visibility").select("*").order("created_at", { ascending: false });
    const container = document.getElementById("visibility-table-body");
    if (!items?.length) {
      container.innerHTML = '<tr><td colspan="4">Nenhum item encontrado</td></tr>';
      return;
    }
    container.innerHTML = items
      .map(
        (item) => `
      <tr>
        <td>${item.name}</td>
        <td>${item.is_visible ? "Visível" : "Oculto"}</td>
        <td>${new Date(item.created_at).toLocaleDateString("pt-BR")}</td>
        <td>
          <button onclick="toggleVisibility('${item.id}', ${item.is_visible})">${
          item.is_visible ? "Ocultar" : "Mostrar"
        }</button>
        </td>
      </tr>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar visibilidade!");
  }
}

// =======================
// Função genérica Toast
// =======================
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// =======================
// Aqui você implementa:
// savePost, saveAd, saveLink, saveUser, saveContactSettings, saveSocialSettings, saveColorSettings, resetPassword
// editPost, togglePostVisibility, deletePost
// editAd, toggleAd, deleteAd
// editLink, deleteLink
// editUser, toggleUser, deleteUser
// toggleVisibility
// =======================

// Essa parte depende de como você já tem os formulários e endpoints.
// Todos devem usar try/catch e supabaseAdmin para enviar/atualizar dados.

