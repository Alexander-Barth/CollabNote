var config = {};

config.upload = {};
config.db = {};

config.ipaddr = process.env.OPENSHIFT_NODEJS_IP || "127.0.0.1";
config.port = process.env.OPENSHIFT_NODEJS_PORT || 8000

// maximum file size during upload, the special value of -1 indicates that
// file can be arbitrarily large

config.upload.maxsize = 100000;
config.upload.accepted_mimetypes = ['image/png','image/jpeg','image/gif','image/svg+xml'];


config.db.url = 'mongodb://localhost:27017/collabnote';

// if OPENSHIFT env variables are present, use the available connection info:
if (process.env.OPENSHIFT_MONGODB_DB_PASSWORD) {
    config.db.url = 'mongodb://' + process.env.OPENSHIFT_MONGODB_DB_USERNAME + ":" +
        process.env.OPENSHIFT_MONGODB_DB_PASSWORD + "@" +
        process.env.OPENSHIFT_MONGODB_DB_HOST + ':' +
        process.env.OPENSHIFT_MONGODB_DB_PORT + '/' +
        process.env.OPENSHIFT_APP_NAME;
}



module.exports = config;


