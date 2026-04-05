const RESET   = "\x1b[0m";
const DIM     = "\x1b[2m";
const BOLD    = "\x1b[1m";
const CYAN    = "\x1b[36m";
const GREEN   = "\x1b[32m";
const YELLOW  = "\x1b[33m";
const RED     = "\x1b[31m";
const MAGENTA = "\x1b[35m";

function ts() {
  return DIM + new Date().toLocaleTimeString("en-IN", { hour12: false }) + RESET;
}

const log = {
  info:  (msg) => console.log(`${ts()}  ${CYAN}ℹ${RESET}  ${msg}`),
  ok:    (msg) => console.log(`${ts()}  ${GREEN}✔${RESET}  ${msg}`),
  warn:  (msg) => console.log(`${ts()}  ${YELLOW}⚠${RESET}  ${msg}`),
  error: (msg) => console.log(`${ts()}  ${RED}✖${RESET}  ${msg}`),
  step:  (msg) => console.log(`${ts()}  ${MAGENTA}→${RESET}  ${DIM}${msg}${RESET}`),
  req:   (method, path) => console.log(`${ts()}  ${BOLD}${method.padEnd(4)}${RESET} ${path}`),
  banner: (port) => {
    console.log();
    console.log(`  ${BOLD}${CYAN}MuscleBoxPro Local Dashboard${RESET}`);
    console.log(`  ${DIM}Running at${RESET} ${GREEN}http://localhost:${port}${RESET}`);
    console.log(`  ${DIM}IMAP${RESET}  ${process.env.IMAP_HOST}:${process.env.IMAP_PORT || 993}`);
    console.log(`  ${DIM}SMTP${RESET}  ${process.env.SMTP_HOST}:${process.env.SMTP_PORT || 465}`);
    console.log(`  ${DIM}DB  ${RESET}  ${process.env.SUPABASE_URL}`);
    console.log();
  },
};

module.exports = log;
