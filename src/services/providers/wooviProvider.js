export async function createCardTransactionWithWoovi() {
  return {
    success: true,
    status: 'authorized',
    provider: 'woovi',
    providerReference: 'woovi-' + Date.now(),
    raw: {}
  };
}
