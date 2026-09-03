import { config } from '../src/config.js';
import { NubankWebProvider } from '../src/providers/nubank-web.provider.js';

const nubank = new NubankWebProvider({
  url: config.NUBANK_WEB_URL,
  profileDir: config.NUBANK_PROFILE_DIR,
  headless: false,
});

await nubank.interactiveLogin();

console.log('Perfil de sessão salvo localmente em:', config.NUBANK_PROFILE_DIR);
console.log('Não faça commit dessa pasta.');
