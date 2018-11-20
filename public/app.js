
// delcare object to hold client side code
var app = {}


app.config = {}
app.config.token = {}
app.client = {}

// AJAX Request method
app.client.request = function (headers, path, method, queryStringObject, payload, callback) {
  // Set defaults
  headers = typeof (headers) == 'object' && headers !== null ? headers : {};
  path = typeof (path) == 'string' ? path : '/';
  method = typeof (method) == 'string' && ['POST', 'GET', 'PUT', 'DELETE'].indexOf(method.toUpperCase()) > -1 ? method.toUpperCase() : 'GET';
  queryStringObject = typeof (queryStringObject) == 'object' && queryStringObject !== null ? queryStringObject : {};
  payload = typeof (payload) == 'object' && payload !== null ? payload : {};
  callback = typeof (callback) == 'function' ? callback : false;

  // For each query string parameter sent, add it to the path
  var requestUrl = path + '?';
  var counter = 0;
  for (var queryKey in queryStringObject) {
    if (queryStringObject.hasOwnProperty(queryKey)) {
      counter++;
      // If at least one query string parameter has already been added, preprend new ones with an ampersand
      if (counter > 1) {
        requestUrl += '&';
      }
      // Add the key and value
      requestUrl += queryKey + '=' + queryStringObject[queryKey];
    }
  }

  // Form the http request as a JSON type
  var xhr = new XMLHttpRequest();
  xhr.open(method, requestUrl, true);
  xhr.setRequestHeader("Content-type", "application/json");

  // For each header sent, add it to the request
  for (var headerKey in headers) {
    if (headers.hasOwnProperty(headerKey)) {
      xhr.setRequestHeader(headerKey, headers[headerKey]);
    }
  }

  // If there is a current session token set, add that as a header
  if (app.config.token.sessionkey) {
    xhr.setRequestHeader("id", app.config.token.sessionkey);
  }

  // When the request comes back, handle the response
  xhr.onreadystatechange = function () {
    if (xhr.readyState == XMLHttpRequest.DONE) {
      var statusCode = xhr.status;
      var responseReturned = xhr.responseText;

      // Callback if requested
      if (callback) {
        try {
          var parsedResponse = JSON.parse(responseReturned);
          callback(statusCode, parsedResponse);
        } catch (e) {
          callback(statusCode, false);
        }

      }
      //console.log(parsedResponse)
    }
  }

  // Send the payload as JSON
  var payloadString = JSON.stringify(payload);
  xhr.send(payloadString);

};

//bindforms
app.bindforms = function () {
  if (document.querySelector('form')) {
    var allForms = document.querySelectorAll('form')
    for (var i = 0; i < allForms.length; i++) {
      allForms[i].addEventListener("submit", function (e) {
        e.preventDefault();
        var action = this.action;
        var method = this.method.toUpperCase();
        var id = this.id;
        method = id === 'edituser' ? 'PUT' : method
        method = id === 'deleteuser' ? 'DELETE' : method
        // declare variable to hold payload
        var payload = {}
        // Gather form fields into an object
        var elements = this.elements
        for (var i = 0; i < elements.length; i++) {
          if (['text', 'password', 'email', 'hidden'].includes(elements[i].type)) {
            payload[elements[i].name] = elements[i].value
          }
        }
        // If the method is DELETE, the payload should be a queryStringObject instead
        var queryStringObject = method == 'DELETE' ? payload : {};

        // insert email to payload if formid is checkoutform
        if (id === 'checkoutform' && app.config.token.email) {
          Object.assign(payload, { email: app.config.token.email })
        }

        // call api
        app.client.request(undefined, action, method, queryStringObject, payload, function (statusCode, responsePayload) {
          if (statusCode !== 200) {
            if (responsePayload.Error) {
              document.querySelector('#formerror').innerHTML = responsePayload.Error
              document.querySelector('#formerror').className = "formerror"
            }
          } else {
            app.client.handleFormResponse(id, payload, responsePayload)
          }
        })

      }) // end of addevent listener function
    }
  }
}

// function to handle responses from AJAX calls executed by form submit events
app.client.handleFormResponse = function (formId, payload, response) {
  switch (formId) {
    case "signupform":
      // Notify user of successfull signup
      document.querySelector('#formerror').innerHTML = 'User created successfully'
      document.querySelector('#formerror').className = "formsuccess"
      // declare object to hold payload for singing in
      var loginData = {
        email: payload.email,
        password: payload.password
      }
      // Login user 
      app.client.request(undefined, '/api/login', 'POST', undefined, loginData, function (statusCode, responsePayload) {
        if (statusCode == 200) {
          // call function to persist token in local storage
          app.saveToken(response, payload.email)
          // redirect to menu page
          window.location = "/"
        } else {
          app.setLoggedInClass(false)
        }
      })
      break;
    case 'loginform':
      var sessionExpiryAlert = document.querySelector('.showexpired')
      sessionExpiryAlert.style.display = "none"
      sessionExpiryAlert.innerHTML = ""
      app.saveToken(response, payload.email)
      window.location = "/"
      break;
    case 'checkoutform':
      // show payment confirmation page
      var alert = document.querySelector('#formerror')
      alert.style = "display: block; color: white; background-color: green"
      alert.innerHTML = 'Payment processed successfully. Email acknoledgment sent to customer'
      break
    case 'edituser':
      // notify user via a message
      var alert = document.querySelector('#formerror')
      alert.style = "display: block; color: white; background-color: green"
      alert.innerHTML = "User details updated successfully"
      break
    case 'deleteuser':
      var alert = document.querySelector('#formerror')
      alert.style = "display: block; color: white; background-color: red"
      alert.innerHTML = "User deleted successfully"
      break
    default:
  }
}

// Function to validate form fields --not in use
app.validateFormFields = function (element, value) {
  switch (element) {
    case 'email':
      if (value.length === 0) return false
      if (value.includes('@')) return true;
      return true;
    case 'name':
      if (value.length === 0) return false
      return true
    case 'address':
      if (value.length === 0) return false
      return true
    case 'password':
      if (value.length === 0 || value !== document.querySelector('').value) return false
      return true
    default:
      return true
  }
}


// Function to load menu date to menu page
app.loadMenu = function () {
  // check if user is authenticated
  if (app.config.token.sessionkey) {
    //call the menu api
    app.client.request(undefined, '/api/menu', 'GET', { email: app.config.token.email }, undefined, function (statusCode, response) {
      // print error to console
      if (statusCode !== 200) return console.log('Error reading menu: ' + response)
      // proceed if statusCode is 200

      Object.keys(response).forEach(function (key) {

        // Select table
        var table = document.querySelector('#menutable')
        var tr = table.insertRow(-1)
        var td0 = tr.insertCell(0);
        var td1 = tr.insertCell(1);
        var td2 = tr.insertCell(2);
        var td3 = tr.insertCell(3);
        var td4 = tr.insertCell(4);
        var td5 = tr.insertCell(5);
        var td6 = tr.insertCell(6);
        var td7 = tr.insertCell(7);
        var td8 = tr.insertCell(8);
        var td9 = tr.insertCell(9);

        // insert data
        td0.innerHTML = "<img src='/public/" + key + ".jpg' class='pizza-image' alt='pizza' >"
        td1.innerHTML = response[key].name
        td2.innerHTML = response[key].description
        td3.innerHTML = response[key].price.regular
        td4.innerHTML = response[key].price.medium
        td5.innerHTML = response[key].price.large
        td6.innerHTML = response[key].price.mega
        td7.innerHTML = "<div class='quantity'><button class='minus' id='minus-" + key + "'>-</button><span class='span-quantity' id='pizza-quantity-" + key + "'>1</span><button class='add' id='add-" + key + "'>+</button></div>"
        td8.innerHTML = "<select id='pizza-size-" + key + "'><option value='regular'>regular</option><option value='medium'>medium</option><option value='large'>large</option><option value='mega'>mega</option></select>"
        td9.innerHTML = "<button class='btn-add-to-cart' id='btn-add-" + key + "'>+</button>"
      })
      // Add event listeners for buttons to add/subtract quantity of pizzas to be added to cart
      app.addMinusQuantityButtons()
      // add event listeners to Add to cart buttons
      app.addToCart()
    })

  } else {
    console.log('Not authenticated')
  }
}

// UTILITY functions

// Add event listeners to -/+ buttons
app.addMinusQuantityButtons = function () {
  // Get all buttons to add/subtract pizza quantities
  var allButtons = document.querySelectorAll('div.quantity > button')
  // loop through the collection and attach event listeners
  for (var i = 0; i < allButtons.length; i++) {
    allButtons[i].addEventListener('click', function (e) {
      // Extract pizza ID or product SKU
      var pizzaId = e.target.id.includes('minus-') ? e.target.id.replace('minus-', '') : e.target.id
      pizzaId = e.target.id.includes('add-') ? e.target.id.replace('add-', '') : pizzaId
      // Get quantity of pizza already added 
      var quantityOfPizza = parseInt(document.querySelector('#pizza-quantity-' + pizzaId).innerHTML)
      // increment or decrement based on button clicked
      if (e.target.classList.contains('add')) {
        quantityOfPizza += 1
      } else {
        quantityOfPizza - 1 < 1 ? quantityOfPizza = 1 : quantityOfPizza -= 1
      }
      // Update quantity element 
      document.querySelector('#pizza-quantity-' + pizzaId).innerHTML = quantityOfPizza
    })
  }
}

// Load cart items 
app.loadCart = function () {
  // update cart element in menu
  //  function (headers, path, method, queryStringObject, payload, callback)
  if (app.config.token.sessionkey) {
    app.client.request(undefined, '/api/shoppingcart', 'GET', { email: app.config.token.email }, undefined, function (statusCode, response) {
      if (statusCode === 200) {
        if (response.length === 0) {
          document.querySelector('.carttable').style.display = "none"
          document.querySelector('.cartinfo').style.display = "block"
          document.querySelector('.cartinfo').innerHTML = "You have no items in cart";
          document.querySelector('.totalprice').innerHTML = 'Kes. 0'


        } else {
          document.querySelector('.cartinfo').style.display = "none"
          // call function to display cart items
          // check if user is authenticated

          // proceed if statusCode is 200
          Object.keys(response).forEach(function (key) {
            // Select table
            var table = document.querySelector('#carttable')
            var tr = table.insertRow(-1)
            var td0 = tr.insertCell(0)
            var td1 = tr.insertCell(1)
            var td2 = tr.insertCell(2)
            var td3 = tr.insertCell(3)
            var td4 = tr.insertCell(4)
            var td5 = tr.insertCell(5)

            td0.innerHTML = response[key].name
            td1.innerHTML = response[key].size
            td2.innerHTML = response[key].quantity
            td3.innerHTML = response[key].price
            td4.innerHTML = response[key].total
            td5.innerHTML = "<button class='btn-remove-from-cart' id='btn-remove-" + response[key].productId + "'>&times;</button>"
          })
          // Add event listener
          app.removeFromCart()
          // Show total price
          var billTotal = response.reduce(function (total, cartItem) {
            return { total: total.total + cartItem.total }
          })
          document.querySelector('.totalprice').innerHTML = 'Kes. ' + billTotal.total

        }
      }
    })
  }
}


// Load edit user page data
app.loadUserProfile = function () {

  if (app.config.token.email) {
    // Fetch the user data
    var queryStringObject = {
      'email': app.config.token.email
    };
    app.client.request(undefined, 'api/users', 'GET', queryStringObject, undefined, function (statusCode, responsePayload) {
      if (statusCode == 200) {
        // Put the data into the forms as values where needed
        document.querySelector("#name").value = responsePayload.name;
        document.querySelector("#address").value = responsePayload.address;
        document.querySelector("#password").value = responsePayload.password;

        // Populate hidden email field
        var emailFields = document.querySelectorAll("input.email");
        for (var i = 0; i < emailFields.length; i++) {
          emailFields[i].value = responsePayload.email;
        }

      } else {
        // Logout the user if response code is not 200
        app.signout()
        
      }
    })
  }
}
// add event listener for adding items to cart
app.addToCart = function () {
  // Get all add to cart buttons
  var allButtons = document.querySelectorAll('.btn-add-to-cart')
  // loop through the collection and add event listeners
  for (var i = 0; i < allButtons.length; i++) {
    allButtons[i].addEventListener('click', function (e) {
      // Get product ID
      var pizzaId = e.target.id.replace('btn-add-', '')
      // Get quantity
      var pizzaQuantity = parseInt(document.querySelector('#pizza-quantity-' + pizzaId).innerHTML)
      // Get pizza size
      var pizzaSize = document.querySelector('#pizza-size-' + pizzaId).value

      // check if user has valid token 
      if (app.config.token.sessionkey) {
        // construct payload 
        var payload = {
          email: app.config.token.email,
          productId: pizzaId,
          quantity: pizzaQuantity,
          size: pizzaSize
        }
        // call API to add item to shopping cart
        //  function (headers, path, method, queryStringObject, payload, callback)
        app.client.request(undefined, '/api/shoppingcart', 'PUT', undefined, payload, function (statusCode, response) {
          if (statusCode === 200) {
            // call function to update cart
            app.updateMenuCart()
          }
        })

      } else {
        // let user know tha session has expired
        var sessionExpiryAlert = document.querySelector('.showexpired')
        sessionExpiryAlert.style.display = block
        sessionExpiryAlert.innerHTML = "Session has expired! Please log back in!"
        //redirect to login
        window.location = "/account/login"
      }

    })
  }
}


// remove item from cart
app.removeFromCart = function () {
  //btn-remove-
  // Get all add to cart buttons
  var allButtons = document.querySelectorAll('.btn-remove-from-cart')
  // loop through the collection and add event listeners
  for (var i = 0; i < allButtons.length; i++) {
    allButtons[i].addEventListener('click', function (e) {
      // Get product ID

      var pizzaId = e.target.id.replace('btn-remove-', '')

      // check if user has valid token 
      if (app.config.token.sessionkey) {
        // construct payload 
        var payload = {
          email: app.config.token.email,
          productId: pizzaId
        }
        // call API to add item to shopping cart
        //  function (headers, path, method, queryStringObject, payload, callback)
        app.client.request(undefined, '/api/shoppingcart', 'DELETE', undefined, payload, function (statusCode, response) {
          if (statusCode === 200) {
            // call function to update cart
            app.updateMenuCart()
            window.location = "/cart"
          }
        })

      } else {
        // let user know tha session has expired
        var sessionExpiryAlert = document.querySelector('.showexpired')
        sessionExpiryAlert.style.display = block
        sessionExpiryAlert.innerHTML = "Session has expired! Please log back in!"
        //redirect to login
        window.location = "/account/login"
      }

    })
  }

}
// update menu cart icon
app.updateMenuCart = function () {
  // update cart element in menu
  //  function (headers, path, method, queryStringObject, payload, callback)
  if (app.config.token.sessionkey) {
    app.client.request(undefined, '/api/shoppingcart', 'GET', { email: app.config.token.email }, undefined, function (statusCode, response) {
      if (statusCode === 200) {
        document.querySelector('.cart').innerHTML = response.length;
      }
    })
  }
}

// Set (or remove) the loggedIn class from the body
app.setLoggedInClass = function (add) {
  var target = document.querySelector("body");
  if (add) {
    target.classList.add('loggedIn');
  } else {
    target.classList.remove('loggedIn');
  }
};


// function to save token
app.saveToken = function (token, email) {
  app.config.token.sessionkey = token
  app.config.token.email = email
  localStorage.setItem('id', token)
  localStorage.setItem('email', email)
}

//function to retrieve token from local storage
// and set config object 
app.getToken = function () {
  if (localStorage.getItem('id')) {
    app.config.token.sessionkey = localStorage.getItem('id')
    app.config.token.email = localStorage.getItem('email')
    app.setLoggedInClass(true)
  } else {
    app.setLoggedInClass(false)
  }
}

app.signout = function () {
  // Log out user
  if (app.config.token.sessionkey) {
    localStorage.removeItem('id')
    localStorage.removeItem('email')
    app.config.token = {}
    app.setLoggedInClass(false)
    window.location = "/"
  } else {
    app.setLoggedInClass(false)
  }
}

// Edit user button event handler
app.edituser = function () {

}
// validate token if expired
app.validateToken = function () {
  if (app.config.token.sessionkey) {
    //call the api/token to check if token is valid
    //  function (headers, path, method, queryStringObject, payload, callback)
    app.client.request(undefined, '/api/token', 'GET', { email: app.config.token.email }, undefined, function (statusCode, response) {
      if (statusCode !== 200) {
        app.signout();
        var sessionExpiryAlert = document.querySelector('.showexpired')
        sessionExpiryAlert.style.display = block
        sessionExpiryAlert.innerHTML = response.Error

      } else {
        app.setLoggedInClass(true)
        document.querySelector('.showexpired').style.display = 'none'
      }

    })
  } else {
    app.setLoggedInClass(false)
    document.querySelector('.showexpired').style.display = 'none'
  }
}


window.onload = function () {
  // bind event listeners to submit event 
  app.bindforms()
  // if token exists, load it to app.config.token object
  app.getToken()
  // Check validity of token against expiry. if expired, prompt user to relogin
  app.validateToken()
  // Update cart icon with item quantities if any
  app.updateMenuCart()

  // Event listerners for menu buttons
  if (document.querySelector('.menu')) {
    // bind event listener for signout button
    document.querySelector('#signout').addEventListener('click', app.signout)
    // bind event listener for profile button
    document.querySelector('#profile').addEventListener('click', app.edituser)
  }

  // Load data for edit profile page
  if (document.querySelector('.edituser')) {
    app.loadUserProfile()
  }

  // Execute function to load menu if MENU button is clicked
  if (document.querySelector('#menudiv')) {
    app.loadMenu()
  }
  // load cart items if carts page is open
  if (document.querySelector('#cartdiv')) {
    app.loadCart()
    // bind event listener to checkout button
    document.querySelector('.btncheckout').addEventListener('click', function (e) {
      window.location = '/checkout'
    })
  }

}

