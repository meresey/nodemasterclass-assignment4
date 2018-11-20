/*
* Application entry 
* 
**/

//dependencies
const server = require('./lib/server')
const cli = require('./lib/cli')

// Declare app
const app = {}

// Init function
app.init = () => {
  // Init server
  server.init()

  //Start CLI server
  setTimeout(() => {
    cli.init()
  }, 100);
}

// Execute
app.init()

// Export app
module.exports = app