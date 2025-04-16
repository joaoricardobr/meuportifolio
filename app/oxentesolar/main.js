// main.js - Logic for index.html

// --- IndexedDB Helper Functions ---
async function openDB(dbName, version, stores) {
    return new Promise((resolve, reject) => {
        console.log(`Attempting to open DB: ${dbName}, Version: ${version}`);
        const request = indexedDB.open(dbName, version);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log(`Upgrading DB "${dbName}" to version ${version}`);
            const existingStores = Array.from(db.objectStoreNames);
            stores.forEach(storeName => {
                if (!existingStores.includes(storeName)) {
                    const keyPath = (storeName === 'website_settings') ? 'id' : 'id'; // Use 'id' for settings too for simplicity with put
                    db.createObjectStore(storeName, { keyPath: keyPath });
                    console.log(`Object store created: ${storeName}`);
                }
            });
            // Clean up old stores if necessary (optional)
            existingStores.forEach(storeName => {
                if (!stores.includes(storeName)) {
                    db.deleteObjectStore(storeName);
                     console.log(`Old object store deleted: ${storeName}`);
                }
            });

        };

        request.onsuccess = (event) => {
            console.log(`DB "${dbName}" opened successfully.`);
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error(`IndexedDB error opening ${dbName}:`, event.target.error);
            reject(`IndexedDB error: ${event.target.error?.message || 'Unknown error'}`);
        };
    });
}

async function saveData(db, storeName, data) {
    return new Promise(async (resolve, reject) => { // Make outer function async
        if (!db || !db.objectStoreNames.contains(storeName)) {
            return reject(`DB or Store "${storeName}" not available for saving.`);
        }
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        const itemsToPut = Array.isArray(data) ? data : (data ? [data] : []); // Ensure it's an array or empty

        // Wrap clear and put operations in promises
        const clearPromise = new Promise((res, rej) => {
            const clearRequest = store.clear();
            clearRequest.onsuccess = () => { console.log(`Store "${storeName}" cleared.`); res(); };
            clearRequest.onerror = (event) => { console.error(`Error clearing store ${storeName}:`, event.target.error); rej(`Error clearing store: ${event.target.error?.message}`); };
        });

        try {
            await clearPromise; // Wait for clear to finish

            if (itemsToPut.length === 0) {
                console.log(`No data provided to put into "${storeName}".`);
                resolve(); // Resolve immediately if nothing to add
                return;
            }

            // Use Promise.all for putting items
            const putPromises = itemsToPut.map(item => {
                 // Ensure settings object has id=1 if saving to website_settings
                 if (storeName === 'website_settings' && typeof item === 'object' && item !== null && !item.id) {
                    item.id = 1;
                 }
                 // Ensure other items have an 'id' if it's missing (though should come from Supabase)
                 if (storeName !== 'website_settings' && typeof item === 'object' && item !== null && !item.id) {
                    console.warn(`Item in store ${storeName} missing id:`, item);
                    // Skip putting item without ID? Or generate one? Skipping for safety.
                    return Promise.resolve(); // Resolve promise for this item without putting
                 }

                return new Promise((resPut, rejPut) => {
                    if (typeof item !== 'object' || item === null || (storeName !== 'website_settings' && !item.id)) {
                         console.warn(`Skipping invalid item for store ${storeName}:`, item);
                         return resPut(); // Skip non-objects or items missing ID (except settings)
                    }
                    const putRequest = store.put(item);
                    putRequest.onsuccess = () => resPut();
                    putRequest.onerror = (event) => rejPut(`Error putting item in ${storeName}: ${event.target.error?.message}`);
                });
            });

            await Promise.all(putPromises);
            console.log(`Successfully put ${itemsToPut.length} valid item(s) into ${storeName}`);
            resolve(); // Resolve main promise after all puts succeed

        } catch (error) {
            console.error(`Error during save transaction for ${storeName}:`, error);
            transaction.abort(); // Abort transaction on error
            reject(error);
        }

        // Transaction completion/error handlers (less critical now with Promise.all)
        transaction.oncomplete = () => { console.log(`Save transaction complete for ${storeName}.`); };
        transaction.onerror = (event) => { console.error(`Save transaction error for ${storeName} (final):`, event.target.error); reject(`Transaction error: ${event.target.error?.message}`); };
    });
}


async function loadData(db, storeName) {
    return new Promise((resolve, reject) => {
         if (!db || !db.objectStoreNames.contains(storeName)) {
            console.warn(`DB or Store "${storeName}" not available for loading.`);
            return resolve([]); // Return empty array if store doesn't exist
         }
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll();

        request.onsuccess = (event) => {
            // console.log(`Data loaded from ${storeName}:`, event.target.result);
            resolve(event.target.result || []);
        };
        request.onerror = (event) => {
            console.error(`Error loading data from ${storeName}:`, event.target.error);
            reject(`Error loading data: ${event.target.error?.message}`);
        };
    });
}

// --- Global Supabase Client (initialized if config is valid) ---
let supabase = null;
try {
    if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
        typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY')
    {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase client initialized for index.html.");
    } else {
        console.warn("Supabase credentials missing in config.js. Offline mode only.");
    }
} catch (error) {
    console.error("Error initializing Supabase in index.html:", error);
}

// --- IndexedDB Initialization ---
let db = null;
async function initDB() {
    // Don't proceed if config is missing
    if (typeof DB_NAME === 'undefined' || typeof DB_VERSION === 'undefined' || typeof STORES === 'undefined') {
         console.error("IndexedDB configuration variables (DB_NAME, DB_VERSION, STORES) are missing in config.js.");
         return;
    }
    try {
        db = await openDB(DB_NAME, DB_VERSION, STORES);
        console.log("IndexedDB initialized successfully.");
    } catch (error) {
        console.error("Failed to initialize IndexedDB:", error);
    }
}

// --- UI Elements & Status ---
const offlineStatusIndicator = document.getElementById('offline-status');
function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    console.log(`Network status changed: ${isOnline ? 'Online' : 'Offline'}`);
    if (offlineStatusIndicator) {
        offlineStatusIndicator.textContent = isOnline ? 'Online' : 'Offline - Exibindo dados locais';
        offlineStatusIndicator.className = isOnline ? 'online' : 'offline';
        if (isOnline) {
            // Hide 'Online' message after a delay
            offlineStatusIndicator.style.display = 'block'; // Ensure it's visible first
            setTimeout(() => {
                // Double check if still online before hiding
                if(navigator.onLine) offlineStatusIndicator.style.display = 'none';
            }, 4000);
        } else {
             offlineStatusIndicator.style.display = 'block'; // Always show when offline
        }
    }
}

// --- Load Website Content (with Offline First) ---
async function loadWebsiteContent() {
    console.log("Loading website content (Offline First)...");
    updateOnlineStatus();

    const elementsToUpdate = document.querySelectorAll('[data-content-key]');
    const gridPlaceholders = document.querySelectorAll('.grid-placeholder');

    elementsToUpdate.forEach(el => { if (el.tagName !== 'IMG') el.classList.add('loading-placeholder'); });
    gridPlaceholders.forEach(el => { el.classList.remove('hidden'); el.innerHTML = '<p class="text-center text-gray-500 italic py-4">Carregando...</p>';});

    let isDataFromCache = false;
    let cachedSettings = null, cachedSolutions = [], cachedProjects = [], cachedTestimonials = [], cachedReels = [], cachedBlogPosts = [];

    // 1. Try loading from IndexedDB first
    if (db) {
        try {
            console.log("Attempting to load from IndexedDB...");
            const results = await Promise.all([
                loadData(db, 'website_settings'),
                loadData(db, 'solutions'),
                loadData(db, 'projects'),
                loadData(db, 'testimonials'),
                loadData(db, 'reels'),
                loadData(db, 'blog_posts')
            ]);
            cachedSettings = results[0]?.[0]; // Settings is single object array
            cachedSolutions = results[1] || [];
            cachedProjects = results[2] || [];
            cachedTestimonials = results[3] || [];
            cachedReels = results[4] || [];
            cachedBlogPosts = results[5] || [];

            if (cachedSettings || cachedSolutions.length > 0 || cachedProjects.length > 0) {
                 console.log("Data found in IndexedDB cache.");
                 renderWebsiteContent(cachedSettings, cachedSolutions, cachedProjects, cachedTestimonials, cachedReels, cachedBlogPosts);
                 isDataFromCache = true;
                 if (!navigator.onLine) { console.log("Offline: Content loaded from cache."); return; }
            } else { console.log("No significant data found in IndexedDB cache."); }
        } catch (error) { console.error("Error loading from IndexedDB:", error); }
    } else { console.warn("IndexedDB not available, skipping cache load."); }

    // 2. If online, try fetching fresh data from Supabase
    if (navigator.onLine && supabase) {
        console.log("Online: Attempting to fetch fresh data from Supabase...");
        try {
            const [ settingsRes, solutionsRes, projectsRes, testimonialsRes, reelsRes, blogPostsRes ] = await Promise.all([
                supabase.from('website_settings').select('*').eq('id', 1).maybeSingle(),
                supabase.from('solutions').select('*').order('order_index'),
                supabase.from('projects').select('*').order('order_index'),
                supabase.from('testimonials').select('*').order('order_index'),
                supabase.from('reels').select('*').order('order_index'),
                supabase.from('blog_posts').select('*').order('published_at', { ascending: false })
            ]);

            // Check for errors
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

            console.log("Fresh data fetched from Supabase.");
            renderWebsiteContent(settings, solutions, projects, testimonials, reels, blogPosts); // Render fresh data

            // 3. Update IndexedDB cache
            if (db) {
                console.log("Updating IndexedDB cache...");
                // Ensure settings has id=1 for saving
                const settingsToSave = settings ? { ...settings, id: 1 } : null;
                await Promise.all([
                    settingsToSave ? saveData(db, 'website_settings', settingsToSave) : Promise.resolve(),
                    saveData(db, 'solutions', solutions || []),
                    saveData(db, 'projects', projects || []),
                    saveData(db, 'testimonials', testimonials || []),
                    saveData(db, 'reels', reels || []),
                    saveData(db, 'blog_posts', blogPosts || [])
                ]).catch(cacheError => console.error("Error updating IndexedDB cache:", cacheError));
            }

        } catch (error) {
            console.error("Error fetching from Supabase:", error);
            if (!isDataFromCache) { // Show critical error only if cache failed too
                alert(`Erro CRÍTICO ao carregar conteúdo: ${error.message}\nTente recarregar a página.`);
                 elementsToUpdate.forEach(el => { if (el.tagName !== 'IMG') el.textContent = `[Erro DB]`; else {el.src='placeholder-error.png'; el.alt='Erro DB';} el.classList.remove('loading-placeholder');});
                 gridPlaceholders.forEach(el => el.textContent = 'Erro ao carregar itens.');
            } else { // Show offline warning if using cache because Supabase failed
                console.warn("Supabase fetch failed, showing possibly stale cached data.");
                 if (offlineStatusIndicator) { offlineStatusIndicator.textContent = 'Erro de Conexão - Usando dados locais'; offlineStatusIndicator.className = 'offline'; offlineStatusIndicator.style.display = 'block'; }
            }
        }
    } else if (!isDataFromCache) { // Offline and no cache
        console.log("Offline and no cache available.");
         elementsToUpdate.forEach(el => { if (el.tagName !== 'IMG') el.textContent = `[Offline]`; else {el.src='placeholder-error.png'; el.alt='Offline';} el.classList.remove('loading-placeholder');});
         gridPlaceholders.forEach(el => el.textContent = 'Você está offline e não há dados locais.');
    }
}


// --- RENDER Website Content ---
function renderWebsiteContent(settings, solutions, projects, testimonials, reels, blogPosts) {
    console.log("Rendering website content...");
    // --- Update Single Elements ---
    if (settings) {
        const siteLogo = document.getElementById('site-logo');
        const footerLogo = document.getElementById('footer-logo');
        if (siteLogo) { siteLogo.src = settings.site_logo_url || 'placeholder-logo.png'; siteLogo.alt = 'Logo Fortlev Solar'; }
        if (footerLogo) { footerLogo.src = settings.site_logo_url || 'placeholder-logo.png'; footerLogo.alt = 'Logo Fortlev Solar Footer'; }

        const heroSection = document.getElementById('home');
        if (heroSection && settings.hero_bg_image_url) {
            heroSection.style.backgroundImage = `linear-gradient(rgba(0, 86, 179, 0.85), rgba(0, 86, 179, 0.85)), url('${settings.hero_bg_image_url}')`;
        } else if (heroSection) { heroSection.style.backgroundImage = `linear-gradient(rgba(0, 86, 179, 0.85), rgba(0, 86, 179, 0.85))`; heroSection.style.backgroundColor = '#0056b3'; }

        const heroTitleEl = document.getElementById('hero-title');
        const heroSubtitleEl = document.getElementById('hero-subtitle');
        const heroTextEl = document.getElementById('hero-text');
        const aboutImageEl = document.getElementById('about-image');
        const aboutTitleEl = document.getElementById('about-title');
        const aboutTextEl = document.getElementById('about-text');
        if(heroTitleEl) heroTitleEl.textContent = settings.hero_title || 'Título Principal Padrão';
        if(heroSubtitleEl) heroSubtitleEl.textContent = settings.hero_subtitle || 'Subtítulo Padrão';
        if(heroTextEl) heroTextEl.textContent = settings.hero_text || 'Texto Principal Padrão';
        if(aboutImageEl) { aboutImageEl.src = settings.about_image_url || 'placeholder-about.png'; aboutImageEl.alt = settings.about_title || 'Consultor Rogério'; }
        if(aboutTitleEl) aboutTitleEl.textContent = settings.about_title || 'Sobre Título Padrão';
        if(aboutTextEl) aboutTextEl.textContent = settings.about_text || 'Sobre Texto Padrão';
    } else { console.warn("Settings data is missing during render."); }
    document.querySelectorAll('#hero-title, #hero-subtitle, #hero-text, #about-title, #about-text').forEach(el => el?.classList.remove('loading-placeholder'));

    // --- Update Lists ---
    renderListItems('solutions-grid', solutions, createSolutionHTML);
    renderListItems('projects-grid', projects, createProjectHTML);
    renderListItems('testimonials-grid', testimonials, createTestimonialHTML);
    renderListItems('reels-grid', reels, createReelHTML);
    renderListItems('blog-grid', blogPosts, createBlogPostHTML);

    // Re-initialize scroll animations AFTER content is in the DOM
    setTimeout(setupScrollAnimations, 50); // Small delay ensures elements are ready
    // Setup stats counters (assuming they are static or loaded differently)
    setupStatsCounters();
}

// --- Helper Functions for Rendering Lists ---
function renderListItems(gridId, items, createHTMLFunc) {
    const grid = document.getElementById(gridId);
    if (!grid) { console.warn(`Grid container #${gridId} not found.`); return; }
    grid.innerHTML = ''; // Clear placeholder or previous content
    grid.classList.remove('grid-placeholder');
    if (!items || items.length === 0) { grid.innerHTML = `<p class="text-center text-gray-500 col-span-full py-8">Nenhum item cadastrado.</p>`; return; }
    const sortedItems = items[0]?.hasOwnProperty('order_index') ? [...items].sort((a, b) => (a.order_index || 0) - (b.order_index || 0)) : items;
    sortedItems.forEach(item => { grid.innerHTML += createHTMLFunc(item); });
}
function createSolutionHTML(item) { /* ... (same as before) ... */
    const featuresHtml = (item.features || []).map(f => `<li class="flex items-start"><i class="fas fa-check text-fortlevOrange mr-2 mt-1 shrink-0"></i><span>${sanitizeHTML(f)}</span></li>`).join('');
    return `<div class="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition duration-300 card-hover flex flex-col animate-on-scroll" data-animation="slide-up"><img src="${sanitizeHTML(item.image_url || 'placeholder-solution.png')}" loading="lazy" alt="${sanitizeHTML(item.title || 'Solução')}" class="w-full h-52 object-cover content-img"><div class="p-6 flex flex-col flex-grow"><div class="flex items-center mb-3"><div class="bg-fortlevBlue bg-opacity-10 p-2 rounded-full mr-3"><i class="fas fa-puzzle-piece text-fortlevBlue text-lg"></i></div><h3 class="text-xl font-semibold text-fortlevDark">${sanitizeHTML(item.title || '')}</h3></div><p class="text-gray-600 text-sm mb-4 flex-grow">${sanitizeHTML(item.description || '')}</p><ul class="text-gray-600 text-xs space-y-2 mb-4">${featuresHtml}</ul></div></div>`;
}
function createProjectHTML(item) { /* ... (same as before) ... */
    return `<div class="relative rounded-lg overflow-hidden shadow-md project-card group animate-on-scroll" data-animation="fade-in"><img src="${sanitizeHTML(item.image_url || 'placeholder-project.png')}" loading="lazy" alt="${sanitizeHTML(item.title || 'Projeto')}" class="w-full h-72 object-cover transform group-hover:scale-105 transition duration-300 content-img"><div class="absolute inset-0 project-overlay flex flex-col justify-end p-6 text-white"><h3 class="text-xl font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">${sanitizeHTML(item.title || '')}</h3><p class="text-sm mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200"><i class="fas fa-solar-panel mr-1 opacity-70"></i> ${sanitizeHTML(item.kwp || '')}</p><p class="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-300"><i class="fas fa-coins mr-1 opacity-70"></i> ${sanitizeHTML(item.savings || '')}</p></div></div>`;
}
function createTestimonialHTML(item) { /* ... (same as before) ... */
    let starsHtml = Array(5).fill(0).map((_, i) => `<i class="fas fa-star ${i < (item.rating || 0) ? 'text-yellow-400' : 'text-gray-300'} ml-1"></i>`).join('');
    return `<div class="bg-white p-6 rounded-lg testimonial-card animate-on-scroll" data-animation="slide-up"><div class="flex items-center mb-4"><img src="${sanitizeHTML(item.image_url || 'placeholder-person.png')}" loading="lazy" alt="Cliente ${sanitizeHTML(item.name || '')}" class="w-14 h-14 rounded-full mr-4 border-2 border-fortlevOrange p-0.5 object-cover content-img"><div><h4 class="font-semibold text-fortlevDark">${sanitizeHTML(item.name || '')}</h4><p class="text-sm text-gray-500">${sanitizeHTML(item.location || '')}</p><div class="flex text-sm mt-1">${starsHtml}</div></div></div><p class="text-gray-600 italic text-sm leading-relaxed">"${sanitizeHTML(item.quote || '')}"</p></div>`;
}
function createReelHTML(item) { /* ... (same as before) ... */
    return `<div class="reel-thumbnail relative rounded-lg overflow-hidden shadow-md group cursor-pointer aspect-w-9 aspect-h-16 animate-on-scroll" data-animation="fade-in" data-reel-url="${sanitizeHTML(item.video_url || '#')}"><img src="${sanitizeHTML(item.thumbnail_url || 'placeholder-reel.png')}" loading="lazy" alt="${sanitizeHTML(item.title || 'Reel')}" class="w-full h-full object-cover content-img"><div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"><div class="play-icon bg-white bg-opacity-80 rounded-full w-10 h-10 flex items-center justify-center text-fortlevDark transition duration-300"><i class="fas fa-play"></i></div></div><div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2"><h3 class="text-white font-medium text-xs truncate">${sanitizeHTML(item.title || '')}</h3></div></div>`;
}
function createBlogPostHTML(item) { /* ... (same as before) ... */
     const pubDate = item.published_at ? new Date(item.published_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric'}) : 'N/A';
     const words = item.excerpt?.split(' ').length || 0;
     const readTime = Math.ceil(words / 200);
     return `<article class="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition duration-300 card-hover flex flex-col animate-on-scroll" data-animation="slide-up"><a href="#" class="block"><img src="${sanitizeHTML(item.image_url || 'placeholder-blog.png')}" loading="lazy" alt="${sanitizeHTML(item.title || 'Blog Post')}" class="w-full h-52 object-cover content-img"></a><div class="p-6 flex flex-col flex-grow"><div class="flex items-center text-xs text-gray-500 mb-3"><span class="mr-3"><i class="far fa-calendar-alt mr-1"></i>${pubDate}</span><span><i class="far fa-clock mr-1"></i>${readTime} min</span></div><h3 class="text-lg font-semibold text-fortlevDark mb-3 flex-grow"><a href="#" class="hover:text-fortlevOrange transition">${sanitizeHTML(item.title || '')}</a></h3><p class="text-gray-600 text-sm mb-4">${sanitizeHTML(item.excerpt || '')}</p><a href="#" class="text-fortlevOrange font-medium inline-flex items-center text-sm mt-auto"> Ler Mais <i class="fas fa-arrow-right ml-2 text-xs"></i> </a></div></article>`;
}
function sanitizeHTML(str) { /* ... (same as before) ... */
    if (!str) return ''; const temp = document.createElement('div'); temp.textContent = str; return temp.innerHTML;
}

// --- Scroll Animation Setup ---
function setupScrollAnimations() { /* ... (same as before) ... */
    const animatedElements = document.querySelectorAll(".animate-on-scroll"); if (!animatedElements.length) return; const scrollObserverOptions = { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }; const scrollObserver = new IntersectionObserver((entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting && !entry.target.classList.contains('animated-fade-in') && !entry.target.classList.contains('animated-slide-up')) { const element = entry.target; const animationType = element.dataset.animation || "fade-in"; const delay = element.dataset.animationDelay || "0"; element.style.transitionDelay = `${delay}ms`; element.classList.add(animationType === "slide-up" ? "animated-slide-up" : "animated-fade-in"); element.style.opacity = 1; observer.unobserve(element); } }); }, scrollObserverOptions); animatedElements.forEach(el => { scrollObserver.observe(el); });
}

// --- Stats Counter Setup ---
function setupStatsCounters() { /* ... (same as before) ... */
     const statsCounters = document.querySelectorAll("[data-count]"); if (!statsCounters.length) return; const countUp = (element, target, duration = 2000) => { let start = 0; const increment = target / (duration / 16); const timer = setInterval(() => { start += increment; if (start >= target) { clearInterval(timer); element.textContent = target; } else { element.textContent = Math.ceil(start); } }, 16); }; const statsObserver = new IntersectionObserver((entries, observer) => { entries.forEach(entry => { if (entry.isIntersecting) { const counter = entry.target; if(counter.dataset.counted) return; const targetCount = +counter.dataset.count; if (!isNaN(targetCount)) { countUp(counter, targetCount); counter.dataset.counted = 'true'; } observer.unobserve(counter); } }); }, { threshold: 0.5 }); statsCounters.forEach(counter => { counter.textContent = '0'; delete counter.dataset.counted; statsObserver.observe(counter); });
}


// --- Initial Load and Other Event Listeners ---
document.addEventListener('DOMContentLoaded', async () => {
    await initDB(); // Initialize IndexedDB first
    await loadWebsiteContent(); // Load content (tries cache first)

    // Setup other non-data-dependent interactions
    const menuToggle=document.getElementById("menu-toggle"),mobileMenu=document.getElementById("mobile-menu");menuToggle?.addEventListener("click",(()=>{mobileMenu.classList.toggle("hidden"),menuToggle.querySelector("i").classList.toggle("fa-bars"),menuToggle.querySelector("i").classList.toggle("fa-times")})),mobileMenu?.querySelectorAll("a").forEach((e=>{e.addEventListener("click",(()=>{mobileMenu.classList.add("hidden"),menuToggle.querySelector("i").classList.remove("fa-times"),menuToggle.querySelector("i").classList.add("fa-bars")}))}));
    const faqQuestions=document.querySelectorAll(".faq-question");faqQuestions.forEach((e=>{e.addEventListener("click",(()=>{const t=e.nextElementSibling,o=e.classList.contains("open");e.classList.toggle("open",!o),t.classList.toggle("hidden",o)}))}));
    const currentYearEl = document.getElementById("current-year"); if (currentYearEl) currentYearEl.textContent = (new Date).getFullYear();
    const calculateBtn=document.getElementById("calculate-btn");calculateBtn&&calculateBtn.addEventListener("click",(()=>{const e=document.getElementById("calc-consumption"),t=document.getElementById("calc-tariff"),o=document.getElementById("calculator-result"),n=document.getElementById("savings-result"),a=document.getElementById("system-size"),l=document.getElementById("payback"),s=parseFloat(e.value),i=parseFloat(t.value);if(!isNaN(s)&&s>0&&!isNaN(i)&&i>0){const c=115,d=Math.ceil(s/c*10)/10,r=s*i*.93,u=4800,m=d*u,f=12*r,p=(m/f).toFixed(1);n.textContent=`R$ ${r.toFixed(2).replace(".",",")}`,a.textContent=`${d.toFixed(1).replace(".",",")} kWp`,l.textContent=`${p.replace(".",",")} anos`,o.classList.remove("hidden")}else o.classList.add("hidden"),isNaN(s)||s<=0?(e.focus(),alert("Insira consumo válido.")):(isNaN(i)||i<=0)&&(t.focus(),alert("Insira tarifa válida."))}));
    document.body.addEventListener('click', function(event) { const thumb = event.target.closest('.video-thumbnail, .reel-thumbnail'); if(thumb) { const videoUrl = thumb.dataset.reelUrl || thumb.dataset.videoUrl; if (videoUrl && videoUrl !== '#') { console.log("Open video modal for:", videoUrl); alert(`Simulação: Abrir vídeo ${videoUrl}\n(Implementar Lightbox/Modal)`); } else { console.warn("No valid video URL."); } } });
    const contactForm=document.getElementById("contact-form"),formStatus=document.getElementById("form-status");contactForm&&contactForm.addEventListener("submit",(async e=>{e.preventDefault(),formStatus.textContent="Enviando...",formStatus.className="text-sm mt-4 text-center text-gray-600";const t=contactForm.querySelector('button[type="submit"]');t.disabled=!0,t.classList.add("opacity-50","cursor-not-allowed");new FormData(contactForm);try{await new Promise((e=>setTimeout(e,1500))),formStatus.textContent="Mensagem enviada!",formStatus.className="text-sm mt-4 text-center text-green-600",contactForm.reset()}catch(e){console.error("Form error:",e),formStatus.textContent="Erro ao enviar.",formStatus.className="text-sm mt-4 text-center text-red-600"}finally{t.disabled=!1,t.classList.remove("opacity-50","cursor-not-allowed")}}));

    // Listen to online/offline changes and update UI/trigger data sync if needed
    window.addEventListener('online', () => {
        updateOnlineStatus();
        console.log("Back online! Attempting to sync data.");
        loadWebsiteContent(); // Re-fetch from Supabase and update cache
    });
    window.addEventListener('offline', updateOnlineStatus);

}); // End DOMContentLoaded
