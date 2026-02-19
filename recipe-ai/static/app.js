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
    div.dataset.recipeId = recipe.id;
    div.innerHTML = `
      <h3 class="recipe-title">${escapeHtml(recipe.title)}</h3>
      <div class="recipe-tags">${(recipe.tags || []).map(t => `<span class="tag">${escapeHtml(t)}</span>`).join('')}</div>
      <h4>Ingredients</h4>
      <ul>${(recipe.ingredients || []).map(i => `<li>${escapeHtml(i)}</li>`).join('')}</ul>
      <h4>Steps</h4>
      <ol>${(recipe.steps || []).map(s => `<li>${escapeHtml(s)}</li>`).join('')}</ol>
      <div class="recipe-actions">
        <button type="button" class="editRecipeBtn">Edit</button>
        <button type="button" class="deleteRecipeBtn">Delete</button>
      </div>
    `;
    div.querySelector('.editRecipeBtn').addEventListener('click', () => openEditModal(recipe));
    div.querySelector('.deleteRecipeBtn').addEventListener('click', () => deleteRecipe(recipe));
    return div;
  }

  function escapeHtml(text) {
    const el = document.createElement('span');
    el.textContent = text;
    return el.innerHTML;
  }

  async function loadRecipes() {
    recipesListEl.innerHTML = '<p class="loading">Loading recipes…</p>';
    try {
      const res = await fetch('/api/recipes');
      const recipes = await res.json();
      recipesListEl.innerHTML = '';
      if (recipes.length === 0) {
        recipesListEl.innerHTML = '<p class="empty">No recipes yet. Create one with voice!</p>';
      } else {
        recipes.forEach(r => {
          recipesListEl.appendChild(renderRecipe(r));
        });
      }
    } catch (err) {
      recipesListEl.innerHTML = '<p class="error">Could not load recipes.</p>';
    }
  }

  const editModal = document.getElementById('editModal');
  const editForm = document.getElementById('editForm');
  const editCancelBtn = document.getElementById('editCancelBtn');
  let editingRecipeId = null;

  function openEditModal(recipe) {
    editingRecipeId = recipe.id;
    document.getElementById('editTitle').value = recipe.title;
    document.getElementById('editIngredients').value = (recipe.ingredients || []).join('\n');
    document.getElementById('editSteps').value = (recipe.steps || []).join('\n');
    document.querySelectorAll('input[name="editTag"]').forEach(cb => {
      cb.checked = (recipe.tags || []).includes(cb.value);
    });
    editModal.hidden = false;
  }

  function closeEditModal() {
    editModal.hidden = true;
    editingRecipeId = null;
  }

  editCancelBtn.addEventListener('click', closeEditModal);
  editModal.addEventListener('click', function (e) {
    if (e.target === editModal) closeEditModal();
  });

  editForm.addEventListener('submit', async function (e) {
    e.preventDefault();
    if (!editingRecipeId) return;
    const title = document.getElementById('editTitle').value.trim();
    const ingredients = document.getElementById('editIngredients').value.split('\n').map(s => s.trim()).filter(Boolean);
    const steps = document.getElementById('editSteps').value.split('\n').map(s => s.trim()).filter(Boolean);
    const tags = Array.from(document.querySelectorAll('input[name="editTag"]:checked')).map(cb => cb.value);
    if (!title) return;
    try {
      const res = await fetch('/api/recipes/' + editingRecipeId, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, ingredients, steps, tags }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(Array.isArray(data.detail) ? data.detail.map(d => d.msg || d).join('; ') : (data.detail || res.statusText));
      const card = recipesListEl.querySelector('[data-recipe-id="' + editingRecipeId + '"]');
      if (card) {
        const newCard = renderRecipe(data);
        card.replaceWith(newCard);
      }
      closeEditModal();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  });

  async function deleteRecipe(recipe) {
    if (!confirm('Delete recipe "' + recipe.title + '"?')) return;
    try {
      const res = await fetch('/api/recipes/' + recipe.id, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || res.statusText);
      }
      const card = recipesListEl.querySelector('[data-recipe-id="' + recipe.id + '"]');
      if (card) card.remove();
      const latestCard = latestRecipeEl.querySelector('[data-recipe-id="' + recipe.id + '"]');
      if (latestCard) {
        latestRecipeEl.innerHTML = '';
        responseBox.hidden = true;
      }
      if (recipesListEl.children.length === 0) {
        recipesListEl.innerHTML = '<p class="empty">No recipes yet. Create one with voice!</p>';
      }
    } catch (err) {
      alert('Error: ' + err.message);
    }
  }

  function prependRecipe(recipe) {
    const emptyMsg = recipesListEl.querySelector('.empty');
    if (emptyMsg) emptyMsg.remove();
    const loadingMsg = recipesListEl.querySelector('.loading');
    if (loadingMsg) loadingMsg.remove();
    const card = renderRecipe(recipe);
    recipesListEl.insertBefore(card, recipesListEl.firstChild);
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
      if (!res.ok) throw new Error(Array.isArray(data.detail) ? data.detail.map(d => d.msg || d).join('; ') : (data.detail || res.statusText));
      latestRecipeEl.innerHTML = '';
      latestRecipeEl.appendChild(renderRecipe(data));
      responseBox.hidden = false;
      statusEl.textContent = 'Recipe created!';
      prependRecipe(data);
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
})();
