const noop = (): void => {};
const noopAsync = async (): Promise<void> => {};

class MockBrowserWindow {
  static getAllWindows(): MockBrowserWindow[] {
    return [];
  }

  static getFocusedWindow(): MockBrowserWindow | null {
    return null;
  }

  public webContents = {
    send: noop,
    on: noop,
    once: noop,
    setWindowOpenHandler: () => ({ action: 'deny' as const }),
  };

  loadURL = noopAsync;
  loadFile = noopAsync;
  on = noop;
  once = noop;
  show = noop;
  hide = noop;
  close = noop;
  destroy = noop;
  focus = noop;
  restore = noop;
  minimize = noop;
  maximize = noop;
  unmaximize = noop;
  setMenuBarVisibility = noop;
  setBackgroundColor = noop;

  isDestroyed(): boolean {
    return false;
  }

  isMinimized(): boolean {
    return false;
  }

  isMaximized(): boolean {
    return false;
  }
}

class MockTray {
  constructor(_image?: string) {}

  setToolTip = noop;
  setContextMenu = noop;
  on = noop;
  destroy = noop;
}

export const app = {
  isPackaged: false,
  name: 'open-cowork-test',
  commandLine: {
    appendSwitch: noop,
  },
  dock: {
    setMenu: noop,
  },
  disableHardwareAcceleration: noop,
  requestSingleInstanceLock: () => true,
  getPath: (_name: string) => '/tmp/open-cowork-test',
  getVersion: () => '0.0.0-test',
  getName: () => 'open-cowork-test',
  getLocale: () => 'en',
  getAppPath: () => process.cwd(),
  whenReady: () => Promise.resolve(),
  on: noop,
  once: noop,
  quit: noop,
};

export const ipcMain = {
  on: noop,
  handle: noop,
  removeAllListeners: noop,
  removeHandler: noop,
};

export const ipcRenderer = {
  on: noop,
  once: noop,
  send: noop,
  sendSync: () => null,
  invoke: async () => null,
  removeAllListeners: noop,
  removeListener: noop,
};

export const dialog = {
  showOpenDialog: async () => ({ canceled: true, filePaths: [] as string[] }),
  showMessageBox: async () => ({ response: 0 }),
  showErrorBox: noop,
  showSaveDialog: async () => ({ canceled: true, filePath: undefined as string | undefined }),
};

export const shell = {
  openExternal: noopAsync,
  openPath: async () => '',
  showItemInFolder: noop,
};

export const nativeTheme = {
  shouldUseDarkColors: false,
  themeSource: 'light',
  on: noop,
};

export const Menu = {
  buildFromTemplate: () => ({}),
  setApplicationMenu: noop,
};

export const BrowserWindow = MockBrowserWindow;
export const Tray = MockTray;

export const contextBridge = {
  exposeInMainWorld: noop,
};

const electron = {
  app,
  ipcMain,
  ipcRenderer,
  dialog,
  shell,
  nativeTheme,
  Menu,
  BrowserWindow,
  Tray,
  contextBridge,
};

export default electron;
