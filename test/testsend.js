var net = require('net');
const { spawn } = require('child_process');


const socketPort = 3001 + Date.now() % 1000;

const python = spawn('python', [__dirname + '/main.py', socketPort]);

python.stdout.on('data', (data) => {
  console.log(`Pyhon say: ${data}`);
});

python.stderr.on('data', (data) => {
  console.error(`Pyhon err: ${data}`);
});

python.on('close', (code) => {
  console.log(`Pyhon cloce as code: ${code}`);
});

class Soc {
  constructor(port, onRecive, onClose) {
    this.port = port;
    this.client = new net.Socket();

    // Обработчик получения данных от сервера
    this.client.on('data', function(data) {
      //console.log('Received: ' + data);
      onRecive(data)

    });

    // Обработчик закрытия соединения
    this.client.on('close', function() {
      onClose()
      console.log('Connection closed');
      this.isOpen = false;
    });
    this.isOpen = false;

  }

  async connect(onConnect = () => { }) {
    /*this.client.connect(9091, 'localhost', function () {
        console.log('Connected');
        onConnect('Connected')
        this.isOpen=true;
        // Отправляем данные на сервер

    });*/

    let conRes = await this.client.connect(this.port, 'localhost')
    if (conRes._connecting) {
      console.log('Connected');
      onConnect('Connected')
      this.isOpen = true;
    }
  }
  close() {
    if (this.isOpen) {
      // Закрываем соединение
      this.isOpen = false;
      this.client.destroy();
    }
  }

  send(text) {
    if (this.isOpen)
      this.client.write(text);
  }
}

// Создаем новый сокет и подключаемся к серверу


var soc = new Soc(socketPort, (text) => {
  console.log("res=" + text)
}, () => {
  console.log("Socket open error")
})

/*
setTimeout(()=>{
  soc.connect()
},1000)
*/

setInterval(() => {
  if (!soc.isOpen) {
    soc.connect()
  }
  if (soc.isOpen) {
    soc.send(Date.now() + "")
  }
}, 5000)