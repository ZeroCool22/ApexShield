export function obfuscateAsync(source, options) {
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./obfuscate.worker.js', import.meta.url), { type: 'module' });
    const finish = (error, result) => {
      clearTimeout(timeout);
      worker.terminate();
      if (error) reject(error);
      else resolve(result);
    };
    const timeout = setTimeout(() => finish(new Error('Tiempo máximo de ofuscación excedido (60 s).')), 60000);
    worker.onmessage = ({ data }) => finish(data.error && Object.assign(new Error(data.error.message), { loc: data.error.loc }), data.result);
    worker.onerror = (err) => finish(new Error(err.message));
    worker.postMessage({ source, options });
  });
}
