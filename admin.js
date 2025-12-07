const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
const supabaseAdmin = supabase



let currentUser = null
let currentSection = "dashboard"

// Check authentication
async function checkAdminAuth() {
  const session = localStorage.getItem("admin_session")
  if (!session) {
    window.location.href = "login.html"
    return null
  }

  const sessionData = JSON.parse(session)
  if (new Date(sessionData.expires_at) < new Date()) {
    localStorage.removeItem("admin_session")
    window.location.href = "login.html"
    return null
  }

  currentUser = sessionData
  return sessionData
}

// Initialize Admin Panel
document.addEventListener("DOMContentLoaded", async () => {
  const user = await checkAdminAuth()
  if (!user) return

  document.getElementById("admin-username").textContent = user.name
  setupNavigation()
  setupForms()
  loadDashboard()
  checkPermissions()

  // Hide password reset for non-master users
  if (!user.is_master) {
    const passwordCard = document.getElementById("password-reset-card")
    if (passwordCard) passwordCard.style.display = "none"
  }
})

// Check and hide sections based on permissions
function checkPermissions() {
  const permissions = currentUser.permissions || {}

  if (!permissions.can_manage_posts && !currentUser.is_master) {
    document.getElementById("nav-posts")?.classList.add("hidden")
  }
  if (!permissions.can_manage_ads && !currentUser.is_master) {
    document.getElementById("nav-ads")?.classList.add("hidden")
  }
  if (!permissions.can_manage_users && !currentUser.is_master) {
    document.getElementById("nav-users")?.classList.add("hidden")
  }
  if (!permissions.can_manage_settings && !currentUser.is_master) {
    document.getElementById("nav-settings")?.classList.add("hidden")
  }
  if (!permissions.can_manage_visibility && !currentUser.is_master) {
    document.getElementById("nav-visibility")?.classList.add("hidden")
  }
}

// Setup Navigation
function setupNavigation() {
  document.querySelectorAll(".nav-item[data-section]").forEach((item) => {
    item.addEventListener("click", (e) => {
      e.preventDefault()
      const section = item.dataset.section
      showSection(section)
    })
  })
}

// Setup Forms
function setupForms() {
  // Post Form
  document.getElementById("post-form")?.addEventListener("submit", savePost)

  // Ad Form
  document.getElementById("ad-form")?.addEventListener("submit", saveAd)

  // Link Form
  document.getElementById("link-form")?.addEventListener("submit", saveLink)

  // User Form
  document.getElementById("user-form")?.addEventListener("submit", saveUser)

  // Settings Forms
  document.getElementById("contact-settings-form")?.addEventListener("submit", saveContactSettings)
  document.getElementById("social-settings-form")?.addEventListener("submit", saveSocialSettings)
  document.getElementById("colors-settings-form")?.addEventListener("submit", saveColorSettings)
  document.getElementById("password-reset-form")?.addEventListener("submit", resetPassword)
}

// Show Section
function showSection(section) {
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active")
  })
  document.querySelector(`[data-section="${section}"]`)?.classList.add("active")

  document.querySelectorAll(".admin-section").forEach((sec) => {
    sec.classList.remove("active")
  })
  document.getElementById(`section-${section}`)?.classList.add("active")

  currentSection = section

  switch (section) {
    case "dashboard":
      loadDashboard()
      break
    case "posts":
      loadPosts()
      break
    case "ads":
      loadAds()
      break
    case "users":
      loadUsers()
      break
    case "settings":
      loadSettings()
      break
    case "visibility":
      loadVisibility()
      break
    case "quick-links":
      loadQuickLinks()
      break
  }
}

// Load Dashboard
async function loadDashboard() {
  try {
    const [postsRes, usersRes, adsRes, visitsRes] = await Promise.all([
      supabaseAdmin.from("posts").select("id", { count: "exact" }),
      supabaseAdmin.from("users").select("id", { count: "exact" }),
      supabaseAdmin.from("advertisements").select("id", { count: "exact" }),
      supabaseAdmin.from("visit_counter").select("count").limit(1).single(),
    ])

    document.getElementById("total-posts").textContent = postsRes.count || 0
    document.getElementById("total-users").textContent = usersRes.count || 0
    document.getElementById("total-ads").textContent = adsRes.count || 0
    document.getElementById("total-visits").textContent = visitsRes.data?.count?.toLocaleString("pt-BR") || 0
  } catch (error) {
    console.error("Error loading dashboard:", error)
  }
}

// Load Posts
async function loadPosts() {
  const { data: posts, error } = await supabaseAdmin.from("posts").select("*").order("created_at", { ascending: false })

  const container = document.getElementById("posts-table-body")
  if (!posts || posts.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="no-data">Nenhuma postagem encontrada</td></tr>'
    return
  }

  container.innerHTML = posts
    .map(
      (post) => `
    <tr>
      <td><img src="${post.image_url || "/placeholder.svg?height=50&width=50"}" alt="${post.title}" class="table-image"></td>
      <td>${post.title}</td>
      <td><span class="status-badge ${post.is_visible ? "active" : "inactive"}">${post.is_visible ? "Visível" : "Oculto"}</span></td>
      <td>${new Date(post.created_at).toLocaleDateString("pt-BR")}</td>
      <td class="actions-cell">
        <button onclick="editPost('${post.id}')" class="btn-icon" title="Editar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
        <button onclick="togglePostVisibility('${post.id}', ${post.is_visible})" class="btn-icon" title="${post.is_visible ? "Ocultar" : "Mostrar"}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">${post.is_visible ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/>' : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>'}</svg>
        </button>
        <button onclick="deletePost('${post.id}')" class="btn-icon btn-danger" title="Excluir">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `,
    )
    .join("")
}

// Post Modal Functions
function openPostModal() {
  document.getElementById("post-form").reset()
  document.getElementById("post-id").value = ""
  document.getElementById("post-modal-title").textContent = "Nova Postagem"
  document.getElementById("post-modal").classList.add("active")
}

function closePostModal() {
  document.getElementById("post-modal").classList.remove("active")
}

async function editPost(id) {
  const { data: post } = await supabaseAdmin.from("posts").select("*").eq("id", id).single()
  if (!post) return

  document.getElementById("post-id").value = post.id
  document.getElementById("post-title").value = post.title
  document.getElementById("post-content").value = post.content || ""
  document.getElementById("post-image").value = post.image_url || ""
  document.getElementById("post-link").value = post.external_link || ""
  document.getElementById("post-visible").checked = post.is_visible

  document.getElementById("post-modal-title").textContent = "Editar Postagem"
  document.getElementById("post-modal").classList.add("active")
}

async function savePost(e) {
  e.preventDefault()

  const id = document.getElementById("post-id").value
  const postData = {
    title: document.getElementById("post-title").value,
    content: document.getElementById("post-content").value,
    image_url: document.getElementById("post-image").value,
    external_link: document.getElementById("post-link").value,
    is_visible: document.getElementById("post-visible").checked,
  }

  if (id) {
    await supabaseAdmin.from("posts").update(postData).eq("id", id)
  } else {
    await supabaseAdmin.from("posts").insert(postData)
  }

  closePostModal()
  loadPosts()
  showToast("Postagem salva com sucesso!")
}

async function togglePostVisibility(id, currentState) {
  await supabaseAdmin.from("posts").update({ is_visible: !currentState }).eq("id", id)
  loadPosts()
}

async function deletePost(id) {
  if (confirm("Tem certeza que deseja excluir esta postagem?")) {
    await supabaseAdmin.from("posts").delete().eq("id", id)
    loadPosts()
    showToast("Postagem excluída!")
  }
}

// Load Ads
async function loadAds() {
  const { data: ads } = await supabaseAdmin
    .from("advertisements")
    .select("*")
    .order("display_order", { ascending: true })

  const container = document.getElementById("ads-table-body")
  if (!ads || ads.length === 0) {
    container.innerHTML = '<tr><td colspan="6" class="no-data">Nenhuma propaganda encontrada</td></tr>'
    return
  }

  const positionLabels = {
    sidebar: "Lateral",
    between_posts: "Entre Posts",
    header: "Cabeçalho",
    footer: "Rodapé",
  }

  const sizeLabels = {
    small: "Pequeno",
    medium: "Médio",
    large: "Grande",
  }

  container.innerHTML = ads
    .map(
      (ad) => `
    <tr>
      <td><img src="${ad.image_url}" alt="${ad.title || "Ad"}" class="table-image"></td>
      <td>${ad.title || "-"}</td>
      <td>${positionLabels[ad.position] || ad.position}</td>
      <td>${sizeLabels[ad.size] || ad.size}</td>
      <td><span class="status-badge ${ad.is_active ? "active" : "inactive"}">${ad.is_active ? "Ativo" : "Inativo"}</span></td>
      <td class="actions-cell">
        <button onclick="editAd('${ad.id}')" class="btn-icon" title="Editar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
        <button onclick="deleteAd('${ad.id}')" class="btn-icon btn-danger" title="Excluir">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `,
    )
    .join("")
}

// Ad Modal Functions
function openAdModal() {
  document.getElementById("ad-form").reset()
  document.getElementById("ad-id").value = ""
  document.getElementById("ad-modal-title").textContent = "Nova Propaganda"
  document.getElementById("ad-modal").classList.add("active")
}

function closeAdModal() {
  document.getElementById("ad-modal").classList.remove("active")
}

async function editAd(id) {
  const { data: ad } = await supabaseAdmin.from("advertisements").select("*").eq("id", id).single()
  if (!ad) return

  document.getElementById("ad-id").value = ad.id
  document.getElementById("ad-title").value = ad.title || ""
  document.getElementById("ad-image").value = ad.image_url || ""
  document.getElementById("ad-link").value = ad.link_url || ""
  document.getElementById("ad-position").value = ad.position
  document.getElementById("ad-size").value = ad.size
  document.getElementById("ad-order").value = ad.display_order
  document.getElementById("ad-active").checked = ad.is_active

  document.getElementById("ad-modal-title").textContent = "Editar Propaganda"
  document.getElementById("ad-modal").classList.add("active")
}

async function saveAd(e) {
  e.preventDefault()

  const id = document.getElementById("ad-id").value
  const adData = {
    title: document.getElementById("ad-title").value,
    image_url: document.getElementById("ad-image").value,
    link_url: document.getElementById("ad-link").value,
    position: document.getElementById("ad-position").value,
    size: document.getElementById("ad-size").value,
    display_order: Number.parseInt(document.getElementById("ad-order").value) || 0,
    is_active: document.getElementById("ad-active").checked,
  }

  if (id) {
    await supabaseAdmin.from("advertisements").update(adData).eq("id", id)
  } else {
    await supabaseAdmin.from("advertisements").insert(adData)
  }

  closeAdModal()
  loadAds()
  showToast("Propaganda salva com sucesso!")
}

async function deleteAd(id) {
  if (confirm("Tem certeza que deseja excluir esta propaganda?")) {
    await supabaseAdmin.from("advertisements").delete().eq("id", id)
    loadAds()
    showToast("Propaganda excluída!")
  }
}

// Load Quick Links
async function loadQuickLinks() {
  const { data: links } = await supabaseAdmin
    .from("quick_links")
    .select("*")
    .order("display_order", { ascending: true })

  const container = document.getElementById("links-table-body")
  if (!links || links.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="no-data">Nenhum link encontrado</td></tr>'
    return
  }

  container.innerHTML = links
    .map(
      (link) => `
    <tr>
      <td>${link.title}</td>
      <td><a href="${link.url}" target="_blank">${link.url.substring(0, 40)}...</a></td>
      <td>${link.display_order}</td>
      <td><span class="status-badge ${link.is_visible ? "active" : "inactive"}">${link.is_visible ? "Visível" : "Oculto"}</span></td>
      <td class="actions-cell">
        <button onclick="editLink('${link.id}')" class="btn-icon" title="Editar">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
        </button>
        <button onclick="deleteLink('${link.id}')" class="btn-icon btn-danger" title="Excluir">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </td>
    </tr>
  `,
    )
    .join("")
}

// Link Modal Functions
function openLinkModal() {
  document.getElementById("link-form").reset()
  document.getElementById("link-id").value = ""
  document.getElementById("link-modal-title").textContent = "Novo Link"
  document.getElementById("link-modal").classList.add("active")
}

function closeLinkModal() {
  document.getElementById("link-modal").classList.remove("active")
}

async function editLink(id) {
  const { data: link } = await supabaseAdmin.from("quick_links").select("*").eq("id", id).single()
  if (!link) return

  document.getElementById("link-id").value = link.id
  document.getElementById("link-title").value = link.title
  document.getElementById("link-url").value = link.url
  document.getElementById("link-icon").value = link.icon || "link"
  document.getElementById("link-order").value = link.display_order
  document.getElementById("link-visible").checked = link.is_visible

  document.getElementById("link-modal-title").textContent = "Editar Link"
  document.getElementById("link-modal").classList.add("active")
}

async function saveLink(e) {
  e.preventDefault()

  const id = document.getElementById("link-id").value
  const linkData = {
    title: document.getElementById("link-title").value,
    url: document.getElementById("link-url").value,
    icon: document.getElementById("link-icon").value,
    display_order: Number.parseInt(document.getElementById("link-order").value) || 0,
    is_visible: document.getElementById("link-visible").checked,
  }

  if (id) {
    await supabaseAdmin.from("quick_links").update(linkData).eq("id", id)
  } else {
    await supabaseAdmin.from("quick_links").insert(linkData)
  }

  closeLinkModal()
  loadQuickLinks()
  showToast("Link salvo com sucesso!")
}

async function deleteLink(id) {
  if (confirm("Tem certeza que deseja excluir este link?")) {
    await supabaseAdmin.from("quick_links").delete().eq("id", id)
    loadQuickLinks()
    showToast("Link excluído!")
  }
}

// Load Users
async function loadUsers() {
  const { data: users } = await supabaseAdmin.from("users").select("*").order("created_at", { ascending: false })

  const container = document.getElementById("users-table-body")
  if (!users || users.length === 0) {
    container.innerHTML = '<tr><td colspan="5" class="no-data">Nenhum usuário encontrado</td></tr>'
    return
  }

  container.innerHTML = users
    .map((user) => {
      const perms = user.permissions || {}
      const permsList = []
      if (user.is_master) permsList.push("Mestre")
      else {
        if (perms.can_manage_posts) permsList.push("Posts")
        if (perms.can_manage_ads) permsList.push("Ads")
        if (perms.can_manage_users) permsList.push("Usuários")
        if (perms.can_manage_settings) permsList.push("Config")
      }

      return `
    <tr>
      <td>@${user.username}</td>
      <td>${user.name}${user.is_master ? ' <span class="badge-master">MESTRE</span>' : ""}</td>
      <td>${permsList.join(", ") || "Nenhuma"}</td>
      <td><span class="status-badge ${user.is_active ? "active" : "inactive"}">${user.is_active ? "Ativo" : "Inativo"}</span></td>
      <td class="actions-cell">
        ${
          !user.is_master
            ? `
          <button onclick="editUser('${user.id}')" class="btn-icon" title="Editar">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/></svg>
          </button>
          <button onclick="toggleUserStatus('${user.id}', ${user.is_active})" class="btn-icon" title="${user.is_active ? "Desativar" : "Ativar"}">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">${user.is_active ? '<circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>' : '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>'}</svg>
          </button>
          <button onclick="deleteUser('${user.id}')" class="btn-icon btn-danger" title="Excluir">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        `
            : '<span class="text-muted">-</span>'
        }
      </td>
    </tr>
  `
    })
    .join("")
}

// User Modal Functions
function openUserModal() {
  document.getElementById("user-form").reset()
  document.getElementById("user-id").value = ""
  document.getElementById("user-modal-title").textContent = "Novo Usuário"
  document.getElementById("user-password").required = true
  document.getElementById("user-modal").classList.add("active")
}

function closeUserModal() {
  document.getElementById("user-modal").classList.remove("active")
}

async function editUser(id) {
  const { data: user } = await supabaseAdmin.from("users").select("*").eq("id", id).single()
  if (!user) return

  document.getElementById("user-id").value = user.id
  document.getElementById("user-username").value = user.username
  document.getElementById("user-name").value = user.name
  document.getElementById("user-email").value = user.email
  document.getElementById("user-password").value = ""
  document.getElementById("user-password").required = false
  document.getElementById("user-active").checked = user.is_active

  const perms = user.permissions || {}
  document.querySelector('[name="can_manage_posts"]').checked = perms.can_manage_posts || false
  document.querySelector('[name="can_manage_ads"]').checked = perms.can_manage_ads || false
  document.querySelector('[name="can_manage_users"]').checked = perms.can_manage_users || false
  document.querySelector('[name="can_manage_settings"]').checked = perms.can_manage_settings || false
  document.querySelector('[name="can_manage_visibility"]').checked = perms.can_manage_visibility || false

  document.getElementById("user-modal-title").textContent = "Editar Usuário"
  document.getElementById("user-modal").classList.add("active")
}

async function saveUser(e) {
  e.preventDefault()

  const id = document.getElementById("user-id").value
  const password = document.getElementById("user-password").value

  const userData = {
    username: document.getElementById("user-username").value,
    name: document.getElementById("user-name").value,
    email: document.getElementById("user-email").value,
    is_active: document.getElementById("user-active").checked,
    permissions: {
      can_manage_posts: document.querySelector('[name="can_manage_posts"]').checked,
      can_manage_ads: document.querySelector('[name="can_manage_ads"]').checked,
      can_manage_users: document.querySelector('[name="can_manage_users"]').checked,
      can_manage_settings: document.querySelector('[name="can_manage_settings"]').checked,
      can_manage_visibility: document.querySelector('[name="can_manage_visibility"]').checked,
    },
  }

  if (password) {
    userData.password_hash = password
  }

  if (id) {
    await supabaseAdmin.from("users").update(userData).eq("id", id)
  } else {
    if (!password) {
      alert("Senha é obrigatória para novos usuários")
      return
    }
    userData.role = "collaborator"
    await supabaseAdmin.from("users").insert(userData)
  }

  closeUserModal()
  loadUsers()
  showToast("Usuário salvo com sucesso!")
}

async function toggleUserStatus(id, currentState) {
  await supabaseAdmin.from("users").update({ is_active: !currentState }).eq("id", id)
  loadUsers()
}

async function deleteUser(id) {
  if (confirm("Tem certeza que deseja excluir este usuário?")) {
    await supabaseAdmin.from("users").delete().eq("id", id)
    loadUsers()
    showToast("Usuário excluído!")
  }
}

// Load Settings
async function loadSettings() {
  const { data: settings } = await supabaseAdmin.from("site_settings").select("*")

  if (settings) {
    settings.forEach((setting) => {
      let value = setting.value
      try {
        value = JSON.parse(value)
      } catch (e) {}

      const mapping = {
        emergency_phone: "setting-emergency-phone",
        contact_email: "setting-contact-email",
        contact_phone: "setting-contact-phone",
        address: "setting-address",
        instagram_url: "setting-instagram",
        facebook_url: "setting-facebook",
        primary_color: "setting-primary-color",
        secondary_color: "setting-secondary-color",
      }

      const inputId = mapping[setting.key]
      if (inputId) {
        const input = document.getElementById(inputId)
        if (input) input.value = value || ""
      }
    })
  }
}

async function saveContactSettings(e) {
  e.preventDefault()
  await saveSetting("emergency_phone", document.getElementById("setting-emergency-phone").value)
  await saveSetting("contact_email", document.getElementById("setting-contact-email").value)
  await saveSetting("contact_phone", document.getElementById("setting-contact-phone").value)
  await saveSetting("address", document.getElementById("setting-address").value)
  showToast("Configurações de contato salvas!")
}

async function saveSocialSettings(e) {
  e.preventDefault()
  await saveSetting("instagram_url", document.getElementById("setting-instagram").value)
  await saveSetting("facebook_url", document.getElementById("setting-facebook").value)
  showToast("Redes sociais salvas!")
}

async function saveColorSettings(e) {
  e.preventDefault()
  await saveSetting("primary_color", document.getElementById("setting-primary-color").value)
  await saveSetting("secondary_color", document.getElementById("setting-secondary-color").value)
  showToast("Cores salvas!")
}

async function saveSetting(key, value) {
  await supabaseAdmin.from("site_settings").upsert({ key, value: JSON.stringify(value) }, { onConflict: "key" })
}

async function resetPassword(e) {
  e.preventDefault()
  const newPass = document.getElementById("new-password").value
  const confirmPass = document.getElementById("confirm-password").value

  if (newPass !== confirmPass) {
    alert("As senhas não coincidem!")
    return
  }

  if (newPass.length < 6) {
    alert("A senha deve ter pelo menos 6 caracteres!")
    return
  }

  await supabaseAdmin.from("users").update({ password_hash: newPass }).eq("is_master", true)

  document.getElementById("password-reset-form").reset()
  showToast("Senha do administrador mestre atualizada!")
}

// Load Visibility
async function loadVisibility() {
  const { data: elements } = await supabaseAdmin.from("hidden_elements").select("*")

  const container = document.getElementById("visibility-grid")
  if (!elements || elements.length === 0) {
    container.innerHTML = '<p class="no-data">Nenhum elemento configurável</p>'
    return
  }

  const elementNames = {
    hero_section: "Seção Hero (Banner Principal)",
    quick_access: "Acesso Rápido",
    news_section: "Últimas Notícias",
    alerts_section: "Alertas e Avisos",
    transparency_section: "Portal da Transparência",
    contact_section: "Seção de Contato",
    emergency_banner: "Banner de Emergência (Topo)",
    visit_counter: "Contador de Visitas",
    sidebar_ads: "Propagandas Laterais",
    footer: "Rodapé",
  }

  container.innerHTML = elements
    .map(
      (el) => `
    <div class="visibility-item">
      <div class="visibility-info">
        <span class="visibility-name">${elementNames[el.element_key] || el.element_key}</span>
        <span class="visibility-status ${!el.is_hidden ? "visible" : "hidden"}">${!el.is_hidden ? "Visível" : "Oculto"}</span>
      </div>
      <label class="switch">
        <input type="checkbox" ${!el.is_hidden ? "checked" : ""} onchange="toggleVisibility('${el.element_key}', this.checked)">
        <span class="slider"></span>
      </label>
    </div>
  `,
    )
    .join("")
}

async function toggleVisibility(key, isVisible) {
  await supabaseAdmin.from("hidden_elements").update({ is_hidden: !isVisible }).eq("element_key", key)
  showToast(`Elemento ${isVisible ? "visível" : "oculto"}!`)
}

// Toast notification
function showToast(message) {
  const toast = document.getElementById("toast")
  const toastMessage = document.getElementById("toast-message")
  if (toast && toastMessage) {
    toastMessage.textContent = message
    toast.classList.add("show")
    setTimeout(() => toast.classList.remove("show"), 3000)
  }
}

// Toggle Admin Sidebar (Mobile)
function toggleAdminSidebar() {
  const sidebar = document.getElementById("admin-sidebar")
  if (sidebar) {
    sidebar.classList.toggle("active")
  }
}

// Logout
function logout() {
  localStorage.removeItem("admin_session")
  window.location.href = "login.html"
}
