// MongoDB initialization script
db = db.getSiblingDB('admin');

// Create databases for each service
const databases = ['ecommerce-auth', 'ecommerce-product', 'ecommerce-order', 'ecommerce-cart'];

databases.forEach(dbName => {
  db = db.getSiblingDB(dbName);
  
  // Create a dummy collection to ensure database exists
  db.createCollection('_init');
  
  print(`Database ${dbName} initialized`);
});

// Switch back to auth database and create indexes
db = db.getSiblingDB('ecommerce-auth');

// Create indexes for users collection
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ createdAt: 1 });
db.users.createIndex({ 'tokens.token': 1 });

// Create indexes for sessions collection
db.sessions.createIndex({ userId: 1 });
db.sessions.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });

print('MongoDB initialization completed');