const puppeteer = require('puppeteer-core');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');

const { config } = require('./config.js');

// Secrets must match electron-main.js
const SECRET_KEY = 'tjse-monitor-2024-secure-key-32b';
const CREDENTIALS_FILE = path.join(__dirname, '..', 'credentials.enc');

function decrypt(text) {
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = Buffer.from(parts[1], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch {
    return null;
  }
}

function loadCredentials() {
  try {
    if (fs.existsSync(CREDENTIALS_FILE)) {
      const decrypted = decrypt(fs.readFileSync(CREDENTIALS_FILE, 'utf8'));
      return decrypted ? JSON.parse(decrypted) : null;
    }
  } catch (e) { }
  return null;
}

async function startChromeWithRemote(profilePath, port = 9222) {
  const exe = config.chromeExePath;
  if (!fs.existsSync(exe)) throw new Error('chrome.exe não encontrado: ' + exe);

  const userDataDir = path.resolve(profilePath);
  if (!fs.existsSync(userDataDir)) fs.mkdirSync(userDataDir, { recursive: true });

  const args = [
    `--remote-debugging-port=${port}`,
    `--user-data-dir=${userDataDir}`,
    `--profile-directory=${config.chromeProfileDirectory}`,
    '--no-first-run',
    '--disable-features=Translate',
    '--disable-notifications',
    config.targetUrl
  // chrome-automate.js removed — Keep file as placeholder to avoid accidental runs
  console.log('chrome-automate.js deprecated: automation via Puppeteer was removed due to detection issues.');
            await page.waitForTimeout(500);
            await page.click('#formSetor\\:sim');
            await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 10000 });
          } catch (e) {
            console.log('Erro ao selecionar cartório:', e.message);
          }
        }
      }
    } catch (e) {
      console.log('Erro ao tratar modal de cartório:', e.message);
    }

    // Finalmente, navegar para a tela de Maternidade
    try {
      await page.goto(config.targetUrl, { waitUntil: 'networkidle2', timeout: 60000 });
    } catch (e) {
      console.log('Falha ao navegar para a url da maternidade:', e.message);
    }

    // aguarda e fecha se necessário
    console.log('Login automatizado concluído. Página pronta.');

  } catch (e) {
    console.error('Erro durante automação de login:', e.message);
  } finally {
    // não fecha o browser; mantém chrome aberto com profile
    console.log('Sessão mantida em', tmpProfile);
    await browser.disconnect();
  }
}

if (require.main === module) {
  automateLogin().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
