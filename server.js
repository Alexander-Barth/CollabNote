// CollabNote is a minimalistic collaborative markdown text editor
// License: AGPL v3, https://www.gnu.org/licenses/agpl-3.0.txt
// Copyright (C) 2016 Alexander Barth, https://github.com/Alexander-Barth

var express = require('express');
var multer  = require('multer')
var upload = multer();

var app = express();
var expressWs = require('express-ws')(app);

var ipaddr = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
var port = process.env.OPENSHIFT_NODEJS_PORT || 8000

// mongodb
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var Grid = mongodb.Grid;
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

function makeid(len)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}

app.use(express.static('public'));
 
// app.use(function (req, res, next) {
//   console.log('middleware');
//   req.testing = 'testing';
//   return next();
// });
 
app.get('/', function(req, res, next){
  console.log('get route', req.testing);
  res.end();
});

app.param('id', function (req, res, next, id) {
  console.log('CALLED ONLY ONCE');
  next();
});

app.get('/media/:id', function(req, res) {
    console.log('get route', req.params.id);
    
    var mediaid = req.params.id;
    
    MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);
        db.collection('media').findOne(
            {'mediaid': mediaid},
            function(err, doc) {
                console.log(typeof doc.media);
                console.log('check ',doc.media instanceof Buffer,Object.prototype.toString.call(doc.media));
                console.log('doc.media',doc.media);
                res.send(doc.media.buffer);
                res.end();
                db.close();
            });            
    });
});



app.post('/upload', upload.single('media'), function(req, res) {
    var sampleFile;

    // check if file is an image or video, otherwise reject
    console.log('req',req);
    console.log('req.file',req.file);
    // make sure mediaid is unique
    var mediaid = makeid(5) + '-' + req.file.originalname;

    var buffer = req.file.buffer;

    console.log('buffer',buffer);
    console.log('buffer data',buffer instanceof Buffer);

    var media = new mongodb.Binary(buffer);
    console.log('media',media);

    MongoClient.connect(url, function(err, db) {
        assert.equal(null, err);

        db.collection('media').insertOne(
            {'mediaid': mediaid,
             'media': media},
            function(err,result) {
                assert.equal(err, null);
                console.log("Inserted data into",mediaid);
                db.close();
            });

    });


    res.send(JSON.stringify({'mediaid': mediaid}));
}); 

// all connections
connections = [];

app.ws('/', function(ws, req) {
    console.log('Client connected');
    // add to list of active connections
    connections.push(ws);


    ws.on('message', function(msg) {
        var data = JSON.parse(msg);
        console.log('got ' + msg);

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

    console.log('socket', req.testing);
});
 
app.listen(8000);
