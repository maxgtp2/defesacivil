// ===== Navegação entre seções =====
const navItems = document.querySelectorAll('.nav-item');
navItems.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const section = item.dataset.section;
    showSection(section);
  });
});

function showSection(section) {
  document.querySelectorAll('.admin-section').forEach(sec => sec.classList.remove('active'));
  const activeSection = document.getElementById(`section-${section}`);
  if(activeSection) activeSection.classList.add('active');
}

// ===== Simulação de permissões do usuário =====
const user = { role: 'admin' }; // Pode ser 'admin', 'mod', 'user'

function checkPermissions() {
  // Exemplo: esconder Propagandas para não-admins
  if(user.role !== 'admin') {
    document.getElementById('nav-ads').style.display = 'none';
    document.getElementById('section-ads').style.display = 'none';
  }
}

checkPermissions();

// ===== Carregar dados do dashboard =====
async function loadDashboard() {
  try {
    // Simulação de fetch de dados (substitua pelas suas APIs reais)
    const postsRes = { count: 128 };
    const usersRes = { count: 45 };
    const adsRes = { count: 12 };
    const visitsRes = { data: { count: 10234 } };

    document.getElementById("stat-posts").textContent = postsRes.count || 0;
    document.getElementById("stat-users").textContent = usersRes.count || 0;
    document.getElementById("stat-ads").textContent = adsRes.count || 0;
    document.getElementById("stat-visits").textContent = visitsRes.data?.count?.toLocaleString("pt-BR") || 0;
  } catch(err) {
    console.error("Erro ao carregar dashboard:", err);
  }
}

// Carregar dashboard ao abrir
loadDashboard();
