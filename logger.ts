if (!(window as any).connectionLogs) {
  (window as any).connectionLogs = [];
}

export interface ConnectionLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export const addConnectionLog = (type: 'info' | 'success' | 'warning' | 'error', message: string) => {
  const logEntry: ConnectionLog = {
    timestamp: new Date().toLocaleTimeString(),
    type,
    message
  };
  (window as any).connectionLogs.push(logEntry);
  if ((window as any).connectionLogs.length > 100) {
    (window as any).connectionLogs.shift();
  }
  window.dispatchEvent(new CustomEvent('connection-log-updated'));
  console.log(`[Diagnostic] [${type.toUpperCase()}] ${message}`);
};
