// CollabNote is a minimalistic collaborative markdown text editor
// License: AGPL v3, https://www.gnu.org/licenses/agpl-3.0.txt
// Copyright (C) 2016 Alexander Barth, https://github.com/Alexander-Barth

var WebSocketServer = require('ws').Server;
var http = require('http');

var ipaddr = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port = process.env.OPENSHIFT_NODEJS_PORT || 8000

var finalhandler = require('finalhandler');
var serveStatic = require('serve-static');

// mongodb
var MongoClient = require('mongodb').MongoClient;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;
var url = 'mongodb://localhost:27017/collabnote';

// if OPENSHIFT env variables are present, use the available connection info:
if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
  url = 'mongodb://' + process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
        process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
        process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
        process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
        process.env.OPENSHIFT_APP_NAME;
}

// Serve up public folder
var serve = serveStatic('public/', {'index': ['index.html']});

var server = http.createServer(function(req, res) {
    var done = finalhandler(req, res);
    serve(req, res, done);
});

var  wss = new WebSocketServer({server:server});

// all connections
connections = [];

wss.on('connection', function(ws) {
    console.log('Client connected');
    // add to list of active connections
    connections.push(ws);

    ws.on('message', function(msg, flags) {
        if (flags.binary) { 
            return; 
        }
        
        var data = JSON.parse(msg);
        //console.log('got ' + msg);

        if (data.command === 'subscribe') {
            ws.docid = data.docid;
            ws.userid = data.userid;

            // send revision history

            var revhistory = {
                'command': 'edit',
                'diff': []
            };

            MongoClient.connect(url, function(err, db) {
                assert.equal(null, err);
                var cursor = db.collection('documents').find({'docid': ws.docid});

                cursor.each(function(err, doc) {
                    assert.equal(err, null);
                    if (doc != null) {
                        Array.prototype.push.apply(revhistory.diff,doc.diff);
                        //console.log('got from db',doc);
                    } 
                    else {                        
                        //console.log('revhistory',JSON.stringify(revhistory));
                        ws.send(JSON.stringify(revhistory));
                        db.close();
                    }
                });
            });            
        }
        else if (data.command === 'edit') {

            MongoClient.connect(url, function(err, db) {
                assert.equal(null, err);
                db.collection('documents').insertOne(
                    {'docid': ws.docid,
                     'diff': data.diff},
                    function(err,result) {
                        assert.equal(err, null);
                        //console.log("Inserted data into",ws.docid);
                        db.close();
                    });
            });

            // broardcast
            for (var i = 0; i < connections.length; i++) {
                if (this !== connections[i]) {
                    if (connections[i].docid === ws.docid) {
                        //console.log('send ' + msg + ' to ' + connections[i].userid);
                        connections[i].send(msg);
                    }
                }
            }
        }
        else {
            ws.send(JSON.stringify({'message': 'unknown command'}));
        }

    });
    ws.on('close', function() {
        console.log('Connection closed');

        // removing the closed connections from the connections list
        var index = connections.indexOf(ws);
        if (index > -1) {
            connections.splice(index, 1);
        }

    });
    ws.on('error', function(e) {
      console.log(e);
    });
});

// Listen
server.listen(port, ipaddr, function() {
    console.log((new Date()) + ': Listening at http://' + ipaddr + ':' + port);
});
