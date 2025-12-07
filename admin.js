// =======================
// Configurações Supabase
// =======================
window.SUPABASE_URL = window.SUPABASE_URL || "https://tqihxrrwucbfwrfyjhav.supabase.co";
window.SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || "SUA_CHAVE_ANON_REAL_AQUI";

const supabaseAdmin = supabase.createClient(
  window.SUPABASE_URL,
  window.SUPABASE_ANON_KEY
);

// =======================
// Estado Global
// =======================
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

  document.getElementById("admin-username")?.textContent = user.name;
  setupNavigation();
  setupForms();
  showSection("dashboard");
  checkPermissions();
  setupImagePreviews();
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
// Toast genérico
// =======================
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// =======================
// DASHBOARD
// =======================
async function loadDashboard() {
  try {
    const [postsRes, usersRes, adsRes, visitsRes] = await Promise.all([
      supabaseAdmin.from("posts").select("id", { count: "exact" }),
      supabaseAdmin.from("users").select("id", { count: "exact" }),
      supabaseAdmin.from("advertisements").select("id", { count: "exact" }),
      supabaseAdmin.from("visit_counter").select("count").limit(1).single(),
    ]);

    document.getElementById("total-posts")?.textContent = postsRes.count || 0;
    document.getElementById("total-users")?.textContent = usersRes.count || 0;
    document.getElementById("total-ads")?.textContent = adsRes.count || 0;
    document.getElementById("total-visits")?.textContent =
      visitsRes.data?.count?.toLocaleString("pt-BR") || 0;
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar dashboard!");
  }
}

// =======================
// UPLOAD E PREVIEW DE IMAGENS
// =======================
function setupImagePreviews() {
  document.querySelectorAll('input[type="file"][data-preview]').forEach((input) => {
    const previewId = input.dataset.preview;
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        document.getElementById(previewId)?.setAttribute("src", reader.result);
      };
      reader.readAsDataURL(file);

      try {
        const fileName = `${Date.now()}_${file.name}`;
        const { data, error } = await supabaseAdmin.storage
          .from("uploads")
          .upload(fileName, file, { cacheControl: "3600", upsert: true });
        if (error) throw error;
        const { publicUrl, error: urlError } = supabaseAdmin.storage
          .from("uploads")
          .getPublicUrl(fileName);
        if (urlError) throw urlError;
        input.dataset.url = publicUrl;
      } catch (err) {
        console.error(err);
        showToast("Erro ao enviar imagem!");
      }
    });
  });
}

// =======================
// POSTS
// =======================
async function loadPosts() {
  try {
    const { data: posts } = await supabaseAdmin.from("posts").select("*").order("created_at", { ascending: false });
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
          <button onclick="togglePostVisibility('${post.id}', ${post.is_visible})">${post.is_visible ? "Ocultar" : "Mostrar"}</button>
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

async function savePost(e) {
  e.preventDefault();
  try {
    const form = e.target;
    const id = form.dataset.id || null;
    const title = form.title.value;
    const content = form.content.value;
    const image_url = form.image_url.dataset.url || form.image_url.value;
    const is_visible = form.is_visible.checked;

    if (!title) return showToast("Título obrigatório!");

    let res;
    if (id) {
      res = await supabaseAdmin.from("posts").update({ title, content, image_url, is_visible }).eq("id", id);
    } else {
      res = await supabaseAdmin.from("posts").insert([{ title, content, image_url, is_visible }]);
    }
    if (res.error) throw res.error;
    showToast("Post salvo com sucesso!");
    form.reset();
    loadPosts();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar post!");
  }
}

async function editPost(id) {
  try {
    const { data } = await supabaseAdmin.from("posts").select("*").eq("id", id).single();
    if (!data) return;
    const form = document.getElementById("post-form");
    form.dataset.id = data.id;
    form.title.value = data.title;
    form.content.value = data.content;
    form.image_url.dataset.url = data.image_url;
    document.getElementById("post-image-preview")?.setAttribute("src", data.image_url);
    form.is_visible.checked = data.is_visible;
    showSection("posts");
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar post!");
  }
}

async function togglePostVisibility(id, current) {
  try {
    await supabaseAdmin.from("posts").update({ is_visible: !current }).eq("id", id);
    showToast(`Post ${!current ? "visível" : "oculto"}!`);
    loadPosts();
  } catch (err) {
    console.error(err);
    showToast("Erro ao alterar visibilidade!");
  }
}

async function deletePost(id) {
  try {
    await supabaseAdmin.from("posts").delete().eq("id", id);
    showToast("Post excluído!");
    loadPosts();
  } catch (err) {
    console.error(err);
    showToast("Erro ao excluir post!");
  }
}

// =======================
// ADS
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

async function saveAd(e) {
  e.preventDefault();
  try {
    const form = e.target;
    const id = form.dataset.id || null;
    const title = form.title.value;
    const link = form.link.value;
    const is_active = form.is_active.checked;

    if (!title) return showToast("Título obrigatório!");

    if (id) {
      await supabaseAdmin.from("advertisements").update({ title, link, is_active }).eq("id", id);
    } else {
      await supabaseAdmin.from("advertisements").insert([{ title, link, is_active }]);
    }

    showToast("Anúncio salvo!");
    form.reset();
    loadAds();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar anúncio!");
  }
}

async function editAd(id) {
  try {
    const { data } = await supabaseAdmin.from("advertisements").select("*").eq("id", id).single();
    if (!data) return;
    const form = document.getElementById("ad-form");
    form.dataset.id = data.id;
    form.title.value = data.title;
    form.link.value = data.link;
    form.is_active.checked = data.is_active;
    showSection("ads");
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar anúncio!");
  }
}

async function toggleAd(id, current) {
  try {
    await supabaseAdmin.from("advertisements").update({ is_active: !current }).eq("id", id);
    showToast(`Anúncio ${!current ? "ativado" : "desativado"}!`);
    loadAds();
  } catch (err) {
    console.error(err);
    showToast("Erro ao alterar status do anúncio!");
  }
}

async function deleteAd(id) {
  try {
    await supabaseAdmin.from("advertisements").delete().eq("id", id);
    showToast("Anúncio excluído!");
    loadAds();
  } catch (err) {
    console.error(err);
    showToast("Erro ao excluir anúncio!");
  }
}

// =======================
// QUICK LINKS
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

async function saveLink(e) {
  e.preventDefault();
  try {
    const form = e.target;
    const id = form.dataset.id || null;
    const name = form.name.value;
    const url = form.url.value;
    if (!name || !url) return showToast("Preencha todos os campos!");
    if (id) {
      await supabaseAdmin.from("quick_links").update({ name, url }).eq("id", id);
    } else {
      await supabaseAdmin.from("quick_links").insert([{ name, url }]);
    }
    showToast("Link salvo!");
    form.reset();
    loadQuickLinks();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar link!");
  }
}

async function editLink(id) {
  try {
    const { data } = await supabaseAdmin.from("quick_links").select("*").eq("id", id).single();
    if (!data) return;
    const form = document.getElementById("link-form");
    form.dataset.id = data.id;
    form.name.value = data.name;
    form.url.value = data.url;
    showSection("quick-links");
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar link!");
  }
}

async function deleteLink(id) {
  try {
    await supabaseAdmin.from("quick_links").delete().eq("id", id);
    showToast("Link excluído!");
    loadQuickLinks();
  } catch (err) {
    console.error(err);
    showToast("Erro ao excluir link!");
  }
}

// =======================
// USERS
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

async function saveUser(e) {
  e.preventDefault();
  try {
    const form = e.target;
    const id = form.dataset.id || null;
    const name = form.name.value;
    const email = form.email.value;
    const role = form.role.value;
    const is_active = form.is_active.checked;

    if (!name || !email || !role) return showToast("Preencha todos os campos!");
    if (id) {
      await supabaseAdmin.from("users").update({ name, email, role, is_active }).eq("id", id);
    } else {
      await supabaseAdmin.from("users").insert([{ name, email, role, is_active }]);
    }
    showToast("Usuário salvo!");
    form.reset();
    loadUsers();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar usuário!");
  }
}

async function editUser(id) {
  try {
    const { data } = await supabaseAdmin.from("users").select("*").eq("id", id).single();
    if (!data) return;
    const form = document.getElementById("user-form");
    form.dataset.id = data.id;
    form.name.value = data.name;
    form.email.value = data.email;
    form.role.value = data.role;
    form.is_active.checked = data.is_active;
    showSection("users");
  } catch (err) {
    console.error(err);
    showToast("Erro ao carregar usuário!");
  }
}

async function toggleUser(id, current) {
  try {
    await supabaseAdmin.from("users").update({ is_active: !current }).eq("id", id);
    showToast(`Usuário ${!current ? "ativado" : "desativado"}!`);
    loadUsers();
  } catch (err) {
    console.error(err);
    showToast("Erro ao alterar status do usuário!");
  }
}

async function deleteUser(id) {
  try {
    await supabaseAdmin.from("users").delete().eq("id", id);
    showToast("Usuário excluído!");
    loadUsers();
  } catch (err) {
    console.error(err);
    showToast("Erro ao excluir usuário!");
  }
}

// =======================
// SETTINGS
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

async function saveContactSettings(e) {
  e.preventDefault();
  try {
    const email = document.getElementById("contact-email").value;
    await supabaseAdmin.from("settings").update({ contact_email: email });
    showToast("Configurações de contato salvas!");
    loadSettings();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar contato!");
  }
}

async function saveSocialSettings(e) {
  e.preventDefault();
  try {
    const facebook = document.getElementById("facebook-url").value;
    await supabaseAdmin.from("settings").update({ facebook });
    showToast("Configurações sociais salvas!");
    loadSettings();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar redes sociais!");
  }
}

async function saveColorSettings(e) {
  e.preventDefault();
  try {
    const color = document.getElementById("theme-color").value;
    await supabaseAdmin.from("settings").update({ theme_color: color });
    showToast("Cor do tema salva!");
    loadSettings();
  } catch (err) {
    console.error(err);
    showToast("Erro ao salvar cor!");
  }
}

// =======================
// VISIBILITY
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

async function toggleVisibility(id, current) {
  try {
    await supabaseAdmin.from("visibility").update({ is_visible: !current }).eq("id", id);
    showToast(`Item ${!current ? "visível" : "oculto"}!`);
    loadVisibility();
  } catch (err) {
    console.error(err);
    showToast("Erro ao alterar visibilidade!");
  }
}

// =======================
// PASSWORD RESET
// =======================
async function resetPassword(e) {
  e.preventDefault();
  try {
    const email = document.getElementById("reset-email").value;
    if (!email) return showToast("Digite um email!");
    await supabaseAdmin.auth.resetPasswordForEmail(email);
    showToast("Email de redefinição enviado!");
    e.target.reset();
  } catch (err) {
    console.error(err);
    showToast("Erro ao enviar email de redefinição!");
  }
}
