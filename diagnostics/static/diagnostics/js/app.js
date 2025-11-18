// App JS: maneja vistas, uploads, llamadas al backend y localStorage
(() => {
  // helpers
  const qs = s => document.querySelector(s);
  const qsa = s => document.querySelectorAll(s);

  // views
  const views = qsa('.view');
  const menuBtns = qsa('.menu-btn');

  function showView(id) {
    views.forEach(v => v.id === id ? v.classList.remove('hidden') : v.classList.add('hidden'));
    menuBtns.forEach(b => b.dataset.view === id ? b.classList.add('active') : b.classList.remove('active'));
    if (id === 'results') { checkEnableResults(); drawAggregatedCharts(); }
    if (id === 'history') updateHistoryTable();
  }

  // menu buttons
  menuBtns.forEach(b => b.addEventListener('click', () => showView(b.dataset.view)));
  showView('home'); // default

  // Drop/upload
  const dropZone = qs('#dropZone');
  const fileInput = qs('#imageInput');
  const preview = qs('#preview');
  const btnPredict = qs('#btnPredict');
  const resultBox = qs('#resultBox');
  const predClass = qs('#predClass');
  const predConfidence = qs('#predConfidence');

  let currentFile = null;
  let lastPrediction = null;

  // drag & drop UI
  ['dragenter', 'dragover'].forEach(ev => {
    dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('drag'); });
  });
  ['dragleave', 'drop'].forEach(ev => {
    dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.remove('drag'); });
  });

  dropZone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', e => handleFiles(e.target.files));

  dropZone.addEventListener('drop', e => {
    if (e.dataTransfer.files && e.dataTransfer.files.length) {
      handleFiles(e.dataTransfer.files);
    }
  });

  function handleFiles(files) {
    const file = files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Suba una imagen válida.');
      return;
    }
    currentFile = file;
    const url = URL.createObjectURL(file);
    preview.src = url;
    preview.classList.remove('hidden');
    btnPredict.disabled = false;
  }

  // call predict endpoint
  btnPredict.addEventListener('click', async () => {
    if (!currentFile) return;
    btnPredict.disabled = true;
    btnPredict.textContent = 'Analizando...';

    const form = new FormData();
    form.append('image', currentFile);

    try {
      const res = await fetch('/api/predict/', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok) {
        lastPrediction = data;
        showPrediction(data);
        saveToLocal(data, currentFile);
        enableResultsButton();
      } else {
        alert('Error en el servidor: ' + (data.error || 'desconocido'));
      }
    } catch (err) {
      alert('Error de conexión: ' + err.message);
    } finally {
      btnPredict.disabled = false;
      btnPredict.textContent = 'Analizar imagen';
    }
  });

  // mostrar resultado y gráfica de probabilidades - ESTA ES LA FUNCIÓN CLAVE
  let probChart = null;
  function showPrediction(data) {
    console.log('Datos recibidos:', data); // Para debug

    resultBox.classList.remove('hidden');

    // MOSTRAR INFORMACIÓN MEJORADA - ESTO ES LO QUE SE VE EN "HACER DIAGNÓSTICO"
    predClass.textContent = data.predicted_class; // Ej: "Benigno (no peligroso)"
    predConfidence.innerHTML = `<strong>${data.confidence_level}</strong><br>Nivel de confianza: ${data.confidence_range}`;

    // Crear etiquetas comprensibles para el gráfico - ESTO CAMBIA "Clase 0,1,2"
    const friendlyLabels = [
      "Maligno (sospecha de melanoma)",
      "Benigno (no peligroso)",
      "Indeterminado (evaluación médica recomendada)"
    ];

    const probs = data.probabilities.map(p => Math.round(p * 10000) / 100);

    // destruir chart anterior si existe
    if (probChart) probChart.destroy();

    const ctx = qs('#probChart').getContext('2d');
    probChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: friendlyLabels, // ESTO CAMBIA LAS ETIQUETAS DEL GRÁFICO
        datasets: [{
          label: 'Probabilidad (%)',
          data: probs,
          backgroundColor: [
            'rgba(220, 53, 69, 0.7)',    // Rojo para Maligno
            'rgba(40, 167, 69, 0.7)',    // Verde para Benigno  
            'rgba(255, 193, 7, 0.7)'     // Amarillo para Indeterminado
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
        indexAxis: 'y', // Hace barras horizontales para mejor lectura
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

  // localStorage handling
  const STORAGE_KEY = 'skincare_diagnostics_v3';
  function loadAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  function saveAll(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function saveToLocal(apiData, file) {
    const arr = loadAll();
    const id = (arr.length ? (arr[arr.length - 1].id + 1) : 1);
    const now = new Date().toISOString();
    const record = {
      id: id,
      date: now,
      predicted_class: apiData.predicted_class,
      simplified_class: apiData.simplified_class,
      predicted_index: apiData.predicted_index,
      confidence: apiData.confidence,
      confidence_level: apiData.confidence_level,
      confidence_range: apiData.confidence_range,
      probabilities: apiData.probabilities,
      thumb: null
    };
    // convert file to base64 (async)
    const reader = new FileReader();
    reader.onload = () => {
      record.thumb = reader.result;
      arr.push(record);
      saveAll(arr);
      updateHistoryTable();
      drawAggregatedCharts();
    };
    reader.readAsDataURL(file);
  }

  function updateHistoryTable() {
    const tbody = qs('#historyTable tbody');
    tbody.innerHTML = '';
    const arr = loadAll().slice().reverse();
    arr.forEach(r => {
      const tr = document.createElement('tr');

      // Aplicar clases CSS según el nivel de riesgo
      let riskClass = '';
      if (r.confidence_level && r.confidence_level.includes('🟢')) {
        riskClass = 'risk-low';
      } else if (r.confidence_level && r.confidence_level.includes('🟡')) {
        riskClass = 'risk-medium';
      } else if (r.confidence_level && r.confidence_level.includes('🔴')) {
        riskClass = 'risk-high';
      }

      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${new Date(r.date).toLocaleString()}</td>
        <td>${r.predicted_class}</td>
        <td class="${riskClass}">${r.confidence_level || r.confidence_range}</td>
        <td><button class="view-id" data-id="${r.id}">Ver</button></td>
      `;
      tbody.appendChild(tr);
    });
    // attach view buttons
    qsa('.view-id').forEach(b => b.addEventListener('click', (e) => {
      const id = e.target.dataset.id;
      qs('#queryId').value = id;
      qs('#btnLoadId').click();
      showView('results');
    }));
  }

  // Results view: ask for ID and show charts
  const btnLoadId = qs('#btnLoadId');
  const queryId = qs('#queryId');
  const resultForId = qs('#resultForId');
  const showId = qs('#showId');
  let probChartId = null;

  btnLoadId.addEventListener('click', () => {
    const id = Number(queryId.value);
    if (!id) { alert('Ingrese un ID válido'); return; }
    const arr = loadAll();
    const rec = arr.find(r => r.id === id);
    if (!rec) { alert('No se encontró ese ID'); return; }
    showId.textContent = id;
    resultForId.classList.remove('hidden');

    // Gráfico para ID específico con etiquetas comprensibles
    const friendlyLabels = [
      "Maligno (sospecha de melanoma)",
      "Benigno (no peligroso)",
      "Indeterminado (evaluación médica recomendada)"
    ];

    const probs = rec.probabilities.map(p => Math.round(p * 10000) / 100);
    if (probChartId) probChartId.destroy();
    const ctx = qs('#probChartId').getContext('2d');
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
          ]
        }]
      },
      options: {
        scales: { y: { beginAtZero: true, max: 100 } },
        plugins: { legend: { display: false } }
      }
    });
  });

  // aggregated charts
  let classDistChart = null;
  let confidenceLineChart = null;
  function drawAggregatedCharts() {
    const arr = loadAll();

    // class distribution con etiquetas simplificadas
    const counts = {};
    arr.forEach(r => {
      const className = r.simplified_class || r.predicted_class;
      counts[className] = (counts[className] || 0) + 1;
    });

    const labels = Object.keys(counts);
    const data = labels.map(l => counts[l]);
    const backgroundColors = labels.map(l => {
      if (l === 'Maligno') return 'rgba(220, 53, 69, 0.7)';
      if (l === 'Benigno') return 'rgba(40, 167, 69, 0.7)';
      return 'rgba(255, 193, 7, 0.7)';
    });

    const ctx1 = qs('#classDist').getContext('2d');
    if (classDistChart) classDistChart.destroy();
    classDistChart = new Chart(ctx1, {
      type: 'pie',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: backgroundColors
        }]
      }
    });

    // confidence over time - usando el nivel de riesgo
    const sorted = arr.slice().sort((a, b) => new Date(a.date) - new Date(b.date));
    const timeline = sorted.map(r => new Date(r.date).toLocaleString());

    const riskLevels = sorted.map(r => {
      const conf = r.confidence;
      if (conf >= 80) return 1; // Bajo riesgo
      if (conf >= 50) return 2; // Riesgo intermedio
      return 3; // Alto riesgo
    });

    const ctx2 = qs('#confidenceLine').getContext('2d');
    if (confidenceLineChart) confidenceLineChart.destroy();
    confidenceLineChart = new Chart(ctx2, {
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

  // Results button disabled until a diagnosis performed
  const resultsBtn = qs('#resultsBtn');
  function enableResultsButton() {
    resultsBtn.disabled = false;
    resultsBtn.classList.remove('disabled');
  }

  function checkEnableResults() {
    const arr = loadAll();
    if (!arr.length) {
      alert('No hay diagnósticos previos. Primero haga un diagnóstico.');
      showView('diagnose');
    }
  }

  // init aggregated charts if data exists
  drawAggregatedCharts();

})();