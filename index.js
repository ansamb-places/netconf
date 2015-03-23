var portscanner = require('portscanner');
var crypto = require('crypto');
var async = require('async');
var os = require('os');
var fs = require('fs');
var path = require('path');

if (process.argv.length < 4)
  return console.error('Usage: node ' + process.argv[0] + ' <profiles_dir> <profile>');

var profiles_dir = process.argv[2];
var profile = process.argv[3];

var profile_dir = path.join(profiles_dir, profile);
var settingsfile = path.join(profile_dir, 'local_settings.json');

var noyo_dir = path.join(profile_dir, "noyo");
var noyo_db_dir = path.join(noyo_dir, "db");
var noyo_tmp_dir = path.join(noyo_dir, "tmp");
var noyo_cookies = path.join(noyo_tmp_dir, "erlang-cookies");

var framework_dir = path.join(profile_dir, "framework");
var dirToCreate = [profiles_dir, profile_dir, noyo_dir, noyo_db_dir, noyo_tmp_dir
  , noyo_cookies, framework_dir];

for(var i in dirToCreate) {
  var dir = dirToCreate[i];
  if(!fs.existsSync(dir)) fs.mkdirSync(dir);
}
        
async.parallel(
  [function(callback){generate_auth_token(callback)},
   function(callback){search_port(1985, 1990, callback)},
   function(callback){search_port(2010, 2015, callback)},
   function(callback){search_port(8080, 8085, callback)}],
  write_settings_file
);

function generate_auth_token(cb) {
  crypto.randomBytes(48, function(ex, buf) {
    var token = buf.toString('hex');
    cb(null, token);
  });
}

function search_port(begin, end, cb) {
  portscanner.findAPortNotInUse(begin, end, '127.0.0.1', 
    function(error, port) {
      if (error) {
        console.log(error);
        cb(error);
      } else if (port == false) {
        console.log('No avalaible port');
        cb('No avalaible port');
      } else {
        console.log('Picked avalaible port: ' + port);
        cb(null, port);
      }
  });
}

function write_settings_file(err, result) {
  var home_dir = path.resolve(profiles_dir, "..");
  var cookie = path.join(home_dir, ".erlang.cookie");
  if(fs.existsSync(cookie)) {
    var backup = path.join(noyo_cookies, ".erlang.cookie"+(+new Date()));
    fs.renameSync(cookie, backup)
  }

  var portsettings = {
    gui_auth_token:result[0],
    gui_port:result[1],
    network_port:result[2],
    http_port:result[3]
  };
  
  jsettings = JSON.stringify(portsettings, null, '\t');

  console.log ('Settings stored in file : ' + settingsfile);

  fs.writeFile(settingsfile, jsettings, function(error) { 
    if (error) console.log(error);
  });
}

