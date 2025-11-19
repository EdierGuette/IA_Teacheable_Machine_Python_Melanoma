// App JS: maneja autenticación, vistas, uploads, llamadas al backend
(() => {
  // helpers mejorados con verificación
  const qs = s => {
    const el = document.querySelector(s);
    if (!el) console.warn(`⚠️ Elemento no encontrado: ${s}`);
    return el;
  };
  const qsa = s => document.querySelectorAll(s);

  // Estado de la aplicación
  let currentUser = null;
  let token = localStorage.getItem('authToken');
  let currentFile = null;
  let lastPrediction = null;
  let probChart = null;
  let probChartId = null;
  let classDistChart = null;
  let confidenceLineChart = null;

  // Elementos de autenticación
  const authView = qs('#authView');
  const dashboardView = qs('#dashboardView');
  const authTabs = qsa('.auth-tab');
  const authForms = qsa('.auth-form');
  const authMessage = qs('#authMessage');

  // Inicializar aplicación
  function initApp() {
    console.log('🚀 Iniciando aplicación...');

    if (token) {
      console.log('🔑 Token encontrado, verificando...');
      verifyToken();
    } else {
      console.log('🔑 No hay token, mostrando login');
      showAuthView();
    }

    setupEventListeners();
  }

  // Verificar token
  async function verifyToken() {
    try {
      const response = await fetch('/api/auth/profile/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const userData = await response.json();
        currentUser = userData;
        console.log('✅ Token válido, usuario:', currentUser.email);
        showDashboardView();
      } else {
        console.warn('❌ Token inválido, limpiando...');
        localStorage.removeItem('authToken');
        token = null;
        currentUser = null;
        showAuthView();
      }
    } catch (error) {
      console.error('❌ Error verificando token:', error);
      localStorage.removeItem('authToken');
      token = null;
      currentUser = null;
      showAuthView();
    }
  }

  // Mostrar vista de autenticación
  function showAuthView() {
    console.log('👤 Mostrando vista de autenticación');
    if (authView) authView.classList.remove('hidden');
    if (dashboardView) dashboardView.classList.add('hidden');
  }

  // Mostrar dashboard
  function showDashboardView() {
    console.log('📊 Mostrando dashboard');
    if (authView) authView.classList.add('hidden');
    if (dashboardView) dashboardView.classList.remove('hidden');
    updateUserInfo();
    initializeDashboard();
  }

  // Actualizar información del usuario
  function updateUserInfo() {
    if (currentUser) {
      const userName = qs('#userName');
      const userRole = qs('#userRole');
      const userAvatar = qs('#userAvatar');

      if (userName) userName.textContent = `${currentUser.first_name} ${currentUser.last_name}`;
      if (userRole) {
        userRole.textContent = currentUser.role === 'doctor' ? 'Médico' : 'Paciente';
        if (currentUser.role === 'doctor') {
          userRole.classList.add('doctor');
        }
      }
      if (userAvatar) {
        userAvatar.textContent = `${currentUser.first_name[0]}${currentUser.last_name[0]}`;
      }
    }
  }

  // Inicializar dashboard
  function initializeDashboard() {
    console.log('🔄 Inicializando dashboard...');
    // Pequeño delay para asegurar que el DOM esté listo
    setTimeout(() => {
      setupDashboardEvents();
    }, 100);
  }

  // Configurar event listeners
  function setupEventListeners() {
    console.log('🎯 Configurando event listeners...');

    // Tabs de autenticación
    authTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        const tabName = tab.dataset.tab;
        console.log('📌 Cambiando tab:', tabName);

        authTabs.forEach(t => t.classList.remove('active'));
        authForms.forEach(f => f.classList.remove('active'));

        tab.classList.add('active');
        const targetForm = qs(`#${tabName}Form`);
        if (targetForm) targetForm.classList.add('active');

        if (authMessage) authMessage.textContent = '';
      });
    });

    // Formulario de login
    const loginForm = qs('#loginForm');
    if (loginForm) {
      loginForm.addEventListener('submit', handleLogin);
    }

    // Formulario de registro
    const registerForm = qs('#registerForm');
    if (registerForm) {
      registerForm.addEventListener('submit', handleRegister);
    }

    // Logout
    const logoutBtn = qs('#logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', handleLogout);
    }
  }

  // Manejar login
  async function handleLogin(e) {
    e.preventDefault();
    console.log('🔐 Procesando login...');

    const email = qs('#loginEmail')?.value;
    const password = qs('#loginPassword')?.value;

    if (!email || !password) {
      showMessage('Por favor complete todos los campos', 'error');
      return;
    }

    try {
      const response = await fetch('/api/auth/login/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();

      if (response.ok) {
        token = data.access_token;
        localStorage.setItem('authToken', token);
        currentUser = data.user;
        console.log('✅ Login exitoso:', currentUser.email);
        showDashboardView();
        showMessage('Login exitoso', 'success');
      } else {
        console.error('❌ Error en login:', data);
        showMessage(data.error || 'Error en el login', 'error');
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      showMessage('Error de conexión', 'error');
    }
  }

  // Manejar registro
  async function handleRegister(e) {
    e.preventDefault();
    console.log('📝 Procesando registro...');

    const formData = {
      first_name: qs('#regFirstName')?.value,
      last_name: qs('#regLastName')?.value,
      email: qs('#regEmail')?.value,
      identification_number: qs('#regIdentification')?.value,
      gender: qs('#regGender')?.value,
      phone: qs('#regPhone')?.value,
      date_of_birth: qs('#regBirthDate')?.value,
      password: qs('#regPassword')?.value,
      password_confirmation: qs('#regPasswordConfirm')?.value
    };

    // Validar campos requeridos
    for (const [key, value] of Object.entries(formData)) {
      if (!value) {
        showMessage(`Por favor complete el campo: ${key}`, 'error');
        return;
      }
    }

    try {
      const response = await fetch('/api/auth/register/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        token = data.access_token;
        localStorage.setItem('authToken', token);
        currentUser = data.user;
        console.log('✅ Registro exitoso:', currentUser.email);
        showDashboardView();
        showMessage('Registro exitoso', 'success');
      } else {
        console.error('❌ Error en registro:', data);
        const errors = Object.values(data).flat().join(', ');
        showMessage(errors || 'Error en el registro', 'error');
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      showMessage('Error de conexión', 'error');
    }
  }

  // Manejar logout
  function handleLogout() {
    console.log('🚪 Cerrando sesión...');
    localStorage.removeItem('authToken');
    token = null;
    currentUser = null;
    showAuthView();
    showMessage('Sesión cerrada', 'success');
  }

  // Mostrar mensajes
  function showMessage(message, type) {
    if (authMessage) {
      authMessage.textContent = message;
      authMessage.className = `auth-message ${type}`;
    }
  }

  // Configurar eventos del dashboard
  function setupDashboardEvents() {
    console.log('🎯 Configurando eventos del dashboard...');

    // Verificar elementos críticos
    const criticalElements = {
      views: qsa('.view'),
      menuBtns: qsa('.menu-btn'),
      btnPredict: qs('#btnPredict'),
      dropZone: qs('#dropZone'),
      fileInput: qs('#imageInput')
    };

    console.log('🔍 Elementos del dashboard:', criticalElements);

    // Función para mostrar vistas
    function showView(id) {
      console.log('👀 Mostrando vista:', id);

      criticalElements.views.forEach(v => {
        if (v.id === id) {
          v.classList.remove('hidden');
        } else {
          v.classList.add('hidden');
        }
      });

      criticalElements.menuBtns.forEach(b => {
        if (b.dataset.view === id) {
          b.classList.add('active');
        } else {
          b.classList.remove('active');
        }
      });

      // Acciones específicas por vista
      switch (id) {
        case 'diagnose':
          initializeDiagnoseView();
          break;
        case 'results':
          checkEnableResults();
          drawAggregatedCharts();
          break;
        case 'history':
          updateHistoryTable();
          break;
      }
    }

    // Configurar botones del menú
    criticalElements.menuBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const viewId = btn.dataset.view;
        if (viewId) {
          showView(viewId);
        }
      });
    });

    // Mostrar vista por defecto
    showView('home');

    // Configurar sistema de archivos
    setupFileUpload();
  }

  // Inicializar vista de diagnóstico
  function initializeDiagnoseView() {
    console.log('🖼️ Inicializando vista de diagnóstico...');

    const btnPredict = qs('#btnPredict');
    const preview = qs('#preview');
    const resultBox = qs('#resultBox');

    if (btnPredict) {
      btnPredict.disabled = true;
      btnPredict.textContent = 'Analizar imagen';
    }

    if (preview) {
      preview.src = '';
      preview.classList.add('hidden');
    }

    if (resultBox) {
      resultBox.classList.add('hidden');
    }

    currentFile = null;
    lastPrediction = null;

    // Destruir gráficos anteriores
    if (probChart) {
      probChart.destroy();
      probChart = null;
    }
  }

  // Configurar subida de archivos
  function setupFileUpload() {
    const dropZone = qs('#dropZone');
    const fileInput = qs('#imageInput');
    const preview = qs('#preview');
    const btnPredict = qs('#btnPredict');

    if (!dropZone || !fileInput || !btnPredict) {
      console.error('❌ Elementos de upload no encontrados');
      return;
    }

    console.log('📁 Configurando upload de archivos...');

    // Eventos drag & drop
    ['dragenter', 'dragover'].forEach(ev => {
      dropZone.addEventListener(ev, e => {
        e.preventDefault();
        dropZone.classList.add('drag');
      });
    });

    ['dragleave', 'drop'].forEach(ev => {
      dropZone.addEventListener(ev, e => {
        e.preventDefault();
        dropZone.classList.remove('drag');
      });
    });

    dropZone.addEventListener('click', () => {
      fileInput.click();
    });

    fileInput.addEventListener('change', e => {
      if (e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
    });

    dropZone.addEventListener('drop', e => {
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    });

    // Manejar archivos seleccionados
    function handleFiles(files) {
      const file = files[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        alert('❌ Por favor suba una imagen válida (JPEG, PNG, etc.)');
        return;
      }

      currentFile = file;
      const url = URL.createObjectURL(file);

      if (preview) {
        preview.src = url;
        preview.classList.remove('hidden');
      }

      if (btnPredict) {
        btnPredict.disabled = false;
      }

      console.log('✅ Imagen cargada:', file.name);
    }

    // Configurar botón de predicción
    btnPredict.addEventListener('click', handleImageAnalysis);
  }

  // Manejar análisis de imagen
  async function handleImageAnalysis() {
    if (!currentFile) {
      alert('❌ Por favor seleccione una imagen primero');
      return;
    }

    const btnPredict = qs('#btnPredict');
    if (!btnPredict) return;

    console.log('🔬 Iniciando análisis de imagen...');
    console.log('📊 Token disponible:', !!token);
    console.log('📁 Archivo:', currentFile.name);

    // Deshabilitar botón durante el análisis
    btnPredict.disabled = true;
    btnPredict.textContent = 'Analizando...';

    const formData = new FormData();
    formData.append('image', currentFile);

    try {
      const response = await fetch('/api/predict/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });

      console.log('📡 Status de respuesta:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Análisis exitoso:', data);

        lastPrediction = data;
        showPrediction(data);
        enableResultsButton();
        updateHistoryTable();

      } else {
        let errorMessage = 'Error en el servidor';
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorData.error || errorMessage;
        } catch (e) {
          errorMessage = await response.text() || errorMessage;
        }

        console.error('❌ Error del servidor:', errorMessage);
        alert('❌ Error: ' + errorMessage);
      }
    } catch (error) {
      console.error('❌ Error de conexión:', error);
      alert('❌ Error de conexión: ' + error.message);
    } finally {
      // Rehabilitar botón
      if (btnPredict) {
        btnPredict.disabled = false;
        btnPredict.textContent = 'Analizar imagen';
      }
    }
  }

  // Mostrar resultado de predicción
  function showPrediction(data) {
    console.log('📊 Mostrando predicción:', data);

    const resultBox = qs('#resultBox');
    const predClass = qs('#predClass');
    const predConfidence = qs('#predConfidence');
    const probChartCanvas = qs('#probChart');

    if (!resultBox || !predClass || !predConfidence || !probChartCanvas) {
      console.error('❌ Elementos de resultado no encontrados');
      return;
    }

    // Mostrar información básica
    predClass.textContent = data.predicted_class || 'Desconocido';
    predConfidence.innerHTML = `<strong>${data.confidence_level || 'N/A'}</strong><br>Nivel de confianza: ${data.confidence_range || 'N/A'}`;

    // Mostrar contenedor de resultados
    resultBox.classList.remove('hidden');

    // Destruir gráfico anterior si existe
    if (probChart) {
      probChart.destroy();
    }

    // Crear gráfico de probabilidades
    const friendlyLabels = [
      "Maligno (sospecha de melanoma)",
      "Benigno (no peligroso)",
      "Indeterminado (evaluación médica recomendada)"
    ];

    const probs = data.probabilities ?
      data.probabilities.map(p => Math.round(p * 10000) / 100) :
      [0, 0, 0];

    const ctx = probChartCanvas.getContext('2d');
    probChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: friendlyLabels,
        datasets: [{
          label: 'Probabilidad (%)',
          data: probs,
          backgroundColor: [
            'rgba(220, 53, 69, 0.7)',
            'rgba(40, 167, 69, 0.7)',
            'rgba(255, 193, 7, 0.7)'
          ],
          borderColor: [
            'rgb(220, 53, 69)',
            'rgb(40, 167, 69)',
            'rgb(255, 193, 7)'
          ],
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        indexAxis: 'y',
        scales: {
          x: {
            beginAtZero: true,
            max: 100,
            title: {
              display: true,
              text: 'Probabilidad (%)'
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return `${context.dataset.label}: ${context.parsed.x}%`;
              }
            }
          }
        }
      }
    });
  }

  // Habilitar botón de resultados
  function enableResultsButton() {
    const resultsBtn = qs('#resultsBtn');
    if (resultsBtn) {
      resultsBtn.disabled = false;
      resultsBtn.classList.remove('disabled');
    }
  }

  // Verificar si hay resultados para mostrar
  function checkEnableResults() {
    loadDiagnostics().then(diagnostics => {
      if (diagnostics.length === 0) {
        alert('ℹ️ No hay diagnósticos previos. Primero haga un diagnóstico.');
        showView('diagnose');
      }
    });
  }

  // Actualizar tabla de historial
  async function updateHistoryTable() {
    const tbody = qs('#historyTable tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    try {
      const response = await fetch('/api/diagnostics/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const diagnostics = await response.json();
        console.log('📋 Diagnósticos cargados:', diagnostics.length);

        diagnostics.forEach(r => {
          const tr = document.createElement('tr');

          let riskClass = '';
          let riskDisplay = '';

          if (r.risk_level >= 80) {
            riskClass = 'risk-low';
            riskDisplay = '🟢 Bajo riesgo';
          } else if (r.risk_level >= 50) {
            riskClass = 'risk-medium';
            riskDisplay = '🟡 Riesgo intermedio';
          } else {
            riskClass = 'risk-high';
            riskDisplay = '🔴 Alto riesgo';
          }

          tr.innerHTML = `
            <td>${r.id ? r.id.slice(-8) : 'N/A'}</td>
            <td>${r.patient_name || 'N/A'}</td>
            <td>${r.identification_number || 'N/A'}</td>
            <td>${r.date || 'N/A'}</td>
            <td>${r.diagnosis || 'N/A'}</td>
            <td class="${riskClass}">${riskDisplay}<br>≈ ${Math.round(r.risk_level || 0)}%</td>
            <td><button class="view-id" data-id="${r.id || ''}">Ver</button></td>
          `;
          tbody.appendChild(tr);
        });

        // Configurar botones de ver
        qsa('.view-id').forEach(btn => {
          btn.addEventListener('click', async (e) => {
            const id = e.target.dataset.id;
            if (id) {
              qs('#queryId').value = id;
              await loadDiagnosticDetail(id);
              showView('results');
            }
          });
        });

      } else {
        console.error('❌ Error cargando historial');
      }
    } catch (error) {
      console.error('❌ Error:', error);
    }
  }

  // Cargar detalle de diagnóstico
  async function loadDiagnosticDetail(id) {
    try {
      const response = await fetch(`/api/diagnostics/${id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const diagnostic = await response.json();
        showDiagnosticDetail(diagnostic);
      } else {
        alert('❌ No se encontró ese diagnóstico');
      }
    } catch (error) {
      console.error('❌ Error cargando detalle:', error);
      alert('❌ Error al cargar el diagnóstico');
    }
  }

  // Mostrar detalle de diagnóstico
  function showDiagnosticDetail(diagnostic) {
    const showId = qs('#showId');
    const resultForId = qs('#resultForId');
    const probChartIdCanvas = qs('#probChartId');

    if (showId) showId.textContent = diagnostic.id ? diagnostic.id.slice(-8) : 'N/A';
    if (resultForId) resultForId.classList.remove('hidden');

    // Destruir gráfico anterior
    if (probChartId) {
      probChartId.destroy();
    }

    // Crear nuevo gráfico
    const friendlyLabels = [
      "Maligno (sospecha de melanoma)",
      "Benigno (no peligroso)",
      "Indeterminado (evaluación médica recomendada)"
    ];

    const probs = diagnostic.probabilities ?
      diagnostic.probabilities.map(p => Math.round(p * 10000) / 100) :
      [0, 0, 0];

    if (probChartIdCanvas) {
      const ctx = probChartIdCanvas.getContext('2d');
      probChartId = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: friendlyLabels,
          datasets: [{
            label: 'Probabilidad (%)',
            data: probs,
            backgroundColor: [
              'rgba(220, 53, 69, 0.7)',
              'rgba(40, 167, 69, 0.7)',
              'rgba(255, 193, 7, 0.7)'
            ],
            borderColor: [
              'rgb(220, 53, 69)',
              'rgb(40, 167, 69)',
              'rgb(255, 193, 7)'
            ],
            borderWidth: 2
          }]
        },
        options: {
          responsive: true,
          indexAxis: 'y',
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              title: {
                display: true,
                text: 'Probabilidad (%)'
              }
            }
          },
          plugins: {
            legend: {
              display: true,
              position: 'top'
            }
          }
        }
      });
    }
  }

  // Cargar diagnósticos
  async function loadDiagnostics() {
    try {
      const response = await fetch('/api/diagnostics/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return await response.json();
      }
      return [];
    } catch (error) {
      console.error('❌ Error cargando diagnósticos:', error);
      return [];
    }
  }

  // Dibujar gráficos agregados
  function drawAggregatedCharts() {
    loadDiagnostics().then(diagnostics => {
      if (diagnostics.length === 0) {
        console.log('ℹ️ No hay datos para gráficos agregados');
        return;
      }

      console.log('📈 Dibujando gráficos agregados...');

      // Distribución de clases
      const counts = {};
      diagnostics.forEach(r => {
        const className = r.diagnosis?.includes('Maligno') ? 'Maligno' :
          r.diagnosis?.includes('Benigno') ? 'Benigno' : 'Indeterminado';
        counts[className] = (counts[className] || 0) + 1;
      });

      const labels = Object.keys(counts);
      const data = labels.map(l => counts[l]);
      const backgroundColors = labels.map(l => {
        if (l === 'Maligno') return 'rgba(220, 53, 69, 0.7)';
        if (l === 'Benigno') return 'rgba(40, 167, 69, 0.7)';
        return 'rgba(255, 193, 7, 0.7)';
      });

      const classDistCanvas = qs('#classDist');
      if (classDistCanvas) {
        if (classDistChart) classDistChart.destroy();
        const ctx = classDistCanvas.getContext('2d');
        classDistChart = new Chart(ctx, {
          type: 'pie',
          data: {
            labels: labels,
            datasets: [{
              data: data,
              backgroundColor: backgroundColors
            }]
          },
          options: {
            plugins: {
              legend: {
                position: 'bottom'
              }
            }
          }
        });
      }

      // Evolución del riesgo
      const sorted = diagnostics.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
      const timeline = sorted.map(r => new Date(r.date).toLocaleDateString());

      const riskLevels = sorted.map(r => {
        const conf = r.risk_level || 0;
        if (conf >= 80) return 1; // Bajo riesgo
        if (conf >= 50) return 2; // Riesgo intermedio
        return 3; // Alto riesgo
      });

      const confidenceLineCanvas = qs('#confidenceLine');
      if (confidenceLineCanvas) {
        if (confidenceLineChart) confidenceLineChart.destroy();
        const ctx = confidenceLineCanvas.getContext('2d');
        confidenceLineChart = new Chart(ctx, {
          type: 'line',
          data: {
            labels: timeline,
            datasets: [{
              label: 'Nivel de Riesgo',
              data: riskLevels,
              fill: false,
              tension: 0.2,
              borderColor: 'rgb(75, 192, 192)',
              backgroundColor: 'rgba(75, 192, 192, 0.2)'
            }]
          },
          options: {
            scales: {
              y: {
                beginAtZero: true,
                max: 3,
                ticks: {
                  stepSize: 1,
                  callback: function (value) {
                    const levels = { 1: 'Bajo', 2: 'Intermedio', 3: 'Alto' };
                    return levels[value] || '';
                  }
                }
              }
            }
          }
        });
      }
    });
  }

  // Inicializar la aplicación cuando el DOM esté listo
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }
})();