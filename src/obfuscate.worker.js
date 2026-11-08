import { obfuscate } from './obfuscator/index.js';
self.onmessage = ({ data }) => {
  try {
    self.postMessage({ result: obfuscate(data.source, data.options) });
  } catch (err) {
    self.postMessage({ error: { message: err.message, loc: err.loc } });
  }
};
