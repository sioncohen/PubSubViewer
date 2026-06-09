const { app, BrowserWindow } = require('electron')
const http = require('http')

const DEV_URL = 'http://localhost:5173'

// Poll until the Vite dev server is accepting connections
function waitForServer(url, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http.get(url, (res) => {
        res.resume()
        resolve()
      }).on('error', () => {
        if (n <= 0) {
          reject(new Error(`Dev server at ${url} did not start in time`))
          return
        }
        setTimeout(() => attempt(n - 1), 1000)
      })
    }
    attempt(maxAttempts)
  })
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  })
  win.loadURL(DEV_URL)
}

app.whenReady().then(async () => {
  await waitForServer(DEV_URL)
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => app.quit())
