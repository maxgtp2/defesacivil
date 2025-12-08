// Supabase Client
const SUPABASE_URL = "https://tqihxrrwucbfwrfyjhav.supabase.co"
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxaWh4cnJ3dWNiZndyZnlqaGF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ5Nzc5NTgsImV4cCI6MjA4MDU1Mzk1OH0.Vzqrk2oQNfMj8KRcXlcQkk1-4WNmxMWetCNCMA6-8RM"

let supabaseClient = null

// Initialize
document.addEventListener("DOMContentLoaded", () => {
  // Check authentication
  checkAuth()

  // Initialize Supabase
  if (window.supabase && typeof window.supabase.createClient === "function") {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
    loadDashboardData()
    loadPosts()
    loadLinks()
    loadSettings()
  }

  // Setup form handlers
  setupFormHandlers()
})

// Authentication Check
function checkAuth() {
  const isAuth = sessionStorage.getItem("isAuthenticated")
  const authTime = Number.parseInt(sessionStorage.getItem("authTime") || "0")
  const SESSION_DURATION = 2 * 60 * 60 * 1000 // 2 hours

  if (isAuth !== "true" || Date.now() - authTime >= SESSION_DURATION) {
    sessionStorage.removeItem("isAuthenticated")
    sessionStorage.removeItem("authTime")
    window.location.href = "login.html"
    return
  }
}

// Logout
function logout() {
  sessionStorage.removeItem("isAuthenticated")
  sessionStorage.removeItem("authTime")
  window.location.href = "login.html"
}

// Section Navigation
function showSection(sectionId) {
  // Hide all sections
  document.querySelectorAll(".admin-section").forEach((section) => {
    section.classList.remove("active")
  })

  // Show selected section
  const selectedSection = document.getElementById(sectionId)
  if (selectedSection) {
    selectedSection.classList.add("active")
  }

  // Update nav items
  document.querySelectorAll(".nav-item").forEach((item) => {
    item.classList.remove("active")
    if (item.dataset.section === sectionId) {
      item.classList.add("active")
    }
  })

  // Close mobile sidebar
  document.getElementById("admin-sidebar")?.classList.remove("active")
}

// Toggle Admin Sidebar (Mobile)
function toggleAdminSidebar() {
  document.getElementById("admin-sidebar")?.classList.toggle("active")
}

// Load Dashboard Data
async function loadDashboardData() {
  if (!supabaseClient) return

  try {
    // Get visit count
    const { data: visitData } = await supabaseClient.from("visit_counter").select("count").limit(1).single()
    if (visitData) {
      document.getElementById("stat-visits").textContent = visitData.count?.toLocaleString("pt-BR") || "0"
    }

    // Get posts count
    const { data: postsData, count: postsCount } = await supabaseClient
      .from("posts")
      .select("*", { count: "exact", head: true })
    document.getElementById("stat-posts").textContent = postsCount?.toLocaleString("pt-BR") || "0"

    // Get links count
    const { data: linksData, count: linksCount } = await supabaseClient
      .from("quick_links")
      .select("*", { count: "exact", head: true })
    document.getElementById("stat-links").textContent = linksCount?.toLocaleString("pt-BR") || "0"
  } catch (error) {
    console.warn("Error loading dashboard data:", error)
  }
}

// Load Posts
async function loadPosts() {
  if (!supabaseClient) return

  const tableBody = document.getElementById("posts-table")
  if (!tableBody) return

  try {
    const { data, error } = await supabaseClient.from("posts").select("*").order("created_at", { ascending: false })

    if (error) throw error

    if (!data || data.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 48px; color: var(--foreground-muted);">
            Nenhuma notícia encontrada. Clique em "Nova Notícia" para adicionar.
          </td>
        </tr>
      `
      return
    }

    tableBody.innerHTML = data
      .map(
        (post) => `
      <tr>
        <td>
          <img src="${escapeHtml(post.image_url || "/placeholder.svg?height=50&width=80")}" alt="${escapeHtml(post.title)}" onerror="this.src='/placeholder.svg?height=50&width=80'">
        </td>
        <td style="max-width: 250px;">
          <strong style="display: block; margin-bottom: 4px;">${escapeHtml(post.title)}</strong>
          <span style="font-size: 13px; color: var(--foreground-muted);">${escapeHtml((post.content || "").substring(0, 60))}${post.content?.length > 60 ? "..." : ""}</span>
        </td>
        <td>
          <span class="badge ${post.is_visible ? "badge-success" : "badge-warning"}">
            ${post.is_visible ? "Ativo" : "Oculto"}
          </span>
        </td>
        <td style="font-size: 14px; color: var(--foreground-muted);">
          ${new Date(post.created_at).toLocaleDateString("pt-BR")}
        </td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" onclick="editPost('${post.id}')" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M18.5 2.5C18.89 2.11 19.42 1.89 19.97 1.89C20.52 1.89 21.05 2.11 21.44 2.5C21.83 2.89 22.05 3.42 22.05 3.97C22.05 4.52 21.83 5.05 21.44 5.44L12 14.88L8 16L9.12 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="btn-icon danger" onclick="deletePost('${post.id}')" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 6V4C8 3.47 8.21 2.96 8.59 2.59C8.96 2.21 9.47 2 10 2H14C14.53 2 15.04 2.21 15.41 2.59C15.79 2.96 16 3.47 16 4V6M19 6V20C19 20.53 18.79 21.04 18.41 21.41C18.04 21.79 17.53 22 17 22H7C6.47 22 5.96 21.79 5.59 21.41C5.21 21.04 5 20.53 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("")
  } catch (error) {
    console.warn("Error loading posts:", error)
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 48px; color: var(--accent-red);">
          Erro ao carregar notícias.
        </td>
      </tr>
    `
  }
}

// Load Links
async function loadLinks() {
  if (!supabaseClient) return

  const tableBody = document.getElementById("links-table")
  if (!tableBody) return

  try {
    const { data, error } = await supabaseClient
      .from("quick_links")
      .select("*")
      .order("display_order", { ascending: true })

    if (error) throw error

    if (!data || data.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="5" style="text-align: center; padding: 48px; color: var(--foreground-muted);">
            Nenhum link encontrado. Clique em "Novo Link" para adicionar.
          </td>
        </tr>
      `
      return
    }

    tableBody.innerHTML = data
      .map(
        (link) => `
      <tr>
        <td><strong>${escapeHtml(link.title)}</strong></td>
        <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          <a href="${escapeHtml(link.url)}" target="_blank" style="color: var(--primary); text-decoration: none;">${escapeHtml(link.url)}</a>
        </td>
        <td>
          <span class="badge ${link.is_visible ? "badge-success" : "badge-warning"}">
            ${link.is_visible ? "Ativo" : "Oculto"}
          </span>
        </td>
        <td>${link.display_order || 0}</td>
        <td>
          <div class="table-actions">
            <button class="btn-icon" onclick="editLink('${link.id}')" title="Editar">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M11 4H4C3.47 4 2.96 4.21 2.59 4.59C2.21 4.96 2 5.47 2 6V20C2 20.53 2.21 21.04 2.59 21.41C2.96 21.79 3.47 22 4 22H18C18.53 22 19.04 21.79 19.41 21.41C19.79 21.04 20 20.53 20 20V13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M18.5 2.5C18.89 2.11 19.42 1.89 19.97 1.89C20.52 1.89 21.05 2.11 21.44 2.5C21.83 2.89 22.05 3.42 22.05 3.97C22.05 4.52 21.83 5.05 21.44 5.44L12 14.88L8 16L9.12 12L18.5 2.5Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
            <button class="btn-icon danger" onclick="deleteLink('${link.id}')" title="Excluir">
              <svg viewBox="0 0 24 24" fill="none" width="16" height="16">
                <path d="M3 6H5H21" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M8 6V4C8 3.47 8.21 2.96 8.59 2.59C8.96 2.21 9.47 2 10 2H14C14.53 2 15.04 2.21 15.41 2.59C15.79 2.96 16 3.47 16 4V6M19 6V20C19 20.53 18.79 21.04 18.41 21.41C18.04 21.79 17.53 22 17 22H7C6.47 22 5.96 21.79 5.59 21.41C5.21 21.04 5 20.53 5 20V6H19Z" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `,
      )
      .join("")
  } catch (error) {
    console.warn("Error loading links:", error)
    tableBody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; padding: 48px; color: var(--accent-red);">
          Erro ao carregar links.
        </td>
      </tr>
    `
  }
}

// Load Settings
async function loadSettings() {
  if (!supabaseClient) return

  try {
    const { data, error } = await supabaseClient.from("site_settings").select("*")

    if (error) throw error

    if (data) {
      data.forEach((setting) => {
        let value
        try {
          value = setting.value ? JSON.parse(setting.value) : setting.value
        } catch {
          value = setting.value
        }

        const input = document.getElementById(setting.key)
        if (input) {
          input.value = value || ""
        }
      })
    }
  } catch (error) {
    console.warn("Error loading settings:", error)
  }
}

// Setup Form Handlers
function setupFormHandlers() {
  // Post form
  document.getElementById("post-form")?.addEventListener("submit", handlePostSubmit)

  // Link form
  document.getElementById("link-form")?.addEventListener("submit", handleLinkSubmit)

  // Settings form
  document.getElementById("settings-form")?.addEventListener("submit", handleSettingsSubmit)

  // Colors form
  document.getElementById("colors-form")?.addEventListener("submit", handleColorsSubmit)
}

// Handle Post Submit
async function handlePostSubmit(e) {
  e.preventDefault()
  if (!supabaseClient) return

  const id = document.getElementById("post-id").value
  const postData = {
    title: document.getElementById("post-title").value,
    content: document.getElementById("post-content").value,
    image_url: document.getElementById("post-image").value || null,
    external_link: document.getElementById("post-link").value || null,
    is_visible: document.getElementById("post-visible").checked,
  }

  try {
    let error

    if (id) {
      // Update
      const result = await supabaseClient.from("posts").update(postData).eq("id", id)
      error = result.error
    } else {
      // Insert
      const result = await supabaseClient.from("posts").insert([postData])
      error = result.error
    }

    if (error) throw error

    showToast("Notícia salva com sucesso!", "success")
    closeModal("post-modal")
    loadPosts()
    loadDashboardData()
  } catch (error) {
    console.error("Error saving post:", error)
    showToast("Erro ao salvar notícia.", "error")
  }
}

// Handle Link Submit
async function handleLinkSubmit(e) {
  e.preventDefault()
  if (!supabaseClient) return

  const id = document.getElementById("link-id").value
  const linkData = {
    title: document.getElementById("link-title").value,
    url: document.getElementById("link-url").value,
    description: document.getElementById("link-description").value || null,
    display_order: Number.parseInt(document.getElementById("link-order").value) || 0,
    is_visible: document.getElementById("link-visible").checked,
  }

  try {
    let error

    if (id) {
      const result = await supabaseClient.from("quick_links").update(linkData).eq("id", id)
      error = result.error
    } else {
      const result = await supabaseClient.from("quick_links").insert([linkData])
      error = result.error
    }

    if (error) throw error

    showToast("Link salvo com sucesso!", "success")
    closeModal("link-modal")
    loadLinks()
    loadDashboardData()
  } catch (error) {
    console.error("Error saving link:", error)
    showToast("Erro ao salvar link.", "error")
  }
}

// Handle Settings Submit
async function handleSettingsSubmit(e) {
  e.preventDefault()
  if (!supabaseClient) return

  const settings = [
    { key: "emergency_phone", value: document.getElementById("emergency_phone").value },
    { key: "contact_email", value: document.getElementById("contact_email").value },
    { key: "address", value: document.getElementById("address").value },
  ]

  try {
    for (const setting of settings) {
      if (setting.value) {
        await supabaseClient
          .from("site_settings")
          .upsert({ key: setting.key, value: JSON.stringify(setting.value) }, { onConflict: "key" })
      }
    }

    showToast("Configurações salvas com sucesso!", "success")
  } catch (error) {
    console.error("Error saving settings:", error)
    showToast("Erro ao salvar configurações.", "error")
  }
}

// Handle Colors Submit
async function handleColorsSubmit(e) {
  e.preventDefault()
  if (!supabaseClient) return

  const colors = [
    { key: "primary_color", value: document.getElementById("primary_color").value },
    { key: "secondary_color", value: document.getElementById("secondary_color").value },
  ]

  try {
    for (const color of colors) {
      await supabaseClient
        .from("site_settings")
        .upsert({ key: color.key, value: JSON.stringify(color.value) }, { onConflict: "key" })
    }

    showToast("Cores salvas com sucesso!", "success")
  } catch (error) {
    console.error("Error saving colors:", error)
    showToast("Erro ao salvar cores.", "error")
  }
}

// Edit Post
async function editPost(id) {
  if (!supabaseClient) return

  try {
    const { data, error } = await supabaseClient.from("posts").select("*").eq("id", id).single()

    if (error) throw error

    document.getElementById("post-id").value = data.id
    document.getElementById("post-title").value = data.title || ""
    document.getElementById("post-content").value = data.content || ""
    document.getElementById("post-image").value = data.image_url || ""
    document.getElementById("post-link").value = data.external_link || ""
    document.getElementById("post-visible").checked = data.is_visible

    document.querySelector("#post-modal .modal-header h2").textContent = "Editar Notícia"
    openModal("post-modal")
  } catch (error) {
    console.error("Error loading post:", error)
    showToast("Erro ao carregar notícia.", "error")
  }
}

// Delete Post
async function deletePost(id) {
  if (!confirm("Tem certeza que deseja excluir esta notícia?")) return
  if (!supabaseClient) return

  try {
    const { error } = await supabaseClient.from("posts").delete().eq("id", id)

    if (error) throw error

    showToast("Notícia excluída com sucesso!", "success")
    loadPosts()
    loadDashboardData()
  } catch (error) {
    console.error("Error deleting post:", error)
    showToast("Erro ao excluir notícia.", "error")
  }
}

// Edit Link
async function editLink(id) {
  if (!supabaseClient) return

  try {
    const { data, error } = await supabaseClient.from("quick_links").select("*").eq("id", id).single()

    if (error) throw error

    document.getElementById("link-id").value = data.id
    document.getElementById("link-title").value = data.title || ""
    document.getElementById("link-url").value = data.url || ""
    document.getElementById("link-description").value = data.description || ""
    document.getElementById("link-order").value = data.display_order || 0
    document.getElementById("link-visible").checked = data.is_visible

    document.querySelector("#link-modal .modal-header h2").textContent = "Editar Link"
    openModal("link-modal")
  } catch (error) {
    console.error("Error loading link:", error)
    showToast("Erro ao carregar link.", "error")
  }
}

// Delete Link
async function deleteLink(id) {
  if (!confirm("Tem certeza que deseja excluir este link?")) return
  if (!supabaseClient) return

  try {
    const { error } = await supabaseClient.from("quick_links").delete().eq("id", id)

    if (error) throw error

    showToast("Link excluído com sucesso!", "success")
    loadLinks()
    loadDashboardData()
  } catch (error) {
    console.error("Error deleting link:", error)
    showToast("Erro ao excluir link.", "error")
  }
}

// Modal Functions
function openModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.add("active")
    document.body.style.overflow = "hidden"
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId)
  if (modal) {
    modal.classList.remove("active")
    document.body.style.overflow = ""

    // Reset form
    const form = modal.querySelector("form")
    if (form) {
      form.reset()
      const idInput = form.querySelector('input[type="hidden"]')
      if (idInput) idInput.value = ""
    }

    // Reset modal title
    const headerText = modal.querySelector(".modal-header h2")
    if (headerText) {
      if (modalId === "post-modal") headerText.textContent = "Nova Notícia"
      if (modalId === "link-modal") headerText.textContent = "Novo Link"
    }
  }
}

// Close modal on backdrop click
document.addEventListener("click", (e) => {
  if (e.target.classList.contains("modal")) {
    closeModal(e.target.id)
  }
})

// Toast Notification
function showToast(message, type = "info") {
  const toast = document.getElementById("toast")
  if (!toast) return

  toast.textContent = message
  toast.className = `toast ${type} show`

  setTimeout(() => {
    toast.classList.remove("show")
  }, 4000)
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return ""
  const div = document.createElement("div")
  div.textContent = text
  return div.innerHTML
}

// Make functions globally available
window.showSection = showSection
window.toggleAdminSidebar = toggleAdminSidebar
window.logout = logout
window.openModal = openModal
window.closeModal = closeModal
window.editPost = editPost
window.deletePost = deletePost
window.editLink = editLink
window.deleteLink = deleteLink
