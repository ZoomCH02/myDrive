function GET(theUrl, callback) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function() {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      callback(xmlHttp.responseText);
  }
  xmlHttp.open("GET", theUrl, true); // true for asynchronous 
  xmlHttp.send(null);
}

function POST(url, data, callback, type = "application/x-www-form-urlencoded") {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);

  xhr.setRequestHeader("Content-Type", type);

  xhr.onreadystatechange = function() {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
      callback(this.responseText)
    }
  }
  xhr.send(data);
}


function reg() {
  var log = document.getElementById("log");//login
  var pass = document.getElementById("pass");//pass
  var pass1 = document.getElementById("pass1");//pass2
  if (pass.value != pass1.value) {
    alert("Пароли не совпадают")
    return
  }
  POST("/reg", "log=" + log.value + "&pass=" + pass.value, (text) => {
    if (text != 'OK') {
      alert(text)
    }
    else {
      window.location.replace("/drive.html")
    }

  })
  console.log('asd')
}
