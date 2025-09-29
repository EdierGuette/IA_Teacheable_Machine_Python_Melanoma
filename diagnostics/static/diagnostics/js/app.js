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
  let lastPrediction = null; // respuesta del servidor

  // drag & drop UI
  ['dragenter','dragover'].forEach(ev => {
    dropZone.addEventListener(ev, e => { e.preventDefault(); dropZone.classList.add('drag'); });
  });
  ['dragleave','drop'].forEach(ev => {
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
      const res = await fetch('/api/predict/', { method:'POST', body: form });
      const data = await res.json();
      if (res.ok) {
        lastPrediction = data;
        showPrediction(data);
        saveToLocal(data, currentFile);
        // habilitar botones de resultados
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

  // mostrar resultado y gráfica de probabilidades
  let probChart = null;
  function showPrediction(data) {
    resultBox.classList.remove('hidden');
    predClass.textContent = 'Clase: ' + data.predicted_class;
    predConfidence.textContent = 'Confianza: ' + data.confidence + ' %';

    const labels = data.probabilities.map((p, i) => 'Clase ' + i);
    const probs = data.probabilities.map(p => Math.round(p*10000)/100);

    // destruir chart si existe
    if (probChart) probChart.destroy();
    const ctx = qs('#probChart').getContext('2d');
    probChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: 'Probabilidad (%)', data: probs }]
      },
      options: { responsive:true, scales: { y: { beginAtZero:true, max:100 } } }
    });
  }

  // localStorage handling
  const STORAGE_KEY = 'skincare_diagnostics_v1';
  function loadAll() {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  }
  function saveAll(arr) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(arr));
  }

  function saveToLocal(apiData, file) {
    const arr = loadAll();
    const id = (arr.length ? (arr[arr.length-1].id + 1) : 1);
    const now = new Date().toISOString();
    const record = {
      id: id,
      date: now,
      predicted_class: apiData.predicted_class,
      predicted_index: apiData.predicted_index,
      confidence: apiData.confidence,   // ya está en %
      probabilities: apiData.probabilities,
      // optional: store preview as base64 for quick display
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
      tr.innerHTML = `
        <td>${r.id}</td>
        <td>${new Date(r.date).toLocaleString()}</td>
        <td>${r.predicted_class}</td>
        <td>${r.confidence.toFixed(2)}</td>
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

    // build bar chart with probas
    const labels = rec.probabilities.map((_, i) => 'Clase ' + i);
    const probs = rec.probabilities.map(p => Math.round(p*10000)/100);
    if (probChartId) probChartId.destroy();
    const ctx = qs('#probChartId').getContext('2d');
    probChartId = new Chart(ctx, {
      type: 'bar',
      data: { labels: labels, datasets: [{ label: 'Probabilidad (%)', data: probs }] },
      options: { scales: { y: { beginAtZero:true, max:100 } } }
    });
  });

  // aggregated charts: class distribution and confidence over time
  let classDistChart = null;
  let confidenceLineChart = null;
  function drawAggregatedCharts() {
    const arr = loadAll();
    // class distribution
    const counts = {};
    arr.forEach(r => {
      counts[r.predicted_class] = (counts[r.predicted_class] || 0) + 1;
    });
    const labels = Object.keys(counts);
    const data = labels.map(l => counts[l]);

    const ctx1 = qs('#classDist').getContext('2d');
    if (classDistChart) classDistChart.destroy();
    classDistChart = new Chart(ctx1, {
      type: 'pie',
      data: { labels: labels, datasets: [{ data: data }] }
    });

    // confidence over time
    const sorted = arr.slice().sort((a,b)=> new Date(a.date)-new Date(b.date));
    const timeline = sorted.map(r => new Date(r.date).toLocaleString());
    const confs = sorted.map(r => r.confidence);

    const ctx2 = qs('#confidenceLine').getContext('2d');
    if (confidenceLineChart) confidenceLineChart.destroy();
    confidenceLineChart = new Chart(ctx2, {
      type: 'line',
      data: {
        labels: timeline,
        datasets: [{ label: 'Confianza (%)', data: confs, fill:false, tension:0.2 }]
      },
      options: { scales: { y: { beginAtZero:true, max:100 } } }
    });
  }

  // Results button disabled until a diagnosis performed
  const resultsBtn = qs('#resultsBtn');
  function enableResultsButton(){ resultsBtn.disabled = false; resultsBtn.classList.remove('disabled'); }
  function checkEnableResults(){
    const arr = loadAll();
    if (!arr.length) {
      alert('No hay diagnósticos previos. Primero haga un diagnóstico.');
      showView('diagnose');
    }
  }

  // init aggregated charts if data exists
  drawAggregatedCharts();

})();
