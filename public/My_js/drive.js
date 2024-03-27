function GET(theUrl, callback) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.onreadystatechange = function () {
    if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
      callback(xmlHttp.responseText);
  };
  xmlHttp.open("GET", theUrl, true); // true for asynchronous
  xmlHttp.send(null);
}

function POST(url, data, callback, type = "application/x-www-form-urlencoded") {
  var xhr = new XMLHttpRequest();
  xhr.open("POST", url, true);

  xhr.setRequestHeader("Content-Type", type);

  xhr.onreadystatechange = function () {
    if (this.readyState === XMLHttpRequest.DONE && this.status === 200) {
      callback(this.responseText);
    }
  };
  xhr.send(data);
}

var pageList = {
  home: 1,
  alboms: 2,
  favor: 3,
};
var currentPage = "";

var paramsPage = {};

var paramsPage = window.location.search
  .replace("?", "")
  .split("&")
  .reduce(function (p, e) {
    var a = e.split("=");
    p[decodeURIComponent(a[0])] = decodeURIComponent(a[1]);
    return p;
  }, {});

switch (paramsPage.page) {
  case "my_alboms":
    albums();
    break;
  case "favor":
    renderFav();
    break;
  case "shared":
    renderSharedAlb();
    break;
  case "search":
    renderSerch();
    break;
  default:
    loadFiles();
}

var imageCrop = "";
var cropper = "";

window.addEventListener("popstate", function (event) {
  var downloadAllImgs = document.getElementById("downloadAllImgs");
  var actualPath = window.location.search.split("?page=")[1];

  if (actualPath == "main" || actualPath == "favor" || actualPath.length > 10) {
    downloadAllImgs.hidden = false;
  } else {
    downloadAllImgs.hidden = true;
  }
});

function cropping() {
  GET("/getFavName?fid=" + clickImgId, (data) => {
    file_info = JSON.parse(data);
    if (file_info.length > 0) {
      a = document.getElementById("root");
      b = document.getElementById("crop");
      if (b) {
        b.remove();
      }
      a.innerHTML += `
      <div class="modal" tabindex="-1" id="crop">
       <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Редактор</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
          </div>
          <div class="modal-body">
            <div id="crop_el_id_${clickImgId}" class="">
                <div class="task__content gallery">
                   <div><img class="task" id="crop_id_${clickImgId}" width="" height="350px" src='/uploads/${file_info[0].name}'></div>
                </div>
<div class="btn-group">
          <button type="button" class="btn btn-primary" data-method="rotate" data-option="-45" title="Rotate Left">
            <span class="docs-tooltip" data-toggle="tooltip" title="" data-original-title="cropper.rotate(-45)">
              <span class="fa fa-undo-alt"></span>
            </span>
          </button>
          <button type="button" class="btn btn-primary" data-method="rotate" data-option="45" title="Rotate Right">
            <span class="docs-tooltip" data-toggle="tooltip" title="" data-original-title="cropper.rotate(45)">
              <span class="fa fa-redo-alt"></span>
            </span>
          </button>
        </div>
            </div>
           
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
            <button type="button" onclick="getCropImg(${clickImgId},'/smoll/${file_info[0].name}')" class="btn btn-primary" data-bs-dismiss="modal">Сохранить</button>
          </div>
        </div>
      </div>
      </div>
      
              `;
      changeCrop(clickImgId);
    }
  });
}

function changeCrop(clickImgId) {
  new bootstrap.Modal(document.getElementById("crop")).show();

  imageCrop = document.getElementById("crop_id_" + clickImgId);
  cropper = new Cropper(imageCrop, {
    crop(event) {
      console.log(event.detail.x);
      console.log(event.detail.y);
      console.log(event.detail.width);
      console.log(event.detail.height);
      console.log(event.detail.rotate);
      console.log(event.detail.scaleX);
      console.log(event.detail.scaleY);
      rotatable: true;
    },
  });
}

function getCropImg(a, b) {
  var croppedImg = cropper.getCroppedCanvas().toDataURL(b);
  var image = document.getElementById(a);
  var lastUrl = image.src.split("/").pop();

  var file = dataURLtoFile(croppedImg, lastUrl);

  readyUpload("/saveCropImg?crop=1", file, (text) => {
    console.log(text);
    if (text == "OK") {
      image.src = "/smoll/" + lastUrl + "?b=" + Math.random();
    }
  });

  // POST('/saveCropImg', `file_id=${a}&img=${croppedImg}&lastUrl=${lastUrl}`, (data) => {
  //   console.log(data)
  // })
}

function zipFiles(info) {
  if (info == "mainPage") {
    GET("/getAllFiles", (data) => {
      var files_name = JSON.parse(data);
      urlToFile(files_name);
    });
  } else if (info == "fav") {
    GET("/getFavId", (text) => {
      var files_name = JSON.parse(text);
      urlToFile(files_name);
    });
  } else {
    urlToFile(info);
  }
}

async function urlToFile(files_name) {
  var zip = new JSZip();
  for (var i = 0; i < files_name.length; i++) {
    var format = files_name[i].name.split(".").pop();
    let response = await fetch("uploads/" + files_name[i].name);
    let data = await response.blob();
    let metadata = {
      type: "image/" + format,
    };
    var file = new File([data], files_name[i].name.split(".")[0], metadata);
    zip.file(file.name + "." + format, file);
  }
  zip.generateAsync({ type: "blob" }).then(function (content) {
    saveAs(content, "files.zip");
  });
}

function dataURLtoFile(dataurl, filename) {
  var arr = dataurl.split(","),
    mime = arr[0].match(/:(.*?);/)[1],
    bstr = atob(arr[1]),
    n = bstr.length,
    u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new File([u8arr], filename, { type: mime });
}

GET("/getLogin", (data) => {
  log = JSON.parse(data);
  if (log.error) {
    window.location.replace("/login.html");
  }
  a = document.getElementById("insternLogin");
  a.innerHTML = `${log.login}`;
});

const menuArea = document.querySelector(".right-click-area");
const menu = document.querySelector(".right-click-menu");
var clickImgId = 0;

function viewImg(url, e, id) {
  var clickImgIdLeft = e.target.id;

  GET("/getTags?file_id=" + clickImgIdLeft, (data) => {
    tags_value = JSON.parse(data);
    if(url.split('.')[1]=="mp4"){
      var viewvid = document.getElementById("viewvid");
    }
    else{
      var viewimg = document.getElementById("viewimg");
    }
    var tagList = document.getElementById("tagList");
    tagList.innerHTML = "";

    for (var el of tags_value) {
      console.log(el);
      tagList.innerHTML += `<span class="badge badge-secondary">${el.value}</span>`;
    }
    tagList.innerHTML += `<span class="badge badge-secondary" onclick="addTag(${id})">+</span>`;

    //root.innerHTML+=st;

    if(url.split('.')[1]=="mp4"){
      viewvid.src = "/uploads/" + url.split("/").pop();
      new bootstrap.Modal(document.getElementById("videoViewer")).show();
    }
    else{
      viewimg.src = "/uploads/" + url.split("/").pop();
      var path = "/uploads/" + url.split("/").pop();
      mapBut = document.getElementById('mapBut')
      mapBut.setAttribute('onclick','initMap('+`"`+path+`"`+')')
      viewimg.onload = () => {
        new bootstrap.Modal(document.getElementById("imgViewer")).show();
      }
    }
  });
}

function drawPhoto(url, id) {
  return `
  <div id="file_id_${id}" class="responsive">
      <div class="task__content gallery">
         <div class="box"><img onclick="viewImg('${url}',event,id)" class="task" id="${id}" width="" height="350px" src='${url}'></div>
      </div>

  </div>
  `;
}

function drawVideo(url, id) {
  return `
  <div id="file_id_${id}" class="responsive">
      <div class="task__content gallery">
         <div class="box"><video onclick="viewImg('${url}',event,id)" class="task" id="${id}" width="100%" height="350px" src='${url}'></div>
      </div>
  </div>
  `;
}

function chengeContext() {
  var a = document.getElementById("context-menu");
  if (currentPage == pageList.home)
    a.innerHTML = `<ul class="context-menu__items">
        <li class="context-menu__item">
          <a href="#" class="context-menu__link" onclick="toFav(event)"data-action="0">В избранное</a>
        </li>
        <li class="context-menu__item">
          <a href="#" class="context-menu__link" onclick="addToAlbum(event)" data-action="1">Добавить в альбом</a>
        </li>
        <li class="context-menu__item">
          <a href="#" class="context-menu__link" onclick="cropping()" data-action="1">Редактировать</a>
        </li>
        <li class="context-menu__item">
          <a href="#" class="context-menu__link" onclick="addTag()" data-action="1">Добавить тэг</a>
        </li>
        <li class="context-menu__item">
          <a href="#" class="context-menu__link" onclick="delFile(event)" data-action="2">Удалить</a>
        </li>
      </ul>`;
  if (currentPage == pageList.alboms) {
    a.innerHTML = `<ul class="context-menu__items">
          <li class="context-menu__item">
            <a href="#" class="context-menu__link" onclick="toFav(event)"data-action="0">В избранное</a>
          </li>
          <li class="context-menu__item">
            <a href="#" class="context-menu__link" onclick="delFromAlb(event)" data-action="1">Убрать из альбома</a>
          </li>
          <li class="context-menu__item">
            <a href="#" class="context-menu__link" onclick="cropping()" data-action="1">Редактировать</a>
          </li>
          <li class="context-menu__item">
            <a href="#" class="context-menu__link" onclick="addTag()" data-action="1">Добавить тэг</a>
          </li>
          <li class="context-menu__item">
            <a href="#" class="context-menu__link" onclick="delFile(event)" data-action="2">Удалить</a>
          </li>
        </ul>`;
  }
  if (currentPage == pageList.favor) {
    a.innerHTML = `<ul class="context-menu__items">
          <li class="context-menu__item">
            <a href="#" class="context-menu__link" onclick="delFav(event)"data-action="0">Убрать из избранного</a>
          </li>
          <li class="context-menu__item">
            <a href="#" class="context-menu__link" onclick="addToAlbum(event)" data-action="1">Добавить в альбом</a>
          </li>
          <li class="context-menu__item">
            <a href="#" class="context-menu__link" onclick="cropping()" data-action="1">Редактировать</a>
          </li>
          <li class="context-menu__item">
            <a href="#" class="context-menu__link" onclick="addTag()" data-action="1">Добавить тэг</a>
          </li>
          <li class="context-menu__item">
            <a href="#" class="context-menu__link" onclick="delFile(event)" data-action="2">Удалить</a>
          </li>
        </ul>`;
  }
}

//главная
function loadFiles() {
  window.history.replaceState("", "", "?page=main");

  currentPage = pageList.home;
  chengeContext();
  GET("/getAllFiles", (data) => {
    files = JSON.parse(data);
    root.innerHTML = "";
    root = document.getElementById("root");
    for (var i = files.length - 1; i >= 0; i--) {
      if(files[i].name.split('.')[1]=='mp4'){
        root.innerHTML += drawVideo("uploads/" + files[i].name, files[i].file_id) 
      }
      else{
        root.innerHTML += drawPhoto("/smoll/" + files[i].name, files[i].file_id);
      }

    }
    var nav = document.getElementById("nav");
  });
}

function loadAlbListForAdder(pub = 0) {
  b = document.getElementById("albs");
  GET(pub == 0 ? "/getAlbums" : "/getSharedAlb", (data) => {
    b.innerHTML = "";
    if (data == 0) {
      return;
    }
    info = JSON.parse(data);

    for (var el of info) {
      if(el.album_id){
        b.innerHTML += `
        <option value="${el.album_id}">${el.name}</option>
        `;
      }
      else{
        b.innerHTML += `
        <option value="${el.id}">${el.name}</option>
        `;
      }
    }
  });
}

function chengeAlbList() {
  if (document.getElementById("flexRadioDefault1").checked) {
    loadAlbListForAdder(0);
  }
  if (document.getElementById("flexRadioDefault2").checked) {
    loadAlbListForAdder(1);
  }
}
//альбомы
function addToAlbum() {
  a = document.getElementById("root");
  a.innerHTML += `
    <div class="modal" tabindex="-1" id="exampleModal">
     <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">Добавить в альбом</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
        </div>
        <div class="modal-body">
           <p>Выберете нужный альбом из списка:</p>
           <div onchange="chengeAlbList()">
           <div class="form-check">
             <input class="form-check-input" checked type="radio" name="flexRadioDefault" id="flexRadioDefault1">
             <label class="form-check-label"  for="flexRadioDefault1">
               Личные
             </label>
           </div>
           <div class="form-check">
             <input class="form-check-input" type="radio" name="flexRadioDefault" id="flexRadioDefault2" >
             <label class="form-check-label" for="flexRadioDefault2">
               Публичные
             </label>
           </div>
           </div>
           <br>
           <select id="albs" name="albs">
           </select>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
          <button type="button" onclick="addFileToAlbum(event)" class="btn btn-primary">Добавить</button>
        </div>
      </div>
    </div>
    </div>
            `;

  loadAlbListForAdder();

  new bootstrap.Modal(document.getElementById("exampleModal")).show();
}



function editSharedAlb(id){
  GET("/getUsersInSharedAlb?album_id=" + id, (text) => {
    var userList = JSON.parse(text);
    a = document.getElementById("root");
    a.innerHTML += `
      <div class="modal" tabindex="-1" id="editSheredAlbModal">
       <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Изменить общий альбом</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
          </div>
          <div class="modal-body">
             <p><b>Название альбома:</b><br> ${userList[0].namme}</p>
             <p><b>Пользователи в альбоме:</b> </p>
             <div style="margin-top: -15px" id="usersInSharedAlb"></div>
             <p style="margin-top: 15px"><b>Добавьте пользователей: </b></p>
             <input style="margin-top: -20px" id="users"></input><button onclick="serchUsers('1')">Найти</button>
             <div id="listOfUsers"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
            <button type="button" onclick="updateUsersInSheredAlb(event,${id})" class="btn btn-primary">Изменить</button>
          </div>
        </div>
      </div>
      </div>
              `;
  
      var usersElement = document.getElementById('usersInSharedAlb')
      usersElement.innerHTML=``
      for (var i = userList.length -1; i>=0; i--) {
        if(i==userList.length -1){
          usersElement.innerHTML+=`
          <div id="usersDiv">
            <input type="checkbox" name="scales" checked>
            <label data-uid="${userList[i].id}" data-value="${userList[i].login}" for="scales">${userList[i].login}</label>
          </div>
          <br>
          `
        }
        else{
          usersElement.innerHTML+=`
          <div id="usersDiv">
            <input type="checkbox" name="scales" checked>
            <label data-uid="${userList[i].id}" data-value="${userList[i].login}" for="scales">${userList[i].login}</label>
          </div>
          <br>
          `
        }
      }

      new bootstrap.Modal(document.getElementById("editSheredAlbModal")).show();    
  });     
}

function updateUsersInSheredAlb(e,id){
  var usersList = document.querySelectorAll("div[id='usersDiv']");
  let users = [];
  let userIds = [];
  for (var i = 0; i < usersList.length; i++) {
    if(usersList[i].children[0].checked==true){
      let myObj = {name: usersList[i].children[1].dataset.value, cheked: usersList[i].children[0].checked, alb_id: id, uid: usersList[i].children[1].dataset.uid}
      users.push(myObj)
    }
  }

  updateUsersInSheredAlbPost(users)
}

function updateUsersInSheredAlbPost(users){
  var counter2=0;
  for(var i = 0;i<users.length;i++){
    POST("/updateUsersInSheredAlbums", "alb_id=" + users[i].alb_id + "&uid="+users[i].uid, (data) => {
      if (data == "OK") {
        console.log("Создан");
        console.log("added");
        counter2++;
        if (counter2==users.length){
          window.location.reload()
        }
      }
    });
  }
}

function getFilesIbAlb(e) {
    if (!e.length) {
      album_id = e.target.id;
    } else {
      album_id = e;
    }
    window.history.replaceState("", "", "?page=my_alboms&album_id=" + album_id);
    var downloadAllImgs = document.getElementById("downloadAllImgs");
    downloadAllImgs.hidden=false
    GET("/getFilesInAlbum?album_id=" + album_id, (data) => {
      if (data == 0) {
        return;
      }
      info = JSON.parse(data);
      root = document.getElementById("root");

      root.innerHTML = "";
      root.innerHTML +="<button style='margin-left: 5px' onclick='albums()' class='btn btn-secondary' >Назад</button><br>";
      root.innerHTML +="<h3 style='color: white;margin-left: 5px; margin-top: 5px';>Название альбома: "+info[0].alb_name+"</h3>";
      for (var i = info.length -1; i>=0; i--) {
        if(info[i].name.split('.')[1]=='mp4'){
          root.innerHTML += drawVideo("uploads/" + info[i].name, info[i].file_id) 
        }
        else{
          root.innerHTML += drawPhoto("/smoll/" + info[i].name, info[i].file_id);
        }
      }

      var downloadAllImgs = document.getElementById("downloadAllImgs");
      downloadAllImgs.setAttribute("onclick", 'zipFiles("info")');
    });
}

function addFileToAlbum(e) {
  var state = 0;

  if (document.getElementById("flexRadioDefault1").checked) {
    state = 0;
  }
  if (document.getElementById("flexRadioDefault2").checked) {
    state = 1;
  }

  a = document.getElementById("albs");

  POST(
    state == 0 ? "/addFileToAlbum" : "/addImgToSharedAlb",
    "file_id=" + clickImgId + "&album_id=" + a.value,
    (data) => {
      if (data == "OK") {
        loadFiles();
        console.log("Добавлен");
        location.reload();
      } else {
        console.log("Ошибка в коде");
      }
    },
  );
}

function albums() {
  window.history.replaceState("", "", "?page=my_alboms");
  var downloadAllImgs = document.getElementById("downloadAllImgs");
  downloadAllImgs.hidden=true
  currentPage = pageList.alboms;
  chengeContext();
  root = document.getElementById("root");
  root.innerHTML = "";
  root.innerHTML = `
    <div align="center" id="crete">
    <h4 style="color: white">Создать альбом:</h4>
    <div class="input-group" style="width: 50%">
      <input id="textInput" style="width: 50%" class="form-control" data-bs-theme="dark">
    </div>
    <button onclick="addAlbum()" style="margin-top: 20px" class="btn btn-secondary">Создать</button>
    <hr width="50%" style="color: white">
    </div>
  `;

  GET("/getAlbums", (data) => {
    if (data == 0) {
      a = document.getElementById("crete");
      crete.innerHTML +=
        '<h2 align="center" class="text" style="color: white">Альбомов нет, но вы можете их создать</h2>';
      return;
    }
    info = JSON.parse(data);
    for (var i = 0; i < info.length; i++) {
      root.innerHTML += `
        <div align="center" style="margin-top:5px;display: flex;width: 50%;justify-content: space-between;margin-left: 25%; align-items: center;" id="album_id_${info[i].album_id}">
          <span class="text" style="color: white; font-size: larger;"><a id="${info[i].album_id}" onclick="getFilesIbAlb(event)">Название албома: ${info[i].name}</a></span>
          <button onclick="delAlbum(${info[i].album_id})" style="    width: 25%;" class="btn btn-secondary">Удалить</button>
        </div>
        `;
    }
  });
}

function openSharedAlb(id) {
  window.history.replaceState("", "", "?page=shared&file_id=" + id);
  root = document.getElementById("root");
  root.setAttribute('style','padding: 15px')
  root.innerHTML =
    "<button onclick='renderSharedAlb()' class='btn btn-secondary' >Назад</button><br>";
  root.innerHTML += `<div id="usersList"></div> <div id="imageList"></div>`;
  GET("/getUsersInSharedAlb?album_id=" + id, (text) => {
    var userList = JSON.parse(text);
    var locRoot = document.getElementById("usersList");
    locRoot.setAttribute("style","margin-top: 10px")
    locRoot.innerHTML = "<span style='color:white;'>Участники: </span>";
    for (var el of userList) {
      if(el.id==userList[userList.length-1].id){
        locRoot.innerHTML += `<span style='color:white;'>${el.login}</span>`;
      }
      else{
        locRoot.innerHTML += `<span style='color:white;'>${el.login}, </span>`;
      }
    }
  });
  GET("/getImageInSharedAlb?album_id=" + id, (text) => {
    var imgList = JSON.parse(text);
    var locRoot = document.getElementById("imageList");
    for (var el of imgList) {
      locRoot.innerHTML += drawPhoto("/smoll/" + el.name, el.file_id);
    }
  });
}

function renderSharedAlb() {
  window.history.replaceState("", "", "?page=shared");
  GET("/getSharedAlb", (text) => {
    var data = JSON.parse(text);

    root = document.getElementById("root");
    root.innerHTML = `
    <div align="center" id="crete">
    <h4 style="color: white">Создать общий альбом</h4>
     <button onclick="createShareAlb(root)" style="scale:130%" type="button" class="btn btn-secondary" >Создать</button>
    <hr width="50%" style="color: white">
    </div>
    `;
    var st = '<ul class="list-group" data-bs-theme="dark">';
    for (var el of data) {
      console.log(el);
      st += `<div name='edit_but'><li style="width:80%; margin-left:10%" class="list-group-item"><h2 onclick="openSharedAlb(${el.id})">${el.name}</h2><a><img onclick="editSharedAlb(${el.id})" style="margin-top: -40px" align="right" width="35px" src="/img/edit.png"></img></a></li></div>`;
    }
    st += "</ul>";
    root.innerHTML += st;
  });
}

function createShareAlb(root) {
  GET("/getLogin", (text) => {
    var myName = JSON.parse(text);

    root.innerHTML += `
    <div class="modal" tabindex="-1" id="shareAlbMenu">
       <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title">Создать общий альбом</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
          </div>
          <div class="modal-body">
             <p>Придумайте название альбома:</p>
             <input id="albName"></input>
             <p>Добавьте пользователей:</p>
              <input id="users"></input><button onclick="serchUsers(0)">Найти</button>
              <div id="listOfUsers"></div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
            <button type="button" onclick="createNewSharedAlb(event)" class="btn btn-primary">Создать</button>
          </div>
        </div>
      </div>
      </div>
    `;
    var list = document.getElementById("listOfUsers");
    list.innerHTML = "";
    list.innerHTML = `
    <div id="myName"> 
      <input type="checkbox" name="scales" disabled  checked />
      <label for="scales">${myName.login}</label>
    </div>
    `;

    new bootstrap.Modal(document.getElementById("shareAlbMenu")).show();
  });
}

function serchUsers(c) {
  if(c=='0'){
    var userSerch = document.getElementById("users").value;
    if (userSerch) {
      GET("/getUserByNameSerch?name=" + userSerch, (data) => {
        if (data) {
          var info = JSON.parse(data);
          var list = document.getElementById("listOfUsers");
          let serched = [];
  
          for (var i = 0; i < list.children.length; i++) {
            if (list.children[i].children[0].checked == false) {
              list.children[i].remove();
            }
            serched.push(list.children[i].children[1].textContent);
          }
  
          for (var i = 0; i < info.length; i++) {
            var check = 1;
            for (var j = 0; j < serched.length; j++) {
              if (info[i].login == serched[j]) {
                check = 0;
              }
            }
            if (check == 1) {
              list.innerHTML += `
                  <div id="user_id_${info[i].id}"> 
                    <input type="checkbox" id="${info[i].id}" name="scales" checked />
                    <label for="scales">${info[i].login}</label>
                  </div>
                  `;
            }
          }
        }
      });
    } else {
      alert("Поле поиска пустое");
    }
  }
  else if (c=='1'){
    var userSerch = document.getElementById("users").value;
    if (userSerch) {
      GET("/getUserByNameSerch?name=" + userSerch, (data) => {
        if (data) {
          var info = JSON.parse(data);
          var list = document.getElementById("listOfUsers");
          let serched = [];
  
          for (var i = 0; i < list.children.length; i++) {
            if (list.children[i].children[0].checked == false) {
              list.children[i].remove();
            }
            serched.push(list.children[i].children[1].textContent);
          }
  
          list.innerHTML=``

          a=document.querySelectorAll('label')
          
          for (var i = 0; i < info.length; i++) {
            var check = 1;
            for (var j = 0; j < serched.length; j++) {
              if (info[i].login == serched[j]) {
                check = 0;
              }         
            }
            for(var j = 0; j < a.length; j++){
              if(info[i].login==a[j].dataset.value){
                check = 0;
              }       
            }
            var usersInSharedAlb = document.getElementById('usersInSharedAlb')
            if (check == 1) {
              usersInSharedAlb.innerHTML += `
                  <div id="usersDiv" id="user_id_${info[i].id}"> 
                    <input type="checkbox" id="${info[i].id}" name="scales" checked />
                    <label data-uid="${info[i].id}" data-value="${info[i].login}" for="scales">${info[i].login}</label>
                  </div>
                  `;
            }
          }
        }
      });
    } else {
      alert("Поле поиска пустое");
    }
  }
}

function createNewSharedAlb() {
  var albName = document.getElementById("albName").value;
  var usersList = document.getElementById("listOfUsers");
  let users = [];
  let userIds = [];
  for (var i = 0; i < usersList.children.length; i++) {
    users.push({
      name: usersList.children[i].children[1].textContent,
      cheked: usersList.children[i].children[0].checked,
    });
  }

  for (var i = 0; i < users.length; i++) {
    if (!users[i].cheked) continue;

    GET("/getUserIdByName?name=" + users[i].name, (data) => {
      ids = JSON.parse(data);
      userIds.push(ids[0].id);
    });
  }

  POST("/createSharedAlb", "name=" + albName, (data) => {
    if (data == "OK") {
      console.log("Создан");
      var idLastSharedAlb = -1;

      GET("/getLastShareAlbIdByName?name=" + albName, (data) => {
        var id = JSON.parse(data);
        idLastSharedAlb = id[0].id;
        addUsersToSharedAlb(userIds, idLastSharedAlb);
      });

      console.log(users, albName, userIds);
    }
  });
}

function addUsersToSharedAlb(userIds, idLastSharedAlb) {
  counter = 0;
  for (var i = 0; i < userIds.length; i++) {
    POST(
      "/addUsersToSharedAlb",
      "user_id=" + userIds[i] + "&album_id=" + idLastSharedAlb,
      (data) => {
        if (data == "OK") {
          console.log("Пользователи добавлены");
          counter++;
          if (counter == userIds.length) window.location.reload();
        }
      },
    );
  }
}

function test() {
  GET("/getInfoSharedAlbByUid", (data) => {
    var info = JSON.parse(data);
    console.log(info);
  });
}

//Избранное
function renderFav() {
  window.history.replaceState("", "", "?page=favor");
  currentPage = pageList.favor;
  chengeContext();
  GET("/getFavId", (text) => {
    var data = JSON.parse(text);
    root = document.getElementById("root");
    root.innerHTML = "";

    for (var i = data.length - 1; i >= 0; i--) {
      if(data[i].name.split('.')[1]=='mp4'){
        root.innerHTML += drawVideo("uploads/" + data[i].name, data[i].file_id) 
      }
      else{
        root.innerHTML += drawPhoto("/smoll/" + data[i].name, data[i].file_id);
      }
    }

    var downloadAllImgs = document.getElementById("downloadAllImgs");
    downloadAllImgs.setAttribute("onclick", 'zipFiles("fav")');
  });
}

function delFav(id) {
  POST("/delFav", "file_id=" + clickImgId, (data) => {
    if (data == "OK") {
      obj = document.getElementById("file_id_" + clickImgId);
      obj.innerHTML = "";
      renderFav();
      console.log("Удалён");
    } else {
      console.log("Ошибка в коде");
    }
  });
}
function delFromAlb(id) {
  POST("/delFromAlb", "file_id=" + clickImgId, (data) => {
    if (data == "OK") {
      obj = document.getElementById("file_id_" + clickImgId);
      obj.innerHTML = "";
      var fileId = window.location.search.split("&album_id=")[1];
      getFilesIbAlb(fileId);
      console.log("Удалён");
    } else {
      console.log("Ошибка в коде");
    }
  });
}

function delFile(id) {
  POST("/delFile", "file_id=" + clickImgId, (data) => {
    if (data == "OK") {
      obj = document.getElementById("file_id_" + clickImgId);
      obj.innerHTML = "";
      loadFiles();
      console.log("file deleted");
    } else {
      console.log("erroe in code");
    }
  });
}

function delAlbum(id) {
  obj = document.getElementById("album_id_" + id);
  obj.innerHTML = "";

  POST("/delAlbum", "id=" + id, (data) => {
    if (data == 1) {
      console.log("Удалён");
    } else {
      console.log("Ошибка в коде");
    }
  });
}

function addAlbum() {
  a = document.getElementById("textInput");

  POST("/addAlbum", "name=" + a.value, (text) => {
    data = JSON.parse(text);
    console.log(data);
  });

  albums();
}

function toFav(e) {
  action = e.target.dataset.action;

  if (action == 0) {
    //Избранное
    GET("/getFavId", (text) => {
      var files_name = JSON.parse(text);
      var checker = 0;

      for(var i=0;i<files_name.length;i++){
        if(clickImgId == files_name[i].file_id){
          a = document.getElementById("root");
          a.innerHTML += `
          <div class="modal" tabindex="-1" id="exampleModal" style="margin-top: 20%">
            <div class="modal-dialog">
              <div class="modal-content">
                <div class="modal-body">
                  <h5 class="modal-title">Файл уже добавлен в избранное</h5>
                </div>
              </div>
            </div>
          </div>
          `;
          new bootstrap.Modal(document.getElementById("exampleModal")).show();
          return;
        }  
      }

        POST("/addFav", "file_id=" + clickImgId, (data) => {
          if (data == "OK") {
            a = document.getElementById("root");
            a.innerHTML += `
            <div class="modal" tabindex="-1" id="exampleModal" style="margin-top: 20%">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-body">
                    <h5 class="modal-title">Файл успешно добавлен</h5>
                  </div>
                </div>
              </div>
            </div>
  
                    `;
            new bootstrap.Modal(document.getElementById("exampleModal")).show();
          } else {
            a = document.getElementById("root");
            a.innerHTML += `
            <div class="modal" tabindex="-1" id="exampleModal">
              <div class="modal-dialog">
                <div class="modal-content">
                  <div class="modal-body">
                    <h5 class="modal-title">Файл уже добавлен в избранное22222</h5>
                  </div>
                </div>
              </div>
            </div>
            `;
            new bootstrap.Modal(document.getElementById("exampleModal")).show();
          }
        });
    });
  }
}

function logout() {
  GET("/logout", (data) => {
    var data = JSON.parse(data);

    if (data.logout) {
      window.location.replace("/login.html");
    }
  });
}

function uploadFile() {
  var a = document.createElement("input");
  a.setAttribute("type", "file");
    a.onchange = async () => {
      readyUpload("/upload", a.files[0], (text) => {
        console.log(text);
        var data = JSON.parse(text);
        root = document.getElementById("root");
        var checkForFormat = a.files[0].name.split('.')[1];

        if(checkForFormat=='arw' || checkForFormat=="dng" || checkForFormat=='ARW' || checkForFormat=='DNG'){
          root.innerHTML = drawPhoto("/img/g0R5.gif", data.id) + root.innerHTML;
          setTimeout(() => {
            var img = document.getElementById(data.id);
            img.src = "/uploads/" + data.fileName.split('.')[0]+'.jpg';
            window.location.reload()
          }, 2000);
        }
        else{
          root.innerHTML = drawPhoto("/img/g0R5.gif", data.id) + root.innerHTML;
          setTimeout(() => {
            if(data.fileName.split('.')[1]=="mp4"){
              var vid = document.getElementById(data.id);
              vid.src = "/uploads/" + data.fileName; 
              window.location.reload()
            }
            else{
              var img = document.getElementById(data.id);
              img.src = "/smoll/" + data.fileName;
              window.location.reload()
            }
          }, 1000);
        }
      });
    };
    a.click();
  }

async function readyUpload(url, file, callback) {
  let formData = new FormData();

  formData.append("file_input", file);
  let response = await fetch(url, { method: "POST", body: formData });

  if (response.ok) {
    // если HTTP-статус в диапазоне 200-299
    // получаем тело ответа (см. про этот метод ниже)
    let text = await response.text();

    callback(text);
  } else {
    alert("Ошибка HTTP: " + response.status);
  }
}

function renderSerch() {
  window.history.replaceState("", "", "?page=search");
  root = document.getElementById("root");
  root.innerHTML = "";
  root.innerHTML = `
    <div align="center" id="crete">
    <h4 style="color: white">Поиск:</h4>

    <div class="input-group" style="width: 50%">
      <input id="tagSerchInp" style="width: 50%" class="form-control" data-bs-theme="dark">
    </div>
    <button onclick="serchByTag()" style="margin-top: 20px" class="btn btn-secondary">Найти</button>
    
    <hr width="50%" style="color: white">
    </div>
    <div id="content"></div>
  `;
}

function addTag(id) {
  if (id) {
    clickImgId = id;
  }

  a = document.getElementById("root");
  b = document.getElementById("tag");
  if (b) {
    b.remove();
  }
  a.innerHTML += `
  <div class="modal" tabindex="-1" id="tag" style="margin-top:100px;width: 40%;margin-left: 30%;}">
   <div class="modal-dialog">
    <div class="modal-content">
      <div class="modal-header">
        <h5 class="modal-title">Добавить тэги</h5>
        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Закрыть"></button>
      </div>
      <div class="modal-body">
         <p>Придумайте тэг:</p>
         <input id="tagInput"></input>
         <button onclick="renderNewTag()">Добавить</button>
         <div id="listOfTags"></div>
      </div>
      <div class="modal-footer">
        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
        <button type="button" onclick="addNewTags(event)" class="btn btn-primary">Добавить</button>
      </div>
    </div>
  </div>
  </div>
          `;
  GET("/getTags?file_id=" + clickImgId, (data) => {
    info = JSON.parse(data);
    var c = document.getElementById("listOfTags");
    if (info.length > 0) {
      for (var i = 0; i < info.length; i++) {
        c.innerHTML += `
        <div id="myName"> 
          <input type="checkbox" name="scales" checked disabled />
          <label for="scales">${info[i].value}</label>
        </div>
        `;
      }
    }
  });

  new bootstrap.Modal(document.getElementById("tag")).show();
}

function serchTags() {}

function renderNewTag() {
  var tag = document.getElementById("tagInput").value;
  list = document.getElementById("listOfTags");

  if (tag.length > 0) {
    if (list.children.length < 1) {
      list.innerHTML += `
      <div> 
        <input type="checkbox" name="scales" checked />
        <label for="scales">${tag}</label>
      </div>
      `;
    } else {
      for (var i = 0; i < list.children.length; i++) {
        var check = 1;
        if (list.children[i].children[1].textContent == tag) {
          alert("Тэг уже добавлен");
          a = document.getElementById("tagInput");
          a.value = "";
          check = 0;
          return;
        }
      }
      if (check != 0) {
        list.innerHTML += `
        <div> 
          <input type="checkbox" name="scales" checked />
          <label for="scales">${tag}</label>
        </div>
        `;
      }
    }
  }
}

function addNewTags() {
  var checkboxes = document.querySelectorAll('input[type="checkbox"]:checked');
  var list = document.getElementById("listOfTags");
  var tags = [];
  for (var i = 0; i < checkboxes.length; i++) {
    if (checkboxes[i].checked) {
      tags.push(list.children[i].children[1].textContent);
    }
  }
  for (var i = 0; i < tags.length; i++) {
    POST("/addTags", "value=" + tags[i] + "&file_id=" + clickImgId, (data) => {
      if (data == "OK") {
        loadFiles();
        console.log("Добавлен");
        location.reload();
      } else {
        console.log("Ошибка в коде");
      }
    });
  }
}

function serchByTag() {
  value = document.getElementById("tagSerchInp").value;
  if (value) {
    var content = document.getElementById("content");
    GET("/serchTags?value=" + value, (text) => {
      data = JSON.parse(text);
      if (data.length) {
        content.innerHTML = "";
        for (var i = data.length - 1; i >= 0; i--) {
          content.innerHTML += drawPhoto(
            "/smoll/" + data[i].name,
            data[i].file_id,
          );
        }
      } else {
        content.innerHTML =
          '<h2 align="center" class="text" style="color: white">Изображений с данным тэгом не найдено</span></h2';
      }
    });
  } else {
    content.innerHTML =
      '<h2 align="center" class="text" style="color: white">Напишите что-нибудь в поиск</span></h2';
  }
}

function setup() {
  let arrow = document.querySelectorAll(".callapseLictMenu");
  for (var i = 0; i < arrow.length; i++) {
    arrow[i].addEventListener("click", (e) => {
      var el = e.target;
      while (el.tagName != "LI") {
        el = el.parentElement;
      }
      el.classList.toggle("showMenu");
    });
  }
  let sidebar = document.querySelector(".sidebar");
  let sidebarBtn = document.querySelector(".bx-menu");
  console.log(sidebarBtn);
  sidebarBtn.addEventListener("click", () => {
    sidebar.classList.toggle("close");
  });
}

async function initMap(url) {
  var vvv=document.getElementById('app')
  vvv.innerHTML=``

  await ymaps3.ready;

  new bootstrap.Modal(document.getElementById("map")).show();

  const { YMap, YMapDefaultSchemeLayer,YMapDefaultFeaturesLayer } = ymaps3;
  fetch("/getgps?url="+'public/'+url).then(data => data.json()).then(async resp => {
      console.log(resp)
      if(resp=='400'){
        vvv.innerHTML=`У данной фотографии нет данных о геопозиции`
      }
      else{
        const map = new YMap(
          document.getElementById('app'),
          {
              location: {
                  center: [resp.N,
                  resp.E],
                  zoom: 18
              }
          }
      );
      
      var adr = (await fetch('http://nominatim.openstreetmap.org/reverse?format=json&lon=' + resp.N + '&lat=' + resp.E).then(response => response.json()))

         const { YMapDefaultMarker } = await ymaps3.import('@yandex/ymaps3-markers@0.0.1');
         const layer = new YMapDefaultSchemeLayer();
         const layer2 = new YMapDefaultFeaturesLayer();
         map.addChild(layer);
         map.addChild(layer2);
         map.addChild(
             new YMapDefaultMarker({
                 coordinates: [resp.N,
                     resp.E],
                 title: adr.address.city+', '+adr.address.road+' '+adr.address.house_number,
                 subtitle: 'Дата съёмки: '+resp.Data,
                 color: 'blue'
             })
         );
         
         map.addChild(new YMapDefaultSchemeLayer());
         var a=document.getElementsByClassName('ymaps3x0--default-marker__title-wrapper')
         a[0].setAttribute('style','max-width: 300px')
      }
  })
}

setup();
