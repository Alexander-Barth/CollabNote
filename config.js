var config = {};

config.upload = {};
config.db = {};



config.ipaddr = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
config.port = process.env.OPENSHIFT_NODEJS_PORT || 8000

// base URLs can be defined if the node server is behind a reverse proxy/tunnel 
// to use the public

config.public_url = 'http://' + config.ipaddr + ':' + config.port;
config.public_ws_url = 'ws://' + config.ipaddr + ':' + config.port;

// maximum file size during upload, the special value of -1 indicates that
// file can be arbitrarily large

config.upload.maxsize = 100000;
config.upload.accepted_mimetypes = ['image/png','image/jpeg','image/gif','image/svg+xml'];


config.db.url = 'mongodb://localhost:27017/collabnote';


config.initialtext = '# Welcome to CollabNote\n\n[CollabNote](https://github.com/Alexander-Barth/CollabNote) is a real-time collaborative markdown text editor. You share documents by sharing the URL of this page. You might want to bookmark it to come back later to your document.\n\nThe syntax of markdown is relatively natural and easy to use.\n\n## Lists\n\nThis is a list:\n\n* item 1\n* item 2\n\n## Tables\n\n| Ingredient | Quantity |\n|------------|----------|\n| oat meal   |    1 cup |\n| milk       |   2 cups |\n\n## Images\n\nImages (PNG, JPEG and SVG) can be embedded by using:\n\n![logo](http://localhost/Alex/logo.svg)';

// if OPENSHIFT env variables are present, use the available connection info:
if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
    config.db.url = 'mongodb://' + process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
        process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
        process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
        process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
        process.env.OPENSHIFT_APP_NAME;

    config.public_ws_url = 'ws://' + config.ipaddr + ':8000';
}

module.exports = config;


