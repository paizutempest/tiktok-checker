// =========================================================================
// TIKTOK 4C USERNAME SNIPER & CHECKER v1.0 (NODE.JS LUXURY EDITION)
// Run: node tiktok_sniper.js
// =========================================================================

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// =========================================================================
// 🎨 LUXURY ANSI LOGGER STYLES
// =========================================================================
const c = {
    reset: '\x1b[0m',
    bold: '\x1b[1m',
    cyan: '\x1b[36m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    red: '\x1b[31m',
    magenta: '\x1b[35m',
    gray: '\x1b[90m',
    bgGreen: '\x1b[42m\x1b[30m',
    bgRed: '\x1b[41m\x1b[30m',
    bgYellow: '\x1b[43m\x1b[30m'
};

const log = {
    time: () => new Date().toLocaleTimeString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' }),
    info: (m) => console.log(`${c.gray}[${log.time()}]${c.reset} ${c.cyan}ℹ INFO${c.reset}  │ ${m}`),
    proc: (m) => console.log(`${c.gray}[${log.time()}]${c.reset} ${c.yellow}⚙ PROC${c.reset}  │ ${m}`),
    hitAvailable: (username) => console.log(`${c.gray}[${log.time()}]${c.reset} ${c.bgGreen} AVAILABLE ${c.reset} ┃ ${c.green}${c.bold}@${username.padEnd(6)}${c.reset} ➔ MANTEP, KOSONG BOS!`),
    hitTaken: (username, info) => console.log(`${c.gray}[${log.time()}]${c.reset} ${c.bgRed} TAKEN     ${c.reset} ┃ ${c.gray}@${username.padEnd(6)} │ ID: ${info}${c.reset}`),
    error: (username, err) => console.log(`${c.gray}[${log.time()}]${c.reset} ${c.red}✖ ERR ${c.reset}  │ @${username} │ ${c.gray}${err}${c.reset}`)
};

function printBanner() {
    console.clear();
    console.log(`${c.cyan}${c.bold}
  ██████╗ ██╗███╗   ██╗██╗███████╗██████╗ 
  ██╔══██╗██║████╗  ██║██║██╔════╝██╔══██╗
  ██████╔╝██║██╔██╗ ██║██║███████╗██████╔╝
  ██╔═══╝ ██║██║╚██╗██║██║╚════██║██╔═══╝ 
  ██║     ██║██║ ╚████║██║███████║██║     
  ╚═╝     ╚═╝╚═╝  ╚═══╝╚═╝╚══════╝╚═╝     
  TIKTOK 4C USERNAME SNIPER & CHECKER (NODE.JS)
  ${c.reset}`);
    console.log(`${c.gray}─────────────────────────────────────────────────────────────{c.reset}`);
    console.log(`  ${c.bold}TARGET       ${c.reset} : ${c.green}All 4-Character Combinations (4C){c.reset}`);
    console.log(`  ${c.bold}OUTPUT DIR   ${c.reset} : ${c.yellow}./result/ (available.txt & taken.txt){c.reset}`);
    console.log(`  ${c.bold}STATUS       ${c.reset} : ${c.bgGreen} ONLINE & READY ${c.reset}`);
    console.log(`${c.gray}─────────────────────────────────────────────────────────────{c.reset}\n`);
}

// =========================================================================
// CONFIGURATION & PATHS
// =========================================================================
const RESULT_DIR = path.resolve('./result');
if (!fs.existsSync(RESULT_DIR)) fs.mkdirSync(RESULT_DIR, { recursive: true });

const OUT_AVAILABLE = path.join(RESULT_DIR, 'available.txt');
const OUT_TAKEN = path.join(RESULT_DIR, 'taken.txt');

const CHARS = 'abcdefghijklmnopqrstuvwxyz';
const THREADS = 25; // Jumlah worker paralel
const MAX_COMBOS = 26 ** 4;

// =========================================================================
// LOGIC FUNCTIONS
// =========================================================================
function loadSeen() {
    const seen = new Set();
    for (const filePath of [OUT_AVAILABLE, OUT_TAKEN]) {
        if (fs.existsSync(filePath)) {
            const lines = fs.readFileSync(filePath, 'utf8').split('\n');
            for (const line of lines) {
                const parts = line.trim().split(/\s+/);
                const name = parts[0] ? parts[0].replace('@', '').trim() : '';
                if (name) seen.add(name);
            }
        }
    }
    return seen;
}

function getRandomUsername(seen) {
    if (seen.size >= MAX_COMBOS) return null;
    let name;
    do {
        name = '';
        for (let i = 0; i < 4; i++) {
            name += CHARS[Math.floor(Math.random() * CHARS.length)];
        }
    } while (seen.has(name));
    return name;
}

async function checkUsername(axiosInstance, username) {
    try {
        const res = await axiosInstance.post('https://www.tiktok.com/legal/report/feedback/check/unique', {
            username: username
        }, {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Accept": "application/json",
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
            },
            timeout: 10000
        });
        
        const body = res.data;
        const userId = body?.data?.[0]?.Resp?.user_id || '';
        return { exists: !!userId, userId, error: null };
    } catch (err) {
        return { exists: null, userId: '', error: err.message };
    }
}

async function worker(seen, stats) {
    const axiosInstance = axios.create();
    while (true) {
        const username = getRandomUsername(seen);
        if (!username) break;
        seen.add(username);

        const { exists, userId, error } = await checkUsername(axiosInstance, username);

        stats.done++;
        if (error) {
            stats.errors++;
            seen.delete(username); // Lepas cache agar bisa dicoba ulang saat error jaringan
            log.error(username, error);
        } else if (exists) {
            stats.taken++;
            fs.appendFileSync(OUT_TAKEN, `${username} ${userId}\n`, 'utf8');
            // Log taken dinonaktifkan agar terminal tidak terlalu spam, aktifkan log.hitTaken jika ingin melihat
        } else {
            stats.available++;
            fs.appendFileSync(OUT_AVAILABLE, `${username}\n`, 'utf8');
            log.hitAvailable(username);
        }
    }
}

// =========================================================================
// MAIN RUNNER
// =========================================================================
async function main() {
    printBanner();
    const seen = loadSeen();
    const stats = { done: 0, available: 0, taken: 0, errors: 0 };

    log.info(`Memuat database lokal... Total sudah dicek sebelumnya: ${seen.size} akun.`);
    log.info(`Hasil disimpan otomatis di: ./result/available.txt & ./result/taken.txt`);
    log.proc(`Menjalankan ${THREADS} worker paralel secara asinkron...\n`);

    const workers = [];
    for (let i = 0; i < THREADS; i++) {
        workers.push(worker(seen, stats));
    }

    await Promise.all(workers);

    console.log(`\n${c.cyan}${c.bold}=== RINGKASAN AKHIR BATCH ===${c.reset}`);
    console.log(`  • Berhasil Dicek : ${stats.done}`);
    console.log(`  • Available      : ${c.green}${stats.available}${c.reset}`);
    console.log(`  • Taken          : ${c.red}${stats.taken}${c.reset}`);
    console.log(`  • Errors         : ${c.yellow}${stats.errors}${c.reset}\n`);
}

main().catch(err => {
    console.error('Fatal Error:', err);
});
