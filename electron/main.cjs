const { app, BrowserWindow } = require('electron');
const path = require('path');
const dotenv = require('dotenv');

// Load environment variables from .env if present
dotenv.config({ path: path.join(__dirname, '../.env') });

let mainWindow;
let serverPort = 3000;

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 750,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    // Modern sleek titlebar matching the slate-900 theme
    frame: true,
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#0f172a',
      symbolColor: '#ffffff'
    },
    backgroundColor: '#0f172a',
  });

  // Wait a little extra to ensure port is open
  setTimeout(() => {
    mainWindow.loadURL(`http://localhost:${serverPort}/?standalone=true`);
  }, 1500);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

function getOpenPort() {
  const net = require('net');
  return new Promise((resolve) => {
    const srv = net.createServer();
    srv.listen(0, () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
  });
}

app.whenReady().then(async () => {
  // Set production so it serves dist/index.html instead of Vite dev middleware
  process.env.NODE_ENV = 'production';
  
  try {
    serverPort = await getOpenPort();
    process.env.PORT = serverPort;

    // Start our backend API server directly inside the Electron main process
    require(path.join(__dirname, '../dist/server.cjs'));
    createWindow();
  } catch (err) {
    console.error("Failed to start backend server inside Electron:", err);
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
