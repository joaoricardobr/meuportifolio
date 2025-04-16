// db.js - IndexedDB Helper Functions

async function openDB(dbName, version, stores) {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, version);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            console.log(`Upgrading DB to version ${version}`);
            stores.forEach(storeName => {
                if (!db.objectStoreNames.contains(storeName)) {
                    // Use 'key' for single settings, 'id' for list items
                    const keyPath = (storeName === 'website_settings') ? 'key' : 'id';
                    db.createObjectStore(storeName, { keyPath: keyPath });
                    console.log(`Object store created: ${storeName}`);
                }
                 // Add indexes if needed in the future
                 // Example: store.createIndex('by_title', 'title', { unique: false });
            });
        };

        request.onsuccess = (event) => {
            console.log(`DB "${dbName}" opened successfully.`);
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error(`IndexedDB error opening ${dbName}:`, event.target.error);
            reject(`IndexedDB error: ${event.target.error}`);
        };
    });
}

async function saveData(db, storeName, data) {
    return new Promise((resolve, reject) => {
        if (!db || !db.objectStoreNames.contains(storeName)) {
            return reject(`DB or Store "${storeName}" not available.`);
        }
        const transaction = db.transaction(storeName, 'readwrite');
        const store = transaction.objectStore(storeName);
        // Clear old data before putting new data for simplicity
        const clearRequest = store.clear();

        clearRequest.onsuccess = () => {
            console.log(`Store "${storeName}" cleared.`);
            // Handle single object or array
            const itemsToPut = Array.isArray(data) ? data : [data];
            if(itemsToPut.length === 0) {
                console.log(`No data provided to put into "${storeName}".`);
                resolve(); // Nothing to add
                return;
            }
            let putCount = 0;
            itemsToPut.forEach(item => {
                const putRequest = store.put(item);
                putRequest.onsuccess = () => {
                    putCount++;
                    if (putCount === itemsToPut.length) {
                        console.log(`Successfully put ${putCount} items into ${storeName}`);
                        // Transaction completes automatically on success
                    }
                };
                // Error on individual put is handled by transaction.onerror
            });
        };
         clearRequest.onerror = (event) => {
             console.error(`Error clearing store ${storeName}:`, event.target.error);
             reject(`Error clearing store: ${event.target.error}`);
         };


        transaction.oncomplete = () => {
            console.log(`Transaction complete for ${storeName}.`);
            resolve();
        };

        transaction.onerror = (event) => {
            console.error(`Transaction error saving to ${storeName}:`, event.target.error);
            reject(`Transaction error: ${event.target.error}`);
        };
    });
}


async function loadData(db, storeName) {
    return new Promise((resolve, reject) => {
         if (!db || !db.objectStoreNames.contains(storeName)) {
            console.warn(`DB or Store "${storeName}" not available for loading.`);
            return resolve(null); // Return null or empty array if store doesn't exist
        }
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.getAll(); // Get all records

        request.onsuccess = (event) => {
            console.log(`Data loaded from ${storeName}:`, event.target.result);
            resolve(event.target.result || []); // Return empty array if nothing found
        };

        request.onerror = (event) => {
            console.error(`Error loading data from ${storeName}:`, event.target.error);
            reject(`Error loading data: ${event.target.error}`);
        };
    });
}

async function loadSingleSetting(db, storeName, key) {
     return new Promise((resolve, reject) => {
         if (!db || !db.objectStoreNames.contains(storeName)) {
            console.warn(`DB or Store "${storeName}" not available for loading setting.`);
            return resolve(null);
         }
        const transaction = db.transaction(storeName, 'readonly');
        const store = transaction.objectStore(storeName);
        const request = store.get(key); // Get single record by key

        request.onsuccess = (event) => {
            console.log(`Setting loaded from ${storeName} for key ${key}:`, event.target.result);
            resolve(event.target.result || null); // Return null if not found
        };

        request.onerror = (event) => {
            console.error(`Error loading setting from ${storeName} for key ${key}:`, event.target.error);
            reject(`Error loading setting: ${event.target.error}`);
        };
    });
}
