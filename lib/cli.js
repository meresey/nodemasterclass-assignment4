/*
* CLI server
*
*/

//Dependencies
const os = require('os')
const v8 = require('v8')
const readline = require('readline')
const util = require('util')
const debug = util.debuglog('cli')
const eventEmitter = require('events')

const _data = require('./data')
const helpers = require('./helpers')
const menu = require('../.data/menu/menu.json')


class MyEmitter extends eventEmitter { }
const emitter = new MyEmitter()


// Declare object to hold propeties
const cli = {}

// Declare allowed commands
cli.allowedCommands = {
  'exit': {
    synopsis: 'exit',
    description: 'Exit the application gracefully'
  },
  'help': {
    synopsis: 'help',
    description: 'Display command list and description of commands'
  },
  'man': {
    synopsis: 'man',
    description: 'Display command list and description of commands'
  },
  'view menu': {
    synopsis: 'view menu',
    description: 'View all the current menu items'
  },
  'view orders': {
    synopsis: 'view orders',
    description: 'View all the recent orders in the system (orders placed in the last 24 hours)'
  },
  'view order': {
    synopsis: 'view order --orderId',
    description: 'Lookup the details of a specific order by order ID'
  },
  'view users': {
    synopsis: 'view users',
    description: 'View all the users who have signed up in the last 24 hours'
  },
  'view user': {
    synopsis: 'view user --email',
    description: 'Lookup the details of a specific user by email address'
  }
}

// Command description
cli.commandDescription = {

}

// Helper functions
// vertical space 
cli.verticalSpace = lines => {
  lines = typeof lines === 'number' && lines > 0 ? lines : 1
  for (i = 0; i < lines; i++) {
    console.log('')
  }
}

// Horizonal line accross the screen
cli.horizontalLine = () => {
  //get the available screen size
  const width = process.stdout.columns
  let line = ''
  for (i = 0; i < width; i++) {
    line += '-'
  }
  console.log(line)
}

// Centered text on the screen
cli.centered = str => {
  str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : false
  // Get size of screen
  const width = process.stdout.columns

  const LeftPadding = Math.floor((width - str.length) / 2)
  let padString = ''
  for (i = 0; i < LeftPadding; i++) {
    padString += ' '
  }
  // print out padded string
  console.log(padString + str)
}

// pad right
cli.padRight = (str, padSize) => {
  str = typeof str === 'string' && str.trim().length > 0 ? str.trim() : false
  padSize = typeof padSize === 'number' && padSize > 0 ? padSize : false

  if (str && padSize) {
    // determine number of pad characters
    const padLength = padSize - str.length
    // loop through and pad string
    for (let i = 0; i < padLength; i++) {
      str += ' '
    }
    return str
  }


}



// Command listeners
emitter.on('exit', cmd => cli.eventHandlers.exit(cmd))
emitter.on('help', cmd => cli.eventHandlers.help(cmd))
emitter.on('man', cmd => cli.eventHandlers.help(cmd))
emitter.on('view menu', cmd => cli.eventHandlers.viewMenu(cmd))
emitter.on('view orders', cmd => cli.eventHandlers.viewOrders(cmd))
emitter.on('view order --orderId', cmd => cli.eventHandlers.viewOrderDetails(cmd))
emitter.on('view users', cmd => cli.eventHandlers.viewUsers(cmd))
emitter.on('view user --email', cmd => cli.eventHandlers.viewUserDetails(cmd))

// Declare object to holdEvent handlers
cli.eventHandlers = {}

//Exit handler
cli.eventHandlers.exit = cmd => {
  // Exit the app gracefully
  process.exit(0)
}

// help/man handler
cli.eventHandlers.help = cmd => {
  // print horizontal line
  cli.horizontalLine()
  // print centered text
  cli.centered('COMMAND MENU')
  // print another horizontal line
  cli.horizontalLine()
  cli.verticalSpace()
  // loop through the allowed command list
  for (let key in cli.allowedCommands) {
    if (cli.allowedCommands.hasOwnProperty(key)) {
      const menuItem = cli.allowedCommands[key].synopsis
      let paddedKey = cli.padRight(menuItem, 60)
      paddedKey = `\x1b[33m${paddedKey}\x1b[0m`
      console.log(`${paddedKey}:${cli.allowedCommands[key].description}`)
      cli.verticalSpace()
    }
  }
  //one last horizontal line
  cli.horizontalLine()
}

// View menu handler
cli.eventHandlers.viewMenu = cmd => {
  // Display Menu 
  cli.horizontalLine()
  cli.verticalSpace()
  Object.keys(menu).forEach(key => {
    let line = `${cli.padRight(menu[key].name, 30)} ${cli.padRight(menu[key].description, 30)} 
    Price
    ${cli.padRight('Regular', 10)}: ${menu[key].price['regular']}
    ${cli.padRight('Medium', 10)}: ${menu[key].price['medium']}
    ${cli.padRight('Large', 10)}: ${menu[key].price['large']}
    ${cli.padRight('Mega', 10)}: ${menu[key].price['mega']}
    `
    console.log(line)
    cli.verticalSpace()
  })
}

// View orders handler
cli.eventHandlers.viewOrders = cmd => {
  // Read in all order IDs
  _data.list('orders', (err, orderData) => {
    // if there is no error and there is order data proceed
    if (!err && orderData && orderData.length > 0) {
      // For each order, check order data is within thelast 24 hours
      orderData.forEach(orderId => {
        _data.read('orders', orderId, (error, order) => {
          if (!error && order) {
           if (Date.now() - order.date < (1000 * 60 * 60 * 24)) {
            cli.verticalSpace()
            console.log(orderId)
            cli.verticalSpace()
           }
          }
        })
      })
    } 
  })
}

// view specific order
cli.eventHandlers.viewOrderDetails = cmd => {
  // Get order id from command
  const cmdArray = cmd.split('--')
  // check if there is a valid ID
  const orderId = cmdArray.length === 2 && cmdArray[1].trim().length > 0 ? cmdArray[1].trim() : false

  if (orderId) {
    // read in order
    _data.read('orders', orderId, (error, order) => {
      if (!error && order) {
        cli.verticalSpace()
        cli.horizontalLine()
        cli.centered('OREDER DETAILS')
        cli.horizontalLine()
        console.dir(order, { colors: true })
        cli.verticalSpace()
      }
    })
  }
}

// view uses handler

cli.eventHandlers.viewUsers = cmd => {
  // Read in all order IDs
  _data.list('users', (err, userIds) => {
    // if there is no error and there is order data proceed
    if (!err && userIds && userIds.length > 0) {
      // For each order, check order data is within thelast 24 hours
      userIds.forEach(userId => {
        _data.read('users', userId, (error, user) => {
          if (!error && user) {
            if (Date.now() - user.date < (1000 * 60 * 60 * 24)) {
              cli.verticalSpace()
              console.log(userId)
              cli.verticalSpace()
            }
          }
        })
      })
    }
  })
}

// view specific user details 
cli.eventHandlers.viewUserDetails = cmd => {
  // Get order id from command
  const cmdArray = cmd.split('--')
  // check if there is a valid ID
  const email = cmdArray.length === 2 && cmdArray[1].trim().length > 0 ? cmdArray[1].trim() : false

  if (email) {
    // read in order
    _data.read('users', email, (error, user) => {
      if (!error && user) {
        delete user.password
        delete user.tokens
        cli.verticalSpace()
        cli.horizontalLine()
        cli.centered('USER DETAILS')
        cli.horizontalLine()
        console.dir(user, { colors: true })
        cli.verticalSpace()
      }
    })
  }
}

// Process command that the user keys in
cli.processInput = (input) => {
  // validate command
  input = typeof input === 'string' && input.trim().length > 0 ? input.trim() : false

  if (input) {
    // split input to extract commmand without options
    splitCommand = input.split('--')
    const cmd = splitCommand[0].trim().toLowerCase()
    // Check if input provided by user matches allowed commands
    if (Object.keys(cli.allowedCommands).indexOf(cmd) > -1) {
      // Emit the command and include input from user
      emitter.emit(cli.allowedCommands[cmd].synopsis, input)
    } else {
      // If command is not found, notify user
      console.log('Sorry, try again')
    }
  }
}

// Initialization function
cli.init = () => {
  console.log('\x1b[37m%s\x1b[0m', 'CLI Server is now running....')

  // create interface
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '#>'
  })

  // Create initial prompt
  rl.prompt()

  // listen to events
  rl.on('line', line => {
    cli.processInput(line)
    // reinitialize prompt after handling the last input
    rl.prompt()
  })


}

// Export object
module.exports = cli
