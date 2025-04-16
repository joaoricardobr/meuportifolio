// config.js

// --- SUPABASE CREDENTIALS ---
// Provided Supabase project details
const SUPABASE_URL = 'https://wrsjjnlpwwtrwekjhjcy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyc2pqbmxwd3d0cndla2poamN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MDY5MjcsImV4cCI6MjA2MDM4MjkyN30.5hjlREAHW6Zd-PKTB3eGuKSbJFHSW5s8OCGd_jr-f4o';

// --- SUPABASE STORAGE CONFIG ---
// !!! IMPORTANT: REPLACE 'public-assets' with the actual name of your PUBLIC Supabase Storage bucket !!!
// Make sure RLS policies allow authenticated users to upload/delete in this bucket.
const BUCKET_NAME = 'oxentesolar01';

// --- IndexedDB Config ---
const DB_NAME = 'RogerioSolarSiteDB';
const DB_VERSION = 1; // Increment this if you change object store structure
const STORES = ['website_settings', 'solutions', 'projects', 'testimonials', 'reels', 'blog_posts']; // Names matching Supabase tables
