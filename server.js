// CollabNote is a minimalistic collaborative markdown text editor
// License: AGPL v3, https://www.gnu.org/licenses/agpl-3.0.txt
// Copyright (C) 2016 Alexander Barth, https://github.com/Alexander-Barth

var config  = require('./config')
var express = require('express');
var exphbs  = require('express-handlebars');

// for file upload
var multer  = require('multer')
var upload = multer();

// get mime type by file extension
var mime = require('mime');

// mongodb
var mongodb = require('mongodb');
var MongoClient = mongodb.MongoClient;
var Grid = mongodb.Grid;
var assert = require('assert');
var ObjectId = require('mongodb').ObjectID;

var app = express();
app.engine('handlebars', exphbs({defaultLayout: 'main'}));
app.set('view engine', 'handlebars');
var expressWs = require('express-ws')(app);


function makeid(len)
{
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for( var i=0; i < len; i++ )
        text += possible.charAt(Math.floor(Math.random() * possible.length));

    return text;
}


app.get('/', function (req, res) {
    res.render('home',{'config': JSON.stringify({
        'port': config.port,
        'public_url': config.public_url,
        'public_ws_url': config.public_ws_url,
        'upload': {
            'maxsize': config.upload.maxsize,
            'accepted_mimetypes': config.upload.accepted_mimetypes
        }})});
});

app.use(express.static('public'));

app.param('id', function (req, res, next, id) {
  next();
});

app.get('/media/:id', function(req, res) {
    //console.log('get route', req.params.id);
    
    var mediaid = req.params.id;
    
    MongoClient.connect(config.db.url, function(err, db) {
        assert.equal(null, err);
        db.collection('media').findOne(
            {'mediaid': mediaid},
            function(err, doc) {
                res.setHeader('Content-Type', doc.mimetype);
                res.send(doc.media.buffer);
                res.end();
                db.close();
            });            
    });
});


// handle upload of images or videos
app.post('/upload', upload.single('media'), function(req, res) {
    //console.log('req',req);
    //console.log('req.file',req.file);

    if (!req.file) {
        res.status(400).send({
            message: 'no file uploaded'
        });
        return;
    }

    // check file size
    if (config.upload.maxsize !== -1 && req.file.size > config.upload.maxsize) {
        res.status(406).send({
            message: 'Size of "' + req.file.size + '" is too large. I accepted only: ' + config.upload.maxsize
        });
        return;
    }

    // check if file is an image or video, otherwise reject
    // by checking the mimetype and the file extension
    var mimetype = req.file.mimetype;
    var mimetype_ext = mime.lookup(req.file.originalname);

    if (config.upload.accepted_mimetypes.indexOf(mimetype) === -1 ||
        config.upload.accepted_mimetypes.indexOf(mimetype_ext) === -1) {
        // reject
        res.status(415).send({
            message: 'Mimetype "' + req.file.mimetype + '" is not acceptable. I accepted only: ' + config.upload.accepted_mimetypes.join(', ')
        });
        return;
    }

    // TODO: make sure mediaid is unique
    var mediaid = makeid(5) + '-' + req.file.originalname;

    // TODO: check size

    var buffer = req.file.buffer;
    var media = new mongodb.Binary(buffer);

    MongoClient.connect(config.db.url, function(err, db) {
        assert.equal(null, err);

        db.collection('media').insertOne(
            {'mediaid': mediaid,
             'mimetype': mimetype,
             'media': media},
            function(err,result) {
                assert.equal(err, null);
                console.log("Inserted data into",mediaid);
                db.close();
            });
    });


    res.send(JSON.stringify({'mediaid': mediaid}));
}); 

// list of all connections
connections = [];

app.ws('/', function(ws, req) {
    console.log('Client connected');
    // add to list of active connections
    connections.push(ws);


    ws.on('message', function(msg) {
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

            MongoClient.connect(config.db.url, function(err, db) {
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

            MongoClient.connect(config.db.url, function(err, db) {
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
 
app.listen(config.port,config.ipaddr);
