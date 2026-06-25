import { createApp } from "./server/app";
import { DATA_FILE } from "./server/repositories/database";

async function start() {
  const PORT = Number(process.env.PORT || 3000);
  const app = await createApp();

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Persistent storage: ${DATA_FILE}`);
  });
}

start().catch(console.error);
