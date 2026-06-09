const { app, BrowserWindow } = require('electron')
const http = require('http')
const path = require('path')

const isDev = !app.isPackaged

function waitForServer(port, maxAttempts = 30) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http.get(`http://localhost:${port}`, (res) => {
        res.resume()
        resolve()
      }).on('error', () => {
        if (n <= 0) return reject(new Error(`Server on port ${port} did not start in time`))
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

  if (isDev) {
    win.loadURL('http://localhost:5173')
  } else {
    win.loadFile(path.join(__dirname, '../frontend/dist/index.html'))
  }
}

app.whenReady().then(async () => {
  if (isDev) {
    // Dev: wait for Vite dev server
    await waitForServer(5173)
  } else {
    // Prod: start Express backend in-process, then wait for it
    require(path.join(__dirname, '../backend/dist/index.js'))
    await waitForServer(3001)
  }

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => app.quit())
