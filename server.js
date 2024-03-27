const express = require('express')
const multer = require('multer')
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('db.db');
const cookieParser = require("cookie-parser");
const sessions = require('express-session');
const { v4: uuidv4 } = require('uuid');
const sharp = require('sharp');
const port = 8888;
const { spawn } = require('child_process');
const app = express()
const SSE = require('express-sse');
const bodyParser = require('body-parser');
const http = require('http');
const fs = require('fs');
const mime = require('mime');
const path = require('path');
const download = require('downloadjs');
const extractd = require('extractd');
const { getExif } = require("./photo_utils");

var crypto = require('crypto');

const oneDay = 1000 * 60 * 60 * 24;

app.use(sessions({
  secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
  saveUninitialized: true,
  cookie: { maxAge: oneDay },
  resave: false
}));

app.use(bodyParser.json());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb' }));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'public/uploads/')
  },
  filename: function (req, file, cb) {
    if (req.query.crop) {
      cb(null, file.originalname)
      return;
    }
    var name = file.originalname.split('.')
    name = name[name.length - 1]
    cb(null, uuidv4() + "." + name)
  }
})
const upload = multer({ storage: storage })

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'))

var filesSupport = {
  'jpg': 1,
  'png': 1,
  'jpeg': 1,
  'gif': 1,
  'arw': 2,
  'ARW': 2,
  'DNG': 2,
  'dng': 2,
  'mp4': 3
}

app.post('/dbg', (req, res) => {
  if (req.body.sql) {
    db.all(req.body.sql, (err, row) => {
      if (err) {
        console.warn(err)
        res.send(err)
      } else {
        res.send(row)
      }
    })
  }
})

app.get("/getgps", async (req,res) => {
  var data = await getExif(req.query.url)
  console.log(data)
  if(data=='400' || !data.gps.GPSLatitude){
    res.send('400')
  }
  else{
    res.send(JSON.stringify({
      E: data.gps.GPSLatitude[0] + data.gps.GPSLatitude[1]/60 + data.gps.GPSLatitude[2]/3600 ,
      N: data.gps.GPSLongitude[0] + data.gps.GPSLongitude[1]/60 + data.gps.GPSLongitude[2]/3600,
      Data: data.image.ModifyDate.split(' ')[0].replaceAll(':','.')
    }))
  }
})

/* -------------Загрузка фотографии------------- */
app.post('/upload', upload.single('file_input'), function (req, res) {

  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }

  if (!req.file) {
    res.send({ error: "not support file" })
    return
  }

  if (req.file.filename.split('.')[1] == "dng" || req.file.filename.split('.')[1] == "arw" || req.file.filename.split('.')[1] == "DNG" || req.file.filename.split('.')[1] == "ARW") {
    db.all("INSERT INTO File (uid, name) VALUES (?,?)", [req.session.uid, req.file.filename.split('.')[0] + '.jpg'], (err, row) => {
      if (err) {
        console.log(err)
        res.send({ error: "DB ERROR" })
        return
      }
      db.all("SELECT file_id FROM File WHERE name = ?", [req.file.filename.split('.')[0] + '.jpg'], (err, row) => {
        if (err) {
          console.log(err)
          res.send({ error: "DB ERROR" })
          return
        }
        console.log(req.file)
        res.send({ fileName: req.file.filename, id: row[0].file_id })
      })
      //res.send("OK")
    });
  }
  else {
    db.all("INSERT INTO File (uid, name) VALUES (?,?)", [req.session.uid, req.file.filename], (err, row) => {
      if (err) {
        console.log(err)
        res.send({ error: "DB ERROR" })
        return
      }
      db.all("SELECT file_id FROM File WHERE name = ?", [req.file.filename], (err, row) => {
        if (err) {
          console.log(err)
          res.send({ error: "DB ERROR" })
          return
        }
        console.log(req.file)
        res.send({ fileName: req.file.filename, id: row[0].file_id })
      })
      //res.send("OK")
    });
  }



  compressFile(req.file.filename)
});

async function compressFile(fileName) {
  var fileExt = fileName.split('.')[1]
  if (!filesSupport[fileExt]) {
    console.log({ error: "unsuported files" })
    res.send({ error: "unsuported files" })
  }

  if (filesSupport[fileExt] == 1) {
    sharp(__dirname + '/public/uploads/' + fileName).resize({ height: 150 }).toFile(__dirname + '/public/smoll/' + fileName)
      .then(function (newFileInfo) {
        // newFileInfo holds the output file properties
        console.log("Success")
      })
      .catch(function (err) {
        console.log("Error occured");
      });
  }

  else if (filesSupport[fileExt] == 2) {

    var done = await extractd.generate(__dirname + '/public/uploads/' + fileName, {
      destination: __dirname + '/public/uploads'
    });

    console.dir(done);

    sharp(done.preview).resize({ height: 150 }).toFile(__dirname + '/public/smoll/' + fileName.split(".")[0]+".jpg")
      .then(function (newFileInfo) {
        // newFileInfo holds the output file properties
        console.log("Success")
      })
      .catch(function (err) {
        console.log("Error occured");
      });

  }
}

/*---------------Отгрузка_Фото--------------- */
app.get('/getAllFiles', (req, res) => {
  db.all("SELECT * FROM File WHERE uid=?", [req.session.uid], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: "DB ERROR" })
      return
    }
    res.send(row)

  });
})

app.post('/delFile', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  db.all("DELETE FROM File WHERE file_id=?", [req.body.file_id], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: "DB ERROR" })
      return
    }
    res.send("OK")
  });
})

/*---------------Добавить_в_избранное-----------*/
app.post('/addFav', (req, res) => {

  db.all("INSERT INTO Archive (file_id, user_id) VALUES (?,?)", [req.body.file_id, req.session.uid], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: "DB ERROR" })
      return
    }
    res.send("OK")
  });
})

app.get('/getFavId', (req, res) => {
  db.all("SELECT * FROM Archive a, File f WHERE a.user_id=? AND f.file_id=a.file_id", [req.session.uid], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: "DB ERROR" })
      return
    }
    res.send(row)
  })
})

app.get('/getFavName', (req, res) => {
  db.all("SELECT * FROM File WHERE file_id=?", [req.query.fid], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: "DB ERROR" })
      return
    }
    res.send(row)
  })
})

app.post('/delFav', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  db.all("DELETE FROM Archive WHERE file_id=?", [req.body.file_id], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: "DB ERROR" })
      return
    }
    res.send("OK")
  })
})

app.post('/delFromAlb', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  db.all("DELETE FROM FileInAlbum WHERE file_id=?", [req.body.file_id], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: "DB ERROR" })
      return
    }
    res.send("OK")
  })
})

app.post('/saveCropImg', upload.single('file_input'), (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  compressFile(req.file.filename)
  res.send('OK')

})

/*---------------Пользователь--------------- */
app.post('/reg', (req, res) => {
  console.log(req.body.log)
  db.all("SELECT * FROM Users WHERE login=?", [req.body.log], (err, row) => {
    if (row.length == 0) {
      db.all("INSERT INTO Users (login,pass) VALUES (?,?)",
        [req.body.log, req.body.pass], (err, row) => {
          if (err) {
            res.send(err)
          } else {
            db.all("SELECT * FROM Users WHERE login=? AND pass=?", [req.body.log, req.body.pass], (err, row) => {
              console.log(row)
              if (row.length == 0) {
                res.send("err")
              }
              else {
                req.session.login = true;
                req.session.uid = row[0].id;
                req.session.userName = row[0].login;

                console.log(req.session)

                res.send("OK")
              }
            });

          }
        });
    }
    else {
      res.send("Уже есть такой пользователь с таким логином")
    }
  });
})

app.get('/log', (req, res) => {
  db.all("SELECT * FROM Users WHERE login=? AND pass=?", [req.query.login, req.query.pass], (err, row) => {
    console.log(row)
    if (row.length == 0) {
      res.send("err")
    }
    else {
      req.session.login = true;
      req.session.uid = row[0].id;
      req.session.userName = row[0].login;

      console.log(req.session)

      res.send("OK")
    }
  });

})

app.get('/getLogin', (req, res) => {

  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  res.send({ login: req.session.userName })
})

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.send({ logout: true })
});


/*---------------Альбомы--------------- */
app.post('/addAlbum', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  db.all('INSERT INTO Albums (user_id,name) VALUES (?,?)', [req.session.uid, req.body.name], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: err })
    } else {
      res.send({ data: 'OK' })
    }
  })
})

app.get('/getFilesInAlbum', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  db.all("SELECT a.file_id, al.user_id, a.name, al.album_id, al.name AS 'alb_name' FROM File a, FileInAlbum f, Albums al WHERE f.album_id=? AND a.file_id=f.file_id and al.album_id=?", [req.query.album_id,req.query.album_id], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: "DB ERROR" })
      return
    }
    res.send(row)
  })

})

app.post('/addFileToAlbum', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  console.log(req.body)
  db.all('INSERT INTO FileInAlbum (file_id,album_id) VALUES (?,?)', [req.body.file_id, req.body.album_id], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: err })
    } else {
      res.send('OK')
    }
  })
})


app.get('/getAlbums', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  db.all("Select * from Albums u, Users p WHERE u.user_id=p.id and p.id=" + [req.session.uid], (err, row) => {
    if (row.length == 0) {
      res.send("0")
    }
    else if (row.length > 0) {
      res.send(row)
    }
    else {
      res.send(row)
    }
  })

})

app.post('/delAlbum', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  db.all("DELETE FROM Albums WHERE album_id=?", [req.body.id], (err, row) => {
    if (err) {
      res.send(err)
    } else {
      res.send('1')
    }
  })

})

app.get('/getUserByNameSerch', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  db.all("SELECT * FROM Users WHERE login LIKE ?", [req.query.name] + '%', (err, row) => {
    if (err) {
      res.send(err)
    } else {
      res.send(row)
    }
  })

})

app.post('/createSharedAlb', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }

  db.all("INSERT INTO SharedAlbums (namme) VALUES (?)", [req.body.name], (err, row) => {
    if (err) {
      res.send(err)
    }
    else {
      res.send('OK')
    }
  })
})

app.post('/updateUsersInSheredAlbums',(req,res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }

  db.all("DELETE FROM usersInSharedAlb WHERE album_id=? AND user_id=?", [req.body.alb_id,req.body.uid], (err,row) => {
    if (err) {
      res.send(err)
    }
    else {
      db.all("INSERT INTO usersInSharedAlb (user_id,album_id) VALUES (?,?)", [req.body.uid, req.body.alb_id], (err,row) => {
        if (err) {
          res.send(err)
        }
        else {
          res.send('OK')
        }
      })
    }
  })
})

app.get('/getLastShareAlbIdByName', (req, res) => {
  db.all("SELECT id FROM sharedAlbums WHERE namme=? ORDER BY id DESC LIMIT 1", [req.query.name], (err, row) => {
    if (err) {
      res.send(err)
    }
    else {
      res.send(row)
    }
  })
})


app.post('/addUsersToSharedAlb', (req, res) => {
  db.all("INSERT INTO usersInSharedAlb (user_id,album_id) VALUES (?,?)", [req.body.user_id, req.body.album_id], (err, row) => {
    if (err) {
      res.send(err)
    }
    else {
      res.send('OK')
    }
  })
})

app.post('/addImgToSharedAlb', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  console.log(req.body)
  db.all('INSERT INTO fileInSharedAlb (file_id,album_id) VALUES (?,?)', [req.body.file_id, req.body.album_id], (err, row) => {
    if (err) {
      console.log(err)
      res.send({ error: err })
    } else {
      res.send('OK')
    }
  })
})

app.get('/getUserIdByName', (req, res) => {
  db.all("SELECT * FROM Users WHERE login=?", [req.query.name], (err, row) => {
    if (err) {
      res.send(err)
    }
    else {
      res.send(row)
    }
  })
})



app.get("/getSharedAlb", (req, res) => {
  db.all("SELECT sa.id, sa.namme AS 'name' FROM usersInSharedAlb usa, sharedAlbums sa WHERE sa.id=usa.album_id AND usa.user_id=?", [req.session.uid], (err, row) => {
    if (err) {
      console.warn(err)
      res.send(err)
    }
    else {
      res.send(row)
    }

  })
})

app.get('/getImageInSharedAlb', (req, res) => {
  db.all("SELECT f.file_id, f.name FROM fileInSharedAlb fisa, File f WHERE f.file_id=fisa.file_id AND fisa.album_id=?", [req.query.album_id], (err, row) => {
    if (err) {
      console.warn(err)
      res.send(err)
    }
    else {
      res.send(row)
    }
  })
})

app.get('/getUsersInSharedAlb', (req, res) => {
  db.all("SELECT u.id, u.login, a.namme FROM usersInSharedAlb usa, Users u, sharedAlbums a WHERE u.id=usa.user_id AND usa.album_id=? AND a.id=usa.album_id", [req.query.album_id], (err, row) => {
    if (err) {
      console.warn(err)
      res.send(err)
    }
    else {
      res.send(row)
    }
  })
})


/*-----------------Тэги-----------*/
app.post('/addTags', (req, res) => {
  db.all("INSERT INTO Tags (value, file_id) VALUES (?,?)", [req.body.value, req.body.file_id], (err, row) => {
    if (err) {
      res.send(err)
    }
    else {
      res.send("OK")
    }
  })

})

app.get('/getTags', (req, res) => {
  db.all("SELECT t.tag_id, t.value, f.name FROM Tags t, File f WHERE f.file_id=t.file_id AND f.file_id=?", [req.query.file_id], (err, row) => {
    if (err) {
      res.send(err)
    }
    else {
      res.send(row)
    }
  })
})

app.get('/serchTags', (req, res) => {
  if (!req.session.login) {
    res.send({ error: "AUTH ERROR" })
    return
  }
  db.all("SELECT DISTINCT f.file_id, f.name FROM Tags t, File f WHERE value LIKE ? AND f.uid=0 AND f.file_id=t.file_id", [req.query.value] + '%', (err, row) => {
    if (err) {
      res.send(err)
    } else {
      res.send(row)
    }
  })

})

app.listen(port, () => {
  console.log('Example app listening on port ${port}')
})

