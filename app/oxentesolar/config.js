// config.js

// --- FIREBASE CONFIG ---
// Replace with your actual Firebase project configuration
const FIREBASE_CONFIG = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// --- SUPABASE CREDENTIALS ---
// Provided Supabase project details
const SUPABASE_URL = 'https://wrsjjnlpwwtrwekjhjcy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indyc2pqbmxwd3d0cndla2poamN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ4MDY5MjcsImV4cCI6MjA2MDM4MjkyN30.5hjlREAHW6Zd-PKTB3eGuKSbJFHSW5s8OCGd_jr-f4o';

// --- SUPABASE STORAGE CONFIG ---
// Public bucket name you created in Supabase for website assets
const BUCKET_NAME = 'oxentesolar'; // Make sure this bucket exists and has public read access configured

// --- IndexedDB Config ---
const DB_NAME = 'RogerioSolarSiteDB';
const DB_VERSION = 1; // Increment this if you change object store structure below
const STORES = {
    SETTINGS: 'website_settings', // Store single settings object (logo, hero, etc.)
    SOLUTIONS: 'solutions',       // Store array of solution objects
    PROJECTS: 'projects',         // Store array of project objects
    TESTIMONIALS: 'testimonials', // Store array of testimonial objects
    REELS: 'reels',               // Store array of reel objects
    BLOG: 'blog_posts'            // Store array of blog post objects
};

// Helper function to get Supabase public URL (adjust path if needed)
function getSupabasePublicUrl(filename) {
    if (!filename) return '';
    // Assumes files are stored at the root of the bucket. Adjust 'public/' if you use folders.
    return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${filename}`;
}

// Helper for generating unique filenames for Supabase upload
function generateUniqueFilename(file, prefix = 'asset') {
    const timestamp = Date.now();
    const randomSuffix = Math.random().toString(36).substring(2, 8);
    const extension = file.name.split('.').pop();
    // Basic sanitization: replace spaces and special characters
    const safeOriginalName = file.name.split('.').slice(0, -1).join('.')
                              .replace(/[^a-zA-Z0-9.\-_]/g, '_')
                              .substring(0, 50); // Limit length
    return `${prefix}_${timestamp}_${randomSuffix}_${safeOriginalName}.${extension}`;
}
