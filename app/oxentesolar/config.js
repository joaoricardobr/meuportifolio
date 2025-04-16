// config.js

// --- SUPABASE CREDENTIALS ---
const SUPABASE_URL = 'https://wrsjjnlpwwtrwekjhjcy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyc2pqbmxwd3d0cndla2poamN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MDY5MjcsImV4cCI6MjA2MDM4MjkyN30.5hjlREAHW6Zd-PKTB3eGuKSbJFHSW5s8OCGd_jr-f4o';

// --- SUPABASE STORAGE CONFIG ---
// Nome do bucket PÚBLICO no Supabase Storage.
// Certifique-se de que as políticas RLS permitam leitura pública e escrita autenticada.
const BUCKET_NAME = 'oxentesolar'; // Seu bucket

// --- IndexedDB Config ---
const DB_NAME = 'RogerioSolarSiteDB_Admin'; // Nome específico para o painel
const DB_VERSION = 1; // Incremente se mudar a estrutura
const STORES = {
    SOLUTIONS: 'solutions',
    PROJECTS: 'projects',
    TESTIMONIALS: 'testimonials',
    REELS: 'reels',
    BLOG_POSTS: 'blog_posts',
    // Adicione outras "tabelas" que você gerenciará
};

// --- Exportar configurações ---
// Disponibiliza globalmente para fácil acesso nos scripts do painel
window.appConfig = {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    BUCKET_NAME,
    DB_NAME,
    DB_VERSION,
    STORES
};

console.log("Configurações (config.js) carregadas.");
