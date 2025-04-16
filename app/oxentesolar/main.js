javascript
// admin.js - Logic for painel.html

// --- Global Supabase Client (initialized if config is valid) ---
let supabase = null;
try {
    // Access global vars defined in config.js (must be loaded first in HTML)
    if (typeof SUPABASE_URL === 'undefined' || !SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' ||
        typeof SUPABASE_ANON_KEY === 'undefined' || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY' ||
        typeof BUCKET_NAME === 'undefined' || !BUCKET_NAME || BUCKET_NAME === 'YOUR_BUCKET_NAME') {
        throw new Error("Supabase credentials or Bucket Name missing/invalid in config.js.");
    }
    supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    console.log("Supabase client initialized for painel.html.");
} catch (error) {
    console.error("Error initializing Supabase in painel.html:", error);
    document.body.innerHTML = `<div style="padding:2rem; text-align:center; color:red;"><h1>Erro Crítico</h1><p>Não foi possível conectar ao Supabase. Verifique as credenciais e o nome do bucket no arquivo config.js.</p><p>${error.message}</p></div>`;
}

// --- UI Elements ---
const authContainer = document.getElementById('auth-container');
const adminContent = document.getElementById('admin-content');
const loginForm = document.getElementById('login-form');
const loginButton = document.getElementById('login-button');
const logoutButton = document.getElementById('logout-button');
const userEmailDisplay = document.getElementById('user-email-display');
const authError = document.getElementById('auth-error');
const loginSpinner = loginButton?.querySelector('.spinner');

// --- Helper Functions ---
function showStatus(elementOrId, message, type = 'loading') {
    const el = typeof elementOrId === 'string' ? document.getElementById(elementOrId) : elementOrId;
    if (el) {
        el.textContent = message;
        el.className = 'status-message'; // Reset classes
        if (type === 'success') el.classList.add('success');
        else if (type === 'error') el.classList.add('error');
        else if (type === 'loading') el.classList.add('loading');
        // Auto-clear message after a delay
        if (type === 'success' || type === 'error') {
            setTimeout(() => { if (el.textContent === message) { el.textContent = ''; el.className = 'status-message'; } }, 6000);
        }
    } else { console.warn(`Status element not found: ${elementOrId}`); }
}

function setLoading(buttonElement, isLoading) {
    if (!buttonElement) return;
    const spinner = buttonElement.querySelector('.spinner');
    buttonElement.disabled = isLoading;
    spinner?.classList.toggle('hidden', !isLoading);
    buttonElement.classList.toggle('opacity-60', isLoading);
    buttonElement.classList.toggle('cursor-not-allowed', isLoading);
}

// --- File Handling Functions ---
async function uploadFile(file, pathPrefix) {
    if (!file || !supabase || !BUCKET_NAME) return null;
    const sanitizedPrefix = pathPrefix.replace(/^\/+|\/+$/g, '').replace(/\/+/g, '/');
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'file';
    const randomString = Math.random().toString(36).substring(2, 12);
    const filePath = `${sanitizedPrefix}/${Date.now()}_${randomString}.${fileExt}`;
    console.log(`Uploading to bucket '${BUCKET_NAME}', path: ${filePath}`);

    const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

    if (error) { console.error('Upload Error:', error); throw new Error(`Falha no upload: ${error.message}`); }

    const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(filePath);
    if (!urlData?.publicUrl) { console.error("Failed to get public URL after upload:", filePath); throw new Error("Falha ao obter URL pública."); }
    console.log('Upload successful, Public URL:', urlData.publicUrl);
    return urlData.publicUrl;
}

async function deleteFile(fileUrl) {
    if (!fileUrl || !supabase || !BUCKET_NAME || !fileUrl.includes(BUCKET_NAME)) return;
    try {
        const url = new URL(fileUrl);
        const pathSegments = url.pathname.split('/');
        const bucketIndex = pathSegments.indexOf(BUCKET_NAME);
        if (bucketIndex === -1 || bucketIndex + 1 >= pathSegments.length) { console.warn("Cannot extract file path:", fileUrl); return; }
        const filePath = decodeURIComponent(pathSegments.slice(bucketIndex + 1).join('/')); // Decode URI component
        if (!filePath) { console.warn("Empty file path extracted:", fileUrl); return; }

        console.log(`Attempting to delete file from storage: ${filePath}`);
        const { data, error } = await supabase.storage.from(BUCKET_NAME).remove([filePath]);
        if (error) { console.error("Storage Delete Error:", error); /* Log only */ }
        else { console.log("Storage file deleted successfully:", data); }
    } catch (err) { console.error("Exception during storage delete:", err); }
}

// --- AUTH FUNCTIONS ---
async function handleLogin(event) { /* ... (same as before) ... */
    event.preventDefault();
    if (!supabase || !loginForm) return alert('Erro interno: Supabase ou formulário não encontrado.');
    setLoading(loginButton, true);
    if(authError) authError.textContent = '';
    const email = loginForm.querySelector('#admin-email').value;
    const password = loginForm.querySelector('#admin-password').value;
    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // UI update is handled by onAuthStateChange
    } catch (error) {
        console.error('Login error:', error);
        if(authError) authError.textContent = `Erro: ${error.message || 'Email ou senha inválidos.'}`;
    } finally {
        setLoading(loginButton, false);
    }
}
async function handleLogout() { /* ... (same as before) ... */
    if (!supabase || !logoutButton) return alert('Erro interno: Supabase ou botão não encontrado.');
    logoutButton.disabled = true;
    try {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
        // UI update is handled by onAuthStateChange, no reload needed here
    } catch (error) {
        alert(`Erro ao sair: ${error.message}`);
    } finally {
        logoutButton.disabled = false;
    }
}

// --- UI UPDATE FUNCTION (Defined globally) ---
function updateUI(user) {
    const isAdminSectionVisible = !!adminContent && !adminContent.classList.contains('hidden');
    if (user) { // Logged In
        authContainer?.classList.add('hidden');
        adminContent?.classList.remove('hidden');
        if (userEmailDisplay) userEmailDisplay.textContent = user.email;
        if (!isAdminSectionVisible) loadAdminData(); // Load data only on initial login display
    } else { // Logged Out
        authContainer?.classList.remove('hidden');
        adminContent?.classList.add('hidden');
        if (userEmailDisplay) userEmailDisplay.textContent = '';
    }
}

// --- DATA LOADING for Admin Panel ---
async function loadAdminData() {
    // ... (same as previous version - fetches data and populates forms/lists) ...
     if (!supabase) return;
     console.log("Loading admin data...");
     const statusEl = document.querySelector('#admin-content h3 + p'); // Status below title
     showStatus(statusEl, 'Carregando dados...', 'loading');

     document.getElementById('solutions-list-admin').innerHTML = '<p class="text-center text-gray-500 italic py-4">Carregando...</p>';
     document.getElementById('projects-list-admin').innerHTML = '<p class="text-center text-gray-500 italic py-4">Carregando...</p>';
     document.getElementById('testimonials-list-admin').innerHTML = '<p class="text-center text-gray-500 italic py-4">Carregando...</p>';
     document.getElementById('reels-list-admin').innerHTML = '<p class="text-center text-gray-500 italic py-4">Carregando...</p>';
     document.getElementById('blog-list-admin').innerHTML = '<p class="text-center text-gray-500 italic py-4">Carregando...</p>';


     try {
         const [ settingsRes, solutionsRes, projectsRes, testimonialsRes, reelsRes, blogPostsRes ] = await Promise.all([
             supabase.from('website_settings').select('*').eq('id', 1).maybeSingle(),
             supabase.from('solutions').select('*').order('order_index'),
             supabase.from('projects').select('*').order('order_index'),
             supabase.from('testimonials').select('*').order('order_index'),
             supabase.from('reels').select('*').order('order_index'),
             supabase.from('blog_posts').select('*').order('published_at', { ascending: false })
         ]);

         if (settingsRes.error && settingsRes.error.code !== 'PGRST116') throw new Error(`Settings: ${settingsRes.error.message}`);
         if (solutionsRes.error) throw new Error(`Solutions: ${solutionsRes.error.message}`);
         if (projectsRes.error) throw new Error(`Projects: ${projectsRes.error.message}`);
         if (testimonialsRes.error) throw new Error(`Testimonials: ${testimonialsRes.error.message}`);
         if (reelsRes.error) throw new Error(`Reels: ${reelsRes.error.message}`);
         if (blogPostsRes.error) throw new Error(`Blog: ${blogPostsRes.error.message}`);

         const settings = settingsRes.data;
         const solutions = solutionsRes.data;
         const projects = projectsRes.data;
         const testimonials = testimonialsRes.data;
         const reels = reelsRes.data;
         const blogPosts = blogPostsRes.data;
         console.log("Admin data fetched.");

         // Populate Settings & About Forms
         if (settings) {
             document.getElementById('admin-logo-preview').src = settings.site_logo_url || 'placeholder-logo.png';
             document.getElementById('admin-logo-url').value = settings.site_logo_url || '';
             document.getElementById('admin-hero-bg-preview').src = settings.hero_bg_image_url || 'placeholder-hero-bg.jpg';
             document.getElementById('admin-hero-bg-url').value = settings.hero_bg_image_url || '';
             document.getElementById('admin-hero-title').value = settings.hero_title || '';
             document.getElementById('admin-hero-subtitle').value = settings.hero_subtitle || '';
             document.getElementById('admin-hero-text').value = settings.hero_text || '';
             document.getElementById('admin-about-preview').src = settings.about_image_url || 'placeholder-about.png';
             document.getElementById('admin-about-image-url').value = settings.about_image_url || '';
             document.getElementById('admin-about-title-input').value = settings.about_title || '';
             document.getElementById('admin-about-text-input').value = settings.about_text || '';
         }

         // Render Lists
         renderAdminList('solutions', solutions);
         renderAdminList('projects', projects);
         renderAdminList('testimonials', testimonials);
         renderAdminList('reels', reels);
         renderAdminList('blog', blogPosts);

         showStatus(statusEl, '', ''); // Clear loading status

     } catch (error) {
         console.error("Error loading admin data:", error);
         alert(`Erro ao carregar dados do painel: ${error.message}`);
         showStatus(statusEl, `Erro ao carregar: ${error.message}`, 'error');
         document.querySelectorAll('.admin-section-form [id$="-list-admin"]').forEach(el => el.innerHTML = `<p class="text-center text-red-500 italic py-4">Erro ao carregar itens.</p>`);
     }
}

// --- RENDER LISTS in Admin Panel ---
function renderAdminList(type, items) {
    // ... (same as previous version - dynamically creates list items with Edit/Delete) ...
     const listContainerId = `${type}-list-admin`;
     const listContainer = document.getElementById(listContainerId);
     if (!listContainer) { console.error(`List container not found: #${listContainerId}`); return; }
     listContainer.innerHTML = '';

     if (!items || items.length === 0) {
         listContainer.innerHTML = `<p class="text-center text-gray-500 italic py-4">Nenhum item cadastrado.</p>`;
         return;
     }
     const sortedItems = items[0]?.hasOwnProperty('order_index') ? [...items].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) : items;

     sortedItems.forEach(item => {
         const div = document.createElement('div');
         div.className = 'list-item group relative'; div.dataset.id = item.id; div.dataset.type = type;
         let imageUrl = item.image_url || item.thumbnail_url || null;
         const tableName = type === 'blog' ? 'blog_posts' : type;

         let itemContent = `<div class="item-content pr-20">`;
         itemContent += `<h5 class="">${item.title || item.name || `Item [${item.id.substring(0, 6)}]`}</h5>`;
         if (imageUrl) { itemContent += `<img src="${imageUrl}" alt="Preview" class="current-img-preview !max-w-[80px] !max-h-[60px] float-left mr-3 mb-1">`; }
         if (type === 'solutions') itemContent += `<p class="text-xs text-gray-600 clear-left">Ordem: ${item.order_index || 0} | Feat: ${(item.features || []).length}</p>`;
         if (type === 'projects') itemContent += `<p class="text-xs text-gray-600 clear-left">Ordem: ${item.order_index || 0} | KWP: ${item.kwp || '-'} | Econ: ${item.savings || '-'}</p>`;
         if (type === 'testimonials') itemContent += `<p class="text-xs text-gray-600 clear-left">Ordem: ${item.order_index || 0} | Local: ${item.location || '-'} | Nota: ${item.rating || '-'}</p><p class="text-sm italic mt-1 clear-left">"${(item.quote || '').substring(0, 100)}..."</p>`;
         if (type === 'reels') itemContent += `<p class="text-xs text-gray-600 clear-left">Ordem: ${item.order_index || 0} | Video URL: ${item.video_url ? 'Sim' : 'Não'}</p>`;
         if (type === 'blog') itemContent += `<p class="text-xs text-gray-600 clear-left">Slug: ${item.slug} | Pub: ${item.published_at ? new Date(item.published_at).toLocaleDateString('pt-BR') : '-'}</p><p class="text-sm mt-1 text-gray-700 clear-left">${(item.excerpt || '').substring(0, 100)}...</p>`;
         itemContent += `</div>`;

         const buttonsContainer = `<div class="item-controls absolute top-2 right-2 flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              <button class="edit-item-btn text-xs bg-yellow-500 hover:bg-yellow-600 text-white px-2 py-1 rounded" data-type="${type}" data-id="${item.id}" title="Editar"><i class="fas fa-edit"></i></button>
              <button class="delete-item-btn text-xs bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded" data-table="${tableName}" data-id="${item.id}" data-img-url="${imageUrl || ''}" title="Excluir"><i class="fas fa-trash"></i></button>
          </div>`;

         div.innerHTML = buttonsContainer + itemContent + `<div id="status-${type}-${item.id}" class="status-message mt-2 clear-left"></div>`;
         listContainer.appendChild(div);
     });

    listContainer.querySelectorAll('.delete-item-btn').forEach(btn => btn.onclick = handleDeleteItem);
    listContainer.querySelectorAll('.edit-item-btn').forEach(btn => btn.onclick = handleEditItem);
}


// --- CRUD FUNCTIONS ---
function handleEditItem(event) {
     // ... (Same placeholder as before - requires implementation) ...
     const button = event.currentTarget;
     const type = button.dataset.type;
     const id = button.dataset.id;
     const tableName = type === 'blog' ? 'blog_posts' : type;
     alert(`Implementar Edição:\n1. Buscar dados (${tableName} ID: ${id})\n2. Preencher formulário/modal\n3. Salvar com supabase.update()`);
}

async function handleDeleteItem(event) {
    // ... (same as before - handles deletion) ...
    const button = event.currentTarget;
    const tableName = button.dataset.table;
    const id = button.dataset.id;
    const imageUrl = button.dataset.imgUrl;
    const listItemElement = button.closest('.list-item');
    const statusElement = listItemElement?.querySelector('.status-message');

    if (!supabase || !id || !tableName || !listItemElement) return;
    if (!confirm(`Tem certeza que deseja excluir este item da tabela "${tableName}"? A imagem associada (se houver) também será excluída do armazenamento.`)) return;

    setLoading(button, true);
    showStatus(statusElement, 'Excluindo...', 'loading');

    try {
         const { error: dbError } = await supabase.from(tableName).delete().eq('id', id);
         if (dbError) throw dbError;
         if (imageUrl && imageUrl !== 'null' && imageUrl !== '') await deleteFile(imageUrl); // Delete associated image
         console.log(`Item ${id} from ${tableName} deleted.`);
         listItemElement.remove();
    } catch (error) {
        console.error(`Error deleting ${id} from ${tableName}:`, error);
        showStatus(statusElement, `Erro: ${error.message}`, 'error');
        setLoading(button, false); // Re-enable button on error
    }
}

async function handleAddItem(event) {
    // ... (same as before - handles adding new items) ...
     event.preventDefault();
     if (!supabase) return;
     const form = event.target;
     const tableName = form.dataset.table;
     const type = tableName === 'blog_posts' ? 'blog' : tableName;
     const statusElementId = `status-add-${type}`;
     const addButton = form.querySelector('button[type="submit"]');
     setLoading(addButton, true);
     showStatus(statusElementId, 'Adicionando...', 'loading');

     try {
         const formData = new FormData(form);
         const itemData = {};
         let imageFile = null;
         let imageInputName = '';

          for (let [key, value] of formData.entries()) {
              if (key.endsWith('_file') && value instanceof File && value.size > 0) {
                  imageFile = value; imageInputName = key;
              } else if (key === 'features_text') { // Handle features textarea
                  itemData['features'] = value.split('\n').map(f => f.trim()).filter(Boolean);
              } else if (key === 'published_at_input') {
                  itemData['published_at'] = value ? new Date(value).toISOString() : null; // Use null if empty for publish now
              } else if (!key.endsWith('_file') && !key.endsWith('_input')) {
                 itemData[key] = value === '' ? null : value;
              }
          }

         let imageUrlColumn = null;
         if (imageInputName === 'image_file') imageUrlColumn = 'image_url';
         else if (imageInputName === 'thumbnail_file') imageUrlColumn = 'thumbnail_url';

          if (imageFile && imageUrlColumn) {
              const imageUrl = await uploadFile(imageFile, tableName); // Upload to folder named after table
              itemData[imageUrlColumn] = imageUrl;
          }

         if (itemData.order_index) itemData.order_index = parseInt(itemData.order_index, 10) || 0;
         if (itemData.rating) itemData.rating = parseInt(itemData.rating, 10) || 5;
         if(tableName === 'blog_posts' && !itemData.slug && itemData.title) { // Auto-generate slug
             itemData.slug = itemData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
             if(!itemData.slug) itemData.slug = `post-${Date.now()}`; // Fallback slug
         }

          const { data, error } = await supabase.from(tableName).insert([itemData]).select();
          if (error) {
              if (error.code === '23505' && error.message.includes('slug')) { throw new Error('O "Slug (URL amigável)" já existe. Escolha outro.'); }
              if (error.code === '23502') { const match = error.message.match(/null value in column "(\w+)"/); throw new Error(`Campo obrigatório "${match ? match[1] : 'desconhecido'}" não pode ser vazio.`); }
              throw error;
          }

          console.log(`New ${type} added:`, data);
          showStatus(statusElementId, 'Item adicionado!', 'success');
          form.reset();
          loadAdminData(); // Reload list

     } catch (error) {
          console.error(`Error adding ${type}:`, error);
          showStatus(statusElementId, `Erro: ${error.message}`, 'error');
     } finally {
          setLoading(addButton, false);
          const fileInput = form.querySelector('input[type="file"]');
          if (fileInput) fileInput.value = '';
     }
}

async function handleSaveSettings(event) {
    // ... (same as before - handles saving settings/about sections) ...
      event.preventDefault();
      if (!supabase) return;
      const form = event.target;
      const tableName = form.dataset.table; // 'website_settings'
      const recordId = parseInt(form.dataset.id, 10); // 1
      const statusElementId = form.id.replace('admin-form-', 'status-');
      const saveButton = form.querySelector('button[type="submit"]');
      if (!tableName || isNaN(recordId)) { alert("Erro: Formulário sem config."); return; }

      setLoading(saveButton, true);
      showStatus(statusElementId, 'Salvando...', 'loading');

      try {
          const formData = new FormData(form);
          const updates = {};
          let fileToUpload = null;
          let dbImageColumn = null;
          let currentImageUrl = form.querySelector(`input[type="hidden"][name$="_url"]`)?.value || '';

          for (let [key, value] of formData.entries()) {
              if (key.endsWith('_file') && value instanceof File && value.size > 0) {
                  fileToUpload = value;
                  dbImageColumn = key.replace('_file', '_url');
                   if (dbImageColumn === 'hero_bg_url') dbImageColumn = 'hero_bg_image_url';
                   currentImageUrl = form.querySelector(`input[name="${dbImageColumn}"]`)?.value || '';
              } else if (!key.endsWith('_file') && !key.endsWith('_url')) {
                  updates[key] = value === '' ? null : value;
              }
          }

          let newImageUrl = null; // Define outside the if block
          if (fileToUpload && dbImageColumn) {
               if (currentImageUrl) await deleteFile(currentImageUrl);
               newImageUrl = await uploadFile(fileToUpload, dbImageColumn.replace('_url','').replace('_image',''));
               updates[dbImageColumn] = newImageUrl;
               // Update hidden input immediately
               const hiddenUrlInput = form.querySelector(`input[name="${dbImageColumn}"]`);
               if(hiddenUrlInput) hiddenUrlInput.value = newImageUrl;
               // Update preview immediately
               const previewImg = form.querySelector(`#admin-${dbImageColumn.replace('_url','').replace('_image','')}-preview`);
               if(previewImg) previewImg.src = newImageUrl;
          }

          if (Object.keys(updates).length > 0 || newImageUrl) { // Check if there are text updates OR a new image was uploaded
              console.log(`Updating ${tableName} (ID: ${recordId}):`, updates);
              const { data, error } = await supabase.from(tableName).update(updates).eq('id', recordId).select();
              if (error) throw error;
              console.log("Update successful:", data);
          } else {
              console.log("Nenhuma alteração detectada para salvar.");
          }

          showStatus(statusElementId, 'Salvo com sucesso!', 'success');

      } catch (error) {
           console.error(`Error saving ${form.id}:`, error);
           showStatus(statusElementId, `Erro: ${error.message}`, 'error');
      } finally {
           setLoading(saveButton, false);
           const fileInput = form.querySelector('input[type="file"]');
           if(fileInput) fileInput.value = '';
      }
}

// --- Initial Setup for Admin Panel ---
document.addEventListener('DOMContentLoaded', () => {
    const currentYearAdmin = document.getElementById('current-year-admin');
    if(currentYearAdmin) currentYearAdmin.textContent = new Date().getFullYear();

    if (!supabase) { // Early exit if Supabase failed
        authContainer.innerHTML = '<p class="text-red-500 text-center font-bold">Erro: Supabase não configurado. Verifique config.js.</p>';
        return;
    }

    // Check initial auth state & Set up listener
    supabase.auth.getSession().then(({ data: { session } }) => {
        updateUI(session?.user ?? null);
    }).catch(err => {
        console.error("Error getting initial session:", err);
        updateUI(null);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
        console.log("Admin auth state changed:", _event);
        updateUI(session?.user ?? null);
    });

    // --- Form Event Listeners ---
    loginForm?.addEventListener('submit', handleLogin);
    logoutButton?.addEventListener('click', handleLogout);

    // Settings Forms
    document.getElementById('admin-form-settings')?.addEventListener('submit', handleSaveSettings);
    document.getElementById('admin-form-about')?.addEventListener('submit', handleSaveSettings);

    // "Add New" Forms for Lists
    document.getElementById('add-solution-form')?.addEventListener('submit', (e) => handleAddItem(e, 'solutions'));
    document.getElementById('add-project-form')?.addEventListener('submit', (e) => handleAddItem(e, 'projects'));
    document.getElementById('add-testimonial-form')?.addEventListener('submit', (e) => handleAddItem(e, 'testimonials'));
    document.getElementById('add-reel-form')?.addEventListener('submit', (e) => handleAddItem(e, 'reels'));
    document.getElementById('add-blog-form')?.addEventListener('submit', (e) => handleAddItem(e, 'blog'));

    // Edit/Delete listeners are added dynamically in renderAdminList

}); // End DOMContentLoaded
