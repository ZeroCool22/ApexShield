import { startRecovery } from './recovery.js';

const recovery = await startRecovery();
try {
  await import('./main.js');
  recovery.ready();
} catch (err) {
  console.error('No se pudo iniciar la interfaz:', err);
  recovery.failed();
}
