export async function getOpenApiSpec() {
  const response = await fetch('/openapi.yaml')
  return response.text()
}
