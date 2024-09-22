import { Hono } from 'hono';
import type { Context } from 'hono';

interface Env {
  SECRET: string;
}

const app = new Hono<{ Bindings: Env }>();


// function getSecretsFunction() {
// let vault: Record<string, string> = {}
// try {
//   vault = JSON.parse(process.env.secret || '')
// } catch (e) {
//   console.error(e)
//   return c.json({ error: "Failed to parse secrets" })
// }
// const secretSalt = (vault.secretSalt) ? vault.secretSalt as string : 'SALTY_BAE'
// console.log(`${secretSalt}`);
// }

app.get('/', (c: Context<{ Bindings: Env }>) => {
  let vault: Record<string, string> = {};
  try {
    const secretEnv = c.env.SECRET || '';
    vault = JSON.parse(secretEnv);
  } catch (e) {
    console.error('Failed to parse secrets:', e);
    return c.json({ error: 'Failed to parse secrets' }, 500);
  }

  const secretSalt = vault.secretSalt || 'SALTY_BAE';
  console.log('secretSalt');

  // You can now use `secretSalt` as needed in your application
  // For demonstration, we'll return it in the response
  return c.json({ secretSalt });
});

export default app;
