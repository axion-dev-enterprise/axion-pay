import { chromium, type BrowserContext, type Page } from 'playwright';
import type { AccountSnapshot } from '../core/types.js';

type NubankWebConfig = {
  url: string;
  profileDir: string;
  headless: boolean;
};

/**
 * Adapter propositalmente limitado a leitura/conciliação.
 *
 * Ele reutiliza um perfil persistente do Chromium após o próprio usuário
 * autenticar manualmente no Nubank. Não lê senha, não captura MFA e não
 * extrai tokens/cookies para uso fora do navegador.
 */
export class NubankWebProvider {
  public readonly name = 'nubank-web';

  constructor(private readonly cfg: NubankWebConfig) {}

  async openContext(): Promise<BrowserContext> {
    return chromium.launchPersistentContext(this.cfg.profileDir, {
      headless: this.cfg.headless,
      viewport: { width: 1440, height: 1000 },
    });
  }

  async interactiveLogin(): Promise<void> {
    const context = await chromium.launchPersistentContext(this.cfg.profileDir, {
      headless: false,
      viewport: { width: 1440, height: 1000 },
    });

    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(this.cfg.url, { waitUntil: 'domcontentloaded' });

    console.log('');
    console.log('Faça o login manualmente no Nubank PJ nesta janela.');
    console.log('Conclua qualquer MFA/validação diretamente no Nubank.');
    console.log('Quando a home da conta estiver aberta, volte ao terminal e pressione ENTER.');
    console.log('');

    await waitForEnter();

    await context.close();
  }

  async snapshot(): Promise<AccountSnapshot> {
    const context = await this.openContext();

    try {
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto(this.cfg.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2500);

      const bodyText = await page.locator('body').innerText();

      if (
        /entrar|login|acessar conta/i.test(bodyText) &&
        !/saldo disponível/i.test(bodyText)
      ) {
        throw new Error(
          'Sessão Nubank não autenticada ou expirada. Execute npm run nubank:login novamente.',
        );
      }

      const balanceCents = parseBrazilianBalanceNearLabel(
        bodyText,
        'Saldo disponível',
      );

      return {
        source: this.name,
        balanceCents,
        capturedAt: new Date().toISOString(),
        raw: {
          url: page.url(),
          balanceTextDetected: balanceCents !== undefined,
          visibleTextPreview: bodyText.slice(0, 6000),
        },
      };
    } finally {
      await context.close();
    }
  }

  async readStatementText(): Promise<string> {
    const context = await this.openContext();

    try {
      const page = context.pages()[0] ?? (await context.newPage());
      await page.goto(this.cfg.url, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const statementButton = page.getByText(/acessar extrato/i).first();

      if (await statementButton.count()) {
        await statementButton.click();
        await page.waitForTimeout(1800);
      }

      return page.locator('body').innerText();
    } finally {
      await context.close();
    }
  }
}

function parseBrazilianBalanceNearLabel(
  text: string,
  label: string,
): number | undefined {
  const idx = text.toLowerCase().indexOf(label.toLowerCase());
  if (idx === -1) return undefined;

  const slice = text.slice(idx, idx + 250);
  const match = slice.match(/R\$\s*([\d.]+,\d{2})/);

  if (!match) return undefined;

  const normalized = match[1].replace(/\./g, '').replace(',', '.');
  const value = Number(normalized);

  if (!Number.isFinite(value)) return undefined;

  return Math.round(value * 100);
}

function waitForEnter(): Promise<void> {
  return new Promise((resolve) => {
    process.stdin.resume();
    process.stdin.once('data', () => resolve());
  });
}
