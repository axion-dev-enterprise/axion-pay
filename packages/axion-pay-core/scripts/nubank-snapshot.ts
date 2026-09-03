import { config } from '../src/config.js';
import { NubankWebProvider } from '../src/providers/nubank-web.provider.js';

const nubank = new NubankWebProvider({
  url: config.NUBANK_WEB_URL,
  profileDir: config.NUBANK_PROFILE_DIR,
  headless: config.NUBANK_HEADLESS,
});

const snapshot = await nubank.snapshot();
console.log(JSON.stringify(snapshot, null, 2));
