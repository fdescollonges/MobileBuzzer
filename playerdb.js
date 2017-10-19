var Cloudant = require('cloudant')

var playerdb

var callbackdb = function (err, functionname, data, cb) {
  if (err) {
    console.error('[ERROR - playerdb - %s : %s]', functionname, err.message)
    cb(err, false)
  } else {
    console.log('[INFO - playerdb - %s : %s]', functionname, data)
    cb(null, data)
  }
}

var initializePlayerDB = function (me, password, cb) {
  var cloudant = Cloudant({ account: me, password: password })
  playerdb = cloudant.db.use('mobilebuzzer')
  cloudant.db.list(function (err, allDbs) {
    if (err) {
      console.error('[ERR - playerdb] Unable to list all dbs : ' + err)
      callbackdb(err, 'initializePlayerDB - Error listing dbs', null, cb)
    } else {
      console.log('All my databases: %s', allDbs.join(', '))
      // ldb.list({"include_docs":true}, function(er, body) {
      playerdb.list(function (err2, body) {
        if (err2) {
          callbackdb(err2, 'initializePlayerDB - Error listing docs', null, cb)
        } else {
          if (body.total_rows === 0) { cb(null, null) } else {
          body.rows.forEach(function (doc) {
            if (doc.id.substring(0, 7) !== '_design') {
              console.log('deleting id: %s, rev: %s', doc.id, doc.value.rev)
              playerdb.destroy(doc.id, doc.value.rev, function (err3, body) {
                if (err3) {
                  console.log('ERROR: Unable to delete - %s', err3)
                  callbackdb(err3, 'initializePlayerDB - unabke to delete - ' + doc.id, null, cb)
                } else {
                  console.log('Deleted : $s', body)
                  callbackdb(null, 'initializePlayerDB - Deleted : ' + doc.id, null, cb)
                }
              })
            }
          })}
        }
      })
    }
  })
}

var existPlayer = function (name, cb) {
  playerdb.get(name, function (err, data) {
    if (err) {
      cb(null, false)
    } else {
      cb(null, data)
    }
  })
}

var updatePlayer = function (name, updateScore, updateBuzz, cb) {
  existPlayer(name, function (err, player) {
    if (err || !player) {
      callbackdb(err, 'updatePlayer', null, cb)
    } else {
      player.score = player.score + updateScore
      player.buzz = player.buzz + updateBuzz
      playerdb.insert(player, callbackdb(null, 'updatePlayer', name, cb))
    }
  })
}

var initPlayer = function (name, cb) {
  existPlayer(name, function (err, player) {
    if (err) {
      callbackdb(err, 'initPlayer', null, cb)
    } else {
      if (!player) {
        playerdb.insert({ '_id': name, 'score': 0, 'buzz': 0 }, callbackdb(null, 'initPlayer', name, cb))
      } else {
        player.score = 0
        player.buzz = 0
        playerdb.insert(player, callbackdb(null, 'initPlayer', name, cb))
      }
    }
  })
}

var getPlayerInfo = function (name, cb) {
  playerdb.insert({ '_id': name, 'score': 0, 'buzz': 0 }, cb)
}

module.exports = {
  playerdb: playerdb,
  initializePlayerDB: initializePlayerDB,
  getPlayerInfo: getPlayerInfo,
  initPlayer: initPlayer,
  updatePlayer: updatePlayer
}
