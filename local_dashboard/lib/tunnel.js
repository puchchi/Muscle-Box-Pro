const log = require("./logger");

let tunnelUrl = null;

async function startTunnel(port) {
  const authtoken = process.env.NGROK_AUTHTOKEN;
  if (!authtoken) {
    log.warn("NGROK_AUTHTOKEN not set — skipping tunnel (add it to .env to expose publicly)");
    return;
  }

  try {
    const ngrok = require("@ngrok/ngrok");
    const listener = await ngrok.connect({ addr: port, authtoken });
    tunnelUrl = listener.url();
    log.ok(`Ngrok tunnel active: ${tunnelUrl}`);
  } catch (err) {
    log.warn(`Ngrok tunnel failed: ${err.message}`);
  }
}

function getTunnelUrl() {
  return tunnelUrl;
}

module.exports = { startTunnel, getTunnelUrl };
