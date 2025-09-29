const fs = require('fs');
const path = require('path');

const DATA_DIR = process.env.DATA_DIR || 'data';
const absoluteDataDir = path.join(__dirname, '..', '..', DATA_DIR);

function getPath(filename) {
  return path.join(absoluteDataDir, filename);
}

function readJson(filename, fallback) {
  const file = getPath(filename);
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, 'utf8');
    return JSON.parse(raw || 'null') ?? fallback;
  } catch (_e) {
    return fallback;
  }
}

function writeJson(filename, data) {
  const file = getPath(filename);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
}

module.exports = {
  readJson,
  writeJson,
};


