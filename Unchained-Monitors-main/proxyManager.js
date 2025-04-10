const fs = require('fs');
const path = require('path');

class ProxyManager {
  constructor(filePath) {
    this.proxies = [];
    this.loadProxies(filePath);
  }

  loadProxies(filePath) {
    const fullPath = path.join(__dirname, filePath);
    try {
      const data = fs.readFileSync(fullPath, 'utf8');
      this.proxies = data.split('\n').filter(line => line.trim() !== '');
    } catch (err) {
      console.error(`Error reading proxies from file: ${err.message}`);
    }
  }

  getRandomProxy() {
    if (this.proxies.length === 0) {
      throw new Error('Proxy list is empty.');
    }
    const randomIndex = Math.floor(Math.random() * this.proxies.length);
    return this.proxies[randomIndex];
  }
}

// The module export so that you can require this in another file
module.exports = new ProxyManager('proxies.txt');
