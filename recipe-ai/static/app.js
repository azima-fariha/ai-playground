(function () {
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const createRecipeBtn = document.getElementById('createRecipeBtn');
  const statusEl = document.getElementById('status');
  const transcriptEl = document.getElementById('transcript');
  const recipesListEl = document.getElementById('recipesList');
  const responseBox = document.getElementById('responseBox');
  const latestRecipeEl = document.getElementById('latestRecipe');

  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    statusEl.textContent = 'Speech recognition is not supported in this browser. Try Chrome or Edge.';
    startBtn.disabled = true;
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  let fullTranscript = '';

  recognition.onresult = function (event) {
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        fullTranscript += transcript + ' ';
      } else {
        interim += transcript;
      }
    }
    transcriptEl.value = fullTranscript.trim() + (interim ? ' ' + interim : '');
  };

  recognition.onstart = function () {
    statusEl.textContent = 'Listening…';
    startBtn.disabled = true;
    stopBtn.disabled = false;
    fullTranscript = '';
  };

  recognition.onend = function () {
    if (stopBtn.disabled === false) {
      statusEl.textContent = 'Stopped. Click "Create recipe" to convert, or start again.';
    }
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };

  recognition.onerror = function (event) {
    statusEl.textContent = 'Error: ' + (event.error || 'Unknown');
    startBtn.disabled = false;
    stopBtn.disabled = true;
  };

  startBtn.addEventListener('click', function () {
    fullTranscript = '';
    transcriptEl.value = '';
    responseBox.hidden = true;
    recognition.start();
  });

  stopBtn.addEventListener('click', function () {
    recognition.stop();
  });

  function renderRecipe(recipe) {
    const div = document.createElement('div');
    div.className = 'recipe-card';
    div.innerHTML = `
      <h3 class="recipe-title">${escapeHtml(recipe.title)}</h3>
      <div class="recipe-tags">${(recipe.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      <h4>Ingredients</h4>
      <ul>${(recipe.ingredients || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      <h4>Steps</h4>
      <ol>${(recipe.steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
    `;
    return div;
  }

  function escapeHtml(text) {
    const el = document.createElement('span');
    el.textContent = text;
    return el.innerHTML;
  }

  async function loadRecipes() {
    try {
      const res = await fetch('/api/recipes');
      const recipes = await res.json();
      recipesListEl.innerHTML = '';
      if (recipes.length === 0) {
        recipesListEl.innerHTML = '<p class="empty">No recipes yet. Create one with voice!</p>';
      } else {
        recipes.reverse().forEach(r => {
          recipesListEl.appendChild(renderRecipe(r));
        });
      }
    } catch (err) {
      recipesListEl.innerHTML = '<p class="error">Could not load recipes.</p>';
    }
  }

  createRecipeBtn.addEventListener('click', async function () {
    const transcript = transcriptEl.value.trim();
    if (!transcript) {
      statusEl.textContent = 'No transcript to convert. Speak first, then create recipe.';
      return;
    }
    statusEl.textContent = 'Creating recipe (this may take a moment)…';
    createRecipeBtn.disabled = true;
    try {
      const res = await fetch('/api/recipes/from-voice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || res.statusText);
      latestRecipeEl.innerHTML = '';
      latestRecipeEl.appendChild(renderRecipe(data));
      responseBox.hidden = false;
      statusEl.textContent = 'Recipe created!';
      loadRecipes();
    } catch (err) {
      statusEl.textContent = 'Error: ' + err.message;
      latestRecipeEl.innerHTML = '<p class="error">' + escapeHtml(err.message) + '</p>';
      responseBox.hidden = false;
    } finally {
      createRecipeBtn.disabled = false;
    }
  });

  function switchTab(tabId) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById('tab-' + tabId).classList.add('active');
    document.querySelector('[data-tab="' + tabId + '"]').classList.add('active');
    if (tabId === 'recipes') loadRecipes();
  }

  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', function () { switchTab(this.dataset.tab); });
  });

  loadRecipes();
})();
