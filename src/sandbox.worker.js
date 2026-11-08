function format(value) {
  if (typeof value !== 'object' || value === null) return String(value);
  try { return JSON.stringify(value, null, 2); }
  catch { return Object.prototype.toString.call(value); }
}
self.onmessage = async ({ data: code }) => {
  const send = self.postMessage.bind(self);
  let lines = 0;
  const report = (message, type = 'log', done = false) => {
    if (done || lines++ < 500) send({message, type, done});
  };
  const customConsole = Object.fromEntries(
    ['log', 'warn', 'info', 'error', 'exception', 'table', 'trace'].map(type =>
      [type, (...args) => report(args.map(format).join(' '), type === 'error' ? 'error' : 'log')])
  );
  try {
    const result = await new Function('console', code)(customConsole);
    if (result !== undefined) report('[RETURN] ' + format(result), 'return');
    report('[SANDBOX] Ejecución completada sin excepciones.', 'success', true);
  } catch (err) {
    report('[ERROR EN EJECUCIÓN] ' + err.message, 'error', true);
  }
};
