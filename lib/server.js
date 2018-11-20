/*
* Author: John Meresey
* Server related tasks
**/

//dependencies
const http = require('http');
const https = require('https')
const fs = require('fs')
const path = require('path')
const url = require('url');
const { StringDecoder } = require('string_decoder');
const util = require('util')

const config = require('./config');
const handlers = require('./handlers')
const helpers = require('./helpers')
const debug = util.debuglog('server')

// Declare server module object
const server = {}

//instantiate http server
server.httpServer = http.createServer((req, res) => {
  server.unifiedServer(req, res)
})

//instantiate https server
server.httpsServerOptions = {
  'key': fs.readFileSync(path.join(__dirname, '../', 'https/key.pem')),
  'cert': fs.readFileSync(path.join(__dirname, '../', 'https/cert.pem'))
}
server.httpsServer = https.createServer(server.httpsServerOptions, (req, res) => {
  server.unifiedServer(req, res)
})


server.router = {
  ping: handlers.ping,
  'api/users': handlers.users,
  'api/login': handlers.login,
  'api/logout': handlers.logout,
  'api/menu': handlers.menu,
  'api/shoppingcart': handlers.shoppingcart,
  'api/checkout': handlers.checkout,
  'api/token': handlers.checkToken,
  "": handlers.index,
  'account/login': handlers.signin,
  'account/signup': handlers.signup,
  'menu': handlers.menuall,
  'login': handlers.login,
  'cart': handlers.showcart,
  'checkout': handlers.showcheckout,
  'profile': handlers.userprofile
}

//unified server logic
server.unifiedServer = (req, res) => {
  //get the URL and parse it
  const parsedURL = url.parse(req.url, true)

  //get the path
  const path = parsedURL.pathname
 
  const trimmedPath = path.replace(/^\/+|\/+$/g, '')

  //get query string object
  const queryStringObject = parsedURL.query

  //get request method
  const method = req.method.toLowerCase()

  //get request headers
  const headers = req.headers

  //get the payload
  const decoder = new StringDecoder('utf-8')
  let buffer = ''
  req.on('data', data => {
    buffer += decoder.write(data)
  })
  req.on('end', () => {
    buffer += decoder.end()

    //choose handler for this request
    let chosenHandler = typeof (server.router[trimmedPath]) !== 'undefined' ? server.router[trimmedPath] : handlers.notFound;
    chosenHandler = trimmedPath.includes('public') ? handlers.public : chosenHandler

    const data = {
      trimmedPath,
      queryStringObject,
      headers,
      method,
      payload: helpers.parseToJSON(buffer)
    }

    //route the request to the chosen handler
    // declare strin to parse response to
    // response will be parsed depending on type
    let payloadString = '';
    chosenHandler(data, (statuscode = 200, payload = {}, payloadType = 'json') => {
      //convert payload to string
      switch (payloadType) {
        case 'json':
          res.setHeader('Content-Type', 'application/json');
          payloadString = JSON.stringify(payload)
          break
        case 'icon':
          res.setHeader('Content-Type','image/x-icon')
          payloadString = payload
          break
        case 'html':
          res.setHeader('Content-Type','text/html')
          payloadString = payload.toString()
          break
        case 'jpg':
          res.setHeader('Content-Type','image/jpeg')
          payloadString = payload
          break
        case 'png':
          res.setHeader('Content-Type','image/png')
          payloadString = payload
          break
        case 'js':
          res.setHeader('Content-Type','application/javascript')
          payloadString = payload.toString()
          break
        case 'css':
          res.setHeader('Content-Type','text/css')
          payloadString = payload.toString()
          break
        default:
          res.setHeader('Content-Type','text/plain')
          payloadString = payload.toString()
      }
      
      //send response
      res.writeHead(statuscode)
      res.end(payloadString)
      //log the request path
      if (statuscode == 200) {
        debug('\x1b[32m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statuscode}`)
      } else {
        debug('\x1b[31m%s\x1b[0m', `${method.toUpperCase()} /${trimmedPath} ${statuscode}`)
      }
    })

  })
}

// Init function
server.init = () => {
  // start http server
  server.httpServer.listen(config.httpPort, () => {
    console.log('\x1b[35m%s\x1b[0m', `Server is now listening on port ${config.httpPort}. Environemnt name is ${config.envname}`)
  })
  // start https server
  server.httpsServer.listen(config.httpsPort, () => {
    console.log('\x1b[33m%s\x1b[0m', `Server is now listening on port ${config.httpsPort}. Environemnt name is ${config.envname}`)
  })
}

// Export module
module.exports = server