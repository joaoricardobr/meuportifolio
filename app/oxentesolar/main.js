// main.js - Logic for index.html

// --- Global Supabase Client (initialized if config is valid) ---
let supabase = null;
try {
    if (typeof SUPABASE_URL !== 'undefined' && SUPABASE_URL && SUPABASE_URL !== 'YOUR_SUPABASE_URL' &&
        typeof SUPABASE_ANON_KEY !== 'undefined' && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'YOUR_SUPABASE_ANON_KEY')
    {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log("Supabase client initialized for index.html.");
    } else {
        console.warn("Supabase URL/Key not configured in config.js. Cannot load dynamic content.");
    }
} catch (error) {
    console.error("Error initializing Supabase in index.html:", error);
}


// --- Load Website Content ---
async function loadWebsiteContent() {
    console.log("Loading website content...");
    const elementsToUpdate = document.querySelectorAll('[data-content-key]');
    elementsToUpdate.forEach(el => { if (el.tagName !== 'IMG') el.classList.add('loading-placeholder'); });
    document.querySelectorAll('.grid-placeholder').forEach(el => el.classList.remove('hidden'));

    if (!supabase) {
        console.warn("Supabase not available, cannot load dynamic content.");
        elementsToUpdate.forEach(el => {
            const key = el.dataset.contentKey || 'unknown';
            if (el.tagName !== 'IMG') el.textContent = `[${key} - Erro DB]`;
            else { el.src = 'placeholder-error.png'; el.alt = `[${key} - Erro DB]`; }
            el.classList.remove('loading-placeholder');
        });
        document.querySelectorAll('.grid-placeholder').forEach(el => el.textContent = 'Erro: Não foi possível conectar ao banco de dados.');
        return;
    }

    try {
        // --- Fetch Data (Concurrent) ---
        const [
            settingsRes, solutionsRes, projectsRes, testimonialsRes, reelsRes, blogPostsRes
        ] = await Promise.all([
            supabase.from('website_settings').select('*').eq('id', 1).maybeSingle(),
            supabase.from('solutions').select('*').order('order_index'),
            supabase.from('projects').select('*').order('order_index'),
            supabase.from('testimonials').select('*').order('order_index'),
            supabase.from('reels').select('*').order('order_index'),
            supabase.from('blog_posts').select('*').order('published_at', { ascending: false })
        ]).catch(err => { // Catch errors from Promise.all itself (like network errors)
            console.error("Error during Promise.all fetch:", err);
            throw new Error("Network or Supabase error during data fetch.");
        });

        // --- Check for Errors in Responses ---
        if (settingsRes.error && settingsRes.error.code !== 'PGRST116') throw settingsRes.error;
        if (solutionsRes.error) throw solutionsRes.error;
        if (projectsRes.error) throw projectsRes.error;
        if (testimonialsRes.error) throw testimonialsRes.error;
        if (reelsRes.error) throw reelsRes.error;
        if (blogPostsRes.error) throw blogPostsRes.error;

        // --- Process Data ---
        const settings = settingsRes.data;
        const solutions = solutionsRes.data;
        const projects = projectsRes.data;
        const testimonials = testimonialsRes.data;
        const reels = reelsRes.data;
        const blogPosts = blogPostsRes.data;

        console.log("Data fetched successfully.");

        // --- Update Single Elements ---
        if (settings) {
            const siteLogo = document.getElementById('site-logo');
            const footerLogo = document.getElementById('footer-logo');
            if (siteLogo) siteLogo.src = settings.site_logo_url || 'placeholder-logo.png';
            if (footerLogo) footerLogo.src = settings.site_logo_url || 'placeholder-logo.png';

            const heroSection = document.getElementById('home');
            if (heroSection && settings.hero_bg_image_url) {
                heroSection.style.backgroundImage = `linear-gradient(rgba(0, 86, 179, 0.85), rgba(0, 86, 179, 0.85)), url('${settings.hero_bg_image_url}')`;
            } else {
                 heroSection.style.backgroundColor = '#0056b3'; // Fallback color if no image
            }

            const heroTitleEl = document.getElementById('hero-title');
            const heroSubtitleEl = document.getElementById('hero-subtitle');
            const heroTextEl = document.getElementById('hero-text');
            const aboutImageEl = document.getElementById('about-image');
            const aboutTitleEl = document.getElementById('about-title');
            const aboutTextEl = document.getElementById('about-text');

            if(heroTitleEl) heroTitleEl.textContent = settings.hero_title || 'Título Principal';
            if(heroSubtitleEl) heroSubtitleEl.textContent = settings.hero_subtitle || 'Subtítulo';
            if(heroTextEl) heroTextEl.textContent = settings.hero_text || 'Texto Principal';
            if(aboutImageEl) aboutImageEl.src = settings.about_image_url || 'placeholder-about.png';
            if(aboutTitleEl) aboutTitleEl.textContent = settings.about_title || 'Sobre Título';
            if(aboutTextEl) aboutTextEl.textContent = settings.about_text || 'Sobre Texto';

        } else {
            console.warn("No settings found in database.");
            // Set default text for non-image elements if settings are missing
             document.getElementById('hero-title').textContent = 'Título Principal Padrão';
             document.getElementById('hero-subtitle').textContent = 'Subtítulo Padrão';
             document.getElementById('hero-text').textContent = 'Texto Principal Padrão';
             document.getElementById('about-title').textContent = 'Título Sobre Padrão';
             document.getElementById('about-text').textContent = 'Texto Sobre Padrão';
        }
        document.querySelectorAll('#hero-title, #hero-subtitle, #hero-text, #about-title, #about-text').forEach(el => el?.classList.remove('loading-placeholder'));

        // --- Update Lists ---
        // Solutions
         const solGrid = document.getElementById('solutions-grid');
         if (solGrid) {
             solGrid.innerHTML = ''; solGrid.classList.remove('grid-placeholder');
             if(solutions?.length) {
                 solutions.forEach(item => {
                     const featuresHtml = (item.features || []).map(f => `<li class="flex items-start"><i class="fas fa-check text-fortlevOrange mr-2 mt-1 shrink-0"></i><span>${f}</span></li>`).join('');
                     solGrid.innerHTML += `<div class="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition duration-300 card-hover flex flex-col animate-on-scroll" data-animation="slide-up"><img src="${item.image_url || 'placeholder-solution.png'}" loading="lazy" alt="${item.title || 'Solução'}" class="w-full h-52 object-cover content-img"><div class="p-6 flex flex-col flex-grow"><div class="flex items-center mb-3"><div class="bg-fortlevBlue bg-opacity-10 p-2 rounded-full mr-3"><i class="fas fa-puzzle-piece text-fortlevBlue text-lg"></i></div><h3 class="text-xl font-semibold text-fortlevDark">${item.title || ''}</h3></div><p class="text-gray-600 text-sm mb-4 flex-grow">${item.description || ''}</p><ul class="text-gray-600 text-xs space-y-2 mb-4">${featuresHtml}</ul></div></div>`;
                 });
             } else { solGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-8">Nenhuma solução cadastrada.</p>'; }
         }

         // Projects
          const projGrid = document.getElementById('projects-grid');
          if (projGrid) {
              projGrid.innerHTML = ''; projGrid.classList.remove('grid-placeholder');
              if(projects?.length) {
                  projects.forEach(item => {
                      projGrid.innerHTML += `<div class="relative rounded-lg overflow-hidden shadow-md project-card group animate-on-scroll" data-animation="fade-in"><img src="${item.image_url || 'placeholder-project.png'}" loading="lazy" alt="${item.title || 'Projeto'}" class="w-full h-72 object-cover transform group-hover:scale-105 transition duration-300 content-img"><div class="absolute inset-0 project-overlay flex flex-col justify-end p-6 text-white"><h3 class="text-xl font-bold mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-100">${item.title || ''}</h3><p class="text-sm mb-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-200"><i class="fas fa-solar-panel mr-1 opacity-70"></i> ${item.kwp || ''}</p><p class="text-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-300"><i class="fas fa-coins mr-1 opacity-70"></i> ${item.savings || ''}</p></div></div>`;
                  });
              } else { projGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-8">Nenhum projeto cadastrado.</p>'; }
          }

         // Testimonials
          const testGrid = document.getElementById('testimonials-grid');
          if (testGrid) {
              testGrid.innerHTML = ''; testGrid.classList.remove('grid-placeholder');
              if(testimonials?.length) {
                  testimonials.forEach(item => {
                      let starsHtml = Array(5).fill(0).map((_, i) => `<i class="fas fa-star ${i < (item.rating || 0) ? 'text-yellow-400' : 'text-gray-300'} ml-1"></i>`).join('');
                      testGrid.innerHTML += `<div class="bg-white p-6 rounded-lg testimonial-card animate-on-scroll" data-animation="slide-up"><div class="flex items-center mb-4"><img src="${item.image_url || 'placeholder-person.png'}" loading="lazy" alt="Cliente ${item.name || ''}" class="w-14 h-14 rounded-full mr-4 border-2 border-fortlevOrange p-0.5 object-cover content-img"><div><h4 class="font-semibold text-fortlevDark">${item.name || ''}</h4><p class="text-sm text-gray-500">${item.location || ''}</p><div class="flex text-sm mt-1">${starsHtml}</div></div></div><p class="text-gray-600 italic text-sm leading-relaxed">"${item.quote || ''}"</p></div>`;
                  });
              } else { testGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-8">Nenhum depoimento.</p>'; }
          }

         // Reels
          const reelsGrid = document.getElementById('reels-grid');
          if (reelsGrid) {
              reelsGrid.innerHTML = ''; reelsGrid.classList.remove('grid-placeholder');
               if(reels?.length) {
                   reels.forEach(item => {
                       reelsGrid.innerHTML += `<div class="reel-thumbnail relative rounded-lg overflow-hidden shadow-md group cursor-pointer aspect-w-9 aspect-h-16 animate-on-scroll" data-animation="fade-in" data-reel-url="${item.video_url || '#'}"><img src="${item.thumbnail_url || 'placeholder-reel.png'}" loading="lazy" alt="${item.title || 'Reel'}" class="w-full h-full object-cover content-img"><div class="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center"><div class="play-icon bg-white bg-opacity-80 rounded-full w-10 h-10 flex items-center justify-center text-fortlevDark transition duration-300"><i class="fas fa-play"></i></div></div><div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2"><h3 class="text-white font-medium text-xs truncate">${item.title || ''}</h3></div></div>`;
                   });
               } else { reelsGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-8">Nenhum reel.</p>'; }
          }

         // Blog Posts
          const blogGrid = document.getElementById('blog-grid');
          if (blogGrid) {
              blogGrid.innerHTML = ''; blogGrid.classList.remove('grid-placeholder');
              if(blogPosts?.length) {
                  blogPosts.forEach(post => {
                      const pubDate = post.published_at ? new Date(post.published_at).toLocaleDateString('pt-BR') : 'N/A';
                      const words = post.excerpt?.split(' ').length || 0;
                      const readTime = Math.ceil(words / 200);
                      // IMPORTANT: Link href should eventually point to a detail page, e.g., `/blog/${post.slug}`
                      blogGrid.innerHTML += `<article class="bg-white rounded-lg overflow-hidden shadow-md hover:shadow-lg transition duration-300 card-hover flex flex-col animate-on-scroll" data-animation="slide-up"><a href="#" class="block"><img src="${post.image_url || 'placeholder-blog.png'}" loading="lazy" alt="${post.title || 'Blog Post'}" class="w-full h-52 object-cover content-img"></a><div class="p-6 flex flex-col flex-grow"><div class="flex items-center text-xs text-gray-500 mb-3"><span class="mr-3"><i class="far fa-calendar-alt mr-1"></i>${pubDate}</span><span><i class="far fa-clock mr-1"></i>${readTime} min</span></div><h3 class="text-lg font-semibold text-fortlevDark mb-3 flex-grow"><a href="#" class="hover:text-fortlevOrange transition">${post.title || ''}</a></h3><p class="text-gray-600 text-sm mb-4">${post.excerpt || ''}</p><a href="#" class="text-fortlevOrange font-medium inline-flex items-center text-sm mt-auto"> Ler Mais <i class="fas fa-arrow-right ml-2 text-xs"></i> </a></div></article>`;
                  });
               } else { blogGrid.innerHTML = '<p class="text-center text-gray-500 col-span-full py-8">Nenhum post.</p>'; }
          }

          // Re-initialize scroll animations after content loaded
          const animatedElements = document.querySelectorAll(".animate-on-scroll");
          const scrollObserverOptions = { threshold: 0.1, rootMargin: "0px 0px -30px 0px" }; // Adjust threshold/margin
          const scrollObserver = new IntersectionObserver((entries, observer) => {
              entries.forEach(entry => {
                  // Check if already animated to prevent re-triggering if observer options change
                  if (entry.isIntersecting && !entry.target.classList.contains('animated-fade-in') && !entry.target.classList.contains('animated-slide-up')) {
                      const element = entry.target;
                      const animationType = element.dataset.animation || "fade-in";
                      const delay = element.dataset.animationDelay || "0";
                      element.style.transitionDelay = `${delay}ms`;
                      element.classList.add(animationType === "slide-up" ? "animated-slide-up" : "animated-fade-in");
                      element.style.opacity = 1;
                      // Keep observing or unobserve? Unobserving is usually better for performance.
                      observer.unobserve(element);
                  }
              });
          }, scrollObserverOptions);
          animatedElements.forEach(el => { scrollObserver.observe(el); });


    } catch (error) {
         console.error("Error loading dynamic content:", error);
         alert(`Erro CRÍTICO ao carregar conteúdo do site: ${error.message}\nVerifique a conexão e a configuração do Supabase.`);
         document.querySelectorAll('.loading-placeholder').forEach(el => { el.textContent = `[Erro]`; el.classList.remove('loading-placeholder');});
         document.querySelectorAll('.grid-placeholder').forEach(el => el.textContent = 'Erro ao carregar itens.');
    } finally {
         document.querySelectorAll('.loading-placeholder').forEach(el => el.classList.remove('loading-placeholder'));
         document.querySelectorAll('.grid-placeholder').forEach(el => { if(el.innerHTML.trim() === '') el.innerHTML = '<p class="text-center text-gray-500 col-span-full py-8">Conteúdo não disponível.</p>';});
    }
}

// --- Initial Load and Other JS ---
document.addEventListener('DOMContentLoaded', () => {
    loadWebsiteContent(); // Load content when the page is ready

    // Mobile Menu
    const menuToggle=document.getElementById("menu-toggle"),mobileMenu=document.getElementById("mobile-menu");menuToggle?.addEventListener("click",(()=>{mobileMenu.classList.toggle("hidden"),menuToggle.querySelector("i").classList.toggle("fa-bars"),menuToggle.querySelector("i").classList.toggle("fa-times")})),mobileMenu?.querySelectorAll("a").forEach((e=>{e.addEventListener("click",(()=>{mobileMenu.classList.add("hidden"),menuToggle.querySelector("i").classList.remove("fa-times"),menuToggle.querySelector("i").classList.add("fa-bars")}))}));
    // FAQ Accordion
    const faqQuestions=document.querySelectorAll(".faq-question");faqQuestions.forEach((e=>{e.addEventListener("click",(()=>{const t=e.nextElementSibling,o=e.classList.contains("open");e.classList.toggle("open",!o),t.classList.toggle("hidden",o)}))}));
    // Footer Year
    const currentYearEl = document.getElementById("current-year");
    if (currentYearEl) currentYearEl.textContent = (new Date).getFullYear();
    // Calculator
    const calculateBtn=document.getElementById("calculate-btn");calculateBtn&&calculateBtn.addEventListener("click",(()=>{const e=document.getElementById("calc-consumption"),t=document.getElementById("calc-tariff"),o=document.getElementById("calculator-result"),n=document.getElementById("savings-result"),a=document.getElementById("system-size"),l=document.getElementById("payback"),s=parseFloat(e.value),i=parseFloat(t.value);if(!isNaN(s)&&s>0&&!isNaN(i)&&i>0){const c=115,d=Math.ceil(s/c*10)/10,r=s*i*.93,u=4800,m=d*u,f=12*r,p=(m/f).toFixed(1);n.textContent=`R$ ${r.toFixed(2).replace(".",",")}`,a.textContent=`${d.toFixed(1).replace(".",",")} kWp`,l.textContent=`${p.replace(".",",")} anos`,o.classList.remove("hidden")}else o.classList.add("hidden"),isNaN(s)||s<=0?(e.focus(),alert("Insira consumo válido.")):(isNaN(i)||i<=0)&&(t.focus(),alert("Insira tarifa válida."))}));
    // Stats Counter
    const statsCounters=document.querySelectorAll("[data-count]"),countUp=((e,t,o=2e3)=>{let n=0;const a=Math.abs(Math.floor(o/t)),l=setInterval((()=>{n+=1,e.textContent=n,n===t&&clearInterval(l)}),a<10?10:a)}),statsObserver=new IntersectionObserver(((e,t)=>{e.forEach((e=>{if(e.isIntersecting){const o=e.target,n=+o.dataset.count;!isNaN(n)&&"0"===o.textContent&&countUp(o,n)}}))}),{threshold:.5});statsCounters.forEach((e=>{statsObserver.observe(e)}));
    // Video Modal Placeholder Click (needs real implementation)
    document.body.addEventListener('click', function(event) {
        const thumb = event.target.closest('.video-thumbnail, .reel-thumbnail');
        if(thumb) {
            const videoUrl = thumb.dataset.videoUrl || thumb.dataset.reelUrl;
            if (videoUrl && videoUrl !== '#') {
                console.log("Open video modal for:", videoUrl);
                alert(`Simulação: Abrir vídeo ${videoUrl}\n(Implementar Lightbox/Modal)`);
            } else {
                console.warn("No valid video URL found for this thumbnail.");
            }
        }
    });
    // Contact Form Submission (Static - No DB interaction here)
    const contactForm=document.getElementById("contact-form"),formStatus=document.getElementById("form-status");contactForm&&contactForm.addEventListener("submit",(async e=>{e.preventDefault(),formStatus.textContent="Enviando...",formStatus.className="text-sm mt-4 text-center text-gray-600";const t=contactForm.querySelector('button[type="submit"]');t.disabled=!0,t.classList.add("opacity-50","cursor-not-allowed");new FormData(contactForm);try{await new Promise((e=>setTimeout(e,1500))),formStatus.textContent="Mensagem enviada!",formStatus.className="text-sm mt-4 text-center text-green-600",contactForm.reset()}catch(e){console.error("Form error:",e),formStatus.textContent="Erro ao enviar.",formStatus.className="text-sm mt-4 text-center text-red-600"}finally{t.disabled=!1,t.classList.remove("opacity-50","cursor-not-allowed")}}));

});
    </script>
</body>
</html>
