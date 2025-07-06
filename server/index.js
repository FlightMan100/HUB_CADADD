import express from 'express';
import session from 'express-session';
import passport from 'passport';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import helmet from 'helmet';
import MySQLStore from 'express-mysql-session';
import { getDatabase } from './config/database.js';

import { initializeDatabase, closeDatabase } from './config/database.js';
import { initializeStaffDatabase } from './config/staffDatabase.js';
import { initializeTimeclockDatabase } from './config/timeclockDatabase.js';
import { configurePassport } from './config/passport.js';
import authRoutes from './routes/auth.js';
import apiRoutes from './routes/api.js';
import profileRoutes from './routes/profile.js';
import timeclockRoutes from './routes/timeclock.js';
import departmentsRoutes from './routes/departments.js';
import dmvRoutes from './routes/dmv.js';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3002;
const NODE_ENV = process.env.NODE_ENV || 'development';

// CRITICAL: Trust proxy MUST be set FIRST and ALWAYS for NGINX reverse proxy
app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use(limiter);
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = NODE_ENV === 'production' 
      ? [process.env.VITE_APP_URL || 'http://localhost:5173']
      : ['http://localhost:5173', 'http://localhost:3002'];
    
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));

// CRITICAL: Add CORS headers manually for extra safety in production
app.use((req, res, next) => {
  if (NODE_ENV === 'production') {
    const origin = req.get('Origin');
    const allowedOrigin = process.env.VITE_APP_URL || 'http://localhost:5173';
    if (origin && origin === allowedOrigin) {
      res.header('Access-Control-Allow-Origin', origin);
      res.header('Access-Control-Allow-Credentials', 'true');
      res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, Cookie');
    }
  }
  next();
});

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Initialize databases and passport
async function startServer() {
  try {
    // Initialize main database
    await initializeDatabase();
    
    // Initialize MySQL session store
    const MySQLStoreSession = MySQLStore(session);
    const sessionStore = new MySQLStoreSession({}, getDatabase());

    // CRITICAL: Fixed session configuration for NGINX SSL termination
    const sessionConfig = {
      secret: process.env.SESSION_SECRET || 'fallback-secret-key-change-in-production',
      resave: false,
      saveUninitialized: false,
      store: sessionStore,
      cookie: {
        // CRITICAL: Cookie security settings for NGINX SSL termination
        secure: NODE_ENV === 'production', // Will work correctly with trust proxy
        httpOnly: true, // Prevent XSS
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        sameSite: NODE_ENV === 'production' ? 'none' : 'lax', // CRITICAL: 'none' for cross-domain
        domain: NODE_ENV === 'production' ? '.lynus.gg' : undefined, // CRITICAL: Shared domain with dot prefix
        path: '/' // Ensure cookie is available on all paths
      },
      name: 'sessionId', // Consistent session name
      proxy: true, // CRITICAL: Must be true for NGINX reverse proxy
      rolling: true // Refresh session on each request
    };

    app.use(session(sessionConfig));
    
    // Initialize staff database (optional)
    try {
      await initializeStaffDatabase();
    } catch (error) {
      console.warn('⚠️ Staff database not available - profile features will be limited');
    }
    
    // Initialize timeclock database (optional)
    try {
      await initializeTimeclockDatabase();
    } catch (error) {
      console.warn('⚠️ Timeclock database not available - timeclock features will be limited');
    }
    
    // Configure passport
    await configurePassport();
    
    // Passport configuration
    app.use(passport.initialize());
    app.use(passport.session());

    // Serve static files from React build in production
    if (NODE_ENV === 'production') {
      const buildPath = path.join(__dirname, '../dist');
      app.use(express.static(buildPath, {
        maxAge: '1y',
        etag: true,
        lastModified: true
      }));
    }

    // API Routes
    app.use('/auth', authRoutes);
    app.use('/api', apiRoutes);
    app.use('/api/profile', profileRoutes);
    app.use('/api/timeclock', timeclockRoutes);
    app.use('/api/departments', departmentsRoutes);
    app.use('/api/dmv', dmvRoutes);
    
    // Health check endpoint with enhanced session info
    app.get('/health', (req, res) => {
      res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        environment: NODE_ENV,
        uptime: process.uptime(),
        port: PORT,
        session: {
          configured: !!req.sessionID,
          authenticated: req.isAuthenticated ? req.isAuthenticated() : false,
          cookieConfig: sessionConfig.cookie,
          hasUser: !!req.user,
          sessionID: req.sessionID
        },
        cors: {
          origin: req.get('Origin'),
          allowedOrigins: 'Dynamic based on environment'
        },
        proxy: {
          trustProxy: app.get('trust proxy'),
          secure: req.secure, // Should be true in production
          protocol: req.protocol, // Should be https in production
          ip: req.ip,
          // CRITICAL: Show proxy headers for debugging
          headers: {
            'x-forwarded-proto': req.get('X-Forwarded-Proto'),
            'x-forwarded-for': req.get('X-Forwarded-For'),
            'x-forwarded-host': req.get('X-Forwarded-Host')
          }
        }
      });
    });

    // Serve React app for all other routes in production
    if (NODE_ENV === 'production') {
      app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, '../dist/index.html'));
      });
    }
    
    // Global error handling middleware
    app.use((err, req, res, next) => {
      console.error('🚨 Server Error:', err);
      
      // Don't leak error details in production
      const errorMessage = NODE_ENV === 'production' 
        ? 'Internal server error' 
        : err.message;
      
      res.status(err.status || 500).json({ 
        error: errorMessage,
        ...(NODE_ENV === 'development' && { stack: err.stack })
      });
    });

    // 404 handler for API routes
    app.use('/api/*', (req, res) => {
      res.status(404).json({ error: 'API endpoint not found' });
    });
    
    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🌍 Environment: ${NODE_ENV}`);
      console.log(`🔒 Trust Proxy: ${app.get('trust proxy')}`);
      console.log(`🍪 Session Config:`, {
        secure: sessionConfig.cookie.secure,
        sameSite: sessionConfig.cookie.sameSite,
        domain: sessionConfig.cookie.domain,
        proxy: sessionConfig.proxy
      });
      if (NODE_ENV === 'development') {
        console.log(`🔐 Auth URL: http://localhost:${PORT}/auth/discord`);
      } else {
        console.log(`🌐 Production API: https://hubapi.lynus.gg`);
        console.log(`🌐 Production Frontend: https://hub.lynus.gg`);
        console.log(`🔐 Auth URL: https://hubapi.lynus.gg/auth/discord`);
        console.log(`⚠️ IMPORTANT: Ensure NGINX forwards these headers:`);
        console.log(`   - X-Forwarded-Proto: https`);
        console.log(`   - X-Forwarded-For: $remote_addr`);
        console.log(`   - X-Forwarded-Host: $host`);
      }
    });

    // Add MySQL session store cleanup on server shutdown
    process.on('SIGINT', async () => {
      await sessionStore.close();
      await closeDatabase();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await sessionStore.close();
      await closeDatabase();
      process.exit(0);
    });
    
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();