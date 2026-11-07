const { CATEGORY_CONFIG, corsHeaders } = require('../lib/news')

module.exports = function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders)
    res.end()
    return
  }
  const categories = Object.values(CATEGORY_CONFIG)
  res.writeHead(200, { 'Content-Type': 'application/json', ...corsHeaders })
  res.end(JSON.stringify({ success: true, data: categories }))
}
