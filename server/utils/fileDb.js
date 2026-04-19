const fs = require('node:fs')

function readData(file) {
  try {
    if (!fs.existsSync(file)) {
      return []
    }

    const rawData = fs.readFileSync(file, 'utf8').trim()

    if (!rawData) {
      return []
    }

    const parsedData = JSON.parse(rawData)
    return Array.isArray(parsedData) ? parsedData : []
  } catch {
    return []
  }
}

function writeData(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

module.exports = { readData, writeData }
