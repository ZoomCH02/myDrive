function GET(theUrl, callback) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      callback(xmlHttp.responseText);
  }
  xmlHttp.open("GET", theUrl, true); // true for asynchronous 
  xmlHttp.send(null);
}


function login() {
  log = document.getElementById('log').value
  pass = document.getElementById('pass').value

  GET('/log?login=' + log + '&pass=' + pass, (data) => {
    if (data == "OK") {
      window.location.replace('/drive.html')
    }
    else {
      alert(data)
    }
  })
}